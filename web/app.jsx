const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "ai-publisher-token";
const NAV_ITEMS = [
  { key: "projects", label: "專案" },
  { key: "text", label: "文本準備" },
  { key: "voices", label: "聲線設定" },
  { key: "characters", label: "角色設定" },
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

function jobTypeLabel(value) {
  return JOB_TYPE_LABELS[value] || value;
}

function issueTypeLabel(value) {
  return ISSUE_TYPE_LABELS[value] || value;
}

function sourceKindLabel(value) {
  return SOURCE_KIND_LABELS[value] || value;
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
      const [projectPayload, voicePayload, characterPayload, comicPayload, videoPayload, jobsPayload, reviewPayload, exportPayload] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`, { token }),
        apiFetch(`/api/projects/${projectId}/voice-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/character-profiles`, { token }),
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
      setComicProfiles(comicPayload.items || []);
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
    if (!token || !selectedProjectId || route === "projects") {
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
    nav: false,
    llm: false,
  });

  const projectItem = NAV_ITEMS.find((item) => item.key === "projects");
  const secondaryNavItems = NAV_ITEMS.filter((item) => item.key !== "projects");

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
                  <div className="subtext">{project.author || "未填作者"} · {project.language}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={`sidebar-section ${openSections.nav ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("nav")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">導覽</span>
            <span className="sidebar-hint">系統頁面</span>
          </span>
          <span className="sidebar-toggle-meta">
            <span className="sidebar-meta-text">{secondaryNavItems.length} 項</span>
            <span className={`sidebar-chevron ${openSections.nav ? "open" : ""}`}>▾</span>
          </span>
        </button>
        {openSections.nav ? (
          <div className="sidebar-section-body">
            {secondaryNavItems.map((item) => (
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
                      <div className="subtext">{project.author || "未填作者"}</div>
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
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) || segments[0] || null;
  const [draftText, setDraftText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [batchCharacterId, setBatchCharacterId] = useState("");
  const [segmentPage, setSegmentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalSegmentPages = Math.max(1, Math.ceil(segments.length / pageSize));
  const currentSegmentJob = activeSegment ? jobs.find((job) => job.segment_id === activeSegment.id) || null : null;
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
  }, [selectedChapterId]);

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
                  <option value="">清空角色 / 使用預設</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>{character.name}</option>
                  ))}
                </select>
                <button className="button-secondary" onClick={toggleCurrentPageSelection}>
                  {pagedSegments.every((segment) => selectedSegmentIds.includes(segment.id)) ? "取消本頁全選" : "全選本頁"}
                </button>
                <button className="button-secondary" onClick={applyBatchToSelection}>套用到勾選段落</button>
                <button className="button-secondary" onClick={applyBatchToChapter}>套用到整章</button>
              </div>
              {pagedSegments.map((segment) => (
                <div key={segment.id} className={`list-item ${activeSegment?.id === segment.id ? "active" : ""}`}>
                  <div className="title-row">
                    <label className="subtext" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={selectedSegmentIds.includes(segment.id)} onChange={() => toggleSegmentSelection(segment.id)} />
                      <strong>段落 {segment.order_index}</strong>
                    </label>
                    <div className="pill-row">
                      {segment.character_profile?.name ? <span className="tag brand">{segment.character_profile.name}</span> : null}
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
                    <label>說話角色</label>
                    <select className="select" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                      <option value="">不指定角色</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>{character.name} · {character.voice_profile_name}</option>
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
              <div className="subtext">第一期先只支援 narrator 單聲線。</div>
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
              <div className="subtext">{project ? `目前專案：${project.title}` : "請先選取專案"}</div>
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
                    <span className="tag">{character.voice_profile_name}</span>
                    <span className="tag">{character.looks_count || 0} 張圖片</span>
                  </div>
                </div>
                <div className="title-row" style={{ alignItems: "flex-start", marginTop: 10 }}>
                  {character.avatar_url ? <img src={character.avatar_url} alt={character.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid var(--line)" }} /> : <div className="editor-card" style={{ width: 56, height: 56, display: "grid", placeItems: "center", padding: 0 }}>{character.name.slice(0, 1)}</div>}
                  <div style={{ flex: 1 }}>
                    <div className="subtext">{character.display_title || character.archetype || "未設定角色職稱"}</div>
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
            {!characters.length ? <div className="empty-state">先建立旁白或人物角色，再回到文本準備頁指派段落。</div> : null}
          </div>
        )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{editingId ? "編輯角色" : "建立角色"}</h2>
            <div className="subtext">先為角色綁定一個聲線，再把段落指派給角色。</div>
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
  const [form, setForm] = useState({ title: "", author: "", language: "zh-CN", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ title: "", author: "", language: "zh-CN", description: "" });
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
