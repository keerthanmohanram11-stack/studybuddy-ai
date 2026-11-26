// ================= StudyBuddy AI: core (shared by every screen) =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- Storage (each profile has its own saved data) ----------
const Store = {
  raw(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  setRaw(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  },
  pid() { return Store.raw("sb_current", "p1"); },
  get(key, fallback) { return Store.raw("sb_" + Store.pid() + "_" + key, fallback); },
  set(key, value) { Store.setRaw("sb_" + Store.pid() + "_" + key, value); }
};

// ---------- Profile (the student's choices) ----------
const DEFAULT_PROFILE = {
  name: "", board: "CBSE", grade: "Class 8",
  subjects: ["Maths", "Science", "English"],
  expert: "All-rounder tutor", personality: "Friendly buddy",
  styles: ["Step by step", "Real-life examples"],
  language: "English", theme: "dark-glass", textSize: 1,
  lite: false, lowData: false, hintFirst: true, tutorMode: "Socratic", dailyGoal: 50, focusLock: true, speak: false, onboarded: false
};
function getProfile() { return Object.assign({}, DEFAULT_PROFILE, Store.get("profile", {})); }
function saveProfile(p) { Store.set("profile", p); applyTheme(); }

function listProfiles() { return Store.raw("sb_profiles", [{ id: "p1" }]); }
function switchProfile(id) { Store.setRaw("sb_current", id); location.hash = "home"; location.reload(); }
function addProfile() {
  const list = listProfiles();
  const id = "p" + Date.now();
  list.push({ id });
  Store.setRaw("sb_profiles", list);
  switchProfile(id);
}

// ---------- Themes ----------
const THEMES = {
  "dark-glass":      { name: "Dark Glass", light: false, base: ["#12101C", "#0B0A12", "#0E0C18"], glow: ["rgba(205,184,255,.35)", "rgba(166,228,255,.22)", "rgba(255,194,224,.25)"], holo: ["#FFC2E0", "#CDB8FF", "#A6E4FF"], accent: "#C8B6FF" },
  "light-glass":     { name: "Light Glass", light: true, base: ["#FFE7DA", "#E2D4FF", "#B9E0FF"], glow: ["rgba(255,255,255,.95)", "rgba(150,235,255,.7)", "rgba(255,170,220,.6)"], holo: ["#FFC2E0", "#CDB8FF", "#A6E4FF"], accent: "#4F46E5" },
  "midnight-aurora": { name: "Midnight Aurora", light: false, base: ["#0D1326", "#0B1020", "#0A1A22"], glow: ["rgba(43,212,245,.28)", "rgba(123,228,149,.18)", "rgba(43,212,245,.16)"], holo: ["#2BD4F5", "#5FE0C0", "#7BE495"], accent: "#7DE3F5" },
  "galaxy-purple":   { name: "Galaxy Purple", light: false, base: ["#1A0D38", "#140A2E", "#1C0B30"], glow: ["rgba(167,139,250,.35)", "rgba(244,114,182,.2)", "rgba(192,132,252,.25)"], holo: ["#A78BFA", "#C084FC", "#F472B6"], accent: "#D8B4FE" },
  "ocean-calm":      { name: "Ocean Calm", light: false, base: ["#0A2236", "#071A2B", "#0B2030"], glow: ["rgba(56,189,248,.3)", "rgba(165,180,252,.18)", "rgba(56,189,248,.16)"], holo: ["#38BDF8", "#7DD3FC", "#A5B4FC"], accent: "#93D8FB" },
  "sunset-glow":     { name: "Sunset Glow", light: false, base: ["#2A1222", "#1E0F1A", "#24101A"], glow: ["rgba(255,138,101,.3)", "rgba(255,201,61,.18)", "rgba(255,138,101,.18)"], holo: ["#FF8A65", "#FFB74D", "#FFC93D"], accent: "#FFC29E" },
  "mint-fresh":      { name: "Mint Fresh", light: true, base: ["#F2FDF8", "#E6F8F0", "#E8F3FF"], glow: ["rgba(110,231,183,.45)", "rgba(147,197,253,.4)", "rgba(110,231,183,.3)"], holo: ["#6EE7B7", "#7DD3FC", "#93C5FD"], accent: "#0F766E" }
};
function applyTheme() {
  const p = getProfile();
  const t = THEMES[p.theme] || THEMES["dark-glass"];
  const r = document.documentElement;
  r.dataset.mode = t.light ? "light" : "dark";
  r.style.setProperty("--base1", t.base[0]);
  r.style.setProperty("--base2", t.base[1]);
  r.style.setProperty("--base3", t.base[2]);
  r.style.setProperty("--glow1", t.glow[0]);
  r.style.setProperty("--glow2", t.glow[1]);
  r.style.setProperty("--glow3", t.glow[2]);
  r.style.setProperty("--holo", "linear-gradient(120deg," + t.holo.join(",") + ")");
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--fs", p.textSize || 1);
  if (document.body) document.body.classList.toggle("lite", !!p.lite);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.base[1];
}
applyTheme();

// ---------- Talking to the AI ----------
function systemPrompt(extra) {
  const p = getProfile();
  return [
    "You are StudyBuddy, an AI " + p.expert + " for an Indian school student.",
    "Student: " + p.grade + ", " + p.board + " board. Subjects: " + p.subjects.join(", ") + ".",
    "Follow the NCERT/" + p.board + " syllabus for this class where it applies.",
    "Personality: " + p.personality + ". Teaching style: " + p.styles.join(", ") + ".",
    "Reply in " + p.language + (p.language === "Hinglish" ? " (Hindi written in English letters, mixed with English)." : "."),
    "Use short paragraphs, simple words, and bullet points or numbered steps when helpful.",
    "If you are not sure about a fact, say so. Never invent sources. Keep content safe for children.",
    "Be warm and encouraging. Praise effort, not just correct answers.",
    extra || ""
  ].join(" ");
}

async function ai(prompt, opts = {}) {
  if (!navigator.onLine) throw new Error("You're offline. Connect to the internet to use the AI.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        prompt: prompt,
        system: systemPrompt(opts.extra),
        image: opts.image || null,
        file: opts.file || null,
        json: !!opts.json,
        check: opts.check || "",
        search: !!opts.search
      })
    });
    let data;
    try { data = await res.json(); } catch (e) { throw new Error("The AI server didn't answer. Please try again."); }
    if (!res.ok) throw new Error(data.reply || "Something went wrong");
    return data; // { reply, sources, model }
  } catch (e) {
    if (e.name === "AbortError") throw new Error("That took too long. Please try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
async function aiText(prompt, opts) { return (await ai(prompt, opts)).reply; }
async function aiJSON(prompt, opts) {
  const text = await aiText(prompt, Object.assign({}, opts, { json: true }));
  try { return JSON.parse(text); } catch (e) {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("The AI sent a messy answer. Tap to try again.");
  }
}

// Make AI text safe and pretty: headings, bold, bullets, numbered lists, line breaks
function fmt(text) {
  let t = esc(text);
  t = t.replace(/^#{1,4}\s+(.*)$/gm, "<b>$1</b>");
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  t = t.replace(/^\s*[\*\-•]\s+/gm, "• ");
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  return t.replace(/\n/g, "<br>");
}
const LOADING = '<div class="row"><div class="typing"><i></i><i></i><i></i></div><span class="muted">Thinking…</span></div>';

// ---------- XP, levels, streaks, counters ----------
function dayKey(daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function getStats() {
  return Object.assign({ xp: 0, streak: 0, lastDay: "", activity: {}, counts: {}, xpDays: {} }, Store.get("stats", {}));
}
function todayXP() { return getStats().xpDays[dayKey()] || 0; }
function streakNow() {
  const s = getStats();
  return (s.lastDay === dayKey() || s.lastDay === dayKey(1)) ? s.streak : 0;
}
function levelInfo(xp) { return { level: Math.floor(xp / 100) + 1, progress: xp % 100 }; }

// Call whenever the student learns something. counter = what they did (e.g. "questions")
function addXP(amount, counter) {
  const s = getStats();
  const before = levelInfo(s.xp).level;
  const goal = getProfile().dailyGoal || 50;
  const hadGoal = (s.xpDays[dayKey()] || 0) >= goal;
  s.xp += amount;
  s.xpDays[dayKey()] = (s.xpDays[dayKey()] || 0) + amount;
  s.activity[dayKey()] = (s.activity[dayKey()] || 0) + 1;
  if (counter) s.counts[counter] = (s.counts[counter] || 0) + 1;
  if (s.lastDay !== dayKey()) {
    s.streak = s.lastDay === dayKey(1) ? s.streak + 1 : 1;
    s.lastDay = dayKey();
  }
  Store.set("stats", s);
  if (!hadGoal && s.xpDays[dayKey()] >= goal) { toast("🎯 Daily goal done! " + goal + " XP today. You're on fire!"); confetti(); }
  else if (amount >= 5 && Math.random() < 0.25 && !($("#toasts") || {}).children?.length) toast(cheer());
  if (levelInfo(s.xp).level > before) {
    toast("🎉 Level up! You're now Level " + levelInfo(s.xp).level);
    confetti();
  }
  checkBadges();
}

// ---------- Topic tracker + smart revision ----------
function getTopics() { return Store.get("topics", {}); }
function saveResult(topic, subject, correct, total) {
  const topics = getTopics();
  const t = topics[topic] || { subject: subject || "Other", correct: 0, total: 0 };
  t.correct += correct;
  t.total += total;
  t.subject = subject || t.subject;
  const score = Math.round(t.correct / t.total * 100);
  const gap = score >= 80 ? 7 : score >= 60 ? 3 : 1; // review sooner if weak
  t.next = Date.now() + gap * 86400000;
  topics[topic] = t;
  Store.set("topics", topics);
}
function topicList() {
  const topics = getTopics();
  return Object.keys(topics).map(name => ({
    name, subject: topics[name].subject,
    score: Math.round(topics[name].correct / topics[name].total * 100),
    next: topics[name].next || 0
  }));
}
function weakTopics() { return topicList().filter(t => t.score < 60).sort((a, b) => a.score - b.score); }
function revisionDue() { return topicList().filter(t => t.next && t.next <= Date.now()).sort((a, b) => a.score - b.score); }
function difficultyFor(topic) {
  const t = topicList().find(x => x.name.toLowerCase() === String(topic).toLowerCase());
  if (!t) return "medium";
  return t.score < 50 ? "easy" : t.score > 80 ? "hard" : "medium";
}

// ---------- Motivation ----------
const QUOTES = [
  "Small steps every day add up to big results. 🌱",
  "You don't have to be great to start, but you have to start to be great.",
  "Mistakes are proof that you are trying. 💪",
  "Focus on progress, not perfection.",
  "The expert in anything was once a beginner.",
  "Every page you study today is a mark you earn tomorrow. 📚",
  "Your future self will thank you for this hour.",
  "Discipline is choosing what you want most over what you want now.",
  "One more question. One more page. You've got this! 🔥",
  "Dreams don't work unless you do.",
  "Don't watch the clock; do what it does. Keep going. ⏰",
  "Hard work beats talent when talent doesn't work hard.",
  "Believe you can and you're halfway there. ⭐",
  "Success is the sum of small efforts repeated day after day.",
  "Stay focused. The phone can wait, your goals can't. 📵"
];
const CHEERS = ["🔥 Great work! Keep going!", "💪 You're getting stronger!", "⭐ Nice! Every bit counts.", "🚀 You're on a roll!", "🧠 Your brain is growing!"];
function quoteOfDay() { const d = new Date(); return QUOTES[(d.getDate() + d.getMonth() * 31) % QUOTES.length]; }
function randomQuote() { return QUOTES[Math.floor(Math.random() * QUOTES.length)]; }
function cheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }

// ---------- Smart flashcards (spaced repetition) ----------
// Each card sits in a "box". Got it = next box (seen less often). Again = back to box 0 (seen again soon).
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function getDecks() { return Store.get("decks", []); }
function saveDecks(d) { Store.set("decks", d); }
function addDeck(topic, cards) {
  const decks = getDecks();
  const deck = { id: Date.now(), topic, created: dayKey(), cards: cards.map(c => ({ front: c.front, back: c.back, box: 0, due: 0 })) };
  decks.unshift(deck);
  saveDecks(decks.slice(0, 40));
  return deck;
}
function dueCards(deck) { return deck.cards.filter(c => (c.due || 0) <= Date.now()); }
function totalDueCards() { return getDecks().reduce((n, d) => n + dueCards(d).length, 0); }
function gradeCard(card, gotIt) {
  card.box = gotIt ? Math.min(card.box + 1, BOX_DAYS.length - 1) : 0;
  card.due = gotIt ? Date.now() + BOX_DAYS[card.box] * 86400000 : Date.now();
}

// ---------- Badges ----------
const BADGES = [
  { id: "first-q", ico: "💬", name: "First question", test: s => (s.counts.questions || 0) >= 1 },
  { id: "curious", ico: "🧠", name: "Curious mind (25 questions)", test: s => (s.counts.questions || 0) >= 25 },
  { id: "first-quiz", ico: "📝", name: "First quiz", test: s => (s.counts.quizzes || 0) >= 1 },
  { id: "perfect", ico: "🏆", name: "Perfect score", test: s => (s.counts.perfect || 0) >= 1 },
  { id: "snap", ico: "📸", name: "Snap star", test: s => (s.counts.snaps || 0) >= 1 },
  { id: "focus", ico: "⏱️", name: "Deep focus", test: s => (s.counts.focus || 0) >= 1 },
  { id: "mock", ico: "🎓", name: "Exam ready", test: s => (s.counts.mocks || 0) >= 1 },
  { id: "viva", ico: "🎤", name: "Viva voice", test: s => (s.counts.vivas || 0) >= 1 },
  { id: "streak3", ico: "🔥", name: "3-day streak", test: s => s.streak >= 3 },
  { id: "streak7", ico: "🌟", name: "7-day streak", test: s => s.streak >= 7 },
  { id: "lvl5", ico: "🚀", name: "Level 5", test: s => levelInfo(s.xp).level >= 5 },
  { id: "daily", ico: "🎯", name: "Daily challenger", test: s => (s.counts.daily || 0) >= 1 },
  { id: "cards50", ico: "🃏", name: "Card master (50 cards)", test: s => (s.counts.cardsGot || 0) >= 50 },
  { id: "focus5", ico: "🌳", name: "Focus forest (5 sessions)", test: s => (s.counts.focus || 0) >= 5 },
  { id: "notes", ico: "🗂️", name: "Note keeper", test: s => (s.counts.notes || 0) >= 1 }
];
function checkBadges() {
  const s = getStats();
  const earned = Store.get("badges", []);
  BADGES.forEach(b => {
    if (!earned.includes(b.id) && b.test(s)) {
      earned.push(b.id);
      toast("🏅 Badge unlocked: " + b.name);
    }
  });
  Store.set("badges", earned);
}

// ---------- Saved items (answers, notes, sheets) ----------
function saveItem(title, text, kind) {
  const items = Store.get("saved", []);
  items.unshift({ id: Date.now(), title: String(title).slice(0, 80), text, kind: kind || "Answer", date: dayKey() });
  Store.set("saved", items.slice(0, 100));
  toast("🔖 Saved");
}

// ---------- Little helpers ----------
function toast(msg) {
  const box = $("#toasts");
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function confetti() {
  if (getProfile().lite) return;
  const colors = ["#FFC2E0", "#CDB8FF", "#A6E4FF", "#FFD67A", "#7BE495"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
    c.style.animationDelay = Math.random() * 0.3 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}
function speak(text) {
  if (!("speechSynthesis" in window)) { toast("Read-aloud isn't supported on this device"); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/[*#_`]/g, ""));
  const lang = { Hindi: "hi-IN", Hinglish: "en-IN", Tamil: "ta-IN", Kannada: "kn-IN", Telugu: "te-IN", Malayalam: "ml-IN", Marathi: "mr-IN", Bengali: "bn-IN" }[getProfile().language];
  u.lang = lang || "en-IN";
  speechSynthesis.speak(u);
}
function listen(onText, onEnd) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { toast("🎤 Voice typing works best in Chrome"); if (onEnd) onEnd(); return null; }
  const r = new Rec();
  r.lang = "en-IN";
  r.onresult = e => onText(e.results[0][0].transcript);
  r.onend = () => onEnd && onEnd();
  r.onerror = () => onEnd && onEnd();
  r.start();
  return r;
}
// Shrink photos before upload: faster, uses less data
function shrinkImage(file) {
  const max = getProfile().lowData ? 768 : 1100;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", getProfile().lowData ? 0.65 : 0.8);
      resolve({ mimeType: "image/jpeg", data: url.split(",")[1], preview: url });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ mimeType: file.type || "application/pdf", data: String(r.result).split(",")[1] });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
// Header for sub-screens, with a back button
function head(title, sub) {
  return '<div class="head"><button class="back" onclick="history.back()" aria-label="Back">←</button>' +
    '<div class="grow"><h2>' + title + '</h2>' + (sub ? '<p class="muted small">' + sub + '</p>' : '') + '</div></div>';
}
function wireChoices(box, values, multi, onChange) {
  let current = multi ? values.slice() : values;
  const paint = () => $$("[data-v]", box).forEach(b => {
    const on = multi ? current.includes(b.dataset.v) : current === b.dataset.v;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
  $$("[data-v]", box).forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.v;
    if (multi) current = current.includes(v) ? current.filter(x => x !== v) : current.concat(v);
    else current = v;
    paint();
    if (onChange) onChange(current);
  }));
  paint();
  return () => current;
}
function pillsHTML(options) {
  return options.map(o => '<button type="button" class="pill" data-v="' + esc(o) + '">' + esc(o) + '</button>').join("");
}

// ---------- Screens (single-page app: no reloads, so it feels instant) ----------
const Views = {};
function view(id, def) { Views[id] = def; }
function go(id) { location.hash = id; }

function render() {
  const raw = location.hash.slice(1) || "home";
  const [id, query] = raw.split("?");
  const def = Views[id] || Views.home;
  const realId = Views[id] ? id : "home";
  const params = new URLSearchParams(query || "");
  $$(".view").forEach(v => v.classList.remove("active"));
  let el = document.getElementById("v-" + realId);
  if (!el) {
    el = document.createElement("section");
    el.id = "v-" + realId;
    el.className = "view";
    $("#views").appendChild(el);
    el.innerHTML = def.html ? def.html() : "";
    if (def.init) def.init(el);
  }
  el.classList.add("active");
  if (def.show) def.show(el, params);
  const tab = def.tab || realId;
  $$(".nav a").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
  document.body.classList.toggle("has-inputbar", !!def.inputbar);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);

// ---------- Wellness: gentle break reminder every 25 minutes ----------
setInterval(() => {
  if (document.visibilityState === "visible") toast("👀 Break time! Look away from the screen for 20 seconds.");
}, 25 * 60 * 1000);

// ---------- Offline / online notices ----------
window.addEventListener("offline", () => toast("📴 You're offline. Saved notes and flashcards still work."));
window.addEventListener("online", () => toast("✅ Back online"));