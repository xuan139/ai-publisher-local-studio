from __future__ import annotations

import json
import random
import sqlite3
from difflib import SequenceMatcher
from datetime import datetime, timezone
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .ai_providers import ProviderConfigError, ProviderRequestError, generate_speech, transcribe_audio
from .audio_utils import concat_wavs, create_export_zip, public_file_path, slugify
from .config import ELEVENLABS_ASR_MODELS, ELEVENLABS_TTS_MODELS, OPENAI_TTS_MODELS, OPENAI_TTS_VOICES, get_settings
from .db import BASE_DIR, GENERATED_DIR, connect, get_conn, init_db, utc_now
from .schemas import (
    IssueCreate,
    IssueUpdate,
    LoginRequest,
    ProjectCreate,
    ProjectUpdate,
    RejectRequest,
    SegmentUpdate,
    VoiceProfileCreate,
    VoiceProfileUpdate,
)
from .security import create_token, verify_password
from .text_utils import extract_text_from_upload, split_into_chapters, split_into_segments

WEB_DIR = BASE_DIR.parent / "web"
APP_TITLE = "AI Publisher Local Studio"

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


@app.on_event("startup")
def startup() -> None:
    init_db()


def db_row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


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
    return dict(row)


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


def voice_for_project(conn: sqlite3.Connection, project_id: int, segment_voice_id: int | None = None) -> sqlite3.Row:
    if segment_voice_id:
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (segment_voice_id,)).fetchone()
        if row:
            return row
    project = get_project(conn, project_id)
    if project["default_voice_profile_id"]:
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (project["default_voice_profile_id"],)).fetchone()
        if row:
            return row
    row = conn.execute("SELECT * FROM voice_profiles WHERE is_default = 1 ORDER BY id LIMIT 1").fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="No voice profile configured")
    return row


def project_metrics(conn: sqlite3.Connection, project_id: int) -> dict:
    counts = conn.execute(
        """
        SELECT
          COUNT(DISTINCT chapters.id) AS chapter_count,
          COUNT(DISTINCT segments.id) AS segment_count,
          SUM(CASE WHEN segments.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN segments.status = 'review_required' THEN 1 ELSE 0 END) AS review_required_count,
          SUM(CASE WHEN generation_jobs.status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs
        FROM projects
        LEFT JOIN chapters ON chapters.project_id = projects.id
        LEFT JOIN segments ON segments.project_id = projects.id
        LEFT JOIN generation_jobs ON generation_jobs.project_id = projects.id
        WHERE projects.id = ?
        """,
        (project_id,),
    ).fetchone()
    return {
        "chapter_count": counts["chapter_count"] or 0,
        "segment_count": counts["segment_count"] or 0,
        "approved_count": counts["approved_count"] or 0,
        "review_required_count": counts["review_required_count"] or 0,
        "failed_jobs": counts["failed_jobs"] or 0,
    }


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
    segment["latest_take"] = audio_take_payload(latest_take) if latest_take else None
    segment["open_issue_count"] = issue_count
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
        voice = voice_for_project(conn, segment["project_id"], segment["voice_profile_id"])

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
            conn.execute(
                "UPDATE generation_jobs SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
                (str(exc), utc_now(), job_id),
            )
            conn.execute(
                "UPDATE segments SET status = 'rejected', updated_at = ? WHERE id = ?",
                (utc_now(), segment["id"]),
            )


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
        output_path = create_export_zip(project["title"], list(unique_renders.items()), GENERATED_DIR / "exports" / f"project_{project['id']}")
        with get_conn() as conn:
            conn.execute("UPDATE export_tasks SET status = 'succeeded', file_path = ? WHERE id = ?", (str(output_path), task_id))
            log_activity(conn, None, "project", project["id"], "export", str(output_path))
    except Exception as exc:
        with get_conn() as conn:
            conn.execute("UPDATE export_tasks SET status = 'failed', file_path = ? WHERE id = ?", (str(exc), task_id))


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "app": APP_TITLE}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict:
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email,)).fetchone()
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token()
        conn.execute("INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)", (user["id"], token, utc_now()))
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
        "demo_credentials": {"email": "admin@example.com", "password": "admin123"},
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
            item = dict(row)
            item["metrics"] = project_metrics(conn, row["id"])
            payload.append(item)
    return {"items": payload}


