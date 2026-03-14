from __future__ import annotations

import csv
import json
import mimetypes
import os
import random
import shutil
import sqlite3
import urllib.parse
import urllib.request
import zipfile
from difflib import SequenceMatcher
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .ai_providers import ProviderConfigError, ProviderRequestError, generate_speech, transcribe_audio
from .audio_utils import concat_wavs, create_export_zip, public_file_path, slugify
from .config import get_settings
from .db import BASE_DIR, DEFAULT_USERS, GENERATED_DIR, connect, get_conn, init_db, utc_now
from .model_registry import REGISTRY_PATH, get_model_registry, get_registry_defaults, get_system_catalog
from .schemas import (
    AdvertiserDealCreate,
    AdvertiserDealUpdate,
    BatchCharacterAssignRequest,
    BusinessBaseCurrencyUpdate,
    ChapterCharacterAutoBindRequest,
    CharacterLookImportRequest,
    CharacterLookUpdate,
    CharacterProfileCreate,
    CharacterProfileUpdate,
    ComicPageCreate,
    ComicPageUpdate,
    ComicPanelCreate,
    ComicPanelImageImportRequest,
    ComicPanelUpdate,
    ComicScriptCreate,
    ComicScriptUpdate,
    CostItemCreate,
    CostItemUpdate,
    DistributionChannelCreate,
    DistributionChannelUpdate,
    ExchangeRateCreate,
    ExchangeRateUpdate,
    IssueCreate,
    IssueUpdate,
    LoginRequest,
    MergeSegmentsRequest,
    ModelProfileCreate,
    ProjectChapterCreate,
    ProjectCreate,
    ProjectImportLocalRequest,
    ProjectPasteImportRequest,
    ProjectUpdate,
    RejectRequest,
    RightsRecordCreate,
    RightsRecordUpdate,
    RoyaltyStatementCreate,
    RoyaltyStatementUpdate,
    SalesRecordCreate,
    SalesRecordUpdate,
    SegmentUpdate,
    VoiceProfileCreate,
    VoiceProfileUpdate,
)
from .security import create_token, verify_password
from .text_utils import detect_segment_speaker, extract_chapters_from_upload, normalize_text, split_into_segments

WEB_DIR = BASE_DIR.parent / "web"
APP_TITLE = "AI Publisher Local Studio"
LOOK_SLOT_COUNT = 9
SOURCE_BOOK_FILENAME = "source_book.txt"
ALL_ROUTE_KEYS = [
    "projects",
    "business",
    "text",
    "voices",
    "characters",
    "comic-script",
    "storyboard",
    "panels",
    "layout",
    "comic",
    "video",
    "generate",
    "review",
    "export",
    "settings",
]
ROLE_ROUTE_ACCESS = {
    "admin": ALL_ROUTE_KEYS,
    "text_editor": ["projects", "text", "generate"],
    "reviewer": ["projects", "review"],
    "delivery_manager": ["projects", "business", "export"],
    "settings_manager": ["projects", "voices", "characters", "comic", "video", "settings"],
}
ROLE_PERMISSION_ACCESS = {
    "admin": {
        "business_manage",
        "project_manage",
        "project_delete",
        "text_manage",
        "settings_manage",
        "comic_manage",
        "generate_manage",
        "review_manage",
        "delivery_manage",
    },
    "text_editor": {"text_manage", "generate_manage"},
    "reviewer": {"review_manage"},
    "delivery_manager": {"business_manage", "delivery_manage"},
    "settings_manager": {"project_manage", "settings_manage"},
}

app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


def normalize_role(role: str | None) -> str:
    value = (role or "").strip().lower()
    if not value:
        return "admin"
    return value if value in ROLE_ROUTE_ACCESS else "unknown"


def allowed_routes_for_role(role: str | None) -> list[str]:
    return list(ROLE_ROUTE_ACCESS.get(normalize_role(role), []))


def permissions_for_role(role: str | None) -> set[str]:
    return set(ROLE_PERMISSION_ACCESS.get(normalize_role(role), set()))


def build_user_payload(user: sqlite3.Row | dict) -> dict:
    role = normalize_role(user["role"])
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": role,
        "allowed_routes": allowed_routes_for_role(role),
        "permissions": sorted(permissions_for_role(role)),
    }


def build_demo_accounts_payload() -> list[dict]:
    items = []
    for account in DEFAULT_USERS:
        role = normalize_role(account["role"])
        items.append(
            {
                "email": account["email"],
                "password": account["password"],
                "name": account["name"],
                "role": role,
                "allowed_routes": allowed_routes_for_role(role),
            }
        )
    return items


def require_permission(user: dict, permission: str) -> None:
    if permission in permissions_for_role(user.get("role")):
        return
    raise HTTPException(status_code=403, detail="You do not have permission to perform this action")


def require_any_permission(user: dict, *permissions: str) -> None:
    user_permissions = permissions_for_role(user.get("role"))
    if any(permission in user_permissions for permission in permissions):
        return
    raise HTTPException(status_code=403, detail="You do not have permission to perform this action")


@app.on_event("startup")
def startup() -> None:
    init_db()


def db_row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def merge_settings(raw_value: str | dict | None, defaults: dict) -> dict:
    if isinstance(raw_value, dict):
        parsed = raw_value
    elif isinstance(raw_value, str) and raw_value.strip():
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError:
            parsed = {}
    else:
        parsed = {}
    if not isinstance(parsed, dict):
        parsed = {}
    merged = defaults.copy()
    merged.update({key: value for key, value in parsed.items() if value is not None})
    return merged


def comic_settings_defaults() -> dict:
    return get_registry_defaults()["comic_settings"]


def video_settings_defaults() -> dict:
    return get_registry_defaults()["video_settings"]


def project_import_dir(project_id: int) -> Path:
    return GENERATED_DIR / "imports" / f"project_{project_id}"


def project_source_book_path(project_id: int) -> Path:
    return project_import_dir(project_id) / SOURCE_BOOK_FILENAME


def normalize_project_chapters(chapters: list[tuple[str, str]]) -> list[tuple[str, str]]:
    normalized: list[tuple[str, str]] = []
    for index, (title, body) in enumerate(chapters, start=1):
        chapter_title = (title or "").strip() or f"Chapter {index}"
        chapter_body = normalize_text(body or "")
        if chapter_body:
            normalized.append((chapter_title, chapter_body))
    if not normalized:
        raise HTTPException(status_code=400, detail="No readable chapter content found")
    return normalized


def compose_project_source_book(chapters: list[tuple[str, str]]) -> str:
    blocks: list[str] = []
    for index, (title, body) in enumerate(chapters):
        if index:
            blocks.append("")
        blocks.append(title.strip())
        blocks.append(body.strip())
    return "\n\n".join(blocks).strip() + "\n"


def persist_project_source_book(project_id: int, chapters: list[tuple[str, str]]) -> Path:
    import_dir = project_import_dir(project_id)
    import_dir.mkdir(parents=True, exist_ok=True)
    path = project_source_book_path(project_id)
    path.write_text(compose_project_source_book(chapters), encoding="utf-8")
    return path


def create_chapter_record(
    conn: sqlite3.Connection,
    project_id: int,
    title: str,
    body: str,
    order_index: int,
    *,
    status: str = "draft",
    now: str | None = None,
) -> int:
    timestamp = now or utc_now()
    chapter_id = conn.execute(
        """
        INSERT INTO chapters (project_id, title, order_index, source_text, tts_text, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, title, order_index, body, body, status, timestamp, timestamp),
    ).lastrowid
    for segment_index, segment_text in enumerate(split_into_segments(body), start=1):
        conn.execute(
            """
            INSERT INTO segments (project_id, chapter_id, order_index, source_text, tts_text, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'ready', ?, ?)
            """,
            (project_id, chapter_id, segment_index, segment_text, segment_text, timestamp, timestamp),
        )
    return chapter_id


def project_payload(conn: sqlite3.Connection, row: sqlite3.Row, *, include_business: bool = False) -> dict:
    project = dict(row)
    project["comic_settings"] = merge_settings(project.get("comic_settings"), comic_settings_defaults())
    project["video_settings"] = merge_settings(project.get("video_settings"), video_settings_defaults())
    project["metrics"] = project_metrics(conn, row["id"])
    project["business_summary"] = project_business_summary(conn, row["id"]) if include_business else None
    project["cover_url"] = public_file_path(project["cover_path"]) if project.get("cover_path") else ""
    source_book_path = project_source_book_path(row["id"])
    project["source_book_url"] = public_file_path(source_book_path) if source_book_path.exists() else ""
    project["source_book_name"] = SOURCE_BOOK_FILENAME if source_book_path.exists() else ""
    return project


def model_profile_payload(row: sqlite3.Row, defaults: dict) -> dict:
    payload = dict(row)
    payload["settings"] = merge_settings(payload.get("settings"), defaults)
    return payload


def character_profile_payload(row: sqlite3.Row | None) -> dict | None:
    if not row:
        return None
    payload = dict(row)
    payload["avatar_url"] = public_file_path(payload["avatar_path"]) if payload.get("avatar_path") else ""
    payload["looks"] = []
    payload["looks_count"] = 0
    return payload


def character_look_payload(row: sqlite3.Row | None, slot_index: int) -> dict:
    if not row:
        return {
            "id": None,
            "slot_index": slot_index,
            "label": f"圖片 {slot_index}",
            "image_path": "",
            "image_url": "",
            "source_type": "",
            "source_ref": "",
            "created_at": "",
            "updated_at": "",
        }
    payload = dict(row)
    payload["label"] = payload.get("label") or f"圖片 {slot_index}"
    payload["image_url"] = public_file_path(payload["image_path"]) if payload.get("image_path") else ""
    return payload


def list_character_looks(conn: sqlite3.Connection, character_profile_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM character_looks
        WHERE character_profile_id = ?
        ORDER BY slot_index
        """,
        (character_profile_id,),
    ).fetchall()
    by_slot = {row["slot_index"]: row for row in rows}
    return [character_look_payload(by_slot.get(slot_index), slot_index) for slot_index in range(1, LOOK_SLOT_COUNT + 1)]


def attach_character_looks(conn: sqlite3.Connection, payload: dict | None) -> dict | None:
    if not payload:
        return payload
    looks = list_character_looks(conn, payload["id"])
    payload["looks"] = looks
    payload["looks_count"] = sum(1 for look in looks if look["image_path"])
    return payload


def decode_json_list(raw_value: str | list | None) -> list:
    if isinstance(raw_value, list):
        return raw_value
    if isinstance(raw_value, str) and raw_value.strip():
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def comic_script_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["chapter_title"] = ""
    if payload.get("chapter_id"):
        chapter = conn.execute("SELECT title FROM chapters WHERE id = ?", (payload["chapter_id"],)).fetchone()
        payload["chapter_title"] = chapter["title"] if chapter else ""
    payload["page_count"] = conn.execute(
        "SELECT COUNT(*) AS count FROM comic_pages WHERE comic_script_id = ?",
        (payload["id"],),
    ).fetchone()["count"]
    return payload


def comic_panel_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["character_ids"] = decode_json_list(payload.get("character_refs"))
    payload["image_url"] = public_file_path(payload["image_path"]) if payload.get("image_path") else ""
    return payload


def list_comic_panels(conn: sqlite3.Connection, comic_page_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM comic_panels WHERE comic_page_id = ? ORDER BY panel_no, id",
        (comic_page_id,),
    ).fetchall()
    return [comic_panel_payload(row) for row in rows]


def comic_page_payload(conn: sqlite3.Connection, row: sqlite3.Row, *, include_panels: bool = True) -> dict:
    payload = dict(row)
    payload["chapter_title"] = ""
    payload["comic_script_title"] = ""
    if payload.get("chapter_id"):
        chapter = conn.execute("SELECT title FROM chapters WHERE id = ?", (payload["chapter_id"],)).fetchone()
        payload["chapter_title"] = chapter["title"] if chapter else ""
    if payload.get("comic_script_id"):
        script = conn.execute("SELECT title FROM comic_scripts WHERE id = ?", (payload["comic_script_id"],)).fetchone()
        payload["comic_script_title"] = script["title"] if script else ""
    stats = conn.execute(
        """
        SELECT COUNT(*) AS panel_count,
               SUM(CASE WHEN COALESCE(image_path, '') <> '' THEN 1 ELSE 0 END) AS image_count
        FROM comic_panels
        WHERE comic_page_id = ?
        """,
        (payload["id"],),
    ).fetchone()
    payload["panel_count"] = stats["panel_count"] or 0
    payload["image_count"] = stats["image_count"] or 0
    payload["panels"] = list_comic_panels(conn, payload["id"]) if include_panels else []
    return payload


def parse_drive_or_remote_url(raw_url: str) -> tuple[str, str]:
    parsed = urllib.parse.urlparse(raw_url.strip())
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid image URL")
    host = parsed.netloc.lower()
    if "drive.google.com" in host:
        file_id = ""
        parts = [part for part in parsed.path.split("/") if part]
        if "d" in parts:
            index = parts.index("d")
            if index + 1 < len(parts):
                file_id = parts[index + 1]
        if not file_id:
            query = urllib.parse.parse_qs(parsed.query)
            file_id = (query.get("id") or [""])[0]
        if not file_id:
            raise HTTPException(status_code=400, detail="Unsupported Google Drive link")
        return f"https://drive.google.com/uc?export=download&id={file_id}", "drive"
    return raw_url.strip(), "url"


