from __future__ import annotations

import json
import os
import sys
import time
from urllib import error, request

BASE_URL = os.environ.get("AI_PUBLISHER_URL", "http://127.0.0.1:8000").rstrip("/")
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

SCREENSHOT_PROJECT_TITLE = "西游记 · 全屏向导演示"
EXTRA_PROJECTS = [
    {
        "title": "封神榜 · 文本演示",
        "author": "许仲琳",
        "language": "zh-CN",
        "description": "供项目列表截图使用的陪衬项目",
        "project_type": "audiobook",
    },
    {
        "title": "哪吒 · 漫画演示",
        "author": "演示团队",
        "language": "zh-CN",
        "description": "供项目列表截图使用的漫画项目",
        "project_type": "comic",
    },
]
ALL_SCREENSHOT_TITLES = {SCREENSHOT_PROJECT_TITLE, *(item["title"] for item in EXTRA_PROJECTS)}

BOOK_TEXT = """西游记第一章 石猴出世
花果山顶有一块仙石，日日受天真地秀，感日精月华。

一朝石卵迸裂，跳出一个石猴，目运两道金光，惊动了群山百兽。

群猴围在一旁，又惊又喜，都说这石猴来历不凡。

第二章节 水帘洞称王
瀑布飞泉垂挂千尺，众猴都想知道水帘后面到底藏着什么。

石猴拍着胸膛笑道，若是我进去又出来，诸位可愿拜我为王？

他纵身一跳，穿过水帘，发现里面石锅石灶样样齐备，竟是一处天然家当。
"""

MANUAL_CHAPTER_TITLE = "第一回 美猴王得名"
MANUAL_CHAPTER_BODY = """群猴见石猴真的闯入又平安回来，个个欢呼跳跃。

大家依约拜他为王，尊他做美猴王，从此花果山有了新的主人。

美猴王每日带着众猴采果习武，山中一派热闹景象。"""

TOKEN = ""


def http_json(method: str, path: str, payload: dict | None = None) -> dict:
    global TOKEN
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    req = request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {body}") from exc


def wait_for(predicate, label: str, timeout: float = 60.0, interval: float = 1.0) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        last = predicate()
        if last:
            return last
        time.sleep(interval)
    raise TimeoutError(f"Timed out while waiting for {label}: {last}")


def delete_existing_projects() -> None:
    projects = http_json("GET", "/api/projects").get("items", [])
    for project in projects:
        if project.get("title") in ALL_SCREENSHOT_TITLES:
            http_json("DELETE", f"/api/projects/{project['id']}")


def create_project(payload: dict) -> dict:
    return http_json("POST", "/api/projects", payload)["project"]


def create_voice_profile(project_id: int, name: str, voice_name: str, is_default: bool = False) -> dict:
    payload = {
        "name": name,
        "provider": "macos",
        "model": "say",
        "voice_name": voice_name,
        "speed": 1.0,
        "style": "",
        "instructions": "",
        "is_default": is_default,
    }
    return http_json("POST", f"/api/projects/{project_id}/voice-profiles", payload)["voice_profile"]


def wait_for_job_completion(project_id: int, expected_count: int) -> list[dict]:
    def _check() -> dict:
        items = http_json("GET", f"/api/projects/{project_id}/jobs").get("items", [])
        if len(items) < expected_count:
            return {}
        if all(item.get("status") == "succeeded" for item in items[:expected_count]):
            return {"items": items}
        return {}

    payload = wait_for(_check, f"jobs for project {project_id}")
    return payload["items"]


def wait_for_review_queue(project_id: int) -> list[dict]:
    def _check() -> dict:
        items = http_json("GET", f"/api/projects/{project_id}/review-queue").get("items", [])
        if items:
            return {"items": items}
        return {}

    payload = wait_for(_check, f"review queue for project {project_id}")
    return payload["items"]


