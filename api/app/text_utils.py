from __future__ import annotations

import posixpath
import re
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree


def decode_text(raw: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030", "utf-16"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def extract_text_from_upload(filename: str, raw: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md"}:
        return decode_text(raw)
    if suffix == ".docx":
        return extract_docx_text(raw)
    if suffix in {".html", ".xhtml", ".htm"}:
        title, body = extract_html_document(raw)
        if body:
            return f"{title}\n\n{body}".strip() if title else body
        raise ValueError("HTML file does not contain readable text content")
    raise ValueError(f"Unsupported file type: {suffix}")


def extract_chapters_from_upload(filename: str, raw: bytes) -> list[tuple[str, str]]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".epub":
        chapters = extract_epub_chapters(raw)
        if chapters:
            return chapters
        raise ValueError("EPUB file does not contain readable chapters")
    if suffix in {".html", ".xhtml", ".htm"}:
        title, body = extract_html_document(raw)
        if body:
            return [(title or "Chapter 1", body)]
        raise ValueError("HTML file does not contain readable text content")
    return split_into_chapters(extract_text_from_upload(filename, raw))


def extract_docx_text(raw: bytes) -> str:
    with zipfile.ZipFile(io_bytes(raw)) as archive:
        xml_bytes = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml_bytes)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", namespace):
        chunks = []
        for node in para.findall(".//w:t", namespace):
            chunks.append(node.text or "")
        text = "".join(chunks).strip()
        if text:
            paragraphs.append(text)
    return "\n\n".join(paragraphs)


def io_bytes(raw: bytes):
    from io import BytesIO

    return BytesIO(raw)


def extract_epub_chapters(raw: bytes) -> list[tuple[str, str]]:
    with zipfile.ZipFile(io_bytes(raw)) as archive:
        package_path = find_epub_package_path(archive)
        package_root = ElementTree.fromstring(archive.read(package_path))
        manifest = parse_epub_manifest(package_root)
        spine = parse_epub_spine(package_root)
        base_dir = PurePosixPath(package_path).parent
        chapters: list[tuple[str, str]] = []

        for item_id in spine:
            item = manifest.get(item_id)
            if not item or "nav" in item["properties"]:
                continue
            href = item["href"]
            media_type = item["media_type"]
            if media_type not in {"application/xhtml+xml", "application/xml", "text/html"} and not href.lower().endswith(
                (".xhtml", ".html", ".htm")
            ):
                continue
            document_path = normalize_epub_path(base_dir, href)
            try:
                document_bytes = archive.read(document_path)
            except KeyError:
                continue
            title, body = extract_epub_document(document_bytes)
            if not body:
                continue
            chapter_title = title or f"Chapter {len(chapters) + 1}"
            chapters.append((chapter_title, body))

        return chapters


def find_epub_package_path(archive: zipfile.ZipFile) -> str:
    try:
        container_xml = archive.read("META-INF/container.xml")
    except KeyError as exc:
        raise ValueError("EPUB is missing META-INF/container.xml") from exc
    root = ElementTree.fromstring(container_xml)
    for node in root.iter():
        if tag_name(node.tag) == "rootfile":
            full_path = (node.attrib.get("full-path") or "").strip()
            if full_path:
                return full_path
    raise ValueError("EPUB package path not found")


def parse_epub_manifest(root: ElementTree.Element) -> dict[str, dict[str, object]]:
    manifest: dict[str, dict[str, object]] = {}
    for node in root.iter():
        if tag_name(node.tag) != "item":
            continue
        item_id = (node.attrib.get("id") or "").strip()
        href = (node.attrib.get("href") or "").strip()
        if not item_id or not href:
            continue
        manifest[item_id] = {
            "href": href,
            "media_type": (node.attrib.get("media-type") or "").strip(),
            "properties": {entry for entry in (node.attrib.get("properties") or "").split() if entry},
        }
    return manifest


def parse_epub_spine(root: ElementTree.Element) -> list[str]:
    spine: list[str] = []
    for node in root.iter():
        if tag_name(node.tag) != "itemref":
            continue
        item_id = (node.attrib.get("idref") or "").strip()
        if item_id:
            spine.append(item_id)
    return spine


def normalize_epub_path(base_dir: PurePosixPath, href: str) -> str:
    joined = posixpath.normpath(posixpath.join(base_dir.as_posix(), href))
    return joined.lstrip("/")


