from __future__ import annotations

import re
import zipfile
from pathlib import Path
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
    raise ValueError(f"Unsupported file type: {suffix}")


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


CHAPTER_PATTERNS = [
    re.compile(r"^\s*第[一二三四五六七八九十百千万0-9]+章[^\n]*$", re.MULTILINE),
    re.compile(r"^\s*Chapter\s+\d+[^\n]*$", re.IGNORECASE | re.MULTILINE),
]


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
        is_heading = any(pattern.match(stripped) for pattern in CHAPTER_PATTERNS)
        if is_heading:
            found_heading = True
            flush()
            current_title = stripped
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

