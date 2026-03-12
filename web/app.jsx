const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "ai-publisher-token";
const NAV_ITEMS = [
  { key: "projects", label: "專案" },
  { key: "text", label: "文本準備" },
  { key: "voices", label: "聲線設定" },
  { key: "characters", label: "角色設定" },
  { key: "comic-script", label: "漫畫腳本" },
  { key: "storyboard", label: "分鏡工作台" },
  { key: "panels", label: "畫格生成" },
  { key: "layout", label: "頁面排版" },
  { key: "comic", label: "漫畫設定" },
  { key: "video", label: "Video 設定" },
  { key: "generate", label: "生成任務" },
  { key: "review", label: "審核校對" },
  { key: "export", label: "匯出交付" },
  { key: "settings", label: "系統設定" },
];
const EXTERNAL_LLM_LINKS = [
  { key: "codex", label: "Codex", meta: "OpenAI", url: "https://openai.com/codex/" },
  { key: "gemini-cli", label: "Gemini CLI", meta: "Google", url: "https://google-gemini.github.io/gemini-cli/" },
  { key: "claude-code", label: "Claude Code", meta: "Anthropic", url: "https://docs.anthropic.com/en/docs/claude-code/quickstart" },
  { key: "chatgpt", label: "ChatGPT", meta: "OpenAI", url: "https://chatgpt.com/" },
  { key: "gemini", label: "Gemini", meta: "Google", url: "https://gemini.google.com/" },
  { key: "claude", label: "Claude", meta: "Anthropic", url: "https://claude.ai/" },
  { key: "jimeng", label: "即夢 AI", meta: "字節", url: "https://jimeng.jianying.com/" },
  { key: "midjourney", label: "Midjourney", meta: "Image", url: "https://www.midjourney.com/" },
  { key: "runway", label: "Runway", meta: "Video", url: "https://runwayml.com/" },
  { key: "pika", label: "Pika", meta: "Video", url: "https://pika.art/" },
  { key: "deepseek", label: "DeepSeek", meta: "LLM", url: "https://www.deepseek.com/en/" },
  { key: "grok", label: "Grok", meta: "xAI", url: "https://x.ai/grok/" },
  { key: "perplexity", label: "Perplexity", meta: "Search", url: "https://www.perplexity.ai/" },
];
const STATUS_LABELS = {
  draft: "草稿",
  active: "進行中",
  ready: "待生成",
  queued: "已排隊",
  generating: "生成中",
  review_required: "待審核",
  approved: "已通過",
  rejected: "已退回",
  rendered: "已渲染",
  pending: "待處理",
  running: "執行中",
  succeeded: "已完成",
  failed: "失敗",
  open: "未處理",
  resolved: "已解決",
};
const PROJECT_TYPE_LABELS = {
  audiobook: "有聲書",
  comic: "漫畫",
  motion_comic: "動態漫畫",
  video: "影片",
};
const JOB_TYPE_LABELS = {
  generate_segment: "生成段落",
};
const ISSUE_TYPE_LABELS = {
  manual_review: "人工複核",
  pronunciation: "發音問題",
  pacing: "節奏問題",
  missing_words: "漏讀",
  duration: "時長異常",
};
const SOURCE_KIND_LABELS = {
  generated: "系統生成",
  edited: "人工編輯",
  uploaded: "人工上傳",
};
const OPENAI_VOICE_FALLBACKS = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"];
const OPENAI_MODEL_FALLBACKS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"];
const ELEVENLABS_MODEL_FALLBACKS = ["eleven_multilingual_v2", "eleven_v3", "eleven_flash_v2_5", "eleven_turbo_v2_5"];
const SEGMENT_PAGE_SIZES = [10, 20, 50];
const PROJECT_TYPE_OPTIONS = ["audiobook", "comic", "motion_comic", "video"];
const COMIC_LAYOUT_PRESETS = [
  { value: "splash", label: "Splash 全頁" },
  { value: "two-column", label: "雙欄分割" },
  { value: "three-stack", label: "三段堆疊" },
  { value: "four-grid", label: "四格網格" },
  { value: "freeform", label: "自由拼版" },
];
const COMIC_SHOT_TYPES = ["遠景", "全景", "中景", "近景", "特寫", "俯視", "仰視", "背影"];
const COMIC_CAMERA_ANGLES = ["平視", "低機位", "高機位", "Dutch angle", "過肩", "主觀鏡頭", "長焦壓縮", "廣角透視"];
const AUTO_REFRESH_ROUTES = new Set(["generate", "review", "export"]);
const COMIC_SETTINGS_DEFAULT = {
  enabled: false,
  script_model: "openai:gpt-4.1",
  storyboard_model: "google:gemini-2.0-flash",
  image_model: "openai:gpt-image-1",
  style_preset: "cinematic-ink",
  color_mode: "full-color",
  aspect_ratio: "4:5",
  character_consistency: "medium",
  negative_prompt: "",
};
const VIDEO_SETTINGS_DEFAULT = {
  enabled: false,
  script_model: "openai:gpt-4.1",
  shot_model: "google:gemini-2.0-flash",
  image_model: "openai:gpt-image-1",
  video_model: "runway:gen-3",
  subtitle_model: "openai:gpt-4.1-mini",
  aspect_ratio: "16:9",
  duration_seconds: 30,
  motion_style: "cinematic",
  negative_prompt: "",
};
const CHARACTER_PRESETS = {
  narrator: {
    label: "旁白",
    role_type: "narrator",
    display_title: "敘事者",
    archetype: "Narrator",
    summary: "穩定、清晰、可信任的敘述聲線。",
    personality: "沉著、客觀、節奏穩定，擅長交代場景與情緒轉場。",
    backstory: "作為整部作品的導引者，負責銜接章節與情緒。",
    catchphrase: "讓我帶你進入故事。",
    default_mood: "冷靜",
    warmth: 60,
    intensity: 35,
    humor: 25,
    mystery: 45,
    bravery: 55,
    discipline: 90,
  },
  hero: {
    label: "主角",
    role_type: "lead",
    display_title: "冒險主角",
    archetype: "Hero",
    summary: "有目標感、推動情節向前的核心人物。",
    personality: "直接、熱血、有責任感，情緒起伏明顯。",
    backstory: "承擔故事主要衝突與抉擇，是讀者情感投射中心。",
    catchphrase: "我來處理。",
    default_mood: "堅定",
    warmth: 65,
    intensity: 80,
    humor: 40,
    mystery: 30,
    bravery: 90,
    discipline: 70,
  },
  trickster: {
    label: "機靈派",
    role_type: "supporting",
    display_title: "機智角色",
    archetype: "Trickster",
    summary: "反應快、節奏活、帶有玩笑與靈氣。",
    personality: "聰明、調皮、善變，常打破僵局。",
    backstory: "用幽默與機智為故事帶來彈性與驚喜。",
    catchphrase: "這還不簡單？",
    default_mood: "興奮",
    warmth: 55,
    intensity: 75,
    humor: 90,
    mystery: 55,
    bravery: 70,
    discipline: 35,
  },
  mentor: {
    label: "導師",
    role_type: "supporting",
    display_title: "沉穩導師",
    archetype: "Mentor",
    summary: "穩重、有份量、帶有指引感的角色。",
    personality: "冷靜、克制、智慧，善於給方向與評估局勢。",
    backstory: "在關鍵時刻給主角提示與精神支撐。",
    catchphrase: "先看清局勢，再出手。",
    default_mood: "平靜",
    warmth: 70,
    intensity: 40,
    humor: 20,
    mystery: 65,
    bravery: 75,
    discipline: 95,
  },
  background: {
    label: "背景角色",
    role_type: "background",
    display_title: "場景群像",
    archetype: "Background",
    summary: "用來承接環境對白、群像反應與場景氛圍的輔助角色。",
    personality: "存在感不搶主角，但能補足世界真實感與場面層次。",
    backstory: "常用於路人、群眾、侍者、士兵、村民等背景角色聲線模板。",
    catchphrase: "收到。 / 大家快看。 / 這邊請。",
    default_mood: "自然",
    warmth: 45,
    intensity: 40,
    humor: 20,
    mystery: 25,
    bravery: 35,
    discipline: 60,
  },
};
const CHARACTER_ROLE_OPTIONS = ["narrator", "lead", "supporting", "background", "custom"];
const CHARACTER_ROLE_LABELS = {
  narrator: "旁白",
  lead: "主角",
  supporting: "配角",
  background: "背景",
  custom: "自訂",
};

function providerDefaults(provider, catalog = {}) {
  if (provider === "macos") {
    return {
      model: catalog.macos_tts_models?.[0] || "say",
      voice_name: catalog.macos_tts_voices?.[0] || "Tingting",
    };
  }
  if (provider === "openai") {
    return {
      model: catalog.openai_tts_models?.[0] || OPENAI_MODEL_FALLBACKS[0],
      voice_name: catalog.openai_tts_voices?.[0] || OPENAI_VOICE_FALLBACKS[0],
    };
  }
  if (provider === "elevenlabs") {
    return {
      model: catalog.elevenlabs_tts_models?.[0] || ELEVENLABS_MODEL_FALLBACKS[0],
      voice_name: "",
    };
  }
  return {
    model: "say",
    voice_name: "Tingting",
  };
}

function mergeModelSettings(defaults, value) {
  return { ...defaults, ...(value || {}) };
}

function modelSettingsDefaults(mode, providerInfo) {
  const fallback = mode === "comic" ? COMIC_SETTINGS_DEFAULT : VIDEO_SETTINGS_DEFAULT;
  const dynamicDefaults = mode === "comic" ? providerInfo?.defaults?.comic_settings : providerInfo?.defaults?.video_settings;
  return mergeModelSettings(fallback, dynamicDefaults);
}

