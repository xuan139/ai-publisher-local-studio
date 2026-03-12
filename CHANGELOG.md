# Changelog

All notable changes to this project will be documented in this file.

This changelog starts on March 12, 2026. Earlier history is available in git commits.

## [2026-03-12]

### Added

- Added project types for `audiobook`, `comic`, `motion_comic`, and `video`.
- Added Phase 1 comic workflow data models and APIs:
  - `comic_scripts`
  - `comic_pages`
  - `comic_panels`
- Added comic workflow pages:
  - `漫畫腳本`
  - `分鏡工作台`
  - `畫格生成`
  - `頁面排版`
- Added separated sidebar navigation for `有聲書流程`, `漫畫流程`, and `系統與擴展`.
- Added audiobook role-based character profiles with:
  - `role_type`
  - `story_character_name`
- Added chapter-level character detection and automatic batch binding.
- Added multi-select segment merge for contiguous segments in the same chapter.
- Added `docs/comic_workflow_plan.md`.

### Changed

- Expanded the character workflow to support narrator, lead, supporting, background, and custom roles.
- Updated text preparation so segments can bind to a novel character or narrator role and can clear role binding or voice overrides.
- Updated project summaries to show project type and comic page/panel metrics.
- Updated documentation to reflect the current local implementation instead of only the original design intent.

### Fixed

- Fixed stale generation state after segment merge by blocking merges for active jobs.
- Fixed background tasks from writing results back to removed or replaced merge targets.
- Fixed character auto-detection post-processing so names like `唐僧说` are normalized to `唐僧`.
