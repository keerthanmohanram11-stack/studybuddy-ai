// ================= Home: only what matters today =================
function greeting(name) {
  const h = new Date().getHours();
  const bucket = h < 4 ? "night" : h < 7 ? "early" : h < 12 ? "morning" : h < 16 ? "afternoon" : h < 21 ? "evening" : "night";
  const last = Store.get("lastGreet", "");
  let g; let tries = 0;
  do { g = pick(GREETINGS[bucket]); tries++; } while (g === last && tries < 5);
  Store.set("lastGreet", g);
  return T(g, { n: name });
}
function contextLine() {
  const exams = getEvents().filter(e => e.type === "exam" && !e.done && daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  if (exams.length && daysUntil(exams[0].date) <= 10) { const d = daysUntil(exams[0].date); return d === 0 ? T("Your {s} exam is today. You've got this.", { s: exams[0].subject || exams[0].title }) : T("{n} days to your {s} exam. Let's make them count.", { n: d, s: exams[0].subject || exams[0].title }); }
  const hw = getEvents().filter(e => e.type === "hw" && !e.done && e.date <= dayKey());
  if (hw.length) return T("{n} homework due today.", { n: hw.length });
  const st = streakNow();
  if (st >= 2) return T("{n}-day streak. Keep it alive today.", { n: st });
  return T("What will you learn today?");
}
function todaysPlan() {
  const tasks = [];
  const exams = getEvents().filter(e => e.type === "exam" && !e.done && e.plan && daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  if (exams.length) { const t = exams[0].plan.flatMap(d => d.tasks).find(t => !t.done); if (t) tasks.push({ id: "exam-" + exams[0].id, ico: "exam", c: "c-red", t: t.t, why: T("{s} exam in {n} days", { s: exams[0].subject, n: daysUntil(exams[0].date) }), href: "#plan" }); }
  const due = dueChapters()[0] || weakChapters()[0];
  if (due) tasks.push({ id: "rev-" + due.chapter, ico: "refresh", c: "c-amber", t: T("Revise {c}", { c: due.chapter }), why: T("You scored {n}% last time", { n: due.score }), href: "#quiz?subject=" + encodeURIComponent(due.subject) + "&chapter=" + encodeURIComponent(due.chapter) });
  const cards = totalDueCards();
  if (cards) tasks.push({ id: "cards", ico: "cards", c: "c-violet", t: T("Review {n} flashcards", { n: cards }), why: T("Right on time to remember them longer"), href: "#cards?due=1" });
  const hw = getEvents().filter(e => e.type === "hw" && !e.done).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (hw) tasks.push({ id: "hw-" + hw.id, ico: "pen", c: "c-coral", t: hw.title, why: hw.date <= dayKey() ? T("Homework due today") : T("Homework due {d}", { d: fmtDay(hw.date) }), href: "#plan" });
  if (!masteryList().length) tasks.push({ id: "level", ico: "gauge", c: "c-sky", t: T("Take the 'Find my level' test"), why: T("So Wayfinder can plan the right chapters"), href: "#diagnostic" });
  tasks.push({ id: "session", ico: "timer", c: "c-green", t: T("One {n}-minute study session", { n: getProfile().focusMins }), why: T("Grow your tree and your streak"), href: "#session" });
  tasks.push({ id: "daily", ico: "zap", c: "c-amber", t: T("Daily challenge"), why: T("One question, +30 XP"), href: "#daily" });
  return tasks.slice(0, 3);
}

view("home", {
  html: () => `
    <div class="stack-lg stagger">
      <div class="row" style="gap:12px;padding-top:6px">
        <button class="avatar" id="hAv" aria-label="Profile and settings"></button>
        <div class="grow greet"><h1 id="hGreet" data-notr></h1><p class="line" id="hLine" data-notr></p></div>
        <span class="streak" id="hStreak" title="Day streak">${icon("flame", 18)}<span></span></span>
      </div>

      <a id="hCont" class="card tap row hidden" style="gap:12px;padding:14px"></a>

      <div class="card card-hero" id="hHero"></div>

      <div class="quick">
        <button data-go="chat"><span class="it">${icon("messages", 24)}</span>Ask AI</button>
        <button data-go="snap"><span class="it c-coral">${icon("camera", 24)}</span>Snap & solve</button>
        <button data-go="quiz"><span class="it c-green">${icon("quiz", 24)}</span>Quiz</button>
        <button data-go="plan"><span class="it c-amber">${icon("calendar", 24)}</span>Planner</button>
      </div>

      <div class="card">
        <div class="row" style="gap:14px">
          <div class="ring-wrap" id="hRing"></div>
          <div class="grow"><h3>Today</h3><p class="muted small" id="hToday"></p></div>
          <span class="tag indigo" id="hPlanCount"></span>
        </div>
        <div id="hPlan" style="margin-top:8px"></div>
      </div>

      <div class="card tap" id="hWeek">
        <div class="row between" style="margin-bottom:12px"><h3>This week</h3><span class="link-btn">Planner ${icon("chevR", 16)}</span></div>
        <div class="week-strip" id="hStrip"></div>
        <p class="small muted" id="hNext" style="margin-top:10px"></p>
      </div>

      <div class="card quote-card"><div class="it c-coral">${icon("quote", 20)}</div><div class="grow"><p class="q" id="hQuote"></p><p class="who" id="hWho"></p></div></div>
    </div>`,
  init(el) {
    $("#hAv", el).onclick = () => go("settings");
    $$("[data-go]", el).forEach(b => b.onclick = () => go(b.dataset.go));
    $("#hWeek", el).onclick = () => go("plan");
    this.unsub = Focus.on(() => { if (el.classList.contains("active")) this.paintHero(el); });
  },
  show(el) {
    const p = getProfile(), acc = Accounts.current();
    $("#hAv", el).innerHTML = acc && acc.photo ? `<img src="${esc(acc.photo)}" alt="">` : esc((p.name || "S").charAt(0).toUpperCase());
    $("#hGreet", el).textContent = greeting(p.name || T("there"));
    $("#hLine", el).textContent = contextLine();
    $("#hStreak span", el).textContent = streakNow();

    const last = Store.get("last", null), cont = $("#hCont", el);
    if (last && Date.now() - last.time < 7 * 86400000) {
      cont.href = "#" + last.hash;
      cont.innerHTML = `<div class="it">${icon(last.icon || "play", 20)}</div><div class="grow" style="min-width:0"><span class="tiny muted">Pick up where you left off · <span data-notr>${timeAgo(last.time)}</span></span><b class="bold ellipsis" style="display:block" data-notr>${esc(last.label)}</b></div>${icon("chevR", 18)}`;
      cont.classList.remove("hidden");
    } else cont.classList.add("hidden");

    this.paintHero(el);
    // Today: goal ring + plan
    const goal = p.dailyGoal, td = todayStats();
    $("#hRing", el).innerHTML = ringSVG(Math.round(td.xp / goal * 100), 58, 7) + `<div class="ring-label">${icon("target", 18)}</div>`;
    $("#hToday", el).textContent = T("{x} / {g} XP · {m} studied", { x: Math.min(td.xp, goal), g: goal, m: fmtMins(td.minutes) });
    this.paintPlan(el);
    // Week strip
    const start = new Date(); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return dayKey(0, d); });
    const ev = getEvents();
    $("#hStrip", el).innerHTML = days.map(k => {
      const list = ev.filter(e => e.date === k);
      const dots = list.slice(0, 3).map(e => `<i class="${e.type === "exam" ? "ex" : e.done ? "done" : ""}"></i>`).join("");
      return `<div class="d ${k === dayKey() ? "today" : ""}">${fmtDay(k, { weekday: "narrow" })}<b>${dateOf(k).getDate()}</b><span class="dots">${dots}</span></div>`;
    }).join("");
    const next = ev.filter(e => !e.done && e.date >= dayKey() && e.type !== "session").sort((a, b) => a.date.localeCompare(b.date))[0];
    $("#hNext", el).innerHTML = next ? `${icon(next.type === "exam" ? "exam" : "pen", 15)} <span data-notr>${esc(next.title)}</span> · ${next.date === dayKey() ? T("today") : fmtDay(next.date)}` : T("No homework or exams coming up. Add them in the planner.");
    // Quote: different every time
    const qs = QUOTES, lastQ = Store.get("lastQuote", -1);
    let qi; do { qi = Math.floor(Math.random() * qs.length); } while (qi === lastQ && qs.length > 1);
    Store.set("lastQuote", qi);
    $("#hQuote", el).textContent = "“" + T(qs[qi][0]) + "”";
    $("#hWho", el).textContent = qs[qi][1] ? "— " + qs[qi][1] : "";
  },
  paintHero(el) {
    const s = Focus.get(), hero = $("#hHero", el);
    if (s) {
      const left = Focus.left(s), m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60;
      hero.innerHTML = `<div class="row" style="position:relative;z-index:1"><div class="grow"><span class="tag" style="background:rgba(255,255,255,.18);color:#fff">${icon(s.mode === "break" ? "coffee" : "timer", 14)} ${s.mode === "break" ? T("Break") : s.paused ? T("Paused") : T("Focusing")}</span>
        <h2 style="margin-top:8px;font-size:2rem" data-notr>${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}</h2><p class="muted small" data-notr>${esc(ctxLabel(s.ctx))}</p></div>
        <button class="btn white" id="hOpen">${icon("play", 18)}${T("Open")}</button></div>`;
      $("#hOpen", hero).onclick = () => go(s.ctx && s.ctx.session ? "session" : "focus");
    } else {
      hero.innerHTML = `<div style="position:relative;z-index:1"><h2>Ready to study?</h2><p class="muted" style="margin:6px 0 16px">Pick a chapter, set a timer and Wayfinder guides you step by step.</p>
        <button class="btn white lg" id="hStart">${icon("play", 18)}Start a study session</button></div>`;
      $("#hStart", hero).onclick = () => go("session");
    }
  },
  paintPlan(el) {
    const tasks = todaysPlan();
    let done = Store.get("planDone", {});
    if (done.date !== dayKey()) done = { date: dayKey(), ids: [] };
    const daily = Store.get("daily", {});
    if (daily.date === dayKey() && daily.done && !done.ids.includes("daily")) done.ids.push("daily");
    if ((Store.get("focusStats", {}).lastDay === dayKey() || todayStats().minutes > 0) && !done.ids.includes("session")) done.ids.push("session");
    Store.set("planDone", done);
    const n = tasks.filter(t => done.ids.includes(t.id)).length;
    $("#hPlanCount", el).textContent = T("{a}/{b} done", { a: n, b: tasks.length });
    $("#hPlan", el).innerHTML = tasks.map(t => {
      const ok = done.ids.includes(t.id);
      return `<div class="plan-item"><button class="check ${ok ? "on" : ""}" data-p="${esc(t.id)}" aria-label="Mark done">${icon("check", 16)}</button>
        <a href="${t.href}" class="grow" style="color:inherit"><b class="bold ${ok ? "done-text" : ""}" style="font-size:.95rem">${esc(t.t)}</b><br><span class="tiny muted">${esc(t.why)}</span></a>
        <div class="it sm ${t.c}">${icon(t.ico, 16)}</div></div>`;
    }).join("") + (n === tasks.length ? `<p class="small center" style="margin-top:8px;color:var(--success-text);font-weight:600">${T("All done for today. Brilliant work!")}</p>` : "");
    $$("[data-p]", el).forEach(b => b.onclick = () => {
      const d = Store.get("planDone", { date: dayKey(), ids: [] });
      const id = b.dataset.p;
      if (d.ids.includes(id)) d.ids = d.ids.filter(x => x !== id); else { d.ids.push(id); addXP(5, "plan"); sfx("good"); }
      Store.set("planDone", d); this.paintPlan(el);
    });
  }
});
