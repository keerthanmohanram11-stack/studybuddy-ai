// ================= Progress tab: stats, graphs, weak/strong topics, revision, AI coach, badges =================
view("progress", {
  html: () => `
    <div><h1>📊 Progress</h1><p class="muted">See how you're doing and where to improve.</p></div>
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
      <h3>🎯 Work on these</h3><div class="pills" id="pgWeak"></div>
      <h3>💪 You're strong in</h3><div class="pills" id="pgStrong"></div>
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
    pills("#pgWeak", weakTopics(), "No weak topics yet 🎉");
    pills("#pgStrong", list.filter(t => t.score >= 60).sort((a, b) => b.score - a.score), "Take quizzes to find out.");

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