def download_remote_image(raw_url: str) -> tuple[bytes, str, str, str]:
    fetch_url, source_type = parse_drive_or_remote_url(raw_url)
    request = urllib.request.Request(fetch_url, headers={"User-Agent": "AI Publisher Local Studio/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            content_type = response.headers.get_content_type()
            data = response.read(12 * 1024 * 1024 + 1)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Failed to fetch remote image: {error}") from error
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Remote image exceeds 12MB limit")
    if not data:
        raise HTTPException(status_code=400, detail="Remote image is empty")
    suffix = mimetypes.guess_extension(content_type or "") or Path(urllib.parse.urlparse(fetch_url).path).suffix.lower() or ".png"
    if suffix == ".jpe":
        suffix = ".jpg"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported remote image type")
    return data, suffix, source_type, fetch_url


def upsert_character_look(
    conn: sqlite3.Connection,
    character: dict,
    slot_index: int,
    *,
    label: str,
    image_bytes: bytes | None = None,
    suffix: str | None = None,
    source_type: str = "local",
    source_ref: str = "",
) -> sqlite3.Row:
    if slot_index < 1 or slot_index > LOOK_SLOT_COUNT:
        raise HTTPException(status_code=400, detail=f"slot_index must be between 1 and {LOOK_SLOT_COUNT}")

    existing = conn.execute(
        "SELECT * FROM character_looks WHERE character_profile_id = ? AND slot_index = ?",
        (character["id"], slot_index),
    ).fetchone()

    image_path = existing["image_path"] if existing else ""
    if image_bytes is not None:
        look_dir = GENERATED_DIR / "characters" / f"project_{character['project_id']}" / f"character_{character['id']}"
        look_dir.mkdir(parents=True, exist_ok=True)
        resolved_suffix = suffix or ".png"
        next_path = look_dir / f"look_{slot_index}{resolved_suffix}"
        next_path.write_bytes(image_bytes)
        if image_path and image_path != str(next_path):
            remove_generated_file(image_path)
        image_path = str(next_path)

    now = utc_now()
    final_label = (label or f"圖片 {slot_index}").strip()
    if existing:
        conn.execute(
            """
            UPDATE character_looks
            SET label = ?, image_path = ?, source_type = ?, source_ref = ?, updated_at = ?
            WHERE id = ?
            """,
            (final_label, image_path, source_type, source_ref, now, existing["id"]),
        )
    else:
        conn.execute(
            """
            INSERT INTO character_looks (character_profile_id, slot_index, label, image_path, source_type, source_ref, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (character["id"], slot_index, final_label, image_path, source_type, source_ref, now, now),
        )

    row = conn.execute(
        "SELECT * FROM character_looks WHERE character_profile_id = ? AND slot_index = ?",
        (character["id"], slot_index),
    ).fetchone()
    return row


def fetch_user_by_token(token: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.email, users.name, users.role
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return build_user_payload(row)


def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.replace("Bearer ", "", 1).strip()
    return fetch_user_by_token(token)


def get_project(conn: sqlite3.Connection, project_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return row


def get_chapter(conn: sqlite3.Connection, chapter_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return row


def get_segment(conn: sqlite3.Connection, segment_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM segments WHERE id = ?", (segment_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Segment not found")
    return row


def get_character_profile(conn: sqlite3.Connection, character_profile_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM character_profiles WHERE id = ?", (character_profile_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Character profile not found")
    return row


def get_comic_script(conn: sqlite3.Connection, comic_script_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM comic_scripts WHERE id = ?", (comic_script_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Comic script not found")
    return row


def get_comic_page(conn: sqlite3.Connection, comic_page_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM comic_pages WHERE id = ?", (comic_page_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Comic page not found")
    return row


def get_comic_panel(conn: sqlite3.Connection, comic_panel_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM comic_panels WHERE id = ?", (comic_panel_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Comic panel not found")
    return row


def character_query() -> str:
    return """
        SELECT character_profiles.*, voice_profiles.name AS voice_profile_name, voice_profiles.voice_name AS voice_name
        FROM character_profiles
        JOIN voice_profiles ON voice_profiles.id = character_profiles.voice_profile_id
    """


def normalize_character_lookup_value(value: str | None) -> str:
    return "".join((value or "").split()).strip().casefold()


def match_character_row_for_speaker(character_rows: list[sqlite3.Row], speaker_name: str) -> sqlite3.Row | None:
    target = normalize_character_lookup_value(speaker_name)
    if not target:
        return None

    exact_match = None
    scored_matches: list[tuple[float, sqlite3.Row]] = []
    seen_ids: set[int] = set()

    for row in character_rows:
        fields = [row["story_character_name"], row["name"], row["display_title"]]
        best_ratio = 0.0
        for field in fields:
            normalized = normalize_character_lookup_value(field)
            if not normalized:
                continue
            if normalized == target:
                exact_match = row
                break
            ratio = SequenceMatcher(None, target, normalized).ratio()
            if target in normalized or normalized in target:
                ratio = min(1.0, ratio + 0.08)
            best_ratio = max(best_ratio, ratio)
        if exact_match is not None:
            break
        if best_ratio > 0 and row["id"] not in seen_ids:
            seen_ids.add(row["id"])
            scored_matches.append((best_ratio, row))

    if exact_match is not None:
        return exact_match

    scored_matches.sort(key=lambda item: item[0], reverse=True)
    if not scored_matches:
        return None
    top_ratio, top_row = scored_matches[0]
    next_ratio = scored_matches[1][0] if len(scored_matches) > 1 else 0.0
    if top_ratio >= 0.9 and top_ratio - next_ratio >= 0.06:
        return top_row
    return None


def chapter_character_detection(conn: sqlite3.Connection, chapter_id: int) -> dict:
    chapter = get_chapter(conn, chapter_id)
    project = get_project(conn, chapter["project_id"])
    segment_rows = conn.execute("SELECT * FROM segments WHERE chapter_id = ? ORDER BY order_index", (chapter_id,)).fetchall()
    character_rows = conn.execute(
        f"""
        {character_query()}
        WHERE character_profiles.project_id = ?
        ORDER BY character_profiles.id ASC
        """,
        (project["id"],),
    ).fetchall()

    grouped: dict[str, dict] = {}
    unmatched_segment_ids: list[int] = []

    for row in segment_rows:
        text = (row["source_text"] or row["tts_text"] or "").strip()
        detection = detect_segment_speaker(text)
        if not detection:
            unmatched_segment_ids.append(row["id"])
            continue
        speaker_name = detection["speaker_name"]
        entry = grouped.setdefault(
            speaker_name,
            {
                "speaker_name": speaker_name,
                "role_type": detection["role_type"],
                "detection_source": detection["detection_source"],
                "segment_ids": [],
                "segment_count": 0,
                "sample_text": text[:160],
            },
        )
        entry["segment_ids"].append(row["id"])
        entry["segment_count"] += 1

    items: list[dict] = []
    for entry in grouped.values():
        matched_row = match_character_row_for_speaker(character_rows, entry["speaker_name"])
        payload = {
            **entry,
            "matched_character_profile_id": matched_row["id"] if matched_row else None,
            "matched_character_name": matched_row["name"] if matched_row else "",
            "matched_story_character_name": matched_row["story_character_name"] if matched_row else "",
        }
        items.append(payload)

    items.sort(key=lambda item: (-item["segment_count"], item["speaker_name"]))
    return {
        "project_id": project["id"],
        "chapter_id": chapter_id,
        "chapter_title": chapter["title"],
        "segment_count": len(segment_rows),
        "detected_segment_count": sum(item["segment_count"] for item in items),
        "unmatched_segment_ids": unmatched_segment_ids,
        "unmatched_segment_count": len(unmatched_segment_ids),
        "items": items,
    }


def resolve_voice_for_character_creation(conn: sqlite3.Connection, project_id: int, fallback_voice_profile_id: int | None) -> sqlite3.Row | None:
    voice_id = fallback_voice_profile_id or get_project(conn, project_id)["default_voice_profile_id"]
    if not voice_id:
        return None
    voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (voice_id,)).fetchone()
    if not voice:
        return None
    if voice["project_id"] is not None and voice["project_id"] != project_id:
        raise HTTPException(status_code=400, detail="Fallback voice does not belong to this project")
    return voice


def voice_for_project(conn: sqlite3.Connection, project_id: int, segment_voice_id: int | None = None, character_profile_id: int | None = None) -> dict:
    if segment_voice_id:
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (segment_voice_id,)).fetchone()
        if row:
            return dict(row)
    if character_profile_id:
        character = conn.execute("SELECT * FROM character_profiles WHERE id = ?", (character_profile_id,)).fetchone()
        if character:
            voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (character["voice_profile_id"],)).fetchone()
            if voice:
                payload = dict(voice)
                if character["speed_override"] is not None:
                    payload["speed"] = character["speed_override"]
                if character["style_override"]:
                    payload["style"] = character["style_override"]
                if character["instructions"]:
                    payload["instructions"] = character["instructions"]
                return payload
    project = get_project(conn, project_id)
    if project["default_voice_profile_id"]:
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (project["default_voice_profile_id"],)).fetchone()
        if row:
            return dict(row)
    row = conn.execute("SELECT * FROM voice_profiles WHERE is_default = 1 ORDER BY id LIMIT 1").fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="No voice profile configured")
    return dict(row)


def project_metrics(conn: sqlite3.Connection, project_id: int) -> dict:
    chapter_count = conn.execute("SELECT COUNT(*) AS count FROM chapters WHERE project_id = ?", (project_id,)).fetchone()["count"]
    segment_stats = conn.execute(
        """
        SELECT COUNT(*) AS segment_count,
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
               SUM(CASE WHEN status = 'review_required' THEN 1 ELSE 0 END) AS review_required_count
        FROM segments
        WHERE project_id = ?
        """,
        (project_id,),
    ).fetchone()
    failed_jobs = conn.execute(
        "SELECT COUNT(*) AS count FROM generation_jobs WHERE project_id = ? AND status = 'failed'",
        (project_id,),
    ).fetchone()["count"]
    comic_page_count = conn.execute("SELECT COUNT(*) AS count FROM comic_pages WHERE project_id = ?", (project_id,)).fetchone()["count"]
    comic_panel_count = conn.execute("SELECT COUNT(*) AS count FROM comic_panels WHERE project_id = ?", (project_id,)).fetchone()["count"]
    return {
        "chapter_count": chapter_count or 0,
        "segment_count": segment_stats["segment_count"] or 0,
        "approved_count": segment_stats["approved_count"] or 0,
        "review_required_count": segment_stats["review_required_count"] or 0,
        "failed_jobs": failed_jobs or 0,
        "comic_page_count": comic_page_count or 0,
        "comic_panel_count": comic_panel_count or 0,
    }


def normalize_currency_code(value: str | None) -> str:
    normalized = (value or "CNY").strip().upper()
    return normalized or "CNY"


def round_money(value: float | int | None) -> float:
    return round(float(value or 0), 2)


def round_rate(value: float | int | None) -> float:
    return round(float(value or 0), 6)


def rights_record_is_active(record: dict, today: str) -> bool:
    status = (record.get("status") or "").strip().lower()
    if status in {"expired", "terminated", "inactive", "void"}:
        return False
    start_date = (record.get("start_date") or "").strip()
    end_date = (record.get("end_date") or "").strip()
    if start_date and start_date > today:
        return False
    if end_date and end_date < today:
        return False
    return status not in {"planning", "pending"}


def distribution_channel_is_live(record: dict, today: str) -> bool:
    status = (record.get("release_status") or "").strip().lower()
    if status not in {"live", "active", "launched"}:
        return False
    release_date = (record.get("release_date") or "").strip()
    return not release_date or release_date <= today


def rights_record_payload(row: sqlite3.Row, today: str | None = None) -> dict:
    payload = dict(row)
    payload["is_active"] = rights_record_is_active(payload, today or datetime.now(timezone.utc).date().isoformat())
    return payload


def cost_item_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["amount"] = round_money(payload.get("amount"))
    payload["currency"] = normalize_currency_code(payload.get("currency"))
    return payload


def distribution_channel_payload(row: sqlite3.Row, today: str | None = None) -> dict:
    payload = dict(row)
    payload["price"] = round_money(payload.get("price"))
    payload["currency"] = normalize_currency_code(payload.get("currency"))
    payload["channel_category"] = (payload.get("channel_category") or "retail").strip().lower() or "retail"
    payload["is_live"] = distribution_channel_is_live(payload, today or datetime.now(timezone.utc).date().isoformat())
    return payload


def sales_record_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["gross_revenue"] = round_money(payload.get("gross_revenue"))
    payload["refunds"] = round_money(payload.get("refunds"))
    payload["net_revenue"] = round_money(payload.get("net_revenue"))
    payload["currency"] = normalize_currency_code(payload.get("currency"))
    payload["channel_category"] = (payload.get("channel_category") or "retail").strip().lower() or "retail"
    return payload


def royalty_statement_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["rate_percent"] = round_money(payload.get("rate_percent"))
    payload["amount_due"] = round_money(payload.get("amount_due"))
    payload["currency"] = normalize_currency_code(payload.get("currency"))
    return payload


def exchange_rate_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["source_currency"] = normalize_currency_code(payload.get("source_currency"))
    payload["target_currency"] = normalize_currency_code(payload.get("target_currency"))
    payload["rate"] = round_rate(payload.get("rate"))
    return payload


def advertiser_deal_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    payload["contract_amount"] = round_money(payload.get("contract_amount"))
    payload["settled_amount"] = round_money(payload.get("settled_amount"))
    payload["currency"] = normalize_currency_code(payload.get("currency"))
    payload["pending_amount"] = round_money(payload["contract_amount"] - payload["settled_amount"])
    return payload


def business_report_payload(row: sqlite3.Row) -> dict:
    payload = dict(row)
    file_path = payload.get("file_path") or ""
    payload["file_url"] = public_file_path(file_path) if file_path else ""
    payload["file_name"] = Path(file_path).name if file_path else ""
    return payload


def list_rights_records(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    today = datetime.now(timezone.utc).date().isoformat()
    rows = conn.execute(
        """
        SELECT * FROM rights_records
        WHERE project_id = ?
        ORDER BY COALESCE(start_date, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [rights_record_payload(row, today=today) for row in rows]


def list_cost_items(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM cost_items
        WHERE project_id = ?
        ORDER BY COALESCE(occurred_on, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [cost_item_payload(row) for row in rows]


def list_distribution_channels(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    today = datetime.now(timezone.utc).date().isoformat()
    rows = conn.execute(
        """
        SELECT * FROM distribution_channels
        WHERE project_id = ?
        ORDER BY COALESCE(release_date, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [distribution_channel_payload(row, today=today) for row in rows]


def list_sales_records(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM sales_records
        WHERE project_id = ?
        ORDER BY COALESCE(period_end, period_start, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [sales_record_payload(row) for row in rows]


def list_royalty_statements(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM royalty_statements
        WHERE project_id = ?
        ORDER BY COALESCE(period_end, period_start, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [royalty_statement_payload(row) for row in rows]


def list_exchange_rates(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM exchange_rates
        WHERE project_id = ?
        ORDER BY target_currency ASC, source_currency ASC, COALESCE(effective_date, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [exchange_rate_payload(row) for row in rows]


def list_advertiser_deals(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM advertiser_deals
        WHERE project_id = ?
        ORDER BY COALESCE(end_date, start_date, '') DESC, updated_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [advertiser_deal_payload(row) for row in rows]


def list_business_reports(conn: sqlite3.Connection, project_id: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT * FROM business_reports
        WHERE project_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (project_id,),
    ).fetchall()
    return [business_report_payload(row) for row in rows]


def select_exchange_rate_candidate(candidates: list[dict], as_of_date: str = "") -> dict | None:
    normalized_as_of = (as_of_date or "").strip()
    if normalized_as_of:
        eligible = [item for item in candidates if not item.get("effective_date") or item["effective_date"] <= normalized_as_of]
        if eligible:
            return eligible[0]
    return candidates[0] if candidates else None


def resolve_exchange_rate(source_currency: str, target_currency: str, exchange_rates: list[dict], *, as_of_date: str = "") -> tuple[float | None, str]:
    source = normalize_currency_code(source_currency)
    target = normalize_currency_code(target_currency)
    if source == target:
        return 1.0, "identity"
    direct = [
        item for item in exchange_rates
        if item["source_currency"] == source and item["target_currency"] == target
    ]
    direct_hit = select_exchange_rate_candidate(direct, as_of_date=as_of_date)
    if direct_hit:
        return float(direct_hit["rate"]), "direct"

    inverse = [
        item for item in exchange_rates
        if item["source_currency"] == target and item["target_currency"] == source and float(item.get("rate") or 0) > 0
    ]
    inverse_hit = select_exchange_rate_candidate(inverse, as_of_date=as_of_date)
    if inverse_hit:
        return 1.0 / float(inverse_hit["rate"]), "inverse"
    return None, "missing"


def convert_money(
    amount: float | int | None,
    source_currency: str | None,
    target_currency: str | None,
    exchange_rates: list[dict],
    *,
    as_of_date: str = "",
) -> tuple[float | None, str]:
    rate, resolution = resolve_exchange_rate(source_currency or "", target_currency or "", exchange_rates, as_of_date=as_of_date)
    if rate is None:
        return None, resolution
    return round_money((amount or 0) * rate), resolution


def project_business_summary(conn: sqlite3.Connection, project_id: int) -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    project = get_project(conn, project_id)
    base_currency = normalize_currency_code(project["business_base_currency"])
    rights_records = list_rights_records(conn, project_id)
    cost_items = list_cost_items(conn, project_id)
    distribution_channels = list_distribution_channels(conn, project_id)
    sales_records = list_sales_records(conn, project_id)
    royalty_statements = list_royalty_statements(conn, project_id)
    exchange_rates = list_exchange_rates(conn, project_id)
    advertiser_deals = list_advertiser_deals(conn, project_id)

    currency_breakdown: dict[str, dict[str, float]] = {}
    missing_currencies: set[str] = set()

    def add_breakdown(currency: str, key: str, amount: float) -> None:
        normalized_currency = normalize_currency_code(currency)
        entry = currency_breakdown.setdefault(normalized_currency, {"cost": 0.0, "sales": 0.0, "royalties": 0.0})
        entry[key] = round_money(entry[key] + amount)

    total_cost = 0.0
    for item in cost_items:
        add_breakdown(item["currency"], "cost", item["amount"])
        converted_amount, resolution = convert_money(item["amount"], item["currency"], base_currency, exchange_rates, as_of_date=item.get("occurred_on") or today)
        if converted_amount is None:
            missing_currencies.add(item["currency"])
        else:
            total_cost += converted_amount

    total_sales = 0.0
    advertiser_revenue = 0.0
    for item in sales_records:
        add_breakdown(item["currency"], "sales", item["net_revenue"])
        converted_amount, _resolution = convert_money(item["net_revenue"], item["currency"], base_currency, exchange_rates, as_of_date=item.get("period_end") or item.get("period_start") or today)
        if converted_amount is None:
            missing_currencies.add(item["currency"])
        else:
            total_sales += converted_amount
            if item.get("channel_category") == "advertiser":
                advertiser_revenue += converted_amount

    total_royalties = 0.0
    for item in royalty_statements:
        add_breakdown(item["currency"], "royalties", item["amount_due"])
        converted_amount, _resolution = convert_money(item["amount_due"], item["currency"], base_currency, exchange_rates, as_of_date=item.get("period_end") or item.get("period_start") or today)
        if converted_amount is None:
            missing_currencies.add(item["currency"])
        else:
            total_royalties += converted_amount

    advertiser_pipeline = 0.0
    advertiser_settled = 0.0
    for item in advertiser_deals:
        converted_contract, _contract_resolution = convert_money(item["contract_amount"], item["currency"], base_currency, exchange_rates, as_of_date=item.get("end_date") or item.get("start_date") or today)
        converted_settled, _settled_resolution = convert_money(item["settled_amount"], item["currency"], base_currency, exchange_rates, as_of_date=item.get("end_date") or item.get("start_date") or today)
        if converted_contract is None or converted_settled is None:
            missing_currencies.add(item["currency"])
        else:
            advertiser_pipeline += converted_contract
            advertiser_settled += converted_settled

    total_cost = round_money(total_cost)
    total_sales = round_money(total_sales)
    total_royalties = round_money(total_royalties)
    gross_profit = round_money(total_sales - total_cost - total_royalties)
    currencies = sorted(
        {
            item.get("currency")
            for item in [*cost_items, *distribution_channels, *sales_records, *royalty_statements, *advertiser_deals]
            if item.get("currency")
        }
    )
    last_sales_date = ""
    if sales_records:
        last_sales_date = max((item.get("period_end") or item.get("period_start") or "") for item in sales_records)

    return {
        "active_rights_count": sum(1 for item in rights_records if rights_record_is_active(item, today)),
        "rights_record_count": len(rights_records),
        "live_channel_count": sum(1 for item in distribution_channels if distribution_channel_is_live(item, today)),
        "advertiser_channel_count": sum(1 for item in distribution_channels if item.get("channel_category") == "advertiser"),
        "advertiser_deal_count": len(advertiser_deals),
        "channel_count": len(distribution_channels),
        "cost_item_count": len(cost_items),
        "sales_record_count": len(sales_records),
        "royalty_statement_count": len(royalty_statements),
        "total_cost": total_cost,
        "total_sales": total_sales,
        "total_royalties": total_royalties,
        "gross_profit": gross_profit,
        "units_sold": sum(int(item.get("units_sold") or 0) for item in sales_records),
        "advertiser_revenue": round_money(advertiser_revenue),
        "advertiser_pipeline": round_money(advertiser_pipeline),
        "advertiser_settled": round_money(advertiser_settled),
        "base_currency": base_currency,
        "currencies": currencies,
        "is_multi_currency": len(currencies) > 1,
        "exchange_rate_count": len(exchange_rates),
        "conversion_ready": not missing_currencies,
        "unconverted_currencies": sorted(missing_currencies),
        "unconverted_currency_count": len(missing_currencies),
        "currency_breakdown": currency_breakdown,
        "last_sales_date": last_sales_date,
    }


def project_business_payload(conn: sqlite3.Connection, project_id: int) -> dict:
    return {
        "summary": project_business_summary(conn, project_id),
        "rights_records": list_rights_records(conn, project_id),
        "distribution_channels": list_distribution_channels(conn, project_id),
        "cost_items": list_cost_items(conn, project_id),
        "sales_records": list_sales_records(conn, project_id),
        "royalty_statements": list_royalty_statements(conn, project_id),
        "exchange_rates": list_exchange_rates(conn, project_id),
        "advertiser_deals": list_advertiser_deals(conn, project_id),
        "business_reports": list_business_reports(conn, project_id),
    }


def get_project_owned_row(conn: sqlite3.Connection, table_name: str, project_id: int, row_id: int, detail_name: str) -> sqlite3.Row:
    row = conn.execute(
        f"SELECT * FROM {table_name} WHERE id = ? AND project_id = ?",
        (row_id, project_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"{detail_name} not found")
    return row


def touch_project(conn: sqlite3.Connection, project_id: int, now: str | None = None) -> None:
    conn.execute(
        "UPDATE projects SET updated_at = ? WHERE id = ?",
        (now or utc_now(), project_id),
    )


def update_project_owned_row(
    conn: sqlite3.Connection,
    table_name: str,
    project_id: int,
    row_id: int,
    updates: dict,
    detail_name: str,
) -> sqlite3.Row:
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    get_project_owned_row(conn, table_name, project_id, row_id, detail_name)
    updates["updated_at"] = utc_now()
    set_clause = ", ".join(f"{column} = ?" for column in updates)
    conn.execute(
        f"UPDATE {table_name} SET {set_clause} WHERE id = ? AND project_id = ?",
        [*updates.values(), row_id, project_id],
    )
    return get_project_owned_row(conn, table_name, project_id, row_id, detail_name)


def business_export_dir(project_id: int) -> Path:
    return GENERATED_DIR / "exports" / f"project_{project_id}" / "business_reports"


def csv_string(rows: list[dict], fieldnames: list[str]) -> str:
    output_lines: list[str] = []
    class _ListWriter:
        def write(self, value: str) -> int:
            output_lines.append(value)
            return len(value)

    writer = csv.DictWriter(_ListWriter(), fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({name: row.get(name, "") for name in fieldnames})
    return "".join(output_lines)


def business_report_html(project: dict, payload: dict) -> str:
    summary = payload["summary"]
    sections = [
        ("Rights Records", payload["rights_records"]),
        ("Distribution Channels", payload["distribution_channels"]),
        ("Cost Items", payload["cost_items"]),
        ("Sales Records", payload["sales_records"]),
        ("Royalty Statements", payload["royalty_statements"]),
        ("Exchange Rates", payload["exchange_rates"]),
        ("Advertiser Deals", payload["advertiser_deals"]),
    ]
    section_blocks: list[str] = []
    for title, items in sections:
        rows = []
        for item in items[:20]:
            cells = "".join(
                f"<td>{escape(str(value))}</td>"
                for key, value in item.items()
                if key not in {"notes", "file_url"}
            )
            rows.append(f"<tr>{cells}</tr>")
        if not rows:
            rows.append("<tr><td colspan='10'>No data</td></tr>")
        header_row = ""
        if items:
            header_row = "".join(
                f"<th>{escape(str(key))}</th>"
                for key in items[0].keys()
                if key not in {"notes", "file_url"}
            )
        section_blocks.append(
            f"""
            <section>
              <h2>{escape(title)}</h2>
              <table>
                <thead><tr>{header_row}</tr></thead>
                <tbody>{''.join(rows)}</tbody>
              </table>
            </section>
            """
        )
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{escape(project['title'])} Business Report</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 28px; color: #1f2937; }}
      h1, h2 {{ margin: 0 0 12px; }}
      .summary {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0 28px; }}
      .card {{ border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; background: #f9fafb; }}
      .eyebrow {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }}
      .value {{ font-size: 24px; font-weight: bold; margin-top: 6px; }}
      table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
      th, td {{ border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }}
      th {{ background: #f3f4f6; }}
      section {{ margin-top: 22px; }}
    </style>
  </head>
  <body>
    <h1>{escape(project['title'])} Business Report</h1>
    <p>Author: {escape(project.get('author') or '')} | Base currency: {escape(summary.get('base_currency') or 'CNY')} | Generated at: {escape(utc_now())}</p>
    <div class="summary">
      <div class="card"><div class="eyebrow">Total Sales</div><div class="value">{summary['total_sales']}</div></div>
      <div class="card"><div class="eyebrow">Total Cost</div><div class="value">{summary['total_cost']}</div></div>
      <div class="card"><div class="eyebrow">Gross Profit</div><div class="value">{summary['gross_profit']}</div></div>
      <div class="card"><div class="eyebrow">Advertiser Revenue</div><div class="value">{summary.get('advertiser_revenue', 0)}</div></div>
      <div class="card"><div class="eyebrow">Advertiser Pipeline</div><div class="value">{summary.get('advertiser_pipeline', 0)}</div></div>
      <div class="card"><div class="eyebrow">Exchange Rates</div><div class="value">{summary.get('exchange_rate_count', 0)}</div></div>
    </div>
    {''.join(section_blocks)}
  </body>
</html>
"""


def generate_business_report_bundle(conn: sqlite3.Connection, project_id: int) -> Path:
    project = project_payload(conn, get_project(conn, project_id), include_business=True)
    payload = project_business_payload(conn, project_id)
    export_dir = business_export_dir(project_id)
    export_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    base_name = f"{slugify(project['title'])}-business-report-{stamp}"
    zip_path = export_dir / f"{base_name}.zip"
    html_text = business_report_html(project, payload)
    csv_map = {
        "rights_records.csv": (payload["rights_records"], ["id", "rights_type", "holder_name", "grant_scope", "territory", "license_language", "contract_code", "start_date", "end_date", "status", "is_active"]),
        "distribution_channels.csv": (payload["distribution_channels"], ["id", "channel_name", "channel_category", "release_format", "release_status", "price", "currency", "release_date", "external_sku", "is_live"]),
        "cost_items.csv": (payload["cost_items"], ["id", "category", "vendor_name", "description", "amount", "currency", "occurred_on", "status"]),
        "sales_records.csv": (payload["sales_records"], ["id", "channel_name", "channel_category", "period_start", "period_end", "units_sold", "gross_revenue", "refunds", "net_revenue", "currency"]),
        "royalty_statements.csv": (payload["royalty_statements"], ["id", "payee_name", "role_name", "basis", "rate_percent", "amount_due", "currency", "period_start", "period_end", "status"]),
        "exchange_rates.csv": (payload["exchange_rates"], ["id", "source_currency", "target_currency", "rate", "effective_date", "notes"]),
        "advertiser_deals.csv": (payload["advertiser_deals"], ["id", "advertiser_name", "campaign_name", "contact_name", "deliverables", "start_date", "end_date", "contract_amount", "settled_amount", "currency", "status", "owner_name", "pending_amount"]),
    }
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("business_report.html", html_text)
        archive.writestr("summary.json", json.dumps(payload["summary"], ensure_ascii=False, indent=2))
        archive.writestr("full_payload.json", json.dumps(payload, ensure_ascii=False, indent=2))
        for filename, (rows, fieldnames) in csv_map.items():
            archive.writestr(filename, csv_string(rows, fieldnames))
    return zip_path


def segment_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    segment = dict(row)
    latest_take = None
    if segment["latest_audio_take_id"]:
        latest_take = conn.execute(
            "SELECT * FROM audio_takes WHERE id = ?", (segment["latest_audio_take_id"],)
        ).fetchone()
    issue_count = conn.execute(
        "SELECT COUNT(*) AS count FROM review_issues WHERE segment_id = ? AND status = 'open'",
        (segment["id"],),
    ).fetchone()["count"]
    character = None
    if segment.get("character_profile_id"):
        character = conn.execute(
            """
            SELECT character_profiles.*, voice_profiles.name AS voice_profile_name, voice_profiles.voice_name AS voice_name
            FROM character_profiles
            JOIN voice_profiles ON voice_profiles.id = character_profiles.voice_profile_id
            WHERE character_profiles.id = ?
            """,
            (segment["character_profile_id"],),
        ).fetchone()
    segment["latest_take"] = audio_take_payload(latest_take) if latest_take else None
    segment["open_issue_count"] = issue_count
    segment["character_profile"] = attach_character_looks(conn, character_profile_payload(character))
    return segment


def audio_take_payload(row: sqlite3.Row | None) -> dict | None:
    if not row:
        return None
    payload = dict(row)
    payload["file_url"] = public_file_path(payload["file_path"])
    return payload


def chapter_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    chapter = dict(row)
    stats = conn.execute(
        """
        SELECT COUNT(*) AS segment_count,
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
               SUM(CASE WHEN status = 'review_required' THEN 1 ELSE 0 END) AS review_count
        FROM segments
        WHERE chapter_id = ?
        """,
        (row["id"],),
    ).fetchone()
    chapter.update(
        {
            "segment_count": stats["segment_count"] or 0,
            "approved_count": stats["approved_count"] or 0,
            "review_count": stats["review_count"] or 0,
        }
    )
    return chapter


def run_mock_qc(text: str, duration: float) -> tuple[str, float, list[dict]]:
    normalized = " ".join(text.split()).strip()
    issues: list[dict] = []
    asr_text = normalized
    score = 95.0
    if len(normalized) > 120:
        issues.append(
            {
                "issue_type": "pacing",
                "severity": "medium",
                "source": "auto",
                "description": "Segment is long. Manual pacing review recommended.",
            }
        )
        score -= 10
    if any(char.isdigit() for char in normalized):
        issues.append(
            {
                "issue_type": "pronunciation",
                "severity": "high",
                "source": "auto",
                "description": "Detected numeric content. Confirm spoken reading manually.",
            }
        )
        score -= 12
    if duration > 18:
        issues.append(
            {
                "issue_type": "duration",
                "severity": "medium",
                "source": "auto",
                "description": "Take duration is unusually long for a single segment.",
            }
        )
        score -= 6
    if issues and len(normalized) > 20:
        words = normalized.split()
        if len(words) > 4:
            remove_at = min(2, len(words) - 1)
            words.pop(remove_at)
            asr_text = " ".join(words)
        elif len(normalized) > 10:
            asr_text = normalized[:-2]
    return asr_text, max(score, 60.0), issues


def run_qc(reference_text: str, asr_text: str | None, duration: float) -> tuple[str, float, list[dict]]:
    normalized_reference = " ".join(reference_text.split()).strip()
    if not asr_text:
        return run_mock_qc(reference_text, duration)

    normalized_asr = " ".join(asr_text.split()).strip()
    issues: list[dict] = []
    ratio = SequenceMatcher(None, normalized_reference, normalized_asr).ratio() if normalized_reference else 1.0
    score = round(ratio * 100, 1)

    if ratio < 0.9:
        issues.append(
            {
                "issue_type": "missing_words",
                "severity": "high" if ratio < 0.78 else "medium",
                "source": "auto",
                "description": "ASR 與朗讀稿差異較大，請人工複核。",
            }
        )
    if any(char.isdigit() for char in normalized_reference) and normalized_reference != normalized_asr:
        issues.append(
            {
                "issue_type": "pronunciation",
                "severity": "high",
                "source": "auto",
                "description": "含數字內容且 ASR 結果不完全一致，請確認是否讀對。",
            }
        )
    if len(normalized_reference) > 120:
        issues.append(
            {
                "issue_type": "pacing",
                "severity": "medium",
                "source": "auto",
                "description": "段落偏長，建議人工檢查語速與停頓。",
            }
        )
        score -= 8
    if duration > 18:
        issues.append(
            {
                "issue_type": "duration",
                "severity": "medium",
                "source": "auto",
                "description": "此段音訊時長偏長，建議人工檢查。",
            }
        )
        score -= 6
    return normalized_asr, max(score, 55.0), issues


def log_activity(conn: sqlite3.Connection, actor_id: int | None, entity_type: str, entity_id: int, action: str, detail: str = "") -> None:
    conn.execute(
        """
        INSERT INTO activity_logs (actor_id, entity_type, entity_id, action, detail, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (actor_id, entity_type, entity_id, action, detail, utc_now()),
    )


def resolve_generated_artifact(value: str | Path | None) -> Path | None:
    if not value:
        return None
    try:
        resolved = Path(value).expanduser().resolve()
    except OSError:
        return None
    generated_root = GENERATED_DIR.resolve()
    if resolved == generated_root or not resolved.is_relative_to(generated_root):
        return None
    return resolved


def prune_empty_generated_parents(path: Path) -> None:
    generated_root = GENERATED_DIR.resolve()
    current = path.resolve()
    while current != generated_root and current.is_relative_to(generated_root):
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent


def remove_generated_file(value: str | Path | None) -> None:
    path = resolve_generated_artifact(value)
    if not path:
        return
    path.unlink(missing_ok=True)
    prune_empty_generated_parents(path.parent)


def remove_generated_tree(path: Path) -> None:
    resolved = resolve_generated_artifact(path)
    if not resolved:
        return
    if resolved.is_file() or resolved.is_symlink():
        resolved.unlink(missing_ok=True)
    else:
        shutil.rmtree(resolved, ignore_errors=True)
    prune_empty_generated_parents(resolved.parent)


def import_project_document(project_id: int, filename: str, raw: bytes, user_id: int) -> int:
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    try:
        chapters = normalize_project_chapters(extract_chapters_from_upload(filename or "upload.txt", raw))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with get_conn() as conn:
        get_project(conn, project_id)
        remove_generated_tree(GENERATED_DIR / "audio" / f"project_{project_id}")
        remove_generated_tree(GENERATED_DIR / "renders" / f"project_{project_id}")
        remove_generated_tree(GENERATED_DIR / "exports" / f"project_{project_id}")
        remove_generated_tree(GENERATED_DIR / "imports" / f"project_{project_id}")
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM export_tasks WHERE project_id = ?", (project_id,))
        now = utc_now()
        import_dir = project_import_dir(project_id)
        import_dir.mkdir(parents=True, exist_ok=True)
        import_name = Path(filename or f"project_{project_id}.txt").name or f"project_{project_id}.txt"
        import_path = import_dir / import_name
        import_path.write_bytes(raw)
        persist_project_source_book(project_id, chapters)
        for chapter_index, (title, body) in enumerate(chapters, start=1):
            create_chapter_record(conn, project_id, title, body, chapter_index, now=now)
        conn.execute("UPDATE projects SET status = 'active', updated_at = ? WHERE id = ?", (now, project_id))
        log_activity(conn, user_id, "project", project_id, "import", filename or "")

    return len(chapters)


def artifact_paths_from_query(conn: sqlite3.Connection, query: str, params: tuple) -> set[Path]:
    rows = conn.execute(query, params).fetchall()
    paths: set[Path] = set()
    for row in rows:
        candidate = resolve_generated_artifact(row[0])
        if candidate:
            paths.add(candidate)
    return paths


def collect_segment_artifacts(conn: sqlite3.Connection, segment_id: int) -> set[Path]:
    return artifact_paths_from_query(
        conn,
        """
        SELECT file_path FROM audio_takes WHERE segment_id = ? AND file_path <> ''
        UNION
        SELECT output_path FROM generation_jobs WHERE segment_id = ? AND output_path <> ''
        """,
        (segment_id, segment_id),
    )


def collect_chapter_artifacts(conn: sqlite3.Connection, chapter_id: int) -> set[Path]:
    return artifact_paths_from_query(
        conn,
        """
        SELECT audio_takes.file_path
        FROM audio_takes
        JOIN segments ON segments.id = audio_takes.segment_id
        WHERE segments.chapter_id = ? AND audio_takes.file_path <> ''
        UNION
        SELECT output_path FROM generation_jobs WHERE chapter_id = ? AND output_path <> ''
        UNION
        SELECT file_path FROM chapter_renders WHERE chapter_id = ? AND file_path <> ''
        """,
        (chapter_id, chapter_id, chapter_id),
    )


def collect_comic_page_artifacts(conn: sqlite3.Connection, comic_page_id: int) -> set[Path]:
    return artifact_paths_from_query(
        conn,
        "SELECT image_path FROM comic_panels WHERE comic_page_id = ? AND image_path <> ''",
        (comic_page_id,),
    )


def reindex_chapters(conn: sqlite3.Connection, project_id: int) -> None:
    rows = conn.execute("SELECT id FROM chapters WHERE project_id = ? ORDER BY order_index, id", (project_id,)).fetchall()
    for index, row in enumerate(rows, start=1):
        conn.execute("UPDATE chapters SET order_index = ?, updated_at = ? WHERE id = ?", (index, utc_now(), row["id"]))


def reindex_segments(conn: sqlite3.Connection, chapter_id: int) -> None:
    rows = conn.execute("SELECT id FROM segments WHERE chapter_id = ? ORDER BY order_index, id", (chapter_id,)).fetchall()
    for index, row in enumerate(rows, start=1):
        conn.execute("UPDATE segments SET order_index = ?, updated_at = ? WHERE id = ?", (index, utc_now(), row["id"]))


def next_comic_page_no(conn: sqlite3.Connection, project_id: int) -> int:
    row = conn.execute("SELECT COALESCE(MAX(page_no), 0) AS value FROM comic_pages WHERE project_id = ?", (project_id,)).fetchone()
    return (row["value"] or 0) + 1


def next_comic_panel_no(conn: sqlite3.Connection, comic_page_id: int) -> int:
    row = conn.execute("SELECT COALESCE(MAX(panel_no), 0) AS value FROM comic_panels WHERE comic_page_id = ?", (comic_page_id,)).fetchone()
    return (row["value"] or 0) + 1


def reindex_comic_pages(conn: sqlite3.Connection, project_id: int) -> None:
    rows = conn.execute("SELECT id FROM comic_pages WHERE project_id = ? ORDER BY page_no, id", (project_id,)).fetchall()
    for index, row in enumerate(rows, start=1):
        conn.execute("UPDATE comic_pages SET page_no = ?, updated_at = ? WHERE id = ?", (index, utc_now(), row["id"]))


def reindex_comic_panels(conn: sqlite3.Connection, comic_page_id: int) -> None:
    rows = conn.execute("SELECT id FROM comic_panels WHERE comic_page_id = ? ORDER BY panel_no, id", (comic_page_id,)).fetchall()
    for index, row in enumerate(rows, start=1):
        conn.execute("UPDATE comic_panels SET panel_no = ?, updated_at = ? WHERE id = ?", (index, utc_now(), row["id"]))


def wrap_mock_text(value: str, *, width: int = 22, limit: int = 5) -> list[str]:
    normalized = " ".join((value or "").split())
    if not normalized:
        return []
    chunks: list[str] = []
    current = ""
    for char in normalized:
        next_value = f"{current}{char}"
        if len(next_value) > width:
            chunks.append(current)
            current = char
            if len(chunks) >= limit:
                break
        else:
            current = next_value
    if current and len(chunks) < limit:
        chunks.append(current)
    return chunks


def create_mock_panel_image(project: dict, page: dict, panel: dict) -> Path:
    out_dir = GENERATED_DIR / "comic" / f"project_{project['id']}" / f"page_{page['id']}"
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / f"panel_{panel['id']}.svg"
    prompt_lines = wrap_mock_text(panel.get("prompt_text") or panel.get("script_text") or panel.get("dialogue_text") or "Pending prompt")
    dialogue_lines = wrap_mock_text(panel.get("dialogue_text") or panel.get("caption_text") or "No dialogue yet", width=24, limit=3)
    prompt_svg = "".join(
        f'<text x="32" y="{164 + index * 22}" font-size="18" fill="#11423d">{escape(line)}</text>'
        for index, line in enumerate(prompt_lines)
    )
    dialogue_svg = "".join(
        f'<text x="36" y="{438 + index * 20}" font-size="16" fill="#ffffff">{escape(line)}</text>'
        for index, line in enumerate(dialogue_lines)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f7ede2" />
    <stop offset="52%" stop-color="#d6e7e3" />
    <stop offset="100%" stop-color="#b7d3d0" />
  </linearGradient>
</defs>
<rect width="900" height="1280" rx="32" fill="url(#bg)" />
<rect x="28" y="28" width="844" height="1224" rx="28" fill="rgba(255,255,255,0.56)" stroke="#1f2937" stroke-opacity="0.12" />
<text x="42" y="72" font-size="24" fill="#0f766e">AI Publisher Comic Mock</text>
<text x="42" y="106" font-size="36" fill="#1f2937">{escape(project["title"])}</text>
<text x="42" y="138" font-size="22" fill="#5b6777">Page {page["page_no"]} / Panel {panel["panel_no"]}</text>
<rect x="32" y="188" width="836" height="620" rx="24" fill="#f7fbfb" stroke="#0f766e" stroke-opacity="0.18" stroke-dasharray="10 10" />
<text x="56" y="244" font-size="20" fill="#0f766e">Prompt</text>
{prompt_svg}
<text x="56" y="884" font-size="18" fill="#0f766e">Shot: {escape(panel.get("shot_type") or "pending")} / Camera: {escape(panel.get("camera_angle") or "pending")}</text>
<text x="56" y="914" font-size="18" fill="#5b6777">Layout: {escape(page.get("layout_preset") or "freeform")}</text>
<rect x="32" y="968" width="836" height="212" rx="26" fill="#163b39" />
<text x="56" y="1018" font-size="20" fill="#9ed9d2">Dialogue</text>
{dialogue_svg}
<text x="56" y="1196" font-size="16" fill="#dce9e7">This is a local placeholder panel so the workflow can be reviewed before AI image generation is wired in.</text>
</svg>
"""
    output_path.write_text(svg, encoding="utf-8")
    return output_path


def run_segment_generation(job_id: int) -> None:
    with get_conn() as conn:
        job = conn.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            return
        segment = get_segment(conn, job["segment_id"])
        project = get_project(conn, segment["project_id"])
        conn.execute(
            "UPDATE generation_jobs SET status = 'running', updated_at = ? WHERE id = ?",
            (utc_now(), job_id),
        )
        conn.execute(
            "UPDATE segments SET status = 'generating', updated_at = ? WHERE id = ?",
            (utc_now(), segment["id"]),
        )
        voice = voice_for_project(conn, segment["project_id"], segment["voice_profile_id"], segment["character_profile_id"])

    try:
        base_name = f"segment-{segment['id']}-v{datetime.now(timezone.utc).strftime('%H%M%S')}"
        out_dir = GENERATED_DIR / "audio" / f"project_{segment['project_id']}" / f"chapter_{segment['chapter_id']}"
        generation = generate_speech(
            segment["tts_text"] or segment["source_text"],
            dict(voice),
            out_dir,
            base_name,
            language=project["language"],
        )
        try:
            transcription = transcribe_audio(generation.file_path, language=project["language"])
        except (ProviderConfigError, ProviderRequestError):
            transcription = None
        asr_text, qc_score, issues = run_qc(segment["tts_text"] or segment["source_text"], transcription.text if transcription else None, generation.duration_seconds)

        with get_conn() as conn:
            current_job = conn.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
            current_segment = conn.execute("SELECT * FROM segments WHERE id = ?", (segment["id"],)).fetchone()
            if not current_job or not current_segment or current_job["segment_id"] != segment["id"]:
                remove_generated_file(generation.file_path)
                return
            version_no = (
                conn.execute("SELECT COALESCE(MAX(version_no), 0) AS value FROM audio_takes WHERE segment_id = ?", (segment["id"],)).fetchone()["value"] + 1
            )
            request_id = generation.request_id or f"{generation.provider}-{job_id}-{random.randint(1000, 9999)}"
            take_id = conn.execute(
                """
                INSERT INTO audio_takes (segment_id, version_no, source_kind, file_path, duration_seconds, request_id, created_at)
                VALUES (?, ?, 'generated', ?, ?, ?, ?)
                """,
                (segment["id"], version_no, str(generation.file_path), generation.duration_seconds, request_id, utc_now()),
            ).lastrowid
            conn.execute("DELETE FROM review_issues WHERE segment_id = ? AND source = 'auto'", (segment["id"],))
            for issue in issues:
                conn.execute(
                    """
                    INSERT INTO review_issues (segment_id, audio_take_id, issue_type, severity, source, description, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
                    """,
                    (segment["id"], take_id, issue["issue_type"], issue["severity"], issue["source"], issue["description"], utc_now()),
                )
            conn.execute(
                """
                UPDATE segments
                SET latest_audio_take_id = ?, status = 'review_required', asr_text = ?, qc_score = ?, updated_at = ?
                WHERE id = ?
                """,
                (take_id, asr_text, qc_score, utc_now(), segment["id"]),
            )
            conn.execute(
                """
                UPDATE generation_jobs
                SET status = 'succeeded', provider = ?, model = ?, request_id = ?, output_path = ?, updated_at = ?
                WHERE id = ?
                """,
                (generation.provider, generation.model, request_id, str(generation.file_path), utc_now(), job_id),
            )
            log_activity(conn, None, "segment", segment["id"], "generate", f"take:{take_id}")
    except (ProviderConfigError, ProviderRequestError, Exception) as exc:  # pragma: no cover - network/runtime dependent
        with get_conn() as conn:
            current_job = conn.execute("SELECT id FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
            current_segment = conn.execute("SELECT id FROM segments WHERE id = ?", (segment["id"],)).fetchone()
            if not current_job or not current_segment:
                return
            conn.execute(
                "UPDATE generation_jobs SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
                (str(exc), utc_now(), job_id),
            )
            conn.execute(
                "UPDATE segments SET status = 'rejected', updated_at = ? WHERE id = ?",
                (utc_now(), segment["id"]),
            )


def queue_chapter_generation_jobs(
    conn: sqlite3.Connection,
    chapter: sqlite3.Row | dict,
    *,
    force_project_default_voice: bool = False,
) -> tuple[list[int], int]:
    chapter_payload = dict(chapter)
    chapter_id = chapter_payload["id"]
    project_id = chapter_payload["project_id"]
    cleared_override_count = 0

    if force_project_default_voice:
        project = get_project(conn, project_id)
        if not project["default_voice_profile_id"]:
            raise HTTPException(status_code=400, detail="請先設定專案預設聲線")
        cleared_override_count = conn.execute(
            """
            SELECT COUNT(*) AS value
            FROM segments
            WHERE chapter_id = ? AND (voice_profile_id IS NOT NULL OR character_profile_id IS NOT NULL)
            """,
            (chapter_id,),
        ).fetchone()["value"]
        conn.execute(
            """
            UPDATE segments
            SET voice_profile_id = NULL,
                character_profile_id = NULL,
                updated_at = ?
            WHERE chapter_id = ?
            """,
            (utc_now(), chapter_id),
        )

    segments = conn.execute(
        """
        SELECT * FROM segments
        WHERE chapter_id = ? AND COALESCE(tts_text, '') <> ''
        ORDER BY order_index
        """,
        (chapter_id,),
    ).fetchall()
    job_ids: list[int] = []
    for segment in segments:
        voice = voice_for_project(conn, project_id, segment["voice_profile_id"], segment["character_profile_id"])
        job_id = conn.execute(
            """
            INSERT INTO generation_jobs (project_id, chapter_id, segment_id, job_type, status, provider, model, input_text, created_at, updated_at)
            VALUES (?, ?, ?, 'generate_segment', 'pending', ?, ?, ?, ?, ?)
            """,
            (project_id, chapter_id, segment["id"], voice["provider"], voice["model"], segment["tts_text"], utc_now(), utc_now()),
        ).lastrowid
        conn.execute("UPDATE segments SET status = 'queued', updated_at = ? WHERE id = ?", (utc_now(), segment["id"]))
        job_ids.append(job_id)
    return job_ids, cleared_override_count


def queue_project_generation_jobs(
    conn: sqlite3.Connection,
    project_id: int,
    *,
    force_project_default_voice: bool = False,
) -> tuple[list[int], int, int]:
    get_project(conn, project_id)
    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index, id",
        (project_id,),
    ).fetchall()
    all_job_ids: list[int] = []
    cleared_override_count = 0
    chapter_count = 0
    for chapter in chapters:
        job_ids, cleared_count = queue_chapter_generation_jobs(
            conn,
            chapter,
            force_project_default_voice=force_project_default_voice,
        )
        if job_ids:
            chapter_count += 1
            all_job_ids.extend(job_ids)
        cleared_override_count += cleared_count
    return all_job_ids, cleared_override_count, chapter_count


def generation_preview_for_chapter(conn: sqlite3.Connection, chapter_id: int) -> dict:
    chapter = get_chapter(conn, chapter_id)
    project = get_project(conn, chapter["project_id"])
    if not project["default_voice_profile_id"]:
        raise HTTPException(status_code=400, detail="請先設定專案預設聲線")
    voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (project["default_voice_profile_id"],)).fetchone()
    queueable_segment_count = conn.execute(
        """
        SELECT COUNT(*) AS value
        FROM segments
        WHERE chapter_id = ? AND COALESCE(tts_text, '') <> ''
        """,
        (chapter_id,),
    ).fetchone()["value"]
    cleared_override_count = conn.execute(
        """
        SELECT COUNT(*) AS value
        FROM segments
        WHERE chapter_id = ? AND (voice_profile_id IS NOT NULL OR character_profile_id IS NOT NULL)
        """,
        (chapter_id,),
    ).fetchone()["value"]
    return {
        "scope": "chapter",
        "chapter_id": chapter_id,
        "chapter_title": chapter["title"],
        "project_id": project["id"],
        "project_title": project["title"],
        "queueable_segment_count": queueable_segment_count,
        "cleared_override_count": cleared_override_count,
        "voice_profile": dict(voice) if voice else None,
        "is_elevenlabs": bool(voice and voice["provider"] == "elevenlabs"),
    }


def generation_preview_for_project(conn: sqlite3.Connection, project_id: int) -> dict:
    project = get_project(conn, project_id)
    if not project["default_voice_profile_id"]:
        raise HTTPException(status_code=400, detail="請先設定專案預設聲線")
    voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (project["default_voice_profile_id"],)).fetchone()
    queueable_segment_count = conn.execute(
        """
        SELECT COUNT(*) AS value
        FROM segments
        WHERE project_id = ? AND COALESCE(tts_text, '') <> ''
        """,
        (project_id,),
    ).fetchone()["value"]
    cleared_override_count = conn.execute(
        """
        SELECT COUNT(*) AS value
        FROM segments
        WHERE project_id = ? AND (voice_profile_id IS NOT NULL OR character_profile_id IS NOT NULL)
        """,
        (project_id,),
    ).fetchone()["value"]
    chapter_count = conn.execute(
        "SELECT COUNT(*) AS value FROM chapters WHERE project_id = ?",
        (project_id,),
    ).fetchone()["value"]
    return {
        "scope": "project",
        "project_id": project_id,
        "project_title": project["title"],
        "chapter_count": chapter_count,
        "queueable_segment_count": queueable_segment_count,
        "cleared_override_count": cleared_override_count,
        "voice_profile": dict(voice) if voice else None,
        "is_elevenlabs": bool(voice and voice["provider"] == "elevenlabs"),
    }


def run_chapter_render(render_id: int) -> None:
    with get_conn() as conn:
        render = conn.execute("SELECT * FROM chapter_renders WHERE id = ?", (render_id,)).fetchone()
        if not render:
            return
        chapter = get_chapter(conn, render["chapter_id"])
        project = get_project(conn, chapter["project_id"])
        segment_rows = conn.execute(
            """
            SELECT segments.*, audio_takes.file_path
            FROM segments
            JOIN audio_takes ON audio_takes.id = segments.latest_audio_take_id
            WHERE segments.chapter_id = ? AND segments.status = 'approved'
            ORDER BY segments.order_index
            """,
            (chapter["id"],),
        ).fetchall()
        conn.execute("UPDATE chapter_renders SET status = 'running' WHERE id = ?", (render_id,))

    try:
        if not segment_rows:
            raise ValueError("No approved segments available for render")
        out_dir = GENERATED_DIR / "renders" / f"project_{chapter['project_id']}"
        base = f"{slugify(project['title'])}-chapter-{chapter['order_index']}-v{render['render_version']}.wav"
        wav_paths = [Path(row["file_path"]) for row in segment_rows]
        output_path = concat_wavs(wav_paths, out_dir / base)
        with get_conn() as conn:
            conn.execute(
                "UPDATE chapter_renders SET status = 'succeeded', file_path = ? WHERE id = ?",
                (str(output_path), render_id),
            )
            conn.execute("UPDATE chapters SET status = 'rendered', updated_at = ? WHERE id = ?", (utc_now(), chapter["id"]))
            log_activity(conn, None, "chapter", chapter["id"], "render", str(output_path))
    except Exception as exc:
        with get_conn() as conn:
            conn.execute("UPDATE chapter_renders SET status = 'failed', file_path = ? WHERE id = ?", (str(exc), render_id))


def run_export_task(task_id: int) -> None:
    with get_conn() as conn:
        task = conn.execute("SELECT * FROM export_tasks WHERE id = ?", (task_id,)).fetchone()
        if not task:
            return
        project = get_project(conn, task["project_id"])
        renders = conn.execute(
            """
            SELECT chapters.title, chapter_renders.file_path
            FROM chapter_renders
            JOIN chapters ON chapters.id = chapter_renders.chapter_id
            WHERE chapters.project_id = ? AND chapter_renders.status = 'succeeded'
            ORDER BY chapters.order_index, chapter_renders.render_version DESC
            """,
            (project["id"],),
        ).fetchall()
        unique_renders: dict[str, Path] = {}
        for row in renders:
            unique_renders.setdefault(row["title"], Path(row["file_path"]))
        conn.execute("UPDATE export_tasks SET status = 'running' WHERE id = ?", (task_id,))

    try:
        if not unique_renders:
            raise ValueError("No chapter renders available for export")
        output_path = create_export_zip(
            project["title"],
            list(unique_renders.items()),
            GENERATED_DIR / "exports" / f"project_{project['id']}",
            source_book_path=project_source_book_path(project["id"]),
        )
        with get_conn() as conn:
            conn.execute("UPDATE export_tasks SET status = 'succeeded', file_path = ? WHERE id = ?", (str(output_path), task_id))
            log_activity(conn, None, "project", project["id"], "export", str(output_path))
    except Exception as exc:
        with get_conn() as conn:
            conn.execute("UPDATE export_tasks SET status = 'failed', file_path = ? WHERE id = ?", (str(exc), task_id))


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "app": APP_TITLE}


@app.get("/api/auth/demo-accounts")
def demo_accounts() -> dict:
    accounts = build_demo_accounts_payload()
    return {
        "items": accounts,
        "default_account": accounts[0] if accounts else None,
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict:
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email,)).fetchone()
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token()
        conn.execute("INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)", (user["id"], token, utc_now()))
    demo_accounts = build_demo_accounts_payload()
    return {
        "token": token,
        "user": build_user_payload(user),
        "demo_credentials": demo_accounts[0] if demo_accounts else None,
        "demo_accounts": demo_accounts,
    }


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    return user


@app.post("/api/auth/logout")
def logout(request: Request, user: dict = Depends(get_current_user)) -> dict:
    auth = request.headers.get("Authorization", "").replace("Bearer ", "", 1).strip()
    with get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (auth,))
    return {"success": True}


@app.get("/api/projects")
def list_projects(user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT projects.*
            FROM projects
            ORDER BY updated_at DESC
            """
        ).fetchall()
        payload = []
        for row in rows:
            payload.append(project_payload(conn, row))
    return {"items": payload}


@app.post("/api/projects")
def create_project(payload: ProjectCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "project_manage")
    now = utc_now()
    project_type = (payload.project_type or "audiobook").strip().lower() or "audiobook"
    with get_conn() as conn:
        default_voice = conn.execute("SELECT id FROM voice_profiles WHERE is_default = 1 ORDER BY id LIMIT 1").fetchone()
        comic_settings = json.dumps(merge_settings(payload.comic_settings, comic_settings_defaults()), ensure_ascii=False)
        video_settings = json.dumps(merge_settings(payload.video_settings, video_settings_defaults()), ensure_ascii=False)
        project_id = conn.execute(
            """
            INSERT INTO projects (title, author, language, description, project_type, comic_settings, video_settings, status, default_voice_profile_id, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
            """,
            (
                payload.title,
                payload.author,
                payload.language,
                payload.description,
                project_type,
                comic_settings,
                video_settings,
                default_voice["id"] if default_voice else None,
                user["id"],
                now,
                now,
            ),
        ).lastrowid
        log_activity(conn, user["id"], "project", project_id, "create", payload.title)
        project = get_project(conn, project_id)
    with get_conn() as conn:
        project = get_project(conn, project_id)
        return {"project": project_payload(conn, project)}


@app.get("/api/projects/{project_id}")
def get_project_detail(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        project = project_payload(conn, get_project(conn, project_id), include_business="business_manage" in permissions_for_role(user.get("role")))
        chapters = conn.execute("SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index", (project_id,)).fetchall()
        project["chapters"] = [chapter_payload(conn, row) for row in chapters]
    return {"project": project}


@app.get("/api/projects/{project_id}/business")
def get_project_business(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        return project_business_payload(conn, project_id)


@app.post("/api/projects/{project_id}/business-base-currency")
def update_business_base_currency(project_id: int, payload: BusinessBaseCurrencyUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        currency = normalize_currency_code(payload.business_base_currency)
        conn.execute(
            "UPDATE projects SET business_base_currency = ?, updated_at = ? WHERE id = ?",
            (currency, utc_now(), project_id),
        )
        log_activity(conn, user["id"], "project", project_id, "business_base_currency", currency)
        return {"currency": currency, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/rights-records")
def create_rights_record(project_id: int, payload: RightsRecordCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        record_id = conn.execute(
            """
            INSERT INTO rights_records
            (project_id, rights_type, holder_name, grant_scope, territory, license_language, contract_code, start_date, end_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                (payload.rights_type or "audiobook").strip() or "audiobook",
                payload.holder_name.strip(),
                payload.grant_scope.strip(),
                payload.territory.strip(),
                payload.license_language.strip(),
                payload.contract_code.strip(),
                payload.start_date.strip(),
                payload.end_date.strip(),
                (payload.status or "active").strip() or "active",
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "rights_records", project_id, record_id, "Rights record")
        log_activity(conn, user["id"], "rights_record", record_id, "create", payload.holder_name.strip())
        return {"item": rights_record_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/rights-records/{record_id}")
def update_rights_record(project_id: int, record_id: int, payload: RightsRecordUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "holder_name" in updates:
        updates["holder_name"] = updates["holder_name"].strip()
    with get_conn() as conn:
        row = update_project_owned_row(conn, "rights_records", project_id, record_id, updates, "Rights record")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "rights_record", record_id, "update", row["holder_name"])
        return {"item": rights_record_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/rights-records/{record_id}")
def delete_rights_record(project_id: int, record_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "rights_records", project_id, record_id, "Rights record")
        conn.execute("DELETE FROM rights_records WHERE id = ?", (record_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "rights_record", record_id, "delete", row["holder_name"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/cost-items")
def create_cost_item(project_id: int, payload: CostItemCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        item_id = conn.execute(
            """
            INSERT INTO cost_items
            (project_id, category, vendor_name, description, amount, currency, occurred_on, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                (payload.category or "production").strip() or "production",
                payload.vendor_name.strip(),
                payload.description.strip(),
                round_money(payload.amount),
                normalize_currency_code(payload.currency),
                payload.occurred_on.strip(),
                (payload.status or "booked").strip() or "booked",
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "cost_items", project_id, item_id, "Cost item")
        log_activity(conn, user["id"], "cost_item", item_id, "create", payload.category.strip())
        return {"item": cost_item_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/cost-items/{item_id}")
def update_cost_item(project_id: int, item_id: int, payload: CostItemUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "amount" in updates:
        updates["amount"] = round_money(updates["amount"])
    if "currency" in updates:
        updates["currency"] = normalize_currency_code(updates["currency"])
    with get_conn() as conn:
        row = update_project_owned_row(conn, "cost_items", project_id, item_id, updates, "Cost item")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "cost_item", item_id, "update", row["category"])
        return {"item": cost_item_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/cost-items/{item_id}")
def delete_cost_item(project_id: int, item_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "cost_items", project_id, item_id, "Cost item")
        conn.execute("DELETE FROM cost_items WHERE id = ?", (item_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "cost_item", item_id, "delete", row["category"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/distribution-channels")
def create_distribution_channel(project_id: int, payload: DistributionChannelCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        channel_id = conn.execute(
            """
            INSERT INTO distribution_channels
            (project_id, channel_name, channel_category, release_format, release_status, price, currency, release_date, external_sku, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.channel_name.strip(),
                (payload.channel_category or "retail").strip().lower() or "retail",
                (payload.release_format or "audiobook").strip() or "audiobook",
                (payload.release_status or "planning").strip() or "planning",
                round_money(payload.price),
                normalize_currency_code(payload.currency),
                payload.release_date.strip(),
                payload.external_sku.strip(),
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "distribution_channels", project_id, channel_id, "Distribution channel")
        log_activity(conn, user["id"], "distribution_channel", channel_id, "create", payload.channel_name.strip())
        return {"item": distribution_channel_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/distribution-channels/{channel_id}")
def update_distribution_channel(project_id: int, channel_id: int, payload: DistributionChannelUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "channel_category" in updates:
        updates["channel_category"] = (updates["channel_category"] or "retail").strip().lower() or "retail"
    if "price" in updates:
        updates["price"] = round_money(updates["price"])
    if "currency" in updates:
        updates["currency"] = normalize_currency_code(updates["currency"])
    with get_conn() as conn:
        row = update_project_owned_row(conn, "distribution_channels", project_id, channel_id, updates, "Distribution channel")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "distribution_channel", channel_id, "update", row["channel_name"])
        return {"item": distribution_channel_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/distribution-channels/{channel_id}")
def delete_distribution_channel(project_id: int, channel_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "distribution_channels", project_id, channel_id, "Distribution channel")
        conn.execute("DELETE FROM distribution_channels WHERE id = ?", (channel_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "distribution_channel", channel_id, "delete", row["channel_name"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/sales-records")
def create_sales_record(project_id: int, payload: SalesRecordCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    net_revenue = payload.net_revenue
    if net_revenue is None:
        net_revenue = max(0.0, round_money(payload.gross_revenue - payload.refunds))
    with get_conn() as conn:
        get_project(conn, project_id)
        record_id = conn.execute(
            """
            INSERT INTO sales_records
            (project_id, channel_name, channel_category, period_start, period_end, units_sold, gross_revenue, refunds, net_revenue, currency, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.channel_name.strip(),
                (payload.channel_category or "retail").strip().lower() or "retail",
                payload.period_start.strip(),
                payload.period_end.strip(),
                payload.units_sold,
                round_money(payload.gross_revenue),
                round_money(payload.refunds),
                round_money(net_revenue),
                normalize_currency_code(payload.currency),
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "sales_records", project_id, record_id, "Sales record")
        log_activity(conn, user["id"], "sales_record", record_id, "create", payload.channel_name.strip())
        return {"item": sales_record_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/sales-records/{record_id}")
def update_sales_record(project_id: int, record_id: int, payload: SalesRecordUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "channel_category" in updates:
        updates["channel_category"] = (updates["channel_category"] or "retail").strip().lower() or "retail"
    if "gross_revenue" in updates:
        updates["gross_revenue"] = round_money(updates["gross_revenue"])
    if "refunds" in updates:
        updates["refunds"] = round_money(updates["refunds"])
    if "net_revenue" in updates:
        updates["net_revenue"] = round_money(updates["net_revenue"])
    if "currency" in updates:
        updates["currency"] = normalize_currency_code(updates["currency"])
    with get_conn() as conn:
        if "net_revenue" not in updates and ("gross_revenue" in updates or "refunds" in updates):
            current = get_project_owned_row(conn, "sales_records", project_id, record_id, "Sales record")
            gross = updates.get("gross_revenue", current["gross_revenue"])
            refunds = updates.get("refunds", current["refunds"])
            updates["net_revenue"] = round_money(max(0.0, float(gross) - float(refunds)))
        row = update_project_owned_row(conn, "sales_records", project_id, record_id, updates, "Sales record")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "sales_record", record_id, "update", row["channel_name"])
        return {"item": sales_record_payload(row), "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/exchange-rates")
def create_exchange_rate(project_id: int, payload: ExchangeRateCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    source_currency = normalize_currency_code(payload.source_currency)
    target_currency = normalize_currency_code(payload.target_currency)
    if source_currency == target_currency:
        raise HTTPException(status_code=400, detail="Source and target currency cannot be the same")
    with get_conn() as conn:
        get_project(conn, project_id)
        rate_id = conn.execute(
            """
            INSERT INTO exchange_rates
            (project_id, source_currency, target_currency, rate, effective_date, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                source_currency,
                target_currency,
                round_rate(payload.rate),
                payload.effective_date.strip(),
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "exchange_rates", project_id, rate_id, "Exchange rate")
        log_activity(conn, user["id"], "exchange_rate", rate_id, "create", f"{source_currency}->{target_currency}")
        return {"item": exchange_rate_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/exchange-rates/{rate_id}")
def update_exchange_rate(project_id: int, rate_id: int, payload: ExchangeRateUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "source_currency" in updates:
        updates["source_currency"] = normalize_currency_code(updates["source_currency"])
    if "target_currency" in updates:
        updates["target_currency"] = normalize_currency_code(updates["target_currency"])
    if "rate" in updates:
        updates["rate"] = round_rate(updates["rate"])
    with get_conn() as conn:
        row = update_project_owned_row(conn, "exchange_rates", project_id, rate_id, updates, "Exchange rate")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "exchange_rate", rate_id, "update", f"{row['source_currency']}->{row['target_currency']}")
        return {"item": exchange_rate_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/exchange-rates/{rate_id}")
def delete_exchange_rate(project_id: int, rate_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "exchange_rates", project_id, rate_id, "Exchange rate")
        conn.execute("DELETE FROM exchange_rates WHERE id = ?", (rate_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "exchange_rate", rate_id, "delete", f"{row['source_currency']}->{row['target_currency']}")
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/sales-records/{record_id}")
def delete_sales_record(project_id: int, record_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "sales_records", project_id, record_id, "Sales record")
        conn.execute("DELETE FROM sales_records WHERE id = ?", (record_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "sales_record", record_id, "delete", row["channel_name"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/advertiser-deals")
def create_advertiser_deal(project_id: int, payload: AdvertiserDealCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        deal_id = conn.execute(
            """
            INSERT INTO advertiser_deals
            (project_id, advertiser_name, campaign_name, contact_name, deliverables, start_date, end_date, contract_amount, settled_amount, currency, status, owner_name, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.advertiser_name.strip(),
                payload.campaign_name.strip(),
                payload.contact_name.strip(),
                payload.deliverables.strip(),
                payload.start_date.strip(),
                payload.end_date.strip(),
                round_money(payload.contract_amount),
                round_money(payload.settled_amount),
                normalize_currency_code(payload.currency),
                (payload.status or "proposal").strip().lower() or "proposal",
                payload.owner_name.strip(),
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "advertiser_deals", project_id, deal_id, "Advertiser deal")
        log_activity(conn, user["id"], "advertiser_deal", deal_id, "create", payload.campaign_name.strip())
        return {"item": advertiser_deal_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/advertiser-deals/{deal_id}")
def update_advertiser_deal(project_id: int, deal_id: int, payload: AdvertiserDealUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "contract_amount" in updates:
        updates["contract_amount"] = round_money(updates["contract_amount"])
    if "settled_amount" in updates:
        updates["settled_amount"] = round_money(updates["settled_amount"])
    if "currency" in updates:
        updates["currency"] = normalize_currency_code(updates["currency"])
    if "status" in updates:
        updates["status"] = (updates["status"] or "proposal").strip().lower() or "proposal"
    with get_conn() as conn:
        row = update_project_owned_row(conn, "advertiser_deals", project_id, deal_id, updates, "Advertiser deal")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "advertiser_deal", deal_id, "update", row["campaign_name"])
        return {"item": advertiser_deal_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/advertiser-deals/{deal_id}")
def delete_advertiser_deal(project_id: int, deal_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "advertiser_deals", project_id, deal_id, "Advertiser deal")
        conn.execute("DELETE FROM advertiser_deals WHERE id = ?", (deal_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "advertiser_deal", deal_id, "delete", row["campaign_name"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/business-reports/export")
def export_business_report(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        output_path = generate_business_report_bundle(conn, project_id)
        report_id = conn.execute(
            """
            INSERT INTO business_reports (project_id, report_type, file_path, created_at)
            VALUES (?, 'business_zip', ?, ?)
            """,
            (project_id, str(output_path), utc_now()),
        ).lastrowid
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "business_report", report_id, "export", str(output_path))
        report_row = conn.execute("SELECT * FROM business_reports WHERE id = ?", (report_id,)).fetchone()
        return {"report": business_report_payload(report_row), "summary": project_business_summary(conn, project_id)}


@app.post("/api/projects/{project_id}/royalty-statements")
def create_royalty_statement(project_id: int, payload: RoyaltyStatementCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        statement_id = conn.execute(
            """
            INSERT INTO royalty_statements
            (project_id, payee_name, role_name, basis, rate_percent, amount_due, currency, period_start, period_end, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.payee_name.strip(),
                payload.role_name.strip(),
                (payload.basis or "net_revenue").strip() or "net_revenue",
                round_money(payload.rate_percent),
                round_money(payload.amount_due),
                normalize_currency_code(payload.currency),
                payload.period_start.strip(),
                payload.period_end.strip(),
                (payload.status or "pending").strip() or "pending",
                payload.notes.strip(),
                now,
                now,
            ),
        ).lastrowid
        touch_project(conn, project_id, now)
        row = get_project_owned_row(conn, "royalty_statements", project_id, statement_id, "Royalty statement")
        log_activity(conn, user["id"], "royalty_statement", statement_id, "create", payload.payee_name.strip())
        return {"item": royalty_statement_payload(row), "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}/royalty-statements/{statement_id}")
def update_royalty_statement(project_id: int, statement_id: int, payload: RoyaltyStatementUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "rate_percent" in updates:
        updates["rate_percent"] = round_money(updates["rate_percent"])
    if "amount_due" in updates:
        updates["amount_due"] = round_money(updates["amount_due"])
    if "currency" in updates:
        updates["currency"] = normalize_currency_code(updates["currency"])
    with get_conn() as conn:
        row = update_project_owned_row(conn, "royalty_statements", project_id, statement_id, updates, "Royalty statement")
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "royalty_statement", statement_id, "update", row["payee_name"])
        return {"item": royalty_statement_payload(row), "summary": project_business_summary(conn, project_id)}


@app.delete("/api/projects/{project_id}/royalty-statements/{statement_id}")
def delete_royalty_statement(project_id: int, statement_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "business_manage")
    with get_conn() as conn:
        row = get_project_owned_row(conn, "royalty_statements", project_id, statement_id, "Royalty statement")
        conn.execute("DELETE FROM royalty_statements WHERE id = ?", (statement_id,))
        touch_project(conn, project_id)
        log_activity(conn, user["id"], "royalty_statement", statement_id, "delete", row["payee_name"])
        return {"success": True, "summary": project_business_summary(conn, project_id)}


@app.patch("/api/projects/{project_id}")
def update_project(project_id: int, payload: ProjectUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "project_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    if "project_type" in updates:
        updates["project_type"] = (updates["project_type"] or "audiobook").strip().lower() or "audiobook"
    if "comic_settings" in updates:
        updates["comic_settings"] = json.dumps(merge_settings(updates["comic_settings"], comic_settings_defaults()), ensure_ascii=False)
    if "video_settings" in updates:
        updates["video_settings"] = json.dumps(merge_settings(updates["video_settings"], video_settings_defaults()), ensure_ascii=False)
    if "business_base_currency" in updates:
        updates["business_base_currency"] = normalize_currency_code(updates["business_base_currency"])
    updates["updated_at"] = utc_now()
    set_clause = ", ".join(f"{key} = ?" for key in updates)
    params = list(updates.values()) + [project_id]
    with get_conn() as conn:
        get_project(conn, project_id)
        conn.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", params)
        project = project_payload(conn, get_project(conn, project_id))
    return {"project": project}


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "project_delete")
    project_dirs = [
        GENERATED_DIR / "imports" / f"project_{project_id}",
        GENERATED_DIR / "audio" / f"project_{project_id}",
        GENERATED_DIR / "renders" / f"project_{project_id}",
        GENERATED_DIR / "exports" / f"project_{project_id}",
        GENERATED_DIR / "characters" / f"project_{project_id}",
        GENERATED_DIR / "comic" / f"project_{project_id}",
        GENERATED_DIR / "covers" / f"project_{project_id}",
    ]
    with get_conn() as conn:
        project = dict(get_project(conn, project_id))
        log_activity(conn, user["id"], "project", project_id, "delete", project["title"])
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    for path in project_dirs:
        remove_generated_tree(path)
    return {"success": True, "deleted_project_id": project_id}


@app.post("/api/projects/{project_id}/import")
async def import_project_text(
    project_id: int,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "text_manage")
    raw = await file.read()
    chapter_count = import_project_document(project_id, file.filename or "upload.txt", raw, user["id"])
    return {"success": True, "chapter_count": chapter_count}


@app.post("/api/projects/{project_id}/import-local")
def import_project_local_path(
    project_id: int,
    payload: ProjectImportLocalRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "text_manage")
    path = Path(payload.path).expanduser()
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=400, detail="Local file path does not exist")
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise HTTPException(status_code=400, detail=f"Unable to read local file: {exc}") from exc
    chapter_count = import_project_document(project_id, path.name, raw, user["id"])
    return {"success": True, "chapter_count": chapter_count}


@app.post("/api/projects/{project_id}/import-paste")
def import_project_pasted_text(
    project_id: int,
    payload: ProjectPasteImportRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "text_manage")
    filename = (payload.filename or SOURCE_BOOK_FILENAME).strip() or SOURCE_BOOK_FILENAME
    if not Path(filename).suffix:
        filename = f"{filename}.txt"
    chapter_count = import_project_document(project_id, filename, payload.text.encode("utf-8"), user["id"])
    return {"success": True, "chapter_count": chapter_count}


@app.get("/api/projects/{project_id}/chapters")
def list_chapters(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute("SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index", (project_id,)).fetchall()
        return {"items": [chapter_payload(conn, row) for row in rows]}


@app.post("/api/projects/{project_id}/chapters")
def create_project_chapter(
    project_id: int,
    payload: ProjectChapterCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "text_manage")
    title = (payload.title or "").strip()
    body = normalize_text(payload.body or "")
    if not title:
        raise HTTPException(status_code=400, detail="Chapter title is required")
    if not body:
        raise HTTPException(status_code=400, detail="Chapter body is empty")

    with get_conn() as conn:
        get_project(conn, project_id)
        now = utc_now()
        next_order_index = conn.execute(
            "SELECT COALESCE(MAX(order_index), 0) AS value FROM chapters WHERE project_id = ?",
            (project_id,),
        ).fetchone()["value"] + 1
        chapter_id = create_chapter_record(conn, project_id, title, body, next_order_index, now=now)
        conn.execute("UPDATE projects SET status = 'active', updated_at = ? WHERE id = ?", (now, project_id))
        chapters = conn.execute("SELECT title, source_text FROM chapters WHERE project_id = ? ORDER BY order_index, id", (project_id,)).fetchall()
        persist_project_source_book(project_id, [(row["title"], row["source_text"]) for row in chapters])
        log_activity(conn, user["id"], "chapter", chapter_id, "create", title)
        chapter_data = chapter_payload(conn, get_chapter(conn, chapter_id))

    return {
        "chapter": chapter_data,
        "chapter_id": chapter_id,
        "project_id": project_id,
    }


@app.get("/api/chapters/{chapter_id}/segments")
def list_segments(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        get_chapter(conn, chapter_id)
        rows = conn.execute("SELECT * FROM segments WHERE chapter_id = ? ORDER BY order_index", (chapter_id,)).fetchall()
        return {"items": [segment_payload(conn, row) for row in rows]}


@app.delete("/api/chapters/{chapter_id}")
def delete_chapter(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        chapter = dict(get_chapter(conn, chapter_id))
        artifact_paths = collect_chapter_artifacts(conn, chapter_id)
        log_activity(conn, user["id"], "chapter", chapter_id, "delete", chapter["title"])
        conn.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
        reindex_chapters(conn, chapter["project_id"])
        conn.execute(
            """
            UPDATE projects
            SET status = CASE
                WHEN EXISTS(SELECT 1 FROM chapters WHERE project_id = ?) THEN status
                ELSE 'draft'
            END,
            updated_at = ?
            WHERE id = ?
            """,
            (chapter["project_id"], utc_now(), chapter["project_id"]),
        )
        next_row = conn.execute(
            "SELECT id FROM chapters WHERE project_id = ? ORDER BY order_index, id LIMIT 1",
            (chapter["project_id"],),
        ).fetchone()
        remaining_chapters = conn.execute(
            "SELECT title, source_text FROM chapters WHERE project_id = ? ORDER BY order_index, id",
            (chapter["project_id"],),
        ).fetchall()
        if remaining_chapters:
            persist_project_source_book(
                chapter["project_id"],
                [(row["title"], row["source_text"]) for row in remaining_chapters],
            )
        else:
            remove_generated_file(project_source_book_path(chapter["project_id"]))
    for path in artifact_paths:
        remove_generated_file(path)
    remove_generated_tree(GENERATED_DIR / "audio" / f"project_{chapter['project_id']}" / f"chapter_{chapter_id}")
    return {
        "success": True,
        "deleted_chapter_id": chapter_id,
        "project_id": chapter["project_id"],
        "next_chapter_id": next_row["id"] if next_row else None,
    }


@app.patch("/api/segments/{segment_id}")
def update_segment(segment_id: int, payload: SegmentUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        updates = {
            "tts_text": payload.tts_text,
            "updated_at": utc_now(),
        }
        provided_fields = payload.model_fields_set
        if payload.status is not None:
            updates["status"] = payload.status
        if "voice_profile_id" in provided_fields:
            updates["voice_profile_id"] = payload.voice_profile_id
        if "character_profile_id" in provided_fields:
            updates["character_profile_id"] = payload.character_profile_id
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE segments SET {set_clause} WHERE id = ?", list(updates.values()) + [segment_id])
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), segment["project_id"]))
        updated = get_segment(conn, segment_id)
        log_activity(conn, user["id"], "segment", segment_id, "update", "tts_text")
        return {"segment": segment_payload(conn, updated)}


@app.delete("/api/segments/{segment_id}")
def delete_segment(segment_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        segment = dict(get_segment(conn, segment_id))
        artifact_paths = collect_segment_artifacts(conn, segment_id)
        log_activity(conn, user["id"], "segment", segment_id, "delete", f"chapter:{segment['chapter_id']}")
        conn.execute("DELETE FROM segments WHERE id = ?", (segment_id,))
        reindex_segments(conn, segment["chapter_id"])
        conn.execute("UPDATE chapters SET updated_at = ? WHERE id = ?", (utc_now(), segment["chapter_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), segment["project_id"]))
        next_row = conn.execute(
            "SELECT id FROM segments WHERE chapter_id = ? ORDER BY order_index, id LIMIT 1",
            (segment["chapter_id"],),
        ).fetchone()
    for path in artifact_paths:
        remove_generated_file(path)
    return {
        "success": True,
        "deleted_segment_id": segment_id,
        "chapter_id": segment["chapter_id"],
        "project_id": segment["project_id"],
        "next_segment_id": next_row["id"] if next_row else None,
    }


@app.post("/api/segments/merge")
def merge_segments(payload: MergeSegmentsRequest, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    segment_ids = list(dict.fromkeys(payload.segment_ids))
    if len(segment_ids) < 2:
        raise HTTPException(status_code=400, detail="Please select at least two segments to merge")

    with get_conn() as conn:
        rows = conn.execute(
            f"SELECT * FROM segments WHERE id IN ({','.join('?' for _ in segment_ids)})",
            segment_ids,
        ).fetchall()
        if len(rows) != len(segment_ids):
            raise HTTPException(status_code=404, detail="Some segments were not found")

        ordered_rows = sorted(rows, key=lambda row: (row["chapter_id"], row["order_index"], row["id"]))
        chapter_ids = {row["chapter_id"] for row in ordered_rows}
        if len(chapter_ids) != 1:
            raise HTTPException(status_code=400, detail="Segments must belong to the same chapter")

        active_job_count = conn.execute(
            f"""
            SELECT COUNT(*) AS count
            FROM generation_jobs
            WHERE segment_id IN ({','.join('?' for _ in segment_ids)})
              AND status IN ('pending', 'running')
            """,
            segment_ids,
        ).fetchone()["count"]
        if active_job_count:
            raise HTTPException(status_code=400, detail="Selected segments still have active generation tasks. Please wait for them to finish before merging")

        order_indexes = [row["order_index"] for row in ordered_rows]
        expected_indexes = list(range(order_indexes[0], order_indexes[0] + len(order_indexes)))
        if order_indexes != expected_indexes:
            raise HTTPException(status_code=400, detail="Please select contiguous segments to merge")

        chapter_id = ordered_rows[0]["chapter_id"]
        project_id = ordered_rows[0]["project_id"]
        artifact_paths: set[Path] = set()
        for row in ordered_rows:
            artifact_paths.update(collect_segment_artifacts(conn, row["id"]))

        def merge_text(field: str, *, fallback_to_source: bool = False) -> str:
            chunks = []
            for row in ordered_rows:
                value = (row[field] or "").strip()
                if not value and fallback_to_source:
                    value = (row["source_text"] or "").strip()
                if value:
                    chunks.append(value)
            return "\n\n".join(chunks)

        def shared_value(field: str):
            values = {row[field] for row in ordered_rows}
            return values.pop() if len(values) == 1 else None

        primary_segment = ordered_rows[0]
        merged_source_text = merge_text("source_text")
        merged_tts_text = merge_text("tts_text", fallback_to_source=True)
        merged_character_id = shared_value("character_profile_id")
        merged_voice_id = shared_value("voice_profile_id")
        now = utc_now()

        conn.execute(
            f"DELETE FROM review_issues WHERE segment_id IN ({','.join('?' for _ in segment_ids)})",
            segment_ids,
        )
        conn.execute(
            f"DELETE FROM audio_takes WHERE segment_id IN ({','.join('?' for _ in segment_ids)})",
            segment_ids,
        )
        conn.execute(
            f"DELETE FROM generation_jobs WHERE segment_id IN ({','.join('?' for _ in segment_ids)})",
            segment_ids,
        )
        conn.execute(
            """
            UPDATE segments
            SET source_text = ?, tts_text = ?, status = 'ready', character_profile_id = ?, voice_profile_id = ?,
                latest_audio_take_id = NULL, asr_text = '', qc_score = 0, updated_at = ?
            WHERE id = ?
            """,
            (
                merged_source_text,
                merged_tts_text,
                merged_character_id,
                merged_voice_id,
                now,
                primary_segment["id"],
            ),
        )

        remaining_ids = [row["id"] for row in ordered_rows[1:]]
        if remaining_ids:
            conn.execute(
                f"DELETE FROM segments WHERE id IN ({','.join('?' for _ in remaining_ids)})",
                remaining_ids,
            )
        reindex_segments(conn, chapter_id)
        conn.execute("UPDATE chapters SET updated_at = ? WHERE id = ?", (now, chapter_id))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        updated = get_segment(conn, primary_segment["id"])
        log_activity(conn, user["id"], "segment", primary_segment["id"], "merge", f"{len(segment_ids)} segments")
        response_payload = segment_payload(conn, updated)

    for path in artifact_paths:
        remove_generated_file(path)

    return {
        "success": True,
        "segment": response_payload,
        "merged_segment_id": primary_segment["id"],
        "deleted_segment_ids": [row_id for row_id in segment_ids if row_id != primary_segment["id"]],
        "chapter_id": chapter_id,
        "project_id": project_id,
    }


@app.get("/api/projects/{project_id}/voice-profiles")
def list_voice_profiles(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_any_permission(user, "text_manage", "settings_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM voice_profiles
            WHERE project_id IS NULL OR project_id = ?
            ORDER BY project_id IS NOT NULL DESC, is_default DESC, id ASC
            """,
            (project_id,),
        ).fetchall()
        return {"items": [dict(row) for row in rows]}


@app.get("/api/projects/{project_id}/character-profiles")
def list_character_profiles(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_any_permission(user, "text_manage", "settings_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            f"""
            {character_query()}
            WHERE character_profiles.project_id = ?
            ORDER BY character_profiles.id ASC
            """,
            (project_id,),
        ).fetchall()
        return {"items": [attach_character_looks(conn, character_profile_payload(row)) for row in rows]}


@app.post("/api/projects/{project_id}/character-profiles")
def create_character_profile(project_id: int, payload: CharacterProfileCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (payload.voice_profile_id,)).fetchone()
        if not voice:
            raise HTTPException(status_code=404, detail="Voice profile not found")
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Character name is required")
        role_type = (payload.role_type or "supporting").strip() or "supporting"
        story_character_name = payload.story_character_name.strip()
        character_id = conn.execute(
            """
            INSERT INTO character_profiles (
                project_id, name, voice_profile_id, role_type, story_character_name, display_title, archetype, summary, personality,
                backstory, catchphrase, default_mood, preset_key, speed_override, style_override,
                instructions, warmth, intensity, humor, mystery, bravery, discipline, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                name,
                payload.voice_profile_id,
                role_type,
                story_character_name,
                payload.display_title.strip(),
                payload.archetype.strip(),
                payload.summary.strip(),
                payload.personality.strip(),
                payload.backstory.strip(),
                payload.catchphrase.strip(),
                payload.default_mood.strip(),
                payload.preset_key.strip(),
                payload.speed_override,
                payload.style_override.strip(),
                payload.instructions.strip(),
                payload.warmth,
                payload.intensity,
                payload.humor,
                payload.mystery,
                payload.bravery,
                payload.discipline,
                now,
            ),
        ).lastrowid
        row = conn.execute(
            f"""
            {character_query()}
            WHERE character_profiles.id = ?
            """,
            (character_id,),
        ).fetchone()
        response_payload = attach_character_looks(conn, character_profile_payload(row))
    return {"character_profile": response_payload}


@app.patch("/api/character-profiles/{character_profile_id}")
def update_character_profile(character_profile_id: int, payload: CharacterProfileUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    provided_fields = payload.model_fields_set
    updates = {key: value for key, value in payload.model_dump().items() if key in provided_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    for key in ("name", "role_type", "story_character_name", "display_title", "archetype", "summary", "personality", "backstory", "catchphrase", "default_mood", "preset_key", "style_override", "instructions"):
        if key in updates and isinstance(updates[key], str):
            updates[key] = updates[key].strip()
    if "name" in updates and not updates["name"]:
        raise HTTPException(status_code=400, detail="Character name is required")
    if "role_type" in updates and not updates["role_type"]:
        updates["role_type"] = "supporting"
    with get_conn() as conn:
        existing = get_character_profile(conn, character_profile_id)
        if "voice_profile_id" in updates:
            voice = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (updates["voice_profile_id"],)).fetchone()
            if not voice:
                raise HTTPException(status_code=404, detail="Voice profile not found")
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE character_profiles SET {set_clause} WHERE id = ?", list(updates.values()) + [character_profile_id])
        row = conn.execute(
            f"""
            {character_query()}
            WHERE character_profiles.id = ?
            """,
            (character_profile_id,),
        ).fetchone()
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), existing["project_id"]))
        response_payload = attach_character_looks(conn, character_profile_payload(row))
    return {"character_profile": response_payload}


@app.delete("/api/character-profiles/{character_profile_id}")
def delete_character_profile(character_profile_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    with get_conn() as conn:
        character = dict(get_character_profile(conn, character_profile_id))
        look_rows = conn.execute("SELECT image_path FROM character_looks WHERE character_profile_id = ?", (character_profile_id,)).fetchall()
        conn.execute("UPDATE segments SET character_profile_id = NULL, updated_at = ? WHERE character_profile_id = ?", (utc_now(), character_profile_id))
        conn.execute("DELETE FROM character_profiles WHERE id = ?", (character_profile_id,))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), character["project_id"]))
    for look_row in look_rows:
        remove_generated_file(look_row["image_path"])
    remove_generated_file(character.get("avatar_path"))
    return {"success": True, "deleted_character_profile_id": character_profile_id}


@app.post("/api/character-profiles/{character_profile_id}/avatar")
async def upload_character_avatar(character_profile_id: int, file: UploadFile = File(...), user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    suffix = Path(file.filename or "avatar.png").suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    with get_conn() as conn:
        character = dict(get_character_profile(conn, character_profile_id))
        avatar_dir = GENERATED_DIR / "characters" / f"project_{character['project_id']}"
        avatar_dir.mkdir(parents=True, exist_ok=True)
        avatar_path = avatar_dir / f"character_{character_profile_id}{suffix}"
        avatar_path.write_bytes(raw)
        previous_path = character.get("avatar_path")
        conn.execute("UPDATE character_profiles SET avatar_path = ? WHERE id = ?", (str(avatar_path), character_profile_id))
        row = conn.execute(
            f"""
            {character_query()}
            WHERE character_profiles.id = ?
            """,
            (character_profile_id,),
        ).fetchone()
        response_payload = attach_character_looks(conn, character_profile_payload(row))
    if previous_path and previous_path != str(avatar_path):
        remove_generated_file(previous_path)
    return {"character_profile": response_payload}


@app.patch("/api/character-profiles/{character_profile_id}/looks/{slot_index}")
def update_character_look(character_profile_id: int, slot_index: int, payload: CharacterLookUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    with get_conn() as conn:
        character = dict(get_character_profile(conn, character_profile_id))
        row = upsert_character_look(
            conn,
            character,
            slot_index,
            label=payload.label,
            source_type="local",
            source_ref="",
        )
    return {"look": character_look_payload(row, slot_index)}


@app.post("/api/character-profiles/{character_profile_id}/looks/{slot_index}/upload")
async def upload_character_look(
    character_profile_id: int,
    slot_index: int,
    file: UploadFile = File(...),
    label: str = Form(""),
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "settings_manage")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    suffix = Path(file.filename or "look.png").suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    with get_conn() as conn:
        character = dict(get_character_profile(conn, character_profile_id))
        row = upsert_character_look(
            conn,
            character,
            slot_index,
            label=label,
            image_bytes=raw,
            suffix=suffix,
            source_type="local",
            source_ref=file.filename or "",
        )
    return {"look": character_look_payload(row, slot_index)}


@app.post("/api/character-profiles/{character_profile_id}/looks/{slot_index}/drive-import")
def import_character_look_from_drive(
    character_profile_id: int,
    slot_index: int,
    payload: CharacterLookImportRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "settings_manage")
    image_bytes, suffix, source_type, source_ref = download_remote_image(payload.url)
    with get_conn() as conn:
        character = dict(get_character_profile(conn, character_profile_id))
        row = upsert_character_look(
            conn,
            character,
            slot_index,
            label=payload.label,
            image_bytes=image_bytes,
            suffix=suffix,
            source_type=source_type,
            source_ref=source_ref,
        )
    return {"look": character_look_payload(row, slot_index)}


@app.delete("/api/character-profiles/{character_profile_id}/looks/{slot_index}")
def delete_character_look(character_profile_id: int, slot_index: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    with get_conn() as conn:
        get_character_profile(conn, character_profile_id)
        existing = conn.execute(
            "SELECT * FROM character_looks WHERE character_profile_id = ? AND slot_index = ?",
            (character_profile_id, slot_index),
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM character_looks WHERE id = ?", (existing["id"],))
            remove_generated_file(existing["image_path"])
    return {"success": True, "slot_index": slot_index}


@app.post("/api/segments/batch-assign-character")
def batch_assign_character(payload: BatchCharacterAssignRequest, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    if not payload.segment_ids:
        raise HTTPException(status_code=400, detail="No segments selected")
    with get_conn() as conn:
        rows = conn.execute(
            f"SELECT id, project_id, chapter_id FROM segments WHERE id IN ({','.join('?' for _ in payload.segment_ids)})",
            payload.segment_ids,
        ).fetchall()
        if len(rows) != len(payload.segment_ids):
            raise HTTPException(status_code=404, detail="Some segments were not found")
        project_ids = {row["project_id"] for row in rows}
        if len(project_ids) != 1:
            raise HTTPException(status_code=400, detail="Segments must belong to the same project")
        if payload.character_profile_id is not None:
            character = get_character_profile(conn, payload.character_profile_id)
            if character["project_id"] != next(iter(project_ids)):
                raise HTTPException(status_code=400, detail="Character does not belong to this project")
        now = utc_now()
        conn.execute(
            f"UPDATE segments SET character_profile_id = ?, updated_at = ? WHERE id IN ({','.join('?' for _ in payload.segment_ids)})",
            [payload.character_profile_id, now, *payload.segment_ids],
        )
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, next(iter(project_ids))))
    return {"success": True, "segment_count": len(payload.segment_ids)}


@app.post("/api/chapters/{chapter_id}/assign-character")
def assign_chapter_character(chapter_id: int, payload: BatchCharacterAssignRequest, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        chapter = get_chapter(conn, chapter_id)
        if payload.character_profile_id is not None:
            character = get_character_profile(conn, payload.character_profile_id)
            if character["project_id"] != chapter["project_id"]:
                raise HTTPException(status_code=400, detail="Character does not belong to this project")
        now = utc_now()
        conn.execute("UPDATE segments SET character_profile_id = ?, updated_at = ? WHERE chapter_id = ?", (payload.character_profile_id, now, chapter_id))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, chapter["project_id"]))
        count = conn.execute("SELECT COUNT(*) AS count FROM segments WHERE chapter_id = ?", (chapter_id,)).fetchone()["count"]
    return {"success": True, "segment_count": count}


@app.get("/api/chapters/{chapter_id}/character-detection")
def get_chapter_character_detection(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        get_chapter(conn, chapter_id)
        return chapter_character_detection(conn, chapter_id)


@app.post("/api/chapters/{chapter_id}/auto-bind-characters")
def auto_bind_chapter_characters(
    chapter_id: int,
    payload: ChapterCharacterAutoBindRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    require_permission(user, "text_manage")
    with get_conn() as conn:
        chapter = get_chapter(conn, chapter_id)
        detection = chapter_character_detection(conn, chapter_id)
        narrator_character = None
        if payload.assign_unmatched_to_narrator:
            if payload.narrator_character_profile_id is None:
                raise HTTPException(status_code=400, detail="Narrator character is required when assigning unmatched segments")
            narrator_character = get_character_profile(conn, payload.narrator_character_profile_id)
            if narrator_character["project_id"] != chapter["project_id"]:
                raise HTTPException(status_code=400, detail="Narrator character does not belong to this project")

        needs_character_creation = any(item["matched_character_profile_id"] is None for item in detection["items"])
        voice_row = resolve_voice_for_character_creation(conn, chapter["project_id"], payload.fallback_voice_profile_id) if needs_character_creation else None
        if needs_character_creation and voice_row is None:
            raise HTTPException(status_code=400, detail="Please configure a fallback voice or project default voice before auto-creating characters")

        now = utc_now()
        created_characters: list[dict] = []
        bound_segment_count = 0

        for item in detection["items"]:
            target_character_id = item["matched_character_profile_id"]
            if target_character_id is None:
                preset_key = "narrator" if item["role_type"] == "narrator" else "background" if item["role_type"] == "background" else ""
                summary = f"由章節《{chapter['title']}》文本自動識別建立。"
                target_character_id = conn.execute(
                    """
                    INSERT INTO character_profiles (
                        project_id, name, voice_profile_id, role_type, story_character_name, display_title, archetype, summary, personality,
                        backstory, catchphrase, default_mood, preset_key, speed_override, style_override,
                        instructions, warmth, intensity, humor, mystery, bravery, discipline, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chapter["project_id"],
                        item["speaker_name"],
                        voice_row["id"],
                        item["role_type"],
                        item["speaker_name"],
                        item["speaker_name"],
                        "",
                        summary,
                        "",
                        "",
                        "",
                        "",
                        preset_key,
                        None,
                        "",
                        "由文本自動建立，可後續微調聲線、說話風格與綁定資料。",
                        50,
                        50,
                        50,
                        50,
                        50,
                        50,
                        now,
                    ),
                ).lastrowid
                created_characters.append(
                    {
                        "id": target_character_id,
                        "name": item["speaker_name"],
                        "role_type": item["role_type"],
                        "voice_profile_id": voice_row["id"],
                    }
                )

            if item["segment_ids"]:
                conn.execute(
                    f"""
                    UPDATE segments
                    SET character_profile_id = ?, voice_profile_id = NULL, updated_at = ?
                    WHERE id IN ({','.join('?' for _ in item['segment_ids'])})
                    """,
                    [target_character_id, now, *item["segment_ids"]],
                )
                bound_segment_count += len(item["segment_ids"])

        narrator_bound_segment_count = 0
        if narrator_character is not None and detection["unmatched_segment_ids"]:
            conn.execute(
                f"""
                UPDATE segments
                SET character_profile_id = ?, voice_profile_id = NULL, updated_at = ?
                WHERE id IN ({','.join('?' for _ in detection['unmatched_segment_ids'])})
                """,
                [narrator_character["id"], now, *detection["unmatched_segment_ids"]],
            )
            narrator_bound_segment_count = len(detection["unmatched_segment_ids"])

        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, chapter["project_id"]))

    return {
        "success": True,
        "chapter_id": chapter_id,
        "detected_character_count": len(detection["items"]),
        "created_character_count": len(created_characters),
        "bound_segment_count": bound_segment_count,
        "narrator_bound_segment_count": narrator_bound_segment_count,
        "unmatched_segment_count": detection["unmatched_segment_count"],
        "created_characters": created_characters,
    }


@app.get("/api/projects/{project_id}/comic-profiles")
def list_comic_profiles(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM comic_profiles
            WHERE project_id IS NULL OR project_id = ?
            ORDER BY project_id IS NOT NULL DESC, id ASC
            """,
            (project_id,),
        ).fetchall()
        return {"items": [model_profile_payload(row, comic_settings_defaults()) for row in rows]}


@app.post("/api/projects/{project_id}/comic-profiles")
def create_comic_profile(project_id: int, payload: ModelProfileCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    now = utc_now()
    settings = merge_settings(payload.settings, comic_settings_defaults())
    with get_conn() as conn:
        get_project(conn, project_id)
        profile_id = conn.execute(
            """
            INSERT INTO comic_profiles (project_id, name, settings, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (project_id, payload.name.strip(), json.dumps(settings, ensure_ascii=False), now),
        ).lastrowid
        row = conn.execute("SELECT * FROM comic_profiles WHERE id = ?", (profile_id,)).fetchone()
    return {"profile": model_profile_payload(row, comic_settings_defaults())}


@app.get("/api/projects/{project_id}/video-profiles")
def list_video_profiles(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM video_profiles
            WHERE project_id IS NULL OR project_id = ?
            ORDER BY project_id IS NOT NULL DESC, id ASC
            """,
            (project_id,),
        ).fetchall()
        return {"items": [model_profile_payload(row, video_settings_defaults()) for row in rows]}


@app.post("/api/projects/{project_id}/video-profiles")
def create_video_profile(project_id: int, payload: ModelProfileCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    now = utc_now()
    settings = merge_settings(payload.settings, video_settings_defaults())
    with get_conn() as conn:
        get_project(conn, project_id)
        profile_id = conn.execute(
            """
            INSERT INTO video_profiles (project_id, name, settings, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (project_id, payload.name.strip(), json.dumps(settings, ensure_ascii=False), now),
        ).lastrowid
        row = conn.execute("SELECT * FROM video_profiles WHERE id = ?", (profile_id,)).fetchone()
    return {"profile": model_profile_payload(row, video_settings_defaults())}


@app.get("/api/projects/{project_id}/comic-scripts")
def list_comic_scripts(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM comic_scripts
            WHERE project_id = ?
            ORDER BY COALESCE(chapter_id, 0), id
            """,
            (project_id,),
        ).fetchall()
        return {"items": [comic_script_payload(conn, row) for row in rows]}


@app.post("/api/projects/{project_id}/comic-scripts")
def create_comic_script(project_id: int, payload: ComicScriptCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        if payload.chapter_id is not None:
            chapter = get_chapter(conn, payload.chapter_id)
            if chapter["project_id"] != project_id:
                raise HTTPException(status_code=400, detail="Chapter does not belong to this project")
        script_id = conn.execute(
            """
            INSERT INTO comic_scripts (project_id, chapter_id, title, premise, outline_text, script_text, target_page_count, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.chapter_id,
                payload.title.strip(),
                payload.premise,
                payload.outline_text,
                payload.script_text,
                max(1, payload.target_page_count),
                payload.status,
                now,
                now,
            ),
        ).lastrowid
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        row = get_comic_script(conn, script_id)
        response_payload = comic_script_payload(conn, row)
    return {"comic_script": response_payload}


@app.patch("/api/comic-scripts/{comic_script_id}")
def update_comic_script(comic_script_id: int, payload: ComicScriptUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    provided_fields = payload.model_fields_set
    updates = {key: value for key, value in payload.model_dump().items() if key in provided_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    with get_conn() as conn:
        existing = get_comic_script(conn, comic_script_id)
        if "chapter_id" in updates and updates["chapter_id"] is not None:
            chapter = get_chapter(conn, updates["chapter_id"])
            if chapter["project_id"] != existing["project_id"]:
                raise HTTPException(status_code=400, detail="Chapter does not belong to this project")
        if "title" in updates:
            updates["title"] = (updates["title"] or "").strip()
            if not updates["title"]:
                raise HTTPException(status_code=400, detail="Title is required")
        if "target_page_count" in updates and updates["target_page_count"] is not None:
            updates["target_page_count"] = max(1, updates["target_page_count"])
        updates["updated_at"] = utc_now()
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE comic_scripts SET {set_clause} WHERE id = ?", list(updates.values()) + [comic_script_id])
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), existing["project_id"]))
        row = get_comic_script(conn, comic_script_id)
        response_payload = comic_script_payload(conn, row)
    return {"comic_script": response_payload}


@app.delete("/api/comic-scripts/{comic_script_id}")
def delete_comic_script(comic_script_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        script = dict(get_comic_script(conn, comic_script_id))
        conn.execute("UPDATE comic_pages SET comic_script_id = NULL, updated_at = ? WHERE comic_script_id = ?", (utc_now(), comic_script_id))
        conn.execute("DELETE FROM comic_scripts WHERE id = ?", (comic_script_id,))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), script["project_id"]))
    return {"success": True, "deleted_comic_script_id": comic_script_id}


@app.get("/api/projects/{project_id}/comic-pages")
def list_comic_pages(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM comic_pages
            WHERE project_id = ?
            ORDER BY page_no, id
            """,
            (project_id,),
        ).fetchall()
        return {"items": [comic_page_payload(conn, row) for row in rows]}


@app.post("/api/projects/{project_id}/comic-pages")
def create_comic_page(project_id: int, payload: ComicPageCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        if payload.chapter_id is not None:
            chapter = get_chapter(conn, payload.chapter_id)
            if chapter["project_id"] != project_id:
                raise HTTPException(status_code=400, detail="Chapter does not belong to this project")
        if payload.comic_script_id is not None:
            script = get_comic_script(conn, payload.comic_script_id)
            if script["project_id"] != project_id:
                raise HTTPException(status_code=400, detail="Comic script does not belong to this project")
        page_no = payload.page_no or next_comic_page_no(conn, project_id)
        duplicate = conn.execute(
            "SELECT id FROM comic_pages WHERE project_id = ? AND page_no = ?",
            (project_id, page_no),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=400, detail="Page number already exists")
        page_id = conn.execute(
            """
            INSERT INTO comic_pages (project_id, chapter_id, comic_script_id, page_no, title, layout_preset, summary, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.chapter_id,
                payload.comic_script_id,
                page_no,
                payload.title.strip(),
                payload.layout_preset,
                payload.summary,
                payload.notes,
                payload.status,
                now,
                now,
            ),
        ).lastrowid
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        row = get_comic_page(conn, page_id)
        response_payload = comic_page_payload(conn, row)
    return {"comic_page": response_payload}


@app.patch("/api/comic-pages/{comic_page_id}")
def update_comic_page(comic_page_id: int, payload: ComicPageUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    provided_fields = payload.model_fields_set
    updates = {key: value for key, value in payload.model_dump().items() if key in provided_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    with get_conn() as conn:
        existing = get_comic_page(conn, comic_page_id)
        project_id = existing["project_id"]
        if "chapter_id" in updates and updates["chapter_id"] is not None:
            chapter = get_chapter(conn, updates["chapter_id"])
            if chapter["project_id"] != project_id:
                raise HTTPException(status_code=400, detail="Chapter does not belong to this project")
        if "comic_script_id" in updates and updates["comic_script_id"] is not None:
            script = get_comic_script(conn, updates["comic_script_id"])
            if script["project_id"] != project_id:
                raise HTTPException(status_code=400, detail="Comic script does not belong to this project")
        if "page_no" in updates and updates["page_no"] is not None:
            duplicate = conn.execute(
                "SELECT id FROM comic_pages WHERE project_id = ? AND page_no = ? AND id <> ?",
                (project_id, updates["page_no"], comic_page_id),
            ).fetchone()
            if duplicate:
                raise HTTPException(status_code=400, detail="Page number already exists")
        updates["updated_at"] = utc_now()
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE comic_pages SET {set_clause} WHERE id = ?", list(updates.values()) + [comic_page_id])
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), project_id))
        row = get_comic_page(conn, comic_page_id)
        response_payload = comic_page_payload(conn, row)
    return {"comic_page": response_payload}


@app.delete("/api/comic-pages/{comic_page_id}")
def delete_comic_page(comic_page_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        page = dict(get_comic_page(conn, comic_page_id))
        artifact_paths = collect_comic_page_artifacts(conn, comic_page_id)
        conn.execute("DELETE FROM comic_pages WHERE id = ?", (comic_page_id,))
        reindex_comic_pages(conn, page["project_id"])
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), page["project_id"]))
    for path in artifact_paths:
        remove_generated_file(path)
    remove_generated_tree(GENERATED_DIR / "comic" / f"project_{page['project_id']}" / f"page_{comic_page_id}")
    return {"success": True, "deleted_comic_page_id": comic_page_id}


@app.post("/api/comic-pages/{comic_page_id}/panels")
def create_comic_panel(comic_page_id: int, payload: ComicPanelCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    now = utc_now()
    with get_conn() as conn:
        page = get_comic_page(conn, comic_page_id)
        panel_no = payload.panel_no or next_comic_panel_no(conn, comic_page_id)
        duplicate = conn.execute(
            "SELECT id FROM comic_panels WHERE comic_page_id = ? AND panel_no = ?",
            (comic_page_id, panel_no),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=400, detail="Panel number already exists")
        if payload.character_ids:
            rows = conn.execute(
                f"SELECT id FROM character_profiles WHERE project_id = ? AND id IN ({','.join('?' for _ in payload.character_ids)})",
                [page["project_id"], *payload.character_ids],
            ).fetchall()
            if len(rows) != len(set(payload.character_ids)):
                raise HTTPException(status_code=400, detail="Some characters do not belong to this project")
        panel_id = conn.execute(
            """
            INSERT INTO comic_panels (
                project_id, comic_page_id, panel_no, title, script_text, dialogue_text, caption_text, sfx_text,
                shot_type, camera_angle, composition_notes, character_refs, prompt_text, negative_prompt,
                image_status, layout_notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                page["project_id"],
                comic_page_id,
                panel_no,
                payload.title.strip(),
                payload.script_text,
                payload.dialogue_text,
                payload.caption_text,
                payload.sfx_text,
                payload.shot_type,
                payload.camera_angle,
                payload.composition_notes,
                json.dumps(payload.character_ids, ensure_ascii=False),
                payload.prompt_text,
                payload.negative_prompt,
                payload.image_status,
                payload.layout_notes,
                now,
                now,
            ),
        ).lastrowid
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (now, comic_page_id))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, page["project_id"]))
        row = get_comic_panel(conn, panel_id)
    return {"comic_panel": comic_panel_payload(row)}


@app.patch("/api/comic-panels/{comic_panel_id}")
def update_comic_panel(comic_panel_id: int, payload: ComicPanelUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    provided_fields = payload.model_fields_set
    updates = {key: value for key, value in payload.model_dump().items() if key in provided_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    with get_conn() as conn:
        existing = get_comic_panel(conn, comic_panel_id)
        page = get_comic_page(conn, existing["comic_page_id"])
        if "panel_no" in updates and updates["panel_no"] is not None:
            duplicate = conn.execute(
                "SELECT id FROM comic_panels WHERE comic_page_id = ? AND panel_no = ? AND id <> ?",
                (existing["comic_page_id"], updates["panel_no"], comic_panel_id),
            ).fetchone()
            if duplicate:
                raise HTTPException(status_code=400, detail="Panel number already exists")
        if "character_ids" in updates and updates["character_ids"] is not None:
            character_ids = updates["character_ids"]
            if character_ids:
                rows = conn.execute(
                    f"SELECT id FROM character_profiles WHERE project_id = ? AND id IN ({','.join('?' for _ in character_ids)})",
                    [existing["project_id"], *character_ids],
                ).fetchall()
                if len(rows) != len(set(character_ids)):
                    raise HTTPException(status_code=400, detail="Some characters do not belong to this project")
            updates["character_refs"] = json.dumps(character_ids, ensure_ascii=False)
            del updates["character_ids"]
        updates["updated_at"] = utc_now()
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE comic_panels SET {set_clause} WHERE id = ?", list(updates.values()) + [comic_panel_id])
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), existing["comic_page_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), existing["project_id"]))
        row = get_comic_panel(conn, comic_panel_id)
    return {"comic_panel": comic_panel_payload(row)}


@app.delete("/api/comic-panels/{comic_panel_id}")
def delete_comic_panel(comic_panel_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        panel = dict(get_comic_panel(conn, comic_panel_id))
        conn.execute("DELETE FROM comic_panels WHERE id = ?", (comic_panel_id,))
        reindex_comic_panels(conn, panel["comic_page_id"])
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), panel["comic_page_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), panel["project_id"]))
    remove_generated_file(panel.get("image_path"))
    return {"success": True, "deleted_comic_panel_id": comic_panel_id}


@app.post("/api/comic-panels/{comic_panel_id}/image/mock-generate")
def mock_generate_comic_panel_image(comic_panel_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        panel = dict(get_comic_panel(conn, comic_panel_id))
        page = dict(get_comic_page(conn, panel["comic_page_id"]))
        project = dict(get_project(conn, panel["project_id"]))
        output_path = create_mock_panel_image(project, page, panel)
        previous_path = panel.get("image_path")
        conn.execute(
            """
            UPDATE comic_panels
            SET image_path = ?, image_status = 'generated', updated_at = ?
            WHERE id = ?
            """,
            (str(output_path), utc_now(), comic_panel_id),
        )
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), page["id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), project["id"]))
        row = get_comic_panel(conn, comic_panel_id)
    if previous_path and previous_path != str(output_path):
        remove_generated_file(previous_path)
    return {"comic_panel": comic_panel_payload(row)}


@app.post("/api/comic-panels/{comic_panel_id}/image/upload")
async def upload_comic_panel_image(comic_panel_id: int, file: UploadFile = File(...), user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    suffix = Path(file.filename or "panel.png").suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    with get_conn() as conn:
        panel = dict(get_comic_panel(conn, comic_panel_id))
        image_dir = GENERATED_DIR / "comic" / f"project_{panel['project_id']}" / f"page_{panel['comic_page_id']}"
        image_dir.mkdir(parents=True, exist_ok=True)
        image_path = image_dir / f"panel_{comic_panel_id}{suffix}"
        image_path.write_bytes(raw)
        previous_path = panel.get("image_path")
        conn.execute(
            """
            UPDATE comic_panels
            SET image_path = ?, image_status = 'uploaded', updated_at = ?
            WHERE id = ?
            """,
            (str(image_path), utc_now(), comic_panel_id),
        )
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), panel["comic_page_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), panel["project_id"]))
        row = get_comic_panel(conn, comic_panel_id)
    if previous_path and previous_path != str(image_path):
        remove_generated_file(previous_path)
    return {"comic_panel": comic_panel_payload(row)}


@app.post("/api/comic-panels/{comic_panel_id}/image/import")
def import_comic_panel_image(comic_panel_id: int, payload: ComicPanelImageImportRequest, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    image_bytes, suffix, _, _ = download_remote_image(payload.url)
    with get_conn() as conn:
        panel = dict(get_comic_panel(conn, comic_panel_id))
        image_dir = GENERATED_DIR / "comic" / f"project_{panel['project_id']}" / f"page_{panel['comic_page_id']}"
        image_dir.mkdir(parents=True, exist_ok=True)
        image_path = image_dir / f"panel_{comic_panel_id}{suffix}"
        image_path.write_bytes(image_bytes)
        previous_path = panel.get("image_path")
        conn.execute(
            """
            UPDATE comic_panels
            SET image_path = ?, image_status = 'imported', updated_at = ?
            WHERE id = ?
            """,
            (str(image_path), utc_now(), comic_panel_id),
        )
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), panel["comic_page_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), panel["project_id"]))
        row = get_comic_panel(conn, comic_panel_id)
    if previous_path and previous_path != str(image_path):
        remove_generated_file(previous_path)
    return {"comic_panel": comic_panel_payload(row)}


@app.delete("/api/comic-panels/{comic_panel_id}/image")
def delete_comic_panel_image(comic_panel_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "comic_manage")
    with get_conn() as conn:
        panel = dict(get_comic_panel(conn, comic_panel_id))
        conn.execute(
            """
            UPDATE comic_panels
            SET image_path = '', image_status = 'pending', updated_at = ?
            WHERE id = ?
            """,
            (utc_now(), comic_panel_id),
        )
        conn.execute("UPDATE comic_pages SET updated_at = ? WHERE id = ?", (utc_now(), panel["comic_page_id"]))
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), panel["project_id"]))
        row = get_comic_panel(conn, comic_panel_id)
    remove_generated_file(panel.get("image_path"))
    return {"comic_panel": comic_panel_payload(row)}


@app.get("/api/system/providers")
def system_providers(user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    settings = get_settings()
    registry = get_model_registry()
    catalog = get_system_catalog()
    registry_defaults = get_registry_defaults()

    def configured_for(provider_key: str, provider_payload: dict) -> bool:
        if provider_key == "macos":
            return True
        requires_env = provider_payload.get("requires_env") or ""
        if not requires_env:
            return False
        if provider_key == "openai":
            return settings.has_openai
        if provider_key == "elevenlabs":
            return settings.has_elevenlabs
        return bool(os.environ.get(requires_env, "").strip())

    providers = {}
    for provider_key, provider_payload in registry["providers"].items():
        providers[provider_key] = {
            "configured": configured_for(provider_key, provider_payload),
            "label": provider_payload.get("label") or provider_key,
            "kind": provider_payload.get("kind", []),
            "requires_env": provider_payload.get("requires_env", ""),
        }
        if provider_payload.get("tts_models"):
            providers[provider_key]["tts_models"] = provider_payload["tts_models"]
        if provider_payload.get("asr_models"):
            providers[provider_key]["asr_models"] = provider_payload["asr_models"]
        if provider_payload.get("tts_voices"):
            providers[provider_key]["tts_voices"] = provider_payload["tts_voices"]

    providers.setdefault("openai", {})
    providers["openai"]["default_tts_model"] = settings.openai_tts_model
    providers["openai"]["default_asr_model"] = settings.openai_asr_model
    providers.setdefault("elevenlabs", {})
    providers["elevenlabs"]["default_tts_model"] = settings.elevenlabs_tts_model
    providers["elevenlabs"]["default_asr_model"] = settings.elevenlabs_asr_model

    return {
        "providers": providers,
        "catalog": catalog,
        "defaults": {
            "asr_provider": settings.default_asr_provider,
            "comic_settings": registry_defaults["comic_settings"],
            "video_settings": registry_defaults["video_settings"],
        },
        "registry": {
            "version": registry["version"],
            "path": str(REGISTRY_PATH),
        },
    }


@app.post("/api/projects/{project_id}/voice-profiles")
def create_voice_profile(project_id: int, payload: VoiceProfileCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    now = utc_now()
    with get_conn() as conn:
        get_project(conn, project_id)
        voice_id = conn.execute(
            """
            INSERT INTO voice_profiles (project_id, name, provider, model, voice_name, speed, style, instructions, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                payload.name,
                payload.provider,
                payload.model,
                payload.voice_name,
                payload.speed,
                payload.style,
                payload.instructions,
                1 if payload.is_default else 0,
                now,
            ),
        ).lastrowid
        if payload.is_default:
            conn.execute("UPDATE projects SET default_voice_profile_id = ?, updated_at = ? WHERE id = ?", (voice_id, now, project_id))
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (voice_id,)).fetchone()
    return {"voice_profile": dict(row)}


@app.patch("/api/voice-profiles/{voice_profile_id}")
def update_voice_profile(voice_profile_id: int, payload: VoiceProfileUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "settings_manage")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (voice_profile_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Voice profile not found")
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE voice_profiles SET {set_clause} WHERE id = ?", list(updates.values()) + [voice_profile_id])
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (voice_profile_id,)).fetchone()
        if payload.is_default and row["project_id"]:
            conn.execute(
                "UPDATE projects SET default_voice_profile_id = ?, updated_at = ? WHERE id = ?",
                (voice_profile_id, utc_now(), row["project_id"]),
            )
    return {"voice_profile": dict(row)}


@app.post("/api/segments/{segment_id}/generate")
def generate_segment(segment_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        voice = voice_for_project(conn, segment["project_id"], segment["voice_profile_id"], segment["character_profile_id"])
        job_id = conn.execute(
            """
            INSERT INTO generation_jobs (project_id, chapter_id, segment_id, job_type, status, provider, model, input_text, created_at, updated_at)
            VALUES (?, ?, ?, 'generate_segment', 'pending', ?, ?, ?, ?, ?)
            """,
            (segment["project_id"], segment["chapter_id"], segment["id"], voice["provider"], voice["model"], segment["tts_text"], utc_now(), utc_now()),
        ).lastrowid
        conn.execute("UPDATE segments SET status = 'queued', updated_at = ? WHERE id = ?", (utc_now(), segment_id))
    background.add_task(run_segment_generation, job_id)
    return {"job_id": job_id}


@app.post("/api/chapters/{chapter_id}/generate")
def generate_chapter(chapter_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        chapter = get_chapter(conn, chapter_id)
        job_ids, _ = queue_chapter_generation_jobs(conn, chapter)
    for job_id in job_ids:
        background.add_task(run_segment_generation, job_id)
    return {"job_ids": job_ids}


@app.get("/api/chapters/{chapter_id}/generate-with-default-voice/preview")
def preview_generate_chapter_with_default_voice(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        return generation_preview_for_chapter(conn, chapter_id)


@app.post("/api/chapters/{chapter_id}/generate-with-default-voice")
def generate_chapter_with_default_voice(chapter_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        chapter = get_chapter(conn, chapter_id)
        job_ids, cleared_override_count = queue_chapter_generation_jobs(conn, chapter, force_project_default_voice=True)
    for job_id in job_ids:
        background.add_task(run_segment_generation, job_id)
    return {"job_ids": job_ids, "cleared_override_count": cleared_override_count}


@app.get("/api/projects/{project_id}/generate-with-default-voice/preview")
def preview_generate_project_with_default_voice(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        return generation_preview_for_project(conn, project_id)


@app.post("/api/projects/{project_id}/generate-with-default-voice")
def generate_project_with_default_voice(project_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        job_ids, cleared_override_count, chapter_count = queue_project_generation_jobs(
            conn,
            project_id,
            force_project_default_voice=True,
        )
    for job_id in job_ids:
        background.add_task(run_segment_generation, job_id)
    return {
        "job_ids": job_ids,
        "cleared_override_count": cleared_override_count,
        "chapter_count": chapter_count,
    }


@app.get("/api/projects/{project_id}/jobs")
def list_jobs(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "generate_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT * FROM generation_jobs
            WHERE project_id = ?
            ORDER BY created_at DESC
            LIMIT 80
            """,
            (project_id,),
        ).fetchall()
        return {"items": [dict(row) for row in rows]}


@app.get("/api/segments/{segment_id}/takes")
def list_takes(segment_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        get_segment(conn, segment_id)
        rows = conn.execute("SELECT * FROM audio_takes WHERE segment_id = ? ORDER BY version_no DESC", (segment_id,)).fetchall()
        return {"items": [audio_take_payload(row) for row in rows]}


@app.get("/api/segments/{segment_id}/issues")
def list_issues(segment_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        get_segment(conn, segment_id)
        rows = conn.execute("SELECT * FROM review_issues WHERE segment_id = ? ORDER BY created_at DESC", (segment_id,)).fetchall()
        return {"items": [dict(row) for row in rows]}


@app.post("/api/segments/{segment_id}/issues")
def create_issue(segment_id: int, payload: IssueCreate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        issue_id = conn.execute(
            """
            INSERT INTO review_issues (segment_id, audio_take_id, issue_type, severity, source, description, status, created_at)
            VALUES (?, ?, ?, ?, 'manual', ?, 'open', ?)
            """,
            (segment_id, segment["latest_audio_take_id"], payload.issue_type, payload.severity, payload.description, utc_now()),
        ).lastrowid
        conn.execute("UPDATE segments SET status = 'review_required', updated_at = ? WHERE id = ?", (utc_now(), segment_id))
        row = conn.execute("SELECT * FROM review_issues WHERE id = ?", (issue_id,)).fetchone()
    return {"issue": dict(row)}


@app.patch("/api/issues/{issue_id}")
def update_issue(issue_id: int, payload: IssueUpdate, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        issue = conn.execute("SELECT * FROM review_issues WHERE id = ?", (issue_id,)).fetchone()
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        resolved_at = utc_now() if payload.status != "open" else ""
        conn.execute("UPDATE review_issues SET status = ?, resolved_at = ? WHERE id = ?", (payload.status, resolved_at, issue_id))
        updated = conn.execute("SELECT * FROM review_issues WHERE id = ?", (issue_id,)).fetchone()
    return {"issue": dict(updated)}


@app.post("/api/segments/{segment_id}/approve")
def approve_segment(segment_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        get_segment(conn, segment_id)
        conn.execute("UPDATE segments SET status = 'approved', updated_at = ? WHERE id = ?", (utc_now(), segment_id))
        conn.execute("UPDATE review_issues SET status = 'resolved', resolved_at = ? WHERE segment_id = ? AND status = 'open'", (utc_now(), segment_id))
        row = get_segment(conn, segment_id)
        payload = segment_payload(conn, row)
    return {"segment": payload}


@app.post("/api/segments/{segment_id}/reject")
def reject_segment(segment_id: int, payload: RejectRequest, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        conn.execute("UPDATE segments SET status = 'rejected', updated_at = ? WHERE id = ?", (utc_now(), segment_id))
        if payload.description.strip():
            conn.execute(
                """
                INSERT INTO review_issues (segment_id, audio_take_id, issue_type, severity, source, description, status, created_at)
                VALUES (?, ?, 'manual_review', 'medium', 'manual', ?, 'open', ?)
                """,
                (segment_id, segment["latest_audio_take_id"], payload.description.strip(), utc_now()),
            )
        row = get_segment(conn, segment_id)
        response_payload = segment_payload(conn, row)
    return {"segment": response_payload}


@app.get("/api/projects/{project_id}/review-queue")
def review_queue(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "review_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            """
            SELECT DISTINCT segments.*
            FROM segments
            LEFT JOIN review_issues ON review_issues.segment_id = segments.id AND review_issues.status = 'open'
            WHERE segments.project_id = ? AND (segments.status IN ('review_required', 'rejected') OR review_issues.id IS NOT NULL)
            ORDER BY segments.chapter_id, segments.order_index
            """,
            (project_id,),
        ).fetchall()
        return {"items": [segment_payload(conn, row) for row in rows]}


@app.post("/api/chapters/{chapter_id}/render")
def render_chapter(chapter_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "delivery_manage")
    with get_conn() as conn:
        get_chapter(conn, chapter_id)
        next_version = (
            conn.execute("SELECT COALESCE(MAX(render_version), 0) AS value FROM chapter_renders WHERE chapter_id = ?", (chapter_id,)).fetchone()["value"] + 1
        )
        render_id = conn.execute(
            """
            INSERT INTO chapter_renders (chapter_id, render_version, status, created_at)
            VALUES (?, ?, 'pending', ?)
            """,
            (chapter_id, next_version, utc_now()),
        ).lastrowid
    background.add_task(run_chapter_render, render_id)
    return {"render_id": render_id}


@app.get("/api/chapters/{chapter_id}/renders")
def list_renders(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "delivery_manage")
    with get_conn() as conn:
        get_chapter(conn, chapter_id)
        rows = conn.execute(
            "SELECT * FROM chapter_renders WHERE chapter_id = ? ORDER BY render_version DESC",
            (chapter_id,),
        ).fetchall()
        items = []
        for row in rows:
            payload = dict(row)
            payload["file_url"] = public_file_path(payload["file_path"]) if payload["file_path"].endswith(".wav") else ""
            items.append(payload)
        return {"items": items}


@app.post("/api/projects/{project_id}/export")
def export_project(project_id: int, background: BackgroundTasks, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "delivery_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        export_id = conn.execute(
            """
            INSERT INTO export_tasks (project_id, export_type, status, created_at)
            VALUES (?, 'book_zip', 'pending', ?)
            """,
            (project_id, utc_now()),
        ).lastrowid
    background.add_task(run_export_task, export_id)
    return {"export_id": export_id}


@app.get("/api/projects/{project_id}/exports")
def list_exports(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_permission(user, "delivery_manage")
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute(
            "SELECT * FROM export_tasks WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()
        items = []
        for row in rows:
            payload = dict(row)
            payload["file_url"] = public_file_path(payload["file_path"]) if payload["file_path"].endswith(".zip") else ""
            items.append(payload)
        return {"items": items}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/favicon.ico")
def favicon() -> JSONResponse:
    return JSONResponse({"ok": True})
