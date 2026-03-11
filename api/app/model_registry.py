from __future__ import annotations

import json
import subprocess
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - optional dependency for local environments
    yaml = None

ROOT_DIR = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT_DIR / "config" / "model_registry.yaml"

DEFAULT_MODEL_REGISTRY: dict[str, Any] = {
    "version": 1,
    "providers": {
        "macos": {
            "label": "macOS say",
            "kind": ["tts"],
            "requires_env": "",
            "tts_models": ["say"],
            "tts_voices": ["Tingting", "Eddy (Chinese (China mainland))", "Samantha", "Daniel"],
            "asr_models": [],
        },
        "openai": {
            "label": "OpenAI",
            "kind": ["llm", "tts", "asr", "image"],
            "requires_env": "OPENAI_API_KEY",
            "tts_models": ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"],
            "tts_voices": ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"],
            "asr_models": ["gpt-4o-mini-transcribe"],
        },
        "elevenlabs": {
            "label": "ElevenLabs",
            "kind": ["tts", "asr"],
            "requires_env": "ELEVENLABS_API_KEY",
            "tts_models": ["eleven_multilingual_v2", "eleven_v3", "eleven_flash_v2_5", "eleven_turbo_v2_5"],
            "tts_voices": [],
            "asr_models": ["scribe_v2", "scribe_v1"],
        },
    },
    "defaults": {
        "comic_settings": {
            "enabled": False,
            "script_model": "openai:gpt-4.1",
            "storyboard_model": "google:gemini-2.0-flash",
            "image_model": "openai:gpt-image-1",
            "style_preset": "cinematic-ink",
            "color_mode": "full-color",
            "aspect_ratio": "4:5",
            "character_consistency": "medium",
            "negative_prompt": "",
        },
        "video_settings": {
            "enabled": False,
            "script_model": "openai:gpt-4.1",
            "shot_model": "google:gemini-2.0-flash",
            "image_model": "openai:gpt-image-1",
            "video_model": "runway:gen-3",
            "subtitle_model": "openai:gpt-4.1-mini",
            "aspect_ratio": "16:9",
            "duration_seconds": 30,
            "motion_style": "cinematic",
            "negative_prompt": "",
        },
    },
    "catalog": {
        "comic": {
            "script_models": ["openai:gpt-4.1", "openai:gpt-4o", "google:gemini-2.0-flash", "google:gemini-2.5-pro"],
            "storyboard_models": ["openai:gpt-4.1", "google:gemini-2.0-flash", "google:gemini-2.5-pro"],
            "image_models": ["openai:gpt-image-1", "bfl:flux-pro", "stability:sdxl"],
            "style_presets": ["cinematic-ink", "anime-color", "watercolor", "noir"],
            "color_modes": ["full-color", "black-white", "duotone"],
            "aspect_ratios": ["1:1", "4:5", "3:4", "16:9"],
            "character_consistency_levels": ["low", "medium", "high"],
        },
        "video": {
            "script_models": ["openai:gpt-4.1", "openai:gpt-4o", "google:gemini-2.0-flash", "google:gemini-2.5-pro"],
            "shot_models": ["openai:gpt-4.1", "google:gemini-2.0-flash", "google:gemini-2.5-pro"],
            "image_models": ["openai:gpt-image-1", "bfl:flux-pro", "stability:sdxl"],
            "video_models": ["runway:gen-3", "kling:v1.6", "pika:2.2"],
            "subtitle_models": ["openai:gpt-4.1-mini", "openai:gpt-4o-mini", "google:gemini-2.0-flash"],
            "aspect_ratios": ["16:9", "9:16", "1:1", "4:5"],
            "motion_styles": ["cinematic", "anime", "documentary", "social-short"],
            "duration_options": [15, 30, 45, 60],
        },
    },
}


def _deep_merge(base: Any, override: Any) -> Any:
    if isinstance(base, dict) and isinstance(override, dict):
        merged = deepcopy(base)
        for key, value in override.items():
            if key in merged:
                merged[key] = _deep_merge(merged[key], value)
            else:
                merged[key] = deepcopy(value)
        return merged
    return deepcopy(override)


def _ensure_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _ensure_list(value: Any) -> list[Any]:
    return [item for item in value if item not in (None, "")] if isinstance(value, list) else []


