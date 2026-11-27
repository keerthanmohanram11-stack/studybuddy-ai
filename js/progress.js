// ================= Progress tab: stats, graphs, weak/strong topics, revision, AI coach, badges =================
view("progress", {
  html: () => `
    <div><h1>📊 Progress</h1><p class="muted tagline" data-tag="progress">See how far you've come, and where to go next.</p></div>
    <div class="grid2">
      <div class="glass stat"><span class="muted small">Level</span><b id="pgLevel">1</b></div>
      <div class="glass stat"><span class="muted small">Total XP</span><b id="pgXP">0</b></div>
      <div class="glass stat"><span class="muted small">Day streak</span><b id="pgStreak">0</b></div>
      <div class="glass stat"><span class="muted small">Questions answered</span><b id="pgAns">0</b></div>
    </div>
    <div class="glass card"><h3>Score by subject</h3><p class="muted small" id="pgEmpty" style="margin-top:6px">Take a quiz or "Find my level" to see this.</p><div style="position:relative;height:220px" id="pgSubWrap"><canvas id="pgSub"></canvas></div></div>
    <div class="glass card"><h3>Study activity (last 7 days)</h3><div style="position:relative;height:190px"><canvas id="pgAct"></canvas></div></div>
    <div class="glass card col">
      <h3>🔁 Revise today</h3><div class="pills" id="pgDue"></div>
    </div>
    <div class="glass card col">
      <h3>🗺️ Mastery map</h3>
      <p class="muted small">✅ Mastered (80%+) · 📘 Learning (60–79%) · 🔁 Needs revision (under 60%). Tap a topic to practise it.</p>
      <div id="pgMap" class="col"></div>
    </div>
    <div class="glass card col">
      <h3>📕 Mistake book</h3>
      <div id="pgMist"></div>
    </div>
    <div class="glass card col">
      <div class="row"><span class="dot"></span><h3>AI Study Coach</h3></div>
      <p class="muted small">A personal plan based on your real scores.</p>
      <button class="btn full" id="pgCoach">Give me my study plan</button>
      <div id="pgCoachOut" class="answer"></div>
    </div>
    <div><h3 style="margin-bottom:10px">🏅 Badges</h3><div class="grid3" id="pgBadges"></div></div>
  `,
  init(el) {
    $("#pgCoach", el).addEventListener("click", async () => {
      const out = $("#pgCoachOut", el);
      const list = topicList();
      if (!list.length) { out.innerHTML = "Take at least one quiz first so I can see how you're doing 🙂"; return; }
      out.innerHTML = LOADING;
      try {
        const summary = list.map(t => t.name + " (" + t.subject + "): " + t.score + "%").join(", ");
        const reply = await aiText("My quiz scores by topic: " + summary + ". Study streak: " + streakNow() + " days. As my study coach, in under 130 words tell me: what I'm good at, my 2 weakest areas and why they matter, and a simple 3-day plan. Be encouraging.");
        out.innerHTML = fmt(reply);
        Store.set("coach", { date: dayKey(), text: reply });
      } catch (e) { out.innerHTML = "⚠️ " + esc(e.message); }
    });
  },
  async show(el) {
    const s = getStats();
    const list = topicList();
    $("#pgLevel", el).textContent = levelInfo(s.xp).level;
    $("#pgXP", el).textContent = s.xp;
    $("#pgStreak", el).textContent = streakNow() + " 🔥";
    $("#pgAns", el).textContent = list.reduce((n, t) => n + (getTopics()[t.name].total || 0), 0);
    const coach = Store.get("coach", null);
    if (coach && !$("#pgCoachOut", el).innerHTML) $("#pgCoachOut", el).innerHTML = '<span class="muted small">Last plan (' + esc(coach.date) + '):</span><br>' + fmt(coach.text);

    const pills = (box, arr, empty) => {
      $(box, el).innerHTML = arr.length
        ? arr.map(t => `<a class="pill" style="text-decoration:none" href="#quiz?topic=${encodeURIComponent(t.name)}">${esc(t.name)} · ${t.score}%</a>`).join("")
        : `<span class="muted small">${empty}</span>`;
    };
    pills("#pgDue", revisionDue(), "Nothing due. Nice!");
    // Mastery map: every topic, grouped by subject
    const bySubject = {};
    list.forEach(t => { (bySubject[t.subject] = bySubject[t.subject] || []).push(t); });
    const subjects = Object.keys(bySubject);
    $("#pgMap", el).innerHTML = subjects.length ? subjects.map(sub => `<div><b class="small">${esc(sub)}</b><div class="mastery">${bySubject[sub].sort((a, b) => a.score - b.score).map(t => {
      const c = t.score >= 80 ? "m" : t.score >= 60 ? "l" : "r", ico = t.score >= 80 ? "✅" : t.score >= 60 ? "📘" : "🔁";
      return `<a class="mchip ${c}" href="#quiz?topic=${encodeURIComponent(t.name)}">${ico} ${esc(t.name)} · ${t.score}%</a>`;
    }).join("")}</div></div>`).join("") : `<span class="muted small">Take a quiz or "Find my level" and your topics will appear here.</span>`;

    // Mistake book
    const mist = getMistakes();
    $("#pgMist", el).innerHTML = mist.length
      ? `<p class="muted small">${mist.length} mistake${mist.length === 1 ? "" : "s"} saved from your quizzes. The AI tutor remembers your recent ones.</p>` +
        mist.slice(0, 3).map(m => `<div class="mistake small"><b>${esc(m.q)}</b><br><span class="good">✅ ${esc(m.correct)}</span> <span class="muted">· ${esc(m.topic)}</span></div>`).join("") +
        `<button class="btn ghost full" id="pgMistCards" style="margin-top:10px">🃏 Turn my last ${Math.min(15, mist.length)} mistakes into flashcards</button>`
      : `<span class="muted small">No mistakes yet. Wrong quiz answers are saved here so you can fix them.</span>`;
    if (mist.length) $("#pgMistCards", el).onclick = () => {
      addDeck("Mistake book", mist.slice(0, 15).map(m => ({ front: m.q, back: "✅ " + m.correct + (m.explanation ? ". " + m.explanation : "") })));
      toast("🃏 Flashcards made from your mistakes");
      go("cards");
    };

    const earned = Store.get("badges", []);
    $("#pgBadges", el).innerHTML = BADGES.map(b => `<div class="glass badge ${earned.includes(b.id) ? "" : "locked"}"><span class="ico">${b.ico}</span><span>${esc(b.name)}</span></div>`).join("");

    // Graphs (Chart.js loads only when needed, so the app stays fast)
    if (getProfile().lowData) { $("#pgSubWrap", el).innerHTML = '<p class="muted small">Graphs are off in Low-data mode.</p>'; return; }
    try { await loadScript("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"); } catch (e) { return; }
    if (!window.Chart) return;
    const css = getComputedStyle(document.documentElement);
    const txt = css.getPropertyValue("--muted").trim(), grid = css.getPropertyValue("--border").trim();
    const opts = max => ({ responsive: true, maintainAspectRatio: false, animation: { duration: getProfile().lite ? 0 : 700 }, plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: txt }, grid: { display: false } }, y: { beginAtZero: true, max, ticks: { color: txt, precision: 0 }, grid: { color: grid } } } });

    const subs = {};
    list.forEach(t => { const raw = getTopics()[t.name]; subs[t.subject] = subs[t.subject] || [0, 0]; subs[t.subject][0] += raw.correct; subs[t.subject][1] += raw.total; });
    const names = Object.keys(subs);
    if (this._c1) this._c1.destroy();
    if (this._c2) this._c2.destroy();
    if (names.length) {
      $("#pgEmpty", el).classList.add("hidden");
      const vals = names.map(n => Math.round(subs[n][0] / subs[n][1] * 100));
      this._c1 = new Chart($("#pgSub", el), { type: "bar", data: { labels: names, datasets: [{ data: vals, backgroundColor: vals.map(v => v >= 60 ? "#A6E4FF" : "#FFC2E0"), borderRadius: 10 }] }, options: opts(100) });
    }
    const days = [], counts = [];
    for (let k = 6; k >= 0; k--) {
      days.push(new Date(Date.now() - k * 86400000).toLocaleDateString("en-IN", { weekday: "short" }));
      counts.push(s.activity[dayKey(k)] || 0);
    }
    this._c2 = new Chart($("#pgAct", el), { type: "bar", data: { labels: days, datasets: [{ data: counts, backgroundColor: "#CDB8FF", borderRadius: 10 }] }, options: opts(undefined) });
  }
});
