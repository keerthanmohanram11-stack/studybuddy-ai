// ================= Profile tab: planner, homework, focus timer, settings, profiles, about =================
view("profile", {
  html: () => `
    <div class="glass card row" style="gap:14px">
      <div class="logo" style="width:64px;height:64px;font-size:28px;animation:none" id="pfAv">K</div>
      <div class="grow"><h2 id="pfName">Student</h2><p class="muted small" id="pfInfo"></p></div>
    </div>
    <div class="grid2">
      <a class="glass tile" href="#planner"><span class="ico">📅</span><b>Exam planner</b><span>AI day-by-day plan</span></a>
      <a class="glass tile" href="#homework"><span class="ico">📌</span><b>Homework</b><span>Due dates</span></a>
      <a class="glass tile" href="#focus"><span class="ico">🌳</span><b>Focus mode</b><span>Grow a tree · +20 XP</span></a>
      <a class="glass tile" href="#notes"><span class="ico">🗂️</span><b>My notes</b><span>Notes &amp; saved</span></a>
    </div>
    <a class="glass item" href="#report" style="text-decoration:none;color:var(--text)"><span>📤</span><span class="grow">Progress report for parents / teachers</span><span class="muted">›</span></a>
    <a class="glass item" href="#settings" style="text-decoration:none;color:var(--text)"><span>⚙️</span><span class="grow">Settings &amp; themes</span><span class="muted">›</span></a>
    <a class="glass item" href="#profiles" style="text-decoration:none;color:var(--text)"><span>👥</span><span class="grow">Switch profile (shared phone)</span><span class="muted">›</span></a>
    <a class="glass item" href="#about" style="text-decoration:none;color:var(--text)"><span>🛡️</span><span class="grow">Safety, privacy &amp; about</span><span class="muted">›</span></a>
  `,
  show(el) {
    const p = getProfile();
    $("#pfAv", el).textContent = (p.name || "S").charAt(0).toUpperCase();
    $("#pfName", el).textContent = p.name || "Student";
    $("#pfInfo", el).textContent = p.grade + " · " + p.board + " · Level " + levelInfo(getStats().xp).level;
  }
});

// ---------- Exam planner ----------
view("planner", {
  tab: "profile",
  html: () => `
    ${head("📅 Exam planner", "Add an exam and the AI makes your plan")}
    <div class="glass card col">
      <div class="grid2">
        <div class="field"><label for="plSub">Subject</label><select id="plSub"></select></div>
        <div class="field"><label for="plDate">Exam date</label><input type="date" id="plDate"></div>
      </div>
      <div class="field"><label for="plTopics">Chapters / topics</label><input type="text" id="plTopics" placeholder="e.g. Ch 1-4: Crop production, Microorganisms…"></div>
      <button class="btn full" id="plAdd">Make my plan</button>
    </div>
    <div id="plList" class="col"></div>
  `,
  init(el) {
    $("#plSub", el).innerHTML = getProfile().subjects.map(s => `<option>${esc(s)}</option>`).join("");
    $("#plDate", el).min = dayKey();
    $("#plAdd", el).addEventListener("click", async () => {
      const subject = $("#plSub", el).value, date = $("#plDate", el).value, topics = $("#plTopics", el).value.trim();
      if (!date || !topics) { toast("Add the exam date and topics"); return; }
      const days = Math.max(1, Math.min(21, Math.round((new Date(date) - new Date(dayKey())) / 86400000)));
      const btn = $("#plAdd", el); btn.disabled = true; btn.textContent = "Planning…";
      try {
        const d = await aiJSON('I have a ' + subject + ' exam in ' + days + ' days on these topics: ' + topics + '. Make a realistic day-by-day revision plan for ' + days + ' days (max 3 short tasks a day, last day = light revision). Return JSON: {"days":[{"day":1,"tasks":["...","..."]}]}');
        const exams = Store.get("exams", []);
        exams.push({ id: Date.now(), subject, date, topics, plan: (d.days || []).map(x => ({ day: x.day, tasks: (x.tasks || []).map(t => ({ t, done: false })) })) });
        Store.set("exams", exams);
        $("#plTopics", el).value = "";
        toast("📅 Plan ready!");
        this.show(el);
      } catch (e) { toast("⚠️ " + e.message); }
      btn.disabled = false; btn.textContent = "Make my plan";
    });
  },
  show(el) {
    const exams = Store.get("exams", []).sort((a, b) => a.date.localeCompare(b.date));
    const list = $("#plList", el);
    if (!exams.length) { list.innerHTML = `<div class="glass empty">No exams yet. Add one above 👆</div>`; return; }
    list.innerHTML = exams.map(x => {
      const left = Math.round((new Date(x.date) - new Date(dayKey())) / 86400000);
      return `<details class="glass card" ${left >= 0 ? "open" : ""}>
        <summary class="row between" style="cursor:pointer;list-style:none"><span class="grow"><b>${esc(x.subject)}</b> · ${esc(x.date)}<br><span class="muted small">${left > 0 ? left + " days to go" : left === 0 ? "Today! Good luck 🍀" : "Finished"}</span></span><span class="muted">▾</span></summary>
        <div class="col" style="margin-top:10px">${x.plan.map((d, di) => `<div><b class="small">Day ${esc(d.day)}</b>${d.tasks.map((t, ti) => `<div class="row" style="margin-top:6px"><button class="check ${t.done ? "on" : ""}" data-x="${x.id}" data-d="${di}" data-t="${ti}" aria-label="Done">${t.done ? "✓" : ""}</button><span class="${t.done ? "done-text" : ""}">${esc(t.t)}</span></div>`).join("")}</div>`).join("")}
        <button class="btn sm ghost" data-del="${x.id}">🗑️ Delete plan</button></div></details>`;
    }).join("");
    $$("[data-x]", list).forEach(b => b.onclick = () => {
      const all = Store.get("exams", []);
      const ex = all.find(e => String(e.id) === b.dataset.x);
      const task = ex.plan[b.dataset.d].tasks[b.dataset.t];
      task.done = !task.done;
      Store.set("exams", all);
      if (task.done) addXP(5, "tasks");
      this.show(el);
    });
    $$("[data-del]", list).forEach(b => b.onclick = () => { Store.set("exams", Store.get("exams", []).filter(e => String(e.id) !== b.dataset.del)); this.show(el); });
  }
});

