const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "ai-publisher-token";
const LOCALE_STORAGE_KEY = "ai-publisher-locale";
const DEFAULT_LOCALE = "zh-Hant";
const SUPPORTED_LOCALES = ["zh-Hant", "zh-Hans", "en", "ja", "ko", "th"];
const LOCALE_OPTIONS = [
  { value: "zh-Hant", nativeLabel: "繁體中文" },
  { value: "zh-Hans", nativeLabel: "简体中文" },
  { value: "en", nativeLabel: "English" },
  { value: "ja", nativeLabel: "日本語" },
  { value: "ko", nativeLabel: "한국어" },
  { value: "th", nativeLabel: "ไทย" },
];
const LOCALE_FORMAT_CODES = {
  "zh-Hant": "zh-TW",
  "zh-Hans": "zh-CN",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  th: "th-TH",
};
let ACTIVE_LOCALE = DEFAULT_LOCALE;
const TEXT_NODE_ORIGINALS = new WeakMap();
const ATTRIBUTE_ORIGINALS = new WeakMap();
const I18N = {
  "zh-Hant": {
    "common.language": "語言",
    "common.logout": "登出",
    "common.notProvided": "未提供",
    "common.unfilledAuthor": "未填作者",
    "common.unclassified": "未分類",
    "common.noPageSelected": "未選擇頁面",
    "common.unauthorized": "目前帳號沒有此頁權限。請改用左側可用選單。",
    "common.availablePages": "可用頁面：{routes}",
    "common.currentRole": "目前角色：{role}",
    "error.requestFailed": "請求失敗",
    "login.titleLineOne": "本機版",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "這是一個先跑通完整業務閉環的本機版原型。它包含登入、專案管理、文本匯入、章節拆分、本地 TTS 生成、審核與章節匯出。",
    "login.signIn": "登入",
    "login.signingIn": "登入中...",
    "login.enterStudio": "進入 Studio",
    "login.localAdminReady": "預設本地管理員帳號已建立。",
    "login.webApp": "網頁應用",
    "login.email": "電子郵件",
    "login.password": "密碼",
    "login.defaultAccount": "預設帳號：",
    "login.demoAccounts": "預設角色帳號",
    "login.demoDescription": "admin 保留完整權限，其他帳號依文本準備、審核、交付、設定分工。",
    "login.fillAccount": "帶入",
    "login.allowedPages": "可用頁面",
    "sidebar.brandEyebrow": "本機有聲書工作台",
    "sidebar.projectWorkspace": "專案工作台",
    "sidebar.projectSelected": "已選專案",
    "sidebar.projectUnselected": "未選專案",
    "sidebar.audiobookFlow": "有聲書流程",
    "sidebar.audiobookHint": "文本、角色、聲線、生成與審核",
    "sidebar.comicFlow": "漫畫流程",
    "sidebar.comicHint": "腳本、分鏡、畫格與排版",
    "sidebar.systemExtensions": "系統與擴展",
    "sidebar.systemHint": "模型模板與系統設定",
    "sidebar.externalLlm": "外部 LLM",
    "sidebar.officialLinks": "官方入口",
    "topbar.defaultEyebrow": "AI Publisher / 本機 MVP",
    "topbar.noProject": "請先建立專案並匯入文本。",
    "topbar.projectContext": "目前專案：{project}，登入使用者：{user}",
    "character.unsetTitle": "未設定角色職稱",
    "character.boundStoryCharacter": "綁定小說角色：{name}",
    "comic.pageTitle": "第 {pageNo} 頁{suffix}",
  },
  "zh-Hans": {
    "common.language": "语言",
    "common.logout": "退出",
    "common.notProvided": "未提供",
    "common.unfilledAuthor": "未填作者",
    "common.unclassified": "未分类",
    "common.noPageSelected": "未选择页面",
    "common.unauthorized": "当前账号没有此页面权限，请改用左侧可用菜单。",
    "common.availablePages": "可用页面：{routes}",
    "common.currentRole": "当前角色：{role}",
    "error.requestFailed": "请求失败",
    "login.titleLineOne": "本机版",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "这是一个先跑通完整业务闭环的本机版原型。它包含登录、项目管理、文本导入、章节拆分、本地 TTS 生成、审核与章节导出。",
    "login.signIn": "登录",
    "login.signingIn": "登录中...",
    "login.enterStudio": "进入 Studio",
    "login.localAdminReady": "默认本地管理员账号已建立。",
    "login.webApp": "网页应用",
    "login.email": "电子邮箱",
    "login.password": "密码",
    "login.defaultAccount": "默认账号：",
    "login.demoAccounts": "默认角色账号",
    "login.demoDescription": "admin 保留完整权限，其他账号按文本准备、审核、交付、设置分工。",
    "login.fillAccount": "带入",
    "login.allowedPages": "可用页面",
    "sidebar.brandEyebrow": "本机有声书工作台",
    "sidebar.projectWorkspace": "项目工作台",
    "sidebar.projectSelected": "已选项目",
    "sidebar.projectUnselected": "未选项目",
    "sidebar.audiobookFlow": "有声书流程",
    "sidebar.audiobookHint": "文本、角色、声线、生成与审核",
    "sidebar.comicFlow": "漫画流程",
    "sidebar.comicHint": "脚本、分镜、画格与排版",
    "sidebar.systemExtensions": "系统与扩展",
    "sidebar.systemHint": "模型模板与系统设置",
    "sidebar.externalLlm": "外部 LLM",
    "sidebar.officialLinks": "官方入口",
    "topbar.defaultEyebrow": "AI Publisher / 本机 MVP",
    "topbar.noProject": "请先创建项目并导入文本。",
    "topbar.projectContext": "当前项目：{project}，登录用户：{user}",
    "character.unsetTitle": "未设置角色职称",
    "character.boundStoryCharacter": "绑定小说角色：{name}",
    "comic.pageTitle": "第 {pageNo} 页{suffix}",
  },
  en: {
    "common.language": "Language",
    "common.logout": "Sign out",
    "common.notProvided": "Not provided",
    "common.unfilledAuthor": "Author missing",
    "common.unclassified": "Unclassified",
    "common.noPageSelected": "No page selected",
    "common.unauthorized": "This account does not have access to this page. Use one of the allowed menu entries on the left.",
    "common.availablePages": "Available pages: {routes}",
    "common.currentRole": "Current role: {role}",
    "error.requestFailed": "Request failed",
    "login.titleLineOne": "Local",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "This local prototype is designed to validate the full production loop first. It includes sign-in, project management, text import, chapter splitting, local TTS generation, review, and chapter export.",
    "login.signIn": "Sign in",
    "login.signingIn": "Signing in...",
    "login.enterStudio": "Enter Studio",
    "login.localAdminReady": "The default local admin account is ready.",
    "login.webApp": "Web app",
    "login.email": "Email",
    "login.password": "Password",
    "login.defaultAccount": "Default account:",
    "login.demoAccounts": "Demo role accounts",
    "login.demoDescription": "Admin keeps full access. The other accounts are split across text prep, review, delivery, and settings.",
    "login.fillAccount": "Use",
    "login.allowedPages": "Available pages",
    "sidebar.brandEyebrow": "Local audiobook workspace",
    "sidebar.projectWorkspace": "Project workspace",
    "sidebar.projectSelected": "Project selected",
    "sidebar.projectUnselected": "No project selected",
    "sidebar.audiobookFlow": "Audiobook flow",
    "sidebar.audiobookHint": "Text, characters, voices, generation, and review",
    "sidebar.comicFlow": "Comic flow",
    "sidebar.comicHint": "Script, storyboard, panels, and layout",
    "sidebar.systemExtensions": "System and extensions",
    "sidebar.systemHint": "Model presets and system settings",
    "sidebar.externalLlm": "External LLMs",
    "sidebar.officialLinks": "Official links",
    "topbar.defaultEyebrow": "AI Publisher / Local MVP",
    "topbar.noProject": "Create a project and import text first.",
    "topbar.projectContext": "Current project: {project}. Signed in as {user}.",
    "character.unsetTitle": "Role title not set",
    "character.boundStoryCharacter": "Bound story character: {name}",
    "comic.pageTitle": "Page {pageNo}{suffix}",
  },
  ja: {
    "common.language": "言語",
    "common.logout": "ログアウト",
    "common.notProvided": "未設定",
    "common.unfilledAuthor": "作者未入力",
    "common.unclassified": "未分類",
    "common.noPageSelected": "ページ未選択",
    "common.unauthorized": "このアカウントではこのページを開けません。左側の利用可能なメニューを使用してください。",
    "common.availablePages": "利用可能ページ: {routes}",
    "common.currentRole": "現在の役割: {role}",
    "error.requestFailed": "リクエストに失敗しました",
    "login.titleLineOne": "ローカル版",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "これは業務フロー全体を先に通すためのローカル版プロトタイプです。ログイン、プロジェクト管理、テキスト取り込み、章分割、ローカル TTS 生成、レビュー、章エクスポートを含みます。",
    "login.signIn": "ログイン",
    "login.signingIn": "ログイン中...",
    "login.enterStudio": "Studio に入る",
    "login.localAdminReady": "既定のローカル管理者アカウントを用意しています。",
    "login.webApp": "Web アプリ",
    "login.email": "メールアドレス",
    "login.password": "パスワード",
    "login.defaultAccount": "既定アカウント：",
    "login.demoAccounts": "既定の役割アカウント",
    "login.demoDescription": "admin は全権限を保持し、他のアカウントはテキスト準備、レビュー、納品、設定に分かれます。",
    "login.fillAccount": "入力",
    "login.allowedPages": "利用可能ページ",
    "sidebar.brandEyebrow": "ローカル音声書籍ワークスペース",
    "sidebar.projectWorkspace": "プロジェクトワークスペース",
    "sidebar.projectSelected": "選択済み",
    "sidebar.projectUnselected": "未選択",
    "sidebar.audiobookFlow": "音声書籍フロー",
    "sidebar.audiobookHint": "テキスト、キャラクター、音声、生成、レビュー",
    "sidebar.comicFlow": "コミックフロー",
    "sidebar.comicHint": "脚本、絵コンテ、コマ、レイアウト",
    "sidebar.systemExtensions": "システムと拡張",
    "sidebar.systemHint": "モデルプリセットとシステム設定",
    "sidebar.externalLlm": "外部 LLM",
    "sidebar.officialLinks": "公式リンク",
    "topbar.defaultEyebrow": "AI Publisher / ローカル MVP",
    "topbar.noProject": "先にプロジェクトを作成してテキストを取り込んでください。",
    "topbar.projectContext": "現在のプロジェクト: {project}、ログイン中: {user}",
    "character.unsetTitle": "役割名未設定",
    "character.boundStoryCharacter": "小説キャラクター紐付け: {name}",
    "comic.pageTitle": "{pageNo} ページ{suffix}",
  },
  ko: {
    "common.language": "언어",
    "common.logout": "로그아웃",
    "common.notProvided": "정보 없음",
    "common.unfilledAuthor": "작가 미입력",
    "common.unclassified": "미분류",
    "common.noPageSelected": "페이지 미선택",
    "common.unauthorized": "이 계정은 이 페이지에 접근할 수 없습니다. 왼쪽의 허용된 메뉴를 사용하세요.",
    "common.availablePages": "사용 가능한 페이지: {routes}",
    "common.currentRole": "현재 역할: {role}",
    "error.requestFailed": "요청에 실패했습니다",
    "login.titleLineOne": "로컬 버전",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "이 로컬 프로토타입은 먼저 전체 제작 흐름을 검증하기 위해 만들어졌습니다. 로그인, 프로젝트 관리, 텍스트 가져오기, 장 분할, 로컬 TTS 생성, 검수, 장 내보내기를 포함합니다.",
    "login.signIn": "로그인",
    "login.signingIn": "로그인 중...",
    "login.enterStudio": "Studio 시작",
    "login.localAdminReady": "기본 로컬 관리자 계정이 준비되어 있습니다.",
    "login.webApp": "웹 앱",
    "login.email": "이메일",
    "login.password": "비밀번호",
    "login.defaultAccount": "기본 계정:",
    "login.demoAccounts": "기본 역할 계정",
    "login.demoDescription": "admin 은 전체 권한을 유지하고, 다른 계정은 텍스트 준비, 검수, 납품, 설정으로 나뉩니다.",
    "login.fillAccount": "사용",
    "login.allowedPages": "사용 가능한 페이지",
    "sidebar.brandEyebrow": "로컬 오디오북 워크스페이스",
    "sidebar.projectWorkspace": "프로젝트 워크스페이스",
    "sidebar.projectSelected": "선택됨",
    "sidebar.projectUnselected": "미선택",
    "sidebar.audiobookFlow": "오디오북 흐름",
    "sidebar.audiobookHint": "텍스트, 캐릭터, 음성, 생성, 검수",
    "sidebar.comicFlow": "만화 흐름",
    "sidebar.comicHint": "스크립트, 콘티, 패널, 레이아웃",
    "sidebar.systemExtensions": "시스템 및 확장",
    "sidebar.systemHint": "모델 프리셋 및 시스템 설정",
    "sidebar.externalLlm": "외부 LLM",
    "sidebar.officialLinks": "공식 링크",
    "topbar.defaultEyebrow": "AI Publisher / 로컬 MVP",
    "topbar.noProject": "먼저 프로젝트를 만들고 텍스트를 가져오세요.",
    "topbar.projectContext": "현재 프로젝트: {project}, 로그인 사용자: {user}",
    "character.unsetTitle": "역할명이 설정되지 않았습니다",
    "character.boundStoryCharacter": "소설 캐릭터 연결: {name}",
    "comic.pageTitle": "{pageNo}페이지{suffix}",
  },
  th: {
    "common.language": "ภาษา",
    "common.logout": "ออกจากระบบ",
    "common.notProvided": "ไม่มีข้อมูล",
    "common.unfilledAuthor": "ยังไม่ได้กรอกผู้เขียน",
    "common.unclassified": "ยังไม่จัดประเภท",
    "common.noPageSelected": "ยังไม่ได้เลือกหน้า",
    "common.unauthorized": "บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้านี้ โปรดใช้เมนูที่อนุญาตทางด้านซ้าย",
    "common.availablePages": "หน้าที่ใช้งานได้: {routes}",
    "common.currentRole": "บทบาทปัจจุบัน: {role}",
    "error.requestFailed": "คำขอล้มเหลว",
    "login.titleLineOne": "เวอร์ชันภายในเครื่อง",
    "login.titleLineTwo": "Audiobook Studio",
    "login.description": "นี่คือต้นแบบแบบ local ที่ใช้ตรวจสอบเวิร์กโฟลว์ทั้งหมดให้ครบก่อน ประกอบด้วยการเข้าสู่ระบบ การจัดการโปรเจกต์ การนำเข้าข้อความ การแยกบท การสร้าง TTS ในเครื่อง การตรวจทาน และการส่งออกบท",
    "login.signIn": "เข้าสู่ระบบ",
    "login.signingIn": "กำลังเข้าสู่ระบบ...",
    "login.enterStudio": "เข้า Studio",
    "login.localAdminReady": "เตรียมบัญชีผู้ดูแลระบบภายในเครื่องไว้แล้ว",
    "login.webApp": "เว็บแอป",
    "login.email": "อีเมล",
    "login.password": "รหัสผ่าน",
    "login.defaultAccount": "บัญชีเริ่มต้น:",
    "login.demoAccounts": "บัญชีบทบาทตัวอย่าง",
    "login.demoDescription": "admin มีสิทธิ์ครบทั้งหมด ส่วนบัญชีอื่นแบ่งตามงานเตรียมข้อความ ตรวจทาน ส่งมอบ และตั้งค่า",
    "login.fillAccount": "ใช้",
    "login.allowedPages": "หน้าที่ใช้งานได้",
    "sidebar.brandEyebrow": "พื้นที่ทำงานหนังสือเสียงภายในเครื่อง",
    "sidebar.projectWorkspace": "พื้นที่ทำงานโปรเจกต์",
    "sidebar.projectSelected": "เลือกโปรเจกต์แล้ว",
    "sidebar.projectUnselected": "ยังไม่ได้เลือกโปรเจกต์",
    "sidebar.audiobookFlow": "โฟลว์หนังสือเสียง",
    "sidebar.audiobookHint": "ข้อความ ตัวละคร เสียง การสร้าง และการตรวจทาน",
    "sidebar.comicFlow": "โฟลว์คอมิก",
    "sidebar.comicHint": "สคริปต์ สตอรี่บอร์ด ช่องภาพ และเลย์เอาต์",
    "sidebar.systemExtensions": "ระบบและส่วนขยาย",
    "sidebar.systemHint": "พรีเซ็ตโมเดลและการตั้งค่าระบบ",
    "sidebar.externalLlm": "LLM ภายนอก",
    "sidebar.officialLinks": "ลิงก์ทางการ",
    "topbar.defaultEyebrow": "AI Publisher / Local MVP",
    "topbar.noProject": "กรุณาสร้างโปรเจกต์และนำเข้าข้อความก่อน",
    "topbar.projectContext": "โปรเจกต์ปัจจุบัน: {project} ผู้ใช้ที่เข้าสู่ระบบ: {user}",
    "character.unsetTitle": "ยังไม่ได้ตั้งชื่อตำแหน่งตัวละคร",
    "character.boundStoryCharacter": "ผูกกับตัวละครในนิยาย: {name}",
    "comic.pageTitle": "หน้า {pageNo}{suffix}",
  },
};
const EXACT_TRANSLATIONS = {
  "zh-Hans": {
    "AI Publisher 本機工作台": "AI Publisher 本机工作台",
    "專案": "项目",
    "專案列表": "项目列表",
    "未填作者": "未填作者",
    "未提供": "未提供",
    "後端": "后端",
    "資料庫": "数据库",
    "語音": "语音",
    "範圍": "范围",
    "文本準備": "文本准备",
    "聲線設定": "声线设置",
    "角色設定": "角色设置",
    "漫畫腳本": "漫画脚本",
    "分鏡工作台": "分镜工作台",
    "畫格生成": "画格生成",
    "頁面排版": "页面排版",
    "漫畫設定": "漫画设置",
    "Video 設定": "Video 设置",
    "生成任務": "生成任务",
    "審核校對": "审核校对",
    "匯出交付": "导出交付",
    "系統設定": "系统设置",
    "建立專案": "创建项目",
    "刪除": "删除",
    "生成本章": "生成本章",
    "匯出專案": "导出项目",
    "渲染本章": "渲染本章",
    "章節": "章节",
    "章節地圖": "章节地图",
    "畫格": "画格",
    "漫畫頁": "漫画页",
    "有聲書流程": "有声书流程",
    "漫畫流程": "漫画流程",
    "系統與擴展": "系统与扩展",
    "外部 LLM": "外部 LLM",
    "官方入口": "官方入口",
    "文本、角色、聲線、生成與審核": "文本、角色、声线、生成与审核",
    "腳本、分鏡、畫格與排版": "脚本、分镜、画格与排版",
    "模型模板與系統設定": "模型模板与系统设置",
    "目前還沒有專案": "当前还没有项目",
    "章節渲染": "章节渲染",
    "專案匯出": "项目导出",
    "本機運行環境": "本机运行环境",
    "多模態規劃": "多模态规划",
    "建立": "创建",
    "建立中...": "创建中...",
    "取消": "取消",
    "儲存": "保存",
    "儲存中...": "保存中...",
    "生成": "生成",
    "生成中...": "生成中...",
    "分析本章人物": "分析本章人物",
    "自動建立並綁定": "自动创建并绑定",
    "套用到勾選段落": "应用到勾选段落",
    "套用到整章": "应用到整章",
    "解除角色綁定": "解除角色绑定",
    "解除聲線覆寫": "解除声线覆盖",
    "全選本頁": "全选本页",
    "取消本頁全選": "取消本页全选",
    "合併為一段": "合并为一段",
    "合併段落": "合并段落",
    "分析中...": "分析中...",
    "綁定中...": "绑定中...",
    "通過": "通过",
    "退回": "退回",
    "重新生成": "重新生成",
    "新增人工問題": "新增人工问题",
    "渲染目前章節": "渲染当前章节",
    "匯出 ZIP": "导出 ZIP",
    "下載 ZIP": "下载 ZIP",
    "標題": "标题",
    "作者": "作者",
    "語言": "语言",
    "專案類型": "项目类型",
    "描述": "描述",
    "電子郵件": "电子邮箱",
    "密碼": "密码",
    "登入": "登录",
    "登入中...": "登录中...",
    "進入 Studio": "进入 Studio",
    "選擇檔案": "选择文件",
    "匯入文本": "导入文本",
    "從路徑匯入": "从路径导入",
    "匯入中...": "导入中...",
    "處理中...": "处理中...",
    "請確認": "请确认",
    "尚未選擇檔案": "尚未选择文件",
    "請先建立專案並匯入文本。": "请先创建项目并导入文本。",
    "新專案已建立。": "新项目已创建。",
    "文本匯入完成，章節與段落已建立。": "文本导入完成，章节与段落已建立。",
    "生成任務已送出。": "生成任务已提交。",
    "章節渲染任務已建立。": "章节渲染任务已建立。",
    "匯出任務已建立。": "导出任务已建立。",
    "登入成功，本機版 Studio 已就緒。": "登录成功，本机版 Studio 已就绪。",
    "經營管理": "经营管理",
    "權利、成本、渠道、銷售、版稅": "权利、成本、渠道、销售、版税",
    "打開經營頁": "打开经营页",
    "先選取一個專案，再進入經營管理頁。": "请先选择一个项目，再进入经营管理页。",
    "基準幣已更新。": "基准币已更新。",
    "權利與合同資料已新增。": "权利与合同资料已新增。",
    "權利與合同資料已更新。": "权利与合同资料已更新。",
    "發行渠道資料已新增。": "发行渠道资料已新增。",
    "發行渠道資料已更新。": "发行渠道资料已更新。",
    "成本項目已新增。": "成本项目已新增。",
    "成本項目已更新。": "成本项目已更新。",
    "銷售回傳已新增。": "销售回传已新增。",
    "銷售回傳已更新。": "销售回传已更新。",
    "版稅結算資料已新增。": "版税结算资料已新增。",
    "版稅結算資料已更新。": "版税结算资料已更新。",
    "匯率已新增。": "汇率已新增。",
    "匯率已更新。": "汇率已更新。",
    "廣告合作已新增。": "广告合作已新增。",
    "廣告合作已更新。": "广告合作已更新。",
    "經營報表已匯出。": "经营报表已导出。",
    "經營總覽": "经营总览",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "把权利、广告、渠道、成本、销售、版税与报表集中在同一页。",
    "匯出中...": "导出中...",
    "匯出經營報表": "导出经营报表",
    "有效授權": "有效授权",
    "上架渠道": "上架渠道",
    "廣告合作": "广告合作",
    "累計成本": "累计成本",
    "累計營收": "累计营收",
    "版稅應付": "版税应付",
    "估算毛利": "估算毛利",
    "廣告收入": "广告收入",
    "廣告簽約額": "广告签约额",
    "廣告已回款": "广告已回款",
    "累計銷量": "累计销量",
    "匯率筆數": "汇率笔数",
    "目前所有幣別都有可用匯率。": "目前所有币种都有可用汇率。",
    "多幣種與匯率": "多币种与汇率",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "先设置项目基准币，再维护汇率，让营收、成本、版税都能换算。",
    "專案基準幣": "项目基准币",
    "更新中...": "更新中...",
    "更新基準幣": "更新基准币",
    "來源幣別": "来源币种",
    "目標幣別": "目标币种",
    "匯率": "汇率",
    "生效日期": "生效日期",
    "備註": "备注",
    "例如：2026 Q1 財務匯率": "例如：2026 Q1 财务汇率",
    "更新匯率": "更新汇率",
    "新增匯率": "新增汇率",
    "取消編輯": "取消编辑",
    "編輯": "编辑",
    "刪除匯率": "删除汇率",
    "匯率已刪除。": "汇率已删除。",
    "還沒有匯率資料，跨幣種金額將無法折算。": "还没有汇率资料，跨币种金额将无法折算。",
    "原始金額彙總": "原始金额汇总",
    "廣告合作專區": "广告合作专区",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "集中管理广告商、合作档期、交付内容、签约额与回款，这里就是你的广告台账。",
    "廣告商": "广告商",
    "品牌 / 廣告主": "品牌 / 广告主",
    "合作專案": "合作项目",
    "春季品牌合作 / 書內植入": "春季品牌合作 / 书内植入",
    "聯絡人": "联系人",
    "窗口姓名": "窗口姓名",
    "負責人": "负责人",
    "內部 PM": "内部 PM",
    "交付內容": "交付内容",
    "片頭口播、書腰、聯名封面、投放頁": "片头口播、书腰、联名封面、投放页",
    "開始日期": "开始日期",
    "結束日期": "结束日期",
    "簽約金額": "签约金额",
    "已回款": "已回款",
    "幣別": "币别",
    "例如：需另附品牌审稿": "例如：需另附品牌审稿",
    "更新廣告合作": "更新广告合作",
    "新增廣告合作": "新增广告合作",
    "刪除廣告合作": "删除广告合作",
    "廣告合作已刪除。": "广告合作已删除。",
    "還沒有廣告合作資料。": "还没有广告合作资料。",
    "權利與合同": "权利与合同",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "记录作品是否取得有声书、漫画、海外版等权利。",
    "權利類型": "权利类型",
    "權利持有人": "权利持有人",
    "授權範圍": "授权范围",
    "地區": "地区",
    "合同編號": "合同编号",
    "更新權利紀錄": "更新权利记录",
    "新增權利紀錄": "新增权利记录",
    "刪除權利紀錄": "删除权利记录",
    "權利紀錄已刪除。": "权利记录已删除。",
    "還沒有權利與合同資料。": "还没有权利与合同资料。",
    "發行渠道": "发行渠道",
    "追蹤上架平台、廣告商、館配或教育渠道。": "追踪上架平台、广告商、馆配或教育渠道。",
    "渠道名稱": "渠道名称",
    "渠道類型": "渠道类型",
    "零售渠道": "零售渠道",
    "平台合作": "平台合作",
    "圖書館": "图书馆",
    "教育機構": "教育机构",
    "格式": "格式",
    "售價": "售价",
    "外部 SKU": "外部 SKU",
    "更新發行渠道": "更新发行渠道",
    "新增發行渠道": "新增发行渠道",
    "刪除發行渠道": "删除发行渠道",
    "發行渠道已刪除。": "发行渠道已删除。",
    "還沒有發行渠道資料。": "还没有发行渠道资料。",
    "未排上架日": "未排上架日",
    "成本核算": "成本核算",
    "補齊模型費、外包、審校、宣傳等成本。": "补齐模型费、外包、审校、宣传等成本。",
    "成本類別": "成本类别",
    "供應商或來源": "供应商或来源",
    "金額": "金额",
    "發生日": "发生日",
    "說明": "说明",
    "更新成本項目": "更新成本项目",
    "新增成本項目": "新增成本项目",
    "刪除成本項目": "删除成本项目",
    "成本項目已刪除。": "成本项目已删除。",
    "還沒有成本項目。": "还没有成本项目。",
    "未填來源": "未填来源",
    "未填日期": "未填日期",
    "銷售回傳": "销售回传",
    "可記錄零售、廣告、館配或教育採購收入。": "可记录零售、广告、馆配或教育采购收入。",
    "收入類型": "收入类型",
    "零售銷售": "零售销售",
    "廣告 / 贊助": "广告 / 赞助",
    "館配": "馆配",
    "教育採購": "教育采购",
    "銷量": "销量",
    "期間開始": "期间开始",
    "期間結束": "期间结束",
    "毛營收": "毛营收",
    "退款": "退款",
    "淨營收": "净营收",
    "留空則自動計算": "留空则自动计算",
    "更新銷售紀錄": "更新销售记录",
    "新增銷售紀錄": "新增销售记录",
    "刪除銷售紀錄": "删除销售记录",
    "銷售紀錄已刪除。": "销售记录已删除。",
    "還沒有銷售回傳資料。": "还没有销售回传资料。",
    "未填開始": "未填开始",
    "未填結束": "未填结束",
    "版稅與分成": "版税与分成",
    "管理作者、配音、畫師等合作方應付金額。": "管理作者、配音、画师等合作方应付金额。",
    "收款對象": "收款对象",
    "角色": "角色",
    "計算基礎": "计算基础",
    "比例 %": "比例 %",
    "應付金額": "应付金额",
    "更新版稅紀錄": "更新版税记录",
    "新增版稅紀錄": "新增版税记录",
    "刪除版稅紀錄": "删除版税记录",
    "版稅紀錄已刪除。": "版税记录已删除。",
    "還沒有版稅與分成資料。": "还没有版税与分成资料。",
    "未填角色": "未填角色",
    "未填基礎": "未填基础",
    "經營報表": "经营报表",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "导出 ZIP，内含经营总览 HTML、JSON 与各类 CSV，可直接交给财务或商务同事。",
    "立即匯出報表 ZIP": "立即导出报表 ZIP",
    "下載報表 ZIP": "下载报表 ZIP",
    "還沒有經營報表匯出紀錄。": "还没有经营报表导出记录。",
    "retail": "零售",
    "advertiser": "广告商",
    "platform": "平台合作",
    "library": "图书馆",
    "education": "教育",
    "planning": "规划中",
    "scheduled": "已排程",
    "live": "上架中",
    "paused": "暂停",
    "delisted": "下架",
    "booked": "已入账",
    "paid": "已付款",
    "proposal": "提案中",
    "negotiating": "洽谈中",
    "signed": "已签约",
    "settled": "已结清",
    "closed": "已结束",
    "expired": "已到期",
    "terminated": "已终止",
    "production": "制作",
    "net_revenue": "净营收",
  },
  en: {
    "AI Publisher 本機工作台": "AI Publisher Local Studio",
    "專案": "Projects",
    "專案列表": "Project List",
    "未填作者": "Author missing",
    "未提供": "Not provided",
    "後端": "Backend",
    "資料庫": "Database",
    "語音": "Voice",
    "範圍": "Scope",
    "文本準備": "Text Prep",
    "聲線設定": "Voice Setup",
    "角色設定": "Character Setup",
    "漫畫腳本": "Comic Script",
    "分鏡工作台": "Storyboard",
    "畫格生成": "Panel Generation",
    "頁面排版": "Page Layout",
    "漫畫設定": "Comic Settings",
    "Video 設定": "Video Settings",
    "生成任務": "Generation Jobs",
    "審核校對": "Review",
    "匯出交付": "Export",
    "系統設定": "System Settings",
    "建立專案": "Create Project",
    "刪除": "Delete",
    "生成本章": "Generate Chapter",
    "匯出專案": "Export Project",
    "渲染本章": "Render Chapter",
    "章節": "Chapters",
    "章節地圖": "Chapter Map",
    "畫格": "Panels",
    "漫畫頁": "Comic Pages",
    "有聲書流程": "Audiobook Flow",
    "漫畫流程": "Comic Flow",
    "系統與擴展": "System and Extensions",
    "外部 LLM": "External LLMs",
    "官方入口": "Official Links",
    "文本、角色、聲線、生成與審核": "Text, characters, voices, generation, and review",
    "腳本、分鏡、畫格與排版": "Script, storyboard, panels, and layout",
    "模型模板與系統設定": "Model presets and system settings",
    "目前還沒有專案": "No projects yet",
    "章節渲染": "Chapter Render",
    "專案匯出": "Project Export",
    "本機運行環境": "Local Runtime",
    "多模態規劃": "Multimodal Plan",
    "建立": "Create",
    "建立中...": "Creating...",
    "取消": "Cancel",
    "儲存": "Save",
    "儲存中...": "Saving...",
    "生成": "Generate",
    "生成中...": "Generating...",
    "分析本章人物": "Analyze Chapter Characters",
    "自動建立並綁定": "Auto-create and bind",
    "套用到勾選段落": "Apply to selected segments",
    "套用到整章": "Apply to chapter",
    "解除角色綁定": "Clear character binding",
    "解除聲線覆寫": "Clear voice override",
    "全選本頁": "Select page",
    "取消本頁全選": "Clear page selection",
    "合併為一段": "Merge into one",
    "合併段落": "Merge segments",
    "分析中...": "Analyzing...",
    "綁定中...": "Binding...",
    "通過": "Approve",
    "退回": "Reject",
    "重新生成": "Regenerate",
    "新增人工問題": "Add manual issue",
    "渲染目前章節": "Render chapter",
    "匯出 ZIP": "Export ZIP",
    "下載 ZIP": "Download ZIP",
    "標題": "Title",
    "作者": "Author",
    "語言": "Language",
    "專案類型": "Project Type",
    "描述": "Description",
    "電子郵件": "Email",
    "密碼": "Password",
    "登入": "Sign in",
    "登入中...": "Signing in...",
    "進入 Studio": "Enter Studio",
    "選擇檔案": "Choose File",
    "匯入文本": "Import Text",
    "從路徑匯入": "Import from Path",
    "匯入中...": "Importing...",
    "處理中...": "Processing...",
    "請確認": "Please confirm",
    "尚未選擇檔案": "No file selected",
    "請先建立專案並匯入文本。": "Create a project and import text first.",
    "新專案已建立。": "Project created.",
    "文本匯入完成，章節與段落已建立。": "Text import finished. Chapters and segments were created.",
    "生成任務已送出。": "Generation job submitted.",
    "章節渲染任務已建立。": "Chapter render job created.",
    "匯出任務已建立。": "Export job created.",
    "登入成功，本機版 Studio 已就緒。": "Signed in. The local Studio is ready.",
  },
  ja: {
    "AI Publisher 本機工作台": "AI Publisher ローカルスタジオ",
    "專案": "プロジェクト",
    "專案列表": "プロジェクト一覧",
    "未填作者": "作者未入力",
    "未提供": "未設定",
    "後端": "バックエンド",
    "資料庫": "データベース",
    "語音": "音声",
    "範圍": "範囲",
    "文本準備": "テキスト準備",
    "聲線設定": "音声設定",
    "角色設定": "キャラクター設定",
    "漫畫腳本": "コミック脚本",
    "分鏡工作台": "絵コンテ",
    "畫格生成": "コマ生成",
    "頁面排版": "ページレイアウト",
    "漫畫設定": "コミック設定",
    "Video 設定": "Video 設定",
    "生成任務": "生成タスク",
    "審核校對": "レビュー",
    "匯出交付": "書き出し",
    "系統設定": "システム設定",
    "建立專案": "プロジェクト作成",
    "刪除": "削除",
    "生成本章": "この章を生成",
    "匯出專案": "プロジェクト書き出し",
    "渲染本章": "この章をレンダー",
    "章節": "章",
    "章節地圖": "章マップ",
    "畫格": "コマ",
    "漫畫頁": "コミックページ",
    "有聲書流程": "音声書籍フロー",
    "漫畫流程": "コミックフロー",
    "系統與擴展": "システムと拡張",
    "外部 LLM": "外部 LLM",
    "官方入口": "公式リンク",
    "文本、角色、聲線、生成與審核": "テキスト、キャラクター、音声、生成、レビュー",
    "腳本、分鏡、畫格與排版": "脚本、絵コンテ、コマ、レイアウト",
    "模型模板與系統設定": "モデルプリセットとシステム設定",
    "目前還沒有專案": "まだプロジェクトがありません",
    "章節渲染": "章レンダー",
    "專案匯出": "プロジェクト書き出し",
    "本機運行環境": "ローカル実行環境",
    "多模態規劃": "マルチモーダル計画",
    "建立": "作成",
    "建立中...": "作成中...",
    "取消": "キャンセル",
    "儲存": "保存",
    "儲存中...": "保存中...",
    "生成": "生成",
    "生成中...": "生成中...",
    "分析本章人物": "この章の人物を分析",
    "自動建立並綁定": "自動作成して紐付け",
    "套用到勾選段落": "選択段落に適用",
    "套用到整章": "章全体に適用",
    "解除角色綁定": "キャラクター紐付け解除",
    "解除聲線覆寫": "音声上書きを解除",
    "全選本頁": "このページを全選択",
    "取消本頁全選": "このページの選択解除",
    "合併為一段": "1段に結合",
    "合併段落": "段落を結合",
    "分析中...": "分析中...",
    "綁定中...": "紐付け中...",
    "通過": "承認",
    "退回": "差し戻し",
    "重新生成": "再生成",
    "新增人工問題": "手動課題を追加",
    "渲染目前章節": "現在の章をレンダー",
    "匯出 ZIP": "ZIP 書き出し",
    "下載 ZIP": "ZIP をダウンロード",
    "標題": "タイトル",
    "作者": "作者",
    "語言": "言語",
    "專案類型": "プロジェクト種別",
    "描述": "説明",
    "電子郵件": "メールアドレス",
    "密碼": "パスワード",
    "登入": "ログイン",
    "登入中...": "ログイン中...",
    "進入 Studio": "Studio に入る",
    "選擇檔案": "ファイルを選択",
    "匯入文本": "テキストを取り込む",
    "從路徑匯入": "パスから取り込む",
    "匯入中...": "取り込み中...",
    "處理中...": "処理中...",
    "請確認": "確認してください",
    "尚未選擇檔案": "ファイル未選択",
    "請先建立專案並匯入文本。": "先にプロジェクトを作成してテキストを取り込んでください。",
    "新專案已建立。": "新しいプロジェクトを作成しました。",
    "文本匯入完成，章節與段落已建立。": "テキストの取り込みが完了し、章と段落を作成しました。",
    "生成任務已送出。": "生成タスクを送信しました。",
    "章節渲染任務已建立。": "章レンダータスクを作成しました。",
    "匯出任務已建立。": "書き出しタスクを作成しました。",
    "登入成功，本機版 Studio 已就緒。": "ログインしました。ローカル Studio の準備ができました。",
  },
  ko: {
    "AI Publisher 本機工作台": "AI Publisher 로컬 스튜디오",
    "專案": "프로젝트",
    "專案列表": "프로젝트 목록",
    "未填作者": "작가 미입력",
    "未提供": "정보 없음",
    "後端": "백엔드",
    "資料庫": "데이터베이스",
    "語音": "음성",
    "範圍": "범위",
    "文本準備": "텍스트 준비",
    "聲線設定": "음성 설정",
    "角色設定": "캐릭터 설정",
    "漫畫腳本": "만화 스크립트",
    "分鏡工作台": "콘티 작업대",
    "畫格生成": "패널 생성",
    "頁面排版": "페이지 레이아웃",
    "漫畫設定": "만화 설정",
    "Video 設定": "Video 설정",
    "生成任務": "생성 작업",
    "審核校對": "검수",
    "匯出交付": "내보내기",
    "系統設定": "시스템 설정",
    "建立專案": "프로젝트 생성",
    "刪除": "삭제",
    "生成本章": "이 장 생성",
    "匯出專案": "프로젝트 내보내기",
    "渲染本章": "이 장 렌더링",
    "章節": "장",
    "章節地圖": "장 맵",
    "畫格": "패널",
    "漫畫頁": "만화 페이지",
    "有聲書流程": "오디오북 흐름",
    "漫畫流程": "만화 흐름",
    "系統與擴展": "시스템 및 확장",
    "外部 LLM": "외부 LLM",
    "官方入口": "공식 링크",
    "文本、角色、聲線、生成與審核": "텍스트, 캐릭터, 음성, 생성, 검수",
    "腳本、分鏡、畫格與排版": "스크립트, 콘티, 패널, 레이아웃",
    "模型模板與系統設定": "모델 프리셋 및 시스템 설정",
    "目前還沒有專案": "아직 프로젝트가 없습니다",
    "章節渲染": "장 렌더링",
    "專案匯出": "프로젝트 내보내기",
    "本機運行環境": "로컬 실행 환경",
    "多模態規劃": "멀티모달 계획",
    "建立": "생성",
    "建立中...": "생성 중...",
    "取消": "취소",
    "儲存": "저장",
    "儲存中...": "저장 중...",
    "生成": "생성",
    "生成中...": "생성 중...",
    "分析本章人物": "이 장의 인물 분석",
    "自動建立並綁定": "자동 생성 및 연결",
    "套用到勾選段落": "선택한 문단에 적용",
    "套用到整章": "전체 장에 적용",
    "解除角色綁定": "캐릭터 연결 해제",
    "解除聲線覆寫": "음성 덮어쓰기 해제",
    "全選本頁": "이 페이지 전체 선택",
    "取消本頁全選": "이 페이지 선택 해제",
    "合併為一段": "한 문단으로 병합",
    "合併段落": "문단 병합",
    "分析中...": "분석 중...",
    "綁定中...": "연결 중...",
    "通過": "승인",
    "退回": "반려",
    "重新生成": "다시 생성",
    "新增人工問題": "수동 이슈 추가",
    "渲染目前章節": "현재 장 렌더링",
    "匯出 ZIP": "ZIP 내보내기",
    "下載 ZIP": "ZIP 다운로드",
    "標題": "제목",
    "作者": "작가",
    "語言": "언어",
    "專案類型": "프로젝트 유형",
    "描述": "설명",
    "電子郵件": "이메일",
    "密碼": "비밀번호",
    "登入": "로그인",
    "登入中...": "로그인 중...",
    "進入 Studio": "Studio 시작",
    "選擇檔案": "파일 선택",
    "匯入文本": "텍스트 가져오기",
    "從路徑匯入": "경로에서 가져오기",
    "匯入中...": "가져오는 중...",
    "處理中...": "처리 중...",
    "請確認": "확인해 주세요",
    "尚未選擇檔案": "선택된 파일 없음",
    "請先建立專案並匯入文本。": "먼저 프로젝트를 만들고 텍스트를 가져오세요.",
    "新專案已建立。": "새 프로젝트가 생성되었습니다.",
    "文本匯入完成，章節與段落已建立。": "텍스트 가져오기가 완료되었고 장과 문단이 생성되었습니다.",
    "生成任務已送出。": "생성 작업이 제출되었습니다.",
    "章節渲染任務已建立。": "장 렌더링 작업이 생성되었습니다.",
    "匯出任務已建立。": "내보내기 작업이 생성되었습니다.",
    "登入成功，本機版 Studio 已就緒。": "로그인되었습니다. 로컬 Studio 가 준비되었습니다.",
  },
  th: {
    "AI Publisher 本機工作台": "AI Publisher Local Studio",
    "專案": "โปรเจกต์",
    "專案列表": "รายการโปรเจกต์",
    "未填作者": "ยังไม่ได้กรอกผู้เขียน",
    "未提供": "ไม่มีข้อมูล",
    "後端": "แบ็กเอนด์",
    "資料庫": "ฐานข้อมูล",
    "語音": "เสียง",
    "範圍": "ขอบเขต",
    "文本準備": "เตรียมข้อความ",
    "聲線設定": "ตั้งค่าเสียง",
    "角色設定": "ตั้งค่าตัวละคร",
    "漫畫腳本": "สคริปต์คอมิก",
    "分鏡工作台": "กระดานสตอรี่บอร์ด",
    "畫格生成": "สร้างช่องภาพ",
    "頁面排版": "จัดหน้าหนังสือ",
    "漫畫設定": "ตั้งค่าคอมิก",
    "Video 設定": "ตั้งค่า Video",
    "生成任務": "งานสร้าง",
    "審核校對": "ตรวจทาน",
    "匯出交付": "ส่งออกและส่งมอบ",
    "系統設定": "ตั้งค่าระบบ",
    "建立專案": "สร้างโปรเจกต์",
    "刪除": "ลบ",
    "生成本章": "สร้างบทนี้",
    "匯出專案": "ส่งออกโปรเจกต์",
    "渲染本章": "เรนเดอร์บทนี้",
    "章節": "บท",
    "章節地圖": "แผนที่บท",
    "畫格": "ช่องภาพ",
    "漫畫頁": "หน้าคอมิก",
    "有聲書流程": "โฟลว์หนังสือเสียง",
    "漫畫流程": "โฟลว์คอมิก",
    "系統與擴展": "ระบบและส่วนขยาย",
    "外部 LLM": "LLM ภายนอก",
    "官方入口": "ลิงก์ทางการ",
    "文本、角色、聲線、生成與審核": "ข้อความ ตัวละคร เสียง การสร้าง และการตรวจทาน",
    "腳本、分鏡、畫格與排版": "สคริปต์ สตอรี่บอร์ด ช่องภาพ และเลย์เอาต์",
    "模型模板與系統設定": "พรีเซ็ตโมเดลและการตั้งค่าระบบ",
    "目前還沒有專案": "ยังไม่มีโปรเจกต์",
    "章節渲染": "การเรนเดอร์บท",
    "專案匯出": "ส่งออกโปรเจกต์",
    "本機運行環境": "สภาพแวดล้อมภายในเครื่อง",
    "多模態規劃": "การวางแผนหลายโมดัล",
    "建立": "สร้าง",
    "建立中...": "กำลังสร้าง...",
    "取消": "ยกเลิก",
    "儲存": "บันทึก",
    "儲存中...": "กำลังบันทึก...",
    "生成": "สร้าง",
    "生成中...": "กำลังสร้าง...",
    "分析本章人物": "วิเคราะห์ตัวละครของบทนี้",
    "自動建立並綁定": "สร้างและผูกอัตโนมัติ",
    "套用到勾選段落": "ใช้กับย่อหน้าที่เลือก",
    "套用到整章": "ใช้กับทั้งบท",
    "解除角色綁定": "ยกเลิกการผูกตัวละคร",
    "解除聲線覆寫": "ยกเลิกการแทนที่เสียง",
    "全選本頁": "เลือกทั้งหน้านี้",
    "取消本頁全選": "ยกเลิกเลือกทั้งหน้านี้",
    "合併為一段": "รวมเป็นย่อหน้าเดียว",
    "合併段落": "รวมย่อหน้า",
    "分析中...": "กำลังวิเคราะห์...",
    "綁定中...": "กำลังผูก...",
    "通過": "อนุมัติ",
    "退回": "ส่งกลับ",
    "重新生成": "สร้างใหม่",
    "新增人工問題": "เพิ่มประเด็นตรวจสอบด้วยตนเอง",
    "渲染目前章節": "เรนเดอร์บทปัจจุบัน",
    "匯出 ZIP": "ส่งออก ZIP",
    "下載 ZIP": "ดาวน์โหลด ZIP",
    "標題": "ชื่อเรื่อง",
    "作者": "ผู้เขียน",
    "語言": "ภาษา",
    "專案類型": "ประเภทโปรเจกต์",
    "描述": "คำอธิบาย",
    "電子郵件": "อีเมล",
    "密碼": "รหัสผ่าน",
    "登入": "เข้าสู่ระบบ",
    "登入中...": "กำลังเข้าสู่ระบบ...",
    "進入 Studio": "เข้า Studio",
    "選擇檔案": "เลือกไฟล์",
    "匯入文本": "นำเข้าข้อความ",
    "從路徑匯入": "นำเข้าจากพาธ",
    "匯入中...": "กำลังนำเข้า...",
    "處理中...": "กำลังประมวลผล...",
    "請確認": "โปรดยืนยัน",
    "尚未選擇檔案": "ยังไม่ได้เลือกไฟล์",
    "請先建立專案並匯入文本。": "กรุณาสร้างโปรเจกต์และนำเข้าข้อความก่อน",
    "新專案已建立。": "สร้างโปรเจกต์ใหม่แล้ว",
    "文本匯入完成，章節與段落已建立。": "นำเข้าข้อความเรียบร้อยแล้ว และได้สร้างบทกับย่อหน้าแล้ว",
    "生成任務已送出。": "ส่งงานสร้างแล้ว",
    "章節渲染任務已建立。": "สร้างงานเรนเดอร์บทแล้ว",
    "匯出任務已建立。": "สร้างงานส่งออกแล้ว",
    "登入成功，本機版 Studio 已就緒。": "เข้าสู่ระบบสำเร็จ Local Studio พร้อมใช้งานแล้ว",
  },
};
const BUSINESS_EXACT_TRANSLATIONS = {
  "zh-Hans": {
    "經營管理": "经营管理",
    "權利、成本、渠道、銷售、版稅": "权利、成本、渠道、销售、版税",
    "打開經營頁": "打开经营页",
    "先選取一個專案，再進入經營管理頁。": "请先选择一个项目，再进入经营管理页。",
    "基準幣已更新。": "基准币已更新。",
    "權利與合同資料已新增。": "权利与合同资料已新增。",
    "權利與合同資料已更新。": "权利与合同资料已更新。",
    "發行渠道資料已新增。": "发行渠道资料已新增。",
    "發行渠道資料已更新。": "发行渠道资料已更新。",
    "成本項目已新增。": "成本项目已新增。",
    "成本項目已更新。": "成本项目已更新。",
    "銷售回傳已新增。": "销售回传已新增。",
    "銷售回傳已更新。": "销售回传已更新。",
    "版稅結算資料已新增。": "版税结算资料已新增。",
    "版稅結算資料已更新。": "版税结算资料已更新。",
    "匯率已新增。": "汇率已新增。",
    "匯率已更新。": "汇率已更新。",
    "廣告合作已新增。": "广告合作已新增。",
    "廣告合作已更新。": "广告合作已更新。",
    "經營報表已匯出。": "经营报表已导出。",
    "經營總覽": "经营总览",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "把权利、广告、渠道、成本、销售、版税与报表集中在同一页。",
    "匯出中...": "导出中...",
    "匯出經營報表": "导出经营报表",
    "有效授權": "有效授权",
    "上架渠道": "上架渠道",
    "廣告合作": "广告合作",
    "累計成本": "累计成本",
    "累計營收": "累计营收",
    "版稅應付": "版税应付",
    "估算毛利": "估算毛利",
    "廣告收入": "广告收入",
    "廣告簽約額": "广告签约额",
    "廣告已回款": "广告已回款",
    "累計銷量": "累计销量",
    "匯率筆數": "汇率笔数",
    "目前所有幣別都有可用匯率。": "目前所有币种都有可用汇率。",
    "多幣種與匯率": "多币种与汇率",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "先设置项目基准币，再维护汇率，让营收、成本、版税都能换算。",
    "專案基準幣": "项目基准币",
    "更新中...": "更新中...",
    "更新基準幣": "更新基准币",
    "來源幣別": "来源币种",
    "目標幣別": "目标币种",
    "匯率": "汇率",
    "生效日期": "生效日期",
    "備註": "备注",
    "例如：2026 Q1 財務匯率": "例如：2026 Q1 财务汇率",
    "更新匯率": "更新汇率",
    "新增匯率": "新增汇率",
    "取消編輯": "取消编辑",
    "編輯": "编辑",
    "刪除匯率": "删除汇率",
    "匯率已刪除。": "汇率已删除。",
    "還沒有匯率資料，跨幣種金額將無法折算。": "还没有汇率资料，跨币种金额将无法折算。",
    "原始金額彙總": "原始金额汇总",
    "廣告合作專區": "广告合作专区",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "集中管理广告商、合作档期、交付内容、签约额与回款，这里就是你的广告台账。",
    "廣告商": "广告商",
    "品牌 / 廣告主": "品牌 / 广告主",
    "合作專案": "合作项目",
    "春季品牌合作 / 書內植入": "春季品牌合作 / 书内植入",
    "聯絡人": "联系人",
    "窗口姓名": "窗口姓名",
    "負責人": "负责人",
    "內部 PM": "内部 PM",
    "交付內容": "交付内容",
    "片頭口播、書腰、聯名封面、投放頁": "片头口播、书腰、联名封面、投放页",
    "開始日期": "开始日期",
    "結束日期": "结束日期",
    "簽約金額": "签约金额",
    "已回款": "已回款",
    "幣別": "币别",
    "例如：需另附品牌审稿": "例如：需另附品牌审稿",
    "更新廣告合作": "更新广告合作",
    "新增廣告合作": "新增广告合作",
    "刪除廣告合作": "删除广告合作",
    "廣告合作已刪除。": "广告合作已删除。",
    "還沒有廣告合作資料。": "还没有广告合作资料。",
    "權利與合同": "权利与合同",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "记录作品是否取得有声书、漫画、海外版等权利。",
    "權利類型": "权利类型",
    "權利持有人": "权利持有人",
    "授權範圍": "授权范围",
    "地區": "地区",
    "合同編號": "合同编号",
    "更新權利紀錄": "更新权利记录",
    "新增權利紀錄": "新增权利记录",
    "刪除權利紀錄": "删除权利记录",
    "權利紀錄已刪除。": "权利记录已删除。",
    "還沒有權利與合同資料。": "还没有权利与合同资料。",
    "發行渠道": "发行渠道",
    "追蹤上架平台、廣告商、館配或教育渠道。": "追踪上架平台、广告商、馆配或教育渠道。",
    "渠道名稱": "渠道名称",
    "渠道類型": "渠道类型",
    "零售渠道": "零售渠道",
    "平台合作": "平台合作",
    "圖書館": "图书馆",
    "教育機構": "教育机构",
    "格式": "格式",
    "售價": "售价",
    "外部 SKU": "外部 SKU",
    "更新發行渠道": "更新发行渠道",
    "新增發行渠道": "新增发行渠道",
    "刪除發行渠道": "删除发行渠道",
    "發行渠道已刪除。": "发行渠道已删除。",
    "還沒有發行渠道資料。": "还没有发行渠道资料。",
    "未排上架日": "未排上架日",
    "成本核算": "成本核算",
    "補齊模型費、外包、審校、宣傳等成本。": "补齐模型费、外包、审校、宣传等成本。",
    "成本類別": "成本类别",
    "供應商或來源": "供应商或来源",
    "金額": "金额",
    "發生日": "发生日",
    "說明": "说明",
    "更新成本項目": "更新成本项目",
    "新增成本項目": "新增成本项目",
    "刪除成本項目": "删除成本项目",
    "成本項目已刪除。": "成本项目已删除。",
    "還沒有成本項目。": "还没有成本项目。",
    "未填來源": "未填来源",
    "未填日期": "未填日期",
    "銷售回傳": "销售回传",
    "可記錄零售、廣告、館配或教育採購收入。": "可记录零售、广告、馆配或教育采购收入。",
    "收入類型": "收入类型",
    "零售銷售": "零售销售",
    "廣告 / 贊助": "广告 / 赞助",
    "館配": "馆配",
    "教育採購": "教育采购",
    "銷量": "销量",
    "期間開始": "期间开始",
    "期間結束": "期间结束",
    "毛營收": "毛营收",
    "退款": "退款",
    "淨營收": "净营收",
    "留空則自動計算": "留空则自动计算",
    "更新銷售紀錄": "更新销售记录",
    "新增銷售紀錄": "新增销售记录",
    "刪除銷售紀錄": "删除销售记录",
    "銷售紀錄已刪除。": "销售记录已删除。",
    "還沒有銷售回傳資料。": "还没有销售回传资料。",
    "未填開始": "未填开始",
    "未填結束": "未填结束",
    "版稅與分成": "版税与分成",
    "管理作者、配音、畫師等合作方應付金額。": "管理作者、配音、画师等合作方应付金额。",
    "收款對象": "收款对象",
    "角色": "角色",
    "計算基礎": "计算基础",
    "比例 %": "比例 %",
    "應付金額": "应付金额",
    "更新版稅紀錄": "更新版税记录",
    "新增版稅紀錄": "新增版税记录",
    "刪除版稅紀錄": "删除版税记录",
    "版稅紀錄已刪除。": "版税记录已删除。",
    "還沒有版稅與分成資料。": "还没有版税与分成资料。",
    "未填角色": "未填角色",
    "未填基礎": "未填基础",
    "經營報表": "经营报表",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "导出 ZIP，内含经营总览 HTML、JSON 与各类 CSV，可直接交给财务或商务同事。",
    "立即匯出報表 ZIP": "立即导出报表 ZIP",
    "下載報表 ZIP": "下载报表 ZIP",
    "還沒有經營報表匯出紀錄。": "还没有经营报表导出记录。",
    "刪除發行渠道": "删除发行渠道",
    "刪除銷售紀錄": "删除销售记录",
    "刪除版稅紀錄": "删除版税记录",
    "刪除成本項目": "删除成本项目",
    "刪除廣告合作": "删除广告合作",
    "刪除權利紀錄": "删除权利记录",
    "未填生效日": "未填生效日",
    "未指定": "未指定",
    "未填授權範圍": "未填授权范围",
    "未填地區": "未填地区",
    "未填語言": "未填语言",
    "retail": "零售",
    "advertiser": "广告商",
    "platform": "平台合作",
    "library": "图书馆",
    "education": "教育",
    "planning": "规划中",
    "scheduled": "已排程",
    "live": "上架中",
    "paused": "暂停",
    "delisted": "下架",
    "booked": "已入账",
    "paid": "已付款",
    "proposal": "提案中",
    "negotiating": "洽谈中",
    "signed": "已签约",
    "settled": "已结清",
    "closed": "已结束",
    "expired": "已到期",
    "terminated": "已终止",
    "production": "制作",
    "net_revenue": "净营收",
    "running": "进行中",
    "active": "有效",
    "pending": "待处理",
    "approved": "已核准",
    "planned": "计划中",
  },
  en: {
    "經營管理": "Business Management",
    "權利、成本、渠道、銷售、版稅": "Rights, costs, channels, sales, and royalties",
    "打開經營頁": "Open business page",
    "先選取一個專案，再進入經營管理頁。": "Select a project first, then open Business Management.",
    "基準幣已更新。": "Base currency updated.",
    "權利與合同資料已新增。": "Rights and contract record created.",
    "權利與合同資料已更新。": "Rights and contract record updated.",
    "發行渠道資料已新增。": "Distribution channel created.",
    "發行渠道資料已更新。": "Distribution channel updated.",
    "成本項目已新增。": "Cost item created.",
    "成本項目已更新。": "Cost item updated.",
    "銷售回傳已新增。": "Sales record created.",
    "銷售回傳已更新。": "Sales record updated.",
    "版稅結算資料已新增。": "Royalty statement created.",
    "版稅結算資料已更新。": "Royalty statement updated.",
    "匯率已新增。": "Exchange rate created.",
    "匯率已更新。": "Exchange rate updated.",
    "廣告合作已新增。": "Advertising deal created.",
    "廣告合作已更新。": "Advertising deal updated.",
    "經營報表已匯出。": "Business report exported.",
    "經營總覽": "Business Overview",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "Keep rights, advertising, channels, costs, sales, royalties, and reports on one page.",
    "匯出中...": "Exporting...",
    "匯出經營報表": "Export business report",
    "有效授權": "Active rights",
    "上架渠道": "Live channels",
    "廣告合作": "Ad deals",
    "累計成本": "Total cost",
    "累計營收": "Total revenue",
    "版稅應付": "Royalties payable",
    "估算毛利": "Estimated gross profit",
    "廣告收入": "Ad revenue",
    "廣告簽約額": "Ad contract value",
    "廣告已回款": "Ad cash received",
    "累計銷量": "Units sold",
    "匯率筆數": "Exchange rates",
    "目前所有幣別都有可用匯率。": "All currencies currently have exchange rates.",
    "多幣種與匯率": "Multi-currency and rates",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "Set the project base currency first, then maintain exchange rates so revenue, costs, and royalties can be converted.",
    "專案基準幣": "Project base currency",
    "更新中...": "Updating...",
    "更新基準幣": "Update base currency",
    "來源幣別": "Source currency",
    "目標幣別": "Target currency",
    "匯率": "Exchange rate",
    "生效日期": "Effective date",
    "備註": "Notes",
    "例如：2026 Q1 財務匯率": "Example: 2026 Q1 finance rate",
    "更新匯率": "Update exchange rate",
    "新增匯率": "Add exchange rate",
    "取消編輯": "Cancel edit",
    "編輯": "Edit",
    "刪除匯率": "Delete exchange rate",
    "匯率已刪除。": "Exchange rate deleted.",
    "還沒有匯率資料，跨幣種金額將無法折算。": "No exchange rates yet. Cross-currency amounts cannot be converted.",
    "原始金額彙總": "Original amount summary",
    "廣告合作專區": "Advertising deals",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "Manage advertisers, campaign windows, deliverables, contract value, and collections in one advertising ledger.",
    "廣告商": "Advertiser",
    "品牌 / 廣告主": "Brand / sponsor",
    "合作專案": "Campaign",
    "春季品牌合作 / 書內植入": "Spring brand campaign / in-book placement",
    "聯絡人": "Contact",
    "窗口姓名": "Contact name",
    "負責人": "Owner",
    "內部 PM": "Internal PM",
    "交付內容": "Deliverables",
    "片頭口播、書腰、聯名封面、投放頁": "Intro read, obi strip, co-branded cover, landing page",
    "開始日期": "Start date",
    "結束日期": "End date",
    "簽約金額": "Contract amount",
    "已回款": "Collected",
    "幣別": "Currency",
    "例如：需另附品牌审稿": "Example: brand review required",
    "更新廣告合作": "Update ad deal",
    "新增廣告合作": "Add ad deal",
    "刪除廣告合作": "Delete ad deal",
    "廣告合作已刪除。": "Ad deal deleted.",
    "還沒有廣告合作資料。": "No advertising deals yet.",
    "權利與合同": "Rights and contracts",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "Track whether audiobook, comic, overseas, and other rights have been secured.",
    "權利類型": "Rights type",
    "權利持有人": "Rights holder",
    "授權範圍": "Grant scope",
    "地區": "Territory",
    "合同編號": "Contract ID",
    "更新權利紀錄": "Update rights record",
    "新增權利紀錄": "Add rights record",
    "刪除權利紀錄": "Delete rights record",
    "權利紀錄已刪除。": "Rights record deleted.",
    "還沒有權利與合同資料。": "No rights or contract records yet.",
    "發行渠道": "Distribution channels",
    "追蹤上架平台、廣告商、館配或教育渠道。": "Track retail platforms, advertisers, library supply, and education channels.",
    "渠道名稱": "Channel name",
    "渠道類型": "Channel type",
    "零售渠道": "Retail",
    "平台合作": "Platform partnership",
    "圖書館": "Library",
    "教育機構": "Education",
    "格式": "Format",
    "售價": "Price",
    "外部 SKU": "External SKU",
    "更新發行渠道": "Update channel",
    "新增發行渠道": "Add channel",
    "刪除發行渠道": "Delete channel",
    "發行渠道已刪除。": "Channel deleted.",
    "還沒有發行渠道資料。": "No channel records yet.",
    "未排上架日": "No release date",
    "成本核算": "Cost accounting",
    "補齊模型費、外包、審校、宣傳等成本。": "Track model costs, outsourcing, editing, marketing, and other expenses.",
    "成本類別": "Cost category",
    "供應商或來源": "Vendor or source",
    "金額": "Amount",
    "發生日": "Incurred on",
    "說明": "Description",
    "更新成本項目": "Update cost item",
    "新增成本項目": "Add cost item",
    "刪除成本項目": "Delete cost item",
    "成本項目已刪除。": "Cost item deleted.",
    "還沒有成本項目。": "No cost items yet.",
    "未填來源": "Source missing",
    "未填日期": "Date missing",
    "銷售回傳": "Sales records",
    "可記錄零售、廣告、館配或教育採購收入。": "Record revenue from retail, advertising, library supply, or education procurement.",
    "收入類型": "Revenue type",
    "零售銷售": "Retail sales",
    "廣告 / 贊助": "Ads / sponsorship",
    "館配": "Library supply",
    "教育採購": "Education procurement",
    "銷量": "Units",
    "期間開始": "Period start",
    "期間結束": "Period end",
    "毛營收": "Gross revenue",
    "退款": "Refunds",
    "淨營收": "Net revenue",
    "留空則自動計算": "Leave blank to auto-calculate",
    "更新銷售紀錄": "Update sales record",
    "新增銷售紀錄": "Add sales record",
    "刪除銷售紀錄": "Delete sales record",
    "銷售紀錄已刪除。": "Sales record deleted.",
    "還沒有銷售回傳資料。": "No sales records yet.",
    "未填開始": "Start missing",
    "未填結束": "End missing",
    "版稅與分成": "Royalties and splits",
    "管理作者、配音、畫師等合作方應付金額。": "Manage payable amounts for authors, voice actors, illustrators, and other partners.",
    "收款對象": "Payee",
    "角色": "Role",
    "計算基礎": "Basis",
    "比例 %": "Rate %",
    "應付金額": "Amount due",
    "更新版稅紀錄": "Update royalty record",
    "新增版稅紀錄": "Add royalty record",
    "刪除版稅紀錄": "Delete royalty record",
    "版稅紀錄已刪除。": "Royalty record deleted.",
    "還沒有版稅與分成資料。": "No royalty records yet.",
    "未填角色": "Role missing",
    "未填基礎": "Basis missing",
    "經營報表": "Business reports",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "Export a ZIP with overview HTML, JSON, and CSV files for finance or business teams.",
    "立即匯出報表 ZIP": "Export report ZIP now",
    "下載報表 ZIP": "Download report ZIP",
    "還沒有經營報表匯出紀錄。": "No business report exports yet.",
    "未填生效日": "Effective date missing",
    "未指定": "Unassigned",
    "未填授權範圍": "Scope missing",
    "未填地區": "Territory missing",
    "未填語言": "Language missing",
    "retail": "Retail",
    "advertiser": "Advertiser",
    "platform": "Platform",
    "library": "Library",
    "education": "Education",
    "planning": "Planning",
    "scheduled": "Scheduled",
    "live": "Live",
    "paused": "Paused",
    "delisted": "Delisted",
    "booked": "Booked",
    "paid": "Paid",
    "proposal": "Proposal",
    "negotiating": "Negotiating",
    "signed": "Signed",
    "settled": "Settled",
    "closed": "Closed",
    "expired": "Expired",
    "terminated": "Terminated",
    "production": "Production",
    "net_revenue": "Net revenue",
    "running": "Running",
    "active": "Active",
    "pending": "Pending",
    "approved": "Approved",
    "planned": "Planned",
  },
  ja: {
    "經營管理": "事業管理",
    "權利、成本、渠道、銷售、版稅": "権利、コスト、チャネル、売上、ロイヤリティ",
    "打開經營頁": "事業管理を開く",
    "先選取一個專案，再進入經營管理頁。": "先にプロジェクトを選択してから事業管理を開いてください。",
    "基準幣已更新。": "基準通貨を更新しました。",
    "權利與合同資料已新增。": "権利・契約レコードを追加しました。",
    "權利與合同資料已更新。": "権利・契約レコードを更新しました。",
    "發行渠道資料已新增。": "配信チャネルを追加しました。",
    "發行渠道資料已更新。": "配信チャネルを更新しました。",
    "成本項目已新增。": "コスト項目を追加しました。",
    "成本項目已更新。": "コスト項目を更新しました。",
    "銷售回傳已新增。": "売上レコードを追加しました。",
    "銷售回傳已更新。": "売上レコードを更新しました。",
    "版稅結算資料已新增。": "ロイヤリティ精算を追加しました。",
    "版稅結算資料已更新。": "ロイヤリティ精算を更新しました。",
    "匯率已新增。": "為替レートを追加しました。",
    "匯率已更新。": "為替レートを更新しました。",
    "廣告合作已新增。": "広告案件を追加しました。",
    "廣告合作已更新。": "広告案件を更新しました。",
    "經營報表已匯出。": "事業レポートを出力しました。",
    "經營總覽": "事業サマリー",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "権利、広告、チャネル、コスト、売上、ロイヤリティ、レポートを1ページに集約します。",
    "匯出中...": "出力中...",
    "匯出經營報表": "事業レポートを出力",
    "有效授權": "有効な権利",
    "上架渠道": "公開中チャネル",
    "廣告合作": "広告案件",
    "累計成本": "累計コスト",
    "累計營收": "累計売上",
    "版稅應付": "支払予定ロイヤリティ",
    "估算毛利": "概算粗利",
    "廣告收入": "広告収益",
    "廣告簽約額": "広告契約額",
    "廣告已回款": "広告入金額",
    "累計銷量": "累計販売数",
    "匯率筆數": "為替レート数",
    "目前所有幣別都有可用匯率。": "現在、すべての通貨に利用可能な為替レートがあります。",
    "多幣種與匯率": "多通貨と為替",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "まず基準通貨を設定し、その後で為替レートを管理して売上・コスト・ロイヤリティを換算できるようにします。",
    "專案基準幣": "プロジェクト基準通貨",
    "更新中...": "更新中...",
    "更新基準幣": "基準通貨を更新",
    "來源幣別": "元通貨",
    "目標幣別": "換算先通貨",
    "匯率": "為替レート",
    "生效日期": "適用日",
    "備註": "メモ",
    "例如：2026 Q1 財務匯率": "例: 2026 Q1 財務レート",
    "更新匯率": "為替レートを更新",
    "新增匯率": "為替レートを追加",
    "取消編輯": "編集をキャンセル",
    "編輯": "編集",
    "刪除匯率": "為替レートを削除",
    "匯率已刪除。": "為替レートを削除しました。",
    "還沒有匯率資料，跨幣種金額將無法折算。": "まだ為替レートがありません。通貨をまたぐ金額は換算できません。",
    "原始金額彙總": "元通貨金額サマリー",
    "廣告合作專區": "広告案件",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "広告主、掲載期間、納品内容、契約額、入金状況をまとめて管理できます。",
    "廣告商": "広告主",
    "品牌 / 廣告主": "ブランド / 広告主",
    "合作專案": "案件名",
    "春季品牌合作 / 書內植入": "春季ブランド企画 / 作中タイアップ",
    "聯絡人": "連絡先",
    "窗口姓名": "担当者名",
    "負責人": "担当",
    "內部 PM": "社内 PM",
    "交付內容": "納品内容",
    "片頭口播、書腰、聯名封面、投放頁": "冒頭読み、帯、コラボ表紙、ランディングページ",
    "開始日期": "開始日",
    "結束日期": "終了日",
    "簽約金額": "契約金額",
    "已回款": "入金済み",
    "幣別": "通貨",
    "例如：需另附品牌审稿": "例: ブランド確認が必要",
    "更新廣告合作": "広告案件を更新",
    "新增廣告合作": "広告案件を追加",
    "刪除廣告合作": "広告案件を削除",
    "廣告合作已刪除。": "広告案件を削除しました。",
    "還沒有廣告合作資料。": "広告案件はまだありません。",
    "權利與合同": "権利と契約",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "音声書籍、コミック、海外版などの権利取得状況を記録します。",
    "權利類型": "権利種別",
    "權利持有人": "権利保有者",
    "授權範圍": "許諾範囲",
    "地區": "地域",
    "合同編號": "契約番号",
    "更新權利紀錄": "権利レコードを更新",
    "新增權利紀錄": "権利レコードを追加",
    "刪除權利紀錄": "権利レコードを削除",
    "權利紀錄已刪除。": "権利レコードを削除しました。",
    "還沒有權利與合同資料。": "権利・契約レコードはまだありません。",
    "發行渠道": "配信チャネル",
    "追蹤上架平台、廣告商、館配或教育渠道。": "公開プラットフォーム、広告主、図書館向け、教育向けチャネルを追跡します。",
    "渠道名稱": "チャネル名",
    "渠道類型": "チャネル種別",
    "零售渠道": "小売",
    "平台合作": "プラットフォーム提携",
    "圖書館": "図書館",
    "教育機構": "教育機関",
    "格式": "形式",
    "售價": "価格",
    "外部 SKU": "外部 SKU",
    "更新發行渠道": "チャネルを更新",
    "新增發行渠道": "チャネルを追加",
    "刪除發行渠道": "チャネルを削除",
    "發行渠道已刪除。": "チャネルを削除しました。",
    "還沒有發行渠道資料。": "チャネルデータはまだありません。",
    "未排上架日": "公開日未設定",
    "成本核算": "コスト管理",
    "補齊模型費、外包、審校、宣傳等成本。": "モデル費用、外注、校正、販促などのコストを管理します。",
    "成本類別": "コスト分類",
    "供應商或來源": "仕入先または出所",
    "金額": "金額",
    "發生日": "発生日",
    "說明": "説明",
    "更新成本項目": "コスト項目を更新",
    "新增成本項目": "コスト項目を追加",
    "刪除成本項目": "コスト項目を削除",
    "成本項目已刪除。": "コスト項目を削除しました。",
    "還沒有成本項目。": "コスト項目はまだありません。",
    "未填來源": "出所未入力",
    "未填日期": "日付未入力",
    "銷售回傳": "売上レコード",
    "可記錄零售、廣告、館配或教育採購收入。": "小売、広告、図書館向け、教育調達の収益を記録できます。",
    "收入類型": "収益種別",
    "零售銷售": "小売売上",
    "廣告 / 贊助": "広告 / スポンサー",
    "館配": "図書館向け",
    "教育採購": "教育調達",
    "銷量": "販売数",
    "期間開始": "期間開始",
    "期間結束": "期間終了",
    "毛營收": "総売上",
    "退款": "返金",
    "淨營收": "純売上",
    "留空則自動計算": "空欄なら自動計算",
    "更新銷售紀錄": "売上レコードを更新",
    "新增銷售紀錄": "売上レコードを追加",
    "刪除銷售紀錄": "売上レコードを削除",
    "銷售紀錄已刪除。": "売上レコードを削除しました。",
    "還沒有銷售回傳資料。": "売上レコードはまだありません。",
    "未填開始": "開始未入力",
    "未填結束": "終了未入力",
    "版稅與分成": "ロイヤリティと分配",
    "管理作者、配音、畫師等合作方應付金額。": "著者、声優、作画担当などパートナーへの支払額を管理します。",
    "收款對象": "支払先",
    "角色": "役割",
    "計算基礎": "計算基準",
    "比例 %": "割合 %",
    "應付金額": "支払額",
    "更新版稅紀錄": "ロイヤリティを更新",
    "新增版稅紀錄": "ロイヤリティを追加",
    "刪除版稅紀錄": "ロイヤリティを削除",
    "版稅紀錄已刪除。": "ロイヤリティを削除しました。",
    "還沒有版稅與分成資料。": "ロイヤリティデータはまだありません。",
    "未填角色": "役割未入力",
    "未填基礎": "基準未入力",
    "經營報表": "事業レポート",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "事業サマリー HTML、JSON、各種 CSV を含む ZIP を出力し、財務や営業に渡せます。",
    "立即匯出報表 ZIP": "レポート ZIP を今すぐ出力",
    "下載報表 ZIP": "レポート ZIP をダウンロード",
    "還沒有經營報表匯出紀錄。": "事業レポートの出力履歴はまだありません。",
    "未填生效日": "適用日未入力",
    "未指定": "未指定",
    "未填授權範圍": "許諾範囲未入力",
    "未填地區": "地域未入力",
    "未填語言": "言語未入力",
    "retail": "小売",
    "advertiser": "広告主",
    "platform": "プラットフォーム",
    "library": "図書館",
    "education": "教育",
    "planning": "計画中",
    "scheduled": "予定済み",
    "live": "公開中",
    "paused": "一時停止",
    "delisted": "公開終了",
    "booked": "計上済み",
    "paid": "支払済み",
    "proposal": "提案中",
    "negotiating": "交渉中",
    "signed": "契約済み",
    "settled": "精算済み",
    "closed": "終了",
    "expired": "期限切れ",
    "terminated": "終了済み",
    "production": "制作",
    "net_revenue": "純売上",
    "running": "進行中",
    "active": "有効",
    "pending": "保留",
    "approved": "承認済み",
    "planned": "予定",
  },
  ko: {
    "經營管理": "사업 관리",
    "權利、成本、渠道、銷售、版稅": "권리, 비용, 채널, 매출, 로열티",
    "打開經營頁": "사업 관리 열기",
    "先選取一個專案，再進入經營管理頁。": "먼저 프로젝트를 선택한 뒤 사업 관리로 들어가세요.",
    "基準幣已更新。": "기준 통화가 업데이트되었습니다.",
    "權利與合同資料已新增。": "권리 및 계약 기록이 추가되었습니다.",
    "權利與合同資料已更新。": "권리 및 계약 기록이 업데이트되었습니다.",
    "發行渠道資料已新增。": "배포 채널이 추가되었습니다.",
    "發行渠道資料已更新。": "배포 채널이 업데이트되었습니다.",
    "成本項目已新增。": "비용 항목이 추가되었습니다.",
    "成本項目已更新。": "비용 항목이 업데이트되었습니다.",
    "銷售回傳已新增。": "매출 기록이 추가되었습니다.",
    "銷售回傳已更新。": "매출 기록이 업데이트되었습니다.",
    "版稅結算資料已新增。": "로열티 정산이 추가되었습니다.",
    "版稅結算資料已更新。": "로열티 정산이 업데이트되었습니다.",
    "匯率已新增。": "환율이 추가되었습니다.",
    "匯率已更新。": "환율이 업데이트되었습니다.",
    "廣告合作已新增。": "광고 협업이 추가되었습니다.",
    "廣告合作已更新。": "광고 협업이 업데이트되었습니다.",
    "經營報表已匯出。": "사업 보고서를 내보냈습니다.",
    "經營總覽": "사업 개요",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "권리, 광고, 채널, 비용, 매출, 로열티, 보고서를 한 페이지에서 관리합니다.",
    "匯出中...": "내보내는 중...",
    "匯出經營報表": "사업 보고서 내보내기",
    "有效授權": "유효 권리",
    "上架渠道": "라이브 채널",
    "廣告合作": "광고 협업",
    "累計成本": "누적 비용",
    "累計營收": "누적 매출",
    "版稅應付": "지급 예정 로열티",
    "估算毛利": "예상 매출총이익",
    "廣告收入": "광고 수익",
    "廣告簽約額": "광고 계약 금액",
    "廣告已回款": "회수된 광고 대금",
    "累計銷量": "누적 판매량",
    "匯率筆數": "환율 수",
    "目前所有幣別都有可用匯率。": "현재 모든 통화에 사용할 수 있는 환율이 있습니다.",
    "多幣種與匯率": "다중 통화와 환율",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "먼저 프로젝트 기준 통화를 설정한 뒤 환율을 관리하여 매출, 비용, 로열티를 환산합니다.",
    "專案基準幣": "프로젝트 기준 통화",
    "更新中...": "업데이트 중...",
    "更新基準幣": "기준 통화 업데이트",
    "來源幣別": "기준 통화",
    "目標幣別": "대상 통화",
    "匯率": "환율",
    "生效日期": "적용일",
    "備註": "메모",
    "例如：2026 Q1 財務匯率": "예: 2026 Q1 재무 환율",
    "更新匯率": "환율 업데이트",
    "新增匯率": "환율 추가",
    "取消編輯": "편집 취소",
    "編輯": "편집",
    "刪除匯率": "환율 삭제",
    "匯率已刪除。": "환율이 삭제되었습니다.",
    "還沒有匯率資料，跨幣種金額將無法折算。": "아직 환율 데이터가 없어 다른 통화 금액을 환산할 수 없습니다.",
    "原始金額彙總": "원통화 금액 요약",
    "廣告合作專區": "광고 협업",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "광고주, 진행 기간, 납품 항목, 계약 금액, 입금 현황을 한 곳에서 관리합니다.",
    "廣告商": "광고주",
    "品牌 / 廣告主": "브랜드 / 광고주",
    "合作專案": "캠페인",
    "春季品牌合作 / 書內植入": "봄 브랜드 협업 / 도서 내 협찬",
    "聯絡人": "연락처",
    "窗口姓名": "담당자 이름",
    "負責人": "담당자",
    "內部 PM": "내부 PM",
    "交付內容": "납품 항목",
    "片頭口播、書腰、聯名封面、投放頁": "오프닝 멘트, 띠지, 공동 표지, 랜딩 페이지",
    "開始日期": "시작일",
    "結束日期": "종료일",
    "簽約金額": "계약 금액",
    "已回款": "회수 금액",
    "幣別": "통화",
    "例如：需另附品牌审稿": "예: 브랜드 검수 필요",
    "更新廣告合作": "광고 협업 업데이트",
    "新增廣告合作": "광고 협업 추가",
    "刪除廣告合作": "광고 협업 삭제",
    "廣告合作已刪除。": "광고 협업이 삭제되었습니다.",
    "還沒有廣告合作資料。": "광고 협업 데이터가 아직 없습니다.",
    "權利與合同": "권리와 계약",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "오디오북, 만화, 해외판 등 권리 확보 여부를 기록합니다.",
    "權利類型": "권리 유형",
    "權利持有人": "권리 보유자",
    "授權範圍": "허가 범위",
    "地區": "지역",
    "合同編號": "계약 번호",
    "更新權利紀錄": "권리 기록 업데이트",
    "新增權利紀錄": "권리 기록 추가",
    "刪除權利紀錄": "권리 기록 삭제",
    "權利紀錄已刪除。": "권리 기록이 삭제되었습니다.",
    "還沒有權利與合同資料。": "권리 및 계약 데이터가 아직 없습니다.",
    "發行渠道": "배포 채널",
    "追蹤上架平台、廣告商、館配或教育渠道。": "플랫폼, 광고주, 도서관 납품, 교육 채널을 추적합니다.",
    "渠道名稱": "채널 이름",
    "渠道類型": "채널 유형",
    "零售渠道": "소매",
    "平台合作": "플랫폼 제휴",
    "圖書館": "도서관",
    "教育機構": "교육 기관",
    "格式": "형식",
    "售價": "가격",
    "外部 SKU": "외부 SKU",
    "更新發行渠道": "채널 업데이트",
    "新增發行渠道": "채널 추가",
    "刪除發行渠道": "채널 삭제",
    "發行渠道已刪除。": "채널이 삭제되었습니다.",
    "還沒有發行渠道資料。": "채널 데이터가 아직 없습니다.",
    "未排上架日": "출시일 미정",
    "成本核算": "비용 정산",
    "補齊模型費、外包、審校、宣傳等成本。": "모델 비용, 외주, 교정, 마케팅 등 비용을 관리합니다.",
    "成本類別": "비용 분류",
    "供應商或來源": "공급처 또는 출처",
    "金額": "금액",
    "發生日": "발생일",
    "說明": "설명",
    "更新成本項目": "비용 항목 업데이트",
    "新增成本項目": "비용 항목 추가",
    "刪除成本項目": "비용 항목 삭제",
    "成本項目已刪除。": "비용 항목이 삭제되었습니다.",
    "還沒有成本項目。": "비용 항목이 아직 없습니다.",
    "未填來源": "출처 미입력",
    "未填日期": "날짜 미입력",
    "銷售回傳": "매출 기록",
    "可記錄零售、廣告、館配或教育採購收入。": "소매, 광고, 도서관 납품, 교육 조달 수익을 기록할 수 있습니다.",
    "收入類型": "수익 유형",
    "零售銷售": "소매 판매",
    "廣告 / 贊助": "광고 / 스폰서십",
    "館配": "도서관 납품",
    "教育採購": "교육 조달",
    "銷量": "판매량",
    "期間開始": "기간 시작",
    "期間結束": "기간 종료",
    "毛營收": "총매출",
    "退款": "환불",
    "淨營收": "순매출",
    "留空則自動計算": "비워두면 자동 계산",
    "更新銷售紀錄": "매출 기록 업데이트",
    "新增銷售紀錄": "매출 기록 추가",
    "刪除銷售紀錄": "매출 기록 삭제",
    "銷售紀錄已刪除。": "매출 기록이 삭제되었습니다.",
    "還沒有銷售回傳資料。": "매출 기록이 아직 없습니다.",
    "未填開始": "시작 미입력",
    "未填結束": "종료 미입력",
    "版稅與分成": "로열티와 배분",
    "管理作者、配音、畫師等合作方應付金額。": "작가, 성우, 그림 작가 등 파트너에게 지급할 금액을 관리합니다.",
    "收款對象": "수취인",
    "角色": "역할",
    "計算基礎": "계산 기준",
    "比例 %": "비율 %",
    "應付金額": "지급 금액",
    "更新版稅紀錄": "로열티 기록 업데이트",
    "新增版稅紀錄": "로열티 기록 추가",
    "刪除版稅紀錄": "로열티 기록 삭제",
    "版稅紀錄已刪除。": "로열티 기록이 삭제되었습니다.",
    "還沒有版稅與分成資料。": "로열티 데이터가 아직 없습니다.",
    "未填角色": "역할 미입력",
    "未填基礎": "기준 미입력",
    "經營報表": "사업 보고서",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "사업 개요 HTML, JSON, CSV가 담긴 ZIP을 내보내 재무나 영업팀에 전달할 수 있습니다.",
    "立即匯出報表 ZIP": "지금 보고서 ZIP 내보내기",
    "下載報表 ZIP": "보고서 ZIP 다운로드",
    "還沒有經營報表匯出紀錄。": "사업 보고서 내보내기 기록이 아직 없습니다.",
    "未填生效日": "적용일 미입력",
    "未指定": "미지정",
    "未填授權範圍": "허가 범위 미입력",
    "未填地區": "지역 미입력",
    "未填語言": "언어 미입력",
    "retail": "소매",
    "advertiser": "광고주",
    "platform": "플랫폼",
    "library": "도서관",
    "education": "교육",
    "planning": "계획 중",
    "scheduled": "일정 확정",
    "live": "운영 중",
    "paused": "일시 중지",
    "delisted": "종료",
    "booked": "전표 처리",
    "paid": "지급 완료",
    "proposal": "제안 중",
    "negotiating": "협의 중",
    "signed": "계약 완료",
    "settled": "정산 완료",
    "closed": "종료",
    "expired": "만료",
    "terminated": "해지",
    "production": "제작",
    "net_revenue": "순매출",
    "running": "진행 중",
    "active": "활성",
    "pending": "대기 중",
    "approved": "승인됨",
    "planned": "계획됨",
  },
  th: {
    "經營管理": "การจัดการธุรกิจ",
    "權利、成本、渠道、銷售、版稅": "สิทธิ์ ต้นทุน ช่องทาง ยอดขาย และค่าลิขสิทธิ์",
    "打開經營頁": "เปิดหน้าธุรกิจ",
    "先選取一個專案，再進入經營管理頁。": "เลือกโปรเจกต์ก่อน แล้วค่อยเข้าสู่หน้าการจัดการธุรกิจ",
    "基準幣已更新。": "อัปเดตสกุลเงินฐานแล้ว",
    "權利與合同資料已新增。": "เพิ่มข้อมูลสิทธิ์และสัญญาแล้ว",
    "權利與合同資料已更新。": "อัปเดตข้อมูลสิทธิ์และสัญญาแล้ว",
    "發行渠道資料已新增。": "เพิ่มช่องทางจัดจำหน่ายแล้ว",
    "發行渠道資料已更新。": "อัปเดตช่องทางจัดจำหน่ายแล้ว",
    "成本項目已新增。": "เพิ่มรายการต้นทุนแล้ว",
    "成本項目已更新。": "อัปเดตรายการต้นทุนแล้ว",
    "銷售回傳已新增。": "เพิ่มข้อมูลยอดขายแล้ว",
    "銷售回傳已更新。": "อัปเดตข้อมูลยอดขายแล้ว",
    "版稅結算資料已新增。": "เพิ่มข้อมูลค่าลิขสิทธิ์แล้ว",
    "版稅結算資料已更新。": "อัปเดตข้อมูลค่าลิขสิทธิ์แล้ว",
    "匯率已新增。": "เพิ่มอัตราแลกเปลี่ยนแล้ว",
    "匯率已更新。": "อัปเดตอัตราแลกเปลี่ยนแล้ว",
    "廣告合作已新增。": "เพิ่มดีลโฆษณาแล้ว",
    "廣告合作已更新。": "อัปเดตดีลโฆษณาแล้ว",
    "經營報表已匯出。": "ส่งออกรายงานธุรกิจแล้ว",
    "經營總覽": "ภาพรวมธุรกิจ",
    "把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。": "รวมสิทธิ์ โฆษณา ช่องทาง ต้นทุน ยอดขาย ค่าลิขสิทธิ์ และรายงานไว้ในหน้าเดียว",
    "匯出中...": "กำลังส่งออก...",
    "匯出經營報表": "ส่งออกรายงานธุรกิจ",
    "有效授權": "สิทธิ์ที่ใช้งานได้",
    "上架渠道": "ช่องทางที่เผยแพร่แล้ว",
    "廣告合作": "ดีลโฆษณา",
    "累計成本": "ต้นทุนสะสม",
    "累計營收": "รายได้สะสม",
    "版稅應付": "ค่าลิขสิทธิ์ที่ต้องจ่าย",
    "估算毛利": "กำไรขั้นต้นโดยประมาณ",
    "廣告收入": "รายได้จากโฆษณา",
    "廣告簽約額": "มูลค่าสัญญาโฆษณา",
    "廣告已回款": "เงินโฆษณาที่รับแล้ว",
    "累計銷量": "ยอดขายสะสม",
    "匯率筆數": "จำนวนอัตราแลกเปลี่ยน",
    "目前所有幣別都有可用匯率。": "ขณะนี้ทุกสกุลเงินมีอัตราแลกเปลี่ยนใช้งานแล้ว",
    "多幣種與匯率": "หลายสกุลเงินและอัตราแลกเปลี่ยน",
    "先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。": "ตั้งค่าสกุลเงินฐานของโปรเจกต์ก่อน แล้วดูแลอัตราแลกเปลี่ยนเพื่อให้แปลงรายได้ ต้นทุน และค่าลิขสิทธิ์ได้",
    "專案基準幣": "สกุลเงินฐานของโปรเจกต์",
    "更新中...": "กำลังอัปเดต...",
    "更新基準幣": "อัปเดตสกุลเงินฐาน",
    "來源幣別": "สกุลเงินต้นทาง",
    "目標幣別": "สกุลเงินปลายทาง",
    "匯率": "อัตราแลกเปลี่ยน",
    "生效日期": "วันที่มีผล",
    "備註": "หมายเหตุ",
    "例如：2026 Q1 財務匯率": "เช่น อัตราการเงินไตรมาส 1 ปี 2026",
    "更新匯率": "อัปเดตอัตราแลกเปลี่ยน",
    "新增匯率": "เพิ่มอัตราแลกเปลี่ยน",
    "取消編輯": "ยกเลิกการแก้ไข",
    "編輯": "แก้ไข",
    "刪除匯率": "ลบอัตราแลกเปลี่ยน",
    "匯率已刪除。": "ลบอัตราแลกเปลี่ยนแล้ว",
    "還沒有匯率資料，跨幣種金額將無法折算。": "ยังไม่มีข้อมูลอัตราแลกเปลี่ยน จึงยังแปลงมูลค่าข้ามสกุลเงินไม่ได้",
    "原始金額彙總": "สรุปตามสกุลเงินเดิม",
    "廣告合作專區": "พื้นที่จัดการโฆษณา",
    "集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。": "จัดการผู้ลงโฆษณา ช่วงเวลาแคมเปญ สิ่งที่ต้องส่งมอบ มูลค่าสัญญา และการรับเงินในที่เดียว",
    "廣告商": "ผู้ลงโฆษณา",
    "品牌 / 廣告主": "แบรนด์ / ผู้ลงโฆษณา",
    "合作專案": "แคมเปญ",
    "春季品牌合作 / 書內植入": "แคมเปญฤดูใบไม้ผลิ / การวางสินค้าในหนังสือ",
    "聯絡人": "ผู้ติดต่อ",
    "窗口姓名": "ชื่อผู้ประสานงาน",
    "負責人": "ผู้รับผิดชอบ",
    "內部 PM": "PM ภายใน",
    "交付內容": "สิ่งที่ส่งมอบ",
    "片頭口播、書腰、聯名封面、投放頁": "สปอตเปิดเรื่อง ปกคาด ปกคอลแลบ และหน้าแคมเปญ",
    "開始日期": "วันที่เริ่ม",
    "結束日期": "วันที่สิ้นสุด",
    "簽約金額": "มูลค่าสัญญา",
    "已回款": "รับเงินแล้ว",
    "幣別": "สกุลเงิน",
    "例如：需另附品牌审稿": "เช่น ต้องส่งให้แบรนด์ตรวจอีกครั้ง",
    "更新廣告合作": "อัปเดตดีลโฆษณา",
    "新增廣告合作": "เพิ่มดีลโฆษณา",
    "刪除廣告合作": "ลบดีลโฆษณา",
    "廣告合作已刪除。": "ลบดีลโฆษณาแล้ว",
    "還沒有廣告合作資料。": "ยังไม่มีข้อมูลดีลโฆษณา",
    "權利與合同": "สิทธิ์และสัญญา",
    "記錄作品是否取得有聲書、漫畫、海外版等權利。": "บันทึกว่างานชิ้นนี้ได้รับสิทธิ์สำหรับหนังสือเสียง คอมิก เวอร์ชันต่างประเทศ และสิทธิ์อื่น ๆ แล้วหรือไม่",
    "權利類型": "ประเภทสิทธิ์",
    "權利持有人": "ผู้ถือสิทธิ์",
    "授權範圍": "ขอบเขตสิทธิ์",
    "地區": "ภูมิภาค",
    "合同編號": "เลขที่สัญญา",
    "更新權利紀錄": "อัปเดตบันทึกสิทธิ์",
    "新增權利紀錄": "เพิ่มบันทึกสิทธิ์",
    "刪除權利紀錄": "ลบบันทึกสิทธิ์",
    "權利紀錄已刪除。": "ลบบันทึกสิทธิ์แล้ว",
    "還沒有權利與合同資料。": "ยังไม่มีข้อมูลสิทธิ์และสัญญา",
    "發行渠道": "ช่องทางจัดจำหน่าย",
    "追蹤上架平台、廣告商、館配或教育渠道。": "ติดตามแพลตฟอร์มที่เผยแพร่ ผู้ลงโฆษณา ช่องทางห้องสมุด และช่องทางการศึกษา",
    "渠道名稱": "ชื่อช่องทาง",
    "渠道類型": "ประเภทช่องทาง",
    "零售渠道": "ช่องทางค้าปลีก",
    "平台合作": "ความร่วมมือกับแพลตฟอร์ม",
    "圖書館": "ห้องสมุด",
    "教育機構": "สถาบันการศึกษา",
    "格式": "รูปแบบ",
    "售價": "ราคา",
    "外部 SKU": "SKU ภายนอก",
    "更新發行渠道": "อัปเดตช่องทาง",
    "新增發行渠道": "เพิ่มช่องทาง",
    "刪除發行渠道": "ลบช่องทาง",
    "發行渠道已刪除。": "ลบช่องทางแล้ว",
    "還沒有發行渠道資料。": "ยังไม่มีข้อมูลช่องทาง",
    "未排上架日": "ยังไม่กำหนดวันเผยแพร่",
    "成本核算": "การคำนวณต้นทุน",
    "補齊模型費、外包、審校、宣傳等成本。": "บันทึกต้นทุนค่าโมเดล เอาต์ซอร์ส ตรวจทาน ประชาสัมพันธ์ และต้นทุนอื่น ๆ",
    "成本類別": "หมวดต้นทุน",
    "供應商或來源": "ผู้ขายหรือแหล่งที่มา",
    "金額": "จำนวนเงิน",
    "發生日": "วันที่เกิดรายการ",
    "說明": "คำอธิบาย",
    "更新成本項目": "อัปเดตรายการต้นทุน",
    "新增成本項目": "เพิ่มรายการต้นทุน",
    "刪除成本項目": "ลบรายการต้นทุน",
    "成本項目已刪除。": "ลบรายการต้นทุนแล้ว",
    "還沒有成本項目。": "ยังไม่มีรายการต้นทุน",
    "未填來源": "ยังไม่ได้กรอกแหล่งที่มา",
    "未填日期": "ยังไม่ได้กรอกวันที่",
    "銷售回傳": "ข้อมูลยอดขาย",
    "可記錄零售、廣告、館配或教育採購收入。": "บันทึกรายได้จากค้าปลีก โฆษณา ห้องสมุด หรือการจัดซื้อเพื่อการศึกษาได้",
    "收入類型": "ประเภทรายได้",
    "零售銷售": "ยอดขายค้าปลีก",
    "廣告 / 贊助": "โฆษณา / สปอนเซอร์",
    "館配": "ส่งให้ห้องสมุด",
    "教育採購": "จัดซื้อเพื่อการศึกษา",
    "銷量": "จำนวนขาย",
    "期間開始": "เริ่มช่วงเวลา",
    "期間結束": "สิ้นสุดช่วงเวลา",
    "毛營收": "รายได้รวม",
    "退款": "คืนเงิน",
    "淨營收": "รายได้สุทธิ",
    "留空則自動計算": "เว้นว่างเพื่อคำนวณอัตโนมัติ",
    "更新銷售紀錄": "อัปเดตข้อมูลยอดขาย",
    "新增銷售紀錄": "เพิ่มข้อมูลยอดขาย",
    "刪除銷售紀錄": "ลบข้อมูลยอดขาย",
    "銷售紀錄已刪除。": "ลบข้อมูลยอดขายแล้ว",
    "還沒有銷售回傳資料。": "ยังไม่มีข้อมูลยอดขาย",
    "未填開始": "ยังไม่ได้กรอกวันเริ่ม",
    "未填結束": "ยังไม่ได้กรอกวันสิ้นสุด",
    "版稅與分成": "ค่าลิขสิทธิ์และส่วนแบ่ง",
    "管理作者、配音、畫師等合作方應付金額。": "จัดการยอดที่ต้องจ่ายให้ผู้เขียน นักพากย์ นักวาด และพาร์ตเนอร์อื่น ๆ",
    "收款對象": "ผู้รับเงิน",
    "角色": "บทบาท",
    "計算基礎": "ฐานการคำนวณ",
    "比例 %": "อัตรา %",
    "應付金額": "ยอดที่ต้องจ่าย",
    "更新版稅紀錄": "อัปเดตค่าลิขสิทธิ์",
    "新增版稅紀錄": "เพิ่มค่าลิขสิทธิ์",
    "刪除版稅紀錄": "ลบค่าลิขสิทธิ์",
    "版稅紀錄已刪除。": "ลบค่าลิขสิทธิ์แล้ว",
    "還沒有版稅與分成資料。": "ยังไม่มีข้อมูลค่าลิขสิทธิ์และส่วนแบ่ง",
    "未填角色": "ยังไม่ได้กรอกบทบาท",
    "未填基礎": "ยังไม่ได้กรอกฐานการคำนวณ",
    "經營報表": "รายงานธุรกิจ",
    "匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。": "ส่งออก ZIP ที่มี HTML ภาพรวมธุรกิจ JSON และ CSV หลายประเภท เพื่อส่งต่อให้ทีมการเงินหรือทีมธุรกิจได้ทันที",
    "立即匯出報表 ZIP": "ส่งออกรายงาน ZIP ตอนนี้",
    "下載報表 ZIP": "ดาวน์โหลดรายงาน ZIP",
    "還沒有經營報表匯出紀錄。": "ยังไม่มีประวัติการส่งออกรายงานธุรกิจ",
    "未填生效日": "ยังไม่ได้กรอกวันที่มีผล",
    "未指定": "ยังไม่ระบุ",
    "未填授權範圍": "ยังไม่ได้กรอกขอบเขตสิทธิ์",
    "未填地區": "ยังไม่ได้กรอกภูมิภาค",
    "未填語言": "ยังไม่ได้กรอกภาษา",
    "retail": "ค้าปลีก",
    "advertiser": "ผู้ลงโฆษณา",
    "platform": "แพลตฟอร์ม",
    "library": "ห้องสมุด",
    "education": "การศึกษา",
    "planning": "กำลังวางแผน",
    "scheduled": "ตั้งเวลาแล้ว",
    "live": "เผยแพร่อยู่",
    "paused": "หยุดชั่วคราว",
    "delisted": "ยกเลิกเผยแพร่",
    "booked": "บันทึกบัญชีแล้ว",
    "paid": "ชำระแล้ว",
    "proposal": "อยู่ระหว่างเสนอ",
    "negotiating": "อยู่ระหว่างเจรจา",
    "signed": "เซ็นสัญญาแล้ว",
    "settled": "ปิดยอดแล้ว",
    "closed": "ปิดงานแล้ว",
    "expired": "หมดอายุ",
    "terminated": "ยุติแล้ว",
    "production": "การผลิต",
    "net_revenue": "รายได้สุทธิ",
    "running": "กำลังดำเนินการ",
    "active": "ใช้งานอยู่",
    "pending": "รอดำเนินการ",
    "approved": "อนุมัติแล้ว",
    "planned": "วางแผนไว้แล้ว",
  },
};
Object.entries(BUSINESS_EXACT_TRANSLATIONS).forEach(([locale, entries]) => {
  EXACT_TRANSLATIONS[locale] = {
    ...(EXACT_TRANSLATIONS[locale] || {}),
    ...entries,
  };
});
const WIZARD_EXACT_TRANSLATIONS = {
  "zh-Hans": {
    "新建電子書": "新建电子书",
    "用全屏向導建立整本電子書": "用全屏向导建立整本电子书",
    "入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。": "入口现在集中成一个明显动作。点一下就会打开全屏向导，支持整本粘贴拆章、手动新增章节、保存整书 TXT，以及后续语音生成与出版流程。",
    "先選專案，再打開全屏向導": "先选项目，再打开全屏向导",
    "可貼整本拆章，也可逐章建立": "可贴整本拆章，也可逐章建立",
    "完成後直接接語音生成、審核、出版": "完成后直接接语音生成、审核、出版",
    "立即打開全屏向導": "立即打开全屏向导",
    "從手動新增開始": "从手动新增开始",
    "開啟全屏向導": "开启全屏向导",
    "這個專案尚未填寫簡介，可以在建立專案時補上內容。": "这个项目尚未填写简介，可以在建立项目时补上内容。",
    "新建電子書向導": "新建电子书向导",
    "正在載入專案資料，稍候即可開始導入內容。": "正在载入项目资料，稍后即可开始导入内容。",
    "關閉向導": "关闭向导",
    "選擇導入方式：整本拆章或逐章新增": "选择导入方式：整本拆章或逐章新增",
    "保存後自動寫入完整整書 TXT 與章節資料": "保存后自动写入完整整书 TXT 与章节资料",
    "接著就能進語音生成、審核、渲染與出版": "接着就能进语音生成、审核、渲染与出版",
    "方式 A：貼整本並拆章": "方式 A：贴整本并拆章",
    "推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。": "推荐。一次粘贴完整电子书内容，系统自动识别章节标题并切段。",
    "方式 B：手動新增單章": "方式 B：手动新增单章",
    "適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。": "适合从 Word、PDF、网页逐章复制粘贴，例如“西游记第一章”。",
    "整本電子書匯入": "整本电子书导入",
    "把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。": "把整本内容直接贴进文本框，按下“贴上并拆章”。支持“西游记第一章”“第二章节”“第一回”，也支持 `# 章节标题`。",
    "推薦": "推荐",
    "整本內容已匯入完成，章節與段落都已建立。": "整本内容已导入完成，章节与段落都已建立。",
    "整本內容已匯入完成。": "整本内容已导入完成。",
    "手動新增章節": "手动新增章节",
    "先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。": "先填章节标题，再贴这一章正文。保存后会自动切成段落，并同步写回整书 TXT。",
    "逐章模式": "逐章模式",
    "標題可自訂": "标题可自订",
    "例如：西游记第一章、第二章节、第一回 石猴出世。": "例如：西游记第一章、第二章节、第一回 石猴出世。",
    "支援複製貼上": "支持复制粘贴",
    "可以直接從 Word、PDF 或網站複製整章正文貼進來。": "可以直接从 Word、PDF 或网站复制整章正文贴进来。",
    "沿用現有流程": "沿用现有流程",
    "建立完成後直接走語音生成、審核、出版，不需要另接流程。": "建立完成后直接走语音生成、审核、出版，不需要另接流程。",
    "章節標題": "章节标题",
    "例如：西游记第一章 石猴出世": "例如：西游记第一章 石猴出世",
    "章節內容": "章节内容",
    "把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。": "把这一章正文直接贴进来。保存后会自动切段，并更新整书 TXT。",
    "建立中...": "建立中...",
    "建立章節": "建立章节",
    "清空表單": "清空表单",
    "建立成功後，右側章節地圖會立刻更新。": "建立成功后，右侧章节地图会立刻更新。",
    "專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。": "项目资料载入中。如果你是从项目列表点进来，稍候一下就可以直接开始。",
    "目前專案": "当前项目",
    "向導內所有動作都會直接保存到這個專案。": "向导内所有动作都会直接保存到这个项目。",
    "完整電子書 TXT 已保存": "完整电子书 TXT 已保存",
    "下載整書 TXT": "下载整书 TXT",
    "還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。": "还没有完整整书 TXT。你一旦导入整本或新增章节，这里就会出现下载按钮。",
    "章節地圖": "章节地图",
    "保存成功後，這裡會立即顯示最新章節。": "保存成功后，这里会立即显示最新章节。",
    "章節統計已存在，詳細章節清單正在載入。": "章节统计已存在，详细章节清单正在载入。",
    "還沒有章節。你可以先從左側選擇一種方式開始建立內容。": "还没有章节。你可以先从左侧选择一种方式开始建立内容。",
    "下一步怎麼做": "下一步怎么做",
    "內容進來後，不需要另外配置新流程。": "内容进来后，不需要另外配置新流程。",
    "1. 到語音生成頁送出本章或整章任務。": "1. 到语音生成页送出本章或整章任务。",
    "2. 到審核頁聽音並處理待審核段落。": "2. 到审核页听音并处理待审核段落。",
    "3. 到出版頁渲染章節並匯出 ZIP。": "3. 到出版页渲染章节并导出 ZIP。",
    "請先輸入章節標題。": "请先输入章节标题。",
    "請先貼上章節內容。": "请先贴上章节内容。",
    "新章節已建立，右側章節地圖已同步更新。": "新章节已建立，右侧章节地图已同步更新。",
    "新章節已建立。": "新章节已建立。",
    "新增章節失敗。": "新增章节失败。",
    "拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡": "拖拽 `.epub / .html / .xhtml / .txt / .md / .docx` 到这里",
    "如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。": "如果系统文件选择器不让你选文件，直接把文件拖进来。",
    "或直接貼本機檔案路徑": "或直接贴本机文件路径",
    "支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。": "支持 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接贴 Finder 里的完整文件路径。",
    "或直接貼上整本內容，自動拆成章節": "或直接贴上整本内容，自动拆成章节",
    "可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。": "可直接贴入整本电子书内容。\n支持标题格式如：西游记第一章、第二章节、第一回，或用 # 章节标题来分章。",
    "貼上並拆章": "贴上并拆章",
    "下載目前整書 TXT": "下载当前整书 TXT",
    "系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。": "系统会把内容保存为完整整书 TXT，并建立章节与段落，后续可直接进入语音生成、审核与导出。",
  },
  en: {
    "新建電子書": "New E-Book",
    "用全屏向導建立整本電子書": "Build a full e-book with the full-screen wizard",
    "入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。": "The entry point is now one clear action. Open the full-screen wizard to paste a whole book, add chapters manually, save the full-book TXT, and continue into voice generation and publishing.",
    "先選專案，再打開全屏向導": "Select a project, then open the full-screen wizard",
    "可貼整本拆章，也可逐章建立": "Paste a full book or add chapters one by one",
    "完成後直接接語音生成、審核、出版": "Continue directly to voice generation, review, and publishing",
    "立即打開全屏向導": "Open full-screen wizard",
    "從手動新增開始": "Start with manual chapter entry",
    "開啟全屏向導": "Open full-screen wizard",
    "這個專案尚未填寫簡介，可以在建立專案時補上內容。": "This project does not have an introduction yet. You can add one when creating the project.",
    "新建電子書向導": "New E-Book Wizard",
    "正在載入專案資料，稍候即可開始導入內容。": "Loading project data. You can start importing content in a moment.",
    "關閉向導": "Close wizard",
    "選擇導入方式：整本拆章或逐章新增": "Choose an import method: split a whole book or add chapters manually",
    "保存後自動寫入完整整書 TXT 與章節資料": "Saving also writes the full-book TXT and chapter records",
    "接著就能進語音生成、審核、渲染與出版": "Then continue to voice generation, review, rendering, and publishing",
    "方式 A：貼整本並拆章": "Option A: Paste the whole book and split chapters",
    "推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。": "Recommended. Paste the full e-book once and the system will detect chapter headings and split segments automatically.",
    "方式 B：手動新增單章": "Option B: Add a single chapter manually",
    "適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。": "Great for copying chapters from Word, PDF, or web pages, such as \"Journey to the West Chapter 1\".",
    "整本電子書匯入": "Full-book import",
    "把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。": "Paste the full book into the text box and click \"Paste and split chapters\". Supports titles like \"Journey to the West Chapter 1\", \"Chapter 2\", \"First Tale\", and Markdown headings like `# Chapter Title`.",
    "推薦": "Recommended",
    "整本內容已匯入完成，章節與段落都已建立。": "The full book has been imported and chapters and segments are ready.",
    "整本內容已匯入完成。": "Full-book import finished.",
    "手動新增章節": "Add chapter manually",
    "先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。": "Enter a chapter title first, then paste the chapter body. Saving will split segments automatically and update the full-book TXT.",
    "逐章模式": "Chapter-by-chapter mode",
    "標題可自訂": "Custom chapter titles",
    "例如：西游记第一章、第二章节、第一回 石猴出世。": "For example: Journey to the West Chapter 1, Chapter 2, First Tale: Birth of the Stone Monkey.",
    "支援複製貼上": "Copy and paste supported",
    "可以直接從 Word、PDF 或網站複製整章正文貼進來。": "You can copy full chapter text directly from Word, PDF, or a website.",
    "沿用現有流程": "Use the existing workflow",
    "建立完成後直接走語音生成、審核、出版，不需要另接流程。": "Once created, continue directly to voice generation, review, and publishing with no extra setup.",
    "章節標題": "Chapter title",
    "例如：西游记第一章 石猴出世": "Example: Journey to the West Chapter 1 The Stone Monkey Is Born",
    "章節內容": "Chapter content",
    "把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。": "Paste the chapter body here. Saving will split segments automatically and update the full-book TXT.",
    "建立中...": "Creating...",
    "建立章節": "Create chapter",
    "清空表單": "Clear form",
    "建立成功後，右側章節地圖會立刻更新。": "After creation, the chapter map on the right updates immediately.",
    "專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。": "Project data is loading. If you opened this from the project list, you can start in a moment.",
    "目前專案": "Current project",
    "向導內所有動作都會直接保存到這個專案。": "Everything in this wizard is saved directly to this project.",
    "完整電子書 TXT 已保存": "Full-book TXT saved",
    "下載整書 TXT": "Download full-book TXT",
    "還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。": "There is no full-book TXT yet. Once you import a full book or add chapters, a download button will appear here.",
    "章節地圖": "Chapter map",
    "保存成功後，這裡會立即顯示最新章節。": "After saving, the latest chapters appear here right away.",
    "章節統計已存在，詳細章節清單正在載入。": "Chapter stats already exist. The detailed chapter list is still loading.",
    "還沒有章節。你可以先從左側選擇一種方式開始建立內容。": "There are no chapters yet. Start by choosing a method on the left.",
    "下一步怎麼做": "What to do next",
    "內容進來後，不需要另外配置新流程。": "Once the content is in, no extra workflow setup is needed.",
    "1. 到語音生成頁送出本章或整章任務。": "1. Go to Voice Generation and submit a chapter or full-chapter job.",
    "2. 到審核頁聽音並處理待審核段落。": "2. Go to Review to listen and handle segments waiting for review.",
    "3. 到出版頁渲染章節並匯出 ZIP。": "3. Go to Publishing to render chapters and export a ZIP.",
    "請先輸入章節標題。": "Enter a chapter title first.",
    "請先貼上章節內容。": "Paste the chapter content first.",
    "新章節已建立，右側章節地圖已同步更新。": "The new chapter was created and the chapter map on the right has been updated.",
    "新章節已建立。": "New chapter created.",
    "新增章節失敗。": "Failed to create chapter.",
    "拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡": "Drag `.epub / .html / .xhtml / .txt / .md / .docx` files here",
    "如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。": "If the file picker does not let you choose a file, just drag it in directly.",
    "或直接貼本機檔案路徑": "Or paste a local file path",
    "支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。": "Supports `.epub / .html / .xhtml / .txt / .md / .docx`, and you can also paste a full file path from Finder.",
    "或直接貼上整本內容，自動拆成章節": "Or paste the whole book and split chapters automatically",
    "可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。": "Paste the full e-book content directly.\nSupports titles like Journey to the West Chapter 1, Chapter 2, First Tale, or Markdown headings like # Chapter Title.",
    "貼上並拆章": "Paste and split chapters",
    "下載目前整書 TXT": "Download current full-book TXT",
    "系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。": "The system saves the content as a full-book TXT, creates chapters and segments, and lets you continue directly to voice generation, review, and export.",
  },
  ja: {
    "新建電子書": "電子書籍を作成",
    "用全屏向導建立整本電子書": "全画面ウィザードで電子書籍を作成",
    "入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。": "入口を分かりやすい1つの操作にまとめました。全画面ウィザードを開くと、全文貼り付けによる章分割、手動での章追加、全文 TXT 保存、その後の音声生成と出版まで進められます。",
    "先選專案，再打開全屏向導": "先にプロジェクトを選択してウィザードを開く",
    "可貼整本拆章，也可逐章建立": "全文貼り付けでも、章ごとの作成でも可能",
    "完成後直接接語音生成、審核、出版": "完了後はそのまま音声生成、レビュー、出版へ",
    "立即打開全屏向導": "全画面ウィザードを開く",
    "從手動新增開始": "手動追加から始める",
    "開啟全屏向導": "全画面ウィザードを開く",
    "這個專案尚未填寫簡介，可以在建立專案時補上內容。": "このプロジェクトにはまだ紹介文がありません。プロジェクト作成時に追加できます。",
    "新建電子書向導": "電子書籍作成ウィザード",
    "正在載入專案資料，稍候即可開始導入內容。": "プロジェクトデータを読み込み中です。まもなく内容を取り込めます。",
    "關閉向導": "ウィザードを閉じる",
    "選擇導入方式：整本拆章或逐章新增": "取り込み方法を選択: 全文から章分割 / 章ごとに追加",
    "保存後自動寫入完整整書 TXT 與章節資料": "保存すると全文 TXT と章データが自動で更新されます",
    "接著就能進語音生成、審核、渲染與出版": "続けて音声生成、レビュー、レンダー、出版に進めます",
    "方式 A：貼整本並拆章": "方法 A: 全文を貼り付けて章分割",
    "推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。": "おすすめ。電子書籍全体を一度に貼り付けると、章タイトルを自動認識して段落化します。",
    "方式 B：手動新增單章": "方法 B: 1章ずつ手動追加",
    "適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。": "Word、PDF、Web ページから章ごとにコピー＆ペーストする用途に向いています。",
    "整本電子書匯入": "全文電子書籍の取り込み",
    "把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。": "本文全体をテキスト欄に貼り付けて「貼上並拆章」を押します。「第一章」「第二章节」「第一回」や `# 章節標題` に対応しています。",
    "推薦": "おすすめ",
    "整本內容已匯入完成，章節與段落都已建立。": "全文の取り込みが完了し、章と段落が作成されました。",
    "整本內容已匯入完成。": "全文の取り込みが完了しました。",
    "手動新增章節": "章を手動追加",
    "先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。": "先に章タイトルを入力し、この章の本文を貼り付けます。保存すると自動で段落化され、全文 TXT にも反映されます。",
    "逐章模式": "章ごとモード",
    "標題可自訂": "タイトルは自由に設定",
    "例如：西游记第一章、第二章节、第一回 石猴出世。": "例: 西游記 第一章、第二章节、第一回 石猴出世。",
    "支援複製貼上": "コピー＆ペースト対応",
    "可以直接從 Word、PDF 或網站複製整章正文貼進來。": "Word、PDF、Web サイトから章本文をそのまま貼り付けられます。",
    "沿用現有流程": "既存フローをそのまま利用",
    "建立完成後直接走語音生成、審核、出版，不需要另接流程。": "作成後はそのまま音声生成、レビュー、出版へ進めるため、別フローは不要です。",
    "章節標題": "章タイトル",
    "例如：西游记第一章 石猴出世": "例: 西游記 第一章 石猴出世",
    "章節內容": "章本文",
    "把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。": "この章の本文をここに貼り付けます。保存後に自動で段落化され、全文 TXT も更新されます。",
    "建立中...": "作成中...",
    "建立章節": "章を作成",
    "清空表單": "フォームをクリア",
    "建立成功後，右側章節地圖會立刻更新。": "作成後、右側の章マップがすぐ更新されます。",
    "專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。": "プロジェクト情報を読み込み中です。プロジェクト一覧から開いた場合も、少し待てばすぐ開始できます。",
    "目前專案": "現在のプロジェクト",
    "向導內所有動作都會直接保存到這個專案。": "このウィザードの操作はすべてこのプロジェクトに保存されます。",
    "完整電子書 TXT 已保存": "全文 TXT を保存済み",
    "下載整書 TXT": "全文 TXT をダウンロード",
    "還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。": "まだ全文 TXT はありません。全文を取り込むか章を追加すると、ここにダウンロードボタンが表示されます。",
    "章節地圖": "章マップ",
    "保存成功後，這裡會立即顯示最新章節。": "保存に成功すると、ここに最新の章がすぐ表示されます。",
    "章節統計已存在，詳細章節清單正在載入。": "章の統計は取得済みで、詳細な章一覧を読み込み中です。",
    "還沒有章節。你可以先從左側選擇一種方式開始建立內容。": "まだ章はありません。左側で方法を選んで内容の作成を始めてください。",
    "下一步怎麼做": "次にやること",
    "內容進來後，不需要另外配置新流程。": "内容が入った後は、別のフロー設定は不要です。",
    "1. 到語音生成頁送出本章或整章任務。": "1. 音声生成ページで章または全章のタスクを送信します。",
    "2. 到審核頁聽音並處理待審核段落。": "2. レビューページで音声を確認し、レビュー待ち段落を処理します。",
    "3. 到出版頁渲染章節並匯出 ZIP。": "3. 出版ページで章をレンダーして ZIP を出力します。",
    "請先輸入章節標題。": "先に章タイトルを入力してください。",
    "請先貼上章節內容。": "先に章本文を貼り付けてください。",
    "新章節已建立，右側章節地圖已同步更新。": "新しい章を作成し、右側の章マップも更新しました。",
    "新章節已建立。": "新しい章を作成しました。",
    "新增章節失敗。": "章の作成に失敗しました。",
    "拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡": "`.epub / .html / .xhtml / .txt / .md / .docx` をここへドラッグ",
    "如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。": "ファイル選択ダイアログで選べない場合は、直接ドラッグしてください。",
    "或直接貼本機檔案路徑": "またはローカルファイルパスを貼り付け",
    "支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。": "`.epub / .html / .xhtml / .txt / .md / .docx` に対応し、Finder のフルパスも貼り付けられます。",
    "或直接貼上整本內容，自動拆成章節": "または全文を貼り付けて自動で章分割",
    "可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。": "電子書籍全文を直接貼り付けられます。\n「第一章」「第二章节」「第一回」や `# 章節標題` で章分割できます。",
    "貼上並拆章": "貼り付けて章分割",
    "下載目前整書 TXT": "現在の全文 TXT をダウンロード",
    "系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。": "内容は全文 TXT として保存され、章と段落が作成されます。そのまま音声生成、レビュー、書き出しに進めます。",
  },
  ko: {
    "新建電子書": "전자책 만들기",
    "用全屏向導建立整本電子書": "전체 화면 마법사로 전자책 만들기",
    "入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。": "입구를 한 번에 보이는 동작으로 모았습니다. 전체 화면 마법사에서 책 전체 붙여넣기, 장 자동 분할, 수동 장 추가, 전체 TXT 저장, 이후 음성 생성과 출판까지 이어집니다.",
    "先選專案，再打開全屏向導": "먼저 프로젝트를 선택한 뒤 전체 화면 마법사 열기",
    "可貼整本拆章，也可逐章建立": "책 전체 붙여넣기와 장별 작성 모두 가능",
    "完成後直接接語音生成、審核、出版": "완료 후 바로 음성 생성, 검수, 출판으로 진행",
    "立即打開全屏向導": "전체 화면 마법사 열기",
    "從手動新增開始": "수동 장 추가부터 시작",
    "開啟全屏向導": "전체 화면 마법사 열기",
    "這個專案尚未填寫簡介，可以在建立專案時補上內容。": "이 프로젝트에는 아직 소개가 없습니다. 프로젝트 생성 시 추가할 수 있습니다.",
    "新建電子書向導": "전자책 생성 마법사",
    "正在載入專案資料，稍候即可開始導入內容。": "프로젝트 데이터를 불러오는 중입니다. 잠시 후 바로 가져오기를 시작할 수 있습니다.",
    "關閉向導": "마법사 닫기",
    "選擇導入方式：整本拆章或逐章新增": "가져오기 방식 선택: 전체 책 자동 분할 / 장별 수동 추가",
    "保存後自動寫入完整整書 TXT 與章節資料": "저장하면 전체 TXT와 장 데이터가 자동으로 기록됩니다",
    "接著就能進語音生成、審核、渲染與出版": "이후 음성 생성, 검수, 렌더링, 출판으로 바로 진행할 수 있습니다",
    "方式 A：貼整本並拆章": "방식 A: 책 전체를 붙여넣고 장 분할",
    "推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。": "추천. 전자책 전체를 한 번에 붙여넣으면 시스템이 장 제목을 자동 인식하고 문단으로 나눕니다.",
    "方式 B：手動新增單章": "방식 B: 장 하나씩 수동 추가",
    "適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。": "Word, PDF, 웹페이지에서 장별로 복사해 붙여넣기에 적합합니다.",
    "整本電子書匯入": "전자책 전체 가져오기",
    "把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。": "책 전체 내용을 텍스트 상자에 붙여넣고 `貼上並拆章` 버튼을 누르세요. `第一章`, `第二章节`, `第一回`, `# 章節標題` 형식을 지원합니다.",
    "推薦": "추천",
    "整本內容已匯入完成，章節與段落都已建立。": "책 전체 가져오기가 완료되었고 장과 문단이 모두 생성되었습니다.",
    "整本內容已匯入完成。": "책 전체 가져오기가 완료되었습니다.",
    "手動新增章節": "장 수동 추가",
    "先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。": "먼저 장 제목을 입력한 뒤 본문을 붙여넣으세요. 저장하면 자동으로 문단을 나누고 전체 TXT에도 반영됩니다.",
    "逐章模式": "장별 모드",
    "標題可自訂": "제목 직접 지정",
    "例如：西游记第一章、第二章节、第一回 石猴出世。": "예: 서유기 제1장, 제2장, 제1회 석후 출세",
    "支援複製貼上": "복사/붙여넣기 지원",
    "可以直接從 Word、PDF 或網站複製整章正文貼進來。": "Word, PDF, 웹사이트에서 장 전체 본문을 직접 복사해 붙여넣을 수 있습니다.",
    "沿用現有流程": "기존 흐름 그대로 사용",
    "建立完成後直接走語音生成、審核、出版，不需要另接流程。": "생성 후 바로 음성 생성, 검수, 출판 흐름으로 이어지며 별도 설정이 필요 없습니다.",
    "章節標題": "장 제목",
    "例如：西游记第一章 石猴出世": "예: 서유기 제1장 석후 출세",
    "章節內容": "장 내용",
    "把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。": "이 장의 본문을 그대로 붙여넣으세요. 저장 후 자동으로 문단이 나뉘고 전체 TXT도 업데이트됩니다.",
    "建立中...": "생성 중...",
    "建立章節": "장 만들기",
    "清空表單": "양식 비우기",
    "建立成功後，右側章節地圖會立刻更新。": "생성에 성공하면 오른쪽 장 맵이 바로 업데이트됩니다.",
    "專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。": "프로젝트 데이터를 불러오는 중입니다. 프로젝트 목록에서 열었다면 잠시 후 바로 시작할 수 있습니다.",
    "目前專案": "현재 프로젝트",
    "向導內所有動作都會直接保存到這個專案。": "이 마법사 안의 모든 작업은 이 프로젝트에 바로 저장됩니다.",
    "完整電子書 TXT 已保存": "전체 전자책 TXT 저장됨",
    "下載整書 TXT": "전체 TXT 다운로드",
    "還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。": "아직 전체 TXT가 없습니다. 책 전체를 가져오거나 장을 추가하면 여기에서 다운로드할 수 있습니다.",
    "章節地圖": "장 맵",
    "保存成功後，這裡會立即顯示最新章節。": "저장에 성공하면 여기에 최신 장이 즉시 표시됩니다.",
    "章節統計已存在，詳細章節清單正在載入。": "장 통계는 이미 있으며, 자세한 장 목록을 불러오는 중입니다.",
    "還沒有章節。你可以先從左側選擇一種方式開始建立內容。": "아직 장이 없습니다. 왼쪽에서 방법을 선택해 먼저 내용을 만들어보세요.",
    "下一步怎麼做": "다음 단계",
    "內容進來後，不需要另外配置新流程。": "내용이 들어오면 별도 흐름을 추가로 설정할 필요가 없습니다.",
    "1. 到語音生成頁送出本章或整章任務。": "1. 음성 생성 페이지에서 현재 장 또는 전체 장 작업을 제출합니다.",
    "2. 到審核頁聽音並處理待審核段落。": "2. 검수 페이지에서 오디오를 듣고 검토 대기 문단을 처리합니다.",
    "3. 到出版頁渲染章節並匯出 ZIP。": "3. 출판 페이지에서 장을 렌더링하고 ZIP을 내보냅니다.",
    "請先輸入章節標題。": "먼저 장 제목을 입력하세요.",
    "請先貼上章節內容。": "먼저 장 내용을 붙여넣으세요.",
    "新章節已建立，右側章節地圖已同步更新。": "새 장이 생성되었고 오른쪽 장 맵도 함께 업데이트되었습니다.",
    "新章節已建立。": "새 장이 생성되었습니다.",
    "新增章節失敗。": "장 생성에 실패했습니다.",
    "拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡": "`.epub / .html / .xhtml / .txt / .md / .docx` 파일을 여기에 끌어오세요",
    "如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。": "파일 선택기가 동작하지 않으면 파일을 바로 끌어다 놓으세요.",
    "或直接貼本機檔案路徑": "또는 로컬 파일 경로 붙여넣기",
    "支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。": "`.epub / .html / .xhtml / .txt / .md / .docx`를 지원하며 Finder의 전체 경로를 직접 붙여넣을 수도 있습니다.",
    "或直接貼上整本內容，自動拆成章節": "또는 전체 책 내용을 붙여넣어 자동으로 장 분할",
    "可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。": "전자책 전체 내용을 직접 붙여넣을 수 있습니다.\n`第一章`, `第二章节`, `第一回`, `# 章節標題` 형식으로 장을 나눌 수 있습니다.",
    "貼上並拆章": "붙여넣고 장 분할",
    "下載目前整書 TXT": "현재 전체 TXT 다운로드",
    "系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。": "시스템이 내용을 전체 TXT로 저장하고 장과 문단을 생성하므로 이후 바로 음성 생성, 검수, 내보내기로 이어갈 수 있습니다.",
  },
  th: {
    "新建電子書": "สร้างอีบุ๊ก",
    "用全屏向導建立整本電子書": "สร้างอีบุ๊กทั้งเล่มด้วยวิซาร์ดเต็มหน้าจอ",
    "入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。": "ตอนนี้รวมทางเข้าไว้เป็นปุ่มที่เห็นชัด กดครั้งเดียวก็เปิดวิซาร์ดเต็มหน้าจอได้ รองรับการวางทั้งเล่มแล้วแยกบท การเพิ่มบทด้วยตนเอง การบันทึก TXT ทั้งเล่ม และขั้นตอนสร้างเสียงกับเผยแพร่ต่อได้ทันที",
    "先選專案，再打開全屏向導": "เลือกโปรเจกต์ก่อน แล้วค่อยเปิดวิซาร์ดเต็มหน้าจอ",
    "可貼整本拆章，也可逐章建立": "วางทั้งเล่มเพื่อแยกบท หรือสร้างทีละบทก็ได้",
    "完成後直接接語音生成、審核、出版": "เสร็จแล้วไปต่อที่สร้างเสียง ตรวจทาน และเผยแพร่ได้ทันที",
    "立即打開全屏向導": "เปิดวิซาร์ดเต็มหน้าจอ",
    "從手動新增開始": "เริ่มจากเพิ่มบทด้วยตนเอง",
    "開啟全屏向導": "เปิดวิซาร์ดเต็มหน้าจอ",
    "這個專案尚未填寫簡介，可以在建立專案時補上內容。": "โปรเจกต์นี้ยังไม่มีคำแนะนำ สามารถเพิ่มได้ตอนสร้างโปรเจกต์",
    "新建電子書向導": "วิซาร์ดสร้างอีบุ๊ก",
    "正在載入專案資料，稍候即可開始導入內容。": "กำลังโหลดข้อมูลโปรเจกต์ อีกสักครู่ก็เริ่มนำเข้าเนื้อหาได้",
    "關閉向導": "ปิดวิซาร์ด",
    "選擇導入方式：整本拆章或逐章新增": "เลือกวิธีนำเข้า: วางทั้งเล่มแล้วแยกบท หรือเพิ่มทีละบท",
    "保存後自動寫入完整整書 TXT 與章節資料": "เมื่อบันทึกแล้ว ระบบจะเขียน TXT ทั้งเล่มและข้อมูลบทให้อัตโนมัติ",
    "接著就能進語音生成、審核、渲染與出版": "จากนั้นไปต่อที่สร้างเสียง ตรวจทาน เรนเดอร์ และเผยแพร่ได้",
    "方式 A：貼整本並拆章": "วิธี A: วางทั้งเล่มแล้วแยกบท",
    "推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。": "แนะนำ วางเนื้อหาอีบุ๊กทั้งเล่มครั้งเดียว ระบบจะตรวจจับชื่อบทและแยกย่อหน้าให้อัตโนมัติ",
    "方式 B：手動新增單章": "วิธี B: เพิ่มทีละบทด้วยตนเอง",
    "適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。": "เหมาะกับการคัดลอกจาก Word, PDF หรือเว็บทีละบท เช่น “Journey to the West บทที่ 1”",
    "整本電子書匯入": "นำเข้าอีบุ๊กทั้งเล่ม",
    "把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。": "วางเนื้อหาทั้งเล่มลงในกล่องข้อความแล้วกด `貼上並拆章` รองรับชื่อบทแบบ `第一章` `第二章节` `第一回` และ `# 章節標題`",
    "推薦": "แนะนำ",
    "整本內容已匯入完成，章節與段落都已建立。": "นำเข้าเนื้อหาทั้งเล่มเสร็จแล้ว และสร้างบทกับย่อหน้าเรียบร้อยแล้ว",
    "整本內容已匯入完成。": "นำเข้าเนื้อหาทั้งเล่มเสร็จแล้ว",
    "手動新增章節": "เพิ่มบทด้วยตนเอง",
    "先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。": "กรอกชื่อบทก่อน แล้ววางเนื้อหาของบทนี้ เมื่อบันทึกแล้วระบบจะตัดเป็นย่อหน้าและเขียนกลับไปยัง TXT ทั้งเล่มพร้อมกัน",
    "逐章模式": "โหมดทีละบท",
    "標題可自訂": "กำหนดชื่อบทเองได้",
    "例如：西游记第一章、第二章节、第一回 石猴出世。": "เช่น Journey to the West บทที่ 1, บทที่ 2, ตอนที่ 1 กำเนิดลิงหิน",
    "支援複製貼上": "รองรับคัดลอกและวาง",
    "可以直接從 Word、PDF 或網站複製整章正文貼進來。": "สามารถคัดลอกเนื้อหาทั้งบทจาก Word, PDF หรือเว็บไซต์มาวางได้โดยตรง",
    "沿用現有流程": "ใช้โฟลว์เดิมต่อได้",
    "建立完成後直接走語音生成、審核、出版，不需要另接流程。": "เมื่อสร้างเสร็จแล้วไปต่อที่สร้างเสียง ตรวจทาน และเผยแพร่ได้ทันที โดยไม่ต้องตั้งค่าโฟลว์ใหม่",
    "章節標題": "ชื่อบท",
    "例如：西游记第一章 石猴出世": "เช่น Journey to the West บทที่ 1 กำเนิดลิงหิน",
    "章節內容": "เนื้อหาบท",
    "把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。": "วางเนื้อหาของบทนี้ตรงนี้ เมื่อบันทึกแล้วระบบจะแยกย่อหน้าและอัปเดต TXT ทั้งเล่ม",
    "建立中...": "กำลังสร้าง...",
    "建立章節": "สร้างบท",
    "清空表單": "ล้างแบบฟอร์ม",
    "建立成功後，右側章節地圖會立刻更新。": "หลังสร้างสำเร็จ แผนที่บทด้านขวาจะอัปเดตทันที",
    "專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。": "กำลังโหลดข้อมูลโปรเจกต์ ถ้าคุณเปิดมาจากรายการโปรเจกต์ รอสักครู่แล้วเริ่มได้เลย",
    "目前專案": "โปรเจกต์ปัจจุบัน",
    "向導內所有動作都會直接保存到這個專案。": "ทุกการกระทำในวิซาร์ดนี้จะถูกบันทึกลงในโปรเจกต์นี้โดยตรง",
    "完整電子書 TXT 已保存": "บันทึก TXT ทั้งเล่มแล้ว",
    "下載整書 TXT": "ดาวน์โหลด TXT ทั้งเล่ม",
    "還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。": "ยังไม่มี TXT ทั้งเล่ม เมื่อคุณนำเข้าทั้งเล่มหรือเพิ่มบทแล้ว ปุ่มดาวน์โหลดจะปรากฏตรงนี้",
    "章節地圖": "แผนที่บท",
    "保存成功後，這裡會立即顯示最新章節。": "เมื่อบันทึกสำเร็จ บทล่าสุดจะแสดงที่นี่ทันที",
    "章節統計已存在，詳細章節清單正在載入。": "มีสถิติบทแล้ว และกำลังโหลดรายการบทแบบละเอียด",
    "還沒有章節。你可以先從左側選擇一種方式開始建立內容。": "ยังไม่มีบท คุณสามารถเลือกวิธีทางซ้ายเพื่อเริ่มสร้างเนื้อหาได้ก่อน",
    "下一步怎麼做": "ขั้นตอนถัดไป",
    "內容進來後，不需要另外配置新流程。": "เมื่อมีเนื้อหาแล้ว ไม่จำเป็นต้องตั้งค่าโฟลว์ใหม่เพิ่มเติม",
    "1. 到語音生成頁送出本章或整章任務。": "1. ไปที่หน้าสร้างเสียงแล้วส่งงานสำหรับบทนี้หรือทั้งบท",
    "2. 到審核頁聽音並處理待審核段落。": "2. ไปที่หน้าตรวจทานเพื่อฟังเสียงและจัดการย่อหน้าที่รอตรวจ",
    "3. 到出版頁渲染章節並匯出 ZIP。": "3. ไปที่หน้าเผยแพร่เพื่อเรนเดอร์บทและส่งออก ZIP",
    "請先輸入章節標題。": "กรุณากรอกชื่อบทก่อน",
    "請先貼上章節內容。": "กรุณาวางเนื้อหาของบทก่อน",
    "新章節已建立，右側章節地圖已同步更新。": "สร้างบทใหม่แล้ว และแผนที่บทด้านขวาอัปเดตแล้ว",
    "新章節已建立。": "สร้างบทใหม่แล้ว",
    "新增章節失敗。": "สร้างบทใหม่ไม่สำเร็จ",
    "拖曳 `.epub / .html / .xhtml / .txt / .md / .docx` 到這裡": "ลากไฟล์ `.epub / .html / .xhtml / .txt / .md / .docx` มาวางที่นี่",
    "如果系統檔案選擇器不讓你選檔，直接把檔案拖進來。": "ถ้าตัวเลือกไฟล์ของระบบเลือกไฟล์ไม่ได้ ให้ลากไฟล์มาวางได้เลย",
    "或直接貼本機檔案路徑": "หรือวางพาธไฟล์ในเครื่องโดยตรง",
    "支援 `.epub / .html / .xhtml / .txt / .md / .docx`，也可以直接貼 Finder 裡的完整檔案路徑。": "รองรับ `.epub / .html / .xhtml / .txt / .md / .docx` และสามารถวางพาธไฟล์เต็มจาก Finder ได้โดยตรง",
    "或直接貼上整本內容，自動拆成章節": "หรือวางทั้งเล่มเพื่อแยกบทอัตโนมัติ",
    "可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。": "สามารถวางเนื้อหาอีบุ๊กทั้งเล่มได้โดยตรง\nรองรับชื่อบทแบบ `第一章` `第二章节` `第一回` หรือ `# 章節標題`",
    "貼上並拆章": "วางแล้วแยกบท",
    "下載目前整書 TXT": "ดาวน์โหลด TXT ทั้งเล่มล่าสุด",
    "系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。": "ระบบจะบันทึกเนื้อหาเป็น TXT ทั้งเล่ม พร้อมสร้างบทและย่อหน้า จากนั้นไปต่อที่สร้างเสียง ตรวจทาน และส่งออกได้ทันที",
  },
};
Object.entries(WIZARD_EXACT_TRANSLATIONS).forEach(([locale, entries]) => {
  EXACT_TRANSLATIONS[locale] = {
    ...(EXACT_TRANSLATIONS[locale] || {}),
    ...entries,
  };
});
const NAV_ITEMS = [
  { key: "projects", label: "專案" },
  { key: "business", label: "經營管理" },
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
  draft: { "zh-Hant": "草稿", "zh-Hans": "草稿", en: "Draft", ja: "下書き", ko: "초안", th: "ฉบับร่าง" },
  active: { "zh-Hant": "進行中", "zh-Hans": "进行中", en: "In Progress", ja: "進行中", ko: "진행 중", th: "กำลังดำเนินการ" },
  ready: { "zh-Hant": "待生成", "zh-Hans": "待生成", en: "Ready", ja: "生成待ち", ko: "생성 대기", th: "พร้อมสร้าง" },
  queued: { "zh-Hant": "已排隊", "zh-Hans": "已排队", en: "Queued", ja: "キュー済み", ko: "대기열 등록", th: "อยู่ในคิว" },
  generating: { "zh-Hant": "生成中", "zh-Hans": "生成中", en: "Generating", ja: "生成中", ko: "생성 중", th: "กำลังสร้าง" },
  review_required: { "zh-Hant": "待審核", "zh-Hans": "待审核", en: "Needs Review", ja: "レビュー待ち", ko: "검토 필요", th: "รอตรวจทาน" },
  approved: { "zh-Hant": "已通過", "zh-Hans": "已通过", en: "Approved", ja: "承認済み", ko: "승인됨", th: "อนุมัติแล้ว" },
  rejected: { "zh-Hant": "已退回", "zh-Hans": "已退回", en: "Rejected", ja: "差し戻し", ko: "반려됨", th: "ถูกส่งกลับ" },
  rendered: { "zh-Hant": "已渲染", "zh-Hans": "已渲染", en: "Rendered", ja: "レンダー済み", ko: "렌더링 완료", th: "เรนเดอร์แล้ว" },
  pending: { "zh-Hant": "待處理", "zh-Hans": "待处理", en: "Pending", ja: "保留", ko: "대기 중", th: "รอดำเนินการ" },
  running: { "zh-Hant": "執行中", "zh-Hans": "执行中", en: "Running", ja: "実行中", ko: "실행 중", th: "กำลังทำงาน" },
  succeeded: { "zh-Hant": "已完成", "zh-Hans": "已完成", en: "Succeeded", ja: "完了", ko: "완료", th: "สำเร็จ" },
  failed: { "zh-Hant": "失敗", "zh-Hans": "失败", en: "Failed", ja: "失敗", ko: "실패", th: "ล้มเหลว" },
  open: { "zh-Hant": "未處理", "zh-Hans": "未处理", en: "Open", ja: "未対応", ko: "미처리", th: "ยังไม่จัดการ" },
  resolved: { "zh-Hant": "已解決", "zh-Hans": "已解决", en: "Resolved", ja: "解決済み", ko: "해결됨", th: "แก้ไขแล้ว" },
};
const PROJECT_TYPE_LABELS = {
  audiobook: { "zh-Hant": "有聲書", "zh-Hans": "有声书", en: "Audiobook", ja: "音声書籍", ko: "오디오북", th: "หนังสือเสียง" },
  comic: { "zh-Hant": "漫畫", "zh-Hans": "漫画", en: "Comic", ja: "コミック", ko: "만화", th: "คอมิก" },
  motion_comic: { "zh-Hant": "動態漫畫", "zh-Hans": "动态漫画", en: "Motion Comic", ja: "モーションコミック", ko: "모션 코믹", th: "โมชันคอมิก" },
  video: { "zh-Hant": "影片", "zh-Hans": "视频", en: "Video", ja: "動画", ko: "비디오", th: "วิดีโอ" },
};
const JOB_TYPE_LABELS = {
  generate_segment: { "zh-Hant": "生成段落", "zh-Hans": "生成段落", en: "Generate Segment", ja: "段落生成", ko: "문단 생성", th: "สร้างย่อหน้า" },
};
const ISSUE_TYPE_LABELS = {
  manual_review: { "zh-Hant": "人工複核", "zh-Hans": "人工复核", en: "Manual Review", ja: "手動レビュー", ko: "수동 검토", th: "ตรวจทานด้วยตนเอง" },
  pronunciation: { "zh-Hant": "發音問題", "zh-Hans": "发音问题", en: "Pronunciation", ja: "発音の問題", ko: "발음 문제", th: "ปัญหาการออกเสียง" },
  pacing: { "zh-Hant": "節奏問題", "zh-Hans": "节奏问题", en: "Pacing", ja: "テンポの問題", ko: "속도 문제", th: "ปัญหาจังหวะ" },
  missing_words: { "zh-Hant": "漏讀", "zh-Hans": "漏读", en: "Missing Words", ja: "読み落とし", ko: "누락 읽기", th: "คำตกหล่น" },
  duration: { "zh-Hant": "時長異常", "zh-Hans": "时长异常", en: "Duration Issue", ja: "長さ異常", ko: "길이 이상", th: "ความยาวผิดปกติ" },
};
const SOURCE_KIND_LABELS = {
  generated: { "zh-Hant": "系統生成", "zh-Hans": "系统生成", en: "Generated", ja: "自動生成", ko: "시스템 생성", th: "สร้างโดยระบบ" },
  edited: { "zh-Hant": "人工編輯", "zh-Hans": "人工编辑", en: "Edited", ja: "手動編集", ko: "수동 편집", th: "แก้ไขด้วยตนเอง" },
  uploaded: { "zh-Hant": "人工上傳", "zh-Hans": "人工上传", en: "Uploaded", ja: "手動アップロード", ko: "수동 업로드", th: "อัปโหลดด้วยตนเอง" },
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
  narrator: { "zh-Hant": "旁白", "zh-Hans": "旁白", en: "Narrator", ja: "ナレーション", ko: "내레이션", th: "ผู้บรรยาย" },
  lead: { "zh-Hant": "主角", "zh-Hans": "主角", en: "Lead", ja: "主人公", ko: "주인공", th: "ตัวเอก" },
  supporting: { "zh-Hant": "配角", "zh-Hans": "配角", en: "Supporting", ja: "脇役", ko: "조연", th: "ตัวประกอบ" },
  background: { "zh-Hant": "背景", "zh-Hans": "背景", en: "Background", ja: "背景", ko: "배경", th: "พื้นหลัง" },
  custom: { "zh-Hant": "自訂", "zh-Hans": "自订", en: "Custom", ja: "カスタム", ko: "사용자 지정", th: "กำหนดเอง" },
};
const USER_ROLE_LABELS = {
  admin: { "zh-Hant": "管理員", "zh-Hans": "管理员", en: "Admin", ja: "管理者", ko: "관리자", th: "ผู้ดูแลระบบ" },
  text_editor: { "zh-Hant": "文本編輯", "zh-Hans": "文本编辑", en: "Text Editor", ja: "テキスト編集", ko: "텍스트 편집", th: "ผู้แก้ไขข้อความ" },
  reviewer: { "zh-Hant": "審核員", "zh-Hans": "审核员", en: "Reviewer", ja: "レビュアー", ko: "검수 담당", th: "ผู้ตรวจทาน" },
  delivery_manager: { "zh-Hant": "交付管理", "zh-Hans": "交付管理", en: "Delivery Manager", ja: "納品管理", ko: "납품 관리자", th: "ผู้จัดการการส่งมอบ" },
  settings_manager: { "zh-Hant": "設定管理", "zh-Hans": "设置管理", en: "Settings Manager", ja: "設定管理", ko: "설정 관리자", th: "ผู้ดูแลการตั้งค่า" },
  unknown: { "zh-Hant": "未知角色", "zh-Hans": "未知角色", en: "Unknown Role", ja: "不明な役割", ko: "알 수 없는 역할", th: "ไม่ทราบบทบาท" },
};

