// ================= Plan: weekly/monthly planner, study sessions, focus mode =================
const GOALS = [{ v: "Homework", i: "pen" }, { v: "Understand a topic", i: "lightbulb" }, { v: "Revise", i: "refresh" }, { v: "Exam prep", i: "exam" }, { v: "Practise questions", i: "quiz" }];

view("plan", {
  html: () => `
    ${ph("Plan", "Your week at a glance", { back: false, right: `<button class="btn sm" id="plAdd">${icon("plus", 16)}Add</button>` })}
    <div class="card" style="padding:14px">
      <div class="row between" style="margin-bottom:12px"><button class="icon-btn plain" id="plPrev" aria-label="Previous">${icon("chevL", 20)}</button><b class="bold" id="plTitle" data-notr></b><button class="icon-btn plain" id="plNext" aria-label="Next">${icon("chevR", 20)}</button></div>
      <div class="seg" id="plMode" style="margin-bottom:12px"><button data-v="week">Week</button><button data-v="month">Month</button></div>
      <div id="plCal"></div>
      <div class="legend" style="margin-top:10px"><span><i style="background:var(--accent)"></i>Homework</span><span><i style="background:var(--danger)"></i>Exam</span><span><i style="background:var(--success)"></i>Study session</span></div>
    </div>
    <div class="section-title"><h3 id="plDayT"></h3></div>
    <div id="plDay" class="stack"></div>
    <div class="card card-hero"><div style="position:relative;z-index:1" class="stack"><h3>Ready to study?</h3><p class="muted small">Pick a chapter and a goal. Wayfinder plans the session and keeps you focused.</p>
      <div class="grid2"><a class="btn white" href="#session">${icon("play", 18)}Study session</a><a class="btn white" href="#focus" style="background:rgba(255,255,255,.18);color:#fff">${icon("timer", 18)}Focus timer</a></div></div></div>
    <div class="section-title"><h3>Coming up</h3></div><div id="plUp"></div>`,
  init(el) {
    this.sel = dayKey(); this.anchor = new Date(); this.mode = "week";
    this.getMode = wireSeg($("#plMode", el), "week", v => { this.mode = v; this.paint(el); });
    $("#plPrev", el).onclick = () => { this.mode === "week" ? this.anchor.setDate(this.anchor.getDate() - 7) : this.anchor.setMonth(this.anchor.getMonth() - 1); this.paint(el); };
    $("#plNext", el).onclick = () => { this.mode === "week" ? this.anchor.setDate(this.anchor.getDate() + 7) : this.anchor.setMonth(this.anchor.getMonth() + 1); this.paint(el); };
    $("#plAdd", el).onclick = () => addEventSheet(this.sel, () => this.paint(el));
  },
  show(el) { this.paint(el); },
  paint(el) {
    const ev = getEvents(), lang = langCode(getProfile().language);
    const dots = k => ev.filter(e => e.date === k).slice(0, 3).map(e => `<i class="${e.type === "exam" ? "ex" : e.type === "session" ? "ss" : ""}"></i>`).join("");
    if (this.mode === "week") {
      const s = new Date(this.anchor); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      const days = [...Array(7)].map((_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return dayKey(0, d); });
      $("#plTitle", el).textContent = fmtDay(days[0]) + " – " + fmtDay(days[6]);
      $("#plCal", el).innerHTML = `<div class="cal-head">${days.map(k => `<span>${dateOf(k).toLocaleDateString(lang, { weekday: "short" })}</span>`).join("")}</div><div class="cal">${days.map(k => `<button data-d="${k}" class="${k === this.sel ? "sel" : k === dayKey() ? "today" : ""}">${dateOf(k).getDate()}<span class="dots">${dots(k)}</span></button>`).join("")}</div>`;
    } else {
      const y = this.anchor.getFullYear(), m = this.anchor.getMonth(), first = new Date(y, m, 1), startPad = (first.getDay() + 6) % 7;
      $("#plTitle", el).textContent = first.toLocaleDateString(lang, { month: "long", year: "numeric" });
      const cells = [...Array(42)].map((_, i) => { const d = new Date(y, m, 1 - startPad + i); return { k: dayKey(0, d), out: d.getMonth() !== m, n: d.getDate() }; });
      const head = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: "narrow" }));
      $("#plCal", el).innerHTML = `<div class="cal-head">${head.map(h => `<span>${h}</span>`).join("")}</div><div class="cal">${cells.map(c => `<button data-d="${c.k}" class="${c.out ? "out" : ""} ${c.k === this.sel ? "sel" : c.k === dayKey() ? "today" : ""}">${c.n}<span class="dots">${dots(c.k)}</span></button>`).join("")}</div>`;
    }
    $$("[data-d]", el).forEach(b => b.onclick = () => { this.sel = b.dataset.d; this.paint(el); });
    $("#plDayT", el).textContent = this.sel === dayKey() ? T("Today") : fmtDay(this.sel, { weekday: "long", day: "numeric", month: "long" });
    const list = eventsOn(this.sel).sort((a, b) => (a.done - b.done) || (a.time || "").localeCompare(b.time || ""));
    $("#plDay", el).innerHTML = (list.length ? list.map(e => eventRow(e)).join("") : `<div class="card flat empty" style="padding:18px"><p>${T("Nothing planned. Tap Add for homework, an exam or a task.")}</p></div>`) + (this.sel === dayKey() ? "" : `<button class="btn ghost block" id="plAddDay">${icon("plus", 16)}${T("Add for this day")}</button>`);
    wireEvents(el, () => this.paint(el));
    const pad = $("#plAddDay", el); if (pad) pad.onclick = () => addEventSheet(this.sel, () => this.paint(el));
    const up = ev.filter(e => !e.done && e.date > dayKey() && daysUntil(e.date) <= 14 && e.type !== "session").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    $("#plUp", el).innerHTML = up.length ? `<div class="stack">${up.map(e => eventRow(e, true)).join("")}</div>` : `<p class="small muted" style="padding:0 4px">${T("Nothing in the next two weeks.")}</p>`;
    wireEvents($("#plUp", el), () => this.paint(el));
  }
});
function eventRow(e, showDate) {
  const ico = { hw: "pen", exam: "exam", task: "checkc", session: "timer" }[e.type] || "checkc";
  const plan = e.type === "exam" && e.plan ? e.plan.flatMap(d => d.tasks) : null;
  return `<div class="event ${e.type === "hw" ? "hw" : e.type}"><span class="bar-l"></span>
    ${e.type === "session" ? `<div class="it sm c-green">${icon(ico, 16)}</div>` : `<button class="check ${e.done ? "on" : ""}" data-done="${e.id}" aria-label="Done">${icon("check", 16)}</button>`}
    <div class="grow"><b class="bold ${e.done ? "done-text" : ""}" data-notr style="font-size:.95rem">${esc(e.title)}</b><p class="tiny muted">${T({ hw: "Homework", exam: "Exam", task: "Task", session: "Study session" }[e.type])}${e.subject ? ` · <span data-notr>${esc(e.subject)}</span>` : ""}${e.time ? " · " + esc(e.time) : ""}${showDate ? " · " + (daysUntil(e.date) === 1 ? T("tomorrow") : fmtDay(e.date)) : ""}${plan ? " · " + T("{a}/{b} plan steps", { a: plan.filter(t => t.done).length, b: plan.length }) : ""}</p></div>
    ${plan ? `<button class="icon-btn plain" data-plan="${e.id}" aria-label="Revision plan">${icon("route", 18)}</button>` : ""}<button class="icon-btn plain" data-del="${e.id}" aria-label="Delete">${icon("trash", 17)}</button></div>`;
}
function wireEvents(root, refresh) {
  $$("[data-done]", root).forEach(b => b.onclick = () => { const ev = getEvents(), e = ev.find(x => x.id === b.dataset.done); e.done = !e.done; saveEvents(ev); if (e.done) { addXP(5, "tasks"); sfx("good"); } refresh(); });
  $$("[data-del]", root).forEach(b => b.onclick = async () => { if (await askSheet(T("Delete this?"), T("It will be removed from your planner."), T("Delete"), true)) { saveEvents(getEvents().filter(x => x.id !== b.dataset.del)); refresh(); } });
  $$("[data-plan]", root).forEach(b => b.onclick = () => examPlanSheet(b.dataset.plan, refresh));
}
function addEventSheet(day, done) {
  const p = getProfile();
  openSheet(`<h3>${T("Add to planner")}</h3>
    <div class="seg" id="aeT" style="margin:14px 0"><button data-v="hw">${T("Homework")}</button><button data-v="exam">${T("Exam")}</button><button data-v="task">${T("Task")}</button></div>
    <div class="stack"><div class="field"><label for="aeTitle">${T("What is it?")}</label><input type="text" id="aeTitle" placeholder="${T("e.g. Maths Ex 4.2, Q1-10")}" data-notr></div>
    <span class="label">${T("Subject")}</span><div class="chips" id="aeS">${chipsHTML(p.subjects.concat("Other"))}</div>
    <div class="grid2"><div class="field"><label for="aeD">${T("Date")}</label><input type="date" id="aeD" value="${day}"></div><div class="field"><label for="aeTm">${T("Time (optional)")}</label><input type="time" id="aeTm"></div></div>
    <div id="aeExam" class="stack hidden"><div class="field"><label for="aeCh">${T("Chapters in the exam")}</label><input type="text" id="aeCh" placeholder="${T("e.g. Ch 1 to 4")}" data-notr></div>
    <label class="switch"><input type="checkbox" id="aeAI" checked><span class="track"></span><span class="small"><b class="bold">${T("Make a day-by-day revision plan with AI")}</b></span></label></div>
    <button class="btn lg block" id="aeSave">${T("Save")}</button></div>`, s => {
    const getT = wireSeg($("#aeT", s), "hw", v => $("#aeExam", s).classList.toggle("hidden", v !== "exam"));
    const getS = wireChips($("#aeS", s), p.subjects[0]);
    $("#aeSave", s).onclick = async () => {
      const type = getT(), title = $("#aeTitle", s).value.trim() || (type === "exam" ? getS() + " " + T("exam") : "");
      const date = $("#aeD", s).value;
      if (!title || !date) { toast(T("Add a title and a date")); return; }
      const e = { id: uid(), type, title, subject: getS(), date, time: $("#aeTm", s).value, done: false, created: Date.now() };
      if (type === "exam") e.chapters = $("#aeCh", s).value.trim();
      const ev = getEvents(); ev.push(e); saveEvents(ev);
      closeSheet(); toast(T("Added to your planner"), "calendar"); done && done();
      if (type === "exam" && $("#aeAI", s).checked) makeExamPlan(e.id, done);
    };
  });
}
async function makeExamPlan(id, done) {
  const ev = getEvents(), e = ev.find(x => x.id === id); if (!e) return;
  const days = clamp(daysUntil(e.date), 1, 30);
  toast(T("Making your revision plan…"), "sparkles");
  try {
    const weak = weakChapters().filter(c => c.subject === e.subject).map(c => c.chapter).slice(0, 4);
    const d = await aiJSON("I have a " + e.subject + " exam in " + days + " days" + (e.chapters ? " on: " + e.chapters : "") + "." + (weak.length ? " My weak chapters: " + weak.join(", ") + "." : "") + " Make a realistic day-by-day revision plan for " + days + " days (max 3 short tasks a day, weak chapters first, last day = light revision + rest). " + 'Return JSON {"days":[{"day":1,"tasks":["...","..."]}]}', { memory: false });
    const all = getEvents(), x = all.find(z => z.id === id);
    x.plan = (d.days || []).map((dd, i) => { const dt = new Date(); dt.setDate(dt.getDate() + i); return { day: dd.day || i + 1, date: dayKey(0, dt), tasks: (dd.tasks || []).map(t => ({ t, done: false })) }; });
    saveEvents(all); toast(T("Revision plan ready. It shows up in Today's plan."), "route"); done && done();
  } catch (err) { toast(err.message); }
}
function examPlanSheet(id, refresh) {
  const e = getEvents().find(x => x.id === id); if (!e || !e.plan) return;
  openSheet(`<h3 data-notr>${esc(e.title)}</h3><p class="muted small" style="margin:4px 0 14px">${T("{n} days to go", { n: daysUntil(e.date) })}</p><div class="timeline">${e.plan.map((d, di) => `<div class="tl-item"><b class="bold small">${T("Day {n}", { n: d.day })}${d.date ? " · " + fmtDay(d.date) : ""}</b>${d.tasks.map((t, ti) => `<div class="row" style="margin-top:8px"><button class="check ${t.done ? "on" : ""}" data-t="${di}-${ti}">${icon("check", 15)}</button><span class="small ${t.done ? "done-text" : ""}" data-notr>${esc(t.t)}</span></div>`).join("")}</div>`).join("")}</div>`, s => {
    $$("[data-t]", s).forEach(b => b.onclick = () => { const [di, ti] = b.dataset.t.split("-").map(Number); const all = getEvents(), x = all.find(z => z.id === id); const t = x.plan[di].tasks[ti]; t.done = !t.done; saveEvents(all); if (t.done) addXP(5, "tasks"); b.classList.toggle("on", t.done); b.nextElementSibling.classList.toggle("done-text", t.done); refresh && refresh(); });
  });
}

