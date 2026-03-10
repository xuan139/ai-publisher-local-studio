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


class ProjectUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    language: str | None = None
    description: str | None = None
    status: str | None = None
    default_voice_profile_id: int | None = None


class SegmentUpdate(BaseModel):
    tts_text: str
    status: str | None = None
    voice_profile_id: int | None = None


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


class IssueCreate(BaseModel):
    issue_type: str
    severity: str = "medium"
    description: str


class IssueUpdate(BaseModel):
    status: str


class RejectRequest(BaseModel):
    description: str = ""