// ---------- Homework tracker ----------
view("homework", {
  tab: "profile",
  html: () => `
    ${head("📌 Homework", "Never forget a due date")}
    <div class="glass card col">
      <div class="field"><label for="hwT">Task</label><input type="text" id="hwT" placeholder="e.g. Maths Ex 4.2, Q1-10"></div>
      <div class="grid2">
        <div class="field"><label for="hwS">Subject</label><select id="hwS"></select></div>
        <div class="field"><label for="hwD">Due</label><input type="date" id="hwD"></div>
      </div>
      <button class="btn full" id="hwAdd">Add homework</button>
    </div>
    <div id="hwList" class="col"></div>
  `,
  init(el) {
    $("#hwS", el).innerHTML = getProfile().subjects.map(s => `<option>${esc(s)}</option>`).join("");
    $("#hwD", el).value = dayKey(-1);
    $("#hwAdd", el).addEventListener("click", () => {
      const t = $("#hwT", el).value.trim(), d = $("#hwD", el).value;
      if (!t || !d) { toast("Add the task and due date"); return; }
      const hw = Store.get("homework", []);
      hw.push({ id: Date.now(), t, s: $("#hwS", el).value, due: d, done: false });
      Store.set("homework", hw);
      $("#hwT", el).value = "";
      toast("📌 Added");
      this.show(el);
    });
  },
  show(el) {
    const hw = Store.get("homework", []).sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
    const list = $("#hwList", el);
    if (!hw.length) { list.innerHTML = `<div class="glass empty">No homework 🎉</div>`; return; }
    list.innerHTML = hw.map(h => {
      const late = !h.done && h.due < dayKey(), today = !h.done && h.due === dayKey();
      return `<div class="glass item"><button class="check ${h.done ? "on" : ""}" data-id="${h.id}" aria-label="Done">${h.done ? "✓" : ""}</button>
        <div class="grow"><b class="${h.done ? "done-text" : ""}">${esc(h.t)}</b><span class="muted small">${esc(h.s)} · due ${esc(h.due)}</span></div>
        ${late ? '<span class="tag" style="color:var(--bad)">Late</span>' : today ? '<span class="tag">Today</span>' : ""}
        <button class="icon-btn" data-del="${h.id}" aria-label="Delete" style="width:36px;height:36px">🗑️</button></div>`;
    }).join("");
    $$("[data-id]", list).forEach(b => b.onclick = () => {
      const all = Store.get("homework", []);
      const h = all.find(x => String(x.id) === b.dataset.id);
      h.done = !h.done;
      Store.set("homework", all);
      if (h.done) addXP(5, "homework");
      this.show(el);
    });
    $$("[data-del]", list).forEach(b => b.onclick = () => { Store.set("homework", Store.get("homework", []).filter(x => String(x.id) !== b.dataset.del)); this.show(el); });
  }
});