// ---------- Study session: choose, plan, focus, reflect ----------
view("session", {
  tab: "plan",
  html: () => `
    <div id="ssSetup" class="stack-lg">
      ${ph("Study session", "Tell Wayfinder what you're studying. It plans and guides the session.")}
      <button class="card tap row" id="ssCtx" style="gap:12px;text-align:left"><div class="it">${icon("book", 20)}</div><div class="grow"><span class="tiny muted">Subject and chapter</span><br><b class="bold" id="ssCtxT" data-notr></b></div>${icon("chevR", 18)}</button>
      <div class="card stack"><span class="label">Your goal</span><div class="chips" id="ssGoal">${chipsHTML(GOALS.map(g => ({ v: g.v, l: icon(g.i, 15) + g.v })))}</div>
        <span class="label" style="margin-top:6px">How long?</span><div class="chips" id="ssLen">${chipsHTML(["15", "25", "45", "60"].map(m => ({ v: m, l: m + " min" })))}</div>
        <span class="label" style="margin-top:6px">Background sound</span><div class="chips scroll" id="ssSnd">${chipsHTML([{ v: "none", l: icon("mute", 15) + "None" }].concat(SOUNDS.map(s => ({ v: s.id, l: icon(s.icon, 15) + s.name }))))}</div>
        <label class="switch" style="margin-top:6px"><input type="checkbox" id="ssLock"><span class="track"></span><span class="small grow"><b class="bold">Focus lock</b><br><span class="muted">Full screen. If you leave the app, it's recorded for your parents.</span></span></label></div>
      <button class="btn lg block" id="ssGo">${icon("play", 18)}Start studying</button>
    </div>
    <div id="ssRun" class="stack-lg hidden"></div>`,
  init(el) {
    const p = getProfile();
    this.ctx = {};
    this.getGoal = wireChips($("#ssGoal", el), "Understand a topic");
    this.getLen = wireChips($("#ssLen", el), String(p.focusMins));
    this.getSnd = wireChips($("#ssSnd", el), p.sound, false, v => { setPref("sound", v); if (v !== "none") { Sound.play(v); setTimeout(() => { if (!Focus.get()) Sound.stop(); }, 2500); } else Sound.stop(); });
    $("#ssLock", el).checked = p.focusLock;
    $("#ssLock", el).onchange = e => setPref("focusLock", e.target.checked);
    $("#ssCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#ssCtxT", el).textContent = ctxLabel(c); });
    $("#ssGo", el).onclick = () => {
      if (!this.ctx.subject) { pickContext(this.ctx, c => { this.ctx = c; $("#ssCtxT", el).textContent = ctxLabel(c); $("#ssGo", el).click(); }); return; }
      const ctx = Object.assign({}, this.ctx, { goal: this.getGoal(), session: true, steps: null });
      Focus.start(parseInt(this.getLen()), ctx);
      const ev = getEvents(); ev.push({ id: uid(), type: "session", title: ctx.goal + ": " + (ctx.chapter || ctx.subject), subject: ctx.subject, date: dayKey(), time: new Date().toTimeString().slice(0, 5), done: true }); saveEvents(ev);
      setLast("session", T("Study session: ") + (ctx.chapter || ctx.subject), "timer");
      this.paint(el); this.makeSteps(el);
    };
    this.unsub = Focus.on(s => { if (el.classList.contains("active")) this.tick(el, s); });
  },
  show(el) { $("#ssCtxT", el).textContent = ctxLabel(this.ctx); this.paint(el); },
  paint(el) {
    const s = Focus.get();
    const running = s && s.ctx && s.ctx.session;
    $("#ssSetup", el).classList.toggle("hidden", !!running);
    $("#ssRun", el).classList.toggle("hidden", !running);
    document.body.classList.toggle("no-nav", !!(running && s.mode === "focus"));
    if (!running) return;
    const c = s.ctx;
    $("#ssRun", el).innerHTML = `
      <div class="ph"><button class="back-btn" onclick="go('home')" aria-label="Home">${icon("home", 20)}</button><div class="titles"><h3 data-notr>${esc(c.chapter || c.subject)}</h3><p class="sub"><span>${T(c.goal)}</span> · <span data-notr>${esc(c.subject)}</span></p></div><span class="tag ${s.mode === "break" ? "green" : "indigo"}" id="ssMode"></span></div>
      ${focusRingHTML()}
      <div class="grid3"><button class="btn ghost" id="ssPause"></button><button class="btn ghost" id="ssSound">${icon("music", 18)}${T("Sound")}</button><button class="btn danger" id="ssEnd">${icon("stop", 18)}${T("End")}</button></div>
      <div class="card hidden" id="ssReflect"></div>
      <div class="card"><div class="row between"><h3>${T("Session plan")}</h3><span class="tag indigo">${icon("sparkles", 12)} AI</span></div><div id="ssSteps" style="margin-top:8px">${loadingHTML(T("Planning your session…"))}</div></div>
      <div class="section-title"><h3>${T("Tools for this chapter")}</h3></div>
      <div class="grid3">
        <a class="tile" style="min-height:96px" href="#chat?helper=tutor&new=1&subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter || "")}"><span class="it">${icon("compass", 20)}</span><b>${T("Ask tutor")}</b></a>
        <a class="tile" style="min-height:96px" href="#snap"><span class="it c-coral">${icon("camera", 20)}</span><b>${T("Snap")}</b></a>
        <a class="tile" style="min-height:96px" href="#quiz?subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter || c.subject)}"><span class="it c-green">${icon("quiz", 20)}</span><b>${T("Quiz")}</b></a>
        <a class="tile" style="min-height:96px" href="#note?id=new"><span class="it c-amber">${icon("notes", 20)}</span><b>${T("Notes")}</b></a>
        <a class="tile" style="min-height:96px" href="#keypoints"><span class="it c-violet">${icon("keypoints", 20)}</span><b>${T("Key points")}</b></a>
        <a class="tile" style="min-height:96px" href="#video"><span class="it c-red">${icon("video", 20)}</span><b>${T("Videos")}</b></a>
      </div>`;
    $("#ssPause", el).onclick = () => { const st = Focus.get(); st.paused ? Focus.resume() : Focus.pause(); };
    $("#ssEnd", el).onclick = async () => { if (await askSheet(T("End this session?"), T("Time studied so far is saved."), T("End session"))) { Focus.stop("ended"); this.paint(el); go("home"); } };
    $("#ssSound", el).onclick = () => soundSheet();
    this.paintSteps(el); this.tick(el, s);
  },
  tick(el, s) {
    if (!s || !s.ctx || !s.ctx.session) { if (!$("#ssRun", el).classList.contains("hidden")) this.paint(el); return; }
    paintRing(el, s);
    const m = $("#ssMode", el); if (m) m.textContent = s.mode === "break" ? T("Break") : s.paused ? T("Paused") : T("Focusing");
    const pb = $("#ssPause", el); if (pb) pb.innerHTML = s.paused ? icon("play", 18) + T("Resume") : icon("pause", 18) + T("Pause");
    document.body.classList.toggle("no-nav", s.mode === "focus");
    const rf = $("#ssReflect", el);
    if (rf) {
      if (s.mode === "break" && s.done && !s.reflected) {
        rf.classList.remove("hidden");
        if (!rf.dataset.on) {
          rf.dataset.on = 1;
          rf.innerHTML = `<h3>${T("How well do you understand it now?")}</h3><div class="row" id="rfStars" style="margin:12px 0;gap:6px">${[1, 2, 3, 4, 5].map(n => `<button class="icon-btn" data-n="${n}" aria-label="${n}">${icon("star", 20)}</button>`).join("")}</div><input type="text" id="rfHard" placeholder="${T("What was hardest? (optional)")}" data-notr><button class="btn block" id="rfSave" style="margin-top:10px">${T("Save to my learning record")}</button><p class="tiny muted" style="margin-top:8px" data-notr>${esc(T("Break tip: ") + T(s.tip || TIPS[0]))}</p>`;
          let stars = 0;
          $$("[data-n]", rf).forEach(b => b.onclick = () => { stars = +b.dataset.n; $$("[data-n]", rf).forEach(x => x.classList.toggle("on", +x.dataset.n <= stars)); });
          $("#rfSave", rf).onclick = () => {
            const hard = $("#rfHard", rf).value.trim();
            logRecord({ type: "reflection", subject: s.ctx.subject, chapter: s.ctx.chapter, title: T("Understanding: {n}/5", { n: stars || "?" }), score: stars, total: 5, detail: hard });
            const st = Focus.get(); if (st) { st.reflected = true; Focus.set(st); }
            rf.innerHTML = stars && stars <= 2 ? `<p class="small">${T("Let's fix that. Ask the tutor about the hard part.")}</p><a class="btn block" style="margin-top:10px" href="#chat?helper=tutor&new=1&subject=${encodeURIComponent(s.ctx.subject)}&chapter=${encodeURIComponent(s.ctx.chapter || "")}&q=${encodeURIComponent(hard || T("I still don't understand this chapter. Can you explain it a different way?"))}">${T("Ask the tutor")}</a>` : `<p class="small">${T("Saved. Great session!")}</p>`;
          };
        }
      } else if (s.mode === "focus") { rf.classList.add("hidden"); delete rf.dataset.on; }
    }
  },
  async makeSteps(el) {
    const s = Focus.get(); if (!s) return;
    try {
      const d = await aiJSON("A student is starting a " + Math.round(s.total / 60000) + "-minute study session. Goal: " + s.ctx.goal + ". " + s.ctx.subject + (s.ctx.chapter ? ", NCERT chapter: " + s.ctx.chapter : "") + ". Make a short plan of 3 or 4 steps with minutes for each, using active learning (recall, practice, explain it back) and Wayfinder tools (Ask tutor, Quiz, Flashcards, Notes) where useful. " + 'Return JSON {"steps":[{"t":"step text","min":5}]}', { memory: true });
      const st = Focus.get(); if (!st) return;
      st.ctx.steps = (d.steps || []).filter(x => x && x.t).slice(0, 5).map(x => ({ t: x.t, min: x.min, done: false }));
      if (!st.ctx.steps.length) throw new Error("no steps");
      Focus.set(st);
    } catch (e) { const st = Focus.get(); if (st) { st.ctx.steps = [{ t: T("Read the chapter section and underline key words"), min: 10, done: false }, { t: T("Ask the tutor to quiz you on it"), min: 10, done: false }, { t: T("Write 5 key points from memory"), min: 5, done: false }]; Focus.set(st); } }
    this.paintSteps(el);
  },
  paintSteps(el) {
    const s = Focus.get(), box = $("#ssSteps", el); if (!s || !box || !s.ctx.steps) return;
    box.innerHTML = s.ctx.steps.map((x, i) => `<div class="plan-item"><button class="check ${x.done ? "on" : ""}" data-st="${i}">${icon("check", 15)}</button><span class="grow small ${x.done ? "done-text" : ""}" data-notr>${esc(x.t)}</span>${x.min ? `<span class="tag">${x.min} min</span>` : ""}</div>`).join("");
    $$("[data-st]", box).forEach(b => b.onclick = () => { const st = Focus.get(); const x = st.ctx.steps[+b.dataset.st]; x.done = !x.done; Focus.set(st); if (x.done) { sfx("good"); addXP(3); } this.paintSteps(el); });
  }
});
function focusRingHTML() {
  return `<div class="focus-ring"><svg width="250" height="250" viewBox="0 0 250 250"><circle cx="125" cy="125" r="110" fill="none" stroke-width="12" class="ring-track"/><circle id="frFill" cx="125" cy="125" r="110" fill="none" stroke-width="12" stroke-linecap="round" class="ring-fill" stroke-dasharray="691" stroke-dashoffset="691"/></svg>
    <div class="center"><div class="plant" id="frPlant"></div><div class="time" id="frTime">00:00</div><p class="small muted" id="frSub"></p></div></div>`;
}
function paintRing(el, s) {
  const left = Focus.left(s), m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60, p = 1 - left / s.total;
  const t = $("#frTime", el); if (!t) return;
  t.textContent = String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  $("#frFill", el).setAttribute("stroke-dashoffset", String(691 * (1 - p)));
  $("#frFill", el).style.stroke = s.mode === "break" ? "var(--success)" : "";
  const plant = s.mode === "break" ? icon("coffee", 34) : p < 0.33 ? icon("leaf", 26) : p < 0.66 ? icon("leaf", 36) : icon("tree", 42);
  const pl = $("#frPlant", el); if (pl.dataset.k !== String(plant.length + s.mode + Math.floor(p * 3))) { pl.innerHTML = plant; pl.dataset.k = plant.length + s.mode + Math.floor(p * 3); }
  $("#frSub", el).textContent = s.mode === "break" ? T("Break · relax your eyes") : s.paused ? T("Paused") : s.leaves ? T("Left the app {n}×", { n: s.leaves }) : T("Stay in the app. Your tree is growing.");
}
function soundSheet() {
  const p = getProfile();
  openSheet(`<h3>${T("Focus sounds")}</h3><p class="muted small" style="margin:4px 0 14px">${T("Made live on your phone. Alpha waves work best with headphones.")}</p>
    <div class="grid3">${[{ id: "none", name: "Off", icon: "mute" }].concat(SOUNDS).map(s => `<button class="sound-btn ${Sound.current === s.id || (s.id === "none" && Sound.current === "none") ? "on" : ""}" data-s="${s.id}">${icon(s.icon, 22)}${T(s.name)}</button>`).join("")}</div>
    <div class="range-row" style="margin-top:16px"><span class="label">${icon("volume", 16)}</span><input type="range" id="sdV" min="0" max="1" step="0.05" value="${p.soundVol}"></div>`, sh => {
    rangeFill($("#sdV", sh));
    $("#sdV", sh).oninput = e => Sound.volume(+e.target.value);
    $("#sdV", sh).onchange = e => setPref("soundVol", +e.target.value);
    $$("[data-s]", sh).forEach(b => b.onclick = () => { Sound.play(b.dataset.s); setPref("sound", b.dataset.s); $$("[data-s]", sh).forEach(x => x.classList.toggle("on", x === b)); });
  });
}

