// ================= Wayfinder: core engine (used by every screen) =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function dayKey(offset = 0, from) {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() - offset);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dateOf(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function daysUntil(key) { return Math.round((dateOf(key) - dateOf(dayKey())) / 86400000); }
function fmtDay(key, opts) { return dateOf(key).toLocaleDateString(langCode(getProfile().language), opts || { day: "numeric", month: "short" }); }
function fmtMins(m) { m = Math.round(m || 0); return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60 ? (m % 60) + "m" : ""); }
function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return T("just now");
  if (m < 60) return T("{n} min ago", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return T("{n} h ago", { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? T("yesterday") : T("{n} days ago", { n: d });
}

// ---------- Storage: every account has its own data ----------
const Store = {
  raw(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
  setRaw(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast(T("Phone storage is full. Delete some notes or old data.")); return false; } },
  pid() { return Store.raw("wf_current", null); },
  get(k, f) { return Store.raw("wf_" + Store.pid() + "_" + k, f); },
  set(k, v) { return Store.setRaw("wf_" + Store.pid() + "_" + k, v); },
  del(k) { localStorage.removeItem("wf_" + Store.pid() + "_" + k); }
};

// ---------- Accounts: username + password, Google, or guest ----------
async function hashPass(pass, salt) {
  const data = new TextEncoder().encode(salt + ":" + pass);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0; for (const b of data) h = (h * 31 + b) >>> 0; return "x" + h.toString(16);
}
const Accounts = {
  list() { return Store.raw("wf_accounts", []); },
  save(list) { Store.setRaw("wf_accounts", list); },
  current() { const id = Store.pid(); return Accounts.list().find(a => a.id === id) || null; },
  use(acc) { Store.setRaw("wf_current", acc.id); acc.last = Date.now(); Accounts.save(Accounts.list().map(a => a.id === acc.id ? acc : a)); },
  async register(username, password, name) {
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) throw new Error(T("Username: 3-20 letters, numbers, _ or ."));
    if (password.length < 6) throw new Error(T("Password must be at least 6 characters."));
    const list = Accounts.list();
    if (list.some(a => a.username === username)) throw new Error(T("That username is taken on this phone."));
    const salt = uid();
    const acc = { id: "u_" + uid(), type: "local", username, name: name || username, salt, hash: await hashPass(password, salt), created: Date.now() };
    list.push(acc); Accounts.save(list); Accounts.use(acc);
    return acc;
  },
  async login(username, password) {
    const acc = Accounts.list().find(a => a.username === username.trim().toLowerCase());
    if (!acc) throw new Error(T("No account with that username on this phone."));
    if (await hashPass(password, acc.salt) !== acc.hash) throw new Error(T("Wrong password. Try again."));
    Accounts.use(acc); return acc;
  },
  google(user) {
    const list = Accounts.list();
    let acc = list.find(a => a.id === "g_" + user.uid);
    if (!acc) { acc = { id: "g_" + user.uid, type: "google", name: user.displayName || "Student", email: user.email, photo: user.photoURL, created: Date.now() }; list.push(acc); Accounts.save(list); }
    else { acc.photo = user.photoURL; acc.name = acc.name || user.displayName; }
    Accounts.use(acc); return acc;
  },
  guest() {
    const list = Accounts.list();
    let acc = list.find(a => a.type === "guest");
    if (!acc) { acc = { id: "guest", type: "guest", name: "Guest", created: Date.now() }; list.push(acc); Accounts.save(list); }
    Accounts.use(acc); return acc;
  },
  logout() { localStorage.removeItem("wf_current"); try { if (window.firebase && firebase.auth) firebase.auth().signOut(); } catch (e) {} location.hash = ""; location.reload(); },
  remove(id) { Object.keys(localStorage).filter(k => k.startsWith("wf_" + id + "_")).forEach(k => localStorage.removeItem(k)); Accounts.save(Accounts.list().filter(a => a.id !== id)); }
};

// ---------- Profile and preferences ----------
const DEFAULT_PROFILE = {
  name: "", grade: "Class 8", board: "CBSE", subjects: ["Maths", "Science", "English", "Social Science"], language: "English",
  theme: "light", accent: "indigo", textSize: 1, motion: "full", bgAnim: true, floaters: true, contrast: "normal", readable: false,
  helper: "tutor", teachMode: "Socratic", answerLength: "normal", brain: "auto", webSearch: false, ncert: true,
  dailyGoal: 50, focusMins: 25, breakMins: 5, focusLock: true, leaveSecs: 15, sound: "none", soundVol: 0.5,
  voiceName: "", voiceRate: 1, voicePitch: 1, autoRead: false, sfx: true, haptics: true, breakReminder: true,
  parentPin: "", parentEmail: "", parentAlerts: true, onboarded: false
};
function getProfile() { return Object.assign({}, DEFAULT_PROFILE, Store.get("profile", {})); }
function saveProfile(p, silent) {
  const before = Store.get("profile", {}).language;
  Store.set("profile", p);
  applyAppearance();
  if (p.language !== (before || "English")) { setLanguage(p.language); if (typeof startFloaters === "function") startFloaters(); }
  if (!silent) savedTick();
}
function setPref(key, value) { const p = getProfile(); p[key] = value; saveProfile(p); }
let savedTimer;
function savedTick() {
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => toast(T("Saved"), "check", 1200), 250);
}

