// ================= Practice tab: Quiz, Flashcards, Mock exam, Answer checker, Viva, Daily challenge, Diagnostic =================
view("practice", {
  html: () => `
    <div><h1>✏️ Practice</h1><p class="muted tagline" data-tag="practice">Mistakes are signposts, not stop signs.</p></div>
    <a class="glass card row" href="#diagnostic" style="text-decoration:none;color:var(--text)">
      <div style="font-size:36px">🩺</div>
      <div class="grow"><h3>Find my level</h3><p class="muted small">A short test that finds your weak topics</p></div><span class="muted">›</span>
    </a>
    <div class="grid2">
      <a class="glass tile" href="#quiz"><span class="ico">📝</span><b>AI Quiz</b><span>Adapts to you</span></a>
      <a class="glass tile" href="#cards"><span class="ico">🃏</span><b>Smart cards</b><span>Remember forever</span></a>
      <a class="glass tile" href="#mock"><span class="ico">🎓</span><b>Mock exam</b><span>Timed test</span></a>
      <a class="glass tile" href="#checker"><span class="ico">✍️</span><b>Answer checker</b><span>Marks like a teacher</span></a>
      <a class="glass tile" href="#viva"><span class="ico">🎤</span><b>Viva practice</b><span>Speak your answers</span></a>
      <a class="glass tile" href="#daily"><span class="ico">🎯</span><b>Daily challenge</b><span>+30 XP</span></a>
    </div>
    <button class="btn ghost full" id="prWeak">🎯 Fix my weak spot</button>
  `,
  init(el) {
    $("#prWeak", el).addEventListener("click", () => {
      const w = revisionDue()[0] || weakTopics()[0];
      if (!w) { toast("🎉 No weak topics yet. Take a few quizzes first!"); return; }
      go("quiz?topic=" + encodeURIComponent(w.name));
    });
  }
});

// ---------- Shared quiz runner ----------
function quizPrompt(topic, count, difficulty, adaptive) {
  return 'Make a ' + count + '-question multiple choice quiz on "' + topic + '" ' +
    (adaptive ? 'with a MIX of difficulty: about one third "easy", one third "medium" and one third "hard" (hard = application or real-life questions). ' : 'at ' + difficulty + ' difficulty ') +
    'for my class. Return JSON exactly like: {"subject":"Maths","questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"level":"medium","explanation":"..."}]}. ' +
    '"subject" is one of: Maths, Science, English, Social Science, Hindi, Computers, Physics, Chemistry, Biology, Other. "answer" is the index (0-3) of the correct option. "level" is easy, medium or hard. Keep explanations to 1-2 sentences.';
}
const LEVELS = ["easy", "medium", "hard"];
const LEVEL_TAG = { easy: "🟢 Easy", medium: "🟡 Medium", hard: "🔴 Hard" };

