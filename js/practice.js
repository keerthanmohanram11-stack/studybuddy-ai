// ================= Practice: quizzes, smart flashcards, exams, answer checker, viva =================
view("practice", {
  html: () => `
    ${ph("Practice", "Mistakes are signposts, not stop signs.", { back: false })}
    <a class="card card-hero tap" href="#quiz" style="display:block"><div class="row" style="position:relative;z-index:1;gap:14px"><div class="grow"><span class="tag" style="background:rgba(255,255,255,.18);color:#fff">${icon("sparkles", 13)} Adaptive</span><h2 style="margin-top:8px">AI Quiz</h2><p class="muted small" style="margin-top:4px">Choose a chapter, 5 to 30 questions, 4 question types.</p></div><div class="it lg" style="background:rgba(255,255,255,.18);color:#fff">${icon("quiz", 26)}</div></div></a>
    <div class="grid2 stagger">
      <a class="tile" href="#cards"><span class="it c-violet">${icon("cards", 20)}</span><b>Smart flashcards</b><span id="prDue">Remember for longer</span></a>
      <a class="tile" href="#daily"><span class="it c-amber">${icon("zap", 20)}</span><b>Daily challenge</b><span id="prDaily">One question · +30 XP</span></a>
      <a class="tile" href="#mock"><span class="it c-red">${icon("exam", 20)}</span><b>Mock exam</b><span>Timed, like the real thing</span></a>
      <a class="tile" href="#checker"><span class="it c-green">${icon("checkc", 20)}</span><b>Answer checker</b><span>Marks like a CBSE teacher</span></a>
      <a class="tile" href="#viva"><span class="it c-sky">${icon("mic", 20)}</span><b>Viva practice</b><span>Answer out loud</span></a>
      <a class="tile" href="#mistakes"><span class="it c-coral">${icon("wand", 20)}</span><b>Mistake book</b><span id="prMist">Fix what you got wrong</span></a>
    </div>
    <a class="card tap row" href="#diagnostic" style="gap:14px"><div class="it c-teal lg">${icon("gauge", 24)}</div><div class="grow"><b class="bold">Find my level</b><p class="small muted">A short test across your subjects to find weak chapters</p></div>${icon("chevR", 18)}</a>`,
  show(el) {
    const due = totalDueCards(), m = getMistakes().length, d = Store.get("daily", {});
    $("#prDue", el).textContent = due ? T("{n} cards due today", { n: due }) : T("Remember for longer");
    $("#prMist", el).textContent = m ? T("{n} mistakes to fix", { n: m }) : T("Fix what you got wrong");
    $("#prDaily", el).textContent = d.date === dayKey() && d.done ? T("Done today ✓") : T("One question · +30 XP");
  }
});

// ---------- Quiz generator ----------
const QTYPES = { mcq: "multiple choice (4 options)", tf: "true/false (options exactly [\"True\",\"False\"])", fill: "fill in the blank (the question has ____ and 4 options)", ar: "assertion-reason (question text 'Assertion: ... Reason: ...' with the 4 standard CBSE options)" };
function quizPrompt(ctx, count, opts) {
  const types = (opts.types && opts.types.length ? opts.types : ["mcq"]).map(t => QTYPES[t]).join("; ");
  const level = opts.level === "adaptive" ? 'a MIX of difficulty (about one third "easy", one third "medium", one third "hard"; hard = application or real-life)' : opts.level + " difficulty";
  return "Make " + count + " quiz questions on " + (ctx.chapter ? 'the NCERT chapter "' + ctx.chapter + '"' : "my subjects") + (ctx.subject ? " (" + ctx.subject + ")" : "") + " for my class, at " + level + ". " +
    "Question types to mix: " + types + ". " + (opts.part ? "This is part " + opts.part + " of the quiz: focus on different sub-topics than the start of the chapter. " : "") +
    (opts.source ? "Base the questions ONLY on these notes:\n" + opts.source.slice(0, 5000) + "\n" : "") +
    'Return JSON exactly like {"subject":"Maths","questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"level":"medium","hint":"a small hint","explanation":"1-2 sentences"}]}. ' +
    '"answer" is the index of the correct option. "subject" is one of: Maths, Science, English, Social Science, Hindi, Computers, Physics, Chemistry, Biology, Other. Make sure every answer is correct.';
}
async function makeQuiz(ctx, count, opts) {
  const n1 = Math.min(count + (opts.level === "adaptive" ? 3 : 0), 10);
  const first = aiJSON(quizPrompt(ctx, n1, opts), { memory: false });
  const rest = [];
  for (let k = 10, part = 2; k < count; k += 10, part++) rest.push(aiJSON(quizPrompt(ctx, Math.min(10, count - k), Object.assign({}, opts, { part })), { memory: false }).then(d => d.questions || []).catch(() => []));
  const data = await first;
  return { data, more: rest.length ? Promise.all(rest).then(a => a.flat()) : null };
}

const LEVELS = ["easy", "medium", "hard"];
const LEVEL_TAG = { easy: '<span class="tag green">Easy</span>', medium: '<span class="tag amber">Medium</span>', hard: '<span class="tag red">Hard</span>' };