// ---------- Focus mode (timer on its own) ----------
view("focus", {
  tab: "plan",
  html: () => `
    ${ph("Focus mode", "Stay on the path. Your tree grows while you focus.")}
    <div class="card stack" style="align-items:center">${focusRingHTML()}
      <div id="fmIdle" class="stack" style="width:100%">
        <div class="chips" id="fmPre" style="justify-content:center">${chipsHTML(["15", "25", "45", "60"].map(m => ({ v: m, l: m + " min" })))}</div>
        <div class="grid2"><div class="stack" style="align-items:center"><span class="label">Focus</span><div class="stepper"><button class="icon-btn" data-st="f-" aria-label="Less">−</button><input type="number" id="fmF" min="5" max="180"><button class="icon-btn" data-st="f+" aria-label="More">+</button></div><span class="tiny muted">minutes</span></div>
          <div class="stack" style="align-items:center"><span class="label">Break</span><div class="stepper"><button class="icon-btn" data-st="b-" aria-label="Less">−</button><input type="number" id="fmB" min="1" max="30"><button class="icon-btn" data-st="b+" aria-label="More">+</button></div><span class="tiny muted">minutes</span></div></div>
        <label class="switch"><input type="checkbox" id="fmLock"><span class="track"></span><span class="small grow"><b class="bold">Focus lock</b> · full screen + leave alerts</span></label>
        <button class="btn lg block" id="fmGo">${icon("play", 18)}Start focus</button>
      </div>
      <div id="fmRun" class="grid3 hidden" style="width:100%"><button class="btn ghost" id="fmPause"></button><button class="btn ghost" id="fmSnd">${icon("music", 18)}Sound</button><button class="btn danger" id="fmStop">${icon("stop", 18)}Give up</button></div>
    </div>
    <div class="section-title"><h3>Focus sounds</h3><button id="fmSndAll">All sounds</button></div>
    <div class="grid3" id="fmSounds"></div>
    <div class="grid2" id="fmStats"></div>
    <details class="card"><summary class="row" style="cursor:pointer;list-style:none"><div class="it c-slate">${icon("lock", 18)}</div><b class="bold grow">Lock the phone to Wayfinder (Android)</b>${icon("chevD", 18)}</summary>
      <ol class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.8"><li>Open phone <b>Settings</b> and search <b>"pin"</b> (App pinning or Screen pinning).</li><li>Turn it <b>on</b>.</li><li>Open Wayfinder, then open <b>Recent apps</b>.</li><li>Tap the Wayfinder icon at the top and choose <b>Pin</b>.</li><li>Other apps can't open until you unpin.</li></ol></details>`,
  init(el) {
    const p = getProfile();
    let f = p.focusMins, b = p.breakMins;
    const setF = v => { f = clamp(Math.round(v) || 25, 5, 180); $("#fmF", el).value = f; setPref("focusMins", f); paintPre(); if (!Focus.get()) this.idle(el); };
    const setB = v => { b = clamp(Math.round(v) || 5, 1, 30); $("#fmB", el).value = b; setPref("breakMins", b); };
    const paintPre = () => $$("#fmPre [data-v]", el).forEach(x => x.classList.toggle("on", +x.dataset.v === f));
    $$("#fmPre [data-v]", el).forEach(x => x.onclick = () => setF(+x.dataset.v));
    $("#fmF", el).value = f; $("#fmB", el).value = b; paintPre();
    $("#fmF", el).onchange = e => setF(+e.target.value); $("#fmB", el).onchange = e => setB(+e.target.value);
    $$("[data-st]", el).forEach(x => x.onclick = () => { const k = x.dataset.st; if (k === "f+") setF(f + 5); if (k === "f-") setF(f - 5); if (k === "b+") setB(b + 1); if (k === "b-") setB(b - 1); });
    $("#fmLock", el).checked = p.focusLock; $("#fmLock", el).onchange = e => setPref("focusLock", e.target.checked);
    $("#fmGo", el).onclick = () => { Focus.start(f, { goal: "Focus" }); this.paint(el); };
    $("#fmPause", el).onclick = () => { const s = Focus.get(); s.paused ? Focus.resume() : Focus.pause(); };
    $("#fmStop", el).onclick = async () => { if (await askSheet(T("Give up this session?"), T("Your tree will stop growing. Time so far is still saved."), T("Give up"), true)) { Focus.stop("ended"); this.paint(el); } };
    $("#fmSnd", el).onclick = soundSheet; $("#fmSndAll", el).onclick = soundSheet;
    this.unsub = Focus.on(s => { if (el.classList.contains("active")) this.paint(el); });
  },
  show(el) { this.paint(el); },
  idle(el) { const f = getProfile().focusMins; $("#frTime", el).textContent = String(f).padStart(2, "0") + ":00"; $("#frFill", el).setAttribute("stroke-dashoffset", "691"); $("#frPlant", el).innerHTML = icon("leaf", 26); $("#frSub", el).textContent = T("Ready when you are"); },
  paint(el) {
    const s = Focus.get();
    $("#fmIdle", el).classList.toggle("hidden", !!s); $("#fmRun", el).classList.toggle("hidden", !s);
    document.body.classList.toggle("no-nav", !!(s && s.mode === "focus"));
    if (s) { paintRing(el, s); $("#fmPause", el).innerHTML = s.paused ? icon("play", 18) + T("Resume") : icon("pause", 18) + T("Pause"); } else this.idle(el);
    $("#fmSounds", el).innerHTML = SOUNDS.slice(0, 3).map(x => `<button class="sound-btn ${Sound.current === x.id ? "on" : ""}" data-s="${x.id}">${icon(x.icon, 22)}${T(x.name)}</button>`).join("");
    $$("#fmSounds [data-s]", el).forEach(x => x.onclick = () => { if (Sound.current === x.dataset.s) { Sound.stop(); setPref("sound", "none"); } else { Sound.play(x.dataset.s); setPref("sound", x.dataset.s); } this.paint(el); });
    const fs = Store.get("focusStats", { clean: 0, best: 0 }), td = todayStats(), st = getStats();
    $("#fmStats", el).innerHTML = [[icon("clock", 14) + T("Today"), fmtMins(td.minutes)], [icon("tree", 14) + T("Clean streak"), fs.clean || 0], [icon("timer", 14) + T("Sessions"), st.counts.focus || 0], [icon("alert", 14) + T("Times left"), Store.get("parentLog", []).filter(x => x.type === "away").length]].map(x => `<div class="stat"><span class="k">${x[0]}</span><span class="v">${x[1]}</span></div>`).join("");
  }
});
