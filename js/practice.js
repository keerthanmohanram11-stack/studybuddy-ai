// ================= Practice tab: Quiz, Flashcards, Mock exam, Answer checker, Viva, Daily challenge, Diagnostic =================
view("practice", {
  html: () => `
    <div><h1>✏️ Practice</h1><p class="muted">Test yourself. The AI adapts to your level.</p></div>
    <a class="glass card row" href="#diagnostic" style="text-decoration:none;color:var(--text)">
      <div style="font-size:36px">🩺</div>
      <div class="grow"><h3>Find my level</h3><p class="muted small">A short test that finds your weak topics</p></div><span class="muted">›</span>
    </a>
    <div class="grid2">
      <a class="glass tile" href="#quiz"><span class="ico">📝</span><b>AI Quiz</b><span>Adapts to you</span></a>
      <a class="glass tile" href="#cards"><span class="ico">🃏</span><b>Flashcards</b><span>Flip &amp; recall</span></a>
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
function quizPrompt(topic, count, difficulty) {
  return 'Make a ' + count + '-question multiple choice quiz on "' + topic + '" at ' + difficulty + ' difficulty for my class. ' +
    'Return JSON exactly like: {"subject":"Maths","questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. ' +
    '"subject" is one of: Maths, Science, English, Social Science, Hindi, Computers, Physics, Chemistry, Biology, Other. "answer" is the index (0-3) of the correct option. Keep explanations to 1-2 sentences.';
}
function runQuiz(area, data, opts) {
  const qs = (data.questions || []).filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  if (!qs.length) { area.innerHTML = `<div class="glass card">⚠️ The AI didn't send questions. Please try again.</div>`; return; }
  let i = 0, score = 0;
  const answers = [];
  let deadline = opts.seconds ? Date.now() + opts.seconds * 1000 : 0;
  let tick = null;

  function finish() {
    clearInterval(tick);
    const pct = Math.round(score / qs.length * 100);
    saveResult(opts.topic, data.subject || "Other", score, qs.length);
    addXP(score * 10, opts.counter || "quizzes");
    if (pct === 100) { const s = getStats(); s.counts.perfect = (s.counts.perfect || 0) + 1; Store.set("stats", s); checkBadges(); confetti(); }
    else if (pct >= 60) confetti();
    area.innerHTML = `
      <div class="glass card col center" style="align-items:center">
        <div style="font-size:52px">${pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : "💪"}</div>
        <h2>You scored ${score} / ${qs.length}</h2>
        <p class="muted">${pct >= 60 ? "Great job! +" + score * 10 + " XP" : "Keep going! This topic is now on your revision list."}</p>
        <div class="row"><button class="btn" id="qzAgain">Try again</button><a class="btn ghost" href="#progress">See progress</a></div>
      </div>
      ${opts.review ? `<div class="col">${qs.map((q, k) => `<div class="glass card small"><b>${k + 1}. ${esc(q.question)}</b><br>${answers[k] === q.answer ? "✅" : "❌"} Answer: ${esc(q.options[q.answer])}<br><span class="muted">${esc(q.explanation || "")}</span></div>`).join("")}</div>` : ""}`;
    $("#qzAgain", area).onclick = opts.again;
    if (opts.onFinish) opts.onFinish(score, qs.length);
  }

  function showQ() {
    const q = qs[i];
    area.innerHTML = `
      <div class="glass card">
        <div class="row between"><span class="muted small">${esc(opts.topic)}</span><span class="muted small">${opts.seconds ? '⏱ <b id="qzTime"></b> · ' : ""}${i + 1} / ${qs.length}</span></div>
        <div class="bar" style="margin:10px 0 14px"><div style="width:${Math.round(i / qs.length * 100)}%"></div></div>
        <h3>${esc(q.question)}</h3>
        <div id="qzOpts"></div><div id="qzFb"></div>
      </div>`;
    const box = $("#qzOpts", area);
    q.options.slice(0, 4).forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "option";
      b.innerHTML = `<span class="letter">${"ABCD"[k]}</span><span>${esc(o)}</span>`;
      b.onclick = () => pick(k);
      box.appendChild(b);
    });
  }
  function next() { i++; if (i < qs.length) showQ(); else finish(); }
  function pick(k) {
    const q = qs[i];
    answers[i] = k;
    const right = k === Number(q.answer);
    if (right) score++;
    if (opts.seconds) { next(); return; } // exam mode: no feedback until the end
    $$(".option", area).forEach((b, n) => {
      b.disabled = true;
      if (n === Number(q.answer)) b.classList.add("correct");
      else if (n === k) b.classList.add("wrong");
    });
    $("#qzFb", area).innerHTML = `<p class="answer" style="margin:12px 0">${right ? "✅ Correct! +10 XP. " : "❌ Not quite. "}${esc(q.explanation || "")}</p>
      <button class="btn full">${i < qs.length - 1 ? "Next →" : "See my score"}</button>`;
    $("#qzFb button", area).onclick = next;
  }
  if (opts.seconds) {
    tick = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      const t = $("#qzTime", area);
      if (t) t.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      if (left <= 0) { toast("⏰ Time's up!"); finish(); }
    }, 500);
  }
  showQ();
}

