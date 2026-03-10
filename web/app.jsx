const { useEffect, useMemo, useState } = React;

const STORAGE_KEY = "ai-publisher-token";
const NAV_ITEMS = [
  { key: "projects", label: "專案列表" },
  { key: "overview", label: "專案總覽" },
  { key: "text", label: "文本準備" },
  { key: "voices", label: "聲線設定" },
  { key: "generate", label: "生成工作台" },
  { key: "review", label: "審核校對" },
  { key: "export", label: "匯出交付" },
  { key: "settings", label: "系統設定" },
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

function providerDefaults(provider, catalog = {}) {
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
  const [jobs, setJobs] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [renders, setRenders] = useState([]);
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

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

  async function refreshProjects(preferredProjectId) {
    if (!token) return;
    const payload = await apiFetch("/api/projects", { token });
    setProjects(payload.items || []);
    if (!selectedProjectId && payload.items?.[0]?.id) {
      setSelectedProjectId(preferredProjectId || payload.items[0].id);
    }
  }

  async function loadProject(projectId, chapterId = null) {
    if (!projectId || !token) return;
    setLoading(true);
    try {
      const [projectPayload, voicePayload, jobsPayload, reviewPayload, exportPayload] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`, { token }),
        apiFetch(`/api/projects/${projectId}/voice-profiles`, { token }),
        apiFetch(`/api/projects/${projectId}/jobs`, { token }),
        apiFetch(`/api/projects/${projectId}/review-queue`, { token }),
        apiFetch(`/api/projects/${projectId}/exports`, { token }),
      ]);
      const project = projectPayload.project;
      setProjectDetail(projectPayload);
      setVoices(voicePayload.items || []);
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

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} flash={flash} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        route={route}
        onRouteChange={setRoute}
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
            jobs={jobs}
            reviewQueue={reviewQueue}
            renders={renders}
            exportsList={exportsList}
            refreshProject={async () => {
              if (selectedProjectId) await loadProject(selectedProjectId, selectedChapterId);
              await refreshProjects(selectedProjectId);
            }}
            onSelectProject={setSelectedProjectId}
            showFlash={showFlash}
          />
        </div>
      </main>
    </div>
  );
}

function routeActions({ route, selectedProject, selectedChapter, onCreated, onImportDone, onGenerateDone, onRenderDone, onExportDone, token, showFlash }) {
  if (route === "projects") {
    return <ProjectCreateInline token={token} onCreated={onCreated} showFlash={showFlash} />;
  }
  if (route === "text" && selectedProject) {
    return <ImportInline token={token} project={selectedProject} onDone={onImportDone} showFlash={showFlash} />;
  }
  if (route === "generate" && selectedChapter) {
    return (
      <button className="button" onClick={async () => {
        await apiFetch(`/api/chapters/${selectedChapter.id}/generate`, { method: "POST", token });
        onGenerateDone();
      }}>
        生成本章
      </button>
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
  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-mark">AP</div>
        <div className="eyebrow">本機有聲書工作台</div>
        <div className="brand-title">AI Publisher</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">導覽</div>
        {NAV_ITEMS.map((item) => (
          <button key={item.key} className={`nav-button ${route === item.key ? "active" : ""}`} onClick={() => onRouteChange(item.key)}>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">專案</div>
        <div className="project-pick">
          {projects.length === 0 ? <div className="muted">目前還沒有專案</div> : null}
          {projects.slice(0, 6).map((project) => (
            <button
              key={project.id}
              className={`project-button ${project.id === selectedProjectId ? "active" : ""}`}
              onClick={() => {
                onSelectProject(project.id);
                onRouteChange("overview");
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
    jobs,
    reviewQueue,
    renders,
    exportsList,
    refreshProject,
    showFlash,
  } = props;

  if (route === "projects") {
    return <ProjectsPage projects={projects} token={token} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (!project) {
    return <div className="empty-state">請先在專案列表頁建立專案。</div>;
  }
  if (route === "overview") {
    return <OverviewPage project={project} setSelectedChapterId={setSelectedChapterId} />;
  }
  if (route === "text") {
    return <TextPrepPage token={token} project={project} selectedChapter={selectedChapter} selectedChapterId={selectedChapterId} setSelectedChapterId={setSelectedChapterId} segments={segments} voices={voices} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "voices") {
    return <VoiceSetupPage token={token} project={project} voices={voices} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "generate") {
    return <GeneratePage token={token} project={project} selectedChapter={selectedChapter} segments={segments} jobs={jobs} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "review") {
    return <ReviewPage token={token} project={project} reviewQueue={reviewQueue} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "export") {
    return <ExportPage token={token} project={project} selectedChapter={selectedChapter} renders={renders} exportsList={exportsList} refreshProject={refreshProject} showFlash={showFlash} />;
  }
  if (route === "settings") {
    return <SettingsPage />;
  }
  return null;
}

function ProjectsPage({ projects = [], token, refreshProject, showFlash }) {
  const [form, setForm] = useState({ title: "", author: "", language: "zh-CN", description: "" });

  async function createProject(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await apiFetch("/api/projects", { method: "POST", token, body: form });
    setForm({ title: "", author: "", language: "zh-CN", description: "" });
    await refreshProject();
    showFlash("success", "新專案已建立。");
  }

  return (
    <div className="grid projects">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>專案總覽</h2>
            <div className="subtext">先讓本機版流程跑通，再逐步擴充 provider 與模組。</div>
          </div>
          <span className="tag brand">{projects.length} 個專案</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>專案</th>
              <th>語言</th>
              <th>章節數</th>
              <th>待審核</th>
              <th>失敗任務</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <strong>{project.title}</strong>
                  <div className="subtext">{project.author || "未填作者"}</div>
                </td>
                <td>{project.language}</td>
                <td>{project.metrics?.chapter_count || 0}</td>
                <td>{project.metrics?.review_required_count || 0}</td>
                <td>{project.metrics?.failed_jobs || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>建立專案</h2>
            <div className="subtext">只填最少欄位即可開始。</div>
          </div>
        </div>
        <form className="form-grid" onSubmit={createProject}>
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
          <button className="button">建立</button>
        </form>
      </section>
    </div>
  );
}

function OverviewPage({ project, setSelectedChapterId }) {
  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{project.title}</h2>
            <div className="subtext">{project.author || "未填作者"} · {project.language}</div>
          </div>
          <span className="tag brand">{statusLabel(project.status)}</span>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="eyebrow">章節</div>
            <strong>{project.metrics?.chapter_count || 0}</strong>
          </div>
          <div className="metric">
            <div className="eyebrow">段落</div>
            <strong>{project.metrics?.segment_count || 0}</strong>
          </div>
          <div className="metric">
            <div className="eyebrow">已通過</div>
            <strong>{project.metrics?.approved_count || 0}</strong>
          </div>
          <div className="metric">
            <div className="eyebrow">待審核</div>
            <strong>{project.metrics?.review_required_count || 0}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>章節地圖</h2>
            <div className="subtext">點選章節可進入文本準備或生成工作台。</div>
          </div>
        </div>
        <div className="list">
          {(project.chapters || []).map((chapter) => (
            <div key={chapter.id} className="list-item">
              <div className="title-row">
                <strong>{chapter.order_index}. {chapter.title}</strong>
                <button className="button-secondary" onClick={() => setSelectedChapterId(chapter.id)}>選取</button>
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
  );
}

function TextPrepPage({ token, project, selectedChapter, selectedChapterId, setSelectedChapterId, segments, voices, refreshProject, showFlash }) {
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) || segments[0] || null;
  const [draftText, setDraftText] = useState("");
  const [voiceId, setVoiceId] = useState("");

  useEffect(() => {
    if (activeSegment) {
      setActiveSegmentId(activeSegment.id);
      setDraftText(activeSegment.tts_text || "");
      setVoiceId(activeSegment.voice_profile_id || "");
    }
  }, [selectedChapterId, segments.length]);

  useEffect(() => {
    if (activeSegment) {
      setDraftText(activeSegment.tts_text || "");
      setVoiceId(activeSegment.voice_profile_id || "");
    }
  }, [activeSegment]);

  async function saveSegment() {
    if (!activeSegment) return;
    await apiFetch(`/api/segments/${activeSegment.id}`, {
      method: "PATCH",
      token,
      body: {
        tts_text: draftText,
        voice_profile_id: voiceId || null,
        status: "ready",
      },
    });
    await refreshProject();
    showFlash("success", "段落已儲存。");
  }

  return (
    <div className="grid three">
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
        {!selectedChapter ? (
          <div className="empty-state">請先匯入文本，再選擇章節。</div>
        ) : (
          <div className="split-layout">
            <div className="list">
              {segments.map((segment) => (
                <button key={segment.id} className={`project-button ${activeSegment?.id === segment.id ? "active" : ""}`} onClick={() => setActiveSegmentId(segment.id)}>
                  <div className="title-row">
                    <strong>段落 {segment.order_index}</strong>
                    <span className="tag">{statusLabel(segment.status)}</span>
                  </div>
                  <div className="subtext">{segment.source_text.slice(0, 56)}...</div>
                </button>
              ))}
            </div>

            <div className="form-grid">
              {activeSegment ? (
                <>
                  <div className="editor-card">
                    <div className="eyebrow">原文</div>
                    <div>{activeSegment.source_text}</div>
                  </div>
                  <div className="field">
                    <label>朗讀稿</label>
                    <textarea className="textarea" value={draftText} onChange={(event) => setDraftText(event.target.value)} />
                  </div>
                  <div className="field">
                    <label>覆寫聲線</label>
                    <select className="select" value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
                      <option value="">使用專案預設</option>
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.name} · {voice.voice_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="toolbar">
                    <button className="button" onClick={saveSegment}>儲存段落</button>
                    <button className="button-secondary" onClick={async () => {
                      await apiFetch(`/api/segments/${activeSegment.id}/generate`, { method: "POST", token });
                      await refreshProject();
                      showFlash("success", "已為目前段落建立生成任務。");
                    }}>
                      生成目前段落
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">目前章節沒有段落。</div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>準備提示</h3>
            <div className="subtext">第一版採用規則化建議，不做複雜自動編輯。</div>
          </div>
        </div>
        <div className="list">
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
                <option value="Tingting">Tingting</option>
                <option value="Eddy (Chinese (China mainland))">Eddy CN</option>
                <option value="Samantha">Samantha</option>
                <option value="Daniel">Daniel</option>
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
  );
}

function GeneratePage({ token, project, selectedChapter, segments, jobs, refreshProject, showFlash }) {
  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>生成工作台</h2>
            <div className="subtext">本機版使用 FastAPI BackgroundTasks，不另外啟動 worker。</div>
          </div>
          {selectedChapter ? <span className="tag brand">{selectedChapter.title}</span> : null}
        </div>
        <div className="toolbar">
          {selectedChapter ? (
            <button className="button" onClick={async () => {
              await apiFetch(`/api/chapters/${selectedChapter.id}/generate`, { method: "POST", token });
              await refreshProject();
              showFlash("success", "整章生成任務已建立。");
            }}>
              生成目前章節
            </button>
          ) : null}
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
            {segments.map((segment) => (
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
            {jobs.map((job) => (
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

  const current = reviewQueue.find((segment) => segment.id === selectedId) || reviewQueue[0] || null;

  useEffect(() => {
    if (!selectedId && reviewQueue[0]) {
      setSelectedId(reviewQueue[0].id);
    }
  }, [reviewQueue, selectedId]);

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
    return <div className="empty-state">目前沒有待審核段落。請先到生成工作台建立音訊。</div>;
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
        <div className="list">
          {reviewQueue.map((segment) => (
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

function ExportPage({ token, project, selectedChapter, renders, exportsList, refreshProject, showFlash }) {
  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>章節渲染</h2>
            <div className="subtext">先把已通過的段落拼成章節 wav。</div>
          </div>
          {selectedChapter ? <span className="tag brand">{selectedChapter.title}</span> : null}
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

function SettingsPage() {
  const [providerInfo, setProviderInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!token) return;
    (async () => {
      try {
        const payload = await apiFetch("/api/system/providers", { token });
        setProviderInfo(payload);
      } catch {}
    })();
  }, []);

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
            </div>
          ) : null}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>下一步</h2>
            <div className="subtext">等本機閉環跑通後再升級</div>
          </div>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>替換本地 TTS</strong>
            <div className="subtext">現在已可建立 OpenAI 或 ElevenLabs 聲線設定，填入 API key 後即可使用。</div>
          </div>
          <div className="list-item">
            <strong>替換模擬 QC</strong>
            <div className="subtext">若已設定 OpenAI 或 ElevenLabs API key，系統會優先使用真實 ASR 進行轉寫。</div>
          </div>
          <div className="list-item">
            <strong>升級前端</strong>
            <div className="subtext">切到正式 React build pipeline。</div>
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

function ProjectCreateInline({ token, onCreated, showFlash }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!open) {
    return <button className="button" onClick={() => setOpen(true)}>新增專案</button>;
  }

  return (
    <div className="toolbar">
      <input className="input" style={{ width: 260 }} placeholder="專案標題" value={title} onChange={(event) => setTitle(event.target.value)} />
      <button className="button" onClick={async () => {
        if (!title.trim()) return;
        await apiFetch("/api/projects", {
          method: "POST",
          token,
          body: { title, author: "", language: "zh-CN", description: "" },
        });
        setTitle("");
        setOpen(false);
        onCreated();
        showFlash("success", "專案已建立。");
      }}>
        儲存
      </button>
      <button className="button-secondary" onClick={() => setOpen(false)}>取消</button>
    </div>
  );
}

function ImportInline({ token, project, onDone, showFlash }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="toolbar">
      <input className="file-input" type="file" accept=".txt,.md,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
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
