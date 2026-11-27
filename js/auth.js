// ================= Wayfinder: sign in + first-time setup =================
const G_LOGO = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function preLang() { return Store.raw("wf_lang", "English"); }

function showAuth() {
  const box = $("#auth");
  box.classList.remove("hidden");
  setLanguage(preLang());
  const saved = Accounts.list().filter(a => a.type !== "guest").sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 3);
  box.innerHTML = `
  <div class="auth stagger">
    <div class="row between">
      <span></span>
      <button class="chip" id="auLang">${icon("globe", 16)}<span data-notr>${esc((LANGS.find(l => l.id === preLang()) || LANGS[0]).native)}</span></button>
    </div>
    <div class="top">
      <img src="icons/logo.png" alt="Wayfinder logo" class="logo-img">
      <div class="brand">Wayfinder</div>
      <p class="slogan">Find your way to every answer</p>
    </div>
    ${saved.length ? `<div class="stack"><span class="list-label" style="margin:0 4px">Continue as</span><div class="list">${saved.map(a => `
      <button class="li" data-acc="${a.id}"><div class="avatar" style="width:38px;height:38px">${a.photo ? `<img src="${esc(a.photo)}" alt="">` : esc((a.name || "S").charAt(0).toUpperCase())}</div>
      <div class="t"><b data-notr>${esc(a.name)}</b><span data-notr>${esc(a.type === "google" ? a.email || "Google" : "@" + a.username)}</span></div>${icon("chevR", 18, "chev")}</button>`).join("")}</div></div>` : ""}
    <button class="btn lg block google-btn" id="auGoogle">${G_LOGO}Continue with Google</button>
    <div class="divider">or use a username</div>
    <form id="auForm" class="stack" autocomplete="on">
      <div class="field hidden" id="auNameF"><label for="auName">Your name</label><input type="text" id="auName" maxlength="30" placeholder="e.g. Keerthan" autocomplete="name"></div>
      <div class="field"><label for="auUser">Username</label><div class="input-icon">${icon("user", 18)}<input type="text" id="auUser" placeholder="username" autocomplete="username" autocapitalize="none" spellcheck="false"></div></div>
      <div class="field"><label for="auPass">Password</label><div class="input-icon">${icon("lock", 18)}<input type="password" id="auPass" placeholder="At least 6 characters" autocomplete="current-password"></div></div>
      <p class="err hidden" id="auErr"></p>
      <button class="btn lg block" type="submit" id="auSubmit">Sign in</button>
    </form>
    <p class="center small"><span id="auSwapTxt" class="muted">New to Wayfinder?</span> <button class="link-btn" id="auSwap">Create account</button></p>
    <button class="btn ghost block" id="auGuest">${icon("compass", 18)}Explore as a guest</button>
    <p class="center tiny muted" style="margin-top:6px">Your study data stays private on this phone.</p>
  </div>`;
  let mode = "login";
  const err = (m) => { const e = $("#auErr"); e.textContent = m; e.classList.toggle("hidden", !m); };
  $("#auSwap").onclick = () => {
    mode = mode === "login" ? "register" : "login";
    $("#auNameF").classList.toggle("hidden", mode === "login");
    $("#auSubmit").textContent = mode === "login" ? T("Sign in") : T("Create account");
    $("#auSwap").textContent = mode === "login" ? T("Create account") : T("Sign in");
    $("#auSwapTxt").textContent = mode === "login" ? T("New to Wayfinder?") : T("Already have an account?");
    $("#auPass").autocomplete = mode === "login" ? "current-password" : "new-password";
    err("");
  };
  $("#auForm").onsubmit = async (e) => {
    e.preventDefault(); err("");
    const u = $("#auUser").value, p = $("#auPass").value;
    try {
      if (mode === "login") await Accounts.login(u, p);
      else await Accounts.register(u, p, $("#auName").value.trim());
      afterLogin();
    } catch (ex) { err(ex.message); sfx("bad"); }
  };
  $("#auGuest").onclick = () => { Accounts.guest(); afterLogin(); };
  $("#auGoogle").onclick = googleSignIn;
  $("#auLang").onclick = () => pickLanguage(preLang(), l => { Store.setRaw("wf_lang", l); showAuth(); });
  $$("[data-acc]", box).forEach(b => b.onclick = () => {
    const a = Accounts.list().find(x => x.id === b.dataset.acc);
    if (a.type === "google") { Accounts.use(a); afterLogin(); }
    else { $("#auUser").value = a.username; $("#auPass").focus(); toast(T("Enter your password"), "lock"); }
  });
}

