// ================= Home tab =================
view("home", {
  html: () => `
    <div class="row between">
      <div class="grow">
        <p class="muted" id="hGreet">Hello</p>
        <h1 id="hName">Hi!</h1>
        <p class="tagline-rot" id="hTag">Find your way to every answer. 🧭</p>
      </div>
      <span class="chip" title="Day streak">🔥 <span id="hStreak">0</span></span>
      <span class="chip" title="XP">⭐ <span id="hXP">0</span></span>
    </div>

    <a id="hContinue" class="glass card row continue hidden" style="text-decoration:none;color:var(--text);gap:14px"></a>

    <div class="glass card">
      <div class="row between"><b id="hLevel">Level 1</b><span class="muted small" id="hLevelTxt">0 / 100 XP</span></div>
      <div class="bar" style="margin-top:10px"><div id="hBar" style="width:0%"></div></div>
      <div class="row between" style="margin-top:12px"><span class="small">🎯 Today's goal</span><span class="muted small" id="hGoalTxt">0 / 50 XP</span></div>
      <div class="bar goal" style="margin-top:6px"><div id="hGoal" style="width:0%"></div></div>
    </div>

    <div class="glass card">
      <div class="row between"><h3>📋 Today's plan</h3><span class="muted small" id="hPlanCount"></span></div>
      <p class="muted small" style="margin:2px 0 4px">Picked for you from your scores, flashcards and homework</p>
      <div id="hPlan"></div>
    </div>

    <div class="glass card row" style="gap:14px; align-items:flex-start">
      <div class="grow col" style="gap:8px; align-items:flex-start">
        <span class="chip small" style="letter-spacing:.06em"><span class="dot"></span>AI ONLINE</span>
        <h2>Where shall we go today?</h2>
        <p class="muted">Ask a doubt, snap your notes or take a quick quiz. I'll guide the way.</p>
        <a class="btn" href="#tutor">🧭 Ask Wayfinder</a>
      </div>
      <img src="icons/logo.png" alt="" class="hero-logo compass-spin">
    </div>

    <div id="hAlerts" class="col"></div>

    <div class="grid2">
      <div class="glass card col" style="gap:6px"><span class="label" style="margin:0">💬 Quote of the day</span><p class="quote" id="hQuote" style="margin:0;text-align:left"></p></div>
      <div class="glass card col" style="gap:6px"><span class="label" style="margin:0">💡 Study tip</span><p class="small" id="hTip" style="margin:0"></p></div>
    </div>

    <div class="grid3">
      <a class="glass tile" href="#tutor"><span class="ico">🤖</span><b>AI Tutor</b><span>Ask doubts</span></a>
      <a class="glass tile" href="#snap"><span class="ico">📸</span><b>Snap</b><span>Scan notes</span></a>
      <a class="glass tile" href="#quiz"><span class="ico">📝</span><b>Quiz</b><span>Test yourself</span></a>
      <a class="glass tile" href="#notes"><span class="ico">🗂️</span><b>Notes</b><span>Organise</span></a>
      <a class="glass tile" href="#planner"><span class="ico">📅</span><b>Planner</b><span>Exam plan</span></a>
      <a class="glass tile" href="#focus"><span class="ico">🌳</span><b>Focus</b><span>Grow a tree</span></a>
    </div>

    <div class="glass card row" id="hDaily" style="cursor:pointer">
      <div style="font-size:34px">🎯</div>
      <div class="grow"><b>Daily challenge</b><p class="muted small" id="hDailyTxt">One quick question · +30 XP</p></div>
      <span class="btn sm">Go</span>
    </div>
  `,
  init(el) {
    $("#hDaily", el).addEventListener("click", () => go("daily"));
    // Rotate the Wayfinder slogans under the greeting
    let k = 0;
    setInterval(() => {
      const t = $("#hTag", el);
      if (!t || !el.classList.contains("active")) return;
      t.classList.add("fade");
      setTimeout(() => { k = (k + 1) % SLOGANS.length; t.textContent = SLOGANS[k]; t.classList.remove("fade"); }, 400);
    }, 5000);
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
    const goal = p.dailyGoal || 50, today = todayXP();
    $("#hGoalTxt", el).textContent = Math.min(today, goal) + " / " + goal + " XP" + (today >= goal ? " ✅" : "");
    $("#hQuote", el).textContent = quoteOfDay();
    $("#hTip", el).textContent = tipOfDay();
    requestAnimationFrame(() => {
      $("#hBar", el).style.width = lv.progress + "%";
      $("#hGoal", el).style.width = Math.min(100, Math.round(today / goal * 100)) + "%";
    });

    const daily = Store.get("daily", {});
    $("#hDailyTxt", el).textContent = daily.date === dayKey() && daily.done ? "✅ Done for today! Come back tomorrow." : "One quick question · +30 XP";

    // Continue where you left off
    const last = Store.get("last", null);
    const cont = $("#hContinue", el);
    if (last && Date.now() - last.time < 7 * 86400000) {
      cont.href = "#" + last.hash;
      cont.innerHTML = `<div style="font-size:30px">${esc(last.icon || "▶")}</div><div class="grow"><span class="muted small">Continue where you left off</span><br><b>${esc(last.label)}</b><br><span class="muted small">${timeAgo(last.time)}</span></div><span class="btn sm">▶</span>`;
      cont.classList.remove("hidden");
    } else cont.classList.add("hidden");

    this.paintPlan(el);

    // Upcoming test countdown
    const alerts = [];
    const exams = Store.get("exams", []).filter(x => x.date >= dayKey()).sort((a, b) => a.date.localeCompare(b.date));
    if (exams.length) {
      const days = Math.round((new Date(exams[0].date) - new Date(dayKey())) / 86400000);
      alerts.push({ ico: "⏳", t: exams[0].subject + " exam " + (days === 0 ? "is today! Good luck 🍀" : "in " + days + (days === 1 ? " day" : " days")), href: "#planner" });
    }
    $("#hAlerts", el).innerHTML = alerts.map(a =>
      `<a class="glass item" href="${a.href}" style="text-decoration:none;color:var(--text)"><span style="font-size:22px">${a.ico}</span><span class="grow">${esc(a.t)}</span><span class="muted">›</span></a>`
    ).join("");
  },
  paintPlan(el) {
    const tasks = todaysPlan();
    let done = Store.get("planDone", {});
    if (done.date !== dayKey()) done = { date: dayKey(), ids: [] };
    // some tasks tick themselves
    const daily = Store.get("daily", {});
    tasks.forEach(t => {
      if (t.id === "daily" && daily.date === dayKey() && daily.done && !done.ids.includes(t.id)) done.ids.push(t.id);
      if (t.id === "focus" && typeof focusStats === "function" && (focusStats().days[dayKey()] || 0) > 0 && !done.ids.includes(t.id)) done.ids.push(t.id);
    });
    Store.set("planDone", done);
    const n = tasks.filter(t => done.ids.includes(t.id)).length;
    $("#hPlanCount", el).textContent = n + " / " + tasks.length + " done";
    $("#hPlan", el).innerHTML = tasks.map(t => {
      const ok = done.ids.includes(t.id);
      return `<div class="plan-item"><button class="check ${ok ? "on" : ""}" data-plan="${esc(t.id)}" aria-label="Mark done">${ok ? "✓" : ""}</button>
        <a href="${t.href}"><b class="${ok ? "done-text" : ""}">${t.ico} ${esc(t.t)}</b><br><span class="muted small">${esc(t.why)}</span></a><span class="muted">›</span></div>`;
    }).join("") + (n === tasks.length ? `<p class="center" style="margin:10px 0 0">🎉 Plan complete! You're unstoppable.</p>` : "");
    $$("[data-plan]", el).forEach(b => b.onclick = () => {
      const d = Store.get("planDone", { date: dayKey(), ids: [] });
      const id = b.dataset.plan;
      if (d.ids.includes(id)) d.ids = d.ids.filter(x => x !== id);
      else { d.ids.push(id); addXP(5, "plan"); }
      Store.set("planDone", d);
      this.paintPlan(el);
    });
  }
});