def wait_for_render(chapter_id: int) -> dict:
    def _check() -> dict:
        items = http_json("GET", f"/api/chapters/{chapter_id}/renders").get("items", [])
        if items and items[0].get("status") == "succeeded":
            return {"item": items[0]}
        return {}

    return wait_for(_check, f"render for chapter {chapter_id}")["item"]


def wait_for_export(project_id: int) -> dict:
    def _check() -> dict:
        items = http_json("GET", f"/api/projects/{project_id}/exports").get("items", [])
        if items and items[0].get("status") == "succeeded":
            return {"item": items[0]}
        return {}

    return wait_for(_check, f"export for project {project_id}")["item"]


def main() -> None:
    global TOKEN

    login = http_json("POST", "/api/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    TOKEN = login["token"]

    delete_existing_projects()

    for payload in EXTRA_PROJECTS:
        create_project(payload)

    project = create_project(
        {
            "title": SCREENSHOT_PROJECT_TITLE,
            "author": "吴承恩",
            "language": "zh-CN",
            "description": "用于更新 docs/assets/manual 的界面截图演示项目",
            "project_type": "audiobook",
        }
    )
    project_id = project["id"]

    create_voice_profile(project_id, "旁白 · Tingting", "Tingting", is_default=True)
    create_voice_profile(project_id, "悟空 · Meijia", "Meijia")
    create_voice_profile(project_id, "师父 · 婷婷", "Tingting")

    http_json(
        "POST",
        f"/api/projects/{project_id}/import-paste",
        {"text": BOOK_TEXT, "filename": "xiyouji_demo_source.txt"},
    )
    http_json(
        "POST",
        f"/api/projects/{project_id}/chapters",
        {"title": MANUAL_CHAPTER_TITLE, "body": MANUAL_CHAPTER_BODY},
    )

    detail = http_json("GET", f"/api/projects/{project_id}")["project"]
    chapters = detail.get("chapters", [])
    if len(chapters) < 3:
        raise RuntimeError(f"Expected at least 3 chapters, got {len(chapters)}")

    generation = http_json("POST", f"/api/projects/{project_id}/generate-with-default-voice")
    job_ids = generation.get("job_ids", [])
    if not job_ids:
        raise RuntimeError("No generation jobs were created")
    wait_for_job_completion(project_id, len(job_ids))

    review_items = wait_for_review_queue(project_id)
    http_json(
        "POST",
        f"/api/segments/{review_items[0]['id']}/issues",
        {
            "issue_type": "pronunciation",
            "severity": "high",
            "description": "手册截图示例：保留一条待处理问题，方便展示审校队列。",
        },
    )

    approved_chapters = chapters[:2]
    pending_chapter = chapters[2]
    for chapter in approved_chapters:
        segments = http_json("GET", f"/api/chapters/{chapter['id']}/segments").get("items", [])
        for segment in segments:
            http_json("POST", f"/api/segments/{segment['id']}/approve")
        http_json("POST", f"/api/chapters/{chapter['id']}/render")
        wait_for_render(chapter["id"])

    export_item = {}
    http_json("POST", f"/api/projects/{project_id}/export")
    export_item = wait_for_export(project_id)

    final_detail = http_json("GET", f"/api/projects/{project_id}")["project"]
    pending_segments = http_json("GET", f"/api/chapters/{pending_chapter['id']}/segments").get("items", [])

    result = {
        "project_id": project_id,
        "project_title": SCREENSHOT_PROJECT_TITLE,
        "chapter_ids": [chapter["id"] for chapter in final_detail.get("chapters", [])],
        "approved_chapter_ids": [chapter["id"] for chapter in approved_chapters],
        "pending_chapter_id": pending_chapter["id"],
        "pending_segment_count": len([segment for segment in pending_segments if segment.get("status") in {"review_required", "rejected"}]),
        "export_file_url": export_item.get("file_url", ""),
        "source_book_url": final_detail.get("source_book_url", ""),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - CLI helper
        print(str(exc), file=sys.stderr)
        raise
