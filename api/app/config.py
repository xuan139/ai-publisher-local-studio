from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

OPENAI_TTS_MODELS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"]
OPENAI_TTS_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"]
ELEVENLABS_TTS_MODELS = ["eleven_multilingual_v2", "eleven_v3", "eleven_flash_v2_5", "eleven_turbo_v2_5"]
ELEVENLABS_ASR_MODELS = ["scribe_v2", "scribe_v1"]


@dataclass(frozen=True)
class RuntimeSettings:
    openai_api_key: str
    openai_base_url: str
    openai_tts_model: str
    openai_asr_model: str
    elevenlabs_api_key: str
    elevenlabs_base_url: str
    elevenlabs_tts_model: str
    elevenlabs_asr_model: str
    default_asr_provider: str

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_elevenlabs(self) -> bool:
        return bool(self.elevenlabs_api_key)


@lru_cache(maxsize=1)
def get_settings() -> RuntimeSettings:
    return RuntimeSettings(
        openai_api_key=os.environ.get("OPENAI_API_KEY", "").strip(),
        openai_base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/"),
        openai_tts_model=os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts").strip() or "gpt-4o-mini-tts",
        openai_asr_model=os.environ.get("OPENAI_ASR_MODEL", "gpt-4o-mini-transcribe").strip() or "gpt-4o-mini-transcribe",
        elevenlabs_api_key=os.environ.get("ELEVENLABS_API_KEY", "").strip(),
        elevenlabs_base_url=os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").rstrip("/"),
        elevenlabs_tts_model=os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2").strip() or "eleven_multilingual_v2",
        elevenlabs_asr_model=os.environ.get("ELEVENLABS_ASR_MODEL", "scribe_v2").strip() or "scribe_v2",
        default_asr_provider=os.environ.get("AI_PUBLISHER_ASR_PROVIDER", "auto").strip().lower() or "auto",
    )