// ---------- Focus mode: grow a tree, don't leave the app ----------
function focusStats() { return Object.assign({ days: {}, sessions: 0, clean: 0, best: 0, left: 0 }, Store.get("focusStats", {})); }
function focusMinutesWeek() { const f = focusStats(); let m = 0; for (let k = 0; k < 7; k++) m += f.days[dayKey(k)] || 0; return m; }

view("focus", {
  tab: "profile",
  html: () => `
    ${head("🌳 Focus mode", "Stay in the app and your tree grows")}
    <div class="glass card col center" style="align-items:center;padding:22px">
      <div class="ring">
        <svg width="220" height="220"><circle cx="110" cy="110" r="96" fill="none" stroke="var(--border)" stroke-width="12"/>
        <circle id="fcRing" cx="110" cy="110" r="96" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="0" style="transition:stroke-dashoffset .5s"/></svg>
        <div class="lbl"><div class="plant" id="fcPlant">🌱</div><div class="timerbig" id="fcTime">25:00</div><span class="muted small" id="fcMode">Ready to focus</span></div>
      </div>
      <p class="quote" id="fcQuote"></p>
      <div class="pills" id="fcLen">${pillsHTML(["15 min", "25 min", "45 min"])}</div>
      <label class="switch" style="width:100%"><span>🔒 Focus lock (full screen + leave alert)</span><input type="checkbox" id="fcLock"><span class="track"></span></label>
      <div class="row"><button class="btn" id="fcStart">▶ Start focus</button><button class="btn ghost" id="fcReset">Give up</button></div>
    </div>
    <div class="grid2">
      <div class="glass stat"><span class="muted small">Focus today</span><b id="fsToday">0 min</b></div>
      <div class="glass stat"><span class="muted small">Clean streak 🌳</span><b id="fsClean">0</b></div>
      <div class="glass stat"><span class="muted small">Sessions done</span><b id="fsTotal">0</b></div>
      <div class="glass stat"><span class="muted small">Times you left</span><b id="fsLeft">0</b></div>
    </div>
    <details class="glass card">
      <summary style="cursor:pointer;list-style:none"><b>📌 Lock your phone to this app (Android)</b> <span class="muted small">▾</span></summary>
      <ol class="small" style="margin:10px 0 0;padding-left:18px;line-height:1.7">
        <li>Open phone <b>Settings</b> and search for <b>"pin"</b> (called <b>App pinning</b> or <b>Screen pinning</b>).</li>
        <li>Turn it <b>On</b>.</li>
        <li>Open this app, then open <b>Recent apps</b> (the square button, or swipe up and hold).</li>
        <li>Tap this app's icon at the top and choose <b>Pin</b>.</li>
        <li>Now other apps can't open until you unpin (hold Back + Recent, or swipe up and hold).</li>
      </ol>
    </details>
    <div id="fcAway" class="overlay hidden" style="z-index:60"></div>
  `,
  init(el) {
    let total = 25 * 60, left = total, endAt = 0, timer = null, resting = false, running = false;
    let awayAt = 0, leftCount = 0, quoteTimer = null, wake = null;
    const ring = $("#fcRing", el);
    $("#fcLock", el).checked = getProfile().focusLock !== false;
    $("#fcLock", el).addEventListener("change", e => { const q = getProfile(); q.focusLock = e.target.checked; saveProfile(q); });
    const locked = () => $("#fcLock", el).checked;

    const plant = () => {
      if (resting) return "😌";
      if (!running && left === total) return "🌱";
      const p = 1 - left / total;
      return p < 0.25 ? "🌱" : p < 0.5 ? "🌿" : p < 0.85 ? "🪴" : "🌳";
    };
    const paint = () => {
      $("#fcTime", el).textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
      ring.setAttribute("stroke-dashoffset", String(603 * (1 - left / total)));
      $("#fcPlant", el).textContent = plant();
      $("#fcMode", el).textContent = resting ? "Break time" : running ? "Focusing… stay here!" : "Ready to focus";
    };
    const paintStats = () => {
      const f = focusStats();
      $("#fsToday", el).textContent = (f.days[dayKey()] || 0) + " min";
      $("#fsClean", el).textContent = f.clean;
      $("#fsTotal", el).textContent = f.sessions;
      $("#fsLeft", el).textContent = f.left;
    };
    const lockOn = async () => {
      document.body.classList.add("no-nav", "focusing");
      try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) {}
      try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {}
    };
    const lockOff = () => {
      document.body.classList.remove("no-nav", "focusing");
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      try { if (wake) wake.release(); } catch (e) {}
      wake = null;
    };
    const stop = () => {
      clearInterval(timer); clearInterval(quoteTimer); timer = null; running = false;
      $("#fcStart", el).textContent = "▶ Start focus";
      lockOff();
    };
    const tick = () => {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      if (left <= 0) {
        if (!resting) {
          const f = focusStats(), mins = Math.round(total / 60);
          f.sessions++; f.days[dayKey()] = (f.days[dayKey()] || 0) + mins;
          if (leftCount === 0) { f.clean++; f.best = Math.max(f.best, f.clean); }
          Store.set("focusStats", f);
          stop();
          addXP(20, "focus");
          confetti();
          toast(leftCount === 0 ? "🌳 Your tree is fully grown! +20 XP. Perfect focus!" : "🌳 Session done! +20 XP. Try not to leave next time 😉");
          speak("Great job! Take a five minute break.");
          resting = true; total = left = 5 * 60; endAt = Date.now() + total * 1000;
          running = true; timer = setInterval(tick, 500);
          $("#fcStart", el).textContent = "⏸ Pause";
          paintStats();
        } else {
          stop(); resting = false; total = left = parseInt(getLen()) * 60;
          toast("⏰ Break over! Ready for another round? 💪");
        }
      }
      paint();
    };
    const start = () => {
      running = true; leftCount = 0;
      endAt = Date.now() + left * 1000;
      timer = setInterval(tick, 500);
      $("#fcStart", el).textContent = "⏸ Pause";
      $("#fcQuote", el).textContent = randomQuote();
      quoteTimer = setInterval(() => { $("#fcQuote", el).textContent = randomQuote(); }, 60000);
      if (locked() && !resting) lockOn();
      paint();
    };
    const getLen = wireChoices($("#fcLen", el), "25 min", false, v => { stop(); resting = false; total = left = parseInt(v) * 60; paint(); });

    $("#fcStart", el).addEventListener("click", () => { if (running) { stop(); left = Math.max(1, left); paint(); } else start(); });
    $("#fcReset", el).addEventListener("click", () => {
      if (running && !resting) toast("🥀 You gave up this time. Next round you've got this!");
      stop(); resting = false; total = left = parseInt(getLen()) * 60; paint();
    });

    // Leave detection: did they switch to another app?
    const away = $("#fcAway", el);
    document.addEventListener("visibilitychange", () => {
      if (!running || resting || !locked()) return;
      if (document.hidden) { awayAt = Date.now(); return; }
      if (!awayAt) return;
      const secs = Math.round((Date.now() - awayAt) / 1000);
      awayAt = 0;
      leftCount++;
      const f = focusStats(); f.left++; f.clean = 0; Store.set("focusStats", f);
      paintStats();
      if (secs > 15) {
        stop(); resting = false; total = left = parseInt(getLen()) * 60; paint();
        away.innerHTML = `<div class="app col center" style="align-items:center;gap:14px;padding-top:120px">
          <div style="font-size:80px">🥀</div><h2>Your tree wilted</h2>
          <p class="muted">You left the app for ${secs} seconds. Other apps can wait. Your goals can't!</p>
          <p class="quote">${esc(randomQuote())}</p>
          <button class="btn" id="fcTry">🌱 Plant a new tree</button></div>`;
        away.classList.remove("hidden");
        $("#fcTry", away).onclick = () => { away.classList.add("hidden"); start(); };
      } else {
        toast("👀 You left for " + secs + "s. Stay with me! Your tree needs you 🌿");
        if (locked()) lockOn();
      }
    });
    // Stop them leaving focus by accident inside the app
    window.addEventListener("hashchange", () => {
      if (running && !resting && locked() && !location.hash.startsWith("#focus")) {
        if (!confirm("Leave focus mode? Your tree will stop growing.")) { location.hash = "focus"; return; }
        stop(); resting = false; total = left = parseInt(getLen()) * 60; paint();
      }
    });
    $("#fcQuote", el).textContent = quoteOfDay();
    paint(); paintStats();
    this._paintStats = paintStats;
  },
  show() { if (this._paintStats) this._paintStats(); }
});

