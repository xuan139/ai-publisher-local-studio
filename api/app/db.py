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
DEFAULT_USERS = [
    {
        "email": "admin@example.com",
        "name": "Local Admin",
        "role": "admin",
        "password": "admin123",
    },
    {
        "email": "editor@example.com",
        "name": "Text Editor",
        "role": "text_editor",
        "password": "editor123",
    },
    {
        "email": "reviewer@example.com",
        "name": "Review Operator",
        "role": "reviewer",
        "password": "review123",
    },
    {
        "email": "delivery@example.com",
        "name": "Delivery Manager",
        "role": "delivery_manager",
        "password": "delivery123",
    },
    {
        "email": "settings@example.com",
        "name": "Settings Manager",
        "role": "settings_manager",
        "password": "settings123",
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    for folder in ("imports", "audio", "renders", "exports", "characters", "comic"):
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
  cover_path TEXT NOT NULL DEFAULT '',
  project_type TEXT NOT NULL DEFAULT 'audiobook',
  business_base_currency TEXT NOT NULL DEFAULT 'CNY',
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
  role_type TEXT NOT NULL DEFAULT 'supporting',
  story_character_name TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS comic_scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  premise TEXT NOT NULL DEFAULT '',
  outline_text TEXT NOT NULL DEFAULT '',
  script_text TEXT NOT NULL DEFAULT '',
  target_page_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comic_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  comic_script_id INTEGER REFERENCES comic_scripts(id) ON DELETE SET NULL,
  page_no INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  layout_preset TEXT NOT NULL DEFAULT 'two-column',
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, page_no)
);

CREATE TABLE IF NOT EXISTS comic_panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  comic_page_id INTEGER NOT NULL REFERENCES comic_pages(id) ON DELETE CASCADE,
  panel_no INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  script_text TEXT NOT NULL DEFAULT '',
  dialogue_text TEXT NOT NULL DEFAULT '',
  caption_text TEXT NOT NULL DEFAULT '',
  sfx_text TEXT NOT NULL DEFAULT '',
  shot_type TEXT NOT NULL DEFAULT '',
  camera_angle TEXT NOT NULL DEFAULT '',
  composition_notes TEXT NOT NULL DEFAULT '',
  character_refs TEXT NOT NULL DEFAULT '[]',
  prompt_text TEXT NOT NULL DEFAULT '',
  negative_prompt TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  image_status TEXT NOT NULL DEFAULT 'pending',
  layout_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(comic_page_id, panel_no)
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