def extract_epub_document(raw: bytes) -> tuple[str, str]:
    root = ElementTree.fromstring(raw)
    title = ""
    body = None

    for node in root.iter():
        name = tag_name(node.tag)
        if name == "title" and not title:
            title = normalize_inline_text("".join(node.itertext()))
        if name == "body":
            body = node
            break

    if body is None:
        body = root

    blocks: list[str] = []
    heading = ""
    for node in body.iter():
        name = tag_name(node.tag)
        if name in {"script", "style", "svg", "math"}:
            continue
        if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            text = normalize_inline_text("".join(node.itertext()))
            if text:
                if not heading:
                    heading = text
                if not blocks or blocks[-1] != text:
                    blocks.append(text)
            continue
        if name in {"p", "li", "blockquote", "pre"}:
            text = normalize_inline_text("".join(node.itertext()))
            if text and (not blocks or blocks[-1] != text):
                blocks.append(text)

    document_title = heading or title
    if document_title and blocks and blocks[0] == document_title:
        blocks = blocks[1:]

    body_text = "\n\n".join(blocks).strip()
    if not body_text:
        fallback = normalize_inline_text(" ".join(body.itertext()))
        if fallback and fallback != document_title:
            body_text = fallback

    return document_title, body_text


def extract_html_document(raw: bytes) -> tuple[str, str]:
    text = decode_text(raw).strip()
    if not text:
        return "", ""
    try:
        return extract_epub_document(text.encode("utf-8"))
    except ElementTree.ParseError:
        wrapped = f"<html><body>{text}</body></html>"
        try:
            return extract_epub_document(wrapped.encode("utf-8"))
        except ElementTree.ParseError:
            plain = strip_html_tags(text)
            return "", plain