@app.post("/api/projects")
def create_project(payload: ProjectCreate, user: dict = Depends(get_current_user)) -> dict:
    now = utc_now()
    with get_conn() as conn:
        default_voice = conn.execute("SELECT id FROM voice_profiles WHERE is_default = 1 ORDER BY id LIMIT 1").fetchone()
        project_id = conn.execute(
            """
            INSERT INTO projects (title, author, language, description, status, default_voice_profile_id, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
            """,
            (payload.title, payload.author, payload.language, payload.description, default_voice["id"] if default_voice else None, user["id"], now, now),
        ).lastrowid
        log_activity(conn, user["id"], "project", project_id, "create", payload.title)
        project = get_project(conn, project_id)
    return {"project": dict(project)}


@app.get("/api/projects/{project_id}")
def get_project_detail(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        project = dict(get_project(conn, project_id))
        project["metrics"] = project_metrics(conn, project_id)
        chapters = conn.execute("SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index", (project_id,)).fetchall()
        project["chapters"] = [chapter_payload(conn, row) for row in chapters]
    return {"project": project}


@app.patch("/api/projects/{project_id}")
def update_project(project_id: int, payload: ProjectUpdate, user: dict = Depends(get_current_user)) -> dict:
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    updates["updated_at"] = utc_now()
    set_clause = ", ".join(f"{key} = ?" for key in updates)
    params = list(updates.values()) + [project_id]
    with get_conn() as conn:
        get_project(conn, project_id)
        conn.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", params)
        project = dict(get_project(conn, project_id))
        project["metrics"] = project_metrics(conn, project_id)
    return {"project": project}


@app.post("/api/projects/{project_id}/import")
async def import_project_text(
    project_id: int,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    extracted = extract_text_from_upload(file.filename or "upload.txt", raw)
    chapters = split_into_chapters(extracted)

    with get_conn() as conn:
        project = get_project(conn, project_id)
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        now = utc_now()
        import_dir = GENERATED_DIR / "imports" / f"project_{project_id}"
        import_dir.mkdir(parents=True, exist_ok=True)
        import_path = import_dir / (file.filename or f"project_{project_id}.txt")
        import_path.write_bytes(raw)
        for chapter_index, (title, body) in enumerate(chapters, start=1):
            chapter_id = conn.execute(
                """
                INSERT INTO chapters (project_id, title, order_index, source_text, tts_text, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)
                """,
                (project_id, title, chapter_index, body, body, now, now),
            ).lastrowid
            segments = split_into_segments(body)
            for segment_index, segment_text in enumerate(segments, start=1):
                conn.execute(
                    """
                    INSERT INTO segments (project_id, chapter_id, order_index, source_text, tts_text, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'ready', ?, ?)
                    """,
                    (project_id, chapter_id, segment_index, segment_text, segment_text, now, now),
                )
        conn.execute("UPDATE projects SET status = 'active', updated_at = ? WHERE id = ?", (now, project_id))
        log_activity(conn, user["id"], "project", project_id, "import", file.filename or "")

    return {"success": True, "chapter_count": len(chapters)}


@app.get("/api/projects/{project_id}/chapters")
def list_chapters(project_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        get_project(conn, project_id)
        rows = conn.execute("SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index", (project_id,)).fetchall()
        return {"items": [chapter_payload(conn, row) for row in rows]}


@app.get("/api/chapters/{chapter_id}/segments")
def list_segments(chapter_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        get_chapter(conn, chapter_id)
        rows = conn.execute("SELECT * FROM segments WHERE chapter_id = ? ORDER BY order_index", (chapter_id,)).fetchall()
        return {"items": [segment_payload(conn, row) for row in rows]}


@app.patch("/api/segments/{segment_id}")
def update_segment(segment_id: int, payload: SegmentUpdate, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        updates = {
            "tts_text": payload.tts_text,
            "updated_at": utc_now(),
        }
        if payload.status is not None:
            updates["status"] = payload.status
        if payload.voice_profile_id is not None:
            updates["voice_profile_id"] = payload.voice_profile_id
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(f"UPDATE segments SET {set_clause} WHERE id = ?", list(updates.values()) + [segment_id])
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (utc_now(), segment["project_id"]))
        updated = get_segment(conn, segment_id)
        log_activity(conn, user["id"], "segment", segment_id, "update", "tts_text")
        return {"segment": segment_payload(conn, updated)}


@app.get("/api/projects/{project_id}/voice-profiles")
def list_voice_profiles(project_id: int, user: dict = Depends(get_current_user)) -> dict:
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


@app.get("/api/system/providers")
def system_providers(user: dict = Depends(get_current_user)) -> dict:
    settings = get_settings()
    return {
        "providers": {
            "macos": {
                "configured": True,
                "label": "macOS say",
                "kind": ["tts"],
            },
            "openai": {
                "configured": settings.has_openai,
                "label": "OpenAI",
                "kind": ["tts", "asr"],
                "default_tts_model": settings.openai_tts_model,
                "default_asr_model": settings.openai_asr_model,
            },
            "elevenlabs": {
                "configured": settings.has_elevenlabs,
                "label": "ElevenLabs",
                "kind": ["tts", "asr"],
                "default_tts_model": settings.elevenlabs_tts_model,
                "default_asr_model": settings.elevenlabs_asr_model,
            },
        },
        "catalog": {
            "openai_tts_models": OPENAI_TTS_MODELS,
            "openai_tts_voices": OPENAI_TTS_VOICES,
            "elevenlabs_tts_models": ELEVENLABS_TTS_MODELS,
            "elevenlabs_asr_models": ELEVENLABS_ASR_MODELS,
        },
        "defaults": {
            "asr_provider": settings.default_asr_provider,
        },
    }


@app.post("/api/projects/{project_id}/voice-profiles")
def create_voice_profile(project_id: int, payload: VoiceProfileCreate, user: dict = Depends(get_current_user)) -> dict:
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
    with get_conn() as conn:
        segment = get_segment(conn, segment_id)
        voice = voice_for_project(conn, segment["project_id"], segment["voice_profile_id"])
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
    with get_conn() as conn:
        chapter = get_chapter(conn, chapter_id)
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
            voice = voice_for_project(conn, chapter["project_id"], segment["voice_profile_id"])
            job_id = conn.execute(
                """
                INSERT INTO generation_jobs (project_id, chapter_id, segment_id, job_type, status, provider, model, input_text, created_at, updated_at)
                VALUES (?, ?, ?, 'generate_segment', 'pending', ?, ?, ?, ?, ?)
                """,
                (chapter["project_id"], chapter_id, segment["id"], voice["provider"], voice["model"], segment["tts_text"], utc_now(), utc_now()),
            ).lastrowid
            conn.execute("UPDATE segments SET status = 'queued', updated_at = ? WHERE id = ?", (utc_now(), segment["id"]))
            job_ids.append(job_id)
    for job_id in job_ids:
        background.add_task(run_segment_generation, job_id)
    return {"job_ids": job_ids}


@app.get("/api/projects/{project_id}/jobs")
def list_jobs(project_id: int, user: dict = Depends(get_current_user)) -> dict:
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
    with get_conn() as conn:
        get_segment(conn, segment_id)
        rows = conn.execute("SELECT * FROM audio_takes WHERE segment_id = ? ORDER BY version_no DESC", (segment_id,)).fetchall()
        return {"items": [audio_take_payload(row) for row in rows]}


@app.get("/api/segments/{segment_id}/issues")
def list_issues(segment_id: int, user: dict = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        get_segment(conn, segment_id)
        rows = conn.execute("SELECT * FROM review_issues WHERE segment_id = ? ORDER BY created_at DESC", (segment_id,)).fetchall()
        return {"items": [dict(row) for row in rows]}


@app.post("/api/segments/{segment_id}/issues")
def create_issue(segment_id: int, payload: IssueCreate, user: dict = Depends(get_current_user)) -> dict:
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
    with get_conn() as conn:
        get_segment(conn, segment_id)
        conn.execute("UPDATE segments SET status = 'approved', updated_at = ? WHERE id = ?", (utc_now(), segment_id))
        conn.execute("UPDATE review_issues SET status = 'resolved', resolved_at = ? WHERE segment_id = ? AND status = 'open'", (utc_now(), segment_id))
        row = get_segment(conn, segment_id)
        payload = segment_payload(conn, row)
    return {"segment": payload}


@app.post("/api/segments/{segment_id}/reject")
def reject_segment(segment_id: int, payload: RejectRequest, user: dict = Depends(get_current_user)) -> dict:
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
