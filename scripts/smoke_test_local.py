from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from urllib import error, request

BASE_URL = os.environ.get("AI_PUBLISHER_URL", "http://127.0.0.1:8000").rstrip("/")
TOKEN = ""


def http_json(method: str, path: str, payload: dict | None = None) -> dict:
    global TOKEN
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    req = request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {body}") from exc


def multipart_upload(path: str, file_path: Path) -> dict:
    boundary = f"----ai-publisher-{uuid.uuid4().hex}"
    file_bytes = file_path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'
        "Content-Type: text/plain\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    headers = {
        "Accept": "application/json",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {TOKEN}",
    }
    req = request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method="POST")
    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for(predicate, label: str, timeout: float = 40.0, interval: float = 1.0) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        last = predicate()
        if last:
            return last
        time.sleep(interval)
    raise TimeoutError(f"Timed out while waiting for {label}: {last}")


def wait_for_non_empty(path: str, key: str = "items") -> dict:
    def _check() -> dict:
        payload = http_json("GET", path)
        if payload.get(key):
            return payload
        return {}

    return wait_for(_check, path)


def wait_for_status(path: str, expected_status: str, key: str = "items") -> dict:
    def _check() -> dict:
        payload = http_json("GET", path)
        items = payload.get(key) or []
        if items and items[0].get("status") == expected_status:
            return payload
        return {}

    return wait_for(_check, f"{path} -> {expected_status}")


def main() -> None:
    global TOKEN

    login = http_json("POST", "/api/auth/login", {"email": "admin@example.com", "password": "admin123"})
    TOKEN = login["token"]
    print("login ok")

    title = f"Smoke Test {uuid.uuid4().hex[:6]}"
    project = http_json(
        "POST",
        "/api/projects",
        {"title": title, "author": "Codex", "language": "zh-CN", "description": "Automated smoke test"},
    )["project"]
    project_id = project["id"]
    print(f"project ok #{project_id}")

    sample_path = Path("/tmp/ai_publisher_smoke.txt")
    sample_path.write_text(
        "第一章 起点\n这里是第一章。包含数字 2026。\n\n第二章 展开\n这里是第二章，用来验证生成、审核、渲染与导出。",
        encoding="utf-8",
    )
    imported = multipart_upload(f"/api/projects/{project_id}/import", sample_path)
    assert imported["chapter_count"] == 2
    print("import ok")

    detail = http_json("GET", f"/api/projects/{project_id}")["project"]
    chapters = detail["chapters"]
    for chapter in chapters:
        http_json("POST", f"/api/chapters/{chapter['id']}/generate")
    print("generation queued")

    queue = wait_for_non_empty(f"/api/projects/{project_id}/review-queue")
    for segment in queue["items"]:
        http_json("POST", f"/api/segments/{segment['id']}/approve")
    print("review ok")

    for chapter in chapters:
        http_json("POST", f"/api/chapters/{chapter['id']}/render")

    wait_for_status(f"/api/chapters/{chapters[0]['id']}/renders", "succeeded")
    wait_for_status(f"/api/chapters/{chapters[1]['id']}/renders", "succeeded")
    print("render ok")

    http_json("POST", f"/api/projects/{project_id}/export")
    exports = wait_for_status(f"/api/projects/{project_id}/exports", "succeeded")
    export_item = exports["items"][0]
    print(f"export ok -> {export_item['file_url']}")


if __name__ == "__main__":
    main()