def _load_registry_file() -> dict[str, Any]:
    if not REGISTRY_PATH.exists():
        return {}
    raw_text = REGISTRY_PATH.read_text(encoding="utf-8")
    if yaml is not None:
        raw = yaml.safe_load(raw_text)
        return raw if isinstance(raw, dict) else {}

    result = subprocess.run(
        [
            "ruby",
            "-rjson",
            "-ryaml",
            "-e",
            "data = YAML.safe_load(File.read(ARGV[0]), aliases: true); print JSON.generate(data || {})",
            str(REGISTRY_PATH),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    parsed = json.loads(result.stdout or "{}")
    return parsed if isinstance(parsed, dict) else {}


def _normalize_provider(name: str, value: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    payload = _ensure_dict(value)
    merged = _deep_merge(fallback, payload)
    return {
        "label": str(merged.get("label") or fallback.get("label") or name),
        "kind": _ensure_list(merged.get("kind")),
        "requires_env": str(merged.get("requires_env") or ""),
        "tts_models": _ensure_list(merged.get("tts_models")),
        "tts_voices": _ensure_list(merged.get("tts_voices")),
        "asr_models": _ensure_list(merged.get("asr_models")),
    }


def _normalize_registry(raw: dict[str, Any]) -> dict[str, Any]:
    merged = _deep_merge(DEFAULT_MODEL_REGISTRY, raw)

    providers = {}
    raw_providers = _ensure_dict(merged.get("providers"))
    for name, fallback in DEFAULT_MODEL_REGISTRY["providers"].items():
        providers[name] = _normalize_provider(name, raw_providers.get(name), fallback)
    for name, payload in raw_providers.items():
        if name not in providers:
            providers[name] = _normalize_provider(name, payload, {"label": name, "kind": [], "requires_env": "", "tts_models": [], "tts_voices": [], "asr_models": []})

    defaults = {
        "comic_settings": _deep_merge(DEFAULT_MODEL_REGISTRY["defaults"]["comic_settings"], _ensure_dict(_ensure_dict(merged.get("defaults")).get("comic_settings"))),
        "video_settings": _deep_merge(DEFAULT_MODEL_REGISTRY["defaults"]["video_settings"], _ensure_dict(_ensure_dict(merged.get("defaults")).get("video_settings"))),
    }

    raw_catalog = _ensure_dict(merged.get("catalog"))
    raw_comic = _ensure_dict(raw_catalog.get("comic"))
    raw_video = _ensure_dict(raw_catalog.get("video"))

    comic_catalog = {
        "script_models": _ensure_list(raw_comic.get("script_models")),
        "storyboard_models": _ensure_list(raw_comic.get("storyboard_models")),
        "image_models": _ensure_list(raw_comic.get("image_models")),
        "style_presets": _ensure_list(raw_comic.get("style_presets")),
        "color_modes": _ensure_list(raw_comic.get("color_modes")),
        "aspect_ratios": _ensure_list(raw_comic.get("aspect_ratios")),
        "character_consistency_levels": _ensure_list(raw_comic.get("character_consistency_levels")),
    }
    video_catalog = {
        "script_models": _ensure_list(raw_video.get("script_models")),
        "shot_models": _ensure_list(raw_video.get("shot_models")),
        "image_models": _ensure_list(raw_video.get("image_models")),
        "video_models": _ensure_list(raw_video.get("video_models")),
        "subtitle_models": _ensure_list(raw_video.get("subtitle_models")),
        "aspect_ratios": _ensure_list(raw_video.get("aspect_ratios")),
        "motion_styles": _ensure_list(raw_video.get("motion_styles")),
        "duration_options": _ensure_list(raw_video.get("duration_options")),
    }

    return {
        "version": int(merged.get("version") or 1),
        "providers": providers,
        "defaults": defaults,
        "catalog": {
            "comic": comic_catalog,
            "video": video_catalog,
        },
    }


@lru_cache(maxsize=1)
def get_model_registry() -> dict[str, Any]:
    try:
        return _normalize_registry(_load_registry_file())
    except Exception:
        return _normalize_registry({})


def get_registry_defaults() -> dict[str, Any]:
    return deepcopy(get_model_registry()["defaults"])


def get_system_catalog() -> dict[str, Any]:
    registry = get_model_registry()
    providers = registry["providers"]
    return {
        "macos_tts_models": providers.get("macos", {}).get("tts_models", []),
        "macos_tts_voices": providers.get("macos", {}).get("tts_voices", []),
        "openai_tts_models": providers.get("openai", {}).get("tts_models", []),
        "openai_tts_voices": providers.get("openai", {}).get("tts_voices", []),
        "openai_asr_models": providers.get("openai", {}).get("asr_models", []),
        "elevenlabs_tts_models": providers.get("elevenlabs", {}).get("tts_models", []),
        "elevenlabs_asr_models": providers.get("elevenlabs", {}).get("asr_models", []),
        "comic": deepcopy(registry["catalog"]["comic"]),
        "video": deepcopy(registry["catalog"]["video"]),
    }