// ---------- Progress report for parents / teachers ----------
function buildReport() {
  const p = getProfile(), s = getStats(), list = topicList();
  let weekXP = 0;
  for (let k = 0; k < 7; k++) weekXP += s.xpDays[dayKey(k)] || 0;
  const strong = list.filter(t => t.score >= 70).sort((a, b) => b.score - a.score).slice(0, 4);
  const weak = weakTopics().slice(0, 4);
  const subs = {};
  list.forEach(t => { const raw = getTopics()[t.name]; subs[t.subject] = subs[t.subject] || [0, 0]; subs[t.subject][0] += raw.correct; subs[t.subject][1] += raw.total; });
  const lines = [
    "📊 StudyBuddy AI report",
    "👤 " + (p.name || "Student") + " · " + p.grade + " · " + p.board,
    "📅 Week ending " + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    "",
    "⭐ Level " + levelInfo(s.xp).level + " · " + s.xp + " XP total (" + weekXP + " this week)",
    "🔥 Study streak: " + streakNow() + (streakNow() === 1 ? " day" : " days"),
    "📝 Quizzes: " + (s.counts.quizzes || 0) + " · Mock exams: " + (s.counts.mocks || 0),
    "💬 Doubts asked: " + (s.counts.questions || 0) + " · 🃏 Cards remembered: " + (s.counts.cardsGot || 0),
    "🌳 Focus this week: " + focusMinutesWeek() + " min",
    "🏅 Badges: " + Store.get("badges", []).length + " / " + BADGES.length,
    ""
  ];
  const subNames = Object.keys(subs);
  if (subNames.length) {
    lines.push("📚 Scores by subject:");
    subNames.forEach(n => lines.push("  • " + n + ": " + Math.round(subs[n][0] / subs[n][1] * 100) + "%"));
    lines.push("");
  }
  lines.push("💪 Strong: " + (strong.length ? strong.map(t => t.name + " (" + t.score + "%)").join(", ") : "Not enough quizzes yet"));
  lines.push("🎯 Needs practice: " + (weak.length ? weak.map(t => t.name + " (" + t.score + "%)").join(", ") : "None right now 🎉"));
  return lines.join("\n");
}