// ---------- Appearance ----------
function applyAppearance() {
  const p = getProfile(), r = document.documentElement;
  const dark = p.theme === "dark" || (p.theme === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  r.dataset.theme = dark ? "dark" : "light";
  r.dataset.accent = p.accent || "indigo";
  r.dataset.contrast = p.contrast;
  r.dataset.readable = p.readable ? "1" : "0";
  r.style.setProperty("--fs", p.textSize || 1);
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = dark ? "#0E0F1E" : "#F7F7FB";
  if (document.body) {
    document.body.classList.toggle("reduce-motion", p.motion === "reduced");
    document.body.classList.toggle("lite", !p.bgAnim);
    const f = $("#floaters"); if (f) f.style.display = p.floaters && p.bgAnim ? "" : "none";
  }
}

// ---------- Server config (Firebase, EmailJS, YouTube) ----------
let CONFIG = Store.raw("wf_config", {});
async function loadConfig() {
  try { const r = await fetch("/api/config"); if (r.ok) { CONFIG = await r.json(); Store.setRaw("wf_config", CONFIG); } } catch (e) {}
  return CONFIG;
}

// ---------- AI ----------
function systemPrompt(extra, opts = {}) {
  const p = getProfile();
  const lang = p.language;
  const len = { short: "Keep answers short: 2-5 sentences or a few bullet points.", normal: "Use short paragraphs and bullet points.", detailed: "Give detailed, thorough explanations with examples." }[p.answerLength] || "";
  return [
    "You are Wayfinder, an AI study guide for an Indian school student.",
    "Student: " + (p.name || "the student") + ", " + p.grade + ", " + p.board + " board. Subjects: " + p.subjects.join(", ") + ".",
    p.ncert ? "Follow the latest NCERT textbooks and syllabus for this class, and use NCERT terms and examples." : "",
    "LANGUAGE RULE: Reply ONLY in " + lang + (lang === "English" ? "" : " (use " + lang + " script; keep technical terms, formulas and numbers clear)") + ", even if earlier messages in the conversation are in another language.",
    len,
    "Write maths plainly (x², 3/4, √9). Do not use LaTeX. Use **bold** for key words.",
    "Be warm and encouraging. If you are not sure about a fact, say so. Never invent sources.",
    opts.memory === false ? "" : learnerMemory(),
    extra || ""
  ].filter(Boolean).join(" ");
}
async function ai(prompt, opts = {}) {
  if (!navigator.onLine) throw new Error(T("You're offline. Connect to the internet to use the AI."));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.video ? 90000 : 50000);
  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({
        prompt, system: opts.plain ? "You are a precise translation and formatting engine. Follow the instructions exactly." : systemPrompt(opts.extra, opts),
        image: opts.image || null, file: opts.file || null, video: opts.video || null,
        json: !!opts.json, search: !!opts.search, model: opts.model || getProfile().brain, task: opts.task || "", check: opts.check || ""
      })
    });
    let data;
    try { data = await res.json(); } catch (e) { throw new Error(T("The AI server didn't answer. Please try again.")); }
    if (!res.ok) throw new Error(data.reply || T("Something went wrong"));
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error(T("That took too long. Please try again."));
    throw e;
  } finally { clearTimeout(timer); }
}
async function aiText(prompt, opts) { return (await ai(prompt, opts)).reply; }
async function aiJSON(prompt, opts) {
  const text = await aiText(prompt, Object.assign({}, opts, { json: true }));
  const clean = String(text).replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch (e) {
    const m = clean.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
    throw new Error(T("The AI sent a messy answer. Please try again."));
  }
}
function loadingHTML(text) { return '<div class="loading"><span class="typing"><i></i><i></i><i></i></span><span>' + esc(text || T(pick(LOADING_LINES))) + "</span></div>"; }