function normalizeLocale(value) {
  if (!value) return DEFAULT_LOCALE;
  const normalized = String(value).toLowerCase();
  if (normalized.startsWith("zh-hans") || normalized.startsWith("zh-cn")) return "zh-Hans";
  if (normalized.startsWith("zh-hant") || normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) return "zh-Hant";
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("th")) return "th";
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

function localeCode(value = ACTIVE_LOCALE) {
  const normalized = normalizeLocale(value);
  return LOCALE_FORMAT_CODES[normalized] || LOCALE_FORMAT_CODES[DEFAULT_LOCALE];
}

function template(text, params = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
}

function t(key, params = {}) {
  const locale = normalizeLocale(ACTIVE_LOCALE);
  const base = I18N[DEFAULT_LOCALE] || {};
  const bundle = I18N[locale] || base;
  const message = bundle[key] || base[key] || key;
  return template(message, params);
}

function localizedLabel(labels, value, fallback = "common.notProvided") {
  if (!value) return t(fallback);
  const entry = labels[value];
  if (!entry) return value;
  const locale = normalizeLocale(ACTIVE_LOCALE);
  return entry[locale] || entry[DEFAULT_LOCALE] || value;
}

function userAllowedRoutes(user) {
  if (Array.isArray(user?.allowed_routes) && user.allowed_routes.length) {
    return user.allowed_routes;
  }
  return ["projects"];
}