view("report", {
  tab: "profile",
  html: () => `
    ${head("📤 Progress report", "Share with parents or teachers")}
    <div class="glass card"><pre id="rpText" class="report"></pre><div id="rpAI" class="answer"></div></div>
    <button class="btn full" id="rpAIgo">✨ Add AI teacher comment</button>
    <div class="grid2">
      <button class="btn" id="rpWA">💬 WhatsApp</button>
      <button class="btn ghost" id="rpShare">📤 Share</button>
    </div>
    <button class="btn ghost full" id="rpCopy">📋 Copy text</button>
  `,
  init(el) {
    let comment = "";
    const text = () => buildReport() + (comment ? "\n\n🤖 AI comment:\n" + comment : "");
    $("#rpAIgo", el).onclick = async () => {
      $("#rpAI", el).innerHTML = LOADING;
      try {
        comment = await aiText("Here is a student's weekly study report:\n" + buildReport() + "\n\nWrite a short, kind comment (3 sentences, plain text, no markdown) for their parent or teacher: one strength, one area to improve, and one simple suggestion for next week.");
        $("#rpAI", el).innerHTML = "<b>🤖 AI comment</b><br>" + fmt(comment);
      } catch (e) { $("#rpAI", el).innerHTML = "⚠️ " + esc(e.message); }
    };
    $("#rpWA", el).onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(text()), "_blank");
    $("#rpShare", el).onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: "StudyBuddy report", text: text() }); } catch (e) {} }
      else window.open("https://wa.me/?text=" + encodeURIComponent(text()), "_blank");
    };
    $("#rpCopy", el).onclick = async () => {
      try { await navigator.clipboard.writeText(text()); toast("📋 Copied"); } catch (e) { toast("Couldn't copy. Long-press the text instead."); }
    };
  },
  show(el) { $("#rpText", el).textContent = buildReport(); }
});

