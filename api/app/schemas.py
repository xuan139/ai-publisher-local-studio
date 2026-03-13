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
    project_type: str = "audiobook"
    comic_settings: dict = Field(default_factory=dict)
    video_settings: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    language: str | None = None
    description: str | None = None
    project_type: str | None = None
    comic_settings: dict | None = None
    video_settings: dict | None = None
    status: str | None = None
    default_voice_profile_id: int | None = None


class ProjectImportLocalRequest(BaseModel):
    path: str = Field(min_length=1)


class ProjectPasteImportRequest(BaseModel):
    text: str = Field(min_length=1)
    filename: str = "source_book.txt"


class ProjectChapterCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)


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
    role_type: str = "supporting"
    story_character_name: str = ""
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
    role_type: str | None = None
    story_character_name: str | None = None
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


class MergeSegmentsRequest(BaseModel):
    segment_ids: list[int] = Field(default_factory=list)


class ChapterCharacterAutoBindRequest(BaseModel):
    fallback_voice_profile_id: int | None = None
    narrator_character_profile_id: int | None = None
    assign_unmatched_to_narrator: bool = False


class CharacterLookUpdate(BaseModel):
    label: str = ""


class CharacterLookImportRequest(BaseModel):
    url: str = Field(min_length=1)
    label: str = ""


class ModelProfileCreate(BaseModel):
    name: str = Field(min_length=1)
    settings: dict = Field(default_factory=dict)


class ComicScriptCreate(BaseModel):
    title: str = Field(min_length=1)
    chapter_id: int | None = None
    premise: str = ""
    outline_text: str = ""
    script_text: str = ""
    target_page_count: int = 1
    status: str = "draft"


class ComicScriptUpdate(BaseModel):
    title: str | None = None
    chapter_id: int | None = None
    premise: str | None = None
    outline_text: str | None = None
    script_text: str | None = None
    target_page_count: int | None = None
    status: str | None = None


class ComicPageCreate(BaseModel):
    title: str = ""
    chapter_id: int | None = None
    comic_script_id: int | None = None
    page_no: int | None = None
    layout_preset: str = "two-column"
    summary: str = ""
    notes: str = ""
    status: str = "draft"


class ComicPageUpdate(BaseModel):
    title: str | None = None
    chapter_id: int | None = None
    comic_script_id: int | None = None
    page_no: int | None = None
    layout_preset: str | None = None
    summary: str | None = None
    notes: str | None = None
    status: str | None = None


class ComicPanelCreate(BaseModel):
    title: str = ""
    panel_no: int | None = None
    script_text: str = ""
    dialogue_text: str = ""
    caption_text: str = ""
    sfx_text: str = ""
    shot_type: str = ""
    camera_angle: str = ""
    composition_notes: str = ""
    character_ids: list[int] = Field(default_factory=list)
    prompt_text: str = ""
    negative_prompt: str = ""
    image_status: str = "pending"
    layout_notes: str = ""


class ComicPanelUpdate(BaseModel):
    title: str | None = None
    panel_no: int | None = None
    script_text: str | None = None
    dialogue_text: str | None = None
    caption_text: str | None = None
    sfx_text: str | None = None
    shot_type: str | None = None
    camera_angle: str | None = None
    composition_notes: str | None = None
    character_ids: list[int] | None = None
    prompt_text: str | None = None
    negative_prompt: str | None = None
    image_status: str | None = None
    layout_notes: str | None = None


class ComicPanelImageImportRequest(BaseModel):
    url: str = Field(min_length=1)


class IssueCreate(BaseModel):
    issue_type: str
    severity: str = "medium"
    description: str


class IssueUpdate(BaseModel):
    status: str


class RejectRequest(BaseModel):
    description: str = ""