function pickLanguage(cur, done) {
  openSheet('<h3>Choose language</h3><p class="muted small" style="margin:4px 0 14px">The whole app and the AI will use this language.</p><div class="list">' +
    LANGS.map(l => `<button class="li" data-l="${l.id}"><div class="it sm">${icon("languages", 18)}</div><div class="t"><b data-notr>${l.native}</b><span data-notr>${l.id}</span></div>${l.id === cur ? icon("checkc", 20) : ""}</button>`).join("") + "</div>",
    s => $$("[data-l]", s).forEach(b => b.onclick = () => { closeSheet(); done(b.dataset.l); }));
}

async function googleSignIn() {
  await loadConfig();
  if (!CONFIG.firebase) { toast(T("Google sign-in isn't set up yet. Use a username for now."), "info", 4500); return; }
  try {
    await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
    if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const r = await firebase.auth().signInWithPopup(provider);
      Accounts.google(r.user); afterLogin();
    } catch (e) {
      if (/popup/i.test(e.code || "")) await firebase.auth().signInWithRedirect(provider);
      else throw e;
    }
  } catch (e) {
    toast(T("Google sign-in failed: ") + (e.code || e.message), "alert", 5000);
  }
}
async function checkGoogleRedirect() {
  if (!CONFIG.firebase || Store.pid()) return false;
  try {
    await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
    if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
    const r = await firebase.auth().getRedirectResult();
    if (r && r.user) { Accounts.google(r.user); return true; }
  } catch (e) {}
  return false;
}

function afterLogin() {
  $("#auth").classList.add("hidden");
  $("#auth").innerHTML = "";
  const acc = Accounts.current();
  const p = getProfile();
  if (!p.name && acc) p.name = acc.name === "Guest" ? "" : acc.name;
  if (!Store.get("profile", null)) p.language = preLang();
  Store.set("profile", p);
  applyAppearance();
  setLanguage(p.language);
  if (!p.onboarded) startOnboarding(); else bootApp();
}