// ---------- Settings ----------
view("settings", {
  tab: "profile",
  html: () => `
    ${head("⚙️ Settings")}
    <div class="glass card col">
      <h3>👤 You</h3>
      <div class="field"><label for="stName">Name</label><input type="text" id="stName" maxlength="30"></div>
      <div class="grid2">
        <div class="field"><label for="stBoard">Board</label><select id="stBoard">${["CBSE","ICSE","State Board","IB","Other"].map(x => `<option>${x}</option>`).join("")}</select></div>
        <div class="field"><label for="stGrade">Class</label><select id="stGrade">${["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12","College"].map(x => `<option>${x}</option>`).join("")}</select></div>
      </div>
      <span class="label">Subjects</span><div class="pills" id="stSubjects">${pillsHTML(["Maths","Science","English","Social Science","Hindi","Computers","Physics","Chemistry","Biology"])}</div>
    </div>
    <div class="glass card col">
      <h3>🤖 Your AI</h3>
      <span class="label">Expert</span><div class="pills" id="stExpert">${pillsHTML(["All-rounder tutor","Maths expert","Science expert","English coach","Social science expert","Coding mentor","Exam coach"])}</div>
      <span class="label">Personality</span><div class="pills" id="stPersona">${pillsHTML(["Friendly buddy","Calm teacher","Funny and fun","Strict coach"])}</div>
      <span class="label">How it explains</span><div class="pills" id="stStyles">${pillsHTML(["Step by step","Real-life examples","Short and simple","With memory tricks"])}</div>
      <span class="label">Language</span><div class="pills" id="stLang">${pillsHTML(["English","Hinglish","Hindi","Tamil","Kannada","Telugu","Malayalam","Marathi","Bengali"])}</div>
      <span class="label">Teaching mode</span><div class="pills" id="stMode">${pillsHTML(["Socratic","Hints first","Direct answer"])}</div>
      <span class="label">Daily XP goal</span><div class="pills" id="stGoal">${pillsHTML(["30 XP","50 XP","100 XP"])}</div>
    </div>
    <div class="glass card col">
      <h3>🎨 Look &amp; feel</h3>
      <div class="grid3" id="stThemes"></div>
      <span class="label">Text size</span><div class="pills" id="stSize">${pillsHTML(["Small","Normal","Large"])}</div>
      <label class="switch"><span>⚡ Performance mode (older phones)</span><input type="checkbox" id="stLite"><span class="track"></span></label>
      <label class="switch"><span>📶 Low-data mode</span><input type="checkbox" id="stData"><span class="track"></span></label>
    </div>
    <button class="btn full" id="stSave">Save changes</button>
    <button class="btn ghost full" id="stReset">Reset my progress</button>
  `,
  init(el) {
    const p = getProfile();
    $("#stName", el).value = p.name;
    $("#stBoard", el).value = p.board;
    $("#stGrade", el).value = p.grade;
    $("#stLite", el).checked = p.lite;
    $("#stData", el).checked = p.lowData;
    const gSub = wireChoices($("#stSubjects", el), p.subjects, true);
    const gExp = wireChoices($("#stExpert", el), p.expert, false);
    const gPer = wireChoices($("#stPersona", el), p.personality, false);
    const gSty = wireChoices($("#stStyles", el), p.styles, true);
    const gLan = wireChoices($("#stLang", el), p.language, false);
    const gMode = wireChoices($("#stMode", el), p.tutorMode || "Socratic", false);
    const gGoal = wireChoices($("#stGoal", el), (p.dailyGoal || 50) + " XP", false);
    const sizes = { Small: 0.9, Normal: 1, Large: 1.15 };
    const gSize = wireChoices($("#stSize", el), Object.keys(sizes).find(k => sizes[k] === p.textSize) || "Normal", false);

    let theme = p.theme;
    const tBox = $("#stThemes", el);
    tBox.innerHTML = Object.keys(THEMES).map(k => {
      const t = THEMES[k];
      return `<div class="theme-swatch" data-t="${k}" role="button" aria-label="${t.name}" style="background:linear-gradient(135deg,${t.base[0]},${t.base[2]})"><div style="position:absolute;right:8px;top:8px;width:26px;height:26px;border-radius:50%;background:linear-gradient(120deg,${t.holo.join(",")})"></div><span style="${t.light ? "color:#1E1B4B;text-shadow:none" : ""}">${t.name}</span></div>`;
    }).join("");
    const paintT = () => $$("[data-t]", tBox).forEach(s => s.classList.toggle("on", s.dataset.t === theme));
    $$("[data-t]", tBox).forEach(s => s.onclick = () => {
      theme = s.dataset.t; paintT();
      const q = getProfile(); q.theme = theme; saveProfile(q); // live preview
    });
    paintT();

    $("#stSave", el).addEventListener("click", () => {
      const q = getProfile();
      Object.assign(q, {
        name: $("#stName", el).value.trim() || q.name, board: $("#stBoard", el).value, grade: $("#stGrade", el).value,
        subjects: gSub().length ? gSub() : q.subjects, expert: gExp(), personality: gPer(),
        styles: gSty().length ? gSty() : ["Step by step"], language: gLan(), tutorMode: gMode(), hintFirst: gMode() !== "Direct answer", dailyGoal: parseInt(gGoal()),
        theme, textSize: sizes[gSize()], lite: $("#stLite", el).checked, lowData: $("#stData", el).checked
      });
      saveProfile(q);
      toast("✓ Saved");
    });
    let sure = false;
    $("#stReset", el).addEventListener("click", e => {
      if (!sure) { sure = true; e.target.textContent = "Tap again to delete all XP, scores and badges"; return; }
      ["stats", "topics", "badges", "daily", "coach"].forEach(k => Store.set(k, k === "badges" ? [] : {}));
      e.target.textContent = "✓ Progress reset";
    });
  }
});