CREATE TABLE IF NOT EXISTS rights_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rights_type TEXT NOT NULL DEFAULT 'audiobook',
  holder_name TEXT NOT NULL DEFAULT '',
  grant_scope TEXT NOT NULL DEFAULT '',
  territory TEXT NOT NULL DEFAULT '',
  license_language TEXT NOT NULL DEFAULT '',
  contract_code TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'production',
  vendor_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  occurred_on TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS distribution_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL DEFAULT '',
  channel_category TEXT NOT NULL DEFAULT 'retail',
  release_format TEXT NOT NULL DEFAULT 'audiobook',
  release_status TEXT NOT NULL DEFAULT 'planning',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  release_date TEXT NOT NULL DEFAULT '',
  external_sku TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL DEFAULT '',
  channel_category TEXT NOT NULL DEFAULT 'retail',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  units_sold INTEGER NOT NULL DEFAULT 0,
  gross_revenue REAL NOT NULL DEFAULT 0,
  refunds REAL NOT NULL DEFAULT 0,
  net_revenue REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS royalty_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL DEFAULT '',
  role_name TEXT NOT NULL DEFAULT '',
  basis TEXT NOT NULL DEFAULT 'net_revenue',
  rate_percent REAL NOT NULL DEFAULT 0,
  amount_due REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 1,
  effective_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS advertiser_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL DEFAULT '',
  campaign_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  deliverables TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  contract_amount REAL NOT NULL DEFAULT 0,
  settled_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'proposal',
  owner_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'business_zip',
  file_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapters_project_order ON chapters(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_segments_chapter_order ON segments(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON generation_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_segment_status ON review_issues(segment_id, status);
CREATE INDEX IF NOT EXISTS idx_character_looks_slot ON character_looks(character_profile_id, slot_index);
CREATE INDEX IF NOT EXISTS idx_comic_scripts_project ON comic_scripts(project_id, id);
CREATE INDEX IF NOT EXISTS idx_comic_pages_project_page ON comic_pages(project_id, page_no);
CREATE INDEX IF NOT EXISTS idx_comic_panels_page_panel ON comic_panels(comic_page_id, panel_no);
CREATE INDEX IF NOT EXISTS idx_rights_records_project_status ON rights_records(project_id, status);
CREATE INDEX IF NOT EXISTS idx_cost_items_project_status ON cost_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_distribution_channels_project_status ON distribution_channels(project_id, release_status);
CREATE INDEX IF NOT EXISTS idx_sales_records_project_period ON sales_records(project_id, period_end);
CREATE INDEX IF NOT EXISTS idx_royalty_statements_project_status ON royalty_statements(project_id, status);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_project_pair ON exchange_rates(project_id, source_currency, target_currency, effective_date);
CREATE INDEX IF NOT EXISTS idx_advertiser_deals_project_status ON advertiser_deals(project_id, status);
CREATE INDEX IF NOT EXISTS idx_business_reports_project_created ON business_reports(project_id, created_at);
"""


def init_db() -> None:
    ensure_directories()
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        ensure_user_role_column(conn)
        ensure_project_type_column(conn)
        ensure_project_cover_column(conn)
        ensure_project_setting_columns(conn)
        ensure_project_business_columns(conn)
        ensure_segment_character_column(conn)
        ensure_character_profile_columns(conn)
        ensure_distribution_channel_columns(conn)
        ensure_sales_record_columns(conn)
        seed_default_users(conn)
        seed_default_voice_profiles(conn)
        seed_default_model_profiles(conn)


def ensure_user_role_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "role" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'")
    conn.execute("UPDATE users SET role = 'admin' WHERE COALESCE(TRIM(role), '') = ''")


def ensure_project_type_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "project_type" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'audiobook'")


def ensure_project_cover_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "cover_path" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN cover_path TEXT NOT NULL DEFAULT ''")


def ensure_project_setting_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "comic_settings" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN comic_settings TEXT NOT NULL DEFAULT '{}'")
    if "video_settings" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN video_settings TEXT NOT NULL DEFAULT '{}'")


def ensure_project_business_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()}
    if "business_base_currency" not in columns:
        conn.execute("ALTER TABLE projects ADD COLUMN business_base_currency TEXT NOT NULL DEFAULT 'CNY'")
    conn.execute("UPDATE projects SET business_base_currency = 'CNY' WHERE COALESCE(TRIM(business_base_currency), '') = ''")


def ensure_segment_character_column(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(segments)").fetchall()}
    if "character_profile_id" not in columns:
        conn.execute("ALTER TABLE segments ADD COLUMN character_profile_id INTEGER REFERENCES character_profiles(id) ON DELETE SET NULL")


def ensure_character_profile_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(character_profiles)").fetchall()}
    additions = {
        "role_type": "TEXT NOT NULL DEFAULT 'supporting'",
        "story_character_name": "TEXT NOT NULL DEFAULT ''",
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
    conn.execute(
        """
        UPDATE character_profiles
        SET role_type = CASE
            WHEN role_type NOT IN ('', 'supporting') THEN role_type
            WHEN preset_key = 'narrator' THEN 'narrator'
            WHEN preset_key = 'background' THEN 'background'
            WHEN preset_key = 'hero' THEN 'lead'
            ELSE 'supporting'
        END
        """
    )


def ensure_distribution_channel_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(distribution_channels)").fetchall()}
    if "channel_category" not in columns:
        conn.execute("ALTER TABLE distribution_channels ADD COLUMN channel_category TEXT NOT NULL DEFAULT 'retail'")


def ensure_sales_record_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(sales_records)").fetchall()}
    if "channel_category" not in columns:
        conn.execute("ALTER TABLE sales_records ADD COLUMN channel_category TEXT NOT NULL DEFAULT 'retail'")


def seed_default_users(conn: sqlite3.Connection) -> None:
    existing_rows = conn.execute("SELECT email FROM users").fetchall()
    existing_emails = {row["email"] for row in existing_rows}
    for user in DEFAULT_USERS:
        if user["email"] in existing_emails:
            continue
        conn.execute(
            """
            INSERT INTO users (email, name, role, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user["email"],
                user["name"],
                user["role"],
                hash_password(user["password"]),
                utc_now(),
            ),
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