async function apiFetch(path, { method = "GET", token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const options = { method, headers };
  if (formData) {
    options.body = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }
  if (!response.ok) {
    throw new Error(payload.detail || response.statusText || "請求失敗");
  }
  return payload;
}

function relativeTime(value) {
  if (!value) return "未提供";
  const date = new Date(value);
  return date.toLocaleString("zh-TW", { hour12: false });
}

function projectRouteTitle(route) {
  const item = NAV_ITEMS.find((entry) => entry.key === route);
  return item ? item.label : "專案列表";
}

function statusLabel(value) {
  return STATUS_LABELS[value] || value || "未提供";
}

function projectTypeLabel(value) {
  return PROJECT_TYPE_LABELS[value] || value || "未提供";
}

function jobTypeLabel(value) {
  return JOB_TYPE_LABELS[value] || value;
}

function issueTypeLabel(value) {
  return ISSUE_TYPE_LABELS[value] || value;
}

function sourceKindLabel(value) {
  return SOURCE_KIND_LABELS[value] || value;
}

function characterRoleLabel(value) {
  return CHARACTER_ROLE_LABELS[value] || value || "未分類";
}

function characterBindingSummary(character) {
  if (!character) return "未設定角色職稱";
  if (character.story_character_name) {
    return `綁定小說角色：${character.story_character_name}`;
  }
  return character.display_title || character.archetype || "未設定角色職稱";
}

function characterOptionLabel(character) {
  if (!character) return "";
  const primaryName = character.story_character_name
    ? `${character.story_character_name} (${character.name})`
    : character.name;
  return `${primaryName} · ${characterRoleLabel(character.role_type)} · ${character.voice_profile_name}`;
}

function defaultComicScriptForm(chapterId = "") {
  return {
    title: "",
    chapter_id: chapterId,
    premise: "",
    outline_text: "",
    script_text: "",
    target_page_count: 8,
    status: "draft",
  };
}

function comicScriptFormFromValue(script) {
  return {
    title: script?.title || "",
    chapter_id: script?.chapter_id || "",
    premise: script?.premise || "",
    outline_text: script?.outline_text || "",
    script_text: script?.script_text || "",
    target_page_count: script?.target_page_count || 8,
    status: script?.status || "draft",
  };
}

function defaultComicPageForm() {
  return {
    title: "",
    chapter_id: "",
    comic_script_id: "",
    page_no: "",
    layout_preset: COMIC_LAYOUT_PRESETS[1].value,
    summary: "",
    notes: "",
    status: "draft",
  };
}

function comicPageFormFromValue(page) {
  return {
    title: page?.title || "",
    chapter_id: page?.chapter_id || "",
    comic_script_id: page?.comic_script_id || "",
    page_no: page?.page_no || "",
    layout_preset: page?.layout_preset || COMIC_LAYOUT_PRESETS[1].value,
    summary: page?.summary || "",
    notes: page?.notes || "",
    status: page?.status || "draft",
  };
}

function comicPanelFormFromValue(panel) {
  return {
    title: panel?.title || "",
    panel_no: panel?.panel_no || "",
    script_text: panel?.script_text || "",
    dialogue_text: panel?.dialogue_text || "",
    caption_text: panel?.caption_text || "",
    sfx_text: panel?.sfx_text || "",
    shot_type: panel?.shot_type || "",
    camera_angle: panel?.camera_angle || "",
    composition_notes: panel?.composition_notes || "",
    character_ids: panel?.character_ids || [],
    prompt_text: panel?.prompt_text || "",
    negative_prompt: panel?.negative_prompt || "",
    image_status: panel?.image_status || "pending",
    layout_notes: panel?.layout_notes || "",
  };
}

function formatComicPageTitle(page) {
  if (!page) return "未選擇頁面";
  return `第 ${page.page_no} 頁${page.title ? ` · ${page.title}` : ""}`;
}

function flattenComicPanels(comicPages = []) {
  return comicPages.flatMap((page) => (page.panels || []).map((panel) => ({ ...panel, page })));
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [segments, setSegments] = useState([]);
  const [voices, setVoices] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [comicScripts, setComicScripts] = useState([]);
  const [comicPages, setComicPages] = useState([]);
  const [comicProfiles, setComicProfiles] = useState([]);
  const [videoProfiles, setVideoProfiles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [renders, setRenders] = useState([]);
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const selectedProject = projectDetail?.project || null;
  const selectedChapter = useMemo(
    () => selectedProject?.chapters?.find((chapter) => chapter.id === selectedChapterId) || null,
    [selectedProject, selectedChapterId]
  );
  function showFlash(type, message) {
    setFlash({ type, message });
    window.clearTimeout(showFlash.timeoutId);
    showFlash.timeoutId = window.setTimeout(() => setFlash(null), 3200);
  }

  function resetProjectContext() {
    setProjectDetail(null);
    setSelectedProjectId(null);
    setSelectedChapterId(null);
    setSegments([]);
    setVoices([]);
    setCharacters([]);
    setComicScripts([]);
    setComicPages([]);
    setComicProfiles([]);
    setVideoProfiles([]);
    setJobs([]);
    setReviewQueue([]);
    setRenders([]);
    setExportsList([]);
  }

  function requestConfirm(config) {
    setConfirmState({
      ...config,
      id: `${Date.now()}-${Math.random()}`,
    });
  }

  async function refreshProjects(preferredProjectId = undefined) {
    if (!token) return;
    const payload = await apiFetch("/api/projects", { token });
    const items = payload.items || [];
    setProjects(items);
    if (!items.length) {
      resetProjectContext();
      return;
    }
    const requestedId = preferredProjectId === undefined ? selectedProjectId : preferredProjectId;
    const resolvedId = requestedId && items.some((item) => item.id === requestedId) ? requestedId : items[0].id;
    if (resolvedId !== selectedProjectId) {
      setSelectedProjectId(resolvedId);
    }
  }

  async function loadProject(projectId, chapterId = null) {
    if (!projectId || !token) return;
    setLoading(true);
    try {
      const [projectPayload, voicePayload, characterPayload, comicScriptPayload, comicPagePayload, comicProfilePayload, videoPayload, jobsPayload, reviewPayload, exportPayload] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`, { token }),
        apiFetch(`/api/projects/${projectId}/voice-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/character-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/comic-scripts`, { token }),
        apiFetch(`/api/projects/${projectId}/comic-pages`, { token }),
        apiFetch(`/api/projects/${projectId}/comic-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/video-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/jobs`, { token }),
        apiFetch(`/api/projects/${projectId}/review-queue`, { token }),
        apiFetch(`/api/projects/${projectId}/exports`, { token }),
      ]);
      const project = projectPayload.project;
      setProjectDetail(projectPayload);
      setVoices(voicePayload.items || []);
      setCharacters(characterPayload.items || []);
      setComicScripts(comicScriptPayload.items || []);
      setComicPages(comicPagePayload.items || []);
      setComicProfiles(comicProfilePayload.items || []);
      setVideoProfiles(videoPayload.items || []);
      setJobs(jobsPayload.items || []);
      setReviewQueue(reviewPayload.items || []);
      setExportsList(exportPayload.items || []);
      const nextChapterId = chapterId || project?.chapters?.[0]?.id || null;
      setSelectedChapterId(nextChapterId);
      if (nextChapterId) {
        await loadChapter(nextChapterId);
      } else {
        setSegments([]);
        setRenders([]);
      }
    } catch (error) {
      showFlash("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProject({ projectId = selectedProjectId, chapterId = selectedChapterId } = {}) {
    if (projectId) {
      await loadProject(projectId, chapterId);
    } else {
      resetProjectContext();
    }
    await refreshProjects(projectId ?? null);
  }

  async function handleDeleteProject(project) {
    const wasSelected = project.id === selectedProjectId;
    const fallbackProjectId = wasSelected
      ? projects.find((item) => item.id !== project.id)?.id || null
      : selectedProjectId;

    await apiFetch(`/api/projects/${project.id}`, { method: "DELETE", token });

    if (fallbackProjectId) {
      await refreshProjects(fallbackProjectId);
      if (wasSelected) {
        await loadProject(fallbackProjectId);
        setRoute("projects");
      }
    } else {
      await refreshProjects(null);
      setRoute("projects");
    }

    showFlash("success", `專案「${project.title}」已刪除。`);
  }

  async function handleOpenChapterText(chapterId) {
    if (!chapterId) return;
    setSelectedChapterId(chapterId);
    await loadChapter(chapterId);
    setRoute("text");
  }

  async function handleOpenProjectText(projectId) {
    if (!projectId) return;
    setSelectedProjectId(projectId);
    await loadProject(projectId);
    setRoute("text");
  }

  async function loadChapter(chapterId) {
    if (!chapterId || !token) return;
    const [segmentsPayload, rendersPayload] = await Promise.all([
      apiFetch(`/api/chapters/${chapterId}/segments`, { token }),
      apiFetch(`/api/chapters/${chapterId}/renders`, { token }),
    ]);
    setSegments(segmentsPayload.items || []);
    setRenders(rendersPayload.items || []);
  }

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProjects([]);
      setProjectDetail(null);
      return;
    }
    (async () => {
      try {
        const mePayload = await apiFetch("/api/auth/me", { token });
        setUser(mePayload);
        await refreshProjects();
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setToken("");
        resetProjectContext();
      }
    })();
  }, [token]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!token || !selectedProjectId || !AUTO_REFRESH_ROUTES.has(route)) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      loadProject(selectedProjectId, selectedChapterId);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [token, selectedProjectId, selectedChapterId, route]);

  async function handleLogin(form) {
    const payload = await apiFetch("/api/auth/login", { method: "POST", body: form });
    localStorage.setItem(STORAGE_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setRoute("projects");
    showFlash("success", "登入成功，本機版 Studio 已就緒。");
  }

  async function handleLogout() {
    if (token) {
      try {
        await apiFetch("/api/auth/logout", { method: "POST", token });
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
  }

  async function handleRouteChange(nextRoute) {
    if (nextRoute === "projects") {
      setRoute("projects");
      return;
    }
    const fallbackProjectId = selectedProjectId || projects[0]?.id || null;
    try {
      if (fallbackProjectId) {
        if (!selectedProject || selectedProject.id !== fallbackProjectId) {
          await loadProject(fallbackProjectId, selectedChapterId);
        }
        if (fallbackProjectId !== selectedProjectId) {
          setSelectedProjectId(fallbackProjectId);
        }
      }
    } catch (error) {
      showFlash("error", error.message || "頁面切換時載入專案失敗。");
    }
    setRoute(nextRoute);
  }

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} flash={flash} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        route={route}
        onRouteChange={handleRouteChange}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main">
        <Topbar
          route={route}
          project={selectedProject}
          user={user}
          actions={routeActions({
            route,
            token,
            selectedProject,
            selectedChapter,
            segments,
            onCreated: async () => {
              await refreshProjects(selectedProjectId);
              if (selectedProjectId) await loadProject(selectedProjectId, selectedChapterId);
            },
            onImportDone: async () => {
              await loadProject(selectedProjectId);
              setRoute("text");
              showFlash("success", "文本匯入完成，章節與段落已建立。");
            },
            onGenerateDone: async () => {
              await loadProject(selectedProjectId, selectedChapterId);
              showFlash("success", "生成任務已送出。");
            },
            onRenderDone: async () => {
              await loadProject(selectedProjectId, selectedChapterId);
              showFlash("success", "章節渲染任務已建立。");
            },
            onExportDone: async () => {
              await loadProject(selectedProjectId, selectedChapterId);
              showFlash("success", "匯出任務已建立。");
            },
            requestConfirm,
            showFlash,
          })}
        />
        <div className="page-content">
          {flash ? <div className={`flash ${flash.type}`}>{flash.message}</div> : null}
          <PageContent
            route={route}
            projects={projects}
            token={token}
            project={selectedProject}
            projectDetail={projectDetail}
            selectedChapter={selectedChapter}
            selectedChapterId={selectedChapterId}
            setSelectedChapterId={async (id) => {
              setSelectedChapterId(id);
              await loadChapter(id);
            }}
            segments={segments}
            voices={voices}
            characters={characters}
            comicScripts={comicScripts}
            comicPages={comicPages}
            comicProfiles={comicProfiles}
            videoProfiles={videoProfiles}
            jobs={jobs}
            reviewQueue={reviewQueue}
            renders={renders}
            exportsList={exportsList}
            refreshProject={refreshProject}
            deleteProject={handleDeleteProject}
            onOpenChapter={handleOpenChapterText}
            onOpenProjectText={handleOpenProjectText}
            onSelectProject={setSelectedProjectId}
            requestConfirm={requestConfirm}
            showFlash={showFlash}
          />
        </div>
      </main>
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}

function routeActions({ route, selectedProject, selectedChapter, onCreated, onImportDone, onGenerateDone, onRenderDone, onExportDone, token, requestConfirm, showFlash }) {
  if (route === "text" && selectedProject) {
    return <ImportInline token={token} project={selectedProject} onDone={onImportDone} showFlash={showFlash} />;
  }
  if (route === "generate" && selectedChapter) {
    return (
      <>
        <button className="button" onClick={async () => {
          await apiFetch(`/api/chapters/${selectedChapter.id}/generate`, { method: "POST", token });
          onGenerateDone();
        }}>
          生成本章
        </button>
        <button
          className="button-secondary"
          onClick={async () => {
            if (!selectedProject?.default_voice_profile_id) {
              showFlash("error", "請先在聲線設定裡設定專案預設聲線。");
              return;
            }
            let preview;
            try {
              preview = await apiFetch(`/api/projects/${selectedProject.id}/generate-with-default-voice/preview`, { token });
            } catch (error) {
              showFlash("error", error.message || "無法取得生成預估。");
              return;
            }
            requestConfirm({
              title: "整個專案統一使用預設聲線",
              message: [
                `會覆蓋整個專案，共 ${preview.chapter_count} 個章節。`,
                `將提交 ${preview.queueable_segment_count} 段生成任務。`,
                `預設聲線：${preview.voice_profile?.name || "未命名聲線"} / ${preview.voice_profile?.provider || "未知"} / ${preview.voice_profile?.model || "未知模型"}。`,
                preview.cleared_override_count ? `會清除 ${preview.cleared_override_count} 個段落角色或聲線覆寫。` : "目前沒有段落角色或聲線覆寫。",
                preview.is_elevenlabs ? "目前使用 ElevenLabs。實際 credits 取決於總字符數與生成段數，長文本批量生成請留意額度。" : "",
              ].filter(Boolean).join(" "),
              confirmLabel: "清除全專案覆寫並生成",
              onConfirm: async () => {
                await apiFetch(`/api/projects/${selectedProject.id}/generate-with-default-voice`, { method: "POST", token });
                onGenerateDone();
              },
            });
          }}
        >
          生成全專案
        </button>
        <button
          className="button-secondary"
          onClick={async () => {
            if (!selectedProject?.default_voice_profile_id) {
              showFlash("error", "請先在聲線設定裡設定專案預設聲線。");
              return;
            }
            let preview;
            try {
              preview = await apiFetch(`/api/chapters/${selectedChapter.id}/generate-with-default-voice/preview`, { token });
            } catch (error) {
              showFlash("error", error.message || "無法取得生成預估。");
              return;
            }
            requestConfirm({
              title: "統一使用專案預設聲線",
              message: [
                `將提交 ${preview.queueable_segment_count} 段生成任務。`,
                `預設聲線：${preview.voice_profile?.name || "未命名聲線"} / ${preview.voice_profile?.provider || "未知"} / ${preview.voice_profile?.model || "未知模型"}。`,
                preview.cleared_override_count ? `會清除 ${preview.cleared_override_count} 個段落角色或聲線覆寫。` : "目前沒有段落角色或聲線覆寫。",
                preview.is_elevenlabs ? "目前使用 ElevenLabs。實際 credits 取決於總字符數與生成段數，長文本批量生成請留意額度。" : "",
              ].filter(Boolean).join(" "),
              confirmLabel: "清除覆寫並生成",
              onConfirm: async () => {
                await apiFetch(`/api/chapters/${selectedChapter.id}/generate-with-default-voice`, { method: "POST", token });
                onGenerateDone();
              },
            });
          }}
        >
          預設聲線批量生成
        </button>
      </>
    );
  }
  if (route === "export" && selectedChapter) {
    return (
      <>
        <button className="button-secondary" onClick={async () => {
          await apiFetch(`/api/chapters/${selectedChapter.id}/render`, { method: "POST", token });
          onRenderDone();
        }}>
          渲染本章
        </button>
        <button className="button" onClick={async () => {
          await apiFetch(`/api/projects/${selectedProject.id}/export`, { method: "POST", token });
          onExportDone();
        }}>
          匯出專案
        </button>
      </>
    );
  }
  return null;
}

function LoginPage({ onLogin, flash }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin({ email, password });
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-side">
          <div className="eyebrow">AI Publisher / Local Studio / FastAPI + SQLite</div>
          <h1>本機版<br/>Audiobook Studio</h1>
          <p>
            這是一個先跑通完整業務閉環的本機版原型。它包含登入、專案管理、文本匯入、章節拆分、
            本地 TTS 生成、審核與章節匯出。
          </p>
          <div className="login-meta">
            <div className="login-kpi">
              <div className="eyebrow">後端</div>
              <strong>FastAPI</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">資料庫</div>
              <strong>SQLite</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">語音</div>
              <strong>macOS say</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">範圍</div>
              <strong>MVP</strong>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>登入</h2>
              <div className="subtext">預設本地管理員帳號已建立。</div>
            </div>
            <span className="tag brand">網頁應用</span>
          </div>
          {flash ? <div className={`flash ${flash.type}`}>{flash.message}</div> : null}
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>電子郵件</label>
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label>密碼</label>
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <button className="button" disabled={submitting}>{submitting ? "登入中..." : "進入 Studio"}</button>
          </form>
          <div className="footer-note">
            預設帳號：<span className="code">admin@example.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, onRouteChange, projects, selectedProjectId, onSelectProject, user, onLogout }) {
  const [openSections, setOpenSections] = useState({
    project: true,
    audiobook: true,
    comic: true,
    system: false,
    llm: false,
  });

  const projectItem = NAV_ITEMS.find((item) => item.key === "projects");
  const audiobookNavItems = NAV_ITEMS.filter((item) => ["text", "voices", "characters", "generate", "review", "export"].includes(item.key));
  const comicNavItems = NAV_ITEMS.filter((item) => ["comic-script", "storyboard", "panels", "layout", "comic"].includes(item.key));
  const systemNavItems = NAV_ITEMS.filter((item) => ["video", "settings"].includes(item.key));

  function toggleSection(sectionKey) {
    setOpenSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }));
  }

  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-mark">AP</div>
        <div className="eyebrow">本機有聲書工作台</div>
        <div className="brand-title">AI Publisher</div>
      </div>

      <div className={`sidebar-section ${openSections.project ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("project")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">專案工作台</span>
            <span className="sidebar-hint">{selectedProjectId ? "已選專案" : "未選專案"}</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{projects.length} 項</span>
            <span className={`sidebar-chevron ${openSections.project ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.project ? (
          <div className="sidebar-section-body">
            {projectItem ? (
              <button className={`nav-button ${route === projectItem.key ? "active" : ""}`} onClick={() => onRouteChange(projectItem.key)}>
                <span>{projectItem.label}</span>
              </button>
            ) : null}
            <div className="project-pick">
              {projects.length === 0 ? <div className="muted">目前還沒有專案</div> : null}
              {projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  className={`project-button ${project.id === selectedProjectId ? "active" : ""}`}
                  onClick={() => {
                    onSelectProject(project.id);
                    onRouteChange("projects");
                  }}
                >
                  <div className="title-row">
                    <strong>{project.title}</strong>
                    <span className="count-pill">{project.metrics?.review_required_count || 0}</span>
                  </div>
                  <div className="subtext">{project.author || "未填作者"} · {projectTypeLabel(project.project_type)} · {project.language}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={`sidebar-section ${openSections.audiobook ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("audiobook")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">有聲書流程</span>
            <span className="sidebar-hint">文本、角色、聲線、生成與審核</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{audiobookNavItems.length} 項</span>
            <span className={`sidebar-chevron ${openSections.audiobook ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.audiobook ? (
          <div className="sidebar-section-body">
            {audiobookNavItems.map((item) => (
              <button key={item.key} className={`nav-button ${route === item.key ? "active" : ""}`} onClick={() => onRouteChange(item.key)}>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`sidebar-section ${openSections.comic ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("comic")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">漫畫流程</span>
            <span className="sidebar-hint">腳本、分鏡、畫格與排版</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{comicNavItems.length} 項</span>
            <span className={`sidebar-chevron ${openSections.comic ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.comic ? (
          <div className="sidebar-section-body">
            {comicNavItems.map((item) => (
              <button key={item.key} className={`nav-button ${route === item.key ? "active" : ""}`} onClick={() => onRouteChange(item.key)}>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`sidebar-section ${openSections.system ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("system")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">系統與擴展</span>
            <span className="sidebar-hint">模型模板與系統設定</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{systemNavItems.length} 項</span>
            <span className={`sidebar-chevron ${openSections.system ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.system ? (
          <div className="sidebar-section-body">
            {systemNavItems.map((item) => (
              <button key={item.key} className={`nav-button ${route === item.key ? "active" : ""}`} onClick={() => onRouteChange(item.key)}>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`sidebar-section ${openSections.llm ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("llm")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">外部 LLM</span>
            <span className="sidebar-hint">官方入口</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{EXTERNAL_LLM_LINKS.length} 項</span>
            <span className={`sidebar-chevron ${openSections.llm ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.llm ? (
          <div className="sidebar-section-body">
            {EXTERNAL_LLM_LINKS.map((item) => (
              <a
                key={item.key}
                className="nav-button nav-link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{item.label}</span>
                <span className="count-pill">{item.meta}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sidebar-foot">
        <div>{user.name} · {user.role}</div>
        <button className="button-secondary" onClick={onLogout}>登出</button>
      </div>
    </aside>
  );
}

function Topbar({ route, project, user, actions }) {
  return (
    <div className="topbar">
      <div>
        <div className="eyebrow">
          {project ? `${project.title} / ${project.language}` : "AI Publisher / 本機 MVP"}
        </div>
        <h1>{projectRouteTitle(route)}</h1>
        <div className="subtext">
          {project ? `目前專案：${project.title}，登入使用者：${user.name}` : "請先建立專案並匯入文本。"}
        </div>
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}

function PageContent(props) {
  const {
    route,
    projects,
    token,
    project,
    projectDetail,
    selectedChapter,
    selectedChapterId,
    setSelectedChapterId,
    segments,
    voices,
    characters,
    comicScripts,
    comicPages,
    comicProfiles,
    videoProfiles,
    jobs,
    reviewQueue,
    renders,
    exportsList,
    refreshProject,
    deleteProject,
    onOpenChapter,
    onOpenProjectText,
    onSelectProject,
    showFlash,
    requestConfirm,
  } = props;

  if (route === "projects") {
    return <ProjectsPage projects={projects} selectedProject={project} token={token} refreshProject={refreshProject} deleteProject={deleteProject} onSelectProject={onSelectProject} onOpenChapter={onOpenChapter} onOpenProjectText={onOpenProjectText} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "text") {
    return <TextPrepPage token={token} project={project} selectedChapter={selectedChapter} selectedChapterId={selectedChapterId} setSelectedChapterId={setSelectedChapterId} segments={segments} voices={voices} characters={characters} jobs={jobs} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "voices") {
    return <VoiceSetupPage token={token} project={project} voices={voices} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "characters") {
    return <CharacterSetupPage token={token} project={project} voices={voices} characters={characters} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "comic-script") {
    return <ComicScriptPage token={token} project={project} comicScripts={comicScripts} chapters={project?.chapters || []} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "storyboard") {
    return <ComicStoryboardPage token={token} project={project} comicScripts={comicScripts} comicPages={comicPages} chapters={project?.chapters || []} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "panels") {
    return <ComicPanelsPage token={token} project={project} comicPages={comicPages} characters={characters} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "layout") {
    return <ComicLayoutPage token={token} project={project} comicPages={comicPages} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "comic") {
    return <ComicSettingsPage token={token} project={project} comicProfiles={comicProfiles} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "video") {
    return <VideoSettingsPage token={token} project={project} videoProfiles={videoProfiles} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "generate") {
    return <GeneratePage token={token} project={project} selectedChapter={selectedChapter} selectedChapterId={selectedChapterId} setSelectedChapterId={setSelectedChapterId} voices={voices} segments={segments} jobs={jobs} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "review") {
    return <ReviewPage token={token} project={project} reviewQueue={reviewQueue} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "export") {
    return <ExportPage token={token} project={project} selectedChapter={selectedChapter} selectedChapterId={selectedChapterId} setSelectedChapterId={setSelectedChapterId} renders={renders} exportsList={exportsList} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "settings") {
    return <SettingsPage token={token} project={project} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  return null;
}

function ProjectsPage({ projects = [], selectedProject, token, refreshProject, deleteProject, onSelectProject, onOpenChapter, onOpenProjectText, requestConfirm, showFlash }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <div className="grid projects-hub">
        <div className="grid">
          <div className="panel-head">
            <div>
              <h2>專案列表</h2>
              <div className="subtext">在同一頁面完成專案切換、摘要查看與章節入口。</div>
            </div>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button className="button" onClick={() => setShowCreateModal(true)}>建立專案</button>
              <span className="tag brand">{projects.length} 個專案</span>
            </div>
          </div>
          <section className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>專案</th>
                  <th>語言</th>
                  <th>章節數</th>
                  <th>待審核</th>
                  <th>失敗任務</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <button className="text-action" onClick={() => onSelectProject(project.id)}>
                        {project.title}
                      </button>
                      <div className="subtext">{project.author || "未填作者"} · {projectTypeLabel(project.project_type)}</div>
                    </td>
                    <td>{project.language}</td>
                    <td>{project.metrics?.chapter_count || 0}</td>
                    <td>{project.metrics?.review_required_count || 0}</td>
                    <td>{project.metrics?.failed_jobs || 0}</td>
                    <td>
                      <div className="toolbar" style={{ marginBottom: 0 }}>
                        <button
                          className="button-secondary"
                          onClick={async () => {
                            await onOpenProjectText(project.id);
                          }}
                        >
                          文本準備
                        </button>
                        <button
                          className="button-danger"
                          onClick={() => requestConfirm({
                            title: "刪除專案",
                            message: `將永久刪除「${project.title}」以及底下所有章節、段落、音訊、渲染與匯出檔。此動作無法復原。`,
                            confirmLabel: "刪除專案",
                            onConfirm: async () => {
                              await deleteProject(project);
                            },
                          })}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="grid">
          {selectedProject ? (
            <div className="grid">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>{selectedProject.title}</h2>
                    <div className="subtext">{selectedProject.author || "未填作者"} · {selectedProject.language}</div>
                  </div>
                  <span className="tag brand">{statusLabel(selectedProject.status)}</span>
                </div>
                <div className="metrics">
                  <div className="metric">
                    <div className="eyebrow">章節</div>
                    <strong>{selectedProject.metrics?.chapter_count || 0}</strong>
                  </div>
                  <div className="metric">
                    <div className="eyebrow">段落</div>
                    <strong>{selectedProject.metrics?.segment_count || 0}</strong>
                  </div>
                  <div className="metric">
                    <div className="eyebrow">已通過</div>
                    <strong>{selectedProject.metrics?.approved_count || 0}</strong>
                  </div>
                  <div className="metric">
                    <div className="eyebrow">待審核</div>
                    <strong>{selectedProject.metrics?.review_required_count || 0}</strong>
                  </div>
                  <div className="metric">
                    <div className="eyebrow">漫畫頁</div>
                    <strong>{selectedProject.metrics?.comic_page_count || 0}</strong>
                  </div>
                  <div className="metric">
                    <div className="eyebrow">畫格</div>
                    <strong>{selectedProject.metrics?.comic_panel_count || 0}</strong>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>章節地圖</h2>
                    <div className="subtext">直接進入文本準備，不再切換到另一個總覽頁。</div>
                  </div>
                </div>
                <div className="list">
                  {(selectedProject.chapters || []).map((chapter) => (
                    <div key={chapter.id} className="list-item">
                      <div className="title-row">
                        <strong>{chapter.order_index}. {chapter.title}</strong>
                        <button className="button-secondary" onClick={() => onOpenChapter(chapter.id)}>文本準備</button>
                      </div>
                      <div className="pill-row" style={{ marginTop: 10 }}>
                        <span className="tag">{chapter.segment_count} 段</span>
                        <span className="tag success">{chapter.approved_count} 已通過</span>
                        <span className="tag warn">{chapter.review_count} 待審核</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="empty-state">先建立或選取一個專案，右側就會顯示專案摘要與章節地圖。</div>
          )}
        </div>
      </div>
      <ProjectCreateModal
        open={showCreateModal}
        token={token}
        onClose={() => setShowCreateModal(false)}
        onCreated={async (createdProject) => {
          await refreshProject({ projectId: createdProject.id });
          setShowCreateModal(false);
        }}
        showFlash={showFlash}
      />
    </>
  );
}

function TextPrepPage({ token, project, selectedChapter, selectedChapterId, setSelectedChapterId, segments, voices, characters, jobs, refreshProject, requestConfirm, showFlash }) {
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [segmentBusyAction, setSegmentBusyAction] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [detectionBusy, setDetectionBusy] = useState(false);
  const [autoBindBusy, setAutoBindBusy] = useState(false);
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) || segments[0] || null;
  const [draftText, setDraftText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [batchCharacterId, setBatchCharacterId] = useState("");
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [detectionSummary, setDetectionSummary] = useState(null);
  const [autoBindVoiceId, setAutoBindVoiceId] = useState("");
  const [autoBindNarratorId, setAutoBindNarratorId] = useState("");
  const [segmentPage, setSegmentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const narratorCharacters = useMemo(() => characters.filter((character) => character.role_type === "narrator"), [characters]);

  const totalSegmentPages = Math.max(1, Math.ceil(segments.length / pageSize));
  const currentSegmentJob = activeSegment ? jobs.find((job) => job.segment_id === activeSegment.id) || null : null;
  const isSegmentFormDirty = Boolean(
    activeSegment
    && (
      draftText !== (activeSegment.tts_text || "")
      || String(voiceId || "") !== String(activeSegment.voice_profile_id || "")
      || String(characterId || "") !== String(activeSegment.character_profile_id || "")
    )
  );
  const pagedSegments = useMemo(() => {
    const start = (segmentPage - 1) * pageSize;
    return segments.slice(start, start + pageSize);
  }, [segments, segmentPage, pageSize]);

  useEffect(() => {
    if (activeSegment) {
      setActiveSegmentId(activeSegment.id);
      setDraftText(activeSegment.tts_text || "");
      setVoiceId(activeSegment.voice_profile_id || "");
      setCharacterId(activeSegment.character_profile_id || "");
    }
  }, [selectedChapterId, segments.length]);

  useEffect(() => {
    if (activeSegment) {
      setDraftText(activeSegment.tts_text || "");
      setVoiceId(activeSegment.voice_profile_id || "");
      setCharacterId(activeSegment.character_profile_id || "");
    }
  }, [activeSegment]);

  useEffect(() => {
    setSegmentPage(1);
    setSelectedSegmentIds([]);
    setBatchCharacterId("");
    setDetectedCharacters([]);
    setDetectionSummary(null);
  }, [selectedChapterId]);

  useEffect(() => {
    if (autoBindVoiceId) return;
    if (project?.default_voice_profile_id) {
      setAutoBindVoiceId(String(project.default_voice_profile_id));
      return;
    }
    if (voices[0]) {
      setAutoBindVoiceId(String(voices[0].id));
    }
  }, [autoBindVoiceId, project?.default_voice_profile_id, voices]);

  useEffect(() => {
    if (autoBindNarratorId) return;
    if (narratorCharacters[0]) {
      setAutoBindNarratorId(String(narratorCharacters[0].id));
    }
  }, [autoBindNarratorId, narratorCharacters]);

  useEffect(() => {
    if (segmentPage > totalSegmentPages) {
      setSegmentPage(totalSegmentPages);
    }
  }, [segmentPage, totalSegmentPages]);

  useEffect(() => {
    if (!activeSegment) return;
    const index = segments.findIndex((segment) => segment.id === activeSegment.id);
    if (index < 0) return;
    const nextPage = Math.floor(index / pageSize) + 1;
    if (nextPage !== segmentPage) {
      setSegmentPage(nextPage);
    }
  }, [activeSegment?.id, pageSize, segmentPage, segments]);

  useEffect(() => {
    if (!selectedChapterId || !activeSegment || isSegmentFormDirty) {
      return undefined;
    }
    const hasActiveJob = currentSegmentJob && ["pending", "running"].includes(currentSegmentJob.status);
    const hasGeneratingStatus = activeSegment.status === "generating";
    if (!hasActiveJob && !hasGeneratingStatus) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      refreshProject({ chapterId: selectedChapterId });
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [
    activeSegment?.id,
    activeSegment?.status,
    currentSegmentJob?.id,
    currentSegmentJob?.status,
    isSegmentFormDirty,
    refreshProject,
    selectedChapterId,
  ]);

  function goToSegmentPage(nextPage) {
    const targetPage = Math.max(1, Math.min(totalSegmentPages, nextPage));
    const start = (targetPage - 1) * pageSize;
    const nextSegment = segments[start] || null;
    setSegmentPage(targetPage);
    if (nextSegment) {
      setActiveSegmentId(nextSegment.id);
    }
  }

  function toggleSegmentSelection(segmentId) {
    setSelectedSegmentIds((current) => (
      current.includes(segmentId)
        ? current.filter((item) => item !== segmentId)
        : [...current, segmentId]
    ));
  }

  function toggleCurrentPageSelection() {
    const pageIds = pagedSegments.map((segment) => segment.id);
    const allSelected = pageIds.every((id) => selectedSegmentIds.includes(id));
    if (allSelected) {
      setSelectedSegmentIds((current) => current.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedSegmentIds((current) => Array.from(new Set([...current, ...pageIds])));
    }
  }

  async function applyBatchToSelection() {
    if (!selectedSegmentIds.length) {
      showFlash("error", "請先勾選要批量指派的段落。");
      return;
    }
    await apiFetch("/api/segments/batch-assign-character", {
      method: "POST",
      token,
      body: {
        segment_ids: selectedSegmentIds,
        character_profile_id: batchCharacterId || null,
      },
    });
    await refreshProject({ chapterId: selectedChapterId });
    showFlash("success", "已更新所選段落的角色指派。");
  }

  async function applyBatchToChapter() {
    if (!selectedChapterId) return;
    await apiFetch(`/api/chapters/${selectedChapterId}/assign-character`, {
      method: "POST",
      token,
      body: {
        character_profile_id: batchCharacterId || null,
      },
    });
    await refreshProject({ chapterId: selectedChapterId });
    showFlash("success", "已更新整章段落的角色指派。");
  }

  function requestMergeSelectedSegments() {
    if (selectedSegmentIds.length < 2) {
      showFlash("error", "請先勾選至少 2 個連續段落，再進行合併。");
      return;
    }
    const activeSelectedJobs = jobs.filter((job) => selectedSegmentIds.includes(job.segment_id) && ["pending", "running"].includes(job.status));
    if (activeSelectedJobs.length) {
      showFlash("error", "勾選的段落仍有生成任務執行中，請先等待完成或刷新狀態後再合併。");
      return;
    }
    requestConfirm({
      title: "合併段落",
      message: `會把目前勾選的 ${selectedSegmentIds.length} 個段落合併成 1 個段落，原有音訊、任務與審核記錄會一併清空。`,
      confirmLabel: "合併為一段",
      onConfirm: async () => {
        try {
          const payload = await apiFetch("/api/segments/merge", {
            method: "POST",
            token,
            body: { segment_ids: selectedSegmentIds },
          });
          setSelectedSegmentIds([]);
          setActiveSegmentId(payload.merged_segment_id);
          await refreshProject({ chapterId: selectedChapterId });
          showFlash("success", `已合併為段落 ${payload.segment.order_index}。`);
        } catch (error) {
          showFlash("error", error.message || "合併段落失敗。");
          throw error;
        }
      },
    });
  }

  async function persistActiveSegment() {
    if (!activeSegment) return;
    return apiFetch(`/api/segments/${activeSegment.id}`, {
      method: "PATCH",
      token,
      body: {
        tts_text: draftText,
        voice_profile_id: voiceId || null,
        character_profile_id: characterId || null,
        status: "ready",
      },
    });
  }

  async function saveSegment() {
    if (!activeSegment) return;
    setSegmentBusyAction("save");
    try {
      await persistActiveSegment();
      await refreshProject({ chapterId: selectedChapterId });
      showFlash("success", "段落已儲存。");
    } catch (error) {
      showFlash("error", error.message || "段落儲存失敗。");
    } finally {
      setSegmentBusyAction("");
    }
  }

  async function generateCurrentSegment() {
    if (!activeSegment) return;
    setSegmentBusyAction("generate");
    try {
      await persistActiveSegment();
      await apiFetch(`/api/segments/${activeSegment.id}/generate`, { method: "POST", token });
      await refreshProject({ chapterId: selectedChapterId });
      showFlash("success", "已為目前段落建立生成任務。");
    } catch (error) {
      showFlash("error", error.message || "段落生成失敗。");
    } finally {
      setSegmentBusyAction("");
    }
  }

  async function updateDefaultVoice(nextVoiceId) {
    if (!project) return;
    setVoiceBusy(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        token,
        body: {
          default_voice_profile_id: nextVoiceId ? Number(nextVoiceId) : null,
        },
      });
      await refreshProject({ projectId: project.id, chapterId: selectedChapterId || project.chapters?.[0]?.id || null });
      showFlash("success", "專案預設聲線已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新專案預設聲線失敗。");
    } finally {
      setVoiceBusy(false);
    }
  }

  function requestDeleteSegment(segment) {
    const nextSegmentId = segments.find((item) => item.id !== segment.id)?.id || null;
    requestConfirm({
      title: "刪除段落",
      message: `將刪除段落 ${segment.order_index} 的文字、音訊 take 與相關問題記錄。此動作無法復原。`,
      confirmLabel: "刪除段落",
      onConfirm: async () => {
        await apiFetch(`/api/segments/${segment.id}`, { method: "DELETE", token });
        setActiveSegmentId(nextSegmentId);
        if (!nextSegmentId) {
          setDraftText("");
          setVoiceId("");
        }
        await refreshProject({ chapterId: selectedChapterId });
        showFlash("success", `段落 ${segment.order_index} 已刪除。`);
      },
    });
  }

  async function detectChapterCharacters() {
    if (!selectedChapterId) return;
    setDetectionBusy(true);
    try {
      const payload = await apiFetch(`/api/chapters/${selectedChapterId}/character-detection`, { token });
      setDetectedCharacters(payload.items || []);
      setDetectionSummary(payload);
      if ((payload.items || []).length) {
        showFlash("success", `已識別 ${payload.items.length} 個人物線索，覆蓋 ${payload.detected_segment_count || 0} 段。`);
      } else {
        showFlash("success", "本章暫未識別出明確人物，可繼續手動綁定。");
      }
    } catch (error) {
      showFlash("error", error.message || "人物識別失敗。");
    } finally {
      setDetectionBusy(false);
    }
  }

  async function autoBindChapterCharacters() {
    if (!selectedChapterId) return;
    setAutoBindBusy(true);
    try {
      const payload = await apiFetch(`/api/chapters/${selectedChapterId}/auto-bind-characters`, {
        method: "POST",
        token,
        body: {
          fallback_voice_profile_id: autoBindVoiceId ? Number(autoBindVoiceId) : null,
          narrator_character_profile_id: autoBindNarratorId ? Number(autoBindNarratorId) : null,
          assign_unmatched_to_narrator: Boolean(autoBindNarratorId),
        },
      });
      await refreshProject({ projectId: project.id, chapterId: selectedChapterId });
      setDetectedCharacters([]);
      setDetectionSummary(null);
      const summaryParts = [];
      if (payload.created_character_count) {
        summaryParts.push(`新建 ${payload.created_character_count} 個角色`);
      }
      if (payload.bound_segment_count) {
        summaryParts.push(`綁定 ${payload.bound_segment_count} 段對話`);
      }
      if (payload.narrator_bound_segment_count) {
        summaryParts.push(`補綁 ${payload.narrator_bound_segment_count} 段旁白`);
      }
      showFlash("success", summaryParts.length ? `自動綁定完成：${summaryParts.join("，")}。` : "本章沒有可自動綁定的人物。");
    } catch (error) {
      showFlash("error", error.message || "自動綁定失敗。");
    } finally {
      setAutoBindBusy(false);
    }
  }

  if (!project) {
    return <div className="empty-state">請先在專案頁選取一個專案，再進入文本準備。</div>;
  }

  return (
    <div className="grid text-prep">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>章節</h3>
            <div className="subtext">匯入後自動拆章拆段。</div>
          </div>
        </div>
        <div className="list">
          {(project.chapters || []).map((chapter) => (
            <button key={chapter.id} className={`project-button ${chapter.id === selectedChapterId ? "active" : ""}`} onClick={() => setSelectedChapterId(chapter.id)}>
              <strong>{chapter.order_index}. {chapter.title}</strong>
              <div className="subtext">{chapter.segment_count} 段</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{selectedChapter?.title || "尚未選擇章節"}</h3>
            <div className="subtext">左側選段，右側儲存可朗讀稿。</div>
          </div>
        </div>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            專案預設聲線
            <select
              className="select"
              disabled={voiceBusy || !voices.length}
              value={project?.default_voice_profile_id ? String(project.default_voice_profile_id) : ""}
              onChange={(event) => updateDefaultVoice(event.target.value)}
            >
              {!voices.length ? <option value="">尚無可用聲線</option> : null}
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} / {voice.provider} / {voice.model}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="editor-card" style={{ marginBottom: 12 }}>
          <div className="title-row">
            <div>
              <div className="eyebrow">人物識別</div>
              <strong>自動識別小說人物並批量綁定聲線</strong>
            </div>
            {detectionSummary ? <span className="tag brand">{detectedCharacters.length} 人</span> : null}
          </div>
          <div className="subtext" style={{ marginTop: 8 }}>
            會根據「張三說」「旁白：」「……，李四問道」這類文本線索做本章識別；已存在角色會優先復用，沒有匹配時會用下方聲線自動建立角色。
          </div>
          <div className="grid two compact-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label>新角色預設聲線</label>
              <select className="select" value={autoBindVoiceId} onChange={(event) => setAutoBindVoiceId(event.target.value)}>
                <option value="">使用專案預設聲線</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>{voice.name} · {voice.voice_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>未識別段落綁定到</label>
              <select className="select" value={autoBindNarratorId} onChange={(event) => setAutoBindNarratorId(event.target.value)}>
                <option value="">不自動補綁旁白</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>{characterOptionLabel(character)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="toolbar">
            <button className="button-secondary" disabled={detectionBusy || !selectedChapterId} onClick={detectChapterCharacters}>
              {detectionBusy ? "分析中..." : "分析本章人物"}
            </button>
            <button className="button" disabled={autoBindBusy || !selectedChapterId} onClick={autoBindChapterCharacters}>
              {autoBindBusy ? "綁定中..." : "自動建立並綁定"}
            </button>
          </div>
          {detectionSummary ? (
            <div className="pill-row" style={{ marginTop: 10 }}>
              <span className="tag">{detectionSummary.detected_segment_count || 0} 段識別到人物</span>
              <span className="tag">{detectionSummary.unmatched_segment_count || 0} 段未識別</span>
              <span className="tag">{detectionSummary.segment_count || 0} 段總計</span>
            </div>
          ) : null}
          <div className="list" style={{ marginTop: 12 }}>
            {detectedCharacters.map((item) => (
              <div key={item.speaker_name} className="list-item">
                <div className="title-row">
                  <strong>{item.speaker_name}</strong>
                  <div className="pill-row">
                    <span className="tag">{characterRoleLabel(item.role_type)}</span>
                    <span className="tag">{item.segment_count} 段</span>
                    {item.matched_character_profile_id ? (
                      <span className="tag success">復用 {item.matched_story_character_name || item.matched_character_name}</span>
                    ) : (
                      <span className="tag brand">將自動建立</span>
                    )}
                  </div>
                </div>
                <div className="subtext" style={{ marginTop: 8 }}>{item.sample_text}</div>
              </div>
            ))}
            {!detectedCharacters.length ? (
              <div className="empty-state">點「分析本章人物」後，這裡會顯示可批量綁定的角色線索與匹配結果。</div>
            ) : null}
          </div>
        </div>
        {!selectedChapter ? (
          <div className="empty-state">請先匯入文本，再選擇章節。</div>
        ) : (
          <div className="split-layout">
            <div className="list">
              <div className="pager-row">
                <div className="subtext">
                  共 {segments.length} 段，第 {segmentPage} / {totalSegmentPages} 頁
                </div>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <select className="select pager-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    {SEGMENT_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>每頁 {size} 段</option>
                    ))}
                  </select>
                  <button className="button-secondary" disabled={segmentPage <= 1} onClick={() => goToSegmentPage(segmentPage - 1)}>
                    上一頁
                  </button>
                  <button className="button-secondary" disabled={segmentPage >= totalSegmentPages} onClick={() => goToSegmentPage(segmentPage + 1)}>
                    下一頁
                  </button>
                </div>
              </div>
              <div className="toolbar">
                <select className="select" value={batchCharacterId} onChange={(event) => setBatchCharacterId(event.target.value)}>
                  <option value="">解除角色綁定 / 使用預設</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>{characterOptionLabel(character)}</option>
                  ))}
                </select>
                <button className="button-secondary" onClick={toggleCurrentPageSelection}>
                  {pagedSegments.every((segment) => selectedSegmentIds.includes(segment.id)) ? "取消本頁全選" : "全選本頁"}
                </button>
                <button className="button-secondary" onClick={applyBatchToSelection}>套用到勾選段落</button>
                <button className="button-secondary" onClick={applyBatchToChapter}>套用到整章</button>
                <button className="button-secondary" disabled={selectedSegmentIds.length < 2} onClick={requestMergeSelectedSegments}>合併為一段</button>
              </div>
              {pagedSegments.map((segment) => (
                <div key={segment.id} className={`list-item ${activeSegment?.id === segment.id ? "active" : ""}`}>
                  <div className="title-row">
                    <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={selectedSegmentIds.includes(segment.id)} onChange={() => toggleSegmentSelection(segment.id)} />
                      <strong>段落 {segment.order_index}</strong>
                    </label>
                    <div className="pill-row">
                      {segment.character_profile?.name ? <span className="tag brand">{segment.character_profile.story_character_name || segment.character_profile.name}</span> : null}
                      {segment.character_profile?.role_type ? <span className="tag">{characterRoleLabel(segment.character_profile.role_type)}</span> : null}
                      <span className="tag">{statusLabel(segment.status)}</span>
                    </div>
                  </div>
                  <button className={`project-button ${activeSegment?.id === segment.id ? "active" : ""}`} onClick={() => setActiveSegmentId(segment.id)}>
                    <div className="subtext">{segment.source_text.slice(0, 56)}...</div>
                  </button>
                </div>
              ))}
              {!pagedSegments.length ? <div className="empty-state">目前章節沒有段落。</div> : null}
            </div>

            <div className="form-grid">
              {activeSegment ? (
                <>
                  <div className="title-row">
                    <strong>目前段落 {activeSegment.order_index}</strong>
                    <span className="tag">{statusLabel(activeSegment.status)}</span>
                  </div>
                  <div className="editor-card">
                    <div className="eyebrow">原文</div>
                    <div>{activeSegment.source_text}</div>
                  </div>
                  <div className="field">
                    <label>朗讀稿</label>
                    <textarea className="textarea" value={draftText} onChange={(event) => setDraftText(event.target.value)} />
                  </div>
                  <div className="field">
                    <label>小說角色 / 旁白角色</label>
                    <select className="select" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                      <option value="">不綁定角色</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>{characterOptionLabel(character)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>覆寫聲線</label>
                    <select className="select" value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
                      <option value="">依角色 / 專案預設</option>
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.name} · {voice.voice_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="toolbar" style={{ marginTop: -4 }}>
                    <button type="button" className="button-secondary" onClick={() => setCharacterId("")}>解除角色綁定</button>
                    <button type="button" className="button-secondary" onClick={() => setVoiceId("")}>解除聲線覆寫</button>
                  </div>
                  <div className="toolbar">
                    <button className="button-flat" disabled={segmentBusyAction !== ""} onClick={saveSegment}>
                      {segmentBusyAction === "save" ? "儲存中..." : "儲存"}
                    </button>
                    <button className="button-flat" disabled={segmentBusyAction !== ""} onClick={generateCurrentSegment}>
                      {segmentBusyAction === "generate" ? "生成中..." : "生成"}
                    </button>
                    <button className="button-flat-danger" disabled={segmentBusyAction !== ""} onClick={() => requestDeleteSegment(activeSegment)}>
                      刪除
                    </button>
                  </div>
                  <div className="editor-card">
                    <div className="title-row">
                      <strong>目前生成狀態</strong>
                      <span className={`tag ${currentSegmentJob?.status === "failed" ? "danger" : currentSegmentJob?.status === "succeeded" ? "success" : currentSegmentJob?.status === "running" ? "brand" : ""}`}>
                        {statusLabel(currentSegmentJob?.status || activeSegment.status)}
                      </span>
                    </div>
                    <div className="subtext" style={{ marginTop: 8 }}>
                      {currentSegmentJob
                        ? `最近任務更新：${relativeTime(currentSegmentJob.updated_at)}`
                        : "這裡會顯示目前段落最新一次生成任務。"}
                    </div>
                    {currentSegmentJob?.request_id ? (
                      <div className="code" style={{ marginTop: 8 }}>
                        Request ID: {currentSegmentJob.request_id}
                      </div>
                    ) : null}
                    {currentSegmentJob?.error_message ? (
                      <div className="subtext" style={{ marginTop: 8, color: "var(--danger)" }}>
                        {currentSegmentJob.error_message}
                      </div>
                    ) : null}
                    {activeSegment.latest_take?.file_url ? (
                      <>
                        <div className="subtext" style={{ marginTop: 10 }}>
                          已生成音訊版本 v{activeSegment.latest_take.version_no}
                        </div>
                        <audio className="review-audio" controls src={activeSegment.latest_take.file_url}></audio>
                      </>
                    ) : (
                      <div className="subtext" style={{ marginTop: 10 }}>
                        {currentSegmentJob
                          ? "任務已建立，音訊生成後會直接出現在這裡。"
                          : "尚未生成音訊。點「生成」後，這裡會出現任務狀態與播放器。"}
                      </div>
                    )}
                  </div>
                  <details className="tips-card">
                    <summary>準備提示</summary>
                    <div className="tips-list">
                      <div className="list-item">
                        <strong>這一區是做什麼的</strong>
                        <div className="subtext">只是整理文字前的操作提醒，幫你快速判斷哪些段落要先改 `tts_text` 再生成。</div>
                      </div>
                      <div className="list-item">
                        <strong>建議保持段落長度適中</strong>
                        <div className="subtext">過長段落更容易在審核階段被標記節奏問題。</div>
                      </div>
                      <div className="list-item">
                        <strong>含數字與英文縮寫時請手動複核</strong>
                        <div className="subtext">本機版 QC 會對數字內容自動加註提示。</div>
                      </div>
                      <div className="list-item">
                        <strong>本機 TTS 使用 macOS say</strong>
                        <div className="subtext">先跑通流程，後續再接 ElevenLabs / OpenAI。</div>
                      </div>
                    </div>
                  </details>
                </>
              ) : (
                <div className="empty-state">目前章節沒有段落。</div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function VoiceSetupPage({ token, project, voices, refreshProject, showFlash }) {
  const [providerInfo, setProviderInfo] = useState(null);
  const [form, setForm] = useState({
    name: "",
    provider: "macos",
    model: "say",
    voice_name: "Tingting",
    speed: 1.0,
    style: "",
    instructions: "",
    is_default: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const payload = await apiFetch("/api/system/providers", { token });
        setProviderInfo(payload);
      } catch (error) {
        showFlash("error", error.message);
      }
    })();
  }, [token]);

  function updateProvider(provider) {
    const defaults = providerDefaults(provider, providerInfo?.catalog || {});
    setForm((current) => ({
      ...current,
      provider,
      model: defaults.model,
      voice_name: defaults.voice_name,
      instructions: provider === "elevenlabs" ? "" : current.instructions,
    }));
  }

  async function createVoice(event) {
    event.preventDefault();
    await apiFetch(`/api/projects/${project.id}/voice-profiles`, {
      method: "POST",
      token,
      body: { ...form, speed: Number(form.speed) },
    });
    setForm({ name: "", voice_name: "Tingting", speed: 1.0, style: "", instructions: "", is_default: false });
    await refreshProject();
    showFlash("success", "聲線設定已建立。");
  }

  return (
    <div className="grid">
      <div className="grid two">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>聲線設定</h2>
              <div className="subtext">可為旁白、主角、背景角色等建立多組聲線，再到文本頁綁定或解除綁定。</div>
            </div>
          </div>
          {providerInfo ? (
            <div className="pill-row" style={{ marginBottom: 16 }}>
              <span className={`tag ${providerInfo.providers?.macos?.configured ? "success" : "warn"}`}>macOS say</span>
              <span className={`tag ${providerInfo.providers?.openai?.configured ? "success" : "warn"}`}>OpenAI</span>
              <span className={`tag ${providerInfo.providers?.elevenlabs?.configured ? "success" : "warn"}`}>ElevenLabs</span>
            </div>
          ) : null}
          <div className="list">
            {voices.map((voice) => (
              <div key={voice.id} className="list-item">
                <div className="title-row">
                  <strong>{voice.name}</strong>
                  {project.default_voice_profile_id === voice.id ? <span className="tag brand">專案預設</span> : null}
                </div>
                <div className="subtext">{voice.provider} / {voice.model} / {voice.voice_name}</div>
                <div className="pill-row" style={{ marginTop: 10 }}>
                  <span className="tag">速度 {voice.speed}</span>
                  <span className="tag">{voice.style || "未設定風格"}</span>
                </div>
                <div className="toolbar" style={{ marginTop: 12 }}>
                  <button className="button-secondary" onClick={async () => {
                    await apiFetch(`/api/projects/${project.id}`, {
                      method: "PATCH",
                      token,
                      body: { default_voice_profile_id: voice.id },
                    });
                    await refreshProject();
                    showFlash("success", `${voice.name} 已設為專案預設聲線。`);
                  }}>
                    設為預設
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>建立本地聲線設定</h2>
              <div className="subtext">可建立 macOS、OpenAI 或 ElevenLabs 的聲線設定。</div>
            </div>
          </div>
          <form className="form-grid" onSubmit={createVoice}>
            <div className="field">
              <label>名稱</label>
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="field">
              <label>Provider</label>
              <select className="select" value={form.provider} onChange={(event) => updateProvider(event.target.value)}>
                <option value="macos">macOS say</option>
                <option value="openai">OpenAI</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
            <div className="field">
              <label>模型</label>
              {form.provider === "macos" ? (
                <input className="input" value="say" disabled />
              ) : form.provider === "openai" ? (
                <select className="select" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
                  {(providerInfo?.catalog?.openai_tts_models || OPENAI_MODEL_FALLBACKS).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <select className="select" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
                  {(providerInfo?.catalog?.elevenlabs_tts_models || ELEVENLABS_MODEL_FALLBACKS).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label>{form.provider === "elevenlabs" ? "Voice ID" : "聲線名稱"}</label>
              {form.provider === "macos" ? (
                <select className="select" value={form.voice_name} onChange={(event) => setForm({ ...form, voice_name: event.target.value })}>
                  {(providerInfo?.catalog?.macos_tts_voices || ["Tingting", "Eddy (Chinese (China mainland))", "Samantha", "Daniel"]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : form.provider === "openai" ? (
                <select className="select" value={form.voice_name} onChange={(event) => setForm({ ...form, voice_name: event.target.value })}>
                  {(providerInfo?.catalog?.openai_tts_voices || OPENAI_VOICE_FALLBACKS).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="貼上 ElevenLabs voice_id"
                  value={form.voice_name}
                  onChange={(event) => setForm({ ...form, voice_name: event.target.value })}
                />
              )}
            </div>
            <div className="field">
              <label>速度</label>
              <input className="input" type="number" min="0.7" max="1.4" step="0.05" value={form.speed} onChange={(event) => setForm({ ...form, speed: event.target.value })} />
            </div>
            <div className="field">
              <label>風格</label>
              <input className="input" value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })} />
            </div>
            <div className="field">
              <label>說明</label>
              <textarea className="textarea small" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
            </div>
            {form.provider === "elevenlabs" ? (
              <div className="editor-card">
                <div className="eyebrow">提示</div>
                <div>ElevenLabs 目前需要你自行填入 voice_id。建立後，系統會直接呼叫 ElevenLabs TTS API。</div>
              </div>
            ) : null}
            <button className="button">建立聲線設定</button>
          </form>
        </section>
      </div>

    </div>
  );
}

function CharacterSetupPage({ token, project, voices, characters, refreshProject, requestConfirm, showFlash }) {
  const [form, setForm] = useState({
    name: "",
    voice_profile_id: "",
    role_type: "supporting",
    story_character_name: "",
    display_title: "",
    archetype: "",
    summary: "",
    personality: "",
    backstory: "",
    catchphrase: "",
    default_mood: "",
    preset_key: "",
    speed_override: "",
    style_override: "",
    instructions: "",
    warmth: 50,
    intensity: 50,
    humor: 50,
    mystery: 50,
    bravery: 50,
    discipline: 50,
  });
  const [editingId, setEditingId] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [lookDrafts, setLookDrafts] = useState({});
  const [lookBusyKey, setLookBusyKey] = useState("");
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchDriveUrls, setBatchDriveUrls] = useState("");
  const [batchInputVersion, setBatchInputVersion] = useState(0);

  const currentCharacter = characters.find((character) => character.id === editingId) || null;
  const lookSlots = currentCharacter?.looks || Array.from({ length: 9 }, (_, index) => ({
    id: null,
    slot_index: index + 1,
    label: `圖片 ${index + 1}`,
    image_url: "",
    source_type: "",
    source_ref: "",
  }));

  useEffect(() => {
    if (!form.voice_profile_id && voices.length) {
      setForm((current) => ({ ...current, voice_profile_id: String(voices[0].id) }));
    }
  }, [voices, form.voice_profile_id]);

  useEffect(() => {
    const nextDrafts = {};
    for (const look of lookSlots) {
      nextDrafts[look.slot_index] = {
        label: look.label || `圖片 ${look.slot_index}`,
        driveUrl: "",
        file: null,
      };
    }
    setLookDrafts(nextDrafts);
  }, [editingId, characters]);

  function applyPreset(key) {
    const preset = CHARACTER_PRESETS[key];
    if (!preset) return;
    setForm((current) => ({
      ...current,
      preset_key: key,
      role_type: preset.role_type || current.role_type,
      display_title: preset.display_title,
      archetype: preset.archetype,
      summary: preset.summary,
      personality: preset.personality,
      backstory: preset.backstory,
      catchphrase: preset.catchphrase,
      default_mood: preset.default_mood,
      warmth: preset.warmth,
      intensity: preset.intensity,
      humor: preset.humor,
      mystery: preset.mystery,
      bravery: preset.bravery,
      discipline: preset.discipline,
    }));
  }

  function loadCharacter(character) {
    setFormError("");
    setFormSuccess("");
    setEditingId(character.id);
    setForm({
      name: character.name,
      voice_profile_id: String(character.voice_profile_id),
      role_type: character.role_type || "supporting",
      story_character_name: character.story_character_name || "",
      display_title: character.display_title || "",
      archetype: character.archetype || "",
      summary: character.summary || "",
      personality: character.personality || "",
      backstory: character.backstory || "",
      catchphrase: character.catchphrase || "",
      default_mood: character.default_mood || "",
      preset_key: character.preset_key || "",
      speed_override: character.speed_override ?? "",
      style_override: character.style_override || "",
      instructions: character.instructions || "",
      warmth: character.warmth ?? 50,
      intensity: character.intensity ?? 50,
      humor: character.humor ?? 50,
      mystery: character.mystery ?? 50,
      bravery: character.bravery ?? 50,
      discipline: character.discipline ?? 50,
    });
    setAvatarFile(null);
  }

  function resetForm() {
    setFormError("");
    setFormSuccess("");
    setEditingId(null);
    setForm({
      name: "",
      voice_profile_id: voices[0] ? String(voices[0].id) : "",
      role_type: "supporting",
      story_character_name: "",
      display_title: "",
      archetype: "",
      summary: "",
      personality: "",
      backstory: "",
      catchphrase: "",
      default_mood: "",
      preset_key: "",
      speed_override: "",
      style_override: "",
      instructions: "",
      warmth: 50,
      intensity: 50,
      humor: 50,
      mystery: 50,
      bravery: 50,
      discipline: 50,
    });
    setAvatarFile(null);
  }

  async function submitCharacter(event) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.name.trim()) {
      setFormError("請先輸入角色名稱。");
      return;
    }
    if (!form.voice_profile_id) {
      setFormError("請先選擇聲線。");
      return;
    }
    const body = {
      name: form.name.trim(),
      voice_profile_id: Number(form.voice_profile_id),
      role_type: form.role_type,
      story_character_name: form.story_character_name.trim(),
      display_title: form.display_title,
      archetype: form.archetype,
      summary: form.summary,
      personality: form.personality,
      backstory: form.backstory,
      catchphrase: form.catchphrase,
      default_mood: form.default_mood,
      preset_key: form.preset_key,
      speed_override: form.speed_override === "" ? null : Number(form.speed_override),
      style_override: form.style_override,
      instructions: form.instructions,
      warmth: Number(form.warmth),
      intensity: Number(form.intensity),
      humor: Number(form.humor),
      mystery: Number(form.mystery),
      bravery: Number(form.bravery),
      discipline: Number(form.discipline),
    };
    setSaving(true);
    try {
      let characterProfile = null;
      if (editingId) {
        characterProfile = (await apiFetch(`/api/character-profiles/${editingId}`, {
          method: "PATCH",
          token,
          body,
        })).character_profile;
        showFlash("success", "角色設定已更新。");
      } else {
        characterProfile = (await apiFetch(`/api/projects/${project.id}/character-profiles`, {
          method: "POST",
          token,
          body,
        })).character_profile;
        showFlash("success", "角色設定已建立。");
      }
      if (avatarFile && characterProfile?.id) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await apiFetch(`/api/character-profiles/${characterProfile.id}/avatar`, {
          method: "POST",
          token,
          formData,
        });
      }
      resetForm();
      setFormSuccess(editingId ? "角色設定已更新。" : "角色設定已建立。");
      await refreshProject();
    } catch (error) {
      setFormError(error.message || "角色儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteCharacter(character) {
    requestConfirm({
      title: "刪除角色",
      message: `將刪除角色「${character.name}」，並清空已指派到該角色的段落。此動作無法復原。`,
      confirmLabel: "刪除角色",
      onConfirm: async () => {
        await apiFetch(`/api/character-profiles/${character.id}`, { method: "DELETE", token });
        if (editingId === character.id) {
          resetForm();
        }
        await refreshProject();
        showFlash("success", `角色「${character.name}」已刪除。`);
      },
    });
  }

  function updateLookDraft(slotIndex, patch) {
    setLookDrafts((current) => ({
      ...current,
      [slotIndex]: {
        ...(current[slotIndex] || { label: `圖片 ${slotIndex}`, driveUrl: "", file: null }),
        ...patch,
      },
    }));
  }

  function fileStem(name) {
    return String(name || "").replace(/\.[^/.]+$/, "") || "";
  }

  async function saveLookLabel(slotIndex) {
    if (!editingId) return;
    const draft = lookDrafts[slotIndex] || { label: `圖片 ${slotIndex}` };
    setLookBusyKey(`label:${slotIndex}`);
    try {
      await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}`, {
        method: "PATCH",
        token,
        body: { label: draft.label },
      });
      await refreshProject();
      showFlash("success", `圖片 ${slotIndex} 名稱已更新。`);
    } catch (error) {
      showFlash("error", error.message || "圖片名稱更新失敗。");
    } finally {
      setLookBusyKey("");
    }
  }

  async function uploadLookFile(slotIndex) {
    if (!editingId) return;
    const draft = lookDrafts[slotIndex];
    if (!draft?.file) {
      showFlash("error", `請先為圖片 ${slotIndex} 選擇本地檔案。`);
      return;
    }
    setLookBusyKey(`upload:${slotIndex}`);
    try {
      const formData = new FormData();
      formData.append("file", draft.file);
      formData.append("label", draft.label || `圖片 ${slotIndex}`);
      await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}/upload`, {
        method: "POST",
        token,
        formData,
      });
      updateLookDraft(slotIndex, { file: null });
      await refreshProject();
      showFlash("success", `圖片 ${slotIndex} 已從本地上傳。`);
    } catch (error) {
      showFlash("error", error.message || "本地圖片上傳失敗。");
    } finally {
      setLookBusyKey("");
    }
  }

  async function importLookFromDrive(slotIndex) {
    if (!editingId) return;
    const draft = lookDrafts[slotIndex];
    if (!draft?.driveUrl?.trim()) {
      showFlash("error", `請先貼上圖片 ${slotIndex} 的 Drive 分享連結。`);
      return;
    }
    setLookBusyKey(`drive:${slotIndex}`);
    try {
      await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}/drive-import`, {
        method: "POST",
        token,
        body: {
          url: draft.driveUrl.trim(),
          label: draft.label || `圖片 ${slotIndex}`,
        },
      });
      updateLookDraft(slotIndex, { driveUrl: "" });
      await refreshProject();
      showFlash("success", `圖片 ${slotIndex} 已從 Drive / 圖片連結導入。`);
    } catch (error) {
      showFlash("error", error.message || "Drive 圖片導入失敗。");
    } finally {
      setLookBusyKey("");
    }
  }

  function clearLook(slotIndex) {
    if (!editingId) return;
    requestConfirm({
      title: "清空圖片",
      message: `將清空圖片 ${slotIndex} 的檔案與來源資料。此動作無法復原。`,
      confirmLabel: "清空圖片",
      onConfirm: async () => {
        await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}`, {
          method: "DELETE",
          token,
        });
        await refreshProject();
        showFlash("success", `圖片 ${slotIndex} 已清空。`);
      },
    });
  }

  async function uploadLooksBatch() {
    if (!editingId) return;
    const files = batchFiles.slice(0, 9);
    if (!files.length) {
      showFlash("error", "請先選擇最多 9 張本地圖片。");
      return;
    }
    setLookBusyKey("batch-upload");
    try {
      for (const [index, file] of files.entries()) {
        const slotIndex = index + 1;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", fileStem(file.name) || `圖片 ${slotIndex}`);
        await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}/upload`, {
          method: "POST",
          token,
          formData,
        });
      }
      setBatchFiles([]);
      setBatchInputVersion((value) => value + 1);
      await refreshProject();
      showFlash("success", `已批量上傳 ${files.length} 張角色圖片。`);
    } catch (error) {
      showFlash("error", error.message || "批量上傳失敗。");
    } finally {
      setLookBusyKey("");
    }
  }

  async function importLooksBatchFromDrive() {
    if (!editingId) return;
    const urls = batchDriveUrls.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 9);
    if (!urls.length) {
      showFlash("error", "請先貼上最多 9 個 Drive / 圖片連結，每行一個。");
      return;
    }
    setLookBusyKey("batch-drive");
    try {
      for (const [index, url] of urls.entries()) {
        const slotIndex = index + 1;
        await apiFetch(`/api/character-profiles/${editingId}/looks/${slotIndex}/drive-import`, {
          method: "POST",
          token,
          body: {
            url,
            label: `圖片 ${slotIndex}`,
          },
        });
      }
      setBatchDriveUrls("");
      await refreshProject();
      showFlash("success", `已批量導入 ${urls.length} 張角色圖片。`);
    } catch (error) {
      showFlash("error", error.message || "批量導入失敗。");
    } finally {
      setLookBusyKey("");
    }
  }

  return (
    <div className="grid">
      <div className="grid two">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>角色設定</h2>
              <div className="subtext">{project ? `目前專案：${project.title}，可建立旁白、主角、背景角色等聲線角色。` : "請先選取專案"}</div>
            </div>
          <span className="tag">{characters.length} 個角色</span>
        </div>
        {!project ? (
          <div className="empty-state">請先回到專案頁選取一個專案，再建立角色。</div>
        ) : (
          <div className="list">
            {characters.map((character) => (
              <div key={character.id} className="list-item">
                <div className="title-row">
                  <strong>{character.name}</strong>
                  <div className="pill-row">
                    <span className="tag brand">{characterRoleLabel(character.role_type)}</span>
                    <span className="tag">{character.voice_profile_name}</span>
                    <span className="tag">{character.looks_count || 0} 張圖片</span>
                  </div>
                </div>
                <div className="title-row" style={{ alignItems: "flex-start", marginTop: 10 }}>
                  {character.avatar_url ? <img src={character.avatar_url} alt={character.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid var(--line)" }} /> : <div className="editor-card" style={{ width: 56, height: 56, display: "grid", placeItems: "center", padding: 0 }}>{character.name.slice(0, 1)}</div>}
                  <div style={{ flex: 1 }}>
                    <div className="subtext">{characterBindingSummary(character)}</div>
                    <div className="subtext">{character.voice_name || "未提供聲線名稱"}</div>
                    <div className="subtext">{character.summary || "尚未填寫角色摘要。"}</div>
                  </div>
                </div>
                <div className="pill-row" style={{ marginTop: 10 }}>
                  <span className="tag">速度 {character.speed_override ?? "沿用聲線"}</span>
                  <span className="tag">{character.style_override || "沿用聲線風格"}</span>
                  {character.default_mood ? <span className="tag">{character.default_mood}</span> : null}
                </div>
                <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                  <button className="button-secondary" onClick={() => loadCharacter(character)}>編輯</button>
                  <button className="button-secondary" onClick={() => requestDeleteCharacter(character)}>刪除</button>
                </div>
              </div>
            ))}
            {!characters.length ? <div className="empty-state">先建立旁白、主角或背景角色，再回到文本準備頁把具體段落綁定到小說角色。</div> : null}
          </div>
        )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{editingId ? "編輯角色" : "建立角色"}</h2>
            <div className="subtext">可新增、刪除、修改角色設定，並把它綁到小說中的具體人物或解除綁定。</div>
          </div>
        </div>
        {!project ? (
          <div className="empty-state">請先選取專案。</div>
        ) : (
          <form className="form-grid" onSubmit={submitCharacter}>
            {formError ? <div className="flash error">{formError}</div> : null}
            {formSuccess ? <div className="flash success">{formSuccess}</div> : null}
            <div className="editor-card">
              <div className="eyebrow">角色預設</div>
              <div className="toolbar">
                {Object.entries(CHARACTER_PRESETS).map(([key, preset]) => (
                  <button key={key} type="button" className="button-secondary" onClick={() => applyPreset(key)}>{preset.label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>角色名稱</label>
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="field">
              <label>角色類型</label>
              <select className="select" value={form.role_type} onChange={(event) => setForm({ ...form, role_type: event.target.value })}>
                {CHARACTER_ROLE_OPTIONS.map((roleType) => (
                  <option key={roleType} value={roleType}>{characterRoleLabel(roleType)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>綁定小說角色</label>
              <input className="input" placeholder="例如：孫悟空 / 系統旁白 / 群眾甲" value={form.story_character_name} onChange={(event) => setForm({ ...form, story_character_name: event.target.value })} />
            </div>
            <div className="field">
              <label>角色職稱</label>
              <input className="input" placeholder="例如：大鬧天宮的齊天大聖" value={form.display_title} onChange={(event) => setForm({ ...form, display_title: event.target.value })} />
            </div>
            <div className="field">
              <label>角色原型</label>
              <input className="input" placeholder="例如：Hero / Trickster / Mentor" value={form.archetype} onChange={(event) => setForm({ ...form, archetype: event.target.value })} />
            </div>
            <div className="field">
              <label>綁定聲線</label>
              <select className="select" value={form.voice_profile_id} onChange={(event) => setForm({ ...form, voice_profile_id: event.target.value })}>
                <option value="">請選擇聲線</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={String(voice.id)}>{voice.name} · {voice.voice_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>角色頭像</label>
              <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
            </div>
            <div className="field">
              <label>速度覆寫</label>
              <input className="input" type="number" min="0.7" max="1.4" step="0.05" placeholder="留空沿用聲線" value={form.speed_override} onChange={(event) => setForm({ ...form, speed_override: event.target.value })} />
            </div>
            <div className="field">
              <label>風格覆寫</label>
              <input className="input" placeholder="留空沿用聲線風格" value={form.style_override} onChange={(event) => setForm({ ...form, style_override: event.target.value })} />
            </div>
            <div className="field">
              <label>角色摘要</label>
              <textarea className="textarea small" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </div>
            <div className="field">
              <label>個性介紹</label>
              <textarea className="textarea small" value={form.personality} onChange={(event) => setForm({ ...form, personality: event.target.value })} />
            </div>
            <div className="field">
              <label>背景故事</label>
              <textarea className="textarea small" value={form.backstory} onChange={(event) => setForm({ ...form, backstory: event.target.value })} />
            </div>
            <div className="field">
              <label>招牌台詞</label>
              <input className="input" value={form.catchphrase} onChange={(event) => setForm({ ...form, catchphrase: event.target.value })} />
            </div>
            <div className="field">
              <label>預設情緒</label>
              <input className="input" value={form.default_mood} onChange={(event) => setForm({ ...form, default_mood: event.target.value })} />
            </div>
            <div className="field">
              <label>角色說明</label>
              <textarea className="textarea small" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
            </div>
            {[
              ["warmth", "親和"],
              ["intensity", "張力"],
              ["humor", "幽默"],
              ["mystery", "神秘"],
              ["bravery", "勇氣"],
              ["discipline", "紀律"],
            ].map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label} {form[key]}</label>
                <input className="input" type="range" min="0" max="100" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
              </div>
            ))}
            <div className="toolbar">
              <button type="submit" className="button" disabled={saving}>{saving ? "儲存中..." : editingId ? "儲存角色" : "建立角色"}</button>
              {editingId ? <button type="button" className="button-secondary" disabled={saving} onClick={resetForm}>取消編輯</button> : null}
            </div>
          </form>
        )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>角色圖片集</h2>
            <div className="subtext">可為每個角色一次上傳最多 9 張圖片，或批量貼上 Drive 分享連結 / 圖片 URL。</div>
          </div>
          {currentCharacter ? <span className="tag brand">{currentCharacter.name}</span> : <span className="tag">未選角色</span>}
        </div>
        {!currentCharacter ? (
          <div className="empty-state">先在左側選一個角色並按「編輯」，再管理角色圖片。</div>
        ) : (
          <div className="grid">
            <div className="grid two">
              <div className="panel" style={{ background: "rgba(255,255,255,0.68)" }}>
                <div className="panel-head">
                  <div>
                    <h3>一次上傳多張</h3>
                    <div className="subtext">一次選最多 9 張本地圖片，系統會依順序保存到角色圖片集。</div>
                  </div>
                </div>
                <div className="field">
                  <label>本地圖片（最多 9 張）</label>
                  <input key={batchInputVersion} className="input" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => setBatchFiles(Array.from(event.target.files || []).slice(0, 9))} />
                </div>
                <div className="subtext">{batchFiles.length ? `已選擇 ${batchFiles.length} 張圖片` : "尚未選擇圖片"}</div>
                <div className="toolbar">
                  <button className="button" disabled={lookBusyKey === "batch-upload"} onClick={uploadLooksBatch}>
                    {lookBusyKey === "batch-upload" ? "批量上傳中..." : "開始上傳"}
                  </button>
                </div>
              </div>

              <div className="panel" style={{ background: "rgba(255,255,255,0.68)" }}>
                <div className="panel-head">
                  <div>
                    <h3>一次導入多個連結</h3>
                    <div className="subtext">每行一個 Drive 分享連結或圖片 URL，系統會依順序保存到角色圖片集。</div>
                  </div>
                </div>
                <div className="field">
                  <label>Drive / 圖片連結</label>
                  <textarea className="textarea small" placeholder={"每行一個連結\n最多 9 個"} value={batchDriveUrls} onChange={(event) => setBatchDriveUrls(event.target.value)} />
                </div>
                <div className="toolbar">
                  <button className="button" disabled={lookBusyKey === "batch-drive"} onClick={importLooksBatchFromDrive}>
                    {lookBusyKey === "batch-drive" ? "批量導入中..." : "開始導入"}
                  </button>
                </div>
              </div>
            </div>

            <div className="album-head">
              <div className="subtext">已上傳 {currentCharacter.looks_count || 0} / 9 張</div>
            </div>

            <div className="image-wall">
              {lookSlots.map((look) => {
                const draft = lookDrafts[look.slot_index] || { label: look.label || `圖片 ${look.slot_index}`, driveUrl: "", file: null };
                const sourceLabel = look.source_type === "drive" ? "Drive" : look.source_type === "url" ? "連結" : look.image_url ? "本地" : "待上傳";
                return (
                  <div key={look.slot_index} className={`image-tile ${look.image_url ? "" : "empty"}`}>
                    <div className="image-thumb">
                      {look.image_url ? (
                        <img src={look.image_url} alt={look.label} className="image-thumb-img" />
                      ) : (
                        <div className="image-empty-copy">
                          <strong>待上傳</strong>
                          <span>可由上方批量加入</span>
                        </div>
                      )}
                    </div>
                    <div className="image-meta">
                      <div className="image-meta-head">
                        <strong>{draft.label || `圖片 ${look.slot_index}`}</strong>
                        <span className="tag">{sourceLabel}</span>
                      </div>
                      <input className="input" value={draft.label} onChange={(event) => updateLookDraft(look.slot_index, { label: event.target.value })} />
                      <div className="image-actions">
                        <button className="button-flat" disabled={lookBusyKey === `label:${look.slot_index}`} onClick={() => saveLookLabel(look.slot_index)}>
                        {lookBusyKey === `label:${look.slot_index}` ? "儲存中..." : "儲存標題"}
                        </button>
                        <button className="button-flat-danger" onClick={() => clearLook(look.slot_index)}>清空</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ComicWorkflowProjectRequired({ message = "請先回到專案頁選取一個漫畫專案。" }) {
  return <div className="empty-state">{message}</div>;
}

function ComicScriptPage({ token, project, comicScripts, chapters, refreshProject, requestConfirm, showFlash }) {
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [createForm, setCreateForm] = useState(defaultComicScriptForm(chapters[0]?.id || ""));
  const [form, setForm] = useState(defaultComicScriptForm());
  const [busyKey, setBusyKey] = useState("");

  const selectedScript = comicScripts.find((item) => item.id === selectedScriptId) || comicScripts[0] || null;

  useEffect(() => {
    if (!comicScripts.length) {
      setSelectedScriptId(null);
      return;
    }
    if (!selectedScriptId || !comicScripts.some((item) => item.id === selectedScriptId)) {
      setSelectedScriptId(comicScripts[0].id);
    }
  }, [comicScripts, selectedScriptId]);

  useEffect(() => {
    setForm(comicScriptFormFromValue(selectedScript));
  }, [selectedScript?.id, selectedScript?.updated_at]);

  useEffect(() => {
    setCreateForm(defaultComicScriptForm(chapters[0]?.id || ""));
  }, [project?.id, chapters.length]);

  if (!project) {
    return <ComicWorkflowProjectRequired />;
  }

  async function createScript() {
    if (!createForm.title.trim()) {
      showFlash("error", "請先輸入腳本名稱。");
      return;
    }
    setBusyKey("create-script");
    try {
      await apiFetch(`/api/projects/${project.id}/comic-scripts`, {
        method: "POST",
        token,
        body: {
          ...createForm,
          chapter_id: createForm.chapter_id ? Number(createForm.chapter_id) : null,
          target_page_count: Number(createForm.target_page_count) || 8,
        },
      });
      await refreshProject({ projectId: project.id });
      setCreateForm(defaultComicScriptForm(chapters[0]?.id || ""));
      showFlash("success", "漫畫腳本已建立。");
    } catch (error) {
      showFlash("error", error.message || "建立漫畫腳本失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function saveScript() {
    if (!selectedScript) return;
    if (!form.title.trim()) {
      showFlash("error", "腳本名稱不能為空。");
      return;
    }
    setBusyKey(`save-script:${selectedScript.id}`);
    try {
      await apiFetch(`/api/comic-scripts/${selectedScript.id}`, {
        method: "PATCH",
        token,
        body: {
          ...form,
          chapter_id: form.chapter_id ? Number(form.chapter_id) : null,
          target_page_count: Number(form.target_page_count) || 1,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "漫畫腳本已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新漫畫腳本失敗。");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>漫畫腳本清單</h2>
            <div className="subtext">先整理章節級故事目標，再寫成可進入分鏡的漫畫腳本。</div>
          </div>
          <span className="tag brand">{comicScripts.length} 份</span>
        </div>
        <div className="list" style={{ marginBottom: 14 }}>
          {comicScripts.map((script) => (
            <button
              key={script.id}
              className={`project-button ${selectedScript?.id === script.id ? "active" : ""}`}
              onClick={() => setSelectedScriptId(script.id)}
            >
              <div className="title-row">
                <strong>{script.title}</strong>
                <span className="tag">{script.page_count || 0} 頁</span>
              </div>
              <div className="subtext">{script.chapter_title || "未綁定章節"} · 目標 {script.target_page_count} 頁 · {statusLabel(script.status)}</div>
            </button>
          ))}
          {!comicScripts.length ? <div className="empty-state">先建立第一份漫畫腳本。</div> : null}
        </div>
        <div className="field">
          <label>新的腳本名稱</label>
          <input className="input" value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="例如：第 1 章 漫畫腳本" />
        </div>
        <div className="toolbar">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>對應章節</label>
            <select className="select" value={createForm.chapter_id} onChange={(event) => setCreateForm({ ...createForm, chapter_id: event.target.value })}>
              <option value="">不綁定章節</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.order_index}. {chapter.title}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 120, marginBottom: 0 }}>
            <label>目標頁數</label>
            <input className="input" type="number" min="1" value={createForm.target_page_count} onChange={(event) => setCreateForm({ ...createForm, target_page_count: event.target.value })} />
          </div>
        </div>
        <button className="button" disabled={busyKey === "create-script"} onClick={createScript}>
          {busyKey === "create-script" ? "建立中..." : "建立漫畫腳本"}
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>腳本編輯</h2>
            <div className="subtext">{selectedScript ? `目前編輯：${selectedScript.title}` : "請先選取腳本"}</div>
          </div>
          {selectedScript ? <span className="tag">{selectedScript.page_count || 0} 已拆頁</span> : null}
        </div>
        {!selectedScript ? (
          <div className="empty-state">先在左側建立或選取一份腳本，再開始整理 premise、outline 與 page beat。</div>
        ) : (
          <form className="form-grid" onSubmit={async (event) => {
            event.preventDefault();
            await saveScript();
          }}>
            <div className="field">
              <label>腳本名稱</label>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="field">
              <label>對應章節</label>
              <select className="select" value={form.chapter_id} onChange={(event) => setForm({ ...form, chapter_id: event.target.value })}>
                <option value="">不綁定章節</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.order_index}. {chapter.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>目標頁數</label>
              <input className="input" type="number" min="1" value={form.target_page_count} onChange={(event) => setForm({ ...form, target_page_count: event.target.value })} />
            </div>
            <div className="field">
              <label>狀態</label>
              <select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="draft">草稿</option>
                <option value="active">進行中</option>
                <option value="approved">已確認</option>
              </select>
            </div>
            <div className="field">
              <label>Premise / 章節目標</label>
              <textarea className="textarea small" value={form.premise} onChange={(event) => setForm({ ...form, premise: event.target.value })} />
            </div>
            <div className="field">
              <label>故事大綱</label>
              <textarea className="textarea" value={form.outline_text} onChange={(event) => setForm({ ...form, outline_text: event.target.value })} />
            </div>
            <div className="field">
              <label>漫畫腳本</label>
              <textarea className="textarea xl" value={form.script_text} onChange={(event) => setForm({ ...form, script_text: event.target.value })} placeholder="建議寫成：Page 1 / Panel 1 / 對白 / 旁白 / 動作描述..." />
            </div>
            <div className="toolbar">
              <button className="button" disabled={busyKey === `save-script:${selectedScript.id}`}>{busyKey === `save-script:${selectedScript.id}` ? "儲存中..." : "儲存腳本"}</button>
              <button
                type="button"
                className="button-danger"
                onClick={() => requestConfirm({
                  title: "刪除漫畫腳本",
                  message: `會刪除「${selectedScript.title}」，已建立的頁面會保留，但會解除綁定。`,
                  confirmLabel: "刪除腳本",
                  onConfirm: async () => {
                    await apiFetch(`/api/comic-scripts/${selectedScript.id}`, { method: "DELETE", token });
                    await refreshProject({ projectId: project.id });
                    showFlash("success", "漫畫腳本已刪除。");
                  },
                })}
              >
                刪除腳本
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ComicStoryboardPage({ token, project, comicScripts, comicPages, chapters, refreshProject, requestConfirm, showFlash }) {
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [createForm, setCreateForm] = useState(defaultComicPageForm());
  const [pageForm, setPageForm] = useState(defaultComicPageForm());
  const [panelDrafts, setPanelDrafts] = useState({});
  const [busyKey, setBusyKey] = useState("");

  const selectedPage = comicPages.find((item) => item.id === selectedPageId) || comicPages[0] || null;

  useEffect(() => {
    if (!comicPages.length) {
      setSelectedPageId(null);
      return;
    }
    if (!selectedPageId || !comicPages.some((item) => item.id === selectedPageId)) {
      setSelectedPageId(comicPages[0].id);
    }
  }, [comicPages, selectedPageId]);

  useEffect(() => {
    setPageForm(comicPageFormFromValue(selectedPage));
  }, [selectedPage?.id, selectedPage?.updated_at]);

  useEffect(() => {
    const nextDrafts = {};
    comicPages.forEach((page) => {
      (page.panels || []).forEach((panel) => {
        nextDrafts[panel.id] = comicPanelFormFromValue(panel);
      });
    });
    setPanelDrafts(nextDrafts);
  }, [comicPages]);

  useEffect(() => {
    setCreateForm(defaultComicPageForm());
  }, [project?.id]);

  if (!project) {
    return <ComicWorkflowProjectRequired />;
  }

  async function createPage() {
    setBusyKey("create-page");
    try {
      await apiFetch(`/api/projects/${project.id}/comic-pages`, {
        method: "POST",
        token,
        body: {
          ...createForm,
          title: createForm.title.trim() || `第 ${comicPages.length + 1} 頁`,
          chapter_id: createForm.chapter_id ? Number(createForm.chapter_id) : null,
          comic_script_id: createForm.comic_script_id ? Number(createForm.comic_script_id) : null,
          page_no: createForm.page_no ? Number(createForm.page_no) : null,
        },
      });
      await refreshProject({ projectId: project.id });
      setCreateForm(defaultComicPageForm());
      showFlash("success", "漫畫頁面已建立。");
    } catch (error) {
      showFlash("error", error.message || "建立頁面失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function savePage() {
    if (!selectedPage) return;
    setBusyKey(`save-page:${selectedPage.id}`);
    try {
      await apiFetch(`/api/comic-pages/${selectedPage.id}`, {
        method: "PATCH",
        token,
        body: {
          ...pageForm,
          chapter_id: pageForm.chapter_id ? Number(pageForm.chapter_id) : null,
          comic_script_id: pageForm.comic_script_id ? Number(pageForm.comic_script_id) : null,
          page_no: pageForm.page_no ? Number(pageForm.page_no) : null,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "頁面分鏡設定已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新頁面失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function createPanel() {
    if (!selectedPage) return;
    setBusyKey(`create-panel:${selectedPage.id}`);
    try {
      await apiFetch(`/api/comic-pages/${selectedPage.id}/panels`, {
        method: "POST",
        token,
        body: {
          title: `畫格 ${(selectedPage.panels || []).length + 1}`,
          image_status: "pending",
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "新畫格已加入分鏡。");
    } catch (error) {
      showFlash("error", error.message || "新增畫格失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function savePanel(panelId) {
    const draft = panelDrafts[panelId];
    setBusyKey(`save-panel:${panelId}`);
    try {
      await apiFetch(`/api/comic-panels/${panelId}`, {
        method: "PATCH",
        token,
        body: {
          ...draft,
          panel_no: draft.panel_no ? Number(draft.panel_no) : null,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "畫格分鏡已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新畫格分鏡失敗。");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>分鏡頁面</h2>
            <div className="subtext">先建頁，再把頁面拆成各個 panel。</div>
          </div>
          <span className="tag brand">{comicPages.length} 頁</span>
        </div>
        <div className="list" style={{ marginBottom: 14 }}>
          {comicPages.map((page) => (
            <button key={page.id} className={`project-button ${selectedPage?.id === page.id ? "active" : ""}`} onClick={() => setSelectedPageId(page.id)}>
              <div className="title-row">
                <strong>{formatComicPageTitle(page)}</strong>
                <span className="tag">{page.panel_count || 0} 格</span>
              </div>
              <div className="subtext">{page.comic_script_title || "未綁定腳本"} · {page.chapter_title || "未綁定章節"} · {page.layout_preset}</div>
            </button>
          ))}
          {!comicPages.length ? <div className="empty-state">先建立第一頁，再開始做分鏡。</div> : null}
        </div>
        <div className="field">
          <label>新頁標題</label>
          <input className="input" value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="例如：進城初見" />
        </div>
        <div className="toolbar">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>綁定腳本</label>
            <select className="select" value={createForm.comic_script_id} onChange={(event) => setCreateForm({ ...createForm, comic_script_id: event.target.value })}>
              <option value="">不綁定腳本</option>
              {comicScripts.map((script) => (
                <option key={script.id} value={script.id}>{script.title}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>綁定章節</label>
            <select className="select" value={createForm.chapter_id} onChange={(event) => setCreateForm({ ...createForm, chapter_id: event.target.value })}>
              <option value="">不綁定章節</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.order_index}. {chapter.title}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 120, marginBottom: 0 }}>
            <label>頁碼</label>
            <input className="input" type="number" min="1" value={createForm.page_no} onChange={(event) => setCreateForm({ ...createForm, page_no: event.target.value })} />
          </div>
        </div>
        <button className="button" disabled={busyKey === "create-page"} onClick={createPage}>
          {busyKey === "create-page" ? "建立中..." : "建立頁面"}
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>頁面分鏡</h2>
            <div className="subtext">{selectedPage ? formatComicPageTitle(selectedPage) : "請先選取頁面"}</div>
          </div>
          {selectedPage ? <span className="tag">{selectedPage.panel_count || 0} 格</span> : null}
        </div>
        {!selectedPage ? (
          <div className="empty-state">左側建立頁面後，這裡就可以維護每一格的 shot、camera 與 beat。</div>
        ) : (
          <>
            <form className="form-grid" onSubmit={async (event) => {
              event.preventDefault();
              await savePage();
            }}>
              <div className="field">
                <label>頁面標題</label>
                <input className="input" value={pageForm.title} onChange={(event) => setPageForm({ ...pageForm, title: event.target.value })} />
              </div>
              <div className="field">
                <label>頁碼</label>
                <input className="input" type="number" min="1" value={pageForm.page_no} onChange={(event) => setPageForm({ ...pageForm, page_no: event.target.value })} />
              </div>
              <div className="field">
                <label>腳本</label>
                <select className="select" value={pageForm.comic_script_id} onChange={(event) => setPageForm({ ...pageForm, comic_script_id: event.target.value })}>
                  <option value="">不綁定腳本</option>
                  {comicScripts.map((script) => (
                    <option key={script.id} value={script.id}>{script.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>章節</label>
                <select className="select" value={pageForm.chapter_id} onChange={(event) => setPageForm({ ...pageForm, chapter_id: event.target.value })}>
                  <option value="">不綁定章節</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>{chapter.order_index}. {chapter.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>頁面布局</label>
                <select className="select" value={pageForm.layout_preset} onChange={(event) => setPageForm({ ...pageForm, layout_preset: event.target.value })}>
                  {COMIC_LAYOUT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>狀態</label>
                <select className="select" value={pageForm.status} onChange={(event) => setPageForm({ ...pageForm, status: event.target.value })}>
                  <option value="draft">草稿</option>
                  <option value="active">進行中</option>
                  <option value="approved">已確認</option>
                </select>
              </div>
              <div className="field">
                <label>頁面摘要</label>
                <textarea className="textarea small" value={pageForm.summary} onChange={(event) => setPageForm({ ...pageForm, summary: event.target.value })} />
              </div>
              <div className="field">
                <label>導演備註</label>
                <textarea className="textarea small" value={pageForm.notes} onChange={(event) => setPageForm({ ...pageForm, notes: event.target.value })} />
              </div>
              <div className="toolbar">
                <button className="button" disabled={busyKey === `save-page:${selectedPage.id}`}>{busyKey === `save-page:${selectedPage.id}` ? "儲存中..." : "儲存頁面"}</button>
                <button className="button-secondary" type="button" disabled={busyKey === `create-panel:${selectedPage.id}`} onClick={createPanel}>
                  {busyKey === `create-panel:${selectedPage.id}` ? "新增中..." : "新增畫格"}
                </button>
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => requestConfirm({
                    title: "刪除頁面",
                    message: `會刪除 ${formatComicPageTitle(selectedPage)}，連同其下所有畫格與圖片。`,
                    confirmLabel: "刪除頁面",
                    onConfirm: async () => {
                      await apiFetch(`/api/comic-pages/${selectedPage.id}`, { method: "DELETE", token });
                      await refreshProject({ projectId: project.id });
                      showFlash("success", "頁面已刪除。");
                    },
                  })}
                >
                  刪除頁面
                </button>
              </div>
            </form>

            <div className="list" style={{ marginTop: 18 }}>
              {(selectedPage.panels || []).map((panel) => {
                const draft = panelDrafts[panel.id] || comicPanelFormFromValue(panel);
                return (
                  <div key={panel.id} className="list-item">
                    <div className="title-row">
                      <strong>Panel {panel.panel_no}{panel.title ? ` · ${panel.title}` : ""}</strong>
                      <span className="tag">{panel.image_status || "pending"}</span>
                    </div>
                    <div className="grid two compact-grid">
                      <div className="field">
                        <label>標題</label>
                        <input className="input" value={draft.title} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, title: event.target.value } })} />
                      </div>
                      <div className="field">
                        <label>格號</label>
                        <input className="input" type="number" min="1" value={draft.panel_no} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, panel_no: event.target.value } })} />
                      </div>
                      <div className="field">
                        <label>景別</label>
                        <select className="select" value={draft.shot_type} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, shot_type: event.target.value } })}>
                          <option value="">未設定</option>
                          {COMIC_SHOT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>機位</label>
                        <select className="select" value={draft.camera_angle} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, camera_angle: event.target.value } })}>
                          <option value="">未設定</option>
                          {COMIC_CAMERA_ANGLES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>畫格事件 / beat</label>
                      <textarea className="textarea small" value={draft.script_text} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, script_text: event.target.value } })} />
                    </div>
                    <div className="field">
                      <label>對白 / 旁白</label>
                      <textarea className="textarea small" value={draft.dialogue_text} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, dialogue_text: event.target.value } })} />
                    </div>
                    <div className="field">
                      <label>構圖備註</label>
                      <textarea className="textarea small" value={draft.composition_notes} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, composition_notes: event.target.value } })} />
                    </div>
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                      <button className="button-secondary" onClick={() => savePanel(panel.id)} disabled={busyKey === `save-panel:${panel.id}`}>
                        {busyKey === `save-panel:${panel.id}` ? "儲存中..." : "儲存畫格"}
                      </button>
                      <button
                        className="button-danger"
                        onClick={() => requestConfirm({
                          title: "刪除畫格",
                          message: `會刪除 Panel ${panel.panel_no}，並重排本頁其他畫格。`,
                          confirmLabel: "刪除畫格",
                          onConfirm: async () => {
                            await apiFetch(`/api/comic-panels/${panel.id}`, { method: "DELETE", token });
                            await refreshProject({ projectId: project.id });
                            showFlash("success", "畫格已刪除。");
                          },
                        })}
                      >
                        刪除畫格
                      </button>
                    </div>
                  </div>
                );
              })}
              {!(selectedPage.panels || []).length ? <div className="empty-state">此頁還沒有畫格，先按上方的「新增畫格」。</div> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ComicPanelsPage({ token, project, comicPages, characters, refreshProject, requestConfirm, showFlash }) {
  const flattenedPanels = useMemo(() => flattenComicPanels(comicPages), [comicPages]);
  const [selectedPanelId, setSelectedPanelId] = useState(null);
  const [form, setForm] = useState(comicPanelFormFromValue(null));
  const [busyKey, setBusyKey] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  const selectedEntry = flattenedPanels.find((item) => item.id === selectedPanelId) || flattenedPanels[0] || null;
  const selectedPanel = selectedEntry || null;

  useEffect(() => {
    if (!flattenedPanels.length) {
      setSelectedPanelId(null);
      return;
    }
    if (!selectedPanelId || !flattenedPanels.some((item) => item.id === selectedPanelId)) {
      setSelectedPanelId(flattenedPanels[0].id);
    }
  }, [flattenedPanels, selectedPanelId]);

  useEffect(() => {
    setForm(comicPanelFormFromValue(selectedPanel));
    setImportUrl("");
    setUploadFile(null);
  }, [selectedPanel?.id, selectedPanel?.updated_at]);

  if (!project) {
    return <ComicWorkflowProjectRequired />;
  }

  async function savePanel() {
    if (!selectedPanel) return;
    setBusyKey(`save:${selectedPanel.id}`);
    try {
      await apiFetch(`/api/comic-panels/${selectedPanel.id}`, {
        method: "PATCH",
        token,
        body: {
          ...form,
          panel_no: form.panel_no ? Number(form.panel_no) : null,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "畫格生成設定已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新畫格生成設定失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function generateMockImage() {
    if (!selectedPanel) return;
    setBusyKey(`mock:${selectedPanel.id}`);
    try {
      await apiFetch(`/api/comic-panels/${selectedPanel.id}/image/mock-generate`, { method: "POST", token });
      await refreshProject({ projectId: project.id });
      showFlash("success", "已產生本地占位圖，可先審視畫面節奏與版面。");
    } catch (error) {
      showFlash("error", error.message || "生成占位圖失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function uploadImage() {
    if (!selectedPanel || !uploadFile) return;
    setBusyKey(`upload:${selectedPanel.id}`);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      await apiFetch(`/api/comic-panels/${selectedPanel.id}/image/upload`, {
        method: "POST",
        token,
        formData,
      });
      await refreshProject({ projectId: project.id });
      setUploadFile(null);
      showFlash("success", "畫格圖片已上傳。");
    } catch (error) {
      showFlash("error", error.message || "上傳圖片失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function importImage() {
    if (!selectedPanel || !importUrl.trim()) return;
    setBusyKey(`import:${selectedPanel.id}`);
    try {
      await apiFetch(`/api/comic-panels/${selectedPanel.id}/image/import`, {
        method: "POST",
        token,
        body: { url: importUrl.trim() },
      });
      await refreshProject({ projectId: project.id });
      setImportUrl("");
      showFlash("success", "遠端圖片已導入畫格。");
    } catch (error) {
      showFlash("error", error.message || "導入圖片失敗。");
    } finally {
      setBusyKey("");
    }
  }

  function toggleCharacter(characterId) {
    const exists = form.character_ids.includes(characterId);
    setForm({
      ...form,
      character_ids: exists ? form.character_ids.filter((id) => id !== characterId) : [...form.character_ids, characterId],
    });
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>畫格佇列</h2>
            <div className="subtext">集中檢查 prompt、角色引用與圖片生成結果。</div>
          </div>
          <span className="tag brand">{flattenedPanels.length} 格</span>
        </div>
        <div className="list">
          {flattenedPanels.map((entry) => (
            <button key={entry.id} className={`project-button ${selectedPanel?.id === entry.id ? "active" : ""}`} onClick={() => setSelectedPanelId(entry.id)}>
              <div className="title-row">
                <strong>第 {entry.page.page_no} 頁 · Panel {entry.panel_no}</strong>
                <span className="tag">{entry.image_status || "pending"}</span>
              </div>
              <div className="subtext">{entry.title || entry.prompt_text || entry.script_text || "尚未填寫 prompt"} </div>
            </button>
          ))}
          {!flattenedPanels.length ? <div className="empty-state">先到「分鏡工作台」建立頁面與畫格，再回來做圖像生成。</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>畫格生成控制台</h2>
            <div className="subtext">{selectedPanel ? `第 ${selectedPanel.page.page_no} 頁 / Panel ${selectedPanel.panel_no}` : "請先選取畫格"}</div>
          </div>
          {selectedPanel ? <span className="tag">{selectedPanel.image_status || "pending"}</span> : null}
        </div>
        {!selectedPanel ? (
          <div className="empty-state">選取畫格後，可以設定 prompt、綁定角色並生成本地占位圖或上傳正式圖片。</div>
        ) : (
          <>
            <div className="comic-artboard">
              {selectedPanel.image_url ? (
                <img src={selectedPanel.image_url} alt={selectedPanel.title || `panel-${selectedPanel.id}`} className="comic-panel-image" />
              ) : (
                <div className="comic-panel-placeholder">
                  <strong>尚未生成圖像</strong>
                  <span>可先用「生成占位圖」檢查節奏與構圖，再替換成正式畫格。</span>
                </div>
              )}
            </div>

            <form className="form-grid" onSubmit={async (event) => {
              event.preventDefault();
              await savePanel();
            }}>
              <div className="field">
                <label>標題</label>
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>
              <div className="field">
                <label>狀態</label>
                <select className="select" value={form.image_status} onChange={(event) => setForm({ ...form, image_status: event.target.value })}>
                  <option value="pending">pending</option>
                  <option value="generated">generated</option>
                  <option value="uploaded">uploaded</option>
                  <option value="imported">imported</option>
                  <option value="approved">approved</option>
                </select>
              </div>
              <div className="field">
                <label>Prompt</label>
                <textarea className="textarea" value={form.prompt_text} onChange={(event) => setForm({ ...form, prompt_text: event.target.value })} />
              </div>
              <div className="field">
                <label>Negative Prompt</label>
                <textarea className="textarea small" value={form.negative_prompt} onChange={(event) => setForm({ ...form, negative_prompt: event.target.value })} />
              </div>
              <div className="field">
                <label>腳本片段</label>
                <textarea className="textarea small" value={form.script_text} onChange={(event) => setForm({ ...form, script_text: event.target.value })} />
              </div>
              <div className="field">
                <label>對白 / 旁白</label>
                <textarea className="textarea small" value={form.dialogue_text} onChange={(event) => setForm({ ...form, dialogue_text: event.target.value })} />
              </div>
              <div className="field">
                <label>引用角色</label>
                <div className="checkbox-wall">
                  {characters.map((character) => (
                    <label key={character.id} className={`check-chip ${form.character_ids.includes(character.id) ? "active" : ""}`}>
                      <input type="checkbox" checked={form.character_ids.includes(character.id)} onChange={() => toggleCharacter(character.id)} />
                      <span>{character.name}</span>
                    </label>
                  ))}
                  {!characters.length ? <div className="subtext">目前沒有角色資料，可先到「角色設定」建立人物。</div> : null}
                </div>
              </div>
              <div className="toolbar">
                <button className="button" disabled={busyKey === `save:${selectedPanel.id}`}>{busyKey === `save:${selectedPanel.id}` ? "儲存中..." : "儲存設定"}</button>
                <button type="button" className="button-secondary" disabled={busyKey === `mock:${selectedPanel.id}`} onClick={generateMockImage}>
                  {busyKey === `mock:${selectedPanel.id}` ? "生成中..." : "生成占位圖"}
                </button>
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => requestConfirm({
                    title: "清空畫格圖片",
                    message: `會清空第 ${selectedPanel.page.page_no} 頁 Panel ${selectedPanel.panel_no} 目前的圖片檔。`,
                    confirmLabel: "清空圖片",
                    onConfirm: async () => {
                      await apiFetch(`/api/comic-panels/${selectedPanel.id}/image`, { method: "DELETE", token });
                      await refreshProject({ projectId: project.id });
                      showFlash("success", "畫格圖片已清空。");
                    },
                  })}
                >
                  清空圖片
                </button>
              </div>
            </form>

            <div className="toolbar">
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>上傳本地圖片</label>
                <input className="input" type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
              </div>
              <button className="button-secondary" disabled={!uploadFile || busyKey === `upload:${selectedPanel.id}`} onClick={uploadImage}>
                {busyKey === `upload:${selectedPanel.id}` ? "上傳中..." : "上傳圖片"}
              </button>
            </div>
            <div className="toolbar">
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>遠端圖片 URL</label>
                <input className="input" placeholder="https://..." value={importUrl} onChange={(event) => setImportUrl(event.target.value)} />
              </div>
              <button className="button-secondary" disabled={!importUrl.trim() || busyKey === `import:${selectedPanel.id}`} onClick={importImage}>
                {busyKey === `import:${selectedPanel.id}` ? "導入中..." : "導入圖片"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ComicPagePreview({ page }) {
  const panels = page?.panels || [];
  return (
    <div className={`page-preview-grid layout-${page?.layout_preset || "freeform"}`}>
      {panels.map((panel) => (
        <div key={panel.id} className="page-preview-card">
          {panel.image_url ? (
            <img src={panel.image_url} alt={panel.title || `panel-${panel.id}`} className="page-preview-image" />
          ) : (
            <div className="page-preview-empty">
              <strong>Panel {panel.panel_no}</strong>
              <span>{panel.title || panel.prompt_text || "待生成圖片"}</span>
            </div>
          )}
          <div className="page-preview-meta">
            <strong>Panel {panel.panel_no}</strong>
            <span>{panel.layout_notes || panel.dialogue_text || panel.script_text || "尚未填寫內容"}</span>
          </div>
        </div>
      ))}
      {!panels.length ? <div className="empty-state">本頁還沒有畫格。</div> : null}
    </div>
  );
}

function ComicLayoutPage({ token, project, comicPages, refreshProject, showFlash }) {
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [pageForm, setPageForm] = useState(defaultComicPageForm());
  const [panelDrafts, setPanelDrafts] = useState({});
  const [busyKey, setBusyKey] = useState("");

  const selectedPage = comicPages.find((item) => item.id === selectedPageId) || comicPages[0] || null;

  useEffect(() => {
    if (!comicPages.length) {
      setSelectedPageId(null);
      return;
    }
    if (!selectedPageId || !comicPages.some((item) => item.id === selectedPageId)) {
      setSelectedPageId(comicPages[0].id);
    }
  }, [comicPages, selectedPageId]);

  useEffect(() => {
    setPageForm(comicPageFormFromValue(selectedPage));
    const nextDrafts = {};
    (selectedPage?.panels || []).forEach((panel) => {
      nextDrafts[panel.id] = comicPanelFormFromValue(panel);
    });
    setPanelDrafts(nextDrafts);
  }, [selectedPage?.id, selectedPage?.updated_at]);

  if (!project) {
    return <ComicWorkflowProjectRequired />;
  }

  async function savePageLayout() {
    if (!selectedPage) return;
    setBusyKey(`save-layout:${selectedPage.id}`);
    try {
      await apiFetch(`/api/comic-pages/${selectedPage.id}`, {
        method: "PATCH",
        token,
        body: {
          layout_preset: pageForm.layout_preset,
          summary: pageForm.summary,
          notes: pageForm.notes,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "頁面排版設定已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新頁面排版失敗。");
    } finally {
      setBusyKey("");
    }
  }

  async function savePanelLayout(panelId) {
    const draft = panelDrafts[panelId];
    setBusyKey(`save-layout-panel:${panelId}`);
    try {
      await apiFetch(`/api/comic-panels/${panelId}`, {
        method: "PATCH",
        token,
        body: {
          panel_no: draft.panel_no ? Number(draft.panel_no) : null,
          layout_notes: draft.layout_notes,
        },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "畫格版位已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新畫格版位失敗。");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>頁面預覽</h2>
            <div className="subtext">用當前 layout preset 檢查閱讀動線與頁面節奏。</div>
          </div>
          <span className="tag brand">{comicPages.length} 頁</span>
        </div>
        <div className="list" style={{ marginBottom: 14 }}>
          {comicPages.map((page) => (
            <button key={page.id} className={`project-button ${selectedPage?.id === page.id ? "active" : ""}`} onClick={() => setSelectedPageId(page.id)}>
              <div className="title-row">
                <strong>{formatComicPageTitle(page)}</strong>
                <span className="tag">{page.layout_preset}</span>
              </div>
              <div className="subtext">{page.image_count || 0} / {page.panel_count || 0} 格已有圖片</div>
            </button>
          ))}
          {!comicPages.length ? <div className="empty-state">先到「分鏡工作台」建立頁面，或到「畫格生成」補圖。</div> : null}
        </div>
        {selectedPage ? <ComicPagePreview page={selectedPage} /> : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>排版控制</h2>
            <div className="subtext">{selectedPage ? formatComicPageTitle(selectedPage) : "請先選取頁面"}</div>
          </div>
        </div>
        {!selectedPage ? (
          <div className="empty-state">選一頁之後，可以調整 layout preset 與每格的版位說明。</div>
        ) : (
          <>
            <form className="form-grid" onSubmit={async (event) => {
              event.preventDefault();
              await savePageLayout();
            }}>
              <div className="field">
                <label>Layout Preset</label>
                <select className="select" value={pageForm.layout_preset} onChange={(event) => setPageForm({ ...pageForm, layout_preset: event.target.value })}>
                  {COMIC_LAYOUT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>頁面摘要</label>
                <textarea className="textarea small" value={pageForm.summary} onChange={(event) => setPageForm({ ...pageForm, summary: event.target.value })} />
              </div>
              <div className="field">
                <label>排版備註</label>
                <textarea className="textarea small" value={pageForm.notes} onChange={(event) => setPageForm({ ...pageForm, notes: event.target.value })} />
              </div>
              <button className="button" disabled={busyKey === `save-layout:${selectedPage.id}`}>{busyKey === `save-layout:${selectedPage.id}` ? "儲存中..." : "儲存頁面排版"}</button>
            </form>

            <div className="list" style={{ marginTop: 16 }}>
              {(selectedPage.panels || []).map((panel) => {
                const draft = panelDrafts[panel.id] || comicPanelFormFromValue(panel);
                return (
                  <div key={panel.id} className="list-item">
                    <div className="title-row">
                      <strong>Panel {panel.panel_no}</strong>
                      <span className="tag">{panel.image_status || "pending"}</span>
                    </div>
                    <div className="grid two compact-grid">
                      <div className="field">
                        <label>排序</label>
                        <input className="input" type="number" min="1" value={draft.panel_no} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, panel_no: event.target.value } })} />
                      </div>
                      <div className="field">
                        <label>版位註記</label>
                        <input className="input" value={draft.layout_notes} onChange={(event) => setPanelDrafts({ ...panelDrafts, [panel.id]: { ...draft, layout_notes: event.target.value } })} placeholder="例如：左上大框 / 右下留白" />
                      </div>
                    </div>
                    <button className="button-secondary" onClick={() => savePanelLayout(panel.id)} disabled={busyKey === `save-layout-panel:${panel.id}`}>
                      {busyKey === `save-layout-panel:${panel.id}` ? "儲存中..." : "儲存畫格版位"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ProjectModelSettingsPage({ token, project, refreshProject, showFlash, mode, profiles = [] }) {
  const [providerInfo, setProviderInfo] = useState(null);
  const [form, setForm] = useState(mode === "comic" ? COMIC_SETTINGS_DEFAULT : VIDEO_SETTINGS_DEFAULT);
  const [savingKey, setSavingKey] = useState("");
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const payload = await apiFetch("/api/system/providers", { token });
        setProviderInfo(payload);
      } catch (error) {
        showFlash("error", error.message);
      }
    })();
  }, [token]);

  useEffect(() => {
    const defaults = modelSettingsDefaults(mode, providerInfo);
    if (mode === "comic") {
      setForm(mergeModelSettings(defaults, project?.comic_settings));
    } else {
      setForm(mergeModelSettings(defaults, project?.video_settings));
    }
  }, [mode, project?.id, project?.comic_settings, project?.video_settings, providerInfo]);

  const comicCatalog = providerInfo?.catalog?.comic || {};
  const videoCatalog = providerInfo?.catalog?.video || {};
  const defaults = modelSettingsDefaults(mode, providerInfo);
  const profileKey = mode === "comic" ? "comic_settings" : "video_settings";
  const profileEndpoint = mode === "comic" ? "comic-profiles" : "video-profiles";
  const pageLabel = mode === "comic" ? "漫畫" : "Video";

  async function saveProjectSettings(value) {
    if (!project) return;
    setSavingKey(profileKey);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        token,
        body: { [profileKey]: value },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", profileKey === "comic_settings" ? "漫畫設定已儲存。" : "Video 設定已儲存。");
    } catch (error) {
      showFlash("error", error.message || "設定儲存失敗。");
    } finally {
      setSavingKey("");
    }
  }

  async function createProfileFromCurrent() {
    if (!project) return;
    if (!profileName.trim()) {
      showFlash("error", `請先輸入${pageLabel}設定名稱。`);
      return;
    }
    setSavingKey(`${profileEndpoint}:create`);
    try {
      await apiFetch(`/api/projects/${project.id}/${profileEndpoint}`, {
        method: "POST",
        token,
        body: {
          name: profileName.trim(),
          settings: form,
        },
      });
      await refreshProject({ projectId: project.id });
      setProfileName("");
      showFlash("success", `${pageLabel}設定已建立。`);
    } catch (error) {
      showFlash("error", error.message || "建立設定失敗。");
    } finally {
      setSavingKey("");
    }
  }

  async function applyProfile(profile) {
    const nextSettings = mergeModelSettings(defaults, profile.settings);
    setForm(nextSettings);
    await saveProjectSettings(nextSettings);
  }

  if (mode === "comic") {
    return (
      <div className="grid two">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>漫畫設定</h2>
              <div className="subtext">{project ? `目前專案：${project.title}` : "請先選取專案"}</div>
            </div>
            <span className={`tag ${form.enabled ? "brand" : ""}`}>{form.enabled ? "已啟用" : "未啟用"}</span>
          </div>
          {!project ? (
            <div className="empty-state">請先回到專案頁選取一個專案，再設定漫畫模型。</div>
          ) : (
            <form className="form-grid" onSubmit={async (event) => {
              event.preventDefault();
              await saveProjectSettings(form);
            }}>
              <div className="field">
                <label>啟用</label>
                <select className="select" value={form.enabled ? "true" : "false"} onChange={(event) => setForm({ ...form, enabled: event.target.value === "true" })}>
                  <option value="false">未啟用</option>
                  <option value="true">啟用</option>
                </select>
              </div>
              <div className="field">
                <label>劇本模型</label>
                <select className="select" value={form.script_model} onChange={(event) => setForm({ ...form, script_model: event.target.value })}>
                  {(comicCatalog.script_models || [defaults.script_model]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>分鏡模型</label>
                <select className="select" value={form.storyboard_model} onChange={(event) => setForm({ ...form, storyboard_model: event.target.value })}>
                  {(comicCatalog.storyboard_models || [defaults.storyboard_model]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>圖像模型</label>
                <select className="select" value={form.image_model} onChange={(event) => setForm({ ...form, image_model: event.target.value })}>
                  {(comicCatalog.image_models || [defaults.image_model]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>風格預設</label>
                <select className="select" value={form.style_preset} onChange={(event) => setForm({ ...form, style_preset: event.target.value })}>
                  {(comicCatalog.style_presets || [defaults.style_preset]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>色彩模式</label>
                <select className="select" value={form.color_mode} onChange={(event) => setForm({ ...form, color_mode: event.target.value })}>
                  {(comicCatalog.color_modes || [defaults.color_mode]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>畫幅比例</label>
                <select className="select" value={form.aspect_ratio} onChange={(event) => setForm({ ...form, aspect_ratio: event.target.value })}>
                  {(comicCatalog.aspect_ratios || [defaults.aspect_ratio]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>角色一致性</label>
                <select className="select" value={form.character_consistency} onChange={(event) => setForm({ ...form, character_consistency: event.target.value })}>
                  {(comicCatalog.character_consistency_levels || [defaults.character_consistency]).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>負面提示</label>
                <textarea className="textarea small" value={form.negative_prompt} onChange={(event) => setForm({ ...form, negative_prompt: event.target.value })} />
              </div>
              <button className="button" disabled={savingKey === "comic_settings"}>{savingKey === "comic_settings" ? "儲存中..." : "儲存漫畫設定"}</button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>已建立的漫畫設定</h2>
              <div className="subtext">可把目前表單另存為設定樣板，再快速套用到目前專案。</div>
            </div>
            <span className="tag">{profiles.length} 組</span>
          </div>
          {!project ? (
            <div className="empty-state">請先選取專案後，再建立漫畫設定。</div>
          ) : (
            <>
              <div className="toolbar">
                <input className="input" placeholder="新的漫畫設定名稱" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                <button className="button-secondary" disabled={savingKey === "comic-profiles:create"} onClick={createProfileFromCurrent}>
                  {savingKey === "comic-profiles:create" ? "建立中..." : "以目前內容建立"}
                </button>
              </div>
              <div className="list">
                {profiles.map((profile) => (
                  <div key={profile.id} className="list-item">
                    <div className="title-row">
                      <strong>{profile.name}</strong>
                      <span className="tag">{profile.project_id ? "專案" : "系統"}</span>
                    </div>
                    <div className="pill-row" style={{ marginTop: 10 }}>
                      <span className="tag">{profile.settings.script_model}</span>
                      <span className="tag">{profile.settings.image_model}</span>
                      <span className="tag">{profile.settings.aspect_ratio}</span>
                    </div>
                    <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                      <button className="button-secondary" onClick={() => applyProfile(profile)}>套用到目前專案</button>
                    </div>
                  </div>
                ))}
                {!profiles.length ? <div className="empty-state">尚未建立漫畫設定。</div> : null}
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Video 設定</h2>
            <div className="subtext">{project ? `目前專案：${project.title}` : "請先選取專案"}</div>
          </div>
          <span className={`tag ${form.enabled ? "brand" : ""}`}>{form.enabled ? "已啟用" : "未啟用"}</span>
        </div>
        {!project ? (
          <div className="empty-state">請先回到專案頁選取一個專案，再設定影片模型。</div>
        ) : (
          <form className="form-grid" onSubmit={async (event) => {
            event.preventDefault();
            await saveProjectSettings(form);
          }}>
            <div className="field">
              <label>啟用</label>
              <select className="select" value={form.enabled ? "true" : "false"} onChange={(event) => setForm({ ...form, enabled: event.target.value === "true" })}>
                <option value="false">未啟用</option>
                <option value="true">啟用</option>
              </select>
            </div>
            <div className="field">
              <label>腳本模型</label>
              <select className="select" value={form.script_model} onChange={(event) => setForm({ ...form, script_model: event.target.value })}>
                {(videoCatalog.script_models || [defaults.script_model]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>鏡頭模型</label>
              <select className="select" value={form.shot_model} onChange={(event) => setForm({ ...form, shot_model: event.target.value })}>
                {(videoCatalog.shot_models || [defaults.shot_model]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>圖像模型</label>
              <select className="select" value={form.image_model} onChange={(event) => setForm({ ...form, image_model: event.target.value })}>
                {(videoCatalog.image_models || [defaults.image_model]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>影片模型</label>
              <select className="select" value={form.video_model} onChange={(event) => setForm({ ...form, video_model: event.target.value })}>
                {(videoCatalog.video_models || [defaults.video_model]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>字幕模型</label>
              <select className="select" value={form.subtitle_model} onChange={(event) => setForm({ ...form, subtitle_model: event.target.value })}>
                {(videoCatalog.subtitle_models || [defaults.subtitle_model]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>畫幅比例</label>
              <select className="select" value={form.aspect_ratio} onChange={(event) => setForm({ ...form, aspect_ratio: event.target.value })}>
                {(videoCatalog.aspect_ratios || [defaults.aspect_ratio]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>時長</label>
              <select className="select" value={String(form.duration_seconds)} onChange={(event) => setForm({ ...form, duration_seconds: Number(event.target.value) })}>
                {(videoCatalog.duration_options || [defaults.duration_seconds]).map((item) => (
                  <option key={item} value={String(item)}>{item} 秒</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>動態風格</label>
              <select className="select" value={form.motion_style} onChange={(event) => setForm({ ...form, motion_style: event.target.value })}>
                {(videoCatalog.motion_styles || [defaults.motion_style]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>負面提示</label>
              <textarea className="textarea small" value={form.negative_prompt} onChange={(event) => setForm({ ...form, negative_prompt: event.target.value })} />
            </div>
            <button className="button" disabled={savingKey === "video_settings"}>{savingKey === "video_settings" ? "儲存中..." : "儲存 Video 設定"}</button>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>已建立的 Video 設定</h2>
            <div className="subtext">先調好目前表單，再另存成樣板，之後可一鍵套用。</div>
          </div>
          <span className="tag">{profiles.length} 組</span>
        </div>
        {!project ? (
          <div className="empty-state">請先選取專案後，再建立 Video 設定。</div>
        ) : (
          <>
            <div className="toolbar">
              <input className="input" placeholder="新的 Video 設定名稱" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              <button className="button-secondary" disabled={savingKey === "video-profiles:create"} onClick={createProfileFromCurrent}>
                {savingKey === "video-profiles:create" ? "建立中..." : "以目前內容建立"}
              </button>
            </div>
            <div className="list">
              {profiles.map((profile) => (
                <div key={profile.id} className="list-item">
                  <div className="title-row">
                    <strong>{profile.name}</strong>
                    <span className="tag">{profile.project_id ? "專案" : "系統"}</span>
                  </div>
                  <div className="pill-row" style={{ marginTop: 10 }}>
                    <span className="tag">{profile.settings.script_model}</span>
                    <span className="tag">{profile.settings.video_model}</span>
                    <span className="tag">{profile.settings.duration_seconds} 秒</span>
                  </div>
                  <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                    <button className="button-secondary" onClick={() => applyProfile(profile)}>套用到目前專案</button>
                  </div>
                </div>
              ))}
              {!profiles.length ? <div className="empty-state">尚未建立 Video 設定。</div> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ComicSettingsPage({ token, project, comicProfiles, refreshProject, showFlash }) {
  return (
    <ProjectModelSettingsPage
      mode="comic"
      token={token}
      project={project}
      profiles={comicProfiles}
      refreshProject={refreshProject}
      showFlash={showFlash}
    />
  );
}

function VideoSettingsPage({ token, project, videoProfiles, refreshProject, showFlash }) {
  return (
    <ProjectModelSettingsPage
      mode="video"
      token={token}
      project={project}
      profiles={videoProfiles}
      refreshProject={refreshProject}
      showFlash={showFlash}
    />
  );
}

function GeneratePage({ token, project, selectedChapter, selectedChapterId, setSelectedChapterId, voices, segments, jobs, refreshProject, requestConfirm, showFlash }) {
  const [busyAction, setBusyAction] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [segmentPage, setSegmentPage] = useState(1);
  const [segmentPageSize, setSegmentPageSize] = useState(10);
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);

  const totalSegmentPages = Math.max(1, Math.ceil(segments.length / segmentPageSize));
  const pagedSegments = useMemo(() => {
    const start = (segmentPage - 1) * segmentPageSize;
    return segments.slice(start, start + segmentPageSize);
  }, [segments, segmentPage, segmentPageSize]);
  const totalJobPages = Math.max(1, Math.ceil(jobs.length / jobPageSize));
  const pagedJobs = useMemo(() => {
    const start = (jobPage - 1) * jobPageSize;
    return jobs.slice(start, start + jobPageSize);
  }, [jobs, jobPage, jobPageSize]);

  useEffect(() => {
    setSegmentPage(1);
  }, [selectedChapter?.id, segments.length]);

  useEffect(() => {
    setJobPage(1);
  }, [selectedChapter?.id, jobs.length]);

  useEffect(() => {
    if (segmentPage > totalSegmentPages) {
      setSegmentPage(totalSegmentPages);
    }
  }, [segmentPage, totalSegmentPages]);

  useEffect(() => {
    if (jobPage > totalJobPages) {
      setJobPage(totalJobPages);
    }
  }, [jobPage, totalJobPages]);

  function previewSummaryLines(preview) {
    const voice = preview.voice_profile || {};
    const lines = [
      `將提交 ${preview.queueable_segment_count} 段生成任務。`,
      `預設聲線：${voice.name || "未命名聲線"} / ${voice.provider || "未知"} / ${voice.model || "未知模型"}。`,
    ];
    if (preview.chapter_count) {
      lines.unshift(`會覆蓋整個專案，共 ${preview.chapter_count} 個章節。`);
    }
    if (preview.cleared_override_count) {
      lines.push(`會清除 ${preview.cleared_override_count} 個段落角色或聲線覆寫。`);
    } else {
      lines.push("目前沒有段落角色或聲線覆寫。");
    }
    if (preview.is_elevenlabs) {
      lines.push("目前使用 ElevenLabs。實際 credits 取決於總字符數與生成段數，長文本批量生成請留意額度。");
    }
    return lines.join(" ");
  }

  async function generateSelectedChapter() {
    if (!selectedChapter) return;
    setBusyAction("chapter");
    try {
      await apiFetch(`/api/chapters/${selectedChapter.id}/generate`, { method: "POST", token });
      await refreshProject({ chapterId: selectedChapter.id });
      showFlash("success", "整章生成任務已建立。");
    } catch (error) {
      showFlash("error", error.message || "整章生成失敗。");
    } finally {
      setBusyAction("");
    }
  }

  async function requestGenerateWithDefaultVoice() {
    if (!selectedChapter) return;
    if (!project?.default_voice_profile_id) {
      showFlash("error", "請先在聲線設定裡設定專案預設聲線。");
      return;
    }
    let preview;
    try {
      preview = await apiFetch(`/api/chapters/${selectedChapter.id}/generate-with-default-voice/preview`, { token });
    } catch (error) {
      showFlash("error", error.message || "無法取得生成預估。");
      return;
    }
    requestConfirm({
      title: "統一使用專案預設聲線",
      message: previewSummaryLines(preview),
      confirmLabel: "清除覆寫並生成",
      onConfirm: async () => {
        setBusyAction("default");
        try {
          const payload = await apiFetch(`/api/chapters/${selectedChapter.id}/generate-with-default-voice`, { method: "POST", token });
          await refreshProject({ chapterId: selectedChapter.id });
          showFlash("success", `已建立 ${payload.job_ids.length} 筆任務，並清除 ${payload.cleared_override_count} 個覆寫。`);
        } finally {
          setBusyAction("");
        }
      },
    });
  }

  async function requestGenerateProjectWithDefaultVoice() {
    if (!project) return;
    if (!project.default_voice_profile_id) {
      showFlash("error", "請先在聲線設定裡設定專案預設聲線。");
      return;
    }
    let preview;
    try {
      preview = await apiFetch(`/api/projects/${project.id}/generate-with-default-voice/preview`, { token });
    } catch (error) {
      showFlash("error", error.message || "無法取得生成預估。");
      return;
    }
    requestConfirm({
      title: "整個專案統一使用預設聲線",
      message: previewSummaryLines(preview),
      confirmLabel: "清除全專案覆寫並生成",
      onConfirm: async () => {
        setBusyAction("project-default");
        try {
          const payload = await apiFetch(`/api/projects/${project.id}/generate-with-default-voice`, { method: "POST", token });
          await refreshProject({ projectId: project.id, chapterId: selectedChapter?.id || project.chapters?.[0]?.id || null });
          showFlash("success", `已為 ${payload.chapter_count} 個章節建立 ${payload.job_ids.length} 筆任務，並清除 ${payload.cleared_override_count} 個覆寫。`);
        } finally {
          setBusyAction("");
        }
      },
    });
  }

  async function updateDefaultVoice(nextVoiceId) {
    if (!project) return;
    setVoiceBusy(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        token,
        body: {
          default_voice_profile_id: nextVoiceId ? Number(nextVoiceId) : null,
        },
      });
      await refreshProject({ projectId: project.id, chapterId: selectedChapterId || project.chapters?.[0]?.id || null });
      showFlash("success", "專案預設聲線已更新。");
    } catch (error) {
      showFlash("error", error.message || "更新專案預設聲線失敗。");
    } finally {
      setVoiceBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>生成任務</h2>
            <div className="subtext">本機版使用 FastAPI BackgroundTasks，不另外啟動 worker。</div>
          </div>
          {selectedChapter ? <span className="tag brand">目前：{selectedChapter.order_index}. {selectedChapter.title}</span> : null}
        </div>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            章節
            <select
              className="select"
              value={selectedChapterId || ""}
              onChange={(event) => setSelectedChapterId(Number(event.target.value))}
            >
              {(project?.chapters || []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.order_index}. {chapter.title} ({chapter.segment_count} 段)
                </option>
              ))}
            </select>
          </label>
          <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            預設聲線
            <select
              className="select"
              disabled={voiceBusy || !voices.length}
              value={project?.default_voice_profile_id ? String(project.default_voice_profile_id) : ""}
              onChange={(event) => updateDefaultVoice(event.target.value)}
            >
              {!voices.length ? <option value="">尚無可用聲線</option> : null}
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} / {voice.provider} / {voice.model}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar">
          {selectedChapter ? (
            <>
              <button className="button" disabled={busyAction !== ""} onClick={generateSelectedChapter}>
                {busyAction === "chapter" ? "建立任務中..." : "生成目前章節"}
              </button>
              <button className="button-secondary" disabled={busyAction !== ""} onClick={requestGenerateWithDefaultVoice}>
                {busyAction === "default" ? "建立任務中..." : "使用專案預設聲線批量生成"}
              </button>
              <button className="button-secondary" disabled={busyAction !== ""} onClick={requestGenerateProjectWithDefaultVoice}>
                {busyAction === "project-default" ? "建立任務中..." : "整個專案統一聲線批量生成"}
              </button>
            </>
          ) : null}
        </div>
        <div className="pager-row">
          <div className="subtext">共 {segments.length} 段，第 {segmentPage} / {totalSegmentPages} 頁</div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="subtext">
              每頁
              <select className="select pager-select" value={segmentPageSize} onChange={(event) => setSegmentPageSize(Number(event.target.value))}>
                {SEGMENT_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} 段</option>
                ))}
              </select>
            </label>
            <button className="button-secondary" disabled={segmentPage <= 1} onClick={() => setSegmentPage((current) => Math.max(1, current - 1))}>上一頁</button>
            <button className="button-secondary" disabled={segmentPage >= totalSegmentPages} onClick={() => setSegmentPage((current) => Math.min(totalSegmentPages, current + 1))}>下一頁</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>段落</th>
              <th>狀態</th>
              <th>版本</th>
            </tr>
          </thead>
          <tbody>
            {pagedSegments.map((segment) => (
              <tr key={segment.id}>
                <td>
                  <strong>{segment.order_index}</strong>
                  <div className="subtext">{segment.tts_text.slice(0, 52)}...</div>
                </td>
                <td><span className="tag">{statusLabel(segment.status)}</span></td>
                <td>{segment.latest_take ? `v${segment.latest_take.version_no}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>任務紀錄</h2>
            <div className="subtext">最近 80 筆任務紀錄。</div>
          </div>
        </div>
        <div className="pager-row">
          <div className="subtext">共 {jobs.length} 筆，第 {jobPage} / {totalJobPages} 頁</div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="subtext">
              每頁
              <select className="select pager-select" value={jobPageSize} onChange={(event) => setJobPageSize(Number(event.target.value))}>
                {SEGMENT_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} 筆</option>
                ))}
              </select>
            </label>
            <button className="button-secondary" disabled={jobPage <= 1} onClick={() => setJobPage((current) => Math.max(1, current - 1))}>上一頁</button>
            <button className="button-secondary" disabled={jobPage >= totalJobPages} onClick={() => setJobPage((current) => Math.min(totalJobPages, current + 1))}>下一頁</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>任務</th>
              <th>狀態</th>
              <th>請求編號</th>
              <th>更新時間</th>
            </tr>
          </thead>
          <tbody>
            {pagedJobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <strong>{jobTypeLabel(job.job_type)}</strong>
                  <div className="subtext">段落 #{job.segment_id || "—"}</div>
                </td>
                <td><span className={`tag ${job.status === "failed" ? "danger" : job.status === "succeeded" ? "success" : job.status === "running" ? "brand" : ""}`}>{statusLabel(job.status)}</span></td>
                <td className="code">{job.request_id || "等待中"}</td>
                <td>{relativeTime(job.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ReviewPage({ token, reviewQueue, refreshProject, showFlash }) {
  const [selectedId, setSelectedId] = useState(null);
  const [issues, setIssues] = useState([]);
  const [takes, setTakes] = useState([]);
  const [newIssue, setNewIssue] = useState({ issue_type: "manual_review", severity: "medium", description: "" });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize, setReviewPageSize] = useState(10);

  const current = reviewQueue.find((segment) => segment.id === selectedId) || reviewQueue[0] || null;
  const totalReviewPages = Math.max(1, Math.ceil(reviewQueue.length / reviewPageSize));
  const pagedReviewQueue = useMemo(() => {
    const start = (reviewPage - 1) * reviewPageSize;
    return reviewQueue.slice(start, start + reviewPageSize);
  }, [reviewQueue, reviewPage, reviewPageSize]);

  useEffect(() => {
    if (!selectedId && reviewQueue[0]) {
      setSelectedId(reviewQueue[0].id);
    }
  }, [reviewQueue, selectedId]);

  useEffect(() => {
    setReviewPage(1);
  }, [reviewQueue.length]);

  useEffect(() => {
    if (reviewPage > totalReviewPages) {
      setReviewPage(totalReviewPages);
    }
  }, [reviewPage, totalReviewPages]);

  useEffect(() => {
    if (!current) return;
    const index = reviewQueue.findIndex((segment) => segment.id === current.id);
    if (index < 0) return;
    const nextPage = Math.floor(index / reviewPageSize) + 1;
    if (nextPage !== reviewPage) {
      setReviewPage(nextPage);
    }
  }, [current?.id, reviewPage, reviewPageSize, reviewQueue]);

  function goToReviewPage(nextPage) {
    const targetPage = Math.max(1, Math.min(totalReviewPages, nextPage));
    const start = (targetPage - 1) * reviewPageSize;
    const nextSegment = reviewQueue[start] || null;
    setReviewPage(targetPage);
    if (nextSegment) {
      setSelectedId(nextSegment.id);
    }
  }

  useEffect(() => {
    if (current) {
      (async () => {
        const [issuePayload, takePayload] = await Promise.all([
          apiFetch(`/api/segments/${current.id}/issues`, { token }),
          apiFetch(`/api/segments/${current.id}/takes`, { token }),
        ]);
        setIssues(issuePayload.items || []);
        setTakes(takePayload.items || []);
      })();
    } else {
      setIssues([]);
      setTakes([]);
    }
  }, [current?.id, token]);

  if (!reviewQueue.length) {
    return <div className="empty-state">目前沒有待審核段落。請先到生成任務建立音訊。</div>;
  }

  return (
    <div className="grid three">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>審核佇列</h3>
            <div className="subtext">有問題的段落優先。</div>
          </div>
        </div>
        <div className="pager-row">
          <div className="subtext">共 {reviewQueue.length} 段，第 {reviewPage} / {totalReviewPages} 頁</div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="subtext">
              每頁
              <select className="select pager-select" value={reviewPageSize} onChange={(event) => setReviewPageSize(Number(event.target.value))}>
                {SEGMENT_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} 段</option>
                ))}
              </select>
            </label>
            <button className="button-secondary" disabled={reviewPage <= 1} onClick={() => goToReviewPage(reviewPage - 1)}>上一頁</button>
            <button className="button-secondary" disabled={reviewPage >= totalReviewPages} onClick={() => goToReviewPage(reviewPage + 1)}>下一頁</button>
          </div>
        </div>
        <div className="list">
          {pagedReviewQueue.map((segment) => (
            <button key={segment.id} className={`project-button ${current?.id === segment.id ? "active" : ""}`} onClick={() => setSelectedId(segment.id)}>
              <div className="title-row">
                <strong>段落 {segment.order_index}</strong>
                <span className="count-pill">{segment.open_issue_count || 0}</span>
              </div>
              <div className="subtext">{statusLabel(segment.status)} · QC {segment.qc_score || 0}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>播放器與 Diff</h3>
            <div className="subtext">本機版 ASR/QC 為規則化模擬，但審核流程已完整。</div>
          </div>
        </div>
        {current ? (
          <>
            <div className="editor-card">
              <div className="eyebrow">朗讀稿</div>
              <div>{current.tts_text}</div>
            </div>
            <div className="editor-card" style={{ marginTop: 12 }}>
              <div className="eyebrow">模擬 ASR</div>
              <div>{current.asr_text || "尚未生成"}</div>
            </div>
            {current.latest_take?.file_url ? (
              <audio className="review-audio" controls src={current.latest_take.file_url}></audio>
            ) : (
              <div className="empty-state" style={{ marginTop: 12 }}>目前段落還沒有音訊版本。</div>
            )}
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="button" onClick={async () => {
                await apiFetch(`/api/segments/${current.id}/approve`, { method: "POST", token });
                await refreshProject();
                showFlash("success", "目前段落已通過。");
              }}>
                通過
              </button>
              <button className="button-danger" onClick={async () => {
                await apiFetch(`/api/segments/${current.id}/reject`, { method: "POST", token, body: { description: "需要再重做一次。" } });
                await refreshProject();
                showFlash("success", "目前段落已退回。");
              }}>
                退回
              </button>
              <button className="button-secondary" onClick={async () => {
                await apiFetch(`/api/segments/${current.id}/generate`, { method: "POST", token });
                await refreshProject();
                showFlash("success", "已重新建立生成任務。");
              }}>
                重新生成
              </button>
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-head">
                <div>
                  <h3>版本歷史</h3>
                  <div className="subtext">最近版本</div>
                </div>
              </div>
              <div className="list">
                {takes.map((take) => (
                  <div key={take.id} className="list-item">
                    <div className="title-row">
                      <strong>v{take.version_no}</strong>
                      <span className="tag">{sourceKindLabel(take.source_kind)}</span>
                    </div>
                    <div className="subtext">{take.duration_seconds}s · {take.request_id || "本機"}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>問題清單</h3>
            <div className="subtext">自動問題 + 人工問題</div>
          </div>
        </div>
        <div className="list">
          {issues.map((issue) => (
            <div key={issue.id} className="list-item">
              <div className="title-row">
                <strong>{issueTypeLabel(issue.issue_type)}</strong>
                <span className={`tag ${issue.status === "resolved" ? "success" : issue.severity === "high" ? "danger" : "warn"}`}>{statusLabel(issue.status)}</span>
              </div>
              <div className="subtext">{issue.description}</div>
            </div>
          ))}
        </div>
        <form className="form-grid" style={{ marginTop: 18 }} onSubmit={async (event) => {
          event.preventDefault();
          if (!current) return;
          await apiFetch(`/api/segments/${current.id}/issues`, { method: "POST", token, body: newIssue });
          setNewIssue({ issue_type: "manual_review", severity: "medium", description: "" });
          await refreshProject();
          showFlash("success", "人工問題已建立。");
        }}>
          <div className="field">
            <label>問題類型</label>
            <select className="select" value={newIssue.issue_type} onChange={(event) => setNewIssue({ ...newIssue, issue_type: event.target.value })}>
              <option value="manual_review">人工複核</option>
              <option value="pronunciation">發音問題</option>
              <option value="pacing">節奏問題</option>
              <option value="missing_words">漏讀</option>
            </select>
          </div>
          <div className="field">
            <label>說明</label>
            <textarea className="textarea small" value={newIssue.description} onChange={(event) => setNewIssue({ ...newIssue, description: event.target.value })} />
          </div>
          <button className="button-secondary">新增人工問題</button>
        </form>
      </section>
    </div>
  );
}

function ExportPage({ token, project, selectedChapter, selectedChapterId, setSelectedChapterId, renders, exportsList, refreshProject, showFlash }) {
  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>章節渲染</h2>
            <div className="subtext">先把已通過的段落拼成章節 wav。</div>
          </div>
          {selectedChapter ? <span className="tag brand">目前：{selectedChapter.order_index}. {selectedChapter.title}</span> : null}
        </div>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            章節
            <select
              className="select"
              value={selectedChapterId || ""}
              onChange={(event) => setSelectedChapterId(Number(event.target.value))}
            >
              {(project?.chapters || []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.order_index}. {chapter.title} ({chapter.segment_count} 段)
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar">
          {selectedChapter ? (
            <button className="button" onClick={async () => {
              await apiFetch(`/api/chapters/${selectedChapter.id}/render`, { method: "POST", token });
              await refreshProject();
              showFlash("success", "章節渲染任務已建立。");
            }}>
              渲染目前章節
            </button>
          ) : null}
        </div>
        <div className="list">
          {renders.map((render) => (
            <div key={render.id} className="list-item">
              <div className="title-row">
                <strong>渲染 v{render.render_version}</strong>
                <span className={`tag ${render.status === "succeeded" ? "success" : render.status === "failed" ? "danger" : "brand"}`}>{statusLabel(render.status)}</span>
              </div>
              {render.file_url ? <audio className="review-audio" controls src={render.file_url}></audio> : null}
            </div>
          ))}
          {!renders.length ? <div className="empty-state">目前章節還沒有渲染結果。</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>專案匯出</h2>
            <div className="subtext">匯出 zip，內含章節 render 與 manifest。</div>
          </div>
        </div>
        <div className="toolbar">
          <button className="button" onClick={async () => {
            await apiFetch(`/api/projects/${project.id}/export`, { method: "POST", token });
            await refreshProject();
            showFlash("success", "匯出任務已建立。");
          }}>
            匯出 ZIP
          </button>
        </div>
        <div className="list">
          {exportsList.map((item) => (
            <div key={item.id} className="list-item">
              <div className="title-row">
                <strong>{item.export_type}</strong>
                <span className={`tag ${item.status === "succeeded" ? "success" : item.status === "failed" ? "danger" : "brand"}`}>{statusLabel(item.status)}</span>
              </div>
              <div className="subtext">{relativeTime(item.created_at)}</div>
              {item.file_url ? (
                <a className="button-secondary" href={item.file_url} download style={{ display: "inline-flex", marginTop: 10 }}>
                  下載 ZIP
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsPage({ token, project }) {
  const [providerInfo, setProviderInfo] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const payload = await apiFetch("/api/system/providers", { token });
        setProviderInfo(payload);
      } catch {}
    })();
  }, [token]);

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>本機運行環境</h2>
            <div className="subtext">目前本機版架構限制</div>
          </div>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>前端</strong>
            <div className="subtext">免建置 React 風格 SPA，由 FastAPI 直接提供靜態頁面。</div>
          </div>
          <div className="list-item">
            <strong>後端</strong>
            <div className="subtext">FastAPI + SQLite + 本地檔案儲存。</div>
          </div>
          <div className="list-item">
            <strong>語音</strong>
            <div className="subtext">macOS say + afconvert + WAV 串接。</div>
          </div>
          {providerInfo ? (
            <div className="list-item">
              <strong>真實 AI Provider 狀態</strong>
              <div className="pill-row" style={{ marginTop: 10 }}>
                <span className={`tag ${providerInfo.providers?.openai?.configured ? "success" : "warn"}`}>OpenAI {providerInfo.providers?.openai?.configured ? "已配置" : "未配置"}</span>
                <span className={`tag ${providerInfo.providers?.elevenlabs?.configured ? "success" : "warn"}`}>ElevenLabs {providerInfo.providers?.elevenlabs?.configured ? "已配置" : "未配置"}</span>
              </div>
              <div className="subtext" style={{ marginTop: 10 }}>
                預設 ASR provider：{providerInfo.defaults?.asr_provider || "auto"}
              </div>
              <div className="subtext" style={{ marginTop: 8 }}>
                模型註冊表：{providerInfo.registry?.path || "config/model_registry.yaml"}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>多模態規劃</h2>
            <div className="subtext">漫畫與 Video 目前都使用獨立頁面，並支援建立可重用的設定樣板。</div>
          </div>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>漫畫設定</strong>
            <div className="subtext">請到左側「漫畫設定」頁編輯目前專案配置，或以目前內容另存新的樣板。</div>
          </div>
          <div className="list-item">
            <strong>Video 設定</strong>
            <div className="subtext">請到左側「Video 設定」頁編輯目前專案配置，或以目前內容另存新的樣板。</div>
          </div>
          <div className="list-item">
            <strong>目前選中專案</strong>
            <div className="subtext">{project ? `${project.title} 可直接在漫畫設定與 Video 設定頁編輯並套用樣板。` : "請先選取專案後，再到左側的漫畫設定或 Video 設定頁編輯。"}</div>
          </div>
          <div className="list-item">
            <strong>環境變數</strong>
            <div className="subtext">可在 `.env.local` 中設定 `OPENAI_API_KEY`、`ELEVENLABS_API_KEY` 與 `AI_PUBLISHER_ASR_PROVIDER`。</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({ state, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBusy(false);
    setError("");
  }, [state?.id]);

  if (!state) return null;

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>{state.title || "請確認"}</h2>
            <div className="subtext">{state.message || "此動作可能影響現有資料。"}</div>
          </div>
          <span className="tag danger">不可復原</span>
        </div>
        {error ? <div className="flash error">{error}</div> : null}
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button className="button-secondary" disabled={busy} onClick={onClose}>取消</button>
          <button
            className="button-danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await state.onConfirm?.();
                onClose();
              } catch (err) {
                setError(err.message || "操作失敗");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "處理中..." : state.confirmLabel || "確認"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCreateModal({ open, token, onClose, onCreated, showFlash }) {
  const [form, setForm] = useState({ title: "", author: "", language: "zh-CN", description: "", project_type: "audiobook" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ title: "", author: "", language: "zh-CN", description: "", project_type: "audiobook" });
    setBusy(false);
    setError("");
  }, [open]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("請先輸入專案標題。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await apiFetch("/api/projects", { method: "POST", token, body: form });
      await onCreated?.(payload.project);
      showFlash("success", "新專案已建立。");
    } catch (err) {
      setError(err.message || "建立專案失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal-card modal-card-form" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>建立專案</h2>
            <div className="subtext">只填最少欄位即可開始。</div>
          </div>
        </div>
        {error ? <div className="flash error">{error}</div> : null}
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label>標題</label>
            <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="field">
            <label>作者</label>
            <input className="input" value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
          </div>
          <div className="field">
            <label>語言</label>
            <select className="select" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
              <option value="zh-CN">zh-CN</option>
              <option value="en-US">en-US</option>
              <option value="en-GB">en-GB</option>
            </select>
          </div>
          <div className="field">
            <label>專案類型</label>
            <select className="select" value={form.project_type} onChange={(event) => setForm({ ...form, project_type: event.target.value })}>
              {PROJECT_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>{projectTypeLabel(item)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>描述</label>
            <textarea className="textarea small" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <div className="toolbar modal-actions">
            <button type="button" className="button-secondary" disabled={busy} onClick={onClose}>取消</button>
            <button className="button" disabled={busy}>{busy ? "建立中..." : "建立"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportInline({ token, project, onDone, showFlash }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localPath, setLocalPath] = useState("");
  const inputRef = useRef(null);

  function handleFiles(fileList) {
    const nextFile = fileList?.[0] || null;
    setFile(nextFile);
    setDragActive(false);
  }

  return (
    <div className="toolbar import-toolbar">
      <div
        className={`import-dropzone ${dragActive ? "active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer?.files);
        }}
      >
        <div className="import-dropzone-title">拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡</div>
        <div className="subtext">如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。</div>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}>
            選擇檔案
          </button>
          <div className="subtext">
            {file ? `目前檔案：${file.name}` : "尚未選擇檔案"}
          </div>
        </div>
      </div>
      <div className="field">
        <label>或直接貼本機檔案路徑</label>
        <div className="toolbar">
          <input
            className="input"
            placeholder="/Users/.../book.epub 或 /Users/.../chapter.xhtml"
            value={localPath}
            onChange={(event) => setLocalPath(event.target.value)}
          />
          <button
            className="button button-secondary"
            disabled={!localPath.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await apiFetch(`/api/projects/${project.id}/import-local`, {
                  method: "POST",
                  token,
                  body: { path: localPath.trim() },
                });
                setFile(null);
                setLocalPath("");
                onDone();
              } catch (error) {
                showFlash("error", error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "匯入中..." : "從路徑匯入"}
          </button>
        </div>
        <div className="subtext">支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。</div>
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        style={{ display: "none" }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <button className="button" disabled={!file || busy} onClick={async () => {
        if (!file) return;
        setBusy(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          await apiFetch(`/api/projects/${project.id}/import`, {
            method: "POST",
            token,
            formData,
          });
          setFile(null);
          setLocalPath("");
          onDone();
        } catch (error) {
          showFlash("error", error.message);
        } finally {
          setBusy(false);
        }
      }}>
        {busy ? "匯入中..." : "匯入文本"}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