def strip_html_tags(text: str) -> str:
    normalized = re.sub(r"(?is)<(script|style).*?>.*?</\\1>", " ", text)
    normalized = re.sub(r"(?i)<br\\s*/?>", "\n", normalized)
    normalized = re.sub(r"(?i)</p\\s*>", "\n\n", normalized)
    normalized = re.sub(r"(?i)</div\\s*>", "\n", normalized)
    normalized = re.sub(r"(?i)</li\\s*>", "\n", normalized)
    normalized = re.sub(r"<[^>]+>", " ", normalized)
    normalized = re.sub(r"&nbsp;", " ", normalized)
    normalized = re.sub(r"&amp;", "&", normalized)
    normalized = re.sub(r"&lt;", "<", normalized)
    normalized = re.sub(r"&gt;", ">", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    return normalized.strip()


def normalize_inline_text(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text or "").strip()
    return collapsed


def tag_name(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


MARKDOWN_CHAPTER_PATTERN = re.compile(r"^\s{0,3}#{1,2}\s*(?P<title>.+?)\s*$")
CHINESE_CHAPTER_MARKER = r"第[一二三四五六七八九十百千万0-9]+(?:章(?:節|节)?|回)"
CHAPTER_PATTERNS = [
    re.compile(
        rf"^\s*(?:#{1,2}\s*)?(?:[A-Za-z0-9一-龥《》〈〉「」『』【】（）()·\-_ ]{{0,24}})?{CHINESE_CHAPTER_MARKER}[^\n]*$"
    ),
    re.compile(r"^\s*(?:#{1,2}\s*)?Chapter\s+\d+[^\n]*$", re.IGNORECASE),
]


def normalize_chapter_heading(line: str) -> str:
    stripped = line.strip()
    match = MARKDOWN_CHAPTER_PATTERN.match(stripped)
    if match:
        return normalize_inline_text(match.group("title"))
    return stripped


def is_chapter_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if MARKDOWN_CHAPTER_PATTERN.match(stripped):
        return True
    normalized = normalize_chapter_heading(stripped)
    return any(pattern.match(normalized) for pattern in CHAPTER_PATTERNS)


def split_into_chapters(text: str) -> list[tuple[str, str]]:
    normalized = normalize_text(text)
    lines = normalized.splitlines()
    chapters: list[tuple[str, list[str]]] = []
    current_title = "Chapter 1"
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_title, current_lines
        body = "\n".join(current_lines).strip()
        if body:
            chapters.append((current_title.strip(), current_lines.copy()))
        current_lines = []

    found_heading = False
    for line in lines:
        stripped = line.strip()
        is_heading = is_chapter_heading(stripped)
        if is_heading:
            found_heading = True
            flush()
            current_title = normalize_chapter_heading(stripped)
        else:
            current_lines.append(line)

    flush()

    if not chapters and normalized.strip():
        return [("Chapter 1", normalized.strip())]

    if found_heading:
        return [(title, "\n".join(body_lines).strip()) for title, body_lines in chapters]

    return [("Chapter 1", normalized.strip())]


def split_into_segments(text: str, max_chars: int = 170) -> list[str]:
    normalized = normalize_text(text)
    paragraphs = [chunk.strip() for chunk in re.split(r"\n{2,}", normalized) if chunk.strip()]
    segments: list[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            segments.append(paragraph)
            continue
        sentences = [s.strip() for s in re.split(r"(?<=[。！？!?\.])\s*", paragraph) if s.strip()]
        if not sentences:
            segments.append(paragraph)
            continue
        buffer = ""
        for sentence in sentences:
            candidate = sentence if not buffer else f"{buffer} {sentence}"
            if len(candidate) <= max_chars:
                buffer = candidate
            else:
                if buffer:
                    segments.append(buffer.strip())
                buffer = sentence
        if buffer:
            segments.append(buffer.strip())
    return segments or [normalized.strip()]


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


SPEAKER_VERBS = [
    "轻声说",
    "低声说",
    "喃喃道",
    "嘀咕道",
    "沉声道",
    "冷声道",
    "提醒道",
    "解释道",
    "回过头说",
    "开口说道",
    "回答",
    "回道",
    "应道",
    "问道",
    "说道",
    "笑道",
    "喊道",
    "叫道",
    "答道",
    "大喊",
    "怒吼",
    "宣布",
    "开口",
    "说道",
    "说",
    "问",
    "道",
    "喊",
    "叫",
    "答",
]
SPEAKER_VERB_PATTERN = "|".join(sorted(set(SPEAKER_VERBS), key=len, reverse=True))
SPEAKER_NAME_PATTERN = r"(?:[A-Za-z][A-Za-z0-9_ -]{0,18}|[一-龥][一-龥0-9·]{0,7})"
SPEAKER_LABEL_PATTERN = re.compile(
    rf"^\s*[【\[\(（「『“\"]?(?P<speaker>{SPEAKER_NAME_PATTERN})[】\]\)）」』”\"]?\s*[：:]\s*"
)
SPEAKER_TRAILING_PATTERN = re.compile(
    rf"[“\"「『][^”\"」』]{{1,120}}[”\"」』][，、,\s]*(?P<speaker>{SPEAKER_NAME_PATTERN})[，、,\s]*(?:{SPEAKER_VERB_PATTERN})"
)
SPEAKER_LEADING_PATTERN = re.compile(
    rf"(?:^|[。！？!?；;]\s*)(?P<speaker>{SPEAKER_NAME_PATTERN})[，、,\s]*(?:{SPEAKER_VERB_PATTERN})[：:\s，、,]*[“\"「『]"
)
SPEAKER_BLOCKLIST = {
    "他",
    "她",
    "它",
    "他们",
    "她们",
    "它们",
    "自己",
    "对方",
    "某人",
    "有人",
    "那人",
    "这人",
    "一个人",
}
NARRATOR_HINTS = {"旁白", "叙述者", "敘事者", "系统旁白", "系統旁白"}
BACKGROUND_HINT_KEYWORDS = ("系统", "系統", "广播", "廣播", "提示", "男声", "男聲", "女声", "女聲", "路人", "众人", "眾人", "村民", "店员", "店員", "服务员", "服務員", "主持人", "观众", "觀眾", "群众", "群眾", "士兵", "同学", "同學", "老师", "老師")
SPEAKER_SUFFIXES = ("说道", "說道", "问道", "問道", "笑道", "喊道", "叫道", "答道", "说", "說", "问", "問", "笑", "喊", "叫", "答", "道")


def normalize_detected_speaker(value: str) -> str:
    candidate = normalize_inline_text(value)
    candidate = candidate.strip("[]【】()（）「」『』\"'“”‘’：:，,。！？!?、;； ")
    if not candidate:
        return ""
    for suffix in SPEAKER_SUFFIXES:
        compact_candidate = candidate.replace(" ", "")
        if compact_candidate.endswith(suffix) and len(compact_candidate) > len(suffix):
            candidate = compact_candidate[: -len(suffix)]
            break
    compact = candidate.replace(" ", "")
    if compact in SPEAKER_BLOCKLIST:
        return ""
    if compact.isdigit() or len(compact) > 12:
        return ""
    if re.fullmatch(r"[一-龥][一-龥0-9·]{0,7}", compact):
        return compact
    if re.fullmatch(r"[A-Za-z][A-Za-z0-9_ -]{0,18}", candidate):
        return re.sub(r"\s+", " ", candidate).strip()
    return ""


def suggest_role_type_for_speaker(name: str) -> str:
    compact = (name or "").replace(" ", "")
    if compact in NARRATOR_HINTS or "旁白" in compact:
        return "narrator"
    if any(keyword in compact for keyword in BACKGROUND_HINT_KEYWORDS):
        return "background"
    return "supporting"


def detect_segment_speaker(text: str) -> dict[str, str] | None:
    normalized = normalize_inline_text(text)
    if not normalized:
        return None
    for pattern, source in (
        (SPEAKER_LABEL_PATTERN, "label"),
        (SPEAKER_TRAILING_PATTERN, "trailing"),
        (SPEAKER_LEADING_PATTERN, "leading"),
    ):
        match = pattern.search(normalized)
        if not match:
            continue
        speaker_name = normalize_detected_speaker(match.group("speaker"))
        if not speaker_name:
            continue
        return {
            "speaker_name": speaker_name,
            "detection_source": source,
            "role_type": suggest_role_type_for_speaker(speaker_name),
        }
    return None
