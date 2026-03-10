from __future__ import annotations

import json
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path

from .audio_utils import (
    convert_audio_to_wav,
    generate_segment_audio,
    wav_duration,
)
from .config import get_settings


class ProviderConfigError(RuntimeError):
    pass


class ProviderRequestError(RuntimeError):
    pass


@dataclass
class SpeechGenerationResult:
    file_path: Path
    duration_seconds: float
    request_id: str
    provider: str
    model: str


@dataclass
class TranscriptionResult:
    text: str
    request_id: str
    provider: str
    model: str


def _request_id(headers) -> str:
    return (
        headers.get("x-request-id")
        or headers.get("request-id")
        or headers.get("openai-request-id")
        or headers.get("x-openai-request-id")
        or ""
    )


def _json_request(url: str, headers: dict[str, str], payload: dict, timeout: int = 180) -> tuple[bytes, str]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    for key, value in headers.items():
        request.add_header(key, value)
    request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read(), _request_id(response.headers)
    except urllib.error.HTTPError as exc:  # pragma: no cover - network/runtime dependent
        detail = exc.read().decode("utf-8", errors="ignore")
        raise ProviderRequestError(detail or f"HTTP {exc.code}") from exc


def _multipart_request(
    url: str,
    headers: dict[str, str],
    fields: dict[str, str],
    files: dict[str, Path],
    timeout: int = 180,
) -> tuple[bytes, str]:
    boundary = f"----ai-publisher-{uuid.uuid4().hex}"
    body = bytearray()
    for key, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")
    for key, path in files.items():
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{key}"; filename="{path.name}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        body.extend(path.read_bytes())
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    request = urllib.request.Request(url, data=bytes(body), method="POST")
    for key, value in headers.items():
        request.add_header(key, value)
    request.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read(), _request_id(response.headers)
    except urllib.error.HTTPError as exc:  # pragma: no cover - network/runtime dependent
        detail = exc.read().decode("utf-8", errors="ignore")
        raise ProviderRequestError(detail or f"HTTP {exc.code}") from exc


def _normalize_language_code(language: str | None) -> str | None:
    if not language:
        return None
    value = language.strip()
    if not value:
        return None
    if "-" in value:
        return value.split("-", 1)[0].lower()
    return value.lower()


def generate_speech(
    text: str,
    voice_profile: dict,
    output_dir: Path,
    base_name: str,
    language: str | None = None,
) -> SpeechGenerationResult:
    provider = (voice_profile.get("provider") or "macos").strip().lower()
    if provider == "macos":
        wav_path, duration = generate_segment_audio(text, voice_profile["voice_name"], float(voice_profile["speed"] or 1.0), output_dir, base_name)
        return SpeechGenerationResult(
            file_path=wav_path,
            duration_seconds=duration,
            request_id="",
            provider="macos",
            model=voice_profile.get("model") or "say",
        )
    if provider == "openai":
        return _generate_openai_speech(text, voice_profile, output_dir, base_name)
    if provider == "elevenlabs":
        return _generate_elevenlabs_speech(text, voice_profile, output_dir, base_name, language=language)
    raise ProviderConfigError(f"Unsupported provider: {provider}")