function canAccessRoute(user, route) {
  if (route === "projects") return true;
  return userAllowedRoutes(user).includes(route);
}

function hasPermission(user, permission) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

function firstAllowedRoute(user, candidates = []) {
  const routes = userAllowedRoutes(user);
  return candidates.find((route) => routes.includes(route)) || routes[0] || "projects";
}

function translatePattern(text, locale) {
  const patterns = [
    {
      regex: /^(\d+) 項$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 項`,
        "zh-Hans": `${count} 项`,
        en: `${count} items`,
        ja: `${count} 件`,
        ko: `${count}개`,
        th: `${count} รายการ`,
      }),
    },
    {
      regex: /^(\d+) 筆$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 筆`,
        "zh-Hans": `${count} 笔`,
        en: `${count} records`,
        ja: `${count} 件`,
        ko: `${count}건`,
        th: `${count} รายการ`,
      }),
    },
    {
      regex: /^(\d+) 個專案$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 個專案`,
        "zh-Hans": `${count} 个项目`,
        en: `${count} projects`,
        ja: `${count} 件のプロジェクト`,
        ko: `${count}개 프로젝트`,
        th: `${count} โปรเจกต์`,
      }),
    },
    {
      regex: /^(\d+) 人$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 人`,
        "zh-Hans": `${count} 人`,
        en: `${count} people`,
        ja: `${count} 人`,
        ko: `${count}명`,
        th: `${count} คน`,
      }),
    },
    {
      regex: /^(\d+) 段$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 段`,
        "zh-Hans": `${count} 段`,
        en: `${count} segments`,
        ja: `${count} 段`,
        ko: `${count}개 문단`,
        th: `${count} ย่อหน้า`,
      }),
    },
    {
      regex: /^(\d+) 章$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 章`,
        "zh-Hans": `${count} 章`,
        en: `${count} chapters`,
        ja: `${count} 章`,
        ko: `${count}장`,
        th: `${count} บท`,
      }),
    },
    {
      regex: /^每頁 (\d+) 段$/,
      render: (_, count) => ({
        "zh-Hant": `每頁 ${count} 段`,
        "zh-Hans": `每页 ${count} 段`,
        en: `${count} per page`,
        ja: `1ページ ${count} 段`,
        ko: `페이지당 ${count}개`,
        th: `หน้าละ ${count} ย่อหน้า`,
      }),
    },
    {
      regex: /^共 (\d+) 段，第 (\d+) \/ (\d+) 頁$/,
      render: (_, total, page, pages) => ({
        "zh-Hant": `共 ${total} 段，第 ${page} / ${pages} 頁`,
        "zh-Hans": `共 ${total} 段，第 ${page} / ${pages} 页`,
        en: `${total} segments total, page ${page} / ${pages}`,
        ja: `全 ${total} 段、${page} / ${pages} ページ`,
        ko: `총 ${total}개 문단, ${page} / ${pages}페이지`,
        th: `รวม ${total} ย่อหน้า หน้า ${page} / ${pages}`,
      }),
    },
    {
      regex: /^段落 (\d+)$/,
      render: (_, index) => ({
        "zh-Hant": `段落 ${index}`,
        "zh-Hans": `段落 ${index}`,
        en: `Segment ${index}`,
        ja: `段落 ${index}`,
        ko: `문단 ${index}`,
        th: `ย่อหน้า ${index}`,
      }),
    },
    {
      regex: /^目前段落 (\d+)$/,
      render: (_, index) => ({
        "zh-Hant": `目前段落 ${index}`,
        "zh-Hans": `当前段落 ${index}`,
        en: `Current segment ${index}`,
        ja: `現在の段落 ${index}`,
        ko: `현재 문단 ${index}`,
        th: `ย่อหน้าปัจจุบัน ${index}`,
      }),
    },
    {
      regex: /^第 (\d+) 頁(?: · (.+))?$/,
      render: (_, index, title = "") => ({
        "zh-Hant": `第 ${index} 頁${title ? ` · ${title}` : ""}`,
        "zh-Hans": `第 ${index} 页${title ? ` · ${title}` : ""}`,
        en: `Page ${index}${title ? ` · ${title}` : ""}`,
        ja: `${index} ページ${title ? ` · ${title}` : ""}`,
        ko: `${index}페이지${title ? ` · ${title}` : ""}`,
        th: `หน้า ${index}${title ? ` · ${title}` : ""}`,
      }),
    },
    {
      regex: /^目前：(\d+)\.\s*(.+)$/,
      render: (_, index, title) => ({
        "zh-Hant": `目前：${index}. ${title}`,
        "zh-Hans": `当前：${index}. ${title}`,
        en: `Current: ${index}. ${title}`,
        ja: `現在: ${index}. ${title}`,
        ko: `현재: ${index}. ${title}`,
        th: `ปัจจุบัน: ${index}. ${title}`,
      }),
    },
    {
      regex: /^最近任務更新：(.+)$/,
      render: (_, value) => ({
        "zh-Hant": `最近任務更新：${value}`,
        "zh-Hans": `最近任务更新：${value}`,
        en: `Last job update: ${value}`,
        ja: `最新タスク更新: ${value}`,
        ko: `최근 작업 업데이트: ${value}`,
        th: `อัปเดตงานล่าสุด: ${value}`,
      }),
    },
    {
      regex: /^綁定小說角色：(.+)$/,
      render: (_, value) => ({
        "zh-Hant": `綁定小說角色：${value}`,
        "zh-Hans": `绑定小说角色：${value}`,
        en: `Bound story character: ${value}`,
        ja: `小説キャラクター紐付け: ${value}`,
        ko: `소설 캐릭터 연결: ${value}`,
        th: `ตัวละครที่ผูกกับนิยาย: ${value}`,
      }),
    },
    {
      regex: /^渲染 v(\d+)$/,
      render: (_, value) => ({
        "zh-Hant": `渲染 v${value}`,
        "zh-Hans": `渲染 v${value}`,
        en: `Render v${value}`,
        ja: `レンダー v${value}`,
        ko: `렌더 v${value}`,
        th: `เรนเดอร์ v${value}`,
      }),
    },
    {
      regex: /^目前檔案：(.+)$/,
      render: (_, value) => ({
        "zh-Hant": `目前檔案：${value}`,
        "zh-Hans": `当前文件：${value}`,
        en: `Current file: ${value}`,
        ja: `現在のファイル: ${value}`,
        ko: `현재 파일: ${value}`,
        th: `ไฟล์ปัจจุบัน: ${value}`,
      }),
    },
    {
      regex: /^最近銷售：(.+)$/,
      render: (_, value) => ({
        "zh-Hant": `最近銷售：${value}`,
        "zh-Hans": `最近销售：${value}`,
        en: `Latest sale: ${value}`,
        ja: `直近の販売: ${value}`,
        ko: `최근 판매: ${value}`,
        th: `ยอดขายล่าสุด: ${value}`,
      }),
    },
    {
      regex: /^正在編輯「(.+)」。在這裡直接貼整本內容，或手動逐章建立。$/,
      render: (_, title) => ({
        "zh-Hant": `正在編輯「${title}」。在這裡直接貼整本內容，或手動逐章建立。`,
        "zh-Hans": `正在编辑“${title}”。你可以在这里直接贴整本内容，或手动逐章建立。`,
        en: `Editing "${title}". Paste the full book here or create chapters manually.`,
        ja: `「${title}」を編集中です。ここで全文を貼り付けるか、章を手動で追加できます。`,
        ko: `"${title}"을(를) 편집 중입니다. 여기에서 책 전체를 붙여넣거나 장을 수동으로 추가할 수 있습니다.`,
        th: `กำลังแก้ไข "${title}" คุณสามารถวางทั้งเล่มหรือเพิ่มทีละบทได้ที่นี่`,
      }),
    },
    {
      regex: /^目前專案已啟用多幣種，總覽金額依 (.+) 折算。$/,
      render: (_, currency) => ({
        "zh-Hant": `目前專案已啟用多幣種，總覽金額依 ${currency} 折算。`,
        "zh-Hans": `当前项目已启用多币种，总览金额按 ${currency} 折算。`,
        en: `Multi-currency is enabled for this project. Overview amounts are converted into ${currency}.`,
        ja: `このプロジェクトでは多通貨を有効化しており、概要金額は ${currency} に換算されます。`,
        ko: `이 프로젝트는 다중 통화를 사용하며, 요약 금액은 ${currency}(으)로 환산됩니다.`,
        th: `โปรเจกต์นี้เปิดใช้หลายสกุลเงินแล้ว และยอดสรุปทั้งหมดแปลงเป็น ${currency}`,
      }),
    },
    {
      regex: /^尚有 (\d+) 個幣別缺少匯率：(.+)$/,
      render: (_, count, currencies) => ({
        "zh-Hant": `尚有 ${count} 個幣別缺少匯率：${currencies}`,
        "zh-Hans": `还有 ${count} 个币种缺少汇率：${currencies}`,
        en: `${count} currencies are still missing exchange rates: ${currencies}`,
        ja: `未設定の為替レートが ${count} 通貨あります: ${currencies}`,
        ko: `${count}개 통화에 아직 환율이 없습니다: ${currencies}`,
        th: `ยังมี ${count} สกุลเงินที่ไม่มีอัตราแลกเปลี่ยน: ${currencies}`,
      }),
    },
    {
      regex: /^成本 (.+) · 營收 (.+) · 版稅 (.+)$/,
      render: (_, cost, sales, royalties) => ({
        "zh-Hant": `成本 ${cost} · 營收 ${sales} · 版稅 ${royalties}`,
        "zh-Hans": `成本 ${cost} · 营收 ${sales} · 版税 ${royalties}`,
        en: `Cost ${cost} · Sales ${sales} · Royalties ${royalties}`,
        ja: `コスト ${cost} · 売上 ${sales} · ロイヤリティ ${royalties}`,
        ko: `비용 ${cost} · 매출 ${sales} · 로열티 ${royalties}`,
        th: `ต้นทุน ${cost} · รายได้ ${sales} · ค่าลิขสิทธิ์ ${royalties}`,
      }),
    },
    {
      regex: /^(.+) 至 (.+) · 淨營收 (.+)$/,
      render: (_, start, end, revenue) => ({
        "zh-Hant": `${start} 至 ${end} · 淨營收 ${revenue}`,
        "zh-Hans": `${start} 至 ${end} · 净营收 ${revenue}`,
        en: `${start} to ${end} · Net revenue ${revenue}`,
        ja: `${start} から ${end} · 純売上 ${revenue}`,
        ko: `${start} ~ ${end} · 순매출 ${revenue}`,
        th: `${start} ถึง ${end} · รายได้สุทธิ ${revenue}`,
      }),
    },
    {
      regex: /^(.+) 至 (.+) · 負責 (.+)$/,
      render: (_, start, end, owner) => ({
        "zh-Hant": `${start} 至 ${end} · 負責 ${owner}`,
        "zh-Hans": `${start} 至 ${end} · 负责人 ${owner}`,
        en: `${start} to ${end} · Owner ${owner}`,
        ja: `${start} から ${end} · 担当 ${owner}`,
        ko: `${start} ~ ${end} · 담당 ${owner}`,
        th: `${start} ถึง ${end} · ผู้รับผิดชอบ ${owner}`,
      }),
    },
    {
      regex: /^簽約 (.+) · 已回款 (.+) · 未回款 (.+)$/,
      render: (_, contract, settled, pending) => ({
        "zh-Hant": `簽約 ${contract} · 已回款 ${settled} · 未回款 ${pending}`,
        "zh-Hans": `签约 ${contract} · 已回款 ${settled} · 未回款 ${pending}`,
        en: `Contracted ${contract} · Settled ${settled} · Outstanding ${pending}`,
        ja: `契約額 ${contract} · 入金済み ${settled} · 未入金 ${pending}`,
        ko: `계약 ${contract} · 회수 완료 ${settled} · 미회수 ${pending}`,
        th: `มูลค่าสัญญา ${contract} · รับชำระแล้ว ${settled} · ค้างรับ ${pending}`,
      }),
    },
    {
      regex: /^(.+) · (\d+) 份$/,
      render: (_, name, count) => ({
        "zh-Hant": `${name} · ${count} 份`,
        "zh-Hans": `${name} · ${count} 份`,
        en: `${name} · ${count} units`,
        ja: `${name} · ${count} 件`,
        ko: `${name} · ${count}건`,
        th: `${name} · ${count} ชิ้น`,
      }),
    },
    {
      regex: /^(\d+) 已通過$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 已通過`,
        "zh-Hans": `${count} 已通过`,
        en: `${count} approved`,
        ja: `${count} 承認済み`,
        ko: `${count} 승인됨`,
        th: `ผ่านแล้ว ${count}`,
      }),
    },
    {
      regex: /^(\d+) 待審核$/,
      render: (_, count) => ({
        "zh-Hant": `${count} 待審核`,
        "zh-Hans": `${count} 待审核`,
        en: `${count} pending review`,
        ja: `${count} レビュー待ち`,
        ko: `${count} 검토 대기`,
        th: `รอตรวจ ${count}`,
      }),
    },
    {
      regex: /^確定刪除 (.+) -> (.+) 的匯率嗎？$/,
      render: (_, source, target) => ({
        "zh-Hant": `確定刪除 ${source} -> ${target} 的匯率嗎？`,
        "zh-Hans": `确定删除 ${source} -> ${target} 的汇率吗？`,
        en: `Delete the ${source} -> ${target} exchange rate?`,
        ja: `${source} -> ${target} の為替レートを削除しますか？`,
        ko: `${source} -> ${target} 환율을 삭제할까요?`,
        th: `ต้องการลบอัตราแลกเปลี่ยน ${source} -> ${target} ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 這筆廣告合作嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 這筆廣告合作嗎？`,
        "zh-Hans": `确定删除 ${value} 这笔广告合作吗？`,
        en: `Delete the ad deal “${value}”?`,
        ja: `広告案件「${value}」を削除しますか？`,
        ko: `광고 협업 “${value}”을(를) 삭제할까요?`,
        th: `ต้องการลบดีลโฆษณา “${value}” ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 的權利紀錄嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 的權利紀錄嗎？`,
        "zh-Hans": `确定删除 ${value} 的权利记录吗？`,
        en: `Delete the rights record for ${value}?`,
        ja: `${value} の権利レコードを削除しますか？`,
        ko: `${value}의 권리 기록을 삭제할까요?`,
        th: `ต้องการลบบันทึกสิทธิ์ของ ${value} ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 的渠道資料嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 的渠道資料嗎？`,
        "zh-Hans": `确定删除 ${value} 的渠道资料吗？`,
        en: `Delete the channel record for ${value}?`,
        ja: `${value} のチャネルデータを削除しますか？`,
        ko: `${value} 채널 데이터를 삭제할까요?`,
        th: `ต้องการลบข้อมูลช่องทางของ ${value} ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 成本嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 成本嗎？`,
        "zh-Hans": `确定删除 ${value} 成本吗？`,
        en: `Delete the ${value} cost item?`,
        ja: `${value} コストを削除しますか？`,
        ko: `${value} 비용 항목을 삭제할까요?`,
        th: `ต้องการลบต้นทุน ${value} ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 的銷售資料嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 的銷售資料嗎？`,
        "zh-Hans": `确定删除 ${value} 的销售资料吗？`,
        en: `Delete the sales record for ${value}?`,
        ja: `${value} の売上データを削除しますか？`,
        ko: `${value}의 매출 데이터를 삭제할까요?`,
        th: `ต้องการลบข้อมูลยอดขายของ ${value} ใช่ไหม`,
      }),
    },
    {
      regex: /^確定刪除 (.+) 的版稅資料嗎？$/,
      render: (_, value) => ({
        "zh-Hant": `確定刪除 ${value} 的版稅資料嗎？`,
        "zh-Hans": `确定删除 ${value} 的版税资料吗？`,
        en: `Delete the royalty record for ${value}?`,
        ja: `${value} のロイヤリティデータを削除しますか？`,
        ko: `${value}의 로열티 데이터를 삭제할까요?`,
        th: `ต้องการลบข้อมูลค่าลิขสิทธิ์ของ ${value} ใช่ไหม`,
      }),
    },
    {
      regex: /^(.+) · (.+) · (.+)%$/,
      render: (_, left, middle, percent) => ({
        "zh-Hant": `${left} · ${middle} · ${percent}%`,
        "zh-Hans": `${left} · ${middle} · ${percent}%`,
        en: `${left} · ${middle} · ${percent}%`,
        ja: `${left} · ${middle} · ${percent}%`,
        ko: `${left} · ${middle} · ${percent}%`,
        th: `${left} · ${middle} · ${percent}%`,
      }),
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const rendered = pattern.render(...match);
    return rendered[locale] || rendered[DEFAULT_LOCALE] || text;
  }
  return text;
}

function translateLiteral(text, locale) {
  if (!text || locale === DEFAULT_LOCALE) return text;
  const exact = EXACT_TRANSLATIONS[locale]?.[text];
  if (exact) return exact;
  const trimmed = text.trim();
  if (trimmed !== text) {
    const translatedTrimmed = EXACT_TRANSLATIONS[locale]?.[trimmed] || translatePattern(trimmed, locale);
    return translatedTrimmed !== trimmed ? text.replace(trimmed, translatedTrimmed) : text;
  }
  return translatePattern(text, locale);
}

function applyLiteralTranslations(root, locale) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".code")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    const cached = TEXT_NODE_ORIGINALS.get(currentNode) || { source: currentNode.nodeValue, lastTranslated: currentNode.nodeValue };
    if (currentNode.nodeValue !== cached.lastTranslated) {
      cached.source = currentNode.nodeValue;
    }
    const translated = translateLiteral(cached.source, locale);
    if (currentNode.nodeValue !== translated) {
      currentNode.nodeValue = translated;
    }
    cached.lastTranslated = translated;
    TEXT_NODE_ORIGINALS.set(currentNode, cached);
    currentNode = walker.nextNode();
  }

  root.querySelectorAll("[placeholder],[title]").forEach((element) => {
    let originalAttributes = ATTRIBUTE_ORIGINALS.get(element);
    if (!originalAttributes) {
      originalAttributes = {};
      ATTRIBUTE_ORIGINALS.set(element, originalAttributes);
    }
    ["placeholder", "title"].forEach((attributeName) => {
      if (!element.hasAttribute(attributeName)) return;
      if (!Object.prototype.hasOwnProperty.call(originalAttributes, attributeName)) {
        originalAttributes[attributeName] = {
          source: element.getAttribute(attributeName),
          lastTranslated: element.getAttribute(attributeName),
        };
      }
      const cached = originalAttributes[attributeName];
      const currentValue = element.getAttribute(attributeName);
      if (currentValue !== cached.lastTranslated) {
        cached.source = currentValue;
      }
      const translated = translateLiteral(cached.source, locale);
      if (element.getAttribute(attributeName) !== translated) {
        element.setAttribute(attributeName, translated);
      }
      cached.lastTranslated = translated;
    });
  });
}

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
    throw new Error(payload.detail || response.statusText || t("error.requestFailed"));
  }
  return payload;
}

function relativeTime(value) {
  if (!value) return t("common.notProvided");
  const date = new Date(value);
  return date.toLocaleString(localeCode(), { hour12: false });
}

function formatMoney(value, currency = "CNY") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(localeCode(), {
      style: "currency",
      currency: currency || "CNY",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "CNY"} ${amount.toFixed(2)}`;
  }
}

