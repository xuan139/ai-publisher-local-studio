from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .security import hash_password

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
GENERATED_DIR = BASE_DIR / "generated"
DB_PATH = DATA_DIR / "app.db"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    for folder in ("imports", "audio", "renders", "exports", "characters"):
        (GENERATED_DIR / folder).mkdir(parents=True, exist_ok=True)


def connect() -> sqlite3.Connection:
    ensure_directories()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_conn():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'zh-CN',
  description TEXT NOT NULL DEFAULT '',
  comic_settings TEXT NOT NULL DEFAULT '{}',
  video_settings TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  default_voice_profile_id INTEGER REFERENCES voice_profiles(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  tts_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  tts_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  character_profile_id INTEGER REFERENCES character_profiles(id) ON DELETE SET NULL,
  voice_profile_id INTEGER REFERENCES voice_profiles(id) ON DELETE SET NULL,
  latest_audio_take_id INTEGER REFERENCES audio_takes(id) ON DELETE SET NULL,
  asr_text TEXT NOT NULL DEFAULT '',
  qc_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  speed REAL NOT NULL DEFAULT 1.0,
  style TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  voice_profile_id INTEGER NOT NULL REFERENCES voice_profiles(id) ON DELETE RESTRICT,
  display_title TEXT NOT NULL DEFAULT '',
  archetype TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  backstory TEXT NOT NULL DEFAULT '',
  catchphrase TEXT NOT NULL DEFAULT '',
  default_mood TEXT NOT NULL DEFAULT '',
  preset_key TEXT NOT NULL DEFAULT '',
  speed_override REAL,
  style_override TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  warmth INTEGER NOT NULL DEFAULT 50,
  intensity INTEGER NOT NULL DEFAULT 50,
  humor INTEGER NOT NULL DEFAULT 50,
  mystery INTEGER NOT NULL DEFAULT 50,
  bravery INTEGER NOT NULL DEFAULT 50,
  discipline INTEGER NOT NULL DEFAULT 50,
  avatar_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_looks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_profile_id INTEGER NOT NULL REFERENCES character_profiles(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'local',
  source_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(character_profile_id, slot_index)
);

CREATE TABLE IF NOT EXISTS comic_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  segment_id INTEGER REFERENCES segments(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'macos',
  model TEXT NOT NULL DEFAULT 'say',
  request_id TEXT NOT NULL DEFAULT '',
  input_text TEXT NOT NULL DEFAULT '',
  output_path TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_takes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'generated',
  file_path TEXT NOT NULL,
  duration_seconds REAL NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  audio_take_id INTEGER REFERENCES audio_takes(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'manual',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  resolved_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS chapter_renders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  render_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS export_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL DEFAULT 'book_zip',
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapters_project_order ON chapters(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_segments_chapter_order ON segments(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON generation_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_segment_status ON review_issues(segment_id, status);
CREATE INDEX IF NOT EXISTS idx_character_looks_slot ON character_looks(character_profile_id, slot_index);
"""


def init_db() -> None:
    ensure_directories()
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        ensure_project_setting_columns(conn)
        ensure_segment_character_column(conn)
        ensure_character_profile_columns(conn)
        seed_default_user(conn)
        seed_default_voice_profiles(conn)
        seed_default_model_profiles(conn)


def ensure_project_setting_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "comic_settings" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN comic_settings TEXT NOT NULL DEFAULT '{}'")
    if "video_settings" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN video_settings TEXT NOT NULL DEFAULT '{}'")


def ensure_segment_character_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(segments)").fetchall()}
    if "character_profile_id" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN character_profile_id INTEGER REFERENCES character_profiles(id) ON DELETE SET NULL")


def ensure_character_profile_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(character_profiles)").fetchall()}
    additions = {
        "display_title": "TEXT NOT NULL DEFAULT ''",
        "archetype": "TEXT NOT NULL DEFAULT ''",
        "summary": "TEXT NOT NULL DEFAULT ''",
        "personality": "TEXT NOT NULL DEFAULT ''",
        "backstory": "TEXT NOT NULL DEFAULT ''",
        "catchphrase": "TEXT NOT NULL DEFAULT ''",
        "default_mood": "TEXT NOT NULL DEFAULT ''",
        "preset_key": "TEXT NOT NULL DEFAULT ''",
        "warmth": "INTEGER NOT NULL DEFAULT 50",
        "intensity": "INTEGER NOT NULL DEFAULT 50",
        "humor": "INTEGER NOT NULL DEFAULT 50",
        "mystery": "INTEGER NOT NULL DEFAULT 50",
        "bravery": "INTEGER NOT NULL DEFAULT 50",
        "discipline": "INTEGER NOT NULL DEFAULT 50",
        "avatar_path": "TEXT NOT NULL DEFAULT ''",
    }
    for name, definition in additions.items():
        if name not in columns:
            conn.execute(f"ALTER TABLE character_profiles ADD COLUMN {name} {definition}")


def seed_default_user(conn: sqlite3.Connection) -> None:
    user = conn.execute("SELECT id FROM users WHERE email = ?", ("admin@example.com",)).fetchone()
    if user:
        return
    conn.execute(
        """
        INSERT INTO users (email, name, role, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("admin@example.com", "Local Admin", "admin", hash_password("admin123"), utc_now()),
    )


def seed_default_voice_profiles(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) AS count FROM voice_profiles WHERE project_id IS NULL").fetchone()
    if existing and existing["count"] > 0:
        return

    now = utc_now()
    voices = [
        ("Tingting", "macos", "say", "Tingting", 1.0, "calm-cn", "Default Chinese narrator", 1),
        ("Eddy CN", "macos", "say", "Eddy (Chinese (China mainland))", 1.0, "neutral-cn", "", 0),
        ("Samantha", "macos", "say", "Samantha", 1.0, "neutral-en", "", 0),
        ("Daniel", "macos", "say", "Daniel", 1.0, "neutral-uk", "", 0),
    ]
    conn.executemany(
        """
        INSERT INTO voice_profiles
        (project_id, name, provider, model, voice_name, speed, style, instructions, is_default, created_at)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(name, provider, model, voice_name, speed, style, instructions, is_default, now) for name, provider, model, voice_name, speed, style, instructions, is_default in voices],
    )


def seed_default_model_profiles(conn: sqlite3.Connection) -> None:
    now = utc_now()

    comic_existing = conn.execute("SELECT COUNT(*) AS count FROM comic_profiles WHERE project_id IS NULL").fetchone()
    if not comic_existing or comic_existing["count"] == 0:
        comic_profiles = [
            ("漫畫基準", '{"enabled": true, "script_model": "openai:gpt-4.1", "storyboard_model": "google:gemini-2.0-flash", "image_model": "openai:gpt-image-1", "style_preset": "cinematic-ink", "color_mode": "full-color", "aspect_ratio": "4:5", "character_consistency": "medium", "negative_prompt": ""}'),
            ("黑白條漫", '{"enabled": true, "script_model": "openai:gpt-4.1", "storyboard_model": "google:gemini-2.0-flash", "image_model": "bfl:flux-pro", "style_preset": "noir", "color_mode": "black-white", "aspect_ratio": "3:4", "character_consistency": "high", "negative_prompt": ""}'),
        ]
        conn.executemany(
            """
            INSERT INTO comic_profiles (project_id, name, settings, created_at)
            VALUES (NULL, ?, ?, ?)
            """,
            [(name, settings, now) for name, settings in comic_profiles],
        )

    video_existing = conn.execute("SELECT COUNT(*) AS count FROM video_profiles WHERE project_id IS NULL").fetchone()
    if not video_existing or video_existing["count"] == 0:
        video_profiles = [
            ("短影音基準", '{"enabled": true, "script_model": "openai:gpt-4.1", "shot_model": "google:gemini-2.0-flash", "image_model": "openai:gpt-image-1", "video_model": "runway:gen-3", "subtitle_model": "openai:gpt-4.1-mini", "aspect_ratio": "9:16", "duration_seconds": 30, "motion_style": "social-short", "negative_prompt": ""}'),
            ("電影感預告", '{"enabled": true, "script_model": "openai:gpt-4o", "shot_model": "google:gemini-2.5-pro", "image_model": "bfl:flux-pro", "video_model": "kling:v1.6", "subtitle_model": "openai:gpt-4o-mini", "aspect_ratio": "16:9", "duration_seconds": 45, "motion_style": "cinematic", "negative_prompt": ""}'),
        ]
        conn.executemany(
            """
            INSERT INTO video_profiles (project_id, name, settings, created_at)
            VALUES (NULL, ?, ?, ?)
            """,
            [(name, settings, now) for name, settings in video_profiles],
        )