// Runs a quiz. opts: topic, seconds (exam timer), review, counter, again, onFinish,
// adaptive (pick harder/easier questions as you go), ask (how many to ask from the pool)
function runQuiz(area, data, opts) {
  const pool = (data.questions || []).filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  if (!pool.length) { area.innerHTML = `<div class="glass card">⚠️ The AI didn't send questions. Please try again.</div>`; return; }
  pool.forEach(q => { q.level = LEVELS.includes(String(q.level).toLowerCase()) ? String(q.level).toLowerCase() : "medium"; q.answer = Number(q.answer) || 0; });
  const total = Math.min(opts.ask || pool.length, pool.length);
  const shown = [], answers = [];
  let target = LEVELS.indexOf(difficultyFor(opts.topic)); if (target < 0) target = 1;
  let score = 0, current = null, levelMsg = "";
  const deadline = opts.seconds ? Date.now() + opts.seconds * 1000 : 0;
  let tick = null;

  function pickNext() {
    const unused = pool.filter(q => !shown.includes(q));
    if (!opts.adaptive) return unused[0];
    // choose the unused question closest to the level the student is ready for
    unused.sort((a, b) => Math.abs(LEVELS.indexOf(a.level) - target) - Math.abs(LEVELS.indexOf(b.level) - target));
    return unused[0];
  }

  function finish() {
    clearInterval(tick);
    const n = shown.length;
    const pct = Math.round(score / n * 100);
    saveResult(opts.topic, data.subject || "Other", score, n);
    addXP(score * 10, opts.counter || "quizzes");
    if (pct === 100) { const s = getStats(); s.counts.perfect = (s.counts.perfect || 0) + 1; Store.set("stats", s); checkBadges(); confetti(); }
    else if (pct >= 60) confetti();

    const wrong = shown.map((q, k) => ({ q, k })).filter(x => answers[x.k] !== x.q.answer).map(x => ({
      src: x.q, q: x.q.question, chosen: answers[x.k] == null ? "(no answer)" : x.q.options[answers[x.k]],
      correct: x.q.options[x.q.answer], explanation: x.q.explanation || "", topic: opts.topic, subject: data.subject || "Other"
    }));
    addMistakes(wrong.map(w => ({ q: w.q, chosen: w.chosen, correct: w.correct, explanation: w.explanation, topic: w.topic, subject: w.subject })));

    area.innerHTML = `
      <div class="glass card col center" style="align-items:center">
        <div style="font-size:52px">${pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : "💪"}</div>
        <h2>You scored ${score} / ${n}</h2>
        <p class="muted">${pct >= 60 ? "Great job! +" + score * 10 + " XP" : "Keep going! This topic is now on your revision list."}</p>
        <div class="row"><button class="btn" id="qzAgain">New quiz</button><a class="btn ghost" href="#progress">See progress</a></div>
      </div>
      ${wrong.length ? `
      <div class="glass card col" id="qzMist">
        <h3>🧠 Learn from your mistakes</h3>
        <p class="muted small">Saved to your mistake book. The AI tutor will remember them too.</p>
        ${wrong.map((w, k) => `<div class="mistake"><b>${k + 1}. ${esc(w.q)}</b><br><span class="bad">❌ You: ${esc(w.chosen)}</span><br><span class="good">✅ Answer: ${esc(w.correct)}</span>${w.explanation ? `<br><span class="muted small">${esc(w.explanation)}</span>` : ""}</div>`).join("")}
        <button class="btn full" id="qzExplain">💡 Explain my mistakes</button>
        <div id="qzExplainOut" class="answer"></div>
        <div class="grid2"><button class="btn ghost" id="qzRetry">🔁 Retry wrong ones</button><button class="btn ghost" id="qzCards">🃏 Make flashcards</button></div>
      </div>` : `<div class="glass card center">🌟 No mistakes. Try a harder topic next!</div>`}
      ${opts.review && wrong.length < n ? `<details class="glass card"><summary style="cursor:pointer"><b>See all answers</b></summary>${shown.map((q, k) => `<p class="small">${k + 1}. ${esc(q.question)}<br>${answers[k] === q.answer ? "✅" : "❌"} ${esc(q.options[q.answer])}</p>`).join("")}</details>` : ""}`;
    $("#qzAgain", area).onclick = opts.again;
    if (wrong.length) {
      $("#qzExplain", area).onclick = async (e) => {
        e.target.disabled = true;
        const out = $("#qzExplainOut", area);
        out.innerHTML = LOADING;
        try {
          const list = wrong.map((w, k) => (k + 1) + ". Q: " + w.q + " | My answer: " + w.chosen + " | Correct: " + w.correct).join("\n");
          out.innerHTML = fmt(await aiText("I got these questions wrong in a quiz on " + opts.topic + ":\n" + list +
            "\n\nFor each one: name the concept I misunderstood, explain it simply in 2-3 sentences, and give one tip so I don't make that mistake again. Label them Q1, Q2 and so on."));
          addXP(5, "mistakesFixed");
        } catch (err) { out.innerHTML = "⚠️ " + esc(err.message); e.target.disabled = false; }
      };
      $("#qzRetry", area).onclick = () => runQuiz(area, { subject: data.subject, questions: wrong.map(w => w.src) }, { topic: opts.topic, again: opts.again });
      $("#qzCards", area).onclick = (e) => {
        addDeck("Mistakes: " + opts.topic, wrong.map(w => ({ front: w.q, back: "✅ " + w.correct + (w.explanation ? ". " + w.explanation : "") })));
        toast("🃏 " + wrong.length + " flashcards made from your mistakes");
        e.target.textContent = "Open flashcards →";
        e.target.onclick = () => go("cards");
      };
    }
    if (opts.onFinish) opts.onFinish(score, n);
  }

  function showQ() {
    current = pickNext();
    shown.push(current);
    const i = shown.length - 1;
    area.innerHTML = `
      <div class="glass card">
        <div class="row between"><span class="muted small">${esc(opts.topic)}${opts.adaptive ? ' · <span class="tag">' + LEVEL_TAG[current.level] + "</span>" : ""}</span><span class="muted small">${opts.seconds ? '⏱ <b id="qzTime"></b> · ' : ""}${i + 1} / ${total}</span></div>
        <div class="bar" style="margin:10px 0 14px"><div style="width:${Math.round(i / total * 100)}%"></div></div>
        ${levelMsg ? `<p class="small" style="margin:0 0 8px;color:var(--accent)">${levelMsg}</p>` : ""}
        <h3>${esc(current.question)}</h3>
        <div id="qzOpts"></div><div id="qzFb"></div>
      </div>`;
    const box = $("#qzOpts", area);
    current.options.slice(0, 4).forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "option";
      b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`;
      b.onclick = () => pick(k);
      box.appendChild(b);
    });
  }
  function next() { if (shown.length < total) showQ(); else finish(); }
  function pick(k) {
    const q = current, i = shown.length - 1;
    answers[i] = k;
    const right = k === q.answer;
    if (right) score++;
    if (opts.adaptive) {
      const before = target;
      target = right ? Math.min(2, target + 1) : Math.max(0, target - 1);
      levelMsg = target > before ? "⬆️ Nice! Next one is a bit harder." : target < before ? "⬇️ Let's try an easier one first." : "";
    }
    if (opts.seconds) { next(); return; } // exam mode: no feedback until the end
    $$(".option", area).forEach((b, n) => {
      b.disabled = true;
      if (n === q.answer) b.classList.add("correct");
      else if (n === k) b.classList.add("wrong");
    });
    $("#qzFb", area).innerHTML = `<p class="answer" style="margin:12px 0">${right ? "✅ Correct! +10 XP. " : "❌ Not quite. "}${esc(q.explanation || "")}</p>
      <button class="btn full">${shown.length < total ? "Next →" : "See my score"}</button>`;
    $("#qzFb button", area).onclick = next;
  }
  if (opts.seconds) {
    tick = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      const t = $("#qzTime", area);
      if (t) t.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      if (left <= 0) {
        toast("⏰ Time's up!");
        // unanswered questions count as wrong
        while (shown.length < total) shown.push(pickNext());
        finish();
      }
    }, 500);
  }
  showQ();
}

// ---------- AI Quiz ----------
view("quiz", {
  tab: "practice",
  html: () => `
    ${head("📝 AI Quiz", "Gets harder when you're right, easier when you're stuck")}
    <div class="glass card col">
      <div class="field"><label for="qzTopic">Topic</label><input type="text" id="qzTopic" placeholder="e.g. Fractions, Photosynthesis, Tenses"></div>
      <div class="pills" id="qzCount">${pillsHTML(["5 questions", "10 questions"])}</div>
      <button class="btn full" id="qzStart">Start quiz</button>
    </div>
    <div id="qzArea"></div>
  `,
  init(el) {
    const getCount = wireChoices($("#qzCount", el), "5 questions", false);
    const area = $("#qzArea", el);
    const start = async () => {
      const topic = $("#qzTopic", el).value.trim();
      if (!topic) { toast("Type a topic first"); $("#qzTopic", el).focus(); return; }
      const count = parseInt(getCount());
      setLast("quiz?topic=" + encodeURIComponent(topic), "Quiz: " + topic, "📝");
      area.innerHTML = `<div class="glass card">${LOADING.replace("Thinking…", "Making an adaptive quiz…")}</div>`;
      try {
        const data = await aiJSON(quizPrompt(topic, count + 3, "", true));
        runQuiz(area, data, { topic, again: start, adaptive: true, ask: count });
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)} <button class="btn sm ghost">Retry</button></div>`; $("button", area).onclick = start; }
    };
    $("#qzStart", el).addEventListener("click", start);
    $("#qzTopic", el).addEventListener("keydown", e => { if (e.key === "Enter") start(); });
    this._start = start;
  },
  show(el, params) {
    const t = params.get("topic");
    if (t) { $("#qzTopic", el).value = t; this._start(); }
  }
});

