from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=3)


class ProjectCreate(BaseModel):
    title: str
    author: str = ""
    language: str = "zh-CN"
    description: str = ""
    comic_settings: dict = Field(default_factory=dict)
    video_settings: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    language: str | None = None
    description: str | None = None
    comic_settings: dict | None = None
    video_settings: dict | None = None
    status: str | None = None
    default_voice_profile_id: int | None = None


class ProjectImportLocalRequest(BaseModel):
    path: str = Field(min_length=1)


class SegmentUpdate(BaseModel):
    tts_text: str
    status: str | None = None
    voice_profile_id: int | None = None
    character_profile_id: int | None = None


class VoiceProfileCreate(BaseModel):
    name: str
    provider: str = "macos"
    model: str = "say"
    voice_name: str
    speed: float = 1.0
    style: str = ""
    instructions: str = ""
    is_default: bool = False


class VoiceProfileUpdate(BaseModel):
    name: str | None = None
    voice_name: str | None = None
    speed: float | None = None
    style: str | None = None
    instructions: str | None = None
    is_default: bool | None = None


class CharacterProfileCreate(BaseModel):
    name: str = Field(min_length=1)
    voice_profile_id: int
    display_title: str = ""
    archetype: str = ""
    summary: str = ""
    personality: str = ""
    backstory: str = ""
    catchphrase: str = ""
    default_mood: str = ""
    preset_key: str = ""
    speed_override: float | None = None
    style_override: str = ""
    instructions: str = ""
    warmth: int = 50
    intensity: int = 50
    humor: int = 50
    mystery: int = 50
    bravery: int = 50
    discipline: int = 50


class CharacterProfileUpdate(BaseModel):
    name: str | None = None
    voice_profile_id: int | None = None
    display_title: str | None = None
    archetype: str | None = None
    summary: str | None = None
    personality: str | None = None
    backstory: str | None = None
    catchphrase: str | None = None
    default_mood: str | None = None
    preset_key: str | None = None
    speed_override: float | None = None
    style_override: str | None = None
    instructions: str | None = None
    warmth: int | None = None
    intensity: int | None = None
    humor: int | None = None
    mystery: int | None = None
    bravery: int | None = None
    discipline: int | None = None


class BatchCharacterAssignRequest(BaseModel):
    character_profile_id: int | None = None
    segment_ids: list[int] = Field(default_factory=list)


class CharacterLookUpdate(BaseModel):
    label: str = ""


class CharacterLookImportRequest(BaseModel):
    url: str = Field(min_length=1)
    label: str = ""


class ModelProfileCreate(BaseModel):
    name: str = Field(min_length=1)
    settings: dict = Field(default_factory=dict)


class IssueCreate(BaseModel):
    issue_type: str
    severity: str = "medium"
    description: str


class IssueUpdate(BaseModel):
    status: str


class RejectRequest(BaseModel):
    description: str = ""