// Runs a quiz inside `area`. opts: subject, chapter, adaptive, ask, seconds (whole exam), perQ (per question), review, counter, again, more
function runQuiz(area, data, opts) {
  const valid = q => q && q.question && Array.isArray(q.options) && q.options.length >= 2;
  const norm = q => { q.level = LEVELS.includes(String(q.level).toLowerCase()) ? String(q.level).toLowerCase() : "medium"; q.answer = clamp(Number(q.answer) || 0, 0, q.options.length - 1); return q; };
  const pool = (data.questions || []).filter(valid).map(norm);
  if (!pool.length) { area.innerHTML = `<div class="card"><p>${T("The AI didn't send questions. Please try again.")}</p></div>`; return; }
  let total = Math.min(opts.ask || pool.length, opts.more ? (opts.ask || 99) : pool.length);
  if (opts.more) opts.more.then(extra => { extra.filter(valid).map(norm).forEach(q => pool.push(q)); total = Math.min(opts.ask || pool.length, pool.length); });
  const shown = [], answers = [], started = Date.now();
  let target = difficultyFor(opts.subject, opts.chapter), score = 0, streak = 0, best = 0, cur = null, msg = "", used5050 = false, qTimer = null;
  const deadline = opts.seconds ? Date.now() + opts.seconds * 1000 : 0;
  let exTimer = null;
  const subj = data.subject || opts.subject || "Other";

  function nextQ() {
    const unused = pool.filter(q => !shown.includes(q));
    if (!opts.adaptive) return unused[0];
    unused.sort((a, b) => Math.abs(LEVELS.indexOf(a.level) - target) - Math.abs(LEVELS.indexOf(b.level) - target));
    return unused[0];
  }
  function finish() {
    clearInterval(exTimer); clearInterval(qTimer);
    const n = shown.length, pct = Math.round(score / Math.max(1, n) * 100), secs = Math.round((Date.now() - started) / 1000);
    saveResult(subj, opts.chapter || (opts.subject ? opts.subject : "General"), score, n);
    addXP(score * 10, opts.counter || "quizzes");
    logRecord({ type: "quiz", subject: subj, chapter: opts.chapter, title: (opts.counter === "mocks" ? "Mock exam" : "Quiz") + ": " + (opts.chapter || subj), score, total: n, minutes: Math.round(secs / 60) });
    if (pct === 100) { bump("perfect"); confetti(); sfx("win"); } else if (pct >= 60) { confetti(); sfx("win"); }
    const wrong = shown.map((q, k) => ({ q, k })).filter(x => answers[x.k] !== x.q.answer).map(x => ({ src: x.q, q: x.q.question, options: x.q.options, answer: x.q.answer, chosen: answers[x.k] == null ? T("(no answer)") : x.q.options[answers[x.k]], correct: x.q.options[x.q.answer], explanation: x.q.explanation || "", subject: subj, chapter: opts.chapter || "" }));
    addMistakes(wrong.map(w => { const c = Object.assign({}, w); delete c.src; return c; }));
    const color = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
    area.innerHTML = `
      <div class="card center stack" style="align-items:center">
        <div class="ring-wrap">${ringSVG(pct, 132, 12, color)}<div class="ring-label"><div style="font-family:var(--font-head);font-size:2rem;font-weight:800;color:var(--text)">${pct}%</div><div class="tiny muted">${score}/${n}</div></div></div>
        <h2>${pct >= 80 ? T("Outstanding!") : pct >= 60 ? T("Great work!") : pct >= 40 ? T("Good effort!") : T("Let's fix these together")}</h2>
        <div class="grid3" style="width:100%"><div class="stat"><span class="v">+${score * 10}</span><span class="k">XP</span></div><div class="stat"><span class="v">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</span><span class="k">${T("Time")}</span></div><div class="stat"><span class="v">${best}</span><span class="k">${T("Best streak")}</span></div></div>
        <div class="grid2" style="width:100%"><button class="btn" id="qzAgain">${icon("refresh", 18)}${T("New quiz")}</button><a class="btn ghost" href="#progress">${icon("chart", 18)}${T("Progress")}</a></div>
      </div>
      ${wrong.length ? `<div class="card stack"><div class="row"><div class="it c-coral">${icon("wand", 20)}</div><div class="grow"><h3>${T("Learn from your mistakes")}</h3><p class="tiny muted">${T("Saved to your mistake book. The AI tutor remembers them.")}</p></div></div>
        <div>${wrong.map((w, k) => `<div class="mistake small" data-notr><b class="bold">${k + 1}. ${esc(w.q)}</b><br><span class="bad-t">✗ ${esc(w.chosen)}</span> &nbsp; <span class="good-t">✓ ${esc(w.correct)}</span>${w.explanation ? `<br><span class="muted">${esc(w.explanation)}</span>` : ""}</div>`).join("")}</div>
        <button class="btn block" id="qzExplain">${icon("lightbulb", 18)}${T("Explain my mistakes")}</button><div id="qzExOut"></div>
        <div class="grid2"><button class="btn secondary" id="qzRetry">${icon("repeat", 16)}${T("Retry wrong ones")}</button><button class="btn secondary" id="qzCards">${icon("cards", 16)}${T("Make flashcards")}</button></div></div>`
        : `<div class="card center"><p>${T("No mistakes. Try a harder level next time!")}</p></div>`}
      ${opts.review ? `<details class="card"><summary class="bold" style="cursor:pointer">${T("See all answers")}</summary>${shown.map((q, k) => `<p class="small" style="margin-top:10px" data-notr>${k + 1}. ${esc(q.question)}<br>${answers[k] === q.answer ? "✓" : "✗"} ${esc(q.options[q.answer])}</p>`).join("")}</details>` : ""}`;
    $("#qzAgain", area).onclick = opts.again;
    if (wrong.length) {
      $("#qzExplain", area).onclick = async e => {
        e.currentTarget.disabled = true; const out = $("#qzExOut", area); out.innerHTML = loadingHTML();
        try { out.innerHTML = '<div data-notr>' + md(await aiText("I got these wrong in a quiz on " + (opts.chapter || subj) + ":\n" + wrong.map((w, k) => (k + 1) + ". Q: " + w.q + " | My answer: " + w.chosen + " | Correct: " + w.correct).join("\n") + "\n\nFor each: name the concept I misunderstood, explain it simply in 2-3 sentences, and give one tip to avoid the mistake. Label them Q1, Q2...")) + "</div>"; bump("mistakesFixed", wrong.length); addXP(5); }
        catch (err) { out.innerHTML = esc(err.message); e.currentTarget.disabled = false; }
      };
      $("#qzRetry", area).onclick = () => runQuiz(area, { subject: subj, questions: wrong.map(w => Object.assign({}, w.src)) }, { subject: opts.subject, chapter: opts.chapter, again: opts.again });
      $("#qzCards", area).onclick = e => { addDeck(T("Mistakes: ") + (opts.chapter || subj), wrong.map(w => ({ front: w.q, back: w.correct + (w.explanation ? ". " + w.explanation : "") })), subj); toast(T("{n} flashcards made", { n: wrong.length }), "cards"); e.currentTarget.innerHTML = icon("chevR", 16) + T("Open flashcards"); e.currentTarget.onclick = () => go("cards"); };
    }
    if (opts.onFinish) opts.onFinish(score, n);
  }
  function showQ() {
    cur = nextQ(); if (!cur) return finish();
    shown.push(cur);
    const i = shown.length - 1;
    area.innerHTML = `<div class="card">
      <div class="row between"><span class="row" style="gap:6px">${opts.adaptive ? LEVEL_TAG[cur.level] : ""}${streak >= 2 ? `<span class="tag coral">${icon("flame", 12)} ${streak}</span>` : ""}</span><span class="small muted">${opts.seconds ? `${icon("timer", 14)} <b id="qzT"></b> · ` : ""}${opts.perQ ? `${icon("hourglass", 14)} <b id="qzQT"></b> · ` : ""}${i + 1} / ${total}</span></div>
      <div class="bar thin" style="margin:12px 0 14px"><div style="width:${Math.round(i / total * 100)}%"></div></div>
      ${msg ? `<p class="small" style="color:var(--primary);font-weight:600;margin-bottom:8px">${msg}</p>` : ""}
      <h3 data-notr style="line-height:1.45;white-space:pre-line">${esc(cur.question)}</h3>
      <div id="qzO" data-notr></div>
      ${opts.seconds ? "" : `<div class="row" style="margin-top:12px"><button class="btn sm ghost" id="qzHint" ${cur.hint ? "" : "disabled"}>${icon("lightbulb", 15)}${T("Hint")}</button><button class="btn sm ghost" id="qz50" ${used5050 || cur.options.length < 4 ? "disabled" : ""}>50:50</button><span class="grow"></span><button class="btn sm ghost" id="qzSkip">${T("Skip")}</button></div>`}
      <div id="qzFb"></div></div>`;
    const box = $("#qzO", area);
    cur.options.slice(0, 4).forEach((o, k) => { const b = document.createElement("button"); b.className = "option"; b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`; b.onclick = () => choose(k); box.appendChild(b); });
    if (!opts.seconds) {
      $("#qzHint", area).onclick = e => { e.currentTarget.disabled = true; $("#qzFb", area).innerHTML = `<div class="feedback" style="background:var(--warning-soft);color:var(--warning-text)">${icon("lightbulb", 16)} <span data-notr>${esc(cur.hint)}</span></div>`; };
      $("#qz50", area).onclick = e => { used5050 = true; e.currentTarget.disabled = true; const wrongIdx = cur.options.map((_, k) => k).filter(k => k !== cur.answer).sort(() => Math.random() - 0.5).slice(0, 2); $$(".option", area).forEach((b, k) => { if (wrongIdx.includes(k)) { b.disabled = true; b.classList.add("dim"); } }); };
      $("#qzSkip", area).onclick = () => choose(null);
    }
    if (opts.perQ) {
      let left = opts.perQ; const tEl = $("#qzQT", area); tEl.textContent = left + "s";
      clearInterval(qTimer); qTimer = setInterval(() => { left--; tEl.textContent = left + "s"; if (left <= 0) { clearInterval(qTimer); choose(null); } }, 1000);
    }
  }
  function choose(k) {
    clearInterval(qTimer);
    const q = cur, i = shown.length - 1; answers[i] = k;
    const right = k === q.answer;
    if (right) { score++; streak++; best = Math.max(best, streak); } else streak = 0;
    if (opts.adaptive) { const b4 = target; target = right ? Math.min(2, target + 1) : Math.max(0, target - 1); msg = target > b4 ? T("Nice! The next one is a bit harder.") : target < b4 ? T("Let's try an easier one first.") : ""; }
    if (opts.seconds) { next(); return; }
    sfx(right ? "good" : "bad");
    $$(".option", area).forEach((b, n) => { b.disabled = true; if (n === q.answer) b.classList.add("correct"); else if (n === k) b.classList.add("wrong"); else b.classList.add("dim"); });
    $$("#qzHint,#qz50,#qzSkip", area).forEach(b => b.disabled = true);
    $("#qzFb", area).innerHTML = `<div class="feedback ${right ? "good" : "bad"}"><b>${right ? icon("checkc", 16) + " " + T("Correct!") + (streak >= 3 ? " " + T("{n} in a row!", { n: streak }) : "") : k == null ? T("Skipped") : icon("x", 16) + " " + T("Not quite.")}</b><p data-notr>${esc(q.explanation || "")}</p></div>
      <button class="btn block" style="margin-top:12px" id="qzNext">${shown.length < total ? T("Next") + " " + icon("chevR", 18) : T("See my score")}</button>`;
    $("#qzNext", area).onclick = next;
    $("#qzNext", area).scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function next() { if (shown.length < total && pool.some(q => !shown.includes(q))) showQ(); else if (shown.length < total && opts.more) { area.querySelector("#qzFb").innerHTML = loadingHTML(T("Loading more questions…")); opts.more.then(() => (pool.some(q => !shown.includes(q)) ? showQ() : finish())); } else finish(); }
  if (opts.seconds) exTimer = setInterval(() => {
    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000)), t = $("#qzT", area);
    if (t) t.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    if (left <= 0) { toast(T("Time's up!"), "timer"); while (shown.length < total) { const q = nextQ(); if (!q) break; shown.push(q); } finish(); }
  }, 500);
  showQ();
}

// ---------- AI Quiz (setup + run) ----------
view("quiz", {
  tab: "practice",
  html: () => `
    ${ph("AI Quiz", "Gets harder when you're right, easier when you're stuck")}
    <div id="qzSetup" class="stack-lg">
      <button class="card tap row" id="qzCtx" style="gap:12px;text-align:left"><div class="it">${icon("book", 20)}</div><div class="grow"><span class="tiny muted">Chapter</span><br><b class="bold" id="qzCtxT" data-notr></b></div>${icon("chevR", 18)}</button>
      <div class="card stack">
        <span class="label">Number of questions</span><div class="chips" id="qzN">${chipsHTML(["5", "10", "15", "20", "30"])}</div>
        <span class="label" style="margin-top:6px">Question types</span><div class="chips" id="qzTy">${chipsHTML([{ v: "mcq", l: "Multiple choice" }, { v: "tf", l: "True / False" }, { v: "fill", l: "Fill in the blank" }, { v: "ar", l: "Assertion-Reason" }])}</div>
        <span class="label" style="margin-top:6px">Difficulty</span><div class="seg" id="qzLv"><button data-v="adaptive">Adaptive</button><button data-v="easy">Easy</button><button data-v="medium">Medium</button><button data-v="hard">Hard</button></div>
        <span class="label" style="margin-top:6px">Timer</span><div class="seg" id="qzTm"><button data-v="0">Off</button><button data-v="30">30 s / question</button><button data-v="60">60 s</button></div>
      </div>
      <button class="btn lg block" id="qzStart">${icon("play", 18)}Start quiz</button>
    </div>
    <div id="qzArea"></div>`,
  init(el) {
    this.ctx = {};
    const getN = wireChips($("#qzN", el), "10"), getTy = wireChips($("#qzTy", el), ["mcq"], true), getLv = wireSeg($("#qzLv", el), "adaptive"), getTm = wireSeg($("#qzTm", el), "0");
    $("#qzCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#qzCtxT", el).textContent = ctxLabel(c); });
    const start = async () => {
      if (!this.ctx.subject && !this.source) { pickContext(this.ctx, c => { this.ctx = c; $("#qzCtxT", el).textContent = ctxLabel(c); start(); }); return; }
      const area = $("#qzArea", el), count = parseInt(getN()), level = getLv();
      $("#qzSetup", el).classList.add("hidden");
      area.innerHTML = `<div class="card stack">${loadingHTML(T("Writing {n} questions for you…", { n: count }))}<div class="skel" style="height:18px;width:80%"></div><div class="skel" style="height:48px"></div><div class="skel" style="height:48px"></div></div>`;
      setLast("quiz?subject=" + encodeURIComponent(this.ctx.subject || "") + "&chapter=" + encodeURIComponent(this.ctx.chapter || ""), T("Quiz: ") + (this.ctx.chapter || this.ctx.subject || ""), "quiz");
      try {
        const { data, more } = await makeQuiz(this.ctx, count, { types: getTy(), level: level, source: this.source });
        runQuiz(area, data, { subject: this.ctx.subject, chapter: this.ctx.chapter, adaptive: level === "adaptive", ask: count, more, perQ: parseInt(getTm()) || 0, review: true, again: () => { area.innerHTML = ""; $("#qzSetup", el).classList.remove("hidden"); } });
      } catch (e) { area.innerHTML = `<div class="card stack"><p>${esc(e.message)}</p><button class="btn secondary" id="qzBack">${T("Back")}</button></div>`; $("#qzBack", area).onclick = () => { area.innerHTML = ""; $("#qzSetup", el).classList.remove("hidden"); }; }
    };
    $("#qzStart", el).onclick = start;
    this._start = start;
  },
  show(el, params) {
    const s = params.get("subject"), c = params.get("chapter"), note = params.get("note");
    this.source = null;
    if (note) { const n = getNotes().find(x => x.id === note); if (n) this.source = n.text; }
    if (s || c) { this.ctx = { subject: s || "Other", chapter: c || "" }; $("#qzArea", el).innerHTML = ""; $("#qzSetup", el).classList.remove("hidden"); }
    $("#qzCtxT", el).textContent = ctxLabel(this.ctx);
    if ((s || c) && params.get("go") !== "0" && (c || note)) { history.replaceState(null, "", "#quiz"); this._start(); }
  }
});

// ---------- Smart flashcards ----------
view("cards", {
  tab: "practice",
  html: () => `
    ${ph("Smart flashcards", "Hard cards come back sooner, easy ones later")}
    <div id="fcMake" class="card stack"><span class="label">New deck</span><div class="row"><input type="text" id="fcT" placeholder="Topic or chapter"><button class="btn" id="fcGo">${T("Make")}</button></div><button class="link-btn" id="fcCtx">${icon("book", 15)}${T("Pick an NCERT chapter")}</button></div>
    <div id="fcArea"></div>
    <div id="fcDecks" class="stack"></div>`,
  init(el) {
    const self = this, area = $("#fcArea", el);
    let deckId = null, queue = [], got = 0;
    const review = (deck, all) => {
      deckId = deck.id; queue = (all ? deck.cards : dueCards(deck)).map(c => deck.cards.indexOf(c));
      if (!queue.length) { toast(T("Nothing due in this deck. Come back later!"), "check"); return; }
      got = 0; $("#fcDecks", el).classList.add("hidden"); $("#fcMake", el).classList.add("hidden");
      setLast("cards", T("Flashcards: ") + deck.topic, "cards"); card();
    };
    const card = () => {
      const deck = getDecks().find(d => d.id === deckId); if (!queue.length) return done(deck);
      const c = deck.cards[queue[0]];
      area.innerHTML = `<div class="row between small muted" style="margin-bottom:10px"><span data-notr>${esc(deck.topic)}</span><span>${T("{n} left", { n: queue.length })}</span></div>
        <div class="flip" id="fcF"><div class="flip-inner"><div class="face" data-notr>${esc(c.front)}</div><div class="face rear" data-notr>${esc(c.back)}</div></div></div>
        <p class="small muted center" id="fcH" style="margin-top:10px">${T("Think of the answer, then tap the card")}</p>
        <div class="grid2 hidden" id="fcG" style="margin-top:12px"><button class="btn ghost" id="fcA">${icon("refresh", 18)}${T("Again")}</button><button class="btn" id="fcOk">${icon("check", 18)}${T("Got it")}</button></div>
        <div class="row" style="margin-top:12px;justify-content:center"><button class="btn sm ghost" id="fcS">${icon("volume", 15)}${T("Listen")}</button><button class="btn sm ghost" id="fcX">${T("Stop")}</button></div>`;
      $("#fcF", area).onclick = e => { e.currentTarget.classList.toggle("on"); $("#fcG", area).classList.remove("hidden"); $("#fcH", area).classList.add("hidden"); };
      $("#fcS", area).onclick = () => speak(c.front + ". " + c.back);
      $("#fcX", area).onclick = () => done(deck);
      const grade = ok => { const decks = getDecks(), d = decks.find(x => x.id === deckId); gradeCard(d.cards[queue[0]], ok); saveDecks(decks); const i = queue.shift(); if (ok) { got++; bump("cardsGot"); sfx("good"); } else { queue.push(i); sfx("bad"); } card(); };
      $("#fcA", area).onclick = () => grade(false); $("#fcOk", area).onclick = () => grade(true);
    };
    const done = deck => {
      if (got) addXP(Math.min(30, got * 2), "cards");
      area.innerHTML = `<div class="card center stack" style="align-items:center"><div class="it lg c-green">${icon("checkc", 26)}</div><h3>${T("Round complete")}</h3><p class="muted">${T("{n} cards remembered.", { n: got })}</p><a class="btn ghost" href="#quiz?chapter=${encodeURIComponent(deck.topic)}&subject=${encodeURIComponent(deck.subject || "")}">${icon("quiz", 18)}${T("Quiz me on this")}</a></div>`;
      $("#fcDecks", el).classList.remove("hidden"); $("#fcMake", el).classList.remove("hidden"); self.paint(el);
    };
    const make = async (topic, subject) => {
      if (!topic) { toast(T("Type a topic first")); return; }
      area.innerHTML = `<div class="card">${loadingHTML(T("Making flashcards…"))}</div>`;
      try {
        const d = await aiJSON('Make 10 flashcards on "' + topic + '"' + (subject ? " (" + subject + ", NCERT)" : "") + ' for my class. Return JSON {"cards":[{"front":"short question or term","back":"short clear answer"}]}', { memory: false });
        const cards = (d.cards || []).filter(c => c.front && c.back); if (!cards.length) throw new Error(T("No cards came back. Try again."));
        $("#fcT", el).value = ""; review(addDeck(topic, cards, subject), true);
      } catch (e) { area.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
    $("#fcGo", el).onclick = () => make($("#fcT", el).value.trim());
    $("#fcT", el).onkeydown = e => { if (e.key === "Enter") make($("#fcT", el).value.trim()); };
    $("#fcCtx", el).onclick = () => pickContext({}, c => make(c.chapter || c.subject, c.subject));
    this.review = review;
  },
  show(el, params) {
    $("#fcArea", el).innerHTML = ""; $("#fcDecks", el).classList.remove("hidden"); $("#fcMake", el).classList.remove("hidden");
    this.paint(el);
    if (params.get("due")) { history.replaceState(null, "", "#cards"); const d = getDecks().find(x => dueCards(x).length); if (d) this.review(d, false); }
  },
  paint(el) {
    const decks = getDecks(), box = $("#fcDecks", el);
    box.innerHTML = decks.length ? `<div class="section-title"><h3>${T("Your decks")}</h3></div><div class="list">${decks.map(d => { const due = dueCards(d).length, m = d.cards.filter(c => c.box >= 3).length, pct = Math.round(m / d.cards.length * 100);
      return `<div class="li"><div class="ring-wrap">${ringSVG(pct, 42, 5)}<div class="ring-label tiny bold">${pct}</div></div><div class="t"><b data-notr>${esc(d.topic)}</b><span>${T("{a} cards · {b} mastered", { a: d.cards.length, b: m })}${due ? ` · <span style="color:var(--accent-text);font-weight:700">${T("{n} due", { n: due })}</span>` : ""}</span></div><button class="btn sm ${due ? "" : "ghost"}" data-r="${d.id}">${due ? T("Review") : T("Practise")}</button><button class="icon-btn plain" data-x="${d.id}" aria-label="Delete deck">${icon("trash", 18)}</button></div>`; }).join("")}</div>`
      : `<div class="card flat empty"><div class="it c-violet">${icon("cards", 26)}</div><p>${T("No decks yet. Make one above, or turn notes and mistakes into cards.")}</p></div>`;
    $$("[data-r]", box).forEach(b => b.onclick = () => { const d = getDecks().find(x => x.id === b.dataset.r); this.review(d, !dueCards(d).length); });
    $$("[data-x]", box).forEach(b => b.onclick = async () => { if (await askSheet(T("Delete this deck?"), T("Its cards and progress will be removed."), T("Delete"), true)) { saveDecks(getDecks().filter(x => x.id !== b.dataset.x)); this.paint(el); } });
  }
});

// ---------- Mock exam ----------
view("mock", {
  tab: "practice",
  html: () => `${ph("Mock exam", "Timed. Results only at the end, like the real exam.")}
    <div id="mkSetup" class="stack-lg">
      <button class="card tap row" id="mkCtx" style="gap:12px;text-align:left"><div class="it c-red">${icon("exam", 20)}</div><div class="grow"><span class="tiny muted">Chapter</span><br><b class="bold" id="mkCtxT" data-notr></b></div>${icon("chevR", 18)}</button>
      <div class="card stack"><span class="label">Questions</span><div class="seg" id="mkN"><button data-v="10">10</button><button data-v="20">20</button><button data-v="30">30</button></div>
      <span class="label" style="margin-top:6px">Time</span><div class="seg" id="mkT"><button data-v="10">10 min</button><button data-v="20">20 min</button><button data-v="30">30 min</button></div></div>
      <button class="btn lg block" id="mkGo">${icon("play", 18)}Start exam</button>
    </div><div id="mkArea"></div>`,
  init(el) {
    this.ctx = {};
    const getN = wireSeg($("#mkN", el), "10"), getT = wireSeg($("#mkT", el), "10");
    $("#mkCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#mkCtxT", el).textContent = ctxLabel(c); });
    $("#mkGo", el).onclick = async () => {
      if (!this.ctx.subject) return $("#mkCtx", el).click();
      const area = $("#mkArea", el), n = parseInt(getN()); $("#mkSetup", el).classList.add("hidden");
      area.innerHTML = `<div class="card">${loadingHTML(T("Preparing your exam paper…"))}</div>`;
      try {
        const { data, more } = await makeQuiz(this.ctx, n, { types: ["mcq", "ar", "fill"], level: "exam-level (mixed easy, medium and hard)" });
        runQuiz(area, data, { subject: this.ctx.subject, chapter: this.ctx.chapter, ask: n, more, seconds: parseInt(getT()) * 60, review: true, counter: "mocks", again: () => { area.innerHTML = ""; $("#mkSetup", el).classList.remove("hidden"); } });
      } catch (e) { area.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; $("#mkSetup", el).classList.remove("hidden"); }
    };
  },
  show(el) { $("#mkCtxT", el).textContent = ctxLabel(this.ctx); }
});

// ---------- Answer checker ----------
view("checker", {
  tab: "practice",
  html: () => `${ph("Answer checker", "Marks, rubric and tips, like a CBSE teacher")}
    <div class="card stack">
      <div class="field"><label for="ckQ">Question</label><textarea id="ckQ" style="min-height:70px" placeholder="e.g. Explain the process of photosynthesis."></textarea></div>
      <span class="label">Marks</span><div class="seg" id="ckM"><button data-v="1">1</button><button data-v="2">2</button><button data-v="3">3</button><button data-v="5">5</button></div>
      <div class="field"><label for="ckA">Your answer</label><textarea id="ckA" placeholder="Type your answer, or add a photo of your handwritten answer"></textarea></div>
      <div class="row"><button class="btn sm ghost" id="ckCam">${icon("camera", 16)}Photo of my answer</button><span class="tiny muted grow" id="ckPh"></span></div>
    </div>
    <button class="btn lg block" id="ckGo">${icon("checkc", 18)}Check my answer</button>
    <div id="ckOut"></div>`,
  init(el) {
    let photo = null;
    const getM = wireSeg($("#ckM", el), "3");
    $("#ckCam", el).onclick = () => openCamera(img => { photo = img; $("#ckPh", el).textContent = T("Photo added ✓"); });
    $("#ckGo", el).onclick = async () => {
      const q = $("#ckQ", el).value.trim(), a = $("#ckA", el).value.trim(), m = getM();
      if (!q || (!a && !photo)) { toast(T("Add the question and your answer")); return; }
      const out = $("#ckOut", el); out.innerHTML = `<div class="card">${loadingHTML(T("Marking your answer…"))}</div>`;
      try {
        const d = await aiJSON('Mark this student answer fairly, like a CBSE examiner. Question: "' + q + '". Total marks: ' + m + ". " + (a ? 'Student answer: "' + a + '". ' : "The student's handwritten answer is in the photo. ") +
          'Return JSON {"marks":number,"outOf":' + m + ',"rubric":[{"criterion":"Content","got":n,"max":n,"comment":"..."}],"good":["..."],"improve":["..."],"missingKeywords":["..."],"modelAnswer":"a full-marks answer of the right length","improved":"the student\'s own answer rewritten better, keeping their ideas"}. Use 3 or 4 rubric rows (e.g. Content, Keywords, Structure, Presentation).',
          { image: photo ? { mimeType: photo.mimeType, data: photo.data } : null });
        const pct = Math.round((Number(d.marks) || 0) / (Number(d.outOf) || m) * 100);
        out.innerHTML = `<div class="card stack">
          <div class="row" style="gap:16px"><div class="ring-wrap">${ringSVG(pct, 86, 9, pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--danger)")}<div class="ring-label"><b style="font-family:var(--font-head);font-size:1.3rem;color:var(--text)">${esc(d.marks)}/${esc(d.outOf || m)}</b></div></div><div class="grow"><h3>${pct >= 70 ? T("Strong answer") : pct >= 40 ? T("Good start") : T("Needs work")}</h3><p class="small muted">${T("Here's how an examiner would see it.")}</p></div></div>
          ${(d.rubric || []).map(r => `<div><div class="row between small"><b class="bold" data-notr>${esc(r.criterion)}</b><span>${esc(r.got)}/${esc(r.max)}</span></div><div class="bar thin" style="margin:6px 0"><div style="width:${Math.round(r.got / Math.max(1, r.max) * 100)}%"></div></div><p class="tiny muted" data-notr>${esc(r.comment || "")}</p></div>`).join("")}
          ${(d.good || []).length ? `<div><b class="bold small">${icon("thumbup", 15)} ${T("What's good")}</b><ul class="small" data-notr style="margin:6px 0 0;padding-left:20px">${d.good.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
          ${(d.improve || []).length ? `<div><b class="bold small">${icon("target", 15)} ${T("To get full marks")}</b><ul class="small" data-notr style="margin:6px 0 0;padding-left:20px">${d.improve.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
          ${(d.missingKeywords || []).length ? `<div><b class="bold small">${T("Keywords to add")}</b><div class="chips" style="margin-top:8px" data-notr>${d.missingKeywords.map(k => `<span class="tag coral">${esc(k)}</span>`).join("")}</div></div>` : ""}
          <div class="seg" id="ckV"><button data-v="model">${T("Model answer")}</button><button data-v="improved">${T("Your answer, improved")}</button></div>
          <div class="answer" id="ckVO" data-notr></div>
          <button class="btn sm ghost" id="ckSave">${icon("notes", 16)}${T("Save to notes")}</button></div>`;
        const show = v => $("#ckVO", out).innerHTML = md(v === "model" ? d.modelAnswer || "" : d.improved || "");
        wireSeg($("#ckV", out), "model", show); show("model");
        $("#ckSave", out).onclick = () => { saveNote({ title: T("Answer: ") + q.slice(0, 50), text: "**" + q + "**\n\n" + (d.modelAnswer || "") }); toast(T("Saved to My notes"), "notes"); };
        addXP(10, "checks"); logRecord({ type: "check", title: q.slice(0, 80), score: Number(d.marks) || 0, total: Number(d.outOf) || Number(m) });
      } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
  }
});

// ---------- Viva ----------
view("viva", {
  tab: "practice",
  html: () => `${ph("Viva practice", "The AI asks, you answer out loud")}
    <div id="vvSetup" class="stack-lg"><button class="card tap row" id="vvCtx" style="gap:12px;text-align:left"><div class="it c-sky">${icon("mic", 20)}</div><div class="grow"><span class="tiny muted">Chapter</span><br><b class="bold" id="vvCtxT" data-notr></b></div>${icon("chevR", 18)}</button>
    <button class="btn lg block" id="vvGo">${icon("play", 18)}Start viva</button></div><div id="vvArea"></div>`,
  init(el) {
    this.ctx = {}; const area = $("#vvArea", el); let qs = [], i = 0, total = 0;
    $("#vvCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#vvCtxT", el).textContent = ctxLabel(c); });
    const ask = () => {
      const q = qs[i];
      area.innerHTML = `<div class="card stack"><span class="small muted">${T("Question {a} of {b}", { a: i + 1, b: qs.length })}</span><h3 data-notr>${esc(q.question)}</h3>
        <button class="btn lg block secondary pulse" id="vvMic">${icon("mic", 20)}${T("Tap and answer out loud")}</button>
        <textarea id="vvA" placeholder="${T("…or type your answer")}" data-notr style="min-height:80px"></textarea>
        <div class="row"><button class="btn sm ghost" id="vvRep">${icon("volume", 15)}${T("Repeat")}</button><span class="grow"></span><button class="btn" id="vvSub">${T("Submit")}</button></div><div id="vvFb"></div></div>`;
      speak(q.question);
      $("#vvRep", area).onclick = () => speak(q.question);
      $("#vvMic", area).onclick = e => { const b = e.currentTarget; b.innerHTML = icon("mic", 20) + T("Listening…"); listen(t => { $("#vvA", area).value = t; }, () => { b.innerHTML = icon("mic", 20) + T("Tap and answer out loud"); }); };
      $("#vvSub", area).onclick = async () => {
        const a = $("#vvA", area).value.trim(); if (!a) return toast(T("Answer first"));
        $("#vvFb", area).innerHTML = loadingHTML();
        try {
          const d = await aiJSON('Viva question: "' + q.question + '". Expected points: ' + JSON.stringify(q.points || []) + '. Student said: "' + a + '". Score fairly out of 10. Return JSON {"score":n,"feedback":"one or two kind sentences","missed":["key point they missed"]}', { memory: false });
          const sc = clamp(Number(d.score) || 0, 0, 10); total += sc;
          $("#vvFb", area).innerHTML = `<div class="feedback ${sc >= 6 ? "good" : "bad"}"><b>${sc}/10</b><p data-notr>${esc(d.feedback)}</p>${(d.missed || []).length ? `<p class="tiny" data-notr>${T("Missed:")} ${esc(d.missed.join(", "))}</p>` : ""}</div><button class="btn block" id="vvN" style="margin-top:10px">${i < qs.length - 1 ? T("Next question") : T("See result")}</button>`;
          speak(d.feedback); $("#vvN", area).onclick = () => { i++; i < qs.length ? ask() : finish(); };
        } catch (e) { $("#vvFb", area).innerHTML = esc(e.message); }
      };
    };
    const finish = () => {
      const pct = Math.round(total / (qs.length * 10) * 100);
      saveResult(this.ctx.subject, this.ctx.chapter, Math.round(total / 10), qs.length); addXP(15, "vivas");
      logRecord({ type: "viva", subject: this.ctx.subject, chapter: this.ctx.chapter, title: "Viva", score: Math.round(total / 10), total: qs.length });
      area.innerHTML = `<div class="card center stack" style="align-items:center"><div class="ring-wrap">${ringSVG(pct, 110, 10)}<div class="ring-label"><b style="font-family:var(--font-head);font-size:1.5rem;color:var(--text)">${pct}%</b></div></div><h3>${T("Viva complete")}</h3><p class="muted">${T("Speaking answers out loud builds real confidence.")}</p><button class="btn" id="vvAg">${T("Practise again")}</button></div>`;
      if (pct >= 60) confetti();
      $("#vvAg", area).onclick = () => { area.innerHTML = ""; $("#vvSetup", el).classList.remove("hidden"); };
    };
    $("#vvGo", el).onclick = async () => {
      if (!this.ctx.subject) return $("#vvCtx", el).click();
      $("#vvSetup", el).classList.add("hidden"); area.innerHTML = `<div class="card">${loadingHTML()}</div>`;
      try { const d = await aiJSON('Make 4 short viva (oral exam) questions on "' + (this.ctx.chapter || this.ctx.subject) + '" for my class. Return JSON {"questions":[{"question":"...","points":["key point","key point"]}]}', { memory: false }); qs = (d.questions || []).filter(q => q.question); if (!qs.length) throw new Error(T("No questions came back. Try again.")); i = 0; total = 0; ask(); }
      catch (e) { area.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; $("#vvSetup", el).classList.remove("hidden"); }
    };
  },
  show(el) { $("#vvCtxT", el).textContent = ctxLabel(this.ctx); }
});

// ---------- Daily challenge ----------
view("daily", {
  tab: "practice",
  html: () => `${ph("Daily challenge", "One question a day. Keep the streak alive.")}<div id="dyArea"></div>`,
  async show(el) {
    const area = $("#dyArea", el); let d = Store.get("daily", {});
    const st = Store.get("dailyStreak", { n: 0, last: "" });
    const head = `<div class="card row" style="gap:14px"><div class="it c-amber lg">${icon("zap", 24)}</div><div class="grow"><b class="bold">${T("Challenge streak")}</b><p class="small muted">${T("{n} days in a row", { n: st.last === dayKey() || st.last === dayKey(1) ? st.n : 0 })}</p></div></div>`;
    if (d.date === dayKey() && d.done) {
      const tm = new Date(); tm.setHours(24, 0, 0, 0); const h = Math.floor((tm - Date.now()) / 3600000), m = Math.floor((tm - Date.now()) / 60000) % 60;
      area.innerHTML = head + `<div class="card center stack" style="align-items:center;margin-top:14px"><div class="it lg c-green">${icon("checkc", 26)}</div><h3>${T("Done for today")}</h3><p class="muted">${T("Next challenge in {h}h {m}m", { h, m })}</p><a class="btn ghost" href="#quiz">${T("Want more? Take a quiz")}</a></div>`;
      return;
    }
    if (d.date !== dayKey() || !d.q) {
      area.innerHTML = head + `<div class="card" style="margin-top:14px">${loadingHTML(T("Picking today's challenge…"))}</div>`;
      const w = weakChapters()[0], p = getProfile();
      const ctx = w ? { subject: w.subject, chapter: w.chapter } : { subject: p.subjects[new Date().getDate() % p.subjects.length], chapter: "" };
      try { const r = await aiJSON(quizPrompt(ctx, 1, { level: "medium", types: ["mcq"] }), { memory: false }); d = { date: dayKey(), q: r.questions[0], subject: r.subject || ctx.subject, chapter: ctx.chapter, done: false }; Store.set("daily", d); }
      catch (e) { area.innerHTML = head + `<div class="card" style="margin-top:14px"><p>${esc(e.message)}</p></div>`; return; }
    }
    const q = d.q;
    area.innerHTML = head + `<div class="card" style="margin-top:14px"><span class="tag indigo" data-notr>${esc(d.chapter || d.subject)}</span><h3 style="margin-top:10px" data-notr>${esc(q.question)}</h3><div id="dyO" data-notr></div><div id="dyF"></div></div>`;
    q.options.forEach((o, k) => {
      const b = document.createElement("button"); b.className = "option"; b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`;
      b.onclick = () => {
        const right = k === Number(q.answer);
        $$(".option", area).forEach((x, n) => { x.disabled = true; if (n === Number(q.answer)) x.classList.add("correct"); else if (n === k) x.classList.add("wrong"); });
        d.done = true; Store.set("daily", d);
        const s2 = Store.get("dailyStreak", { n: 0, last: "" }); s2.n = s2.last === dayKey(1) ? s2.n + 1 : 1; s2.last = dayKey(); Store.set("dailyStreak", s2);
        saveResult(d.subject, d.chapter || d.subject, right ? 1 : 0, 1); addXP(right ? 30 : 10, "daily"); sfx(right ? "win" : "bad"); if (right) confetti();
        $("#dyF", area).innerHTML = `<div class="feedback ${right ? "good" : "bad"}"><b>${right ? T("Brilliant! +30 XP") : T("Good try! +10 XP")}</b><p data-notr>${esc(q.explanation || "")}</p></div>`;
      };
      $("#dyO", area).appendChild(b);
    });
  }
});

// ---------- Find my level ----------
view("diagnostic", {
  tab: "practice",
  html: () => `${ph("Find my level", "2 questions per subject · about 3 minutes")}
    <div id="dgA"><div class="card stack"><p>${T("Wayfinder asks a few questions from each of your subjects, then shows your strong and weak areas and plans your revision.")}</p><button class="btn lg block" id="dgGo">${icon("play", 18)}${T("Start")}</button></div></div>`,
  init(el) {
    const area = $("#dgA", el);
    $("#dgGo", el).onclick = async () => {
      const subs = getProfile().subjects.slice(0, 5);
      area.innerHTML = `<div class="card">${loadingHTML(T("Building your test…"))}</div>`;
      try {
        const d = await aiJSON("Make a diagnostic test for my class: 2 multiple choice questions for each of: " + subs.join(", ") + ". Use important NCERT chapters. " + 'Return JSON {"questions":[{"subject":"Maths","chapter":"exact NCERT chapter name","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}', { memory: false });
        const qs = (d.questions || []).filter(q => q.question && q.options); let i = 0; const res = {};
        const next = () => {
          if (i >= qs.length) {
            Object.values(res).forEach(r => saveResult(r.subject, r.chapter, r.c, r.t)); addXP(20, "diagnostic");
            const by = {}; qs.forEach(q => { const s = q.subject || "Other"; by[s] = by[s] || [0, 0]; by[s][1]++; if (q._ok) by[s][0]++; });
            area.innerHTML = `<div class="card stack"><h3>${T("Your starting level")}</h3>${Object.keys(by).map(s => { const p = Math.round(by[s][0] / by[s][1] * 100); return `<div><div class="row between small"><span class="row"><span class="it sm ${subjColor(s)}">${icon(subjIcon(s), 15)}</span><b class="bold">${esc(s)}</b></span><b>${p}%</b></div><div class="bar" style="margin-top:6px"><div style="width:${p}%"></div></div></div>`; }).join("")}<p class="small muted">${T("Weak chapters now appear in your daily plan and progress.")}</p><a class="btn block" href="#progress">${T("See my progress")}</a></div>`;
            return;
          }
          const q = qs[i];
          area.innerHTML = `<div class="card"><div class="row between small muted"><span data-notr>${esc(q.subject)}</span><span>${i + 1}/${qs.length}</span></div><div class="bar thin" style="margin:10px 0 14px"><div style="width:${i / qs.length * 100}%"></div></div><h3 data-notr>${esc(q.question)}</h3><div id="dgO" data-notr></div></div>`;
          q.options.slice(0, 4).forEach((o, k) => { const b = document.createElement("button"); b.className = "option"; b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`; b.onclick = () => { q._ok = k === Number(q.answer); const key = (q.subject || "Other") + (q.chapter || ""); res[key] = res[key] || { subject: q.subject, chapter: q.chapter || q.subject, c: 0, t: 0 }; res[key].t++; if (q._ok) res[key].c++; i++; next(); }; $("#dgO", area).appendChild(b); });
        };
        next();
      } catch (e) { area.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
  }
});

// ---------- Mistake book ----------
view("mistakes", {
  tab: "practice",
  html: () => `${ph("Mistake book", "Every wrong answer, ready to fix")}<div class="chips scroll" id="mbF"></div><div id="mbA"></div><div id="mbList" class="stack"></div>`,
  init(el) { this.f = "All"; },
  show(el) { this.paint(el); },
  paint(el) {
    const all = getMistakes(), subs = ["All"].concat([...new Set(all.map(m => m.subject).filter(Boolean))]);
    $("#mbF", el).innerHTML = subs.map(s => `<button class="chip ${s === this.f ? "on" : ""}" data-f="${esc(s)}">${esc(s)}</button>`).join("");
    $$("[data-f]", el).forEach(b => b.onclick = () => { this.f = b.dataset.f; this.paint(el); });
    const list = all.filter(m => this.f === "All" || m.subject === this.f);
    $("#mbA", el).innerHTML = list.length ? `<div class="grid2"><button class="btn" id="mbQuiz">${icon("repeat", 16)}${T("Retry as a quiz")}</button><button class="btn secondary" id="mbCards">${icon("cards", 16)}${T("Make flashcards")}</button></div>` : "";
    $("#mbList", el).innerHTML = list.length ? list.slice(0, 60).map(m => `<div class="card flat" style="padding:14px"><div class="row between"><span class="tag" data-notr>${esc(m.chapter || m.subject)}</span><button class="icon-btn plain" data-del="${m.id}" aria-label="Remove">${icon("check", 18)}</button></div><p class="bold small" style="margin-top:8px" data-notr>${esc(m.q)}</p><p class="small" data-notr><span class="bad-t">✗ ${esc(m.chosen)}</span> &nbsp; <span class="good-t">✓ ${esc(m.correct)}</span></p>${m.explanation ? `<p class="tiny muted" data-notr>${esc(m.explanation)}</p>` : ""}</div>`).join("")
      : `<div class="card flat empty"><div class="it c-green">${icon("checkc", 26)}</div><p>${T("No mistakes saved. Wrong quiz answers appear here so you can fix them.")}</p></div>`;
    $$("[data-del]", el).forEach(b => b.onclick = () => { Store.set("mistakes", getMistakes().filter(m => m.id !== b.dataset.del)); bump("mistakesFixed"); toast(T("Marked as fixed"), "check"); this.paint(el); });
    if (list.length) {
      $("#mbQuiz", el).onclick = () => { const qs = list.filter(m => m.options).slice(0, 15).map(m => ({ question: m.q, options: m.options, answer: m.answer, explanation: m.explanation })); if (!qs.length) return toast(T("These older mistakes can't be replayed. Make flashcards instead.")); $("#mbList", el).innerHTML = ""; $("#mbA", el).innerHTML = ""; runQuiz($("#mbList", el), { subject: list[0].subject, questions: qs }, { subject: this.f === "All" ? "" : this.f, chapter: T("Mistake book"), again: () => this.paint(el) }); };
      $("#mbCards", el).onclick = () => { addDeck(T("Mistake book"), list.slice(0, 20).map(m => ({ front: m.q, back: m.correct + (m.explanation ? ". " + m.explanation : "") }))); toast(T("Flashcards made"), "cards"); go("cards"); };
    }
  }
});