// Safe mini-markdown for AI answers
function md(src) {
  const blocks = [];
  let t = esc(src).replace(/```(\w*)\n?([\s\S]*?)```/g, (m, l, c) => { blocks.push("<pre><code>" + c + "</code></pre>"); return "\u0000" + (blocks.length - 1) + "\u0000"; });
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = t.split("\n"); const out = []; let list = null, table = [];
  const flushTable = () => { if (!table.length) return; const rows = table.filter(r => !/^\|?\s*:?-{2,}/.test(r)); out.push("<table>" + rows.map((r, i) => "<tr>" + r.replace(/^\||\|$/g, "").split("|").map(c => (i ? "<td>" : "<th>") + inline(c.trim()) + (i ? "</td>" : "</th>")).join("") + "</tr>").join("") + "</table>"); table = []; };
  const closeList = () => { if (list) { out.push("</" + list + ">"); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(l)) { closeList(); table.push(l.trim()); continue; } else flushTable();
    let m;
    if ((m = l.match(/^\s*#{1,4}\s+(.*)/))) { closeList(); out.push("<h4>" + inline(m[1]) + "</h4>"); }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); }
    else if (!l.trim()) { closeList(); }
    else { closeList(); out.push("<p>" + inline(l) + "</p>"); }
  }
  closeList(); flushTable();
  return '<div class="md">' + out.join("").replace(/\u0000(\d+)\u0000/g, (m, i) => blocks[i]) + "</div>";
}

// ---------- XP, streaks, levels ----------
function getStats() { return Object.assign({ xp: 0, streak: 0, best: 0, lastDay: "", days: {}, counts: {} }, Store.get("stats", {})); }
function streakNow() { const s = getStats(); return (s.lastDay === dayKey() || s.lastDay === dayKey(1)) ? s.streak : 0; }
function levelInfo(xp) { return { level: Math.floor(xp / 100) + 1, progress: xp % 100 }; }
function todayStats() { return Object.assign({ xp: 0, minutes: 0, actions: 0 }, getStats().days[dayKey()] || {}); }
function bump(counter, n = 1) { const s = getStats(); s.counts[counter] = (s.counts[counter] || 0) + n; Store.set("stats", s); checkBadges(); }
function addXP(amount, counter, minutes) {
  const s = getStats(), goal = getProfile().dailyGoal || 50;
  const day = s.days[dayKey()] = Object.assign({ xp: 0, minutes: 0, actions: 0 }, s.days[dayKey()] || {});
  const hadGoal = day.xp >= goal, lvl = levelInfo(s.xp).level;
  s.xp += amount; day.xp += amount; day.actions++; if (minutes) day.minutes += minutes;
  if (counter) s.counts[counter] = (s.counts[counter] || 0) + 1;
  if (s.lastDay !== dayKey()) { s.streak = s.lastDay === dayKey(1) ? s.streak + 1 : 1; s.lastDay = dayKey(); s.best = Math.max(s.best || 0, s.streak); }
  Store.set("stats", s);
  if (!hadGoal && day.xp >= goal) { toast(T("Daily goal reached! {n} XP today.", { n: goal }), "target"); confetti(); sfx("win"); }
  if (levelInfo(s.xp).level > lvl) { toast(T("Level up! You're now Level {n}", { n: levelInfo(s.xp).level }), "rocket"); confetti(); sfx("win"); }
  checkBadges();
}
function addMinutes(m) { const s = getStats(); const d = s.days[dayKey()] = Object.assign({ xp: 0, minutes: 0, actions: 0 }, s.days[dayKey()] || {}); d.minutes += m; Store.set("stats", s); }

// Badges: 3 tiers each
function badgeTier(b, s) { const v = b.stat(s); return b.tiers.filter(t => v >= t).length; }
function checkBadges() {
  const s = getStats(), earned = Store.get("badges", {});
  BADGES.forEach(b => {
    const t = badgeTier(b, s);
    if (t > (earned[b.id] || 0)) { earned[b.id] = t; toast(T("Badge unlocked: {b}", { b: T(b.name) + " · " + T(["", "Bronze", "Silver", "Gold"][t]) }), "award"); }
  });
  Store.set("badges", earned);
}

// ---------- Learning record: everything the student does, by subject + chapter ----------
function logRecord(e) {
  const rec = Store.get("record", []);
  rec.unshift(Object.assign({ id: uid(), t: Date.now(), day: dayKey() }, e));
  Store.set("record", rec.slice(0, 1500));
}
function getRecord() { return Store.get("record", []); }
function chapterKey(subject, chapter) { return (subject || "Other") + "::" + (chapter || "General"); }
// Mastery per chapter (from quizzes) + spaced revision dates
function saveResult(subject, chapter, correct, total) {
  const m = Store.get("mastery", {}), k = chapterKey(subject, chapter);
  const c = m[k] || { subject: subject || "Other", chapter: chapter || "General", correct: 0, total: 0, history: [] };
  c.correct += correct; c.total += total;
  c.history.push({ d: dayKey(), s: Math.round(correct / total * 100) });
  c.history = c.history.slice(-20);
  const recent = c.history.slice(-3).reduce((a, h) => a + h.s, 0) / Math.min(3, c.history.length);
  c.score = Math.round(recent);
  c.next = Date.now() + (c.score >= 80 ? 7 : c.score >= 60 ? 3 : 1) * 86400000;
  m[k] = c; Store.set("mastery", m);
}
function masteryList() { return Object.values(Store.get("mastery", {})); }
function weakChapters() { return masteryList().filter(c => c.score < 60).sort((a, b) => a.score - b.score); }
function dueChapters() { return masteryList().filter(c => c.next && c.next <= Date.now()).sort((a, b) => a.score - b.score); }
function difficultyFor(subject, chapter) { const c = Store.get("mastery", {})[chapterKey(subject, chapter)]; return !c ? 1 : c.score < 50 ? 0 : c.score > 80 ? 2 : 1; }
function chapterStatus(c) { if (!c || !c.total) return "new"; return c.score >= 80 ? "strong" : c.score >= 60 ? "ok" : "weak"; }

// Mistakes + what the AI should remember about the student
function getMistakes() { return Store.get("mistakes", []); }
function addMistakes(list) { if (list.length) Store.set("mistakes", list.map(m => Object.assign({ id: uid(), date: dayKey() }, m)).concat(getMistakes()).slice(0, 150)); }
function learnerMemory() {
  try {
    const weak = weakChapters().slice(0, 4).map(c => c.chapter + " (" + c.score + "%)");
    const recent = getMistakes().slice(0, 3).map(m => '"' + String(m.q).slice(0, 70) + '"');
    const bits = [];
    if (weak.length) bits.push("Weak chapters: " + weak.join(", ") + ".");
    if (recent.length) bits.push("Recently got these wrong: " + recent.join("; ") + ".");
    return bits.length ? "What you know about this student (use only when relevant): " + bits.join(" ") : "";
  } catch (e) { return ""; }
}
function setLast(hash, label, ico) { Store.set("last", { hash, label: String(label).slice(0, 70), icon: ico || "play", time: Date.now() }); }

// Smart flashcards (spaced repetition)
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function getDecks() { return Store.get("decks", []); }
function saveDecks(d) { Store.set("decks", d); }
function addDeck(topic, cards, subject) {
  const decks = getDecks();
  const deck = { id: uid(), topic, subject: subject || "", created: dayKey(), cards: cards.map(c => ({ front: c.front, back: c.back, box: 0, due: 0 })) };
  decks.unshift(deck); saveDecks(decks.slice(0, 60)); return deck;
}
function dueCards(deck) { return deck.cards.filter(c => (c.due || 0) <= Date.now()); }
function totalDueCards() { return getDecks().reduce((n, d) => n + dueCards(d).length, 0); }
function gradeCard(card, gotIt) { card.box = gotIt ? Math.min(card.box + 1, BOX_DAYS.length - 1) : 0; card.due = Date.now() + (gotIt ? BOX_DAYS[card.box] * 86400000 : 0); }

// Planner events
function getEvents() { return Store.get("events", []); }
function saveEvents(e) { Store.set("events", e); }
function eventsOn(day) { return getEvents().filter(e => e.date === day); }

// ---------- NCERT chapters (built-in for 10-12, live from the AI for others) ----------
async function chaptersFor(subject, grade) {
  grade = grade || getProfile().grade;
  if (NCERT[grade] && NCERT[grade][subject]) return NCERT[grade][subject];
  const cache = Store.raw("wf_chapters", {}), key = grade + "|" + subject;
  if (cache[key] && cache[key].length) return cache[key];
  const text = await aiText("List the chapter names of the LATEST NCERT textbook(s) for " + grade + " " + subject + " (current academic year, including new books like Ganita Prakash, Curiosity, Exploring Society, Poorvi where they apply). Use Google Search to check ncert.nic.in. Reply with ONLY the chapter names, one per line, no numbering, no extra text.", { search: true, plain: true });
  const list = String(text).split("\n").map(s => s.replace(/^[\s\-*•\d.)]+/, "").replace(/\*\*/g, "").trim()).filter(s => s && s.length < 90 && !/^(here|sure|note|source)/i.test(s)).slice(0, 40);
  if (list.length >= 3) { cache[key] = list; Store.setRaw("wf_chapters", cache); }
  return list;
}

// ---------- Little helpers ----------
function toast(msg, ico, ms) {
  const box = $("#toasts"); if (!box) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = (ico ? icon(ico, 18) : "") + "<span>" + esc(msg) + "</span>";
  box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, ms || 3000);
}
function confetti() {
  if (getProfile().motion === "reduced") return;
  const colors = ["#4F46E5", "#FF7A59", "#22C55E", "#F59E0B", "#0EA5E9", "#A78BFA"];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
    c.style.animationDelay = Math.random() * 0.25 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3400);
  }
}
function haptic(ms) { if (getProfile().haptics && navigator.vibrate) try { navigator.vibrate(ms || 15); } catch (e) {} }
let sfxCtx;
function sfx(kind) {
  if (!getProfile().sfx) return;
  try {
    sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { good: [660, 880], bad: [220, 180], win: [523, 659, 784, 1047], tap: [520] }[kind] || [520];
    notes.forEach((f, i) => {
      const o = sfxCtx.createOscillator(), g = sfxCtx.createGain(), t = sfxCtx.currentTime + i * 0.09;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(sfxCtx.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch (e) {}
  if (kind === "good") haptic(12); if (kind === "bad") haptic([30, 40, 30]);
}

// Bottom sheet (replaces pop-up boxes)
function openSheet(html, onMount) {
  const s = $("#sheet"), b = $("#sheetBack");
  s.innerHTML = '<div class="grab"></div>' + html;
  s.classList.add("on"); b.classList.add("on");
  b.onclick = closeSheet;
  if (onMount) onMount(s);
  return s;
}
function closeSheet() { $("#sheet").classList.remove("on"); $("#sheetBack").classList.remove("on"); }
function askSheet(title, text, ok, danger) {
  return new Promise(res => {
    openSheet('<h3>' + esc(title) + '</h3><p class="muted" style="margin:8px 0 18px">' + esc(text) + '</p><div class="grid2"><button class="btn ghost" data-a="no">' + T("Cancel") + '</button><button class="btn ' + (danger ? "danger" : "") + '" data-a="yes">' + esc(ok || T("Continue")) + "</button></div>", s => {
      $('[data-a="no"]', s).onclick = () => { closeSheet(); res(false); };
      $('[data-a="yes"]', s).onclick = () => { closeSheet(); res(true); };
    });
  });
}

// Voice: read aloud with the student's chosen voice
let VOICES = [];
function loadVoices() { if ("speechSynthesis" in window) VOICES = speechSynthesis.getVoices(); return VOICES; }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function bestVoice() {
  const p = getProfile(), code = langCode(p.language), vs = loadVoices();
  if (p.voiceName) { const v = vs.find(v => v.name === p.voiceName); if (v) return v; }
  const same = vs.filter(v => v.lang && v.lang.replace("_", "-").toLowerCase().startsWith(code.slice(0, 2)));
  return same.find(v => /google|natural|neural/i.test(v.name) && v.lang.toLowerCase().includes("in")) || same.find(v => /in/i.test(v.lang)) || same[0] || null;
}
function speak(text, onEnd) {
  if (!("speechSynthesis" in window)) { toast(T("Read-aloud isn't supported on this device")); return; }
  speechSynthesis.cancel();
  const p = getProfile();
  const clean = String(text).replace(/[*#_`>|]/g, "").replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?।]+[.!?।]*/g) || [clean];
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    const v = bestVoice(); if (v) u.voice = v;
    u.lang = v ? v.lang : langCode(p.language);
    u.rate = p.voiceRate || 1; u.pitch = p.voicePitch || 1;
    if (i === parts.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
}
function stopSpeak() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
function listen(onText, onEnd) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { toast(T("Voice typing works best in Chrome")); if (onEnd) onEnd(); return null; }
  const r = new Rec();
  r.lang = langCode(getProfile().language);
  r.interimResults = false;
  r.onresult = e => onText(e.results[0][0].transcript);
  r.onend = () => onEnd && onEnd();
  r.onerror = () => onEnd && onEnd();
  try { r.start(); } catch (e) {}
  return r;
}

// Photos and files
function shrinkImage(src, max) {
  max = max || 1280;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.82);
      resolve({ mimeType: "image/jpeg", data: url.split(",")[1], preview: url });
    };
    img.onerror = reject;
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}
function fileToBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ mimeType: file.type || "application/pdf", data: String(r.result).split(",")[1] }); r.onerror = rej; r.readAsDataURL(file); });
}
function loadScript(src) {
  return new Promise((res, rej) => { if ($('script[src="' + src + '"]')) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

// SVG progress ring
function ringSVG(pct, size, stroke, color) {
  size = size || 64; stroke = stroke || 7;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" style="transform:rotate(-90deg)"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" class="ring-track"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-linecap="round" class="ring-fill" style="' + (color ? "stroke:" + color + ";" : "") + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/></svg>';
}

// Selectable chips: returns a getter for the current value(s)
function chipsHTML(options, cls) { return options.map(o => { const v = typeof o === "string" ? o : o.v, l = typeof o === "string" ? o : o.l; return '<button type="button" class="chip ' + (cls || "") + '" data-v="' + esc(v) + '">' + l + "</button>"; }).join(""); }
function wireChips(box, value, multi, onChange) {
  let cur = multi ? (value || []).slice() : value;
  const paint = () => $$("[data-v]", box).forEach(b => { const on = multi ? cur.includes(b.dataset.v) : cur === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $$("[data-v]", box).forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.v;
    cur = multi ? (cur.includes(v) ? cur.filter(x => x !== v) : cur.concat(v)) : v;
    paint(); haptic(8); if (onChange) onChange(cur);
  }));
  paint();
  return () => cur;
}
function wireSeg(box, value, onChange) {
  let cur = value;
  const paint = () => $$("button", box).forEach(b => b.classList.toggle("on", b.dataset.v === cur));
  $$("button", box).forEach(b => b.onclick = () => { cur = b.dataset.v; paint(); if (onChange) onChange(cur); });
  paint(); return () => cur;
}
function rangeFill(input) { const f = () => input.style.setProperty("--p", ((input.value - input.min) / (input.max - input.min) * 100) + "%"); input.addEventListener("input", f); f(); }

// Page header
function ph(title, sub, opts = {}) {
  return '<div class="ph">' + (opts.back === false ? "" : '<button class="back-btn" onclick="goBack()" aria-label="Back">' + icon("back", 20) + "</button>") +
    '<div class="titles"><h2>' + title + "</h2>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" + (opts.right || "") + "</div>";
}
function goBack() { if (history.length > 1) history.back(); else go("home"); }

// Subject + chapter picker (bottom sheet). Calls done({subject, chapter})
function pickContext(cur, done) {
  const p = getProfile();
  cur = cur || {};
  openSheet('<h3>' + T("What are you studying?") + '</h3><p class="muted small" style="margin:4px 0 14px">' + T("Wayfinder uses this to follow your NCERT chapter and save everything in your learning record.") + '</p>' +
    '<span class="label">' + T("Subject") + '</span><div class="chips" id="pcSub" style="margin:8px 0 16px">' + chipsHTML(p.subjects.concat("Other")) + "</div>" +
    '<span class="label">' + T("Chapter") + '</span><div id="pcCh" class="stack" style="margin-top:8px"></div>' +
    '<div class="row" style="margin-top:12px"><input type="text" id="pcOwn" placeholder="' + T("Or type a chapter or topic") + '"></div>' +
    '<button class="btn block" id="pcOk" style="margin-top:16px">' + T("Done") + "</button>", async s => {
      let chapter = cur.chapter || "";
      const box = $("#pcCh", s);
      const loadCh = async subj => {
        box.innerHTML = '<div class="skel" style="height:40px"></div><div class="skel" style="height:40px"></div>';
        let list = [];
        if (subj !== "Other") { try { list = await chaptersFor(subj); } catch (e) { list = []; } }
        box.innerHTML = list.length ? '<div class="chips" style="max-height:230px;overflow:auto">' + list.map((c, i) => '<button class="chip' + (c === chapter ? " on" : "") + '" data-c="' + esc(c) + '" data-notr>' + (i + 1) + ". " + esc(c) + "</button>").join("") + "</div>" : '<p class="muted small">' + T("Type your chapter below.") + "</p>";
        $$("[data-c]", box).forEach(b => b.onclick = () => { chapter = b.dataset.c; $("#pcOwn", s).value = ""; $$("[data-c]", box).forEach(x => x.classList.toggle("on", x === b)); haptic(8); });
      };
      const getSub = wireChips($("#pcSub", s), cur.subject || p.subjects[0], false, v => { chapter = ""; loadCh(v); });
      loadCh(getSub());
      $("#pcOk", s).onclick = () => { const own = $("#pcOwn", s).value.trim(); closeSheet(); done({ subject: getSub(), chapter: own || chapter }); };
    });
}
function ctxLabel(c) { return c && c.subject ? (c.chapter ? c.subject + " · " + c.chapter : c.subject) : T("Choose subject & chapter"); }

// ---------- Ambient focus sounds (generated live, no files) ----------
const Sound = {
  ctx: null, nodes: [], gain: null, current: "none",
  play(id, vol) {
    this.stop();
    if (!id || id === "none") return;
    try {
      const ctx = this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      const master = this.gain = ctx.createGain(); master.gain.value = vol == null ? getProfile().soundVol : vol; master.connect(ctx.destination);
      const noise = (type) => {
        const len = 2 * ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (type === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
      };
      const add = n => { this.nodes.push(n); return n; };
      if (id === "white" || id === "brown") { const n = add(noise(id)); n.connect(master); n.start(); }
      if (id === "rain" || id === "cafe") {
        const n = add(noise("white")), f = ctx.createBiquadFilter(); f.type = id === "rain" ? "highpass" : "lowpass"; f.frequency.value = id === "rain" ? 900 : 500;
        const g = ctx.createGain(); g.gain.value = id === "rain" ? 0.6 : 0.9; n.connect(f).connect(g).connect(master); n.start();
        const b = add(noise("brown")); const g2 = ctx.createGain(); g2.gain.value = 0.5; b.connect(g2).connect(master); b.start();
        if (id === "cafe") { const o = add(ctx.createOscillator()); o.frequency.value = 196; const og = ctx.createGain(); og.gain.value = 0.015; o.connect(og).connect(master); o.start(); }
      }
      if (id === "alpha") {
        const merger = ctx.createChannelMerger(2);
        [200, 210].forEach((f, ch) => { const o = add(ctx.createOscillator()); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.25; o.connect(g); g.connect(merger, 0, ch); o.start(); });
        merger.connect(master);
        const pad = add(noise("brown")); const pg = ctx.createGain(); pg.gain.value = 0.25; pad.connect(pg).connect(master); pad.start();
      }
      if (id === "lofi") {
        const chords = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(master);
        const voices = [0, 1, 2].map(() => { const o = add(ctx.createOscillator()); o.type = "triangle"; const g = ctx.createGain(); g.gain.value = 0.07; o.connect(g).connect(lp); o.start(); return o; });
        let k = 0; const step = () => { chords[k % 4].forEach((f, i) => voices[i].frequency.setTargetAtTime(f, ctx.currentTime, 0.4)); k++; };
        step(); this.loop = setInterval(step, 4000);
        const vinyl = add(noise("brown")); const vg = ctx.createGain(); vg.gain.value = 0.12; vinyl.connect(vg).connect(master); vinyl.start();
      }
      this.current = id;
    } catch (e) { toast(T("Sound isn't supported on this device")); }
  },
  volume(v) { if (this.gain) this.gain.gain.value = v; },
  stop() { clearInterval(this.loop); this.nodes.forEach(n => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); this.nodes = []; if (this.gain) try { this.gain.disconnect(); } catch (e) {} this.current = "none"; }
};

// ---------- Parent alerts (dashboard log + optional email) ----------
function parentLog(entry) {
  const log = Store.get("parentLog", []);
  log.unshift(Object.assign({ t: Date.now() }, entry));
  Store.set("parentLog", log.slice(0, 300));
}
async function emailParent(subject, message) {
  const p = getProfile(), cfg = CONFIG.emailjs || {};
  if (!p.parentAlerts || !p.parentEmail || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) return false;
  const last = Store.get("lastEmail", 0);
  if (Date.now() - last < 10 * 60000) return false; // at most one email every 10 minutes
  Store.set("lastEmail", Date.now());
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ service_id: cfg.serviceId, template_id: cfg.templateId, user_id: cfg.publicKey,
        template_params: { to_email: p.parentEmail, student_name: p.name || "Your child", subject, message, time: new Date().toLocaleString("en-IN") } })
    });
    return true;
  } catch (e) { return false; }
}