function projectRouteTitle(route) {
  const item = NAV_ITEMS.find((entry) => entry.key === route);
  return item ? translateLiteral(item.label, ACTIVE_LOCALE) : translateLiteral("專案列表", ACTIVE_LOCALE);
}

function statusLabel(value) {
  return localizedLabel(STATUS_LABELS, value);
}

function projectTypeLabel(value) {
  return localizedLabel(PROJECT_TYPE_LABELS, value);
}

function jobTypeLabel(value) {
  return localizedLabel(JOB_TYPE_LABELS, value, "");
}

function issueTypeLabel(value) {
  return localizedLabel(ISSUE_TYPE_LABELS, value, "");
}

function sourceKindLabel(value) {
  return localizedLabel(SOURCE_KIND_LABELS, value, "");
}

function characterRoleLabel(value) {
  return localizedLabel(CHARACTER_ROLE_LABELS, value, "common.unclassified");
}

function userRoleLabel(value) {
  return localizedLabel(USER_ROLE_LABELS, value, "");
}

function preferredProjectEntryRoute(user) {
  return firstAllowedRoute(user, [
    "text",
    "business",
    "review",
    "export",
    "voices",
    "characters",
    "settings",
    "comic",
    "video",
    "comic-script",
    "storyboard",
    "panels",
    "layout",
    "projects",
  ]);
}