// ---------- Smart flashcards (spaced repetition) ----------
view("cards", {
  tab: "practice",
  html: () => `
    ${head("🃏 Smart flashcards", "Cards you find hard come back sooner")}
    <div class="row"><input type="text" id="fcTopic" placeholder="New deck topic, e.g. Parts of a cell"><button class="btn" id="fcGo">Make</button></div>
    <div id="fcArea"></div>
    <div id="fcDecks" class="col"></div>
  `,
  init(el) {
    const self = this;
    const area = $("#fcArea", el);
    let deckId = null, queue = [], done = 0, got = 0;

    function review(deck, all) {
      deckId = deck.id;
      setLast("cards", "Flashcards: " + deck.topic, "🃏");
      queue = (all ? deck.cards : dueCards(deck)).map((c, i) => deck.cards.indexOf(c));
      if (!queue.length) { toast("✅ Nothing due in this deck. Come back later!"); return; }
      done = 0; got = 0;
      $("#fcDecks", el).classList.add("hidden");
      showCard();
    }
    function showCard() {
      const deck = getDecks().find(d => d.id === deckId);
      if (!queue.length) return finish(deck);
      const c = deck.cards[queue[0]];
      area.innerHTML = `
        <div class="row between small muted" style="margin-bottom:8px"><span>${esc(deck.topic)}</span><span>${queue.length} left</span></div>
        <div class="flip" id="fcFlip"><div class="flip-inner"><div class="glass face">${esc(c.front)}</div><div class="glass face rear">${esc(c.back)}</div></div></div>
        <p class="muted small center" id="fcHint" style="margin-top:8px">Think of the answer, then tap the card to check</p>
        <div class="row hidden" id="fcGrade" style="margin-top:10px">
          <button class="btn ghost grow" id="fcAgain">😕 Again</button>
          <button class="btn grow" id="fcGot">🙂 Got it</button>
        </div>
        <div class="row" style="margin-top:10px"><button class="btn sm ghost" id="fcSay">🔊 Listen</button><button class="btn sm ghost" id="fcStop">⏹ Stop</button></div>`;
      $("#fcFlip", area).onclick = e => {
        e.currentTarget.classList.toggle("on");
        $("#fcGrade", area).classList.remove("hidden");
        $("#fcHint", area).classList.add("hidden");
      };
      $("#fcSay", area).onclick = () => speak(c.front + ". " + c.back);
      $("#fcStop", area).onclick = () => finish(deck);
      const grade = gotIt => {
        const decks = getDecks();
        const d = decks.find(x => x.id === deckId);
        gradeCard(d.cards[queue[0]], gotIt);
        saveDecks(decks);
        const idx = queue.shift();
        if (gotIt) { got++; const s = getStats(); s.counts.cardsGot = (s.counts.cardsGot || 0) + 1; Store.set("stats", s); }
        else queue.push(idx); // see it again at the end of this round
        done++;
        showCard();
      };
      $("#fcAgain", area).onclick = () => grade(false);
      $("#fcGot", area).onclick = () => grade(true);
    }
    function finish(deck) {
      if (got) addXP(Math.min(30, got * 2), "cards");
      area.innerHTML = `<div class="glass card col center" style="align-items:center">
        <div style="font-size:44px">🎉</div><h3>Round done!</h3>
        <p class="muted">${got} cards remembered. Hard cards will come back sooner, easy ones later.</p>
        <a class="btn ghost" href="#quiz?topic=${encodeURIComponent(deck.topic)}">📝 Quiz me on ${esc(deck.topic)}</a></div>`;
      $("#fcDecks", el).classList.remove("hidden");
      self.paintDecks(el);
    }
    async function make(topic, sourceText) {
      if (!topic) { toast("Type a topic first"); return; }
      area.innerHTML = `<div class="glass card">${LOADING}</div>`;
      try {
        const prompt = sourceText
          ? 'Make 10 flashcards from these notes. Return JSON: {"cards":[{"front":"short question or term","back":"short clear answer"}]}. Notes:\n' + sourceText.slice(0, 6000)
          : 'Make 10 flashcards on "' + topic + '" for my class. Return JSON: {"cards":[{"front":"short question or term","back":"short clear answer"}]}';
        const d = await aiJSON(prompt);
        const cards = (d.cards || []).filter(c => c.front && c.back);
        if (!cards.length) throw new Error("No cards came back. Try again.");
        const deck = addDeck(topic, cards);
        toast("🃏 Deck saved: " + cards.length + " cards");
        $("#fcTopic", el).value = "";
        review(deck, true);
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    }
    $("#fcGo", el).addEventListener("click", () => make($("#fcTopic", el).value.trim()));
    $("#fcTopic", el).addEventListener("keydown", e => { if (e.key === "Enter") make($("#fcTopic", el).value.trim()); });
    this._review = review;
    this._make = make;
  },
  paintDecks(el) {
    const decks = getDecks();
    const box = $("#fcDecks", el);
    if (!decks.length) { box.innerHTML = `<div class="glass empty">No decks yet. Type a topic above and tap Make.</div>`; return; }
    box.innerHTML = `<h3>📚 Your decks</h3>` + decks.map(d => {
      const due = dueCards(d).length, known = d.cards.filter(c => c.box >= 3).length;
      return `<div class="glass item">
        <div class="grow"><b>${esc(d.topic)}</b><span class="muted small">${d.cards.length} cards · ${known} mastered · ${due ? "<b style='color:var(--accent)'>" + due + " due</b>" : "✅ nothing due"}</span></div>
        <button class="btn sm" data-r="${d.id}">${due ? "Review" : "Practise"}</button>
        <button class="icon-btn" data-x="${d.id}" aria-label="Delete deck" style="width:36px;height:36px">🗑️</button></div>`;
    }).join("");
    $$("[data-r]", box).forEach(b => b.onclick = () => {
      const d = getDecks().find(x => String(x.id) === b.dataset.r);
      this._review(d, !dueCards(d).length);
    });
    $$("[data-x]", box).forEach(b => b.onclick = () => {
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "✓?"; toast("Tap again to delete this deck"); return; }
      saveDecks(getDecks().filter(x => String(x.id) !== b.dataset.x)); this.paintDecks(el);
    });
  },
  show(el, params) {
    $("#fcArea", el).innerHTML = "";
    $("#fcDecks", el).classList.remove("hidden");
    this.paintDecks(el);
    const noteId = params.get("note");
    if (noteId) {
      const n = Store.get("notes", []).find(x => String(x.id) === noteId);
      if (n) this._make(n.title, n.text);
      history.replaceState(null, "", "#cards");
    }
    if (params.get("due")) {
      const d = getDecks().find(x => dueCards(x).length);
      if (d) this._review(d, false);
      history.replaceState(null, "", "#cards");
    }
  }
});

