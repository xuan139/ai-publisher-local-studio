from __future__ import annotations

import json
import re
import subprocess
import wave
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .db import GENERATED_DIR

TARGET_SAMPLE_RATE = 22050


def slugify(text: str) -> str:
    safe = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", text.strip()).strip("-").lower()
    return safe or "item"


def generate_segment_audio(text: str, voice_name: str, speed: float, output_dir: Path, base_name: str) -> tuple[Path, float]:
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_aiff = output_dir / f"{base_name}.aiff"
    output_wav = output_dir / f"{base_name}.wav"
    rate = max(120, min(280, int(175 * speed)))
    subprocess.run(["say", "-v", voice_name, "-r", str(rate), "-o", str(temp_aiff), text], check=True)
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{TARGET_SAMPLE_RATE}", str(temp_aiff), str(output_wav)], check=True)
    temp_aiff.unlink(missing_ok=True)
    return output_wav, wav_duration(output_wav)


def convert_audio_to_wav(input_path: Path, output_wav: Path) -> Path:
    output_wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{TARGET_SAMPLE_RATE}", str(input_path), str(output_wav)],
        check=True,
    )
    return output_wav


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as handle:
        frames = handle.getnframes()
        rate = handle.getframerate()
    return round(frames / float(rate), 2) if rate else 0.0


def concat_wavs(paths: list[Path], output_path: Path) -> Path:
    if not paths:
        raise ValueError("No wav files to concatenate")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(paths[0]), "rb") as first:
        params = first.getparams()
        frames = [first.readframes(first.getnframes())]

    for path in paths[1:]:
        with wave.open(str(path), "rb") as handle:
            handle_params = handle.getparams()
            if (
                handle_params.nchannels != params.nchannels
                or handle_params.sampwidth != params.sampwidth
                or handle_params.framerate != params.framerate
                or handle_params.comptype != params.comptype
            ):
                raise ValueError("WAV parameters do not match")
            frames.append(handle.readframes(handle.getnframes()))

    with wave.open(str(output_path), "wb") as out:
        out.setparams(params)
        for chunk in frames:
            out.writeframes(chunk)

    return output_path


def create_export_zip(project_title: str, renders: list[tuple[str, Path]], export_dir: Path) -> Path:
    export_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    zip_path = export_dir / f"{slugify(project_title)}-{stamp}.zip"
    manifest = {
        "project_title": project_title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "chapters": [{"title": title, "file": path.name} for title, path in renders],
    }
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        for title, path in renders:
            archive.write(path, arcname=f"chapters/{path.name}")
    return zip_path


def public_file_path(path: str | Path) -> str:
    rel = Path(path).resolve().relative_to(GENERATED_DIR.resolve())
    return f"/generated/{rel.as_posix()}"