// ---------- Focus engine: one timer for Focus mode and Study sessions ----------
// The timer is saved, so it keeps going even if the app is closed and reopened.
const Focus = {
  listeners: new Set(), tickTimer: null, awayAt: 0, alertTimer: null, wake: null,
  get() { return Store.get("focusState", null); },
  set(s) { if (s) Store.set("focusState", s); else Store.del("focusState"); this.emit(); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { const s = this.get(); this.listeners.forEach(fn => { try { fn(s); } catch (e) {} }); },
  left(s) { s = s || this.get(); if (!s) return 0; return s.paused ? s.leftMs : Math.max(0, s.endAt - Date.now()); },
  start(mins, ctx) {
    const p = getProfile();
    this.set({ mode: "focus", total: mins * 60000, endAt: Date.now() + mins * 60000, paused: false, leftMs: 0, ctx: ctx || {}, leaves: 0, started: Date.now(), lock: p.focusLock });
    this.run(); this.lockOn(); haptic(20);
    if (p.sound && p.sound !== "none") Sound.play(p.sound);
    parentLog({ type: "start", ctx: ctx || {}, mins });
  },
  pause() { const s = this.get(); if (!s || s.paused) return; s.leftMs = this.left(s); s.paused = true; this.set(s); },
  resume() { const s = this.get(); if (!s || !s.paused) return; s.endAt = Date.now() + s.leftMs; s.paused = false; this.set(s); this.run(); },
  stop(reason) {
    const s = this.get(); clearInterval(this.tickTimer); clearTimeout(this.alertTimer);
    if (s && s.mode === "focus" && reason !== "done") {
      const mins = Math.round((s.total - this.left(s)) / 60000);
      if (mins >= 1) { addMinutes(mins); logRecord({ type: "session", subject: s.ctx.subject, chapter: s.ctx.chapter, title: s.ctx.goal || "Focus", minutes: mins, detail: reason === "wilted" ? "Stopped: left the app" : "Ended early" }); }
    }
    this.set(null); this.lockOff(); Sound.stop();
  },
  run() {
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      const s = this.get();
      if (!s) { clearInterval(this.tickTimer); return; }
      if (!s.paused && this.left(s) <= 0) this.finish(s);
      this.emit();
    }, 500);
  },
  finish(s) {
    const p = getProfile();
    if (s.mode === "focus") {
      const mins = Math.round(s.total / 60000);
      const xp = clamp(Math.round(mins * 0.8), 10, 60);
      addXP(xp, "focus", mins);
      if (s.ctx && s.ctx.session) bump("sessions");
      logRecord({ type: "session", subject: s.ctx.subject, chapter: s.ctx.chapter, title: s.ctx.goal || "Focus session", minutes: mins, detail: s.leaves ? "Left the app " + s.leaves + " time(s)" : "Perfect focus" });
      parentLog({ type: "done", ctx: s.ctx, mins, leaves: s.leaves });
      const fs = Store.get("focusStats", { clean: 0, best: 0 });
      if (!s.leaves) { fs.clean++; fs.best = Math.max(fs.best, fs.clean); } else fs.clean = 0;
      Store.set("focusStats", fs);
      confetti(); sfx("win");
      toast(s.leaves ? T("Session done! +{x} XP", { x: xp }) : T("Perfect focus! Your tree is fully grown. +{x} XP", { x: xp }), "tree", 4000);
      this.lockOff();
      this.set({ mode: "break", total: p.breakMins * 60000, endAt: Date.now() + p.breakMins * 60000, paused: false, ctx: s.ctx, leaves: 0, done: true, tip: pick(TIPS) });
      this.run();
      if (p.autoRead) speak(T("Great job! Take a short break."));
    } else {
      Sound.stop(); this.set(null); toast(T("Break over! Ready for another round?"), "timer"); sfx("tap");
    }
  },
  async lockOn() {
    const s = this.get(); if (!s || !s.lock) return;
    document.body.classList.add("focusing");
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" }); } catch (e) {}
    try { if (navigator.wakeLock) this.wake = await navigator.wakeLock.request("screen"); } catch (e) {}
  },
  lockOff() {
    document.body.classList.remove("focusing");
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    try { if (this.wake) this.wake.release(); } catch (e) {} this.wake = null;
  },
  // Called when the app is hidden/shown
  visibility(hidden) {
    const s = this.get(), p = getProfile();
    if (!s || s.mode !== "focus" || s.paused || !s.lock) return;
    if (hidden) {
      this.awayAt = Date.now();
      Store.set("awayAt", this.awayAt);
      clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(() => {
        parentLog({ type: "left", secs: p.leaveSecs, ctx: s.ctx, live: true });
        emailParent("Wayfinder: " + (p.name || "Your child") + " left the study app", (p.name || "Your child") + " left Wayfinder during a focus session" + (s.ctx.subject ? " (" + s.ctx.subject + (s.ctx.chapter ? ": " + s.ctx.chapter : "") + ")" : "") + " at " + new Date().toLocaleTimeString("en-IN") + ".");
      }, p.leaveSecs * 1000);
      return;
    }
    clearTimeout(this.alertTimer);
    const away = this.awayAt || Store.get("awayAt", 0);
    this.awayAt = 0; Store.del("awayAt");
    if (!away) return;
    const secs = Math.round((Date.now() - away) / 1000);
    if (secs < 2) return;
    s.leaves = (s.leaves || 0) + 1; this.set(s);
    parentLog({ type: "away", secs, ctx: s.ctx });
    if (secs > p.leaveSecs) {
      this.stop("wilted");
      showAway(secs);
    } else { toast(T("You left for {n}s. Stay with it, your tree needs you.", { n: secs }), "leaf", 3500); this.lockOn(); }
  }
};
function showAway(secs) {
  const el = document.createElement("div");
  el.className = "away-screen";
  el.innerHTML = '<div class="it lg c-red" style="width:84px;height:84px;border-radius:26px">' + icon("leaf", 40) + '</div><h2>' + T("Your tree wilted") + '</h2><p class="muted">' + T("You left Wayfinder for {n} seconds during focus. It's saved in your parent report.", { n: secs }) + '</p><p class="small" style="max-width:320px;font-style:italic">“' + esc(T(pick(QUOTES)[0])) + '”</p><button class="btn lg">' + icon("leaf", 18) + T("Plant a new tree") + "</button>";
  document.body.appendChild(el);
  $("button", el).onclick = () => { el.remove(); go("focus"); };
}
document.addEventListener("visibilitychange", () => Focus.visibility(document.hidden));

