// ================= Home tab =================
view("home", {
  html: () => `
    <div class="row between">
      <div class="grow">
        <p class="muted" id="hGreet">Hello</p>
        <h1 id="hName">Hi!</h1>
      </div>
      <span class="chip" title="Day streak">🔥 <span id="hStreak">0</span></span>
      <span class="chip" title="XP">⭐ <span id="hXP">0</span></span>
    </div>

    <div class="glass card">
      <div class="row between"><b id="hLevel">Level 1</b><span class="muted small" id="hLevelTxt">0 / 100 XP</span></div>
      <div class="bar" style="margin-top:10px"><div id="hBar" style="width:0%"></div></div>
    </div>

    <div class="glass card row" style="gap:14px; align-items:flex-start">
      <div class="grow col" style="gap:8px; align-items:flex-start">
        <span class="chip small" style="letter-spacing:.06em"><span class="dot"></span>AI ONLINE</span>
        <h2>What shall we learn today?</h2>
        <p class="muted">Ask a doubt, snap your notes or take a quick quiz.</p>
        <a class="btn" href="#tutor">Ask StudyBuddy</a>
      </div>
      <div style="font-size:64px; line-height:1">💡</div>
    </div>

    <div id="hAlerts" class="col"></div>

    <div class="grid3">
      <a class="glass tile" href="#tutor"><span class="ico">🤖</span><b>AI Tutor</b><span>Ask doubts</span></a>
      <a class="glass tile" href="#snap"><span class="ico">📸</span><b>Snap</b><span>Scan notes</span></a>
      <a class="glass tile" href="#quiz"><span class="ico">📝</span><b>Quiz</b><span>Test yourself</span></a>
      <a class="glass tile" href="#cards"><span class="ico">🃏</span><b>Flashcards</b><span>Flip &amp; recall</span></a>
      <a class="glass tile" href="#planner"><span class="ico">📅</span><b>Planner</b><span>Exam plan</span></a>
      <a class="glass tile" href="#focus"><span class="ico">⏱️</span><b>Focus</b><span>Timer</span></a>
    </div>

    <div class="glass card row" id="hDaily" style="cursor:pointer">
      <div style="font-size:34px">🎯</div>
      <div class="grow"><b>Daily challenge</b><p class="muted small" id="hDailyTxt">One quick question · +30 XP</p></div>
      <span class="btn sm">Go</span>
    </div>
  `,
  init(el) {
    $("#hDaily", el).addEventListener("click", () => go("daily"));
  },
  show(el) {
    const p = getProfile();
    const hr = new Date().getHours();
    $("#hGreet", el).textContent = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    $("#hName", el).textContent = "Hi, " + (p.name || "there");
    const s = getStats();
    $("#hStreak", el).textContent = streakNow();
    $("#hXP", el).textContent = s.xp;
    const lv = levelInfo(s.xp);
    $("#hLevel", el).textContent = "Level " + lv.level;
    $("#hLevelTxt", el).textContent = lv.progress + " / 100 XP";
    requestAnimationFrame(() => { $("#hBar", el).style.width = lv.progress + "%"; });

    const daily = Store.get("daily", {});
    $("#hDailyTxt", el).textContent = daily.date === dayKey() && daily.done ? "✅ Done for today! Come back tomorrow." : "One quick question · +30 XP";

    // Smart alerts: homework due, exam countdown, revision, weak topic
    const alerts = [];
    const hw = Store.get("homework", []).filter(h => !h.done);
    const dueToday = hw.filter(h => h.due <= dayKey());
    if (dueToday.length) alerts.push({ ico: "📌", t: dueToday.length + " homework due today or overdue", href: "#homework" });
    const exams = Store.get("exams", []).filter(x => x.date >= dayKey()).sort((a, b) => a.date.localeCompare(b.date));
    if (exams.length) {
      const days = Math.round((new Date(exams[0].date) - new Date(dayKey())) / 86400000);
      alerts.push({ ico: "⏳", t: exams[0].subject + " exam in " + days + (days === 1 ? " day" : " days"), href: "#planner" });
    }
    const due = revisionDue();
    if (due.length) alerts.push({ ico: "🔁", t: "Time to revise: " + due[0].name, href: "#quiz?topic=" + encodeURIComponent(due[0].name) });
    else {
      const weak = weakTopics();
      if (weak.length) alerts.push({ ico: "🧠", t: "AI suggests: practise " + weak[0].name + " (" + weak[0].score + "%)", href: "#quiz?topic=" + encodeURIComponent(weak[0].name) });
    }
    $("#hAlerts", el).innerHTML = alerts.map(a =>
      `<a class="glass item" href="${a.href}" style="text-decoration:none;color:var(--text)"><span style="font-size:22px">${a.ico}</span><span class="grow">${esc(a.t)}</span><span class="muted">›</span></a>`
    ).join("");
  }
});