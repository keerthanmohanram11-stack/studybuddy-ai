// ================= Settings: everything saves instantly =================
function sw(id, on) { return `<input type="checkbox" id="${id}" ${on ? "checked" : ""}><span class="track"></span>`; }
function row(ic, c, title, sub, right, attrs) { return `<${attrs && attrs.startsWith("label") ? "label" : "button"} class="li ${attrs && attrs.startsWith("label") ? "switch" : ""}" ${attrs && !attrs.startsWith("label") ? attrs : ""}><div class="it sm ${c}">${icon(ic, 17)}</div><div class="t"><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</div>${right || icon("chevR", 18, "chev")}</${attrs && attrs.startsWith("label") ? "label" : "button"}>`; }

view("settings", {
  html: () => `
    ${ph("Settings", "Make Wayfinder yours")}
    <div class="card row" style="gap:14px"><div class="avatar lg" id="stAv"></div><div class="grow"><h3 id="stName" data-notr></h3><p class="small muted" id="stSub" data-notr></p><p class="tiny muted" id="stInfo"></p></div><button class="btn sm secondary" id="stEdit">${icon("edit", 15)}Edit</button></div>
    <div class="grid3" id="stMini"></div>

    <span class="list-label">Learning</span>
    <div class="list">
      ${row("compass", "", "Teaching style", "How the tutor explains", "", 'id="stTeach"')}
      ${row("bot", "c-violet", "Default AI helper", "", "", 'id="stHelper"')}
      ${row("type", "c-sky", "Answer length", "", "", 'id="stLen"')}
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm c-amber">${icon("target", 17)}</div><div class="t"><b>Daily XP goal</b></div><b class="bold" id="stGoalV"></b></div><input type="range" id="stGoal" min="10" max="200" step="10"></div>
      ${row("book2", "c-green", "Follow NCERT syllabus", "Answers match your class textbooks", sw("stNcert"), "label")}
    </div>

    <span class="list-label">AI</span>
    <div class="list">
      ${row("brain", "", "AI brain", "", "", 'id="stBrain"')}
      ${row("globe", "c-sky", "Web search by default", "Answers with sources", sw("stWeb"), "label")}
      ${row("activity", "c-green", "AI status", "Check which AIs are connected", "", 'id="stStatus"')}
    </div>

    <span class="list-label">Language and voice</span>
    <div class="list">
      ${row("languages", "c-teal", "App language", "Menus, buttons and AI answers", "", 'id="stLang"')}
      ${row("volume", "c-coral", "Voice", "Choose who reads answers aloud", "", 'id="stVoice"')}
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm c-slate">${icon("gauge", 17)}</div><div class="t"><b>Voice speed</b></div><b class="bold" id="stRateV"></b></div><input type="range" id="stRate" min="0.6" max="1.6" step="0.1"></div>
      ${row("headphones", "c-violet", "Read answers aloud", "Automatically in chats", sw("stRead"), "label")}
    </div>

    <span class="list-label">Appearance</span>
    <div class="list">
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm">${icon("sun", 17)}</div><div class="t"><b>Theme</b></div></div><div class="seg" id="stTheme"><button data-v="light">${icon("sun", 15)} Light</button><button data-v="dark">${icon("moon", 15)} Dark</button><button data-v="system">${icon("phone", 15)} Auto</button></div></div>
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm c-coral">${icon("palette", 17)}</div><div class="t"><b>Accent colour</b></div></div><div class="row" id="stAccent" style="gap:12px"></div></div>
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm c-sky">${icon("type", 17)}</div><div class="t"><b>Text size</b></div><span style="font-family:var(--font-head);font-weight:800" id="stFsV">Aa</span></div><div class="row"><span class="tiny">A</span><input type="range" id="stFs" min="0.85" max="1.3" step="0.05"><span style="font-size:1.2rem;font-weight:700">A</span></div></div>
      ${row("waves", "c-teal", "Moving background", "Soft animated colours", sw("stBg"), "label")}
      ${row("sparkles", "c-amber", "Floating motivation", "Gentle words drifting in the background", sw("stFloat"), "label")}
      ${row("zap", "c-violet", "Reduce motion", "Fewer animations", sw("stMotion"), "label")}
      ${row("eye", "c-slate", "High contrast", "Stronger text and borders", sw("stContrast"), "label")}
      ${row("feather", "c-green", "Easy-read spacing", "Extra letter and line spacing", sw("stReadable"), "label")}
    </div>

    <span class="list-label">Focus</span>
    <div class="list">
      ${row("timer", "c-green", "Focus and break length", "", "", 'id="stFocus"')}
      ${row("lock", "c-red", "Focus lock", "Full screen + leave alerts", sw("stLock"), "label")}
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row"><div class="it sm c-amber">${icon("alert", 17)}</div><div class="t"><b>Tree wilts if you leave for</b></div></div><div class="seg" id="stLeave"><button data-v="10">10 s</button><button data-v="15">15 s</button><button data-v="30">30 s</button><button data-v="60">1 min</button></div></div>
      ${row("music", "c-violet", "Focus sound", "", "", 'id="stSound"')}
      ${row("eye", "c-sky", "Eye-break reminders", "Every 30 minutes", sw("stBreak"), "label")}
      ${row("bell", "c-coral", "Sound effects", "Correct, wrong and win sounds", sw("stSfx"), "label")}
      ${row("phone", "c-slate", "Vibration", "", sw("stHap"), "label")}
    </div>

    <span class="list-label" id="stParentL">Parent controls</span>
    <div class="list">
      ${row("shield", "c-slate", "Parent dashboard", "PIN-protected activity", "", 'id="stParent"')}
      ${row("key", "c-amber", "Parent PIN", "", "", 'id="stPin"')}
      ${row("mail", "c-sky", "Email alerts to parent", "", "", 'id="stEmail"')}
    </div>

    <span class="list-label">Account and data</span>
    <div class="list">
      ${row("users", "", "Switch account", "", "", 'id="stSwitch"')}
      ${row("download", "c-green", "Back up my data", "Download a file", "", 'id="stExport"')}
      ${row("upload", "c-sky", "Restore from backup", "", "", 'id="stImport"')}
      ${row("refresh", "c-amber", "Reset progress", "XP, scores, badges", "", 'id="stReset"')}
      ${row("logout", "c-red", "Sign out", "", "", 'id="stOut"')}
    </div>
    <input type="file" id="stFile" accept="application/json" class="hidden">

    <span class="list-label">About</span>
    <div class="list">
      ${row("info", "c-slate", "About Wayfinder", "Version 3.0 · made by Keerthan and team", "", 'id="stAbout"')}
      ${row("shield", "c-green", "Privacy and safety", "", "", 'id="stPrivacy"')}
    </div>
    <p class="center tiny muted" style="margin:8px 0 20px">Wayfinder · Find your way to every answer</p>`,
  init(el) {
    const self = this;
    const bindSwitch = (id, key, invert) => { const c = $("#" + id, el); c.checked = invert ? !getProfile()[key] : !!getProfile()[key]; c.onchange = () => setPref(key, invert ? !c.checked : c.checked); };
    bindSwitch("stNcert", "ncert"); bindSwitch("stWeb", "webSearch"); bindSwitch("stRead", "autoRead"); bindSwitch("stBg", "bgAnim"); bindSwitch("stFloat", "floaters");
    bindSwitch("stLock", "focusLock"); bindSwitch("stBreak", "breakReminder"); bindSwitch("stSfx", "sfx"); bindSwitch("stHap", "haptics"); bindSwitch("stReadable", "readable");
    $("#stMotion", el).checked = getProfile().motion === "reduced"; $("#stMotion", el).onchange = e => setPref("motion", e.target.checked ? "reduced" : "full");
    $("#stContrast", el).checked = getProfile().contrast === "high"; $("#stContrast", el).onchange = e => setPref("contrast", e.target.checked ? "high" : "normal");
    $("#stFloat", el).addEventListener("change", () => startFloaters());
    const g = $("#stGoal", el); g.value = getProfile().dailyGoal; rangeFill(g); $("#stGoalV", el).textContent = g.value + " XP";
    g.oninput = () => $("#stGoalV", el).textContent = g.value + " XP"; g.onchange = () => setPref("dailyGoal", +g.value);
    const r = $("#stRate", el); r.value = getProfile().voiceRate; rangeFill(r); $("#stRateV", el).textContent = r.value + "×";
    r.oninput = () => $("#stRateV", el).textContent = r.value + "×"; r.onchange = () => { setPref("voiceRate", +r.value); speak(T("This is how fast I'll read.")); };
    const fs = $("#stFs", el); fs.value = getProfile().textSize; rangeFill(fs);
    fs.oninput = () => document.documentElement.style.setProperty("--fs", fs.value); fs.onchange = () => setPref("textSize", +fs.value);
    wireSeg($("#stTheme", el), getProfile().theme, v => setPref("theme", v));
    wireSeg($("#stLeave", el), String(getProfile().leaveSecs), v => setPref("leaveSecs", +v));
    const accents = [["indigo", "#4F46E5"], ["teal", "#0D9488"], ["violet", "#7C3AED"], ["rose", "#E11D48"], ["emerald", "#059669"]];
    $("#stAccent", el).innerHTML = accents.map(a => `<button class="color-dot" data-a="${a[0]}" style="background:${a[1]}" aria-label="${a[0]}"></button>`).join("");
    const paintAcc = () => $$("[data-a]", el).forEach(b => b.classList.toggle("on", b.dataset.a === getProfile().accent));
    $$("[data-a]", el).forEach(b => b.onclick = () => { setPref("accent", b.dataset.a); paintAcc(); }); paintAcc();

    $("#stEdit", el).onclick = () => editProfile(() => self.show(el));
    $("#stTeach", el).onclick = () => choiceSheet(T("Teaching style"), [["Socratic", T("Guides with questions until you get it")], ["Hints first", T("Hints first, full answer when asked")], ["Direct", T("Explains fully straight away")]], getProfile().teachMode, v => { setPref("teachMode", v); self.show(el); });
    $("#stHelper", el).onclick = () => choiceSheet(T("Default AI helper"), HELPERS.map(h => [h.id, h.desc, h.name]), getProfile().helper, v => { setPref("helper", v); self.show(el); });
    $("#stLen", el).onclick = () => choiceSheet(T("Answer length"), [["short", T("Short and quick")], ["normal", T("Balanced")], ["detailed", T("Detailed with examples")]], getProfile().answerLength, v => { setPref("answerLength", v); self.show(el); });
    $("#stBrain", el).onclick = () => choiceSheet(T("AI brain"), BRAINS.map(b => [b.id, b.desc, b.name]), getProfile().brain, v => { setPref("brain", v); self.show(el); });
    $("#stStatus", el).onclick = async () => { await loadConfig(); const a = CONFIG.ai || {}; const okk = v => v ? `<span class="tag green">${icon("check", 12)} ${T("Connected")}</span>` : `<span class="tag">${T("Not set up")}</span>`;
      openSheet(`<h3>${T("AI status")}</h3><div class="list" style="margin-top:12px">${[["Groq (Llama)", a.groq], ["Google Gemini", a.gemini], ["OpenRouter backup", a.openrouter], ["Google sign-in", !!CONFIG.firebase], ["Parent email alerts", !!CONFIG.emailjs], ["YouTube search", !!CONFIG.youtube]].map(x => `<div class="li"><div class="t"><b>${x[0]}</b></div>${okk(x[1])}</div>`).join("")}</div><p class="tiny muted" style="margin-top:10px">${T("Keys are added in Vercel. See the setup guide.")}</p>`); };
    $("#stLang", el).onclick = () => pickLanguage(getProfile().language, l => { setPref("language", l); Store.setRaw("wf_lang", l); self.show(el); toast(T("Language changed"), "languages"); });
    $("#stVoice", el).onclick = () => voiceSheet(() => self.show(el));
    $("#stFocus", el).onclick = () => go("focus");
    $("#stSound", el).onclick = () => soundSheet();
    const pinGate = (fn) => { const p = getProfile(); if (!p.parentPin) return fn(); openSheet(`<h3>${T("Parent PIN")}</h3><input type="password" inputmode="numeric" maxlength="4" id="pgP" placeholder="••••" style="letter-spacing:.5em;text-align:center;font-size:1.4rem;margin-top:12px">`, s => { $("#pgP", s).focus(); $("#pgP", s).oninput = e => { if (e.target.value.length === 4) { if (e.target.value === p.parentPin) { closeSheet(); setTimeout(fn, 250); } else { toast(T("Wrong PIN")); e.target.value = ""; } } }; }); };
    $("#stParent", el).onclick = () => go("parent");
    $("#stPin", el).onclick = () => pinGate(() => openSheet(`<h3>${T("Set a 4-digit parent PIN")}</h3><input type="password" inputmode="numeric" maxlength="4" id="npP" placeholder="••••" style="letter-spacing:.5em;text-align:center;font-size:1.4rem;margin:12px 0"><button class="btn block" id="npS">${T("Save PIN")}</button>`, s => { $("#npS", s).onclick = () => { const v = $("#npP", s).value; if (!/^\d{4}$/.test(v)) return toast(T("Use 4 digits")); setPref("parentPin", v); closeSheet(); self.show(el); }; }));
    $("#stEmail", el).onclick = () => pinGate(() => { const p = getProfile(); openSheet(`<h3>${T("Email alerts to parent")}</h3><p class="small muted" style="margin:4px 0 12px">${T("When the student leaves Wayfinder during a focus session, an email is sent (at most one every 10 minutes).")}</p>
      ${CONFIG.emailjs ? "" : `<div class="feedback" style="background:var(--warning-soft);color:var(--warning-text);margin-bottom:12px">${T("Email service isn't connected yet. Follow the EmailJS steps in the setup guide.")}</div>`}
      <div class="field"><label for="peE">${T("Parent's email")}</label><input type="email" id="peE" value="${esc(p.parentEmail)}" placeholder="parent@example.com" data-notr></div>
      <label class="switch" style="margin:14px 0"><input type="checkbox" id="peOn" ${p.parentAlerts ? "checked" : ""}><span class="track"></span><span class="small">${T("Send alerts")}</span></label>
      <div class="grid2"><button class="btn ghost" id="peT">${T("Send test")}</button><button class="btn" id="peS">${T("Save")}</button></div>`, s => {
        $("#peS", s).onclick = () => { const q = getProfile(); q.parentEmail = $("#peE", s).value.trim(); q.parentAlerts = $("#peOn", s).checked; saveProfile(q); closeSheet(); self.show(el); };
        $("#peT", s).onclick = async () => { const q = getProfile(); q.parentEmail = $("#peE", s).value.trim(); saveProfile(q, true); Store.set("lastEmail", 0); await loadConfig(); const ok = await emailParent("Wayfinder test email", "This is a test alert from Wayfinder. Alerts are working."); toast(ok ? T("Test email sent") : T("Couldn't send. Check the email setup."), ok ? "mail" : "alert"); };
      }); });
    $("#stSwitch", el).onclick = () => { const list = Accounts.list(); openSheet(`<h3>${T("Accounts on this phone")}</h3><div class="list" style="margin-top:12px">${list.map(a => `<button class="li" data-ac="${a.id}"><div class="avatar" style="width:36px;height:36px">${a.photo ? `<img src="${esc(a.photo)}" alt="">` : esc((a.name || "S").charAt(0))}</div><div class="t"><b data-notr>${esc(a.name)}</b><span data-notr>${esc(a.type === "google" ? a.email || "Google" : a.type === "guest" ? T("Guest") : "@" + a.username)}</span></div>${a.id === Store.pid() ? icon("checkc", 20) : ""}</button>`).join("")}</div><button class="btn ghost block" id="acAdd" style="margin-top:12px">${icon("plus", 16)}${T("Add another account")}</button>`, s => {
      $$("[data-ac]", s).forEach(b => b.onclick = () => { if (b.dataset.ac === Store.pid()) return closeSheet(); Focus.stop("ended"); Store.setRaw("wf_current", b.dataset.ac); location.hash = "home"; location.reload(); });
      $("#acAdd", s).onclick = () => { Focus.stop("ended"); localStorage.removeItem("wf_current"); location.hash = ""; location.reload(); };
    }); };
    $("#stExport", el).onclick = () => { const pre = "wf_" + Store.pid() + "_", data = {}; Object.keys(localStorage).filter(k => k.startsWith(pre)).forEach(k => data[k.slice(pre.length)] = localStorage.getItem(k)); const blob = new Blob([JSON.stringify({ app: "wayfinder", v: 3, date: dayKey(), data })], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "wayfinder-backup-" + dayKey() + ".json"; a.click(); toast(T("Backup downloaded"), "download"); };
    $("#stImport", el).onclick = () => $("#stFile", el).click();
    $("#stFile", el).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (j.app !== "wayfinder") throw 0; if (!(await askSheet(T("Restore this backup?"), T("It replaces the data on this account."), T("Restore")))) return; const pre = "wf_" + Store.pid() + "_"; Object.entries(j.data).forEach(([k, v]) => localStorage.setItem(pre + k, v)); location.reload(); } catch (err) { toast(T("That isn't a Wayfinder backup file")); } };
    $("#stReset", el).onclick = async () => { if (await askSheet(T("Reset all progress?"), T("XP, streaks, scores, badges and mistakes are deleted. Notes and chats stay."), T("Reset"), true)) { ["stats", "mastery", "badges", "mistakes", "record", "daily", "planDone", "focusStats", "coach", "last"].forEach(k => Store.del(k)); toast(T("Progress reset"), "refresh"); self.show(el); } };
    $("#stOut", el).onclick = async () => { if (await askSheet(T("Sign out?"), T("Your data stays saved on this phone."), T("Sign out"))) { Focus.stop("ended"); Accounts.logout(); } };
    $("#stAbout", el).onclick = () => openSheet(`<div class="center stack" style="align-items:center"><img src="icons/logo.png" alt="" style="width:80px;height:80px;border-radius:50%"><h2>Wayfinder</h2><p class="muted">${T("Find your way to every answer")}</p><p class="small">${T("Version 3.0 · made by Keerthan and team for Spark Programming Stars")}</p></div>
      <div class="list" style="margin-top:14px">${[["Groq · Llama 3.3", T("Fast tutor chat, quizzes, flashcards")], ["Google Gemini", T("Photos, PDFs, YouTube videos, web search, translation")], ["OpenRouter", T("Free backup AI")]].map(x => `<div class="li"><div class="it sm">${icon("sparkles", 16)}</div><div class="t"><b>${x[0]}</b><span>${x[1]}</span></div></div>`).join("")}</div>`);
    $("#stPrivacy", el).onclick = () => openSheet(`<h3>${T("Privacy and safety")}</h3><div class="stack" style="margin-top:12px">${[["lock", T("Your notes, scores and chats are saved only on this phone. No ads, no tracking.")], ["shield", T("The AI is told it is talking to a child and refuses unsafe topics. Worrying messages get a helpline instead of an AI answer.")], ["sparkles", T("Every AI answer is labelled. AI can make mistakes, so check important facts with your textbook or teacher.")], ["users", T("Parents can see focus activity in the PIN-protected dashboard.")]].map(x => `<div class="row" style="align-items:flex-start;gap:12px"><div class="it sm">${icon(x[0], 16)}</div><p class="small">${x[1]}</p></div>`).join("")}</div>`);
  },
  show(el, params) {
    const p = getProfile(), acc = Accounts.current() || {}, s = getStats();
    $("#stAv", el).innerHTML = acc.photo ? `<img src="${esc(acc.photo)}" alt="">` : esc((p.name || "S").charAt(0).toUpperCase());
    $("#stName", el).textContent = p.name || T("Student");
    $("#stSub", el).textContent = acc.type === "google" ? acc.email || "Google" : acc.type === "guest" ? T("Guest (data on this phone)") : "@" + (acc.username || "");
    $("#stInfo", el).textContent = p.grade + " · " + p.board + " · " + p.subjects.length + " " + T("subjects");
    $("#stMini", el).innerHTML = [[T("Level"), levelInfo(s.xp).level], [T("Streak"), streakNow()], [T("Badges"), Object.values(Store.get("badges", {})).reduce((a, b) => a + b, 0)]].map(x => `<div class="stat center"><span class="v">${x[1]}</span><span class="k" style="justify-content:center">${x[0]}</span></div>`).join("");
    const setVal = (id, v) => { const b = $("#" + id, el); let val = $(".val", b); if (!val) { val = document.createElement("span"); val.className = "val"; b.insertBefore(val, b.lastElementChild); } val.textContent = v; };
    setVal("stTeach", T(p.teachMode)); setVal("stHelper", T(helperById(p.helper).name)); setVal("stLen", T({ short: "Short", normal: "Balanced", detailed: "Detailed" }[p.answerLength]));
    setVal("stBrain", T((BRAINS.find(b => b.id === p.brain) || BRAINS[0]).name)); setVal("stLang", (LANGS.find(l => l.id === p.language) || LANGS[0]).native);
    const v = bestVoice(); setVal("stVoice", v ? v.name.slice(0, 18) : T("Default")); setVal("stFocus", p.focusMins + " / " + p.breakMins + " min");
    setVal("stSound", T((SOUNDS.find(x => x.id === p.sound) || { name: "Off" }).name)); setVal("stPin", p.parentPin ? T("Set") : T("Not set")); setVal("stEmail", p.parentEmail ? T("On") : T("Off"));
    if (params && params.get("open") === "parent") setTimeout(() => $("#stParentL", el).scrollIntoView({ behavior: "smooth" }), 100);
  }
});
function choiceSheet(title, opts, cur, done) {
  openSheet(`<h3>${title}</h3><div class="list" style="margin-top:12px">${opts.map(o => `<button class="li" data-v="${esc(o[0])}"><div class="t"><b>${esc(T(o[2] || o[0]))}</b><span>${esc(o[1])}</span></div>${o[0] === cur ? icon("checkc", 20) : ""}</button>`).join("")}</div>`, s => $$("[data-v]", s).forEach(b => b.onclick = () => { closeSheet(); done(b.dataset.v); }));
}
function voiceSheet(done) {
  const p = getProfile(), code = langCode(p.language).slice(0, 2), vs = loadVoices();
  const mine = vs.filter(v => (v.lang || "").toLowerCase().startsWith(code)), others = vs.filter(v => !mine.includes(v) && /^en/i.test(v.lang));
  const item = v => `<button class="li" data-v="${esc(v.name)}"><div class="it sm c-coral">${icon("volume", 16)}</div><div class="t"><b data-notr>${esc(v.name)}</b><span data-notr>${esc(v.lang)}${/google|natural|neural/i.test(v.name) ? " · ✨" : ""}</span></div>${p.voiceName === v.name ? icon("checkc", 20) : ""}</button>`;
  openSheet(`<h3>${T("Choose a voice")}</h3><p class="muted small" style="margin:4px 0 12px">${T("Tap a voice to hear it. Voices come from your phone; more can be added in Android Settings > Text-to-speech.")}</p>
    <button class="li" data-v="" style="border:1px solid var(--border);border-radius:14px;margin-bottom:10px"><div class="it sm">${icon("sparkles", 16)}</div><div class="t"><b>${T("Best voice automatically")}</b></div>${!p.voiceName ? icon("checkc", 20) : ""}</button>
    ${mine.length ? `<div class="list">${mine.map(item).join("")}</div>` : `<p class="small muted">${T("No voices for this language on this phone.")}</p>`}
    ${others.length && code !== "en" ? `<span class="list-label" style="display:block;margin:14px 4px 8px">English</span><div class="list">${others.slice(0, 8).map(item).join("")}</div>` : ""}
    <div class="range-row" style="margin-top:14px"><span class="label">${T("Pitch")}</span><input type="range" id="vpP" min="0.6" max="1.5" step="0.1" value="${p.voicePitch}"></div>`, s => {
    rangeFill($("#vpP", s)); $("#vpP", s).onchange = e => { setPref("voicePitch", +e.target.value); speak(T("Hi! I'm your Wayfinder voice.")); };
    $$("[data-v]", s).forEach(b => b.onclick = () => { setPref("voiceName", b.dataset.v); speak(T("Hi! I'm your Wayfinder voice.")); $$("[data-v]", s).forEach(x => { const c = x.querySelector(".ico:last-child"); }); done && done(); setTimeout(() => voiceSheet(done), 50); });
  });
}
function editProfile(done) {
  const p = getProfile();
  openSheet(`<h3>${T("Edit profile")}</h3><div class="stack" style="margin-top:12px"><div class="field"><label for="epN">${T("Name")}</label><input type="text" id="epN" value="${esc(p.name)}" maxlength="30" data-notr></div>
    <span class="label">${T("Class")}</span><div class="chips" id="epG">${chipsHTML(CLASSES)}</div><span class="label">${T("Board")}</span><div class="chips" id="epB">${chipsHTML(BOARDS)}</div>
    <span class="label">${T("Subjects")}</span><div class="chips" id="epS">${chipsHTML(ALL_SUBJECTS)}</div><button class="btn block lg" id="epSave">${T("Save")}</button></div>`, s => {
    const gG = wireChips($("#epG", s), p.grade), gB = wireChips($("#epB", s), p.board), gS = wireChips($("#epS", s), p.subjects, true);
    $("#epSave", s).onclick = () => { const q = getProfile(); q.name = $("#epN", s).value.trim() || q.name; q.grade = gG(); q.board = gB(); q.subjects = gS().length ? gS() : q.subjects; saveProfile(q); const a = Accounts.current(); if (a && a.type !== "google") { a.name = q.name; Accounts.use(a); } closeSheet(); done && done(); };
  });
}