// ---------- Router ----------
const Views = {};
function view(id, def) { Views[id] = def; }
function go(hash) { location.hash = hash; }
function render() {
  if (!Store.pid() || !getProfile().onboarded) return;
  const raw = location.hash.slice(1) || "home";
  const [id, query] = raw.split("?");
  const def = Views[id] || Views.home, realId = Views[id] ? id : "home";
  const params = new URLSearchParams(query || "");
  $$(".view").forEach(v => v.classList.remove("active"));
  let el = document.getElementById("v-" + realId);
  if (!el) {
    el = document.createElement("section");
    el.id = "v-" + realId; el.className = "view";
    $("#views").appendChild(el);
    el.innerHTML = def.html ? def.html() : "";
    if (def.init) def.init.call(def, el);
  }
  el.classList.add("active");
  document.body.classList.toggle("chat-mode", !!def.chat);
  document.body.classList.toggle("no-nav", !!def.noNav);
  if (def.show) def.show.call(def, el, params);
  const tab = def.tab || realId;
  $$(".nav a").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
  if (!def.keepScroll) window.scrollTo(0, 0);
  closeSheet();
}
window.addEventListener("hashchange", render);
function resetViews() { $$(".view").forEach(v => v.remove()); render(); }

// ---------- Floating motivation lines ----------
function startFloaters() {
  const box = $("#floaters"); if (!box) return;
  box.innerHTML = "";
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 5; i++) {
    const s = document.createElement("span");
    const reset = () => { s.textContent = T(pick(FLOATERS)); s.style.left = (4 + Math.random() * 60) + "%"; s.style.fontSize = (13 + Math.random() * 6) + "px"; };
    reset();
    s.style.animationDuration = (26 + Math.random() * 16) + "s";
    s.style.animationDelay = (-Math.random() * 40) + "s";
    s.addEventListener("animationiteration", reset);
    box.appendChild(s);
  }
}

// Break reminder (every 30 minutes of screen time) + offline notices
setInterval(() => { const p = Store.pid() && getProfile(); if (p && p.breakReminder && document.visibilityState === "visible" && !Focus.get()) toast(T("Time for a 2-minute eye break. Look at something far away."), "eye", 5000); }, 30 * 60 * 1000);
window.addEventListener("offline", () => toast(T("You're offline. Notes, flashcards and planner still work."), "info"));
window.addEventListener("online", () => toast(T("Back online"), "check"));