function characterBindingSummary(character) {
  if (!character) return t("character.unsetTitle");
  if (character.story_character_name) {
    return t("character.boundStoryCharacter", { name: character.story_character_name });
  }
  return character.display_title || character.archetype || t("character.unsetTitle");
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
  if (!page) return t("common.noPageSelected");
  return t("comic.pageTitle", { pageNo: page.page_no, suffix: page.title ? ` · ${page.title}` : "" });
}

function flattenComicPanels(comicPages = []) {
  return comicPages.flatMap((page) => (page.panels || []).map((panel) => ({ ...panel, page })));
}

function LanguagePicker({ locale, onChange, align = "left", showLabel = true }) {
  return (
    <label className="subtext" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: align === "right" ? "flex-end" : "flex-start", flexWrap: "wrap", width: align === "right" ? "auto" : "100%" }}>
      {showLabel ? <span>{t("common.language")}</span> : null}
      <select className="select" style={{ minWidth: 132 }} value={locale} onChange={(event) => onChange(normalizeLocale(event.target.value))}>
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.nativeLabel}</option>
        ))}
      </select>
    </label>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(STORAGE_KEY) || "");
  const [locale, setLocale] = useState(() => normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE));
  const [user, setUser] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
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
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  ACTIVE_LOCALE = locale;

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
    setBusinessData(null);
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
    if (!projectId || !token || !user) return;
    setLoading(true);
    try {
      const canUseTextAssets = canAccessRoute(user, "text") || canAccessRoute(user, "generate") || canAccessRoute(user, "voices") || canAccessRoute(user, "characters");
      const canUseComicWorkflow = canAccessRoute(user, "comic-script") || canAccessRoute(user, "storyboard") || canAccessRoute(user, "panels") || canAccessRoute(user, "layout");
      const canUseComicSettings = canAccessRoute(user, "comic");
      const canUseVideoSettings = canAccessRoute(user, "video");
      const canUseGenerate = canAccessRoute(user, "generate");
      const canUseReview = canAccessRoute(user, "review");
      const canUseExport = canAccessRoute(user, "export");
      const canUseBusiness = canAccessRoute(user, "business");
      const [projectPayload, voicePayload, characterPayload, comicScriptPayload, comicPagePayload, comicProfilePayload, videoPayload, jobsPayload, reviewPayload, exportPayload, businessPayload] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`, { token }),
        canUseTextAssets ? apiFetch(`/api/projects/${projectId}/voice-profiles`, { token }) : Promise.resolve({ items: [] }),
        canUseTextAssets ? apiFetch(`/api/projects/${projectId}/character-profiles`, { token }) : Promise.resolve({ items: [] }),
        canUseComicWorkflow ? apiFetch(`/api/projects/${projectId}/comic-scripts`, { token }) : Promise.resolve({ items: [] }),
        canUseComicWorkflow ? apiFetch(`/api/projects/${projectId}/comic-pages`, { token }) : Promise.resolve({ items: [] }),
        canUseComicSettings ? apiFetch(`/api/projects/${projectId}/comic-profiles`, { token }) : Promise.resolve({ items: [] }),
        canUseVideoSettings ? apiFetch(`/api/projects/${projectId}/video-profiles`, { token }) : Promise.resolve({ items: [] }),
        canUseGenerate ? apiFetch(`/api/projects/${projectId}/jobs`, { token }) : Promise.resolve({ items: [] }),
        canUseReview ? apiFetch(`/api/projects/${projectId}/review-queue`, { token }) : Promise.resolve({ items: [] }),
        canUseExport ? apiFetch(`/api/projects/${projectId}/exports`, { token }) : Promise.resolve({ items: [] }),
        canUseBusiness ? apiFetch(`/api/projects/${projectId}/business`, { token }) : Promise.resolve(null),
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
      setBusinessData(businessPayload);
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

  async function handleOpenChapterText(chapterId, nextRoute = "text") {
    if (!chapterId) return;
    setSelectedChapterId(chapterId);
    await loadChapter(chapterId);
    setRoute(nextRoute);
  }

  async function handleOpenProjectText(projectId, nextRoute = "text") {
    if (!projectId) return;
    setSelectedProjectId(projectId);
    await loadProject(projectId);
    setRoute(nextRoute);
  }

  async function loadChapter(chapterId) {
    if (!chapterId || !token || !user) return;
    const [segmentsPayload, rendersPayload] = await Promise.all([
      canAccessRoute(user, "text") || canAccessRoute(user, "generate")
        ? apiFetch(`/api/chapters/${chapterId}/segments`, { token })
        : Promise.resolve({ items: [] }),
      canAccessRoute(user, "export")
        ? apiFetch(`/api/chapters/${chapterId}/renders`, { token })
        : Promise.resolve({ items: [] }),
    ]);
    setSegments(segmentsPayload.items || []);
    setRenders(rendersPayload.items || []);
  }

  useEffect(() => {
    if (token) return;
    (async () => {
      try {
        const payload = await apiFetch("/api/auth/demo-accounts");
        setDemoAccounts(payload.items || []);
      } catch {
        setDemoAccounts([]);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProjects([]);
      setProjectDetail(null);
      setSelectedProjectId(null);
      setSelectedChapterId(null);
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
    if (selectedProjectId && user) {
      loadProject(selectedProjectId);
    }
  }, [selectedProjectId, user?.role]);

  useEffect(() => {
    if (!token || !selectedProjectId || !AUTO_REFRESH_ROUTES.has(route)) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      loadProject(selectedProjectId, selectedChapterId);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [token, selectedProjectId, selectedChapterId, route]);

  useEffect(() => {
    const normalized = normalizeLocale(locale);
    ACTIVE_LOCALE = normalized;
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    document.documentElement.lang = normalized;
    document.title = translateLiteral("AI Publisher 本機工作台", normalized);
  }, [locale]);

  useEffect(() => {
    applyLiteralTranslations(document.getElementById("root"), locale);
  });

  useEffect(() => {
    if (!user) return;
    if (canAccessRoute(user, route)) return;
    setRoute(firstAllowedRoute(user, ["projects", "business", "text", "review", "export", "voices", "characters", "settings"]));
  }, [route, user]);

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
    setRoute("projects");
  }

  async function handleRouteChange(nextRoute) {
    if (!canAccessRoute(user, nextRoute)) {
      showFlash("error", t("common.unauthorized"));
      return;
    }
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
    return <LoginPage onLogin={handleLogin} flash={flash} locale={locale} onLocaleChange={setLocale} demoAccounts={demoAccounts} />;
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
      />
      <main className="main">
        <Topbar
          route={route}
          project={selectedProject}
          user={user}
          locale={locale}
          onLocaleChange={setLocale}
          onLogout={handleLogout}
          actions={routeActions({
            route,
            user,
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
            businessData={businessData}
            user={user}
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

function routeActions({ route, user, selectedProject, selectedChapter, onCreated, onImportDone, onGenerateDone, onRenderDone, onExportDone, token, requestConfirm, showFlash }) {
  if (!canAccessRoute(user, route)) {
    return null;
  }
  if (route === "text" && selectedProject && canAccessRoute(user, "text")) {
    return <ImportInline token={token} project={selectedProject} onDone={onImportDone} showFlash={showFlash} />;
  }
  if (route === "generate" && selectedChapter && canAccessRoute(user, "generate")) {
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
  if (route === "export" && selectedChapter && canAccessRoute(user, "export")) {
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

function AccessDeniedPage({ user }) {
  const allowedRoutes = userAllowedRoutes(user).filter((route) => route !== "projects");
  return (
    <div className="empty-state">
      <div>{t("common.unauthorized")}</div>
      <div style={{ marginTop: 10 }}>{t("common.currentRole", { role: userRoleLabel(user?.role) || user?.role || "-" })}</div>
      {allowedRoutes.length ? (
        <div style={{ marginTop: 10 }}>{t("common.availablePages", { routes: allowedRoutes.map((route) => projectRouteTitle(route)).join(" / ") })}</div>
      ) : null}
    </div>
  );
}

function LoginPage({ onLogin, flash, locale, onLocaleChange, demoAccounts = [] }) {
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
          <h1>{t("login.titleLineOne")}<br/>{t("login.titleLineTwo")}</h1>
          <p>{t("login.description")}</p>
          <div className="login-meta">
            <div className="login-kpi">
              <div className="eyebrow">{translateLiteral("後端", ACTIVE_LOCALE)}</div>
              <strong>FastAPI</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">{translateLiteral("資料庫", ACTIVE_LOCALE)}</div>
              <strong>SQLite</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">{translateLiteral("語音", ACTIVE_LOCALE)}</div>
              <strong>macOS say</strong>
            </div>
            <div className="login-kpi">
              <div className="eyebrow">{translateLiteral("範圍", ACTIVE_LOCALE)}</div>
              <strong>MVP</strong>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>{t("login.signIn")}</h2>
              <div className="subtext">{t("login.localAdminReady")}</div>
            </div>
            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <span className="tag brand">{t("login.webApp")}</span>
              <LanguagePicker locale={locale} onChange={onLocaleChange} align="right" />
            </div>
          </div>
          {flash ? <div className={`flash ${flash.type}`}>{flash.message}</div> : null}
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>{t("login.email")}</label>
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label>{t("login.password")}</label>
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <button className="button" disabled={submitting}>{submitting ? t("login.signingIn") : t("login.enterStudio")}</button>
          </form>
          {demoAccounts.length ? (
            <div className="editor-card" style={{ marginTop: 16 }}>
              <div className="title-row">
                <strong>{t("login.demoAccounts")}</strong>
              </div>
              <div className="subtext" style={{ marginTop: 8 }}>{t("login.demoDescription")}</div>
              <div className="list" style={{ marginTop: 12 }}>
                {demoAccounts.map((account) => {
                  const routeSummary = (account.allowed_routes || [])
                    .filter((route) => route !== "projects")
                    .map((route) => projectRouteTitle(route))
                    .join(" / ");
                  return (
                    <div key={account.email} className="list-item">
                      <div className="title-row">
                        <strong>{account.email}</strong>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => {
                            setEmail(account.email);
                            setPassword(account.password);
                          }}
                        >
                          {t("login.fillAccount")}
                        </button>
                      </div>
                      <div className="subtext" style={{ marginTop: 8 }}>
                        {userRoleLabel(account.role)} · {account.password}
                      </div>
                      <div className="subtext" style={{ marginTop: 6 }}>
                        {t("login.allowedPages")}：{routeSummary || projectRouteTitle("projects")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="footer-note">
            {t("login.defaultAccount")} <span className="code">admin@example.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, onRouteChange, projects, selectedProjectId, onSelectProject, user }) {
  const [openSections, setOpenSections] = useState({
    project: true,
    business: true,
    audiobook: true,
    comic: true,
    system: false,
    llm: false,
  });

  const projectItem = NAV_ITEMS.find((item) => item.key === "projects");
  const businessNavItems = NAV_ITEMS.filter((item) => ["business"].includes(item.key) && canAccessRoute(user, item.key));
  const audiobookNavItems = NAV_ITEMS.filter((item) => ["text", "voices", "characters", "generate", "review", "export"].includes(item.key) && canAccessRoute(user, item.key));
  const comicNavItems = NAV_ITEMS.filter((item) => ["comic-script", "storyboard", "panels", "layout", "comic"].includes(item.key) && canAccessRoute(user, item.key));
  const systemNavItems = NAV_ITEMS.filter((item) => ["video", "settings"].includes(item.key) && canAccessRoute(user, item.key));

  function toggleSection(sectionKey) {
    setOpenSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }));
  }

  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-mark">AP</div>
        <div className="eyebrow">{t("sidebar.brandEyebrow")}</div>
        <div className="brand-title">AI Publisher</div>
      </div>

      <div className={`sidebar-section ${openSections.project ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("project")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">{t("sidebar.projectWorkspace")}</span>
            <span className="sidebar-hint">{selectedProjectId ? t("sidebar.projectSelected") : t("sidebar.projectUnselected")}</span>
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
                <span>{projectRouteTitle(projectItem.key)}</span>
              </button>
            ) : null}
            <div className="project-pick">
              {projects.length === 0 ? <div className="muted">{translateLiteral("目前還沒有專案", ACTIVE_LOCALE)}</div> : null}
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
                  <div className="subtext">{project.author || t("common.unfilledAuthor")} · {projectTypeLabel(project.project_type)} · {project.language}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {businessNavItems.length ? (
        <div className={`sidebar-section ${openSections.business ? "open" : ""}`}>
          <button className="sidebar-toggle" onClick={() => toggleSection("business")}>
            <span className="sidebar-toggle-main">
              <span className="sidebar-label">經營管理</span>
              <span className="sidebar-hint">權利、成本、渠道、銷售、版稅</span>
            </span>
            <span className="sidebar-toggle-meta">
              <span className="sidebar-meta-text">{businessNavItems.length} 項</span>
              <span className={`sidebar-chevron ${openSections.business ? "open" : ""}`}>▾</span>
            </span>
          </button>
          {openSections.business ? (
            <div className="sidebar-section-body">
              {businessNavItems.map((item) => (
                <button key={item.key} className={`nav-button ${route === item.key ? "active" : ""}`} onClick={() => onRouteChange(item.key)}>
                  <span>{projectRouteTitle(item.key)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {audiobookNavItems.length ? (
        <div className={`sidebar-section ${openSections.audiobook ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("audiobook")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">{t("sidebar.audiobookFlow")}</span>
            <span className="sidebar-hint">{t("sidebar.audiobookHint")}</span>
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
                <span>{projectRouteTitle(item.key)}</span>
              </button>
            ))}
          </div>
        ) : null}
        </div>
      ) : null}

      {comicNavItems.length ? (
        <div className={`sidebar-section ${openSections.comic ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("comic")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">{t("sidebar.comicFlow")}</span>
            <span className="sidebar-hint">{t("sidebar.comicHint")}</span>
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
                <span>{projectRouteTitle(item.key)}</span>
              </button>
            ))}
          </div>
        ) : null}
        </div>
      ) : null}

      {systemNavItems.length ? (
        <div className={`sidebar-section ${openSections.system ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("system")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">{t("sidebar.systemExtensions")}</span>
            <span className="sidebar-hint">{t("sidebar.systemHint")}</span>
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
                <span>{projectRouteTitle(item.key)}</span>
              </button>
            ))}
          </div>
        ) : null}
        </div>
      ) : null}

      <div className={`sidebar-section ${openSections.llm ? "open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => toggleSection("llm")}>
          <span className="sidebar-toggle-main">
            <span className="sidebar-label">{t("sidebar.externalLlm")}</span>
            <span className="sidebar-hint">{t("sidebar.officialLinks")}</span>
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

    </aside>
  );
}

function Topbar({ route, project, user, actions, locale, onLocaleChange, onLogout }) {
  return (
    <div className="topbar">
      <div>
        <div className="eyebrow">
          {project ? `${project.title} / ${project.language}` : t("topbar.defaultEyebrow")}
        </div>
        <h1>{projectRouteTitle(route)}</h1>
        <div className="subtext">
          {project ? t("topbar.projectContext", { project: project.title, user: user.name }) : t("topbar.noProject")}
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-actions">{actions}</div>
        <div className="topbar-session">
          <span className="tag brand">{user.name}</span>
          <span className="tag">{userRoleLabel(user.role) || user.role}</span>
          <LanguagePicker locale={locale} onChange={onLocaleChange} align="right" showLabel={false} />
          <button className="button-secondary" onClick={onLogout}>{t("common.logout")}</button>
        </div>
      </div>
    </div>
  );
}

function PageContent(props) {
  const {
    route,
    user,
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
    businessData,
    refreshProject,
    deleteProject,
    onOpenChapter,
    onOpenProjectText,
    onSelectProject,
    showFlash,
    requestConfirm,
  } = props;

  if (!canAccessRoute(user, route)) {
    return <AccessDeniedPage user={user} />;
  }

  if (route === "projects") {
    return <ProjectsPage user={user} projects={projects} selectedProject={project} businessData={businessData} token={token} refreshProject={refreshProject} deleteProject={deleteProject} onSelectProject={onSelectProject} onOpenChapter={onOpenChapter} onOpenProjectText={onOpenProjectText} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "business") {
    return <BusinessPage token={token} project={project} businessData={businessData} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
  }
  if (route === "text") {
    return <TextPrepPage user={user} token={token} project={project} selectedChapter={selectedChapter} selectedChapterId={selectedChapterId} setSelectedChapterId={setSelectedChapterId} segments={segments} voices={voices} characters={characters} jobs={jobs} refreshProject={refreshProject} requestConfirm={requestConfirm} showFlash={showFlash} />;
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

function ProjectsPage({ user, projects = [], selectedProject, businessData, token, refreshProject, deleteProject, onSelectProject, onOpenChapter, onOpenProjectText, requestConfirm, showFlash }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardModalState, setWizardModalState] = useState({ open: false, mode: "paste", projectId: null });
  const primaryRoute = preferredProjectEntryRoute(user);
  const canCreateProject = hasPermission(user, "project_manage");
  const canDeleteProject = hasPermission(user, "project_delete");
  const canManageText = hasPermission(user, "text_manage");
  const canOpenChapter = canAccessRoute(user, "text") || canAccessRoute(user, "export");
  const canManageBusiness = canAccessRoute(user, "business");
  const primaryRouteLabel = projectRouteTitle(primaryRoute);
  const businessSummary = selectedProject?.business_summary || businessData?.summary || null;

  function openWizardForProject(projectId, mode = "paste") {
    onSelectProject(projectId);
    setWizardModalState({ open: true, mode, projectId });
  }

  const wizardProject = selectedProject?.id === wizardModalState.projectId
    ? selectedProject
    : projects.find((item) => item.id === wizardModalState.projectId) || null;

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
              {canCreateProject ? <button className="button" onClick={() => setShowCreateModal(true)}>建立專案</button> : null}
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
                      <div className="project-row-meta">
                        {project.cover_url ? <img className="project-row-cover" src={project.cover_url} alt={`${project.title} 封面`} /> : <div className="project-row-cover project-row-cover-fallback">{project.title.slice(0, 2)}</div>}
                        <div className="grid" style={{ gap: 6 }}>
                          <button className="text-action" onClick={() => onSelectProject(project.id)}>
                            {project.title}
                          </button>
                          <div className="subtext">{project.author || "未填作者"} · {projectTypeLabel(project.project_type)}</div>
                          {project.description ? <div className="subtext clamp-2">{project.description}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>{project.language}</td>
                    <td>{project.metrics?.chapter_count || 0}</td>
                    <td>{project.metrics?.review_required_count || 0}</td>
                    <td>{project.metrics?.failed_jobs || 0}</td>
                    <td>
                      <div className="toolbar" style={{ marginBottom: 0 }}>
                        {canManageText ? (
                          <button
                            className="button"
                            onClick={() => openWizardForProject(project.id, "paste")}
                          >
                            新建電子書
                          </button>
                        ) : null}
                        {primaryRoute !== "projects" ? (
                          <button
                            className="button-secondary"
                            onClick={async () => {
                              await onOpenProjectText(project.id, primaryRoute);
                            }}
                          >
                            {primaryRouteLabel}
                          </button>
                        ) : null}
                        {canDeleteProject ? (
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
                        ) : null}
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
              {canManageText ? (
                <section className="panel wizard-panel">
                  <div className="wizard-hero">
                    <div className="eyebrow">Full Screen Wizard</div>
                    <h2>用全屏向導建立整本電子書</h2>
                    <div className="subtext">入口現在集中成一個明顯動作。點一下就會打開全屏向導，支援整本貼上拆章、手動新增章節、保存整書 TXT，以及後續語音生成與出版流程。</div>
                    <div className="wizard-step-row">
                      <div className="wizard-step">
                        <strong>1</strong>
                        <span>先選專案，再打開全屏向導</span>
                      </div>
                      <div className="wizard-step">
                        <strong>2</strong>
                        <span>可貼整本拆章，也可逐章建立</span>
                      </div>
                      <div className="wizard-step">
                        <strong>3</strong>
                        <span>完成後直接接語音生成、審核、出版</span>
                      </div>
                    </div>
                    <div className="wizard-cta-row">
                      <button className="wizard-cta" onClick={() => openWizardForProject(selectedProject.id, "paste")}>
                        立即打開全屏向導
                      </button>
                      <button className="wizard-cta secondary" onClick={() => openWizardForProject(selectedProject.id, "manual")}>
                        從手動新增開始
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>{selectedProject.title}</h2>
                    <div className="subtext">{selectedProject.author || "未填作者"} · {selectedProject.language}</div>
                  </div>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    {canManageText ? (
                      <button className="button-secondary" onClick={() => openWizardForProject(selectedProject.id, "paste")}>
                        開啟全屏向導
                      </button>
                    ) : null}
                    <span className="tag brand">{statusLabel(selectedProject.status)}</span>
                  </div>
                </div>
                <div className="project-hero-card">
                  {selectedProject.cover_url ? (
                    <img className="project-hero-cover" src={selectedProject.cover_url} alt={`${selectedProject.title} 封面`} />
                  ) : (
                    <div className="project-hero-cover project-hero-cover-fallback">{selectedProject.title.slice(0, 2)}</div>
                  )}
                  <div className="grid" style={{ gap: 12 }}>
                    <div className="eyebrow">Book Intro</div>
                    <div className="project-hero-description">
                      {selectedProject.description || "這個專案尚未填寫簡介，可以在建立專案時補上內容。"}
                    </div>
                  </div>
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
                  {canManageBusiness && businessSummary ? (
                    <>
                      <div className="metric">
                        <div className="eyebrow">有效授權</div>
                        <strong>{businessSummary.active_rights_count || 0}</strong>
                      </div>
                      <div className="metric">
                        <div className="eyebrow">上架渠道</div>
                        <strong>{businessSummary.live_channel_count || 0}</strong>
                      </div>
                      <div className="metric">
                        <div className="eyebrow">累計營收</div>
                        <strong style={{ fontSize: 22 }}>{formatMoney(businessSummary.total_sales, businessSummary.base_currency)}</strong>
                      </div>
                      <div className="metric">
                        <div className="eyebrow">估算毛利</div>
                        <strong style={{ fontSize: 22 }}>{formatMoney(businessSummary.gross_profit, businessSummary.base_currency)}</strong>
                      </div>
                    </>
                  ) : null}
                </div>
                {canManageBusiness ? (
                  <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
                    <button className="button-secondary" onClick={async () => {
                      await onOpenProjectText(selectedProject.id, "business");
                    }}>
                      打開經營頁
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>章節地圖</h2>
                    <div className="subtext">
                      {canAccessRoute(user, "text")
                        ? "直接進入文本準備，不再切換到另一個總覽頁。"
                        : canAccessRoute(user, "export")
                          ? "可直接切到交付頁，查看各章渲染與匯出結果。"
                          : "目前角色以專案摘要為主，章節明細入口已交由其他流程角色處理。"}
                    </div>
                  </div>
                </div>
                <div className="list">
                  {(selectedProject.chapters || []).map((chapter) => (
                    <div key={chapter.id} className="list-item">
                      <div className="title-row">
                        <strong>{chapter.order_index}. {chapter.title}</strong>
                        {canOpenChapter ? (
                          <button className="button-secondary" onClick={() => onOpenChapter(chapter.id, canAccessRoute(user, "text") ? "text" : "export")}>
                            {canAccessRoute(user, "text") ? "文本準備" : "匯出交付"}
                          </button>
                        ) : null}
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
      {canCreateProject ? (
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
      ) : null}
      <EbookWizardModal
        open={wizardModalState.open}
        mode={wizardModalState.mode}
        project={wizardProject}
        token={token}
        onClose={() => setWizardModalState((current) => ({ ...current, open: false }))}
        refreshProject={refreshProject}
        showFlash={showFlash}
      />
    </>
  );
}

function defaultRightsForm() {
  return {
    rights_type: "audiobook",
    holder_name: "",
    grant_scope: "",
    territory: "全球",
    license_language: "zh-CN",
    contract_code: "",
    start_date: "",
    end_date: "",
    status: "active",
    notes: "",
  };
}

function defaultChannelForm() {
  return {
    channel_name: "",
    channel_category: "retail",
    release_format: "audiobook",
    release_status: "planning",
    price: "",
    currency: "CNY",
    release_date: "",
    external_sku: "",
    notes: "",
  };
}

function defaultCostForm() {
  return {
    category: "production",
    vendor_name: "",
    description: "",
    amount: "",
    currency: "CNY",
    occurred_on: "",
    status: "booked",
  };
}

function defaultSalesForm() {
  return {
    channel_name: "",
    channel_category: "retail",
    period_start: "",
    period_end: "",
    units_sold: "",
    gross_revenue: "",
    refunds: "",
    net_revenue: "",
    currency: "CNY",
    notes: "",
  };
}

function defaultRoyaltyForm() {
  return {
    payee_name: "",
    role_name: "",
    basis: "net_revenue",
    rate_percent: "",
    amount_due: "",
    currency: "CNY",
    period_start: "",
    period_end: "",
    status: "pending",
    notes: "",
  };
}

function defaultExchangeRateForm(baseCurrency = "CNY") {
  return {
    source_currency: "USD",
    target_currency: baseCurrency || "CNY",
    rate: "",
    effective_date: "",
    notes: "",
  };
}

function defaultAdvertiserDealForm() {
  return {
    advertiser_name: "",
    campaign_name: "",
    contact_name: "",
    deliverables: "",
    start_date: "",
    end_date: "",
    contract_amount: "",
    settled_amount: "",
    currency: "CNY",
    status: "proposal",
    owner_name: "",
    notes: "",
  };
}

function BusinessPage({ token, project, businessData, refreshProject, requestConfirm, showFlash }) {
  const locale = normalizeLocale(ACTIVE_LOCALE);
  const ui = (text) => translateLiteral(text, locale);
  const resolvedBaseCurrency = project?.business_base_currency || businessData?.summary?.base_currency || "CNY";
  const [rightsForm, setRightsForm] = useState(defaultRightsForm());
  const [channelForm, setChannelForm] = useState(defaultChannelForm());
  const [costForm, setCostForm] = useState(defaultCostForm());
  const [salesForm, setSalesForm] = useState(defaultSalesForm());
  const [royaltyForm, setRoyaltyForm] = useState(defaultRoyaltyForm());
  const [advertiserDealForm, setAdvertiserDealForm] = useState(defaultAdvertiserDealForm());
  const [baseCurrency, setBaseCurrency] = useState(resolvedBaseCurrency);
  const [exchangeRateForm, setExchangeRateForm] = useState(defaultExchangeRateForm(resolvedBaseCurrency));
  const [editingIds, setEditingIds] = useState({
    rights: null,
    channel: null,
    cost: null,
    sales: null,
    royalty: null,
    exchangeRate: null,
    advertiserDeal: null,
  });
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    setBaseCurrency(resolvedBaseCurrency);
    setExchangeRateForm((current) => ({
      ...current,
      target_currency: resolvedBaseCurrency,
    }));
  }, [resolvedBaseCurrency]);

  useEffect(() => {
    setEditingIds({
      rights: null,
      channel: null,
      cost: null,
      sales: null,
      royalty: null,
      exchangeRate: null,
      advertiserDeal: null,
    });
    setRightsForm(defaultRightsForm());
    setChannelForm(defaultChannelForm());
    setCostForm(defaultCostForm());
    setSalesForm(defaultSalesForm());
    setRoyaltyForm(defaultRoyaltyForm());
    setAdvertiserDealForm(defaultAdvertiserDealForm());
    setExchangeRateForm(defaultExchangeRateForm(resolvedBaseCurrency));
  }, [project?.id, resolvedBaseCurrency]);

  if (!project) {
    return <div className="empty-state">{ui("先選取一個專案，再進入經營管理頁。")}</div>;
  }

  const summary = businessData?.summary || project?.business_summary || {
    active_rights_count: 0,
    live_channel_count: 0,
    advertiser_channel_count: 0,
    advertiser_deal_count: 0,
    total_cost: 0,
    total_sales: 0,
    total_royalties: 0,
    gross_profit: 0,
    units_sold: 0,
    advertiser_revenue: 0,
    advertiser_pipeline: 0,
    advertiser_settled: 0,
    base_currency: "CNY",
    conversion_ready: true,
    is_multi_currency: false,
    exchange_rate_count: 0,
    currency_breakdown: {},
    unconverted_currency_count: 0,
    unconverted_currencies: [],
    last_sales_date: "",
  };
  const rightsRecords = businessData?.rights_records || [];
  const channels = businessData?.distribution_channels || [];
  const costItems = businessData?.cost_items || [];
  const salesRecords = businessData?.sales_records || [];
  const royaltyStatements = businessData?.royalty_statements || [];
  const exchangeRates = businessData?.exchange_rates || [];
  const advertiserDeals = businessData?.advertiser_deals || [];
  const businessReports = businessData?.business_reports || [];

  function updateForm(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }));
  }

  function beginEdit(section, setter, item, transform = (value) => value) {
    setEditingIds((current) => ({ ...current, [section]: item.id }));
    setter(transform(item));
  }

  function cancelEdit(section, setter, factory) {
    setEditingIds((current) => ({ ...current, [section]: null }));
    setter(factory());
  }

  async function persistSection({ section, createPath, updatePath, editingId, body, setter, factory, createMessage, updateMessage }) {
    setBusyKey(section);
    try {
      await apiFetch(editingId ? updatePath : createPath, {
        method: editingId ? "PATCH" : "POST",
        token,
        body,
      });
      cancelEdit(section, setter, factory);
      await refreshProject({ projectId: project.id });
      showFlash("success", editingId ? updateMessage : createMessage);
    } finally {
      setBusyKey("");
    }
  }

  async function saveBaseCurrency() {
    setBusyKey("base-currency");
    try {
      await apiFetch(`/api/projects/${project.id}/business-base-currency`, {
        method: "POST",
        token,
        body: { business_base_currency: baseCurrency },
      });
      await refreshProject({ projectId: project.id });
      showFlash("success", "基準幣已更新。");
    } finally {
      setBusyKey("");
    }
  }

  async function submitRights(event) {
    event.preventDefault();
    await persistSection({
      section: "rights",
      createPath: `/api/projects/${project.id}/rights-records`,
      updatePath: `/api/projects/${project.id}/rights-records/${editingIds.rights}`,
      editingId: editingIds.rights,
      body: rightsForm,
      setter: setRightsForm,
      factory: defaultRightsForm,
      createMessage: "權利與合同資料已新增。",
      updateMessage: "權利與合同資料已更新。",
    });
  }

  async function submitChannel(event) {
    event.preventDefault();
    await persistSection({
      section: "channel",
      createPath: `/api/projects/${project.id}/distribution-channels`,
      updatePath: `/api/projects/${project.id}/distribution-channels/${editingIds.channel}`,
      editingId: editingIds.channel,
      body: { ...channelForm, price: Number(channelForm.price || 0) },
      setter: setChannelForm,
      factory: defaultChannelForm,
      createMessage: "發行渠道資料已新增。",
      updateMessage: "發行渠道資料已更新。",
    });
  }

  async function submitCost(event) {
    event.preventDefault();
    await persistSection({
      section: "cost",
      createPath: `/api/projects/${project.id}/cost-items`,
      updatePath: `/api/projects/${project.id}/cost-items/${editingIds.cost}`,
      editingId: editingIds.cost,
      body: { ...costForm, amount: Number(costForm.amount || 0) },
      setter: setCostForm,
      factory: defaultCostForm,
      createMessage: "成本項目已新增。",
      updateMessage: "成本項目已更新。",
    });
  }

  async function submitSales(event) {
    event.preventDefault();
    await persistSection({
      section: "sales",
      createPath: `/api/projects/${project.id}/sales-records`,
      updatePath: `/api/projects/${project.id}/sales-records/${editingIds.sales}`,
      editingId: editingIds.sales,
      body: {
        ...salesForm,
        units_sold: Number(salesForm.units_sold || 0),
        gross_revenue: Number(salesForm.gross_revenue || 0),
        refunds: Number(salesForm.refunds || 0),
        net_revenue: salesForm.net_revenue === "" ? null : Number(salesForm.net_revenue || 0),
      },
      setter: setSalesForm,
      factory: defaultSalesForm,
      createMessage: "銷售回傳已新增。",
      updateMessage: "銷售回傳已更新。",
    });
  }

  async function submitRoyalty(event) {
    event.preventDefault();
    await persistSection({
      section: "royalty",
      createPath: `/api/projects/${project.id}/royalty-statements`,
      updatePath: `/api/projects/${project.id}/royalty-statements/${editingIds.royalty}`,
      editingId: editingIds.royalty,
      body: {
        ...royaltyForm,
        rate_percent: Number(royaltyForm.rate_percent || 0),
        amount_due: Number(royaltyForm.amount_due || 0),
      },
      setter: setRoyaltyForm,
      factory: defaultRoyaltyForm,
      createMessage: "版稅結算資料已新增。",
      updateMessage: "版稅結算資料已更新。",
    });
  }

  async function submitExchangeRate(event) {
    event.preventDefault();
    await persistSection({
      section: "exchange-rate",
      createPath: `/api/projects/${project.id}/exchange-rates`,
      updatePath: `/api/projects/${project.id}/exchange-rates/${editingIds.exchangeRate}`,
      editingId: editingIds.exchangeRate,
      body: { ...exchangeRateForm, rate: Number(exchangeRateForm.rate || 0) },
      setter: setExchangeRateForm,
      factory: () => defaultExchangeRateForm(baseCurrency),
      createMessage: "匯率已新增。",
      updateMessage: "匯率已更新。",
    });
  }

  async function submitAdvertiserDeal(event) {
    event.preventDefault();
    await persistSection({
      section: "advertiserDeal",
      createPath: `/api/projects/${project.id}/advertiser-deals`,
      updatePath: `/api/projects/${project.id}/advertiser-deals/${editingIds.advertiserDeal}`,
      editingId: editingIds.advertiserDeal,
      body: {
        ...advertiserDealForm,
        contract_amount: Number(advertiserDealForm.contract_amount || 0),
        settled_amount: Number(advertiserDealForm.settled_amount || 0),
      },
      setter: setAdvertiserDealForm,
      factory: defaultAdvertiserDealForm,
      createMessage: "廣告合作已新增。",
      updateMessage: "廣告合作已更新。",
    });
  }

  async function exportBusinessReport() {
    setBusyKey("business-report");
    try {
      const payload = await apiFetch(`/api/projects/${project.id}/business-reports/export`, {
        method: "POST",
        token,
      });
      await refreshProject({ projectId: project.id });
      if (payload.report?.file_url) {
        window.open(payload.report.file_url, "_blank", "noopener,noreferrer");
      }
      showFlash("success", "經營報表已匯出。");
    } finally {
      setBusyKey("");
    }
  }

  function confirmDelete({ title, message, path, successMessage }) {
    requestConfirm({
      title,
      message,
      confirmLabel: "刪除",
      onConfirm: async () => {
        await apiFetch(path, { method: "DELETE", token });
        await refreshProject({ projectId: project.id });
        showFlash("success", successMessage);
      },
    });
  }

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>經營總覽</h2>
            <div className="subtext">把權利、廣告、渠道、成本、銷售、版稅與報表集中在同一頁。</div>
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <span className="tag brand">{summary.base_currency || "CNY"}</span>
            {summary.last_sales_date ? <span className="tag">{ui(`最近銷售：${summary.last_sales_date}`)}</span> : null}
            <button className="button-secondary" onClick={exportBusinessReport} disabled={busyKey === "business-report"}>
              {busyKey === "business-report" ? "匯出中..." : "匯出經營報表"}
            </button>
          </div>
        </div>
        <div className="metrics">
          <div className="metric"><div className="eyebrow">有效授權</div><strong>{summary.active_rights_count || 0}</strong></div>
          <div className="metric"><div className="eyebrow">上架渠道</div><strong>{summary.live_channel_count || 0}</strong></div>
          <div className="metric"><div className="eyebrow">廣告合作</div><strong>{summary.advertiser_deal_count || 0}</strong></div>
          <div className="metric"><div className="eyebrow">累計成本</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.total_cost, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">累計營收</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.total_sales, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">版稅應付</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.total_royalties, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">估算毛利</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.gross_profit, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">廣告收入</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.advertiser_revenue, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">廣告簽約額</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.advertiser_pipeline, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">廣告已回款</div><strong style={{ fontSize: 22 }}>{formatMoney(summary.advertiser_settled, summary.base_currency)}</strong></div>
          <div className="metric"><div className="eyebrow">累計銷量</div><strong>{summary.units_sold || 0}</strong></div>
          <div className="metric"><div className="eyebrow">匯率筆數</div><strong>{summary.exchange_rate_count || 0}</strong></div>
        </div>
        {summary.is_multi_currency ? (
          <div className="subtext" style={{ marginTop: 12 }}>
            {ui(`目前專案已啟用多幣種，總覽金額依 ${summary.base_currency || "CNY"} 折算。`)}
            {summary.conversion_ready
              ? ` ${ui("目前所有幣別都有可用匯率。")}`
              : ` ${ui(`尚有 ${summary.unconverted_currency_count || 0} 個幣別缺少匯率：${(summary.unconverted_currencies || []).join("、") || ui("未提供")}`)}`}
          </div>
        ) : null}
      </section>

      <div className="grid business-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>多幣種與匯率</h2>
              <div className="subtext">先設定專案基準幣，再維護匯率，讓營收、成本、版稅都能換算。</div>
            </div>
            <span className="tag brand">{ui(`${exchangeRates.length} 筆`)}</span>
          </div>
          <div className="form-grid">
            <div className="split-layout">
              <div className="field">
                <label>專案基準幣</label>
                <input className="input" value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())} placeholder="CNY / USD / HKD" />
              </div>
              <div className="field" style={{ alignContent: "end" }}>
                <label>&nbsp;</label>
                <button className="button-secondary" type="button" onClick={saveBaseCurrency} disabled={busyKey === "base-currency"}>
                  {busyKey === "base-currency" ? "更新中..." : "更新基準幣"}
                </button>
              </div>
            </div>
            <form className="form-grid" onSubmit={submitExchangeRate}>
              <div className="split-layout">
                <div className="field">
                  <label>來源幣別</label>
                  <input className="input" value={exchangeRateForm.source_currency} onChange={(event) => updateForm(setExchangeRateForm, "source_currency", event.target.value.toUpperCase())} required />
                </div>
                <div className="field">
                  <label>目標幣別</label>
                  <input className="input" value={exchangeRateForm.target_currency} onChange={(event) => updateForm(setExchangeRateForm, "target_currency", event.target.value.toUpperCase())} required />
                </div>
              </div>
              <div className="split-layout">
                <div className="field">
                  <label>匯率</label>
                  <input className="input" type="number" step="0.000001" value={exchangeRateForm.rate} onChange={(event) => updateForm(setExchangeRateForm, "rate", event.target.value)} required />
                </div>
                <div className="field">
                  <label>生效日期</label>
                  <input className="input" type="date" value={exchangeRateForm.effective_date} onChange={(event) => updateForm(setExchangeRateForm, "effective_date", event.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>備註</label>
                <input className="input" value={exchangeRateForm.notes} onChange={(event) => updateForm(setExchangeRateForm, "notes", event.target.value)} placeholder="例如：2026 Q1 財務匯率" />
              </div>
              <div className="toolbar">
                <button className="button" type="submit" disabled={busyKey === "exchange-rate"}>{busyKey === "exchange-rate" ? "儲存中..." : (editingIds.exchangeRate ? "更新匯率" : "新增匯率")}</button>
                {editingIds.exchangeRate ? <button className="button-secondary" type="button" onClick={() => cancelEdit("exchangeRate", setExchangeRateForm, () => defaultExchangeRateForm(baseCurrency))}>取消編輯</button> : null}
              </div>
            </form>
          </div>
          <div className="list">
            {exchangeRates.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.source_currency} -> {item.target_currency} · {item.rate}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <button className="button-flat" onClick={() => beginEdit("exchangeRate", setExchangeRateForm, item, (row) => ({ source_currency: row.source_currency, target_currency: row.target_currency, rate: String(row.rate), effective_date: row.effective_date || "", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除匯率",
                      message: ui(`確定刪除 ${item.source_currency} -> ${item.target_currency} 的匯率嗎？`),
                      path: `/api/projects/${project.id}/exchange-rates/${item.id}`,
                      successMessage: "匯率已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{item.effective_date || "未填生效日"} {item.notes ? `· ${item.notes}` : ""}</div>
              </div>
            ))}
            {!exchangeRates.length ? <div className="empty-state">還沒有匯率資料，跨幣種金額將無法折算。</div> : null}
          </div>
          {Object.keys(summary.currency_breakdown || {}).length ? (
            <div className="list" style={{ marginTop: 14 }}>
              {Object.entries(summary.currency_breakdown).map(([currency, bucket]) => (
                <div key={currency} className="list-item">
                  <div className="title-row">
                    <strong>{currency}</strong>
                    <span className="tag brand">原始金額彙總</span>
                  </div>
                  <div className="subtext" style={{ marginTop: 6 }}>
                    {ui(`成本 ${formatMoney(bucket.cost, currency)} · 營收 ${formatMoney(bucket.sales, currency)} · 版稅 ${formatMoney(bucket.royalties, currency)}`)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>廣告合作專區</h2>
              <div className="subtext">集中管理廣告商、合作檔期、交付內容、簽約額與回款，這裡就是你的廣告台帳。</div>
            </div>
            <span className="tag brand">{ui(`${advertiserDeals.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitAdvertiserDeal}>
            <div className="split-layout">
              <div className="field">
                <label>廣告商</label>
                <input className="input" value={advertiserDealForm.advertiser_name} onChange={(event) => updateForm(setAdvertiserDealForm, "advertiser_name", event.target.value)} placeholder="品牌 / 廣告主" required />
              </div>
              <div className="field">
                <label>合作專案</label>
                <input className="input" value={advertiserDealForm.campaign_name} onChange={(event) => updateForm(setAdvertiserDealForm, "campaign_name", event.target.value)} placeholder="春季品牌合作 / 書內植入" required />
              </div>
            </div>
            <div className="split-layout">
              <div className="field">
                <label>聯絡人</label>
                <input className="input" value={advertiserDealForm.contact_name} onChange={(event) => updateForm(setAdvertiserDealForm, "contact_name", event.target.value)} placeholder="窗口姓名" />
              </div>
              <div className="field">
                <label>負責人</label>
                <input className="input" value={advertiserDealForm.owner_name} onChange={(event) => updateForm(setAdvertiserDealForm, "owner_name", event.target.value)} placeholder="內部 PM" />
              </div>
            </div>
            <div className="field">
              <label>交付內容</label>
              <input className="input" value={advertiserDealForm.deliverables} onChange={(event) => updateForm(setAdvertiserDealForm, "deliverables", event.target.value)} placeholder="片頭口播、書腰、聯名封面、投放頁" />
            </div>
            <div className="split-layout">
              <div className="field">
                <label>開始日期</label>
                <input className="input" type="date" value={advertiserDealForm.start_date} onChange={(event) => updateForm(setAdvertiserDealForm, "start_date", event.target.value)} />
              </div>
              <div className="field">
                <label>結束日期</label>
                <input className="input" type="date" value={advertiserDealForm.end_date} onChange={(event) => updateForm(setAdvertiserDealForm, "end_date", event.target.value)} />
              </div>
            </div>
            <div className="split-layout">
              <div className="field">
                <label>簽約金額</label>
                <input className="input" type="number" step="0.01" value={advertiserDealForm.contract_amount} onChange={(event) => updateForm(setAdvertiserDealForm, "contract_amount", event.target.value)} placeholder="0.00" />
              </div>
              <div className="field">
                <label>已回款</label>
                <input className="input" type="number" step="0.01" value={advertiserDealForm.settled_amount} onChange={(event) => updateForm(setAdvertiserDealForm, "settled_amount", event.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="split-layout">
              <div className="field">
                <label>幣別</label>
                <input className="input" value={advertiserDealForm.currency} onChange={(event) => updateForm(setAdvertiserDealForm, "currency", event.target.value.toUpperCase())} placeholder="CNY" />
              </div>
              <div className="field">
                <label>狀態</label>
                <select className="select" value={advertiserDealForm.status} onChange={(event) => updateForm(setAdvertiserDealForm, "status", event.target.value)}>
                  <option value="proposal">proposal</option>
                  <option value="negotiating">negotiating</option>
                  <option value="signed">signed</option>
                  <option value="running">running</option>
                  <option value="settled">settled</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>備註</label>
              <input className="input" value={advertiserDealForm.notes} onChange={(event) => updateForm(setAdvertiserDealForm, "notes", event.target.value)} placeholder="例如：需另附品牌审稿" />
            </div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "advertiserDeal"}>{busyKey === "advertiserDeal" ? "儲存中..." : (editingIds.advertiserDeal ? "更新廣告合作" : "新增廣告合作")}</button>
              {editingIds.advertiserDeal ? <button className="button-secondary" type="button" onClick={() => cancelEdit("advertiserDeal", setAdvertiserDealForm, defaultAdvertiserDealForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {advertiserDeals.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.advertiser_name} · {item.campaign_name}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className="tag warn">{ui(item.status)}</span>
                    <button className="button-flat" onClick={() => beginEdit("advertiserDeal", setAdvertiserDealForm, item, (row) => ({ advertiser_name: row.advertiser_name, campaign_name: row.campaign_name, contact_name: row.contact_name || "", deliverables: row.deliverables || "", start_date: row.start_date || "", end_date: row.end_date || "", contract_amount: String(row.contract_amount || ""), settled_amount: String(row.settled_amount || ""), currency: row.currency || "CNY", status: row.status || "proposal", owner_name: row.owner_name || "", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除廣告合作",
                      message: ui(`確定刪除 ${item.campaign_name} 這筆廣告合作嗎？`),
                      path: `/api/projects/${project.id}/advertiser-deals/${item.id}`,
                      successMessage: "廣告合作已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{ui(`${item.start_date || ui("未填開始")} 至 ${item.end_date || ui("未填結束")} · 負責 ${item.owner_name || ui("未指定")}`)}</div>
                <div className="subtext" style={{ marginTop: 6 }}>{ui(`簽約 ${formatMoney(item.contract_amount, item.currency)} · 已回款 ${formatMoney(item.settled_amount, item.currency)} · 未回款 ${formatMoney(item.pending_amount, item.currency)}`)}</div>
              </div>
            ))}
            {!advertiserDeals.length ? <div className="empty-state">還沒有廣告合作資料。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>權利與合同</h2>
              <div className="subtext">記錄作品是否取得有聲書、漫畫、海外版等權利。</div>
            </div>
            <span className="tag brand">{ui(`${rightsRecords.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitRights}>
            <div className="split-layout">
              <div className="field"><label>權利類型</label><input className="input" value={rightsForm.rights_type} onChange={(event) => updateForm(setRightsForm, "rights_type", event.target.value)} /></div>
              <div className="field"><label>權利持有人</label><input className="input" value={rightsForm.holder_name} onChange={(event) => updateForm(setRightsForm, "holder_name", event.target.value)} required /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>授權範圍</label><input className="input" value={rightsForm.grant_scope} onChange={(event) => updateForm(setRightsForm, "grant_scope", event.target.value)} /></div>
              <div className="field"><label>地區</label><input className="input" value={rightsForm.territory} onChange={(event) => updateForm(setRightsForm, "territory", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>語言</label><input className="input" value={rightsForm.license_language} onChange={(event) => updateForm(setRightsForm, "license_language", event.target.value)} /></div>
              <div className="field"><label>合同編號</label><input className="input" value={rightsForm.contract_code} onChange={(event) => updateForm(setRightsForm, "contract_code", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>開始日期</label><input className="input" type="date" value={rightsForm.start_date} onChange={(event) => updateForm(setRightsForm, "start_date", event.target.value)} /></div>
              <div className="field"><label>結束日期</label><input className="input" type="date" value={rightsForm.end_date} onChange={(event) => updateForm(setRightsForm, "end_date", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field">
                <label>狀態</label>
                <select className="select" value={rightsForm.status} onChange={(event) => updateForm(setRightsForm, "status", event.target.value)}>
                  <option value="active">active</option>
                  <option value="planning">planning</option>
                  <option value="pending">pending</option>
                  <option value="expired">expired</option>
                  <option value="terminated">terminated</option>
                </select>
              </div>
              <div className="field"><label>備註</label><input className="input" value={rightsForm.notes} onChange={(event) => updateForm(setRightsForm, "notes", event.target.value)} /></div>
            </div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "rights"}>{busyKey === "rights" ? "儲存中..." : (editingIds.rights ? "更新權利紀錄" : "新增權利紀錄")}</button>
              {editingIds.rights ? <button className="button-secondary" type="button" onClick={() => cancelEdit("rights", setRightsForm, defaultRightsForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {rightsRecords.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.rights_type} · {item.holder_name}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className={`tag ${item.is_active ? "success" : "warn"}`}>{ui(item.status)}</span>
                    <button className="button-flat" onClick={() => beginEdit("rights", setRightsForm, item, (row) => ({ rights_type: row.rights_type || "audiobook", holder_name: row.holder_name || "", grant_scope: row.grant_scope || "", territory: row.territory || "", license_language: row.license_language || "", contract_code: row.contract_code || "", start_date: row.start_date || "", end_date: row.end_date || "", status: row.status || "active", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除權利紀錄",
                      message: ui(`確定刪除 ${item.holder_name} 的權利紀錄嗎？`),
                      path: `/api/projects/${project.id}/rights-records/${item.id}`,
                      successMessage: "權利紀錄已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{item.grant_scope || "未填授權範圍"} · {item.territory || "未填地區"} · {item.license_language || "未填語言"}</div>
              </div>
            ))}
            {!rightsRecords.length ? <div className="empty-state">還沒有權利與合同資料。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>發行渠道</h2>
              <div className="subtext">追蹤上架平台、廣告商、館配或教育渠道。</div>
            </div>
            <span className="tag brand">{ui(`${channels.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitChannel}>
            <div className="split-layout">
              <div className="field"><label>渠道名稱</label><input className="input" value={channelForm.channel_name} onChange={(event) => updateForm(setChannelForm, "channel_name", event.target.value)} required /></div>
              <div className="field">
                <label>渠道類型</label>
                <select className="select" value={channelForm.channel_category} onChange={(event) => updateForm(setChannelForm, "channel_category", event.target.value)}>
                  <option value="retail">零售渠道</option>
                  <option value="advertiser">廣告商</option>
                  <option value="platform">平台合作</option>
                  <option value="library">圖書館</option>
                  <option value="education">教育機構</option>
                </select>
              </div>
            </div>
            <div className="split-layout">
              <div className="field"><label>格式</label><input className="input" value={channelForm.release_format} onChange={(event) => updateForm(setChannelForm, "release_format", event.target.value)} /></div>
              <div className="field">
                <label>狀態</label>
                <select className="select" value={channelForm.release_status} onChange={(event) => updateForm(setChannelForm, "release_status", event.target.value)}>
                  <option value="planning">planning</option>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="paused">paused</option>
                  <option value="delisted">delisted</option>
                </select>
              </div>
            </div>
            <div className="split-layout">
              <div className="field"><label>上架日期</label><input className="input" type="date" value={channelForm.release_date} onChange={(event) => updateForm(setChannelForm, "release_date", event.target.value)} /></div>
              <div className="field"><label>售價</label><input className="input" type="number" step="0.01" value={channelForm.price} onChange={(event) => updateForm(setChannelForm, "price", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>幣別</label><input className="input" value={channelForm.currency} onChange={(event) => updateForm(setChannelForm, "currency", event.target.value.toUpperCase())} /></div>
              <div className="field"><label>外部 SKU</label><input className="input" value={channelForm.external_sku} onChange={(event) => updateForm(setChannelForm, "external_sku", event.target.value)} /></div>
            </div>
            <div className="field"><label>備註</label><input className="input" value={channelForm.notes} onChange={(event) => updateForm(setChannelForm, "notes", event.target.value)} /></div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "channel"}>{busyKey === "channel" ? "儲存中..." : (editingIds.channel ? "更新發行渠道" : "新增發行渠道")}</button>
              {editingIds.channel ? <button className="button-secondary" type="button" onClick={() => cancelEdit("channel", setChannelForm, defaultChannelForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {channels.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.channel_name} · {item.release_format}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className={`tag ${item.channel_category === "advertiser" ? "warn" : "brand"}`}>{ui(item.channel_category)}</span>
                    <span className={`tag ${item.is_live ? "success" : "warn"}`}>{ui(item.release_status)}</span>
                    <button className="button-flat" onClick={() => beginEdit("channel", setChannelForm, item, (row) => ({ channel_name: row.channel_name || "", channel_category: row.channel_category || "retail", release_format: row.release_format || "audiobook", release_status: row.release_status || "planning", price: String(row.price || ""), currency: row.currency || "CNY", release_date: row.release_date || "", external_sku: row.external_sku || "", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除發行渠道",
                      message: ui(`確定刪除 ${item.channel_name} 的渠道資料嗎？`),
                      path: `/api/projects/${project.id}/distribution-channels/${item.id}`,
                      successMessage: "發行渠道已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{formatMoney(item.price, item.currency)} · {item.release_date || "未排上架日"} {item.external_sku ? `· ${item.external_sku}` : ""}</div>
              </div>
            ))}
            {!channels.length ? <div className="empty-state">還沒有發行渠道資料。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>成本核算</h2>
              <div className="subtext">補齊模型費、外包、審校、宣傳等成本。</div>
            </div>
            <span className="tag brand">{ui(`${costItems.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitCost}>
            <div className="split-layout">
              <div className="field"><label>成本類別</label><input className="input" value={costForm.category} onChange={(event) => updateForm(setCostForm, "category", event.target.value)} /></div>
              <div className="field"><label>供應商或來源</label><input className="input" value={costForm.vendor_name} onChange={(event) => updateForm(setCostForm, "vendor_name", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>金額</label><input className="input" type="number" step="0.01" value={costForm.amount} onChange={(event) => updateForm(setCostForm, "amount", event.target.value)} required /></div>
              <div className="field"><label>幣別</label><input className="input" value={costForm.currency} onChange={(event) => updateForm(setCostForm, "currency", event.target.value.toUpperCase())} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>發生日</label><input className="input" type="date" value={costForm.occurred_on} onChange={(event) => updateForm(setCostForm, "occurred_on", event.target.value)} /></div>
              <div className="field">
                <label>狀態</label>
                <select className="select" value={costForm.status} onChange={(event) => updateForm(setCostForm, "status", event.target.value)}>
                  <option value="booked">booked</option>
                  <option value="planned">planned</option>
                  <option value="paid">paid</option>
                </select>
              </div>
            </div>
            <div className="field"><label>說明</label><input className="input" value={costForm.description} onChange={(event) => updateForm(setCostForm, "description", event.target.value)} /></div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "cost"}>{busyKey === "cost" ? "儲存中..." : (editingIds.cost ? "更新成本項目" : "新增成本項目")}</button>
              {editingIds.cost ? <button className="button-secondary" type="button" onClick={() => cancelEdit("cost", setCostForm, defaultCostForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {costItems.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.category} · {formatMoney(item.amount, item.currency)}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className="tag">{ui(item.status)}</span>
                    <button className="button-flat" onClick={() => beginEdit("cost", setCostForm, item, (row) => ({ category: row.category || "production", vendor_name: row.vendor_name || "", description: row.description || "", amount: String(row.amount || ""), currency: row.currency || "CNY", occurred_on: row.occurred_on || "", status: row.status || "booked" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除成本項目",
                      message: ui(`確定刪除 ${item.category} 成本嗎？`),
                      path: `/api/projects/${project.id}/cost-items/${item.id}`,
                      successMessage: "成本項目已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{item.vendor_name || "未填來源"} · {item.occurred_on || "未填日期"}</div>
                {item.description ? <div className="subtext" style={{ marginTop: 6 }}>{item.description}</div> : null}
              </div>
            ))}
            {!costItems.length ? <div className="empty-state">還沒有成本項目。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>銷售回傳</h2>
              <div className="subtext">可記錄零售、廣告、館配或教育採購收入。</div>
            </div>
            <span className="tag brand">{ui(`${salesRecords.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitSales}>
            <div className="split-layout">
              <div className="field"><label>渠道名稱</label><input className="input" value={salesForm.channel_name} onChange={(event) => updateForm(setSalesForm, "channel_name", event.target.value)} required /></div>
              <div className="field">
                <label>收入類型</label>
                <select className="select" value={salesForm.channel_category} onChange={(event) => updateForm(setSalesForm, "channel_category", event.target.value)}>
                  <option value="retail">零售銷售</option>
                  <option value="advertiser">廣告 / 贊助</option>
                  <option value="platform">平台合作</option>
                  <option value="library">館配</option>
                  <option value="education">教育採購</option>
                </select>
              </div>
            </div>
            <div className="split-layout">
              <div className="field"><label>銷量</label><input className="input" type="number" step="1" value={salesForm.units_sold} onChange={(event) => updateForm(setSalesForm, "units_sold", event.target.value)} /></div>
              <div className="field"><label>期間開始</label><input className="input" type="date" value={salesForm.period_start} onChange={(event) => updateForm(setSalesForm, "period_start", event.target.value)} /></div>
              <div className="field"><label>期間結束</label><input className="input" type="date" value={salesForm.period_end} onChange={(event) => updateForm(setSalesForm, "period_end", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>毛營收</label><input className="input" type="number" step="0.01" value={salesForm.gross_revenue} onChange={(event) => updateForm(setSalesForm, "gross_revenue", event.target.value)} /></div>
              <div className="field"><label>退款</label><input className="input" type="number" step="0.01" value={salesForm.refunds} onChange={(event) => updateForm(setSalesForm, "refunds", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>淨營收</label><input className="input" type="number" step="0.01" value={salesForm.net_revenue} onChange={(event) => updateForm(setSalesForm, "net_revenue", event.target.value)} placeholder="留空則自動計算" /></div>
              <div className="field"><label>幣別</label><input className="input" value={salesForm.currency} onChange={(event) => updateForm(setSalesForm, "currency", event.target.value.toUpperCase())} /></div>
            </div>
            <div className="field"><label>備註</label><input className="input" value={salesForm.notes} onChange={(event) => updateForm(setSalesForm, "notes", event.target.value)} /></div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "sales"}>{busyKey === "sales" ? "儲存中..." : (editingIds.sales ? "更新銷售紀錄" : "新增銷售紀錄")}</button>
              {editingIds.sales ? <button className="button-secondary" type="button" onClick={() => cancelEdit("sales", setSalesForm, defaultSalesForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {salesRecords.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{ui(`${item.channel_name} · ${item.units_sold || 0} 份`)}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className={`tag ${item.channel_category === "advertiser" ? "warn" : "brand"}`}>{ui(item.channel_category)}</span>
                    <button className="button-flat" onClick={() => beginEdit("sales", setSalesForm, item, (row) => ({ channel_name: row.channel_name || "", channel_category: row.channel_category || "retail", period_start: row.period_start || "", period_end: row.period_end || "", units_sold: String(row.units_sold || ""), gross_revenue: String(row.gross_revenue || ""), refunds: String(row.refunds || ""), net_revenue: String(row.net_revenue || ""), currency: row.currency || "CNY", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除銷售紀錄",
                      message: ui(`確定刪除 ${item.channel_name} 的銷售資料嗎？`),
                      path: `/api/projects/${project.id}/sales-records/${item.id}`,
                      successMessage: "銷售紀錄已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{ui(`${item.period_start || ui("未填開始")} 至 ${item.period_end || ui("未填結束")} · 淨營收 ${formatMoney(item.net_revenue, item.currency)}`)}</div>
              </div>
            ))}
            {!salesRecords.length ? <div className="empty-state">還沒有銷售回傳資料。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>版稅與分成</h2>
              <div className="subtext">管理作者、配音、畫師等合作方應付金額。</div>
            </div>
            <span className="tag brand">{ui(`${royaltyStatements.length} 筆`)}</span>
          </div>
          <form className="form-grid" onSubmit={submitRoyalty}>
            <div className="split-layout">
              <div className="field"><label>收款對象</label><input className="input" value={royaltyForm.payee_name} onChange={(event) => updateForm(setRoyaltyForm, "payee_name", event.target.value)} required /></div>
              <div className="field"><label>角色</label><input className="input" value={royaltyForm.role_name} onChange={(event) => updateForm(setRoyaltyForm, "role_name", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>計算基礎</label><input className="input" value={royaltyForm.basis} onChange={(event) => updateForm(setRoyaltyForm, "basis", event.target.value)} /></div>
              <div className="field"><label>比例 %</label><input className="input" type="number" step="0.01" value={royaltyForm.rate_percent} onChange={(event) => updateForm(setRoyaltyForm, "rate_percent", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>應付金額</label><input className="input" type="number" step="0.01" value={royaltyForm.amount_due} onChange={(event) => updateForm(setRoyaltyForm, "amount_due", event.target.value)} /></div>
              <div className="field"><label>幣別</label><input className="input" value={royaltyForm.currency} onChange={(event) => updateForm(setRoyaltyForm, "currency", event.target.value.toUpperCase())} /></div>
            </div>
            <div className="split-layout">
              <div className="field"><label>期間開始</label><input className="input" type="date" value={royaltyForm.period_start} onChange={(event) => updateForm(setRoyaltyForm, "period_start", event.target.value)} /></div>
              <div className="field"><label>期間結束</label><input className="input" type="date" value={royaltyForm.period_end} onChange={(event) => updateForm(setRoyaltyForm, "period_end", event.target.value)} /></div>
            </div>
            <div className="split-layout">
              <div className="field">
                <label>狀態</label>
                <select className="select" value={royaltyForm.status} onChange={(event) => updateForm(setRoyaltyForm, "status", event.target.value)}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="paid">paid</option>
                </select>
              </div>
              <div className="field"><label>備註</label><input className="input" value={royaltyForm.notes} onChange={(event) => updateForm(setRoyaltyForm, "notes", event.target.value)} /></div>
            </div>
            <div className="toolbar">
              <button className="button" type="submit" disabled={busyKey === "royalty"}>{busyKey === "royalty" ? "儲存中..." : (editingIds.royalty ? "更新版稅紀錄" : "新增版稅紀錄")}</button>
              {editingIds.royalty ? <button className="button-secondary" type="button" onClick={() => cancelEdit("royalty", setRoyaltyForm, defaultRoyaltyForm)}>取消編輯</button> : null}
            </div>
          </form>
          <div className="list">
            {royaltyStatements.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.payee_name} · {formatMoney(item.amount_due, item.currency)}</strong>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <span className="tag">{ui(item.status)}</span>
                    <button className="button-flat" onClick={() => beginEdit("royalty", setRoyaltyForm, item, (row) => ({ payee_name: row.payee_name || "", role_name: row.role_name || "", basis: row.basis || "net_revenue", rate_percent: String(row.rate_percent || ""), amount_due: String(row.amount_due || ""), currency: row.currency || "CNY", period_start: row.period_start || "", period_end: row.period_end || "", status: row.status || "pending", notes: row.notes || "" }))}>編輯</button>
                    <button className="button-flat-danger" onClick={() => confirmDelete({
                      title: "刪除版稅紀錄",
                      message: ui(`確定刪除 ${item.payee_name} 的版稅資料嗎？`),
                      path: `/api/projects/${project.id}/royalty-statements/${item.id}`,
                      successMessage: "版稅紀錄已刪除。",
                    })}>刪除</button>
                  </div>
                </div>
                <div className="subtext">{ui(`${item.role_name || ui("未填角色")} · ${item.basis ? ui(item.basis) : ui("未填基礎")} · ${item.rate_percent || 0}%`)}</div>
              </div>
            ))}
            {!royaltyStatements.length ? <div className="empty-state">還沒有版稅與分成資料。</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>經營報表</h2>
              <div className="subtext">匯出 ZIP，內含經營總覽 HTML、JSON 與各類 CSV，可直接交給財務或商務同事。</div>
            </div>
            <span className="tag brand">{ui(`${businessReports.length} 筆`)}</span>
          </div>
          <div className="toolbar">
            <button className="button" onClick={exportBusinessReport} disabled={busyKey === "business-report"}>
              {busyKey === "business-report" ? "匯出中..." : "立即匯出報表 ZIP"}
            </button>
          </div>
          <div className="list">
            {businessReports.map((item) => (
              <div key={item.id} className="list-item">
                <div className="title-row">
                  <strong>{item.file_name || item.report_type}</strong>
                  <span className="tag brand">{relativeTime(item.created_at)}</span>
                </div>
                <div className="subtext" style={{ marginTop: 6 }}>{item.report_type}</div>
                {item.file_url ? (
                  <a className="button-secondary" href={item.file_url} download style={{ display: "inline-flex", marginTop: 10 }}>
                    下載報表 ZIP
                  </a>
                ) : null}
              </div>
            ))}
            {!businessReports.length ? <div className="empty-state">還沒有經營報表匯出紀錄。</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function TextPrepPage({ user, token, project, selectedChapter, selectedChapterId, setSelectedChapterId, segments, voices, characters, jobs, refreshProject, requestConfirm, showFlash }) {
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [segmentBusyAction, setSegmentBusyAction] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [detectionBusy, setDetectionBusy] = useState(false);
  const [autoBindBusy, setAutoBindBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [showChapterComposer, setShowChapterComposer] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterBody, setNewChapterBody] = useState("");
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
  const canManageProject = hasPermission(user, "project_manage");
  const canManageText = hasPermission(user, "text_manage");
  const defaultVoice = voices.find((voice) => String(voice.id) === String(project?.default_voice_profile_id || ""));

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
    setShowChapterComposer(false);
    setNewChapterTitle("");
    setNewChapterBody("");
    setChapterBusy(false);
  }, [project?.id]);

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

  async function createManualChapter() {
    if (!project) return;
    if (!newChapterTitle.trim()) {
      showFlash("error", "請先輸入章節標題。");
      return;
    }
    if (!newChapterBody.trim()) {
      showFlash("error", "請先貼上章節內容。");
      return;
    }
    setChapterBusy(true);
    try {
      const payload = await apiFetch(`/api/projects/${project.id}/chapters`, {
        method: "POST",
        token,
        body: {
          title: newChapterTitle.trim(),
          body: newChapterBody,
        },
      });
      const createdChapterId = payload.chapter?.id || payload.chapter_id || null;
      setShowChapterComposer(false);
      setNewChapterTitle("");
      setNewChapterBody("");
      await refreshProject({ projectId: project.id, chapterId: createdChapterId });
      if (createdChapterId) {
        setSelectedChapterId(createdChapterId);
      }
      showFlash("success", "新章節已建立，已接入後續生成與審核流程。");
    } catch (error) {
      showFlash("error", error.message || "新增章節失敗。");
    } finally {
      setChapterBusy(false);
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
            <div className="subtext">可整書匯入，也可手動新增自訂章節。</div>
          </div>
          {canManageText ? (
            <button className="button-secondary" onClick={() => setShowChapterComposer((current) => !current)}>
              {showChapterComposer ? "收起章節表單" : "手動新增章節"}
            </button>
          ) : null}
        </div>
        {showChapterComposer ? (
          <div className="grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>章節標題</label>
              <input
                className="input"
                placeholder="例如：西游记第一章 石猴出世"
                value={newChapterTitle}
                onChange={(event) => setNewChapterTitle(event.target.value)}
              />
            </div>
            <div className="field">
              <label>章節內容</label>
              <textarea
                className="textarea"
                rows={8}
                placeholder="把這一章的完整內容直接貼進來，儲存後會自動拆成段落。"
                value={newChapterBody}
                onChange={(event) => setNewChapterBody(event.target.value)}
              />
            </div>
            <div className="toolbar">
              <button className="button" disabled={chapterBusy} onClick={createManualChapter}>
                {chapterBusy ? "建立中..." : "建立章節"}
              </button>
              <div className="subtext">建立後會自動進入目前專案，和既有生成、審核、出版流程完全一致。</div>
            </div>
          </div>
        ) : null}
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
          {canManageProject ? (
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
          ) : (
            <div className="subtext">
              專案預設聲線：{defaultVoice ? `${defaultVoice.name} / ${defaultVoice.provider} / ${defaultVoice.model}` : "尚未設定"}
            </div>
          )}
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
            <div className="subtext">匯出 zip，內含章節 render、manifest 與完整整書 TXT。</div>
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
          {project?.source_book_url ? (
            <a className="button-secondary" href={project.source_book_url} download={project.source_book_name || "source_book.txt"}>
              下載整書 TXT
            </a>
          ) : null}
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

function EbookWizardModal({ open, mode = "paste", project, token, onClose, refreshProject, showFlash }) {
  const locale = normalizeLocale(ACTIVE_LOCALE);
  const ui = (text) => translateLiteral(text, locale);
  const [activeMode, setActiveMode] = useState(mode);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [notice, setNotice] = useState(null);
  const pasteInputRef = useRef(null);
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setActiveMode(mode || "paste");
    setManualBusy(false);
    setManualTitle("");
    setManualBody("");
    setNotice(null);
  }, [open, mode, project?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !project?.id) return undefined;
    const target = activeMode === "manual" ? manualInputRef.current : pasteInputRef.current;
    const timerId = window.setTimeout(() => {
      target?.focus();
    }, 80);
    return () => window.clearTimeout(timerId);
  }, [open, activeMode, project?.id]);

  if (!open) return null;

  const chapterList = project?.chapters || [];
  const chapterCount = project?.metrics?.chapter_count || chapterList.length || 0;
  const segmentCount = project?.metrics?.segment_count || 0;
  const reviewCount = project?.metrics?.review_required_count || 0;
  const approvedCount = project?.metrics?.approved_count || 0;
  const sourceBookName = project?.source_book_name || "source_book.txt";

  async function createManualChapter() {
    if (!project?.id) return;
    if (!manualTitle.trim()) {
      setNotice({ type: "error", message: ui("請先輸入章節標題。") });
      return;
    }
    if (!manualBody.trim()) {
      setNotice({ type: "error", message: ui("請先貼上章節內容。") });
      return;
    }
    setManualBusy(true);
    setNotice(null);
    try {
      const payload = await apiFetch(`/api/projects/${project.id}/chapters`, {
        method: "POST",
        token,
        body: {
          title: manualTitle.trim(),
          body: manualBody,
        },
      });
      setManualTitle("");
      setManualBody("");
      setNotice({ type: "success", message: ui("新章節已建立，右側章節地圖已同步更新。") });
      await refreshProject({ projectId: project.id, chapterId: payload.chapter_id || payload.chapter?.id || null });
      showFlash("success", ui("新章節已建立。"));
      window.setTimeout(() => manualInputRef.current?.focus(), 60);
    } catch (error) {
      const message = error.message || ui("新增章節失敗。");
      setNotice({ type: "error", message });
      showFlash("error", message);
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div className="modal-backdrop ebook-wizard-backdrop" onClick={() => onClose?.()}>
      <div className="modal-card ebook-wizard-card" onClick={(event) => event.stopPropagation()}>
        <div className="ebook-wizard-header">
          <div>
            <div className="eyebrow">E-Book Builder</div>
            <h2>新建電子書向導</h2>
            <div className="subtext">
              {project?.title
                ? ui(`正在編輯「${project.title}」。在這裡直接貼整本內容，或手動逐章建立。`)
                : ui("正在載入專案資料，稍候即可開始導入內容。")}
            </div>
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            {project ? <span className="tag brand">{project.author || ui("未填作者")} · {project.language}</span> : null}
            <button className="button-secondary" onClick={onClose}>關閉向導</button>
          </div>
        </div>

        <div className="ebook-wizard-body">
          <section className="ebook-wizard-main">
            <div className="wizard-hero ebook-wizard-hero">
              <div className="wizard-step-row">
                <div className="wizard-step">
                  <strong>1</strong>
                  <span>選擇導入方式：整本拆章或逐章新增</span>
                </div>
                <div className="wizard-step">
                  <strong>2</strong>
                  <span>保存後自動寫入完整整書 TXT 與章節資料</span>
                </div>
                <div className="wizard-step">
                  <strong>3</strong>
                  <span>接著就能進語音生成、審核、渲染與出版</span>
                </div>
              </div>
              <div className="ebook-wizard-mode-row">
                <button
                  className={`ebook-wizard-mode ${activeMode === "paste" ? "active" : ""}`}
                  onClick={() => setActiveMode("paste")}
                >
                  <strong>方式 A：貼整本並拆章</strong>
                  <span>推薦。一次貼完整電子書內容，系統自動識別章節標題並切段。</span>
                </button>
                <button
                  className={`ebook-wizard-mode ${activeMode === "manual" ? "active" : ""}`}
                  onClick={() => setActiveMode("manual")}
                >
                  <strong>方式 B：手動新增單章</strong>
                  <span>適合從 Word、PDF、網頁逐章複製貼上，例如「西游记第一章」。</span>
                </button>
              </div>
            </div>

            {notice ? <div className={`flash ${notice.type}`}>{notice.message}</div> : null}

            <div className="ebook-wizard-stage">
              {project?.id ? (
                activeMode === "paste" ? (
                  <div className="wizard-card ebook-wizard-stage-card">
                    <div className="panel-head">
                      <div>
                        <h3>整本電子書匯入</h3>
                        <div className="subtext">把整本內容直接貼進文本框，按下 `貼上並拆章`。支援 `西游记第一章`、`第二章节`、`第一回`，也支援 `# 章節標題`。</div>
                      </div>
                      <span className="tag success">推薦</span>
                    </div>
                    <ImportInline
                      token={token}
                      project={project}
                      pasteFirst
                      emphasizeWizard
                      pasteInputRef={pasteInputRef}
                      onDone={async () => {
                        await refreshProject({ projectId: project.id });
                        setNotice({ type: "success", message: ui("整本內容已匯入完成，章節與段落都已建立。") });
                        showFlash("success", ui("整本內容已匯入完成。"));
                      }}
                      showFlash={(type, message) => {
                        setNotice({ type, message });
                        showFlash(type, message);
                      }}
                    />
                  </div>
                ) : (
                  <div className="wizard-card ebook-wizard-stage-card">
                    <div className="panel-head">
                      <div>
                        <h3>手動新增章節</h3>
                        <div className="subtext">先填章節標題，再貼這一章正文。儲存後會自動切成段落，並同步寫回整書 TXT。</div>
                      </div>
                      <span className="tag warn">逐章模式</span>
                    </div>
                    <div className="ebook-wizard-highlights">
                      <div className="ebook-wizard-highlight">
                        <strong>標題可自訂</strong>
                        <span>例如：西游记第一章、第二章节、第一回 石猴出世。</span>
                      </div>
                      <div className="ebook-wizard-highlight">
                        <strong>支援複製貼上</strong>
                        <span>可以直接從 Word、PDF 或網站複製整章正文貼進來。</span>
                      </div>
                      <div className="ebook-wizard-highlight">
                        <strong>沿用現有流程</strong>
                        <span>建立完成後直接走語音生成、審核、出版，不需要另接流程。</span>
                      </div>
                    </div>
                    <div className="ebook-wizard-form">
                      <div className="field">
                        <label>章節標題</label>
                        <input
                          ref={manualInputRef}
                          className="input"
                          placeholder="例如：西游记第一章 石猴出世"
                          value={manualTitle}
                          onChange={(event) => setManualTitle(event.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>章節內容</label>
                        <textarea
                          className="textarea xl"
                          placeholder="把這一章正文直接貼進來。保存後會自動切段，並更新整書 TXT。"
                          value={manualBody}
                          onChange={(event) => setManualBody(event.target.value)}
                        />
                      </div>
                      <div className="toolbar">
                        <button className="button" disabled={manualBusy} onClick={createManualChapter}>
                          {manualBusy ? "建立中..." : "建立章節"}
                        </button>
                        <button
                          className="button-secondary"
                          disabled={manualBusy}
                          onClick={() => {
                            setManualTitle("");
                            setManualBody("");
                            setNotice(null);
                            window.setTimeout(() => manualInputRef.current?.focus(), 60);
                          }}
                        >
                          清空表單
                        </button>
                        <div className="subtext">建立成功後，右側章節地圖會立刻更新。</div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="empty-state">專案資料載入中。若你是從專案列表點進來，稍候一下就可以直接開始。</div>
              )}
            </div>
          </section>

          <aside className="ebook-wizard-side">
            <div className="wizard-card ebook-wizard-side-card">
              <div className="panel-head">
                <div>
                  <h3>目前專案</h3>
                  <div className="subtext">向導內所有動作都會直接保存到這個專案。</div>
                </div>
                <span className="tag brand">{statusLabel(project?.status) || "草稿"}</span>
              </div>
              <div className="metrics ebook-wizard-metrics">
                <div className="metric">
                  <div className="eyebrow">章節</div>
                  <strong>{chapterCount}</strong>
                </div>
                <div className="metric">
                  <div className="eyebrow">段落</div>
                  <strong>{segmentCount}</strong>
                </div>
                <div className="metric">
                  <div className="eyebrow">待審核</div>
                  <strong>{reviewCount}</strong>
                </div>
                <div className="metric">
                  <div className="eyebrow">已通過</div>
                  <strong>{approvedCount}</strong>
                </div>
              </div>
              {project?.source_book_url ? (
                <div className="ebook-wizard-download">
                  <div>
                    <strong>完整電子書 TXT 已保存</strong>
                    <div className="subtext">{sourceBookName}</div>
                  </div>
                  <a className="button-secondary" href={project.source_book_url} download={sourceBookName}>
                    下載整書 TXT
                  </a>
                </div>
              ) : (
                <div className="empty-state">還沒有完整整書 TXT。你一旦匯入整本或新增章節，這裡就會出現下載按鈕。</div>
              )}
            </div>

            <div className="wizard-card ebook-wizard-side-card">
              <div className="panel-head">
                <div>
                  <h3>章節地圖</h3>
                  <div className="subtext">保存成功後，這裡會立即顯示最新章節。</div>
                </div>
                <span className="tag">{ui(`${chapterCount} 章`)}</span>
              </div>
              {chapterList.length ? (
                <div className="list ebook-wizard-chapter-list">
                  {chapterList.map((chapter) => (
                    <div key={chapter.id} className="list-item">
                      <div className="title-row">
                        <strong>{chapter.order_index}. {chapter.title}</strong>
                      </div>
                      <div className="pill-row" style={{ marginTop: 10 }}>
                        <span className="tag">{chapter.segment_count} 段</span>
                        <span className="tag success">{ui(`${chapter.approved_count} 已通過`)}</span>
                        <span className="tag warn">{ui(`${chapter.review_count} 待審核`)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : chapterCount > 0 ? (
                <div className="empty-state">章節統計已存在，詳細章節清單正在載入。</div>
              ) : (
                <div className="empty-state">還沒有章節。你可以先從左側選擇一種方式開始建立內容。</div>
              )}
            </div>

            <div className="wizard-card ebook-wizard-side-card">
              <div className="panel-head">
                <div>
                  <h3>下一步怎麼做</h3>
                  <div className="subtext">內容進來後，不需要另外配置新流程。</div>
                </div>
              </div>
              <div className="ebook-wizard-checklist">
                <div className="ebook-wizard-check">1. 到語音生成頁送出本章或整章任務。</div>
                <div className="ebook-wizard-check">2. 到審核頁聽音並處理待審核段落。</div>
                <div className="ebook-wizard-check">3. 到出版頁渲染章節並匯出 ZIP。</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ImportInline({ token, project, onDone, showFlash, pasteFirst = false, emphasizeWizard = false, pasteInputRef = null }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localPath, setLocalPath] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualFileName, setManualFileName] = useState("source_book.txt");
  const inputRef = useRef(null);

  function handleFiles(fileList) {
    const nextFile = fileList?.[0] || null;
    setFile(nextFile);
    setDragActive(false);
  }

  const dropzoneSection = (
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
  );

  const localPathSection = (
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
                await onDone?.();
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
  );

  const pasteSection = (
      <div className={`field ${emphasizeWizard ? "wizard-paste-field" : ""}`}>
        <label>或直接貼上整本內容，自動拆成章節</label>
        <div className="grid" style={{ gap: 10 }}>
          <input
            className="input"
            placeholder="source_book.txt"
            value={manualFileName}
            onChange={(event) => setManualFileName(event.target.value)}
          />
          <textarea
            ref={pasteInputRef}
            className="textarea"
            rows={10}
            placeholder={"可直接貼入整本電子書內容。\n支援標題格式如：西游记第一章、第二章节、第一回，或用 # 章節標題 來分章。"}
            value={manualText}
            onChange={(event) => setManualText(event.target.value)}
          />
          <div className="toolbar">
            <button
              className="button-secondary"
              disabled={!manualText.trim() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await apiFetch(`/api/projects/${project.id}/import-paste`, {
                    method: "POST",
                    token,
                    body: {
                      text: manualText,
                      filename: manualFileName.trim() || "source_book.txt",
                    },
                  });
                  setFile(null);
                  setLocalPath("");
                  setManualText("");
                  await onDone?.();
                } catch (error) {
                  showFlash("error", error.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "匯入中..." : "貼上並拆章"}
            </button>
            {project?.source_book_url ? (
              <a className="button-secondary" href={project.source_book_url} download={project.source_book_name || "source_book.txt"}>
                下載目前整書 TXT
              </a>
            ) : null}
          </div>
          <div className="subtext">系統會把內容保存為完整整書 TXT，並建立章節與段落，後續可直接進入語音生成、審核與匯出。</div>
        </div>
      </div>
  );

  return (
    <div className={`toolbar import-toolbar ${emphasizeWizard ? "import-toolbar-wizard" : ""}`}>
      {pasteFirst ? pasteSection : dropzoneSection}
      {pasteFirst ? dropzoneSection : localPathSection}
      {pasteFirst ? localPathSection : pasteSection}
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
          await onDone?.();
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