// Builds 3 tasks for today from the student's real data (no waiting for the AI)
function todaysPlan() {
  const p = getProfile(), tasks = [];
  const exams = Store.get("exams", []).filter(x => x.date >= dayKey()).sort((a, b) => a.date.localeCompare(b.date));
  if (exams.length) {
    const t = exams[0].plan.flatMap(d => d.tasks).find(t => !t.done);
    const days = Math.round((new Date(exams[0].date) - new Date(dayKey())) / 86400000);
    if (t) tasks.push({ id: "exam-" + exams[0].id, ico: "📅", t: exams[0].subject + ": " + t.t, why: "Your exam is in " + days + (days === 1 ? " day" : " days"), href: "#planner" });
  }
  const due = revisionDue()[0], weak = weakTopics()[0], topic = due || weak;
  if (topic) tasks.push({ id: "rev-" + topic.name, ico: "🔁", t: "Practise " + topic.name, why: "You scored " + topic.score + "% last time" + (due ? ", so it's due for revision" : ""), href: "#quiz?topic=" + encodeURIComponent(topic.name) });
  const cards = totalDueCards();
  if (cards) tasks.push({ id: "cards", ico: "🃏", t: "Review " + cards + " flashcard" + (cards === 1 ? "" : "s"), why: "Reviewing at the right time makes you remember longer", href: "#cards?due=1" });
  const hw = Store.get("homework", []).filter(h => !h.done).sort((a, b) => a.due.localeCompare(b.due))[0];
  if (hw) tasks.push({ id: "hw-" + hw.id, ico: "📌", t: "Homework: " + hw.t, why: hw.due <= dayKey() ? "Due today" : "Due " + hw.due, href: "#homework" });
  if (!topicList().length) tasks.push({ id: "level", ico: "🩺", t: "Take the 'Find my level' test", why: "So I can plan the right topics for you", href: "#diagnostic" });
  tasks.push({ id: "focus", ico: "🌳", t: "One " + (p.focusMins || 25) + "-minute focus session", why: "Grow your tree and your focus streak", href: "#focus" });
  tasks.push({ id: "daily", ico: "🎯", t: "Daily challenge", why: "One question, +30 XP", href: "#daily" });
  tasks.push({ id: "tutor", ico: "🤖", t: "Ask the tutor about today's class", why: "Explaining what you learned locks it in", href: "#tutor" });
  return tasks.slice(0, 3);
}