// ---------- AI Quiz ----------
view("quiz", {
  tab: "practice",
  html: () => `
    ${head("📝 AI Quiz", "Questions get harder as you improve")}
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
      const diff = difficultyFor(topic);
      area.innerHTML = `<div class="glass card">${LOADING.replace("Thinking…", "Making a " + diff + " quiz…")}</div>`;
      try {
        const data = await aiJSON(quizPrompt(topic, parseInt(getCount()), diff));
        runQuiz(area, data, { topic, again: start });
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

// ---------- Flashcards ----------
view("cards", {
  tab: "practice",
  html: () => `
    ${head("🃏 Flashcards", "Tap a card to flip it")}
    <div class="row"><input type="text" id="fcTopic" placeholder="Topic, e.g. Parts of a cell"><button class="btn" id="fcGo">Make</button></div>
    <div id="fcArea"></div>
  `,
  init(el) {
    const area = $("#fcArea", el);
    let cards = [], i = 0, topic = "";
    function show() {
      const c = cards[i];
      area.innerHTML = `
        <p class="muted center small" style="margin-bottom:8px">Card ${i + 1} of ${cards.length}</p>
        <div class="flip" id="fcFlip"><div class="flip-inner"><div class="glass face">${esc(c.front)}</div><div class="glass face back">${esc(c.back)}</div></div></div>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost grow" id="fcPrev">← Back</button>
          <button class="btn ghost" id="fcSay" aria-label="Listen">🔊</button>
          <button class="btn grow" id="fcNext">${i < cards.length - 1 ? "Next →" : "Finish"}</button>
        </div>
        <button class="btn ghost full" id="fcSave" style="margin-top:10px">🔖 Save this deck</button>`;
      $("#fcFlip", area).onclick = e => e.currentTarget.classList.toggle("on");
      $("#fcPrev", area).onclick = () => { if (i > 0) { i--; show(); } };
      $("#fcSay", area).onclick = () => speak(c.front + ". " + c.back);
      $("#fcNext", area).onclick = () => {
        if (i < cards.length - 1) { i++; show(); }
        else { addXP(5, "cards"); area.innerHTML = `<div class="glass card center">🎉 Deck done! <a href="#quiz?topic=${encodeURIComponent(topic)}">Take a quiz on it →</a></div>`; }
      };
      $("#fcSave", area).onclick = () => saveItem("Flashcards: " + topic, cards.map(c => "**" + c.front + "**\n" + c.back).join("\n\n"), "Flashcards");
    }
    async function make() {
      topic = $("#fcTopic", el).value.trim();
      if (!topic) { toast("Type a topic first"); return; }
      area.innerHTML = `<div class="glass card">${LOADING}</div>`;
      try {
        const d = await aiJSON('Make 8 flashcards on "' + topic + '" for my class. Return JSON: {"cards":[{"front":"short question or term","back":"short clear answer"}]}');
        cards = (d.cards || []).filter(c => c.front && c.back);
        if (!cards.length) throw new Error("No cards came back. Try again.");
        i = 0; show();
      } catch (e) { area.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    }
    $("#fcGo", el).addEventListener("click", make);
    $("#fcTopic", el).addEventListener("keydown", e => { if (e.key === "Enter") make(); });
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