def _generate_openai_speech(text: str, voice_profile: dict, output_dir: Path, base_name: str) -> SpeechGenerationResult:
    settings = get_settings()
    if not settings.has_openai:
        raise ProviderConfigError("OPENAI_API_KEY 未設定，無法使用 OpenAI 語音。")

    model = voice_profile.get("model") or settings.openai_tts_model
    voice_name = voice_profile.get("voice_name") or "alloy"
    payload = {
        "model": model,
        "voice": voice_name,
        "input": text,
        "response_format": "wav",
        "speed": float(voice_profile.get("speed") or 1.0),
    }
    if voice_profile.get("instructions"):
        payload["instructions"] = voice_profile["instructions"]

    audio_bytes, request_id = _json_request(
        f"{settings.openai_base_url}/v1/audio/speech",
        {"Authorization": f"Bearer {settings.openai_api_key}"},
        payload,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_path = output_dir / f"{base_name}.openai.wav"
    wav_path = output_dir / f"{base_name}.wav"
    raw_path.write_bytes(audio_bytes)
    convert_audio_to_wav(raw_path, wav_path)
    raw_path.unlink(missing_ok=True)
    return SpeechGenerationResult(
        file_path=wav_path,
        duration_seconds=wav_duration(wav_path),
        request_id=request_id,
        provider="openai",
        model=model,
    )


def _generate_elevenlabs_speech(
    text: str,
    voice_profile: dict,
    output_dir: Path,
    base_name: str,
    language: str | None = None,
) -> SpeechGenerationResult:
    settings = get_settings()
    if not settings.has_elevenlabs:
        raise ProviderConfigError("ELEVENLABS_API_KEY 未設定，無法使用 ElevenLabs 語音。")

    model = voice_profile.get("model") or settings.elevenlabs_tts_model
    voice_id = (voice_profile.get("voice_name") or "").strip()
    if not voice_id:
        raise ProviderConfigError("ElevenLabs 聲線設定需要填入 voice_id。")

    query = urllib.parse.urlencode({"output_format": "mp3_44100_128"})
    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {
            "speed": max(0.7, min(1.2, float(voice_profile.get("speed") or 1.0))),
        },
    }
    language_code = _normalize_language_code(language)
    if language_code:
        payload["language_code"] = language_code

    audio_bytes, request_id = _json_request(
        f"{settings.elevenlabs_base_url}/v1/text-to-speech/{urllib.parse.quote(voice_id)}?{query}",
        {"xi-api-key": settings.elevenlabs_api_key},
        payload,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    mp3_path = output_dir / f"{base_name}.elevenlabs.mp3"
    wav_path = output_dir / f"{base_name}.wav"
    mp3_path.write_bytes(audio_bytes)
    convert_audio_to_wav(mp3_path, wav_path)
    mp3_path.unlink(missing_ok=True)
    return SpeechGenerationResult(
        file_path=wav_path,
        duration_seconds=wav_duration(wav_path),
        request_id=request_id,
        provider="elevenlabs",
        model=model,
    )


def transcribe_audio(audio_path: Path, language: str | None = None) -> TranscriptionResult | None:
    provider = _resolve_asr_provider()
    if provider == "openai":
        return _transcribe_with_openai(audio_path, language=language)
    if provider == "elevenlabs":
        return _transcribe_with_elevenlabs(audio_path)
    return None


def _resolve_asr_provider() -> str:
    settings = get_settings()
    configured = settings.default_asr_provider
    if configured in {"openai", "elevenlabs", "mock"}:
        if configured == "openai" and settings.has_openai:
            return "openai"
        if configured == "elevenlabs" and settings.has_elevenlabs:
            return "elevenlabs"
        if configured == "mock":
            return "mock"
    if settings.has_openai:
        return "openai"
    if settings.has_elevenlabs:
        return "elevenlabs"
    return "mock"


def _transcribe_with_openai(audio_path: Path, language: str | None = None) -> TranscriptionResult:
    settings = get_settings()
    if not settings.has_openai:
        raise ProviderConfigError("OPENAI_API_KEY 未設定，無法使用 OpenAI 轉寫。")
    fields = {
        "model": settings.openai_asr_model,
        "response_format": "json",
    }
    language_code = _normalize_language_code(language)
    if language_code:
        fields["language"] = language_code
    raw, request_id = _multipart_request(
        f"{settings.openai_base_url}/v1/audio/transcriptions",
        {"Authorization": f"Bearer {settings.openai_api_key}"},
        fields,
        {"file": audio_path},
    )
    payload = json.loads(raw.decode("utf-8"))
    return TranscriptionResult(
        text=payload.get("text", "").strip(),
        request_id=request_id,
        provider="openai",
        model=settings.openai_asr_model,
    )


def _transcribe_with_elevenlabs(audio_path: Path) -> TranscriptionResult:
    settings = get_settings()
    if not settings.has_elevenlabs:
        raise ProviderConfigError("ELEVENLABS_API_KEY 未設定，無法使用 ElevenLabs 轉寫。")
    raw, request_id = _multipart_request(
        f"{settings.elevenlabs_base_url}/v1/speech-to-text",
        {"xi-api-key": settings.elevenlabs_api_key},
        {"model_id": settings.elevenlabs_asr_model},
        {"file": audio_path},
    )
    payload = json.loads(raw.decode("utf-8"))
    return TranscriptionResult(
        text=payload.get("text", "").strip(),
        request_id=request_id,
        provider="elevenlabs",
        model=settings.elevenlabs_asr_model,
    )