// ---------- Profiles (for families sharing one phone) ----------
view("profiles", {
  tab: "profile",
  html: () => `${head("👥 Profiles", "Each person keeps their own progress")}<div id="prList" class="col"></div><button class="btn full" id="prAdd">➕ Add a new profile</button>`,
  init(el) { $("#prAdd", el).addEventListener("click", addProfile); },
  show(el) {
    const cur = Store.pid();
    $("#prList", el).innerHTML = listProfiles().map(x => {
      const name = Store.raw("sb_" + x.id + "_profile", {}).name || x.name || "New profile";
      return `<button class="glass item" data-id="${x.id}" style="width:100%;text-align:left;cursor:pointer;color:var(--text)"><span style="font-size:22px">${x.id === cur ? "✅" : "👤"}</span><span class="grow"><b>${esc(name)}</b></span>${x.id === cur ? '<span class="tag">Current</span>' : ""}</button>`;
    }).join("");
    $$("[data-id]", el).forEach(b => b.onclick = () => { if (b.dataset.id !== cur) switchProfile(b.dataset.id); });
  }
});

// ---------- About & safety ----------
view("about", {
  tab: "profile",
  html: () => `
    ${head("🛡️ Safety, privacy &amp; about")}
    <div class="glass card col">
      <h3>🔒 Your privacy</h3>
      <p class="muted">Your name, scores and notes are saved only on this phone. No ads, no tracking, no account needed.</p>
      <h3>🤖 About the AI</h3>
      <p class="muted">StudyBuddy uses 3 AI providers: Groq, Google Gemini and OpenRouter. AI can make mistakes, so always check important facts with your textbook or teacher. Tap 👎 on any answer that looks wrong.</p>
      <h3>📚 Learning, not copying</h3>
      <p class="muted">"Hints first" mode guides you to the answer instead of just giving it, so you actually learn.</p>
      <h3>🧯 Safety filter</h3>
      <p class="muted">The AI is told it is talking to a child and refuses unsafe topics. If a student types something worrying, the app shows a kind message and a helpline instead.</p>
      <h3>👀 Healthy studying</h3>
      <p class="muted">You'll get a gentle break reminder every 25 minutes.</p>
      <p class="muted small">StudyBuddy AI · made by Keerthan and team</p>
    </div>
  `
});