// ---------- First-time setup: 4 quick steps ----------
function startOnboarding() {
  const box = $("#onboard");
  box.classList.remove("hidden");
  const p = getProfile();
  let step = 0;
  const steps = [
    () => `<h2>Which language do you like?</h2><p class="muted" style="margin:6px 0 16px">Menus, buttons and the AI tutor will all use it. You can change it any time in Settings.</p>
      <div class="list">${LANGS.map(l => `<button class="li" data-l="${l.id}"><div class="it sm">${icon("languages", 18)}</div><div class="t"><b data-notr>${l.native}</b><span data-notr>${l.id}</span></div><span class="lc">${l.id === p.language ? icon("checkc", 20) : ""}</span></button>`).join("")}</div>`,
    () => `<h2>Tell us about you</h2><p class="muted" style="margin:6px 0 16px">So Wayfinder follows your exact syllabus.</p>
      <div class="stack"><div class="field"><label for="obName">Your name</label><input type="text" id="obName" maxlength="30" value="${esc(p.name)}" placeholder="Your name" data-notr></div>
      <span class="label">Class</span><div class="chips" id="obGrade">${chipsHTML(CLASSES)}</div>
      <span class="label">Board</span><div class="chips" id="obBoard">${chipsHTML(BOARDS)}</div><p class="err hidden" id="obErr">Please type your name.</p></div>`,
    () => `<h2>Your subjects</h2><p class="muted" style="margin:6px 0 16px">Pick the subjects you study. Wayfinder loads the NCERT chapters for each.</p>
      <div class="chips" id="obSubs">${chipsHTML(ALL_SUBJECTS.map(s => ({ v: s, l: icon(subjIcon(s), 16) + s })))}</div>`,
    () => `<h2>How should I teach you?</h2><p class="muted" style="margin:6px 0 16px">You can switch any time in the chat.</p>
      <div class="list" id="obMode">${[["Socratic", "compass", "Guide me with questions", "Best for real understanding"], ["Hints first", "lightbulb", "Give hints, then the answer", "Good for homework"], ["Direct", "zap", "Explain fully straight away", "Good for quick revision"]].map(m => `<button class="li" data-m="${m[0]}"><div class="it">${icon(m[1], 20)}</div><div class="t"><b>${m[2]}</b><span>${m[3]}</span></div><span class="lc"></span></button>`).join("")}</div>
      <span class="label" style="display:block;margin-top:18px">Daily goal</span><div class="seg" id="obGoal" style="margin-top:8px"><button data-v="30">Light · 30 XP</button><button data-v="50">Steady · 50 XP</button><button data-v="100">Serious · 100 XP</button></div>`
  ];
  const paint = () => {
    box.innerHTML = `<div class="auth"><div class="row between"><button class="back-btn ${step ? "" : "hidden"}" id="obBack" aria-label="Back">${icon("back", 20)}</button><div class="ob-dots">${steps.map((s, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div><span style="width:42px"></span></div>
      <div class="ob-step stack-lg" style="margin-top:12px">${steps[step]()}</div>
      <div style="flex:1"></div><button class="btn lg block" id="obNext">${step === steps.length - 1 ? T("Let's go") : T("Continue")}</button></div>`;
    if (step === 0) $$("[data-l]", box).forEach(b => b.onclick = () => { p.language = b.dataset.l; Store.set("profile", p); setLanguage(p.language); paint(); });
    if (step === 1) { p._g = wireChips($("#obGrade", box), p.grade); p._b = wireChips($("#obBoard", box), p.board); }
    if (step === 2) p._s = wireChips($("#obSubs", box), p.subjects, true);
    if (step === 3) {
      const paintM = () => $$("[data-m]", box).forEach(b => { $(".lc", b).innerHTML = b.dataset.m === p.teachMode ? icon("checkc", 20) : ""; b.style.background = b.dataset.m === p.teachMode ? "var(--primary-soft)" : ""; });
      $$("[data-m]", box).forEach(b => b.onclick = () => { p.teachMode = b.dataset.m; paintM(); });
      paintM(); p._goal = wireSeg($("#obGoal", box), String(p.dailyGoal));
    }
    $("#obBack", box).onclick = () => { step--; paint(); };
    $("#obNext", box).onclick = () => {
      if (step === 1) {
        const n = $("#obName", box).value.trim();
        if (!n) { $("#obErr", box).classList.remove("hidden"); $("#obName", box).focus(); return; }
        p.name = n; p.grade = p._g(); p.board = p._b();
      }
      if (step === 2) { const s = p._s(); p.subjects = s.length ? s : ["Maths", "Science", "English"]; }
      if (step === 3) p.dailyGoal = parseInt(p._goal());
      if (step < steps.length - 1) { step++; paint(); return; }
      ["_g", "_b", "_s", "_goal"].forEach(k => delete p[k]);
      p.onboarded = true;
      Store.set("profile", p);
      const acc = Accounts.current(); if (acc && acc.type !== "google") { acc.name = p.name; Accounts.use(acc); }
      box.classList.add("hidden"); box.innerHTML = "";
      confetti();
      bootApp();
      toast(T("Welcome, {n}! Let's find your way.", { n: p.name }), "compass");
    };
  };
  paint();
}