// ---------- Mock exam ----------
view("mock", {
  tab: "practice",
  html: () => `
    ${head("🎓 Mock exam", "10 questions · 10 minutes · results at the end")}
    <div class="glass card col">
      <div class="field"><label for="mkTopic">Chapter or topic</label><input type="text" id="mkTopic" placeholder="e.g. Class 8 Science: Force and Pressure"></div>
      <button class="btn full" id="mkStart">Start exam</button>
    </div>
    <div id="mkArea"></div>
  `,
  init(el) {
    const area = $("#mkArea", el);
    const start = async () => {
      const topic = $("#mkTopic", el).value.trim();
      if (!topic) { toast("Type a topic first"); return; }
      area.innerHTML = `<div class="glass card">${LOADING.replace("Thinking…", "Preparing your exam…")}</div>`;
      try {
        const data = await aiJSON(quizPrompt(topic, 10, "exam-level (mixed easy, medium and hard)"));
        runQuiz(area, data, { topic, seconds: 600, review: true, counter: "mocks", again: start });
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    };
    $("#mkStart", el).addEventListener("click", start);
  }
});

// ---------- Answer checker ----------
view("checker", {
  tab: "practice",
  html: () => `
    ${head("✍️ Answer checker", "Get marks and tips like a teacher")}
    <div class="glass card col">
      <div class="field"><label for="ckQ">Question</label><input type="text" id="ckQ" placeholder="e.g. Explain the water cycle."></div>
      <div class="field"><label for="ckA">Your answer</label><textarea id="ckA" placeholder="Type your answer here"></textarea></div>
      <div class="field"><label for="ckM">Marks</label><select id="ckM"><option>2</option><option selected>3</option><option>5</option></select></div>
      <button class="btn full" id="ckGo">Check my answer</button>
    </div>
    <div id="ckOut"></div>
  `,
  init(el) {
    const out = $("#ckOut", el);
    $("#ckGo", el).addEventListener("click", async () => {
      const q = $("#ckQ", el).value.trim(), a = $("#ckA", el).value.trim(), m = $("#ckM", el).value;
      if (!q || !a) { toast("Fill in the question and your answer"); return; }
      out.innerHTML = `<div class="glass card">${LOADING}</div>`;
      try {
        const d = await aiJSON('Mark this student answer like a fair school teacher. Question: "' + q + '". Total marks: ' + m + '. Student answer: "' + a + '". ' +
          'Return JSON: {"marks":number,"outOf":' + m + ',"good":["what was good"],"improve":["what to add or fix"],"model_answer":"a short full-marks answer"}');
        out.innerHTML = `
          <div class="glass card col">
            <div class="row between"><h2>Marks</h2><span class="big">${esc(d.marks)} / ${esc(d.outOf || m)}</span></div>
            <b>👍 Good</b><ul style="margin:0;padding-left:18px">${(d.good || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
            <b>🛠 Improve</b><ul style="margin:0;padding-left:18px">${(d.improve || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
            <b>⭐ Model answer</b><p class="answer">${fmt(d.model_answer || "")}</p>
          </div>`;
        addXP(10, "checks");
      } catch (e) { out.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    });
  }
});

// ---------- Viva practice ----------
view("viva", {
  tab: "practice",
  html: () => `
    ${head("🎤 Viva practice", "The AI asks, you answer out loud")}
    <div class="glass card col" id="vSetup">
      <div class="field"><label for="vTopic">Topic</label><input type="text" id="vTopic" placeholder="e.g. Human digestive system"></div>
      <button class="btn full" id="vStart">Start viva</button>
    </div>
    <div id="vArea"></div>
  `,
  init(el) {
    const area = $("#vArea", el);
    let qs = [], i = 0, total = 0, topic = "";
    function ask() {
      const q = qs[i];
      area.innerHTML = `
        <div class="glass card col">
          <span class="muted small">Question ${i + 1} of ${qs.length}</span>
          <h3>${esc(q.question)}</h3>
          <textarea id="vAns" placeholder="Speak with 🎤 or type your answer"></textarea>
          <div class="row"><button class="btn ghost" id="vMic">🎤 Speak</button><button class="btn ghost" id="vSay">🔊 Repeat</button><button class="btn grow" id="vSubmit">Submit</button></div>
          <div id="vFb"></div>
        </div>`;
      speak(q.question);
      $("#vSay", area).onclick = () => speak(q.question);
      $("#vMic", area).onclick = () => { $("#vMic", area).textContent = "👂 Listening…"; listen(t => { $("#vAns", area).value = t; }, () => { $("#vMic", area).textContent = "🎤 Speak"; }); };
      $("#vSubmit", area).onclick = async () => {
        const a = $("#vAns", area).value.trim();
        if (!a) { toast("Answer first 🙂"); return; }
        $("#vFb", area).innerHTML = LOADING;
        try {
          const d = await aiJSON('Viva question: "' + q.question + '". Key points expected: ' + JSON.stringify(q.points || []) + '. Student said: "' + a + '". Score it fairly out of 10. Return JSON: {"score":number,"feedback":"one or two kind sentences"}');
          const sc = Math.max(0, Math.min(10, Number(d.score) || 0));
          total += sc;
          $("#vFb", area).innerHTML = `<p class="answer"><b>${sc}/10</b> · ${esc(d.feedback)}</p><button class="btn full" id="vNext">${i < qs.length - 1 ? "Next question →" : "See result"}</button>`;
          speak(d.feedback);
          $("#vNext", area).onclick = () => { i++; if (i < qs.length) ask(); else done(); };
        } catch (e) { $("#vFb", area).innerHTML = "⚠️ " + esc(e.message); }
      };
    }
    function done() {
      const pct = Math.round(total / (qs.length * 10) * 100);
      saveResult(topic, "Other", Math.round(total / 10), qs.length);
      addXP(15, "vivas");
      area.innerHTML = `<div class="glass card center col" style="align-items:center"><div style="font-size:48px">🎤</div><h2>Viva score: ${pct}%</h2><p class="muted">Practising out loud builds real confidence.</p><button class="btn" id="vAgain">Practise again</button></div>`;
      if (pct >= 60) confetti();
      $("#vAgain", area).onclick = () => { area.innerHTML = ""; $("#vTopic", el).focus(); };
    }
    $("#vStart", el).addEventListener("click", async () => {
      topic = $("#vTopic", el).value.trim();
      if (!topic) { toast("Type a topic first"); return; }
      area.innerHTML = `<div class="glass card">${LOADING}</div>`;
      try {
        const d = await aiJSON('Make 4 short viva (oral exam) questions on "' + topic + '" for my class. Return JSON: {"questions":[{"question":"...","points":["key point","key point"]}]}');
        qs = (d.questions || []).filter(q => q.question);
        if (!qs.length) throw new Error("No questions came back. Try again.");
        i = 0; total = 0; ask();
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    });
  }
});

// ---------- Daily challenge ----------
view("daily", {
  tab: "practice",
  html: () => `${head("🎯 Daily challenge", "One question a day · +30 XP")}<div id="dArea"></div>`,
  async show(el) {
    const area = $("#dArea", el);
    let daily = Store.get("daily", {});
    if (daily.date === dayKey() && daily.done) {
      area.innerHTML = `<div class="glass card center">✅ You've done today's challenge. See you tomorrow! 🔥</div>`;
      return;
    }
    if (daily.date !== dayKey() || !daily.q) {
      area.innerHTML = `<div class="glass card">${LOADING}</div>`;
      const weak = weakTopics()[0];
      const subj = getProfile().subjects;
      const topic = weak ? weak.name : subj[new Date().getDate() % subj.length];
      try {
        const d = await aiJSON(quizPrompt(topic, 1, "medium"));
        daily = { date: dayKey(), q: d.questions[0], subject: d.subject, topic, done: false };
        Store.set("daily", daily);
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; return; }
    }
    const q = daily.q;
    area.innerHTML = `<div class="glass card"><span class="muted small">Topic: ${esc(daily.topic)}</span><h3 style="margin-top:6px">${esc(q.question)}</h3><div id="dOpts"></div><div id="dFb"></div></div>`;
    q.options.forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "option";
      b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`;
      b.onclick = () => {
        const right = k === Number(q.answer);
        $$(".option", area).forEach((x, n) => { x.disabled = true; if (n === Number(q.answer)) x.classList.add("correct"); else if (n === k) x.classList.add("wrong"); });
        daily.done = true;
        Store.set("daily", daily);
        saveResult(daily.topic, daily.subject, right ? 1 : 0, 1);
        addXP(right ? 30 : 10, "daily");
        if (right) confetti();
        $("#dFb", area).innerHTML = `<p class="answer" style="margin-top:12px">${right ? "✅ Brilliant! +30 XP" : "❌ Good try! +10 XP for trying."} ${esc(q.explanation || "")}</p>`;
      };
      $("#dOpts", area).appendChild(b);
    });
  }
});

// ---------- Diagnostic: find my level ----------
view("diagnostic", {
  tab: "practice",
  html: () => `
    ${head("🩺 Find my level", "2 questions per subject · about 3 minutes")}
    <div id="dgArea"><div class="glass card col"><p class="muted">The AI asks a few questions from each of your subjects, then shows your strong and weak areas.</p><button class="btn full" id="dgStart">Start</button></div></div>
  `,
  init(el) {
    const area = $("#dgArea", el);
    $("#dgStart", el).addEventListener("click", async () => {
      const subjects = getProfile().subjects.slice(0, 5);
      area.innerHTML = `<div class="glass card">${LOADING.replace("Thinking…", "Building your test…")}</div>`;
      try {
        const d = await aiJSON('Make a diagnostic test for my class: 2 multiple choice questions for each of these subjects: ' + subjects.join(", ") + '. Use important basic topics. ' +
          'Return JSON: {"questions":[{"subject":"Maths","topic":"Fractions","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}');
        const qs = (d.questions || []).filter(q => q.question && q.options);
        let i = 0;
        const results = {};
        const next = () => {
          if (i >= qs.length) {
            Object.keys(results).forEach(k => { const r = results[k]; saveResult(r.topic, r.subject, r.c, r.t); });
            addXP(20, "diagnostic");
            const bySub = {};
            qs.forEach((q, n) => { const s = q.subject || "Other"; bySub[s] = bySub[s] || [0, 0]; bySub[s][1]++; if (q._right) bySub[s][0]++; });
            area.innerHTML = `<div class="glass card col"><h2>Your starting level</h2>${Object.keys(bySub).map(s => { const [c, t] = bySub[s]; const p = Math.round(c / t * 100); return `<div><div class="row between"><b>${esc(s)}</b><span>${p}%</span></div><div class="bar"><div style="width:${p}%"></div></div></div>`; }).join("")}<p class="muted small">Your weak topics are now on the Home screen and in Progress.</p><a class="btn full" href="#progress">See my progress</a></div>`;
            return;
          }
          const q = qs[i];
          area.innerHTML = `<div class="glass card"><span class="muted small">${esc(q.subject)} · ${i + 1}/${qs.length}</span><h3 style="margin-top:6px">${esc(q.question)}</h3><div id="dgO"></div></div>`;
          q.options.slice(0, 4).forEach((o, k) => {
            const b = document.createElement("button");
            b.className = "option";
            b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`;
            b.onclick = () => {
              q._right = k === Number(q.answer);
              const key = q.topic || q.subject;
              results[key] = results[key] || { topic: key, subject: q.subject, c: 0, t: 0 };
              results[key].t++; if (q._right) results[key].c++;
              i++; next();
            };
            $("#dgO", area).appendChild(b);
          });
        };
        next();
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    });
  }
});
