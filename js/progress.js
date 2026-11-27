// ================= Progress: dashboard, learning record by chapter, badges, reports, parent view =================
function barChart(vals, labels, opts = {}) {
  const W = 320, H = 150, pad = 22, max = Math.max(1, ...vals), bw = (W - pad) / vals.length;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="${esc(opts.label || "Chart")}">
    ${[0.5, 1].map(f => `<line x1="${pad}" x2="${W}" y1="${H - (H - 16) * f}" y2="${H - (H - 16) * f}" stroke="var(--border)" stroke-dasharray="3 4"/>`).join("")}
    ${vals.map((v, i) => { const h = Math.max(v ? 6 : 2, (H - 16) * v / max), x = pad + i * bw + bw * 0.18, w = bw * 0.64, hi = opts.hi === i;
      return `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" rx="7" fill="${hi ? "var(--primary)" : "var(--primary-soft-2)"}"><animate attributeName="height" from="0" to="${h}" dur=".6s" fill="freeze"/><animate attributeName="y" from="${H}" to="${H - h}" dur=".6s" fill="freeze"/></rect>${v ? `<text x="${x + w / 2}" y="${H - h - 5}" text-anchor="middle" style="font-weight:700;fill:var(--text-2)">${opts.fmt ? opts.fmt(v) : v}</text>` : ""}<text x="${x + w / 2}" y="${H + 16}" text-anchor="middle">${esc(labels[i])}</text>`; }).join("")}
    <text x="0" y="12">${opts.unit || ""}</text></svg></div>`;
}
function lineChart(vals, opts = {}) {
  if (vals.length < 2) return `<p class="small muted">${T("Take at least 2 quizzes to see your trend.")}</p>`;
  const W = 320, H = 120, pad = 10, step = (W - pad * 2) / (vals.length - 1);
  const pts = vals.map((v, i) => [pad + i * step, H - pad - (H - pad * 2) * v / 100]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quiz score trend"><defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".25"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${H - pad - (H - pad * 2) * 0.6}" y2="${H - pad - (H - pad * 2) * 0.6}" stroke="var(--warning)" stroke-dasharray="4 4" opacity=".6"/>
    <path d="${d} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z" fill="url(#lg1)"/><path d="${d}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.5"><title>${vals[i]}%</title></circle>`).join("")}</svg></div>`;
}
function weekDays() { return [...Array(7)].map((_, i) => dayKey(6 - i)); }

view("progress", {
  html: () => `
    ${ph("Progress", "See how far you've come, and where to go next.", { back: false, right: `<a class="icon-btn" href="#report" aria-label="Share report">${icon("share", 20)}</a>` })}
    <div class="grid2 stagger" id="pgStats"></div>
    <div class="card"><div class="row between"><h3>Study time this week</h3><span class="tag indigo" id="pgWeekT"></span></div><div id="pgWeek" style="margin-top:12px"></div></div>
    <div class="card"><div class="row between"><h3>Your subjects</h3><a class="link-btn" href="#vault">All chapters ${icon("chevR", 15)}</a></div><div id="pgSubs" class="stack" style="margin-top:10px"></div></div>
    <div class="card"><div class="row between"><h3>Quiz scores</h3><span class="tiny muted">Last 10 · line = 60%</span></div><div id="pgTrend" style="margin-top:10px"></div></div>
    <div class="card"><div class="row between"><h3>Activity</h3><span class="tiny muted">Last 12 weeks</span></div><div class="heat" id="pgHeat" style="margin-top:12px"></div><div class="legend" style="margin-top:8px;justify-content:flex-end"><span>Less</span><span><i style="background:var(--surface-3)"></i><i class="" style="background:var(--primary-soft-2)"></i><i style="background:var(--primary)"></i></span><span>More</span></div></div>
    <div class="card"><div class="row"><div class="it">${icon("sparkles", 20)}</div><div class="grow"><h3>AI study coach</h3><p class="tiny muted">A plan from your real scores and study time</p></div></div><div id="pgCoach" class="answer" style="margin-top:10px"></div><button class="btn secondary block" id="pgCoachGo" style="margin-top:10px">${icon("sparkles", 16)}Give me this week's advice</button></div>
    <div class="list">
      ${[["vault", "book2", "", "Revision vault", "Every chapter: score, time, mistakes, notes"], ["badges", "award", "c-amber", "Badges", "12 badges, bronze to gold"], ["mistakes", "wand", "c-coral", "Mistake book", "Fix what you got wrong"], ["report", "share", "c-green", "Weekly report", "Share with parents or teachers"], ["parent", "shield", "c-slate", "Parent dashboard", "PIN-protected study activity"]].map(t => `<a class="li" href="#${t[0]}"><div class="it ${t[2]}">${icon(t[1], 20)}</div><div class="t"><b>${t[3]}</b><span>${t[4]}</span></div>${icon("chevR", 18, "chev")}</a>`).join("")}
    </div>`,
  init(el) {
    $("#pgCoachGo", el).onclick = async e => {
      const out = $("#pgCoach", el), ms = masteryList();
      if (!ms.length && !getRecord().length) { out.innerHTML = T("Study a little first (a quiz or a session) so I can see how you're doing."); return; }
      e.currentTarget.disabled = true; out.innerHTML = loadingHTML();
      try {
        const week = weekDays().map(k => (getStats().days[k] || {}).minutes || 0).reduce((a, b) => a + b, 0);
        const r = await aiText("My chapter scores: " + ms.map(c => c.subject + " / " + c.chapter + ": " + c.score + "%").join("; ") + ". Study time this week: " + week + " minutes. Streak: " + streakNow() + " days. Mistakes saved: " + getMistakes().length + ". As my study coach, in under 140 words: what I'm doing well, my 2 most important weak areas and why, and a simple 3-day plan. Be encouraging.");
        out.innerHTML = '<div data-notr>' + md(r) + "</div>"; Store.set("coach", { d: dayKey(), r });
      } catch (err) { out.innerHTML = esc(err.message); }
      e.currentTarget.disabled = false;
    };
  },
  show(el) {
    const s = getStats(), ms = masteryList(), days = weekDays();
    const mins = days.map(k => (s.days[k] || {}).minutes || 0), weekMin = mins.reduce((a, b) => a + b, 0);
    const tot = ms.reduce((a, c) => [a[0] + c.correct, a[1] + c.total], [0, 0]), acc = tot[1] ? Math.round(tot[0] / tot[1] * 100) : 0;
    const lv = levelInfo(s.xp);
    $("#pgStats", el).innerHTML = [
      [icon("flame", 14) + T("Streak"), streakNow() + `<span class="tiny muted"> ${T("best {n}", { n: s.best || 0 })}</span>`, "coral"],
      [icon("clock", 14) + T("This week"), fmtMins(weekMin), ""],
      [icon("target", 14) + T("Accuracy"), tot[1] ? acc + "%" : "–", "green"],
      [icon("rocket", 14) + T("Level {n}", { n: lv.level }), `${s.xp} <span class="tiny muted">XP</span><div class="bar thin" style="margin-top:6px"><div style="width:${lv.progress}%"></div></div>`, ""]
    ].map(x => `<div class="stat"><span class="k">${x[0]}</span><span class="v">${x[1]}</span></div>`).join("");
    $("#pgWeekT", el).textContent = fmtMins(weekMin);
    $("#pgWeek", el).innerHTML = barChart(mins, days.map(k => fmtDay(k, { weekday: "short" })), { hi: 6, unit: T("minutes"), label: T("Study minutes per day") });
    const subs = {};
    ms.forEach(c => { const x = subs[c.subject] = subs[c.subject] || { n: 0, sum: 0, weak: 0 }; x.n++; x.sum += c.score; if (c.score < 60) x.weak++; });
    const allSubs = [...new Set(getProfile().subjects.concat(Object.keys(subs)))];
    $("#pgSubs", el).innerHTML = allSubs.map(sb => { const x = subs[sb], pct = x ? Math.round(x.sum / x.n) : 0;
      return `<a class="row" href="#subject?s=${encodeURIComponent(sb)}" style="color:inherit;gap:12px;padding:6px 0"><div class="ring-wrap">${ringSVG(pct, 46, 5)}<div class="ring-label">${icon(subjIcon(sb), 16)}</div></div><div class="grow"><b class="bold">${esc(sb)}</b><p class="tiny muted">${x ? T("{n} chapters practised", { n: x.n }) + (x.weak ? " · " + T("{w} need revision", { w: x.weak }) : "") : T("Not practised yet")}</p></div><b class="bold">${x ? pct + "%" : ""}</b>${icon("chevR", 16)}</a>`; }).join("");
    const quizzes = getRecord().filter(r => r.type === "quiz" && r.total).slice(0, 10).reverse().map(r => Math.round(r.score / r.total * 100));
    $("#pgTrend", el).innerHTML = lineChart(quizzes);
    const heat = [...Array(84)].map((_, i) => { const d = s.days[dayKey(83 - i)] || {}; const v = (d.minutes || 0) + (d.actions || 0) * 3; return v === 0 ? "" : v < 10 ? "l1" : v < 25 ? "l2" : v < 50 ? "l3" : "l4"; });
    $("#pgHeat", el).innerHTML = heat.map((c, i) => `<i class="${c}" title="${dayKey(83 - i)}"></i>`).join("");
    const coach = Store.get("coach", null);
    if (coach && !$("#pgCoach", el).innerHTML) $("#pgCoach", el).innerHTML = `<span class="tiny muted">${fmtDay(coach.d)}</span><div data-notr>${md(coach.r)}</div>`;
  }
});

// ---------- Revision vault: all subjects and chapters ----------
view("vault", {
  tab: "progress",
  html: () => `${ph("Revision vault", "Everything you've studied, by chapter. Perfect before exams.")}
    <div class="card tint row" style="gap:12px"><div class="it">${icon("exam", 20)}</div><div class="grow"><b class="bold">Exam coming up?</b><p class="tiny muted">Open a subject and use Exam revision mode.</p></div></div>
    <div class="input-icon">${icon("search", 18)}<input type="search" id="vtQ" placeholder="Search your learning record"></div>
    <div id="vtRes"></div><div id="vtSubs" class="list"></div>`,
  init(el) {
    $("#vtQ", el).oninput = e => {
      const q = e.target.value.toLowerCase().trim(), out = $("#vtRes", el);
      if (q.length < 2) { out.innerHTML = ""; return; }
      const hits = getRecord().filter(r => ((r.title || "") + " " + (r.chapter || "") + " " + (r.subject || "") + " " + (r.detail || "")).toLowerCase().includes(q)).slice(0, 20);
      out.innerHTML = hits.length ? `<div class="card stack">${hits.map(recordItem).join("")}</div>` : `<p class="small muted">${T("No matches.")}</p>`;
    };
  },
  show(el) {
    const ms = masteryList(), rec = getRecord();
    const subs = [...new Set(getProfile().subjects.concat(ms.map(c => c.subject)).concat(rec.map(r => r.subject).filter(Boolean)))];
    $("#vtSubs", el).innerHTML = subs.map(sb => { const chs = new Set(ms.filter(c => c.subject === sb).map(c => c.chapter).concat(rec.filter(r => r.subject === sb && r.chapter).map(r => r.chapter))); const weak = ms.filter(c => c.subject === sb && c.score < 60).length;
      return `<a class="li" href="#subject?s=${encodeURIComponent(sb)}"><div class="it ${subjColor(sb)}">${icon(subjIcon(sb), 20)}</div><div class="t"><b>${esc(sb)}</b><span>${T("{n} chapters studied", { n: chs.size })}${weak ? " · " + T("{w} weak", { w: weak }) : ""}</span></div>${icon("chevR", 18, "chev")}</a>`; }).join("");
  }
});
function recordItem(r) {
  const ico = { quiz: "quiz", chat: "message", session: "timer", note: "notes", snap: "camera", video: "video", reflection: "star", check: "checkc", viva: "mic", sheet: "keypoints" }[r.type] || "book";
  return `<div class="row" style="gap:10px;padding:6px 0"><div class="it sm c-slate">${icon(ico, 15)}</div><div class="grow"><b class="small bold" data-notr>${esc(r.title || r.type)}</b><p class="tiny muted"><span data-notr>${esc([r.subject, r.chapter].filter(Boolean).join(" · "))}</span>${r.total ? " · " + r.score + "/" + r.total : ""}${r.minutes ? " · " + fmtMins(r.minutes) : ""} · ${fmtDay(r.day)}</p></div></div>`;
}

view("subject", {
  tab: "progress",
  html: () => `<div id="sjHead"></div><div class="grid3" id="sjStats"></div>
    <button class="btn lg block" id="sjExam">${icon("exam", 18)}Exam revision mode</button>
    <div class="card"><div class="row between"><h3>Chapters</h3><div class="legend"><span><i style="background:var(--success)"></i>Strong</span><span><i style="background:var(--warning)"></i>OK</span><span><i style="background:var(--danger)"></i>Weak</span></div></div><div id="sjCh" style="margin-top:6px"></div></div>`,
  init(el) { $("#sjExam", el).onclick = () => examMode(this.s, this.chs || []); },
  async show(el, params) {
    const s = this.s = params.get("s") || "Maths";
    $("#sjHead", el).innerHTML = ph(`<span class="row" style="gap:10px"><span class="it sm ${subjColor(s)}">${icon(subjIcon(s), 18)}</span><span data-notr>${esc(s)}</span></span>`, T("Your learning record for this subject"));
    const m = Store.get("mastery", {}), rec = getRecord().filter(r => r.subject === s);
    const mins = rec.reduce((a, r) => a + (r.minutes || 0), 0), mine = masteryList().filter(c => c.subject === s), avg = mine.length ? Math.round(mine.reduce((a, c) => a + c.score, 0) / mine.length) : 0;
    $("#sjStats", el).innerHTML = [[T("Avg score"), mine.length ? avg + "%" : "–"], [T("Time"), fmtMins(mins)], [T("Mistakes"), getMistakes().filter(x => x.subject === s).length]].map(x => `<div class="stat"><span class="k">${x[0]}</span><span class="v">${x[1]}</span></div>`).join("");
    $("#sjCh", el).innerHTML = `<div class="skel" style="height:44px;margin-top:8px"></div><div class="skel" style="height:44px;margin-top:8px"></div>`;
    let list = [];
    try { list = await chaptersFor(s); } catch (e) {}
    const recorded = [...new Set(mine.map(c => c.chapter).concat(rec.filter(r => r.chapter).map(r => r.chapter)))];
    const chs = this.chs = [...new Set(list.concat(recorded))].filter(c => c && c !== "General");
    $("#sjCh", el).innerHTML = chs.length ? chs.map((c, i) => { const mm = m[chapterKey(s, c)], st = chapterStatus(mm), last = rec.find(r => r.chapter === c);
      return `<a class="chapter-row" href="#chapter?s=${encodeURIComponent(s)}&c=${encodeURIComponent(c)}" style="color:inherit"><span class="status-dot ${st}"></span><div class="grow"><b class="small bold" data-notr>${list.includes(c) ? (list.indexOf(c) + 1) + ". " : ""}${esc(c)}</b><p class="tiny muted">${mm ? T("Score {n}%", { n: mm.score }) : T("Not practised")}${last ? " · " + timeAgo(last.t) : ""}</p></div>${icon("chevR", 16)}</a>`; }).join("")
      : `<p class="small muted" style="padding:10px 0">${T("No chapters yet. Study a chapter in a session, chat or quiz and it appears here.")}</p>`;
  }
});
function examMode(subject, chapters) {
  openSheet(`<h3>${T("Exam revision mode")}</h3><p class="muted small" style="margin:4px 0 12px">${T("Pick the chapters in your exam. Wayfinder sorts them by weakness and builds your personal revision guide from everything you've done.")}</p>
    <div class="chips" id="emC" style="max-height:240px;overflow:auto" data-notr>${chipsHTML(chapters)}</div>
    <button class="btn block lg" id="emGo" style="margin-top:14px">${icon("sparkles", 18)}${T("Build my revision guide")}</button><div id="emOut" style="margin-top:14px"></div>`, s => {
    const get = wireChips($("#emC", s), [], true);
    $("#emGo", s).onclick = async () => {
      const sel = get(); if (!sel.length) return toast(T("Pick at least one chapter"));
      const m = Store.get("mastery", {});
      const rows = sel.map(c => ({ c, mm: m[chapterKey(subject, c)], mist: getMistakes().filter(x => x.subject === subject && x.chapter === c), asks: getRecord().filter(r => r.subject === subject && r.chapter === c && r.type === "chat").map(r => r.title).slice(0, 5) }))
        .sort((a, b) => (a.mm ? a.mm.score : 50) - (b.mm ? b.mm.score : 50));
      const out = $("#emOut", s);
      out.innerHTML = `<div class="stack">${rows.map((r, i) => `<div class="row" style="gap:10px"><span class="status-dot ${chapterStatus(r.mm)}"></span><span class="grow small bold" data-notr>${i + 1}. ${esc(r.c)}</span><span class="tiny muted">${r.mm ? r.mm.score + "%" : T("new")}${r.mist.length ? " · " + T("{n} mistakes", { n: r.mist.length }) : ""}</span></div>`).join("")}</div><div class="card flat" style="margin-top:12px">${loadingHTML(T("Writing your revision guide…"))}</div>`;
      try {
        const brief = rows.map(r => r.c + ": score " + (r.mm ? r.mm.score + "%" : "not tested") + (r.mist.length ? "; got wrong: " + r.mist.slice(0, 4).map(x => x.q).join(" | ") : "") + (r.asks.length ? "; asked about: " + r.asks.join(" | ") : "")).join("\n");
        const g = await aiText("Build my personal exam revision guide for " + subject + ". Here is my learning record per chapter, weakest first:\n" + brief + "\n\nFor each chapter: the 3-5 things I must revise (focus on my mistakes and doubts), one memory trick, and one likely exam question. Then a short revision order with time per chapter.");
        out.lastElementChild.outerHTML = `<div class="card flat" data-notr>${md(g)}</div><button class="btn ghost block" id="emSave" style="margin-top:10px">${icon("notes", 16)}${T("Save guide to notes")}</button>`;
        $("#emSave", s).onclick = () => { saveNote({ title: T("Exam guide: ") + subject, text: g, subject, pinned: true }); toast(T("Saved and pinned in My notes"), "pin"); };
      } catch (e) { out.lastElementChild.innerHTML = esc(e.message); }
    };
  });
}

view("chapter", {
  tab: "progress",
  html: () => `<div id="cpHead"></div><div class="card" id="cpTop"></div>
    <div class="grid4" id="cpAct"></div>
    <button class="btn block secondary" id="cpWeak">${icon("sparkles", 16)}Revise my weak spots</button><div id="cpWeakOut"></div>
    <div class="card"><h3>Timeline</h3><div class="timeline" id="cpTl" style="margin-top:12px"></div></div>
    <div id="cpNotes"></div><div id="cpMist"></div>`,
  init(el) {
    $("#cpWeak", el).onclick = async () => {
      const out = $("#cpWeakOut", el), s = this.s, c = this.c;
      const mist = getMistakes().filter(x => x.subject === s && x.chapter === c).map(x => x.q).slice(0, 8), asks = getRecord().filter(r => r.subject === s && r.chapter === c && (r.type === "chat" || r.type === "reflection")).map(r => r.title + (r.detail ? " (" + r.detail + ")" : "")).slice(0, 8);
      out.innerHTML = `<div class="card">${loadingHTML()}</div>`;
      try { const r = await aiText("Make a short personal revision sheet for " + s + ", NCERT chapter " + c + ". My mistakes: " + (mist.join(" | ") || "none yet") + ". Things I asked or found hard: " + (asks.join(" | ") || "none yet") + ". Focus on exactly these weak spots, explain each simply, then give 3 practice questions with answers."); out.innerHTML = `<div class="card"><div data-notr>${md(r)}</div><button class="btn sm ghost" id="cpSv" style="margin-top:10px">${icon("notes", 15)}${T("Save to notes")}</button></div>`; $("#cpSv", out).onclick = () => { saveNote({ title: T("Weak spots: ") + c, text: r, subject: s, chapter: c }); toast(T("Saved to My notes"), "notes"); }; }
      catch (e) { out.innerHTML = `<div class="card">${esc(e.message)}</div>`; }
    };
  },
  show(el, params) {
    const s = this.s = params.get("s"), c = this.c = params.get("c");
    const mm = Store.get("mastery", {})[chapterKey(s, c)], st = chapterStatus(mm);
    const rec = getRecord().filter(r => r.subject === s && r.chapter === c), mins = rec.reduce((a, r) => a + (r.minutes || 0), 0);
    $("#cpHead", el).innerHTML = ph(`<span data-notr>${esc(c)}</span>`, `<span data-notr>${esc(s)}</span>`);
    const tag = { strong: '<span class="tag green">' + T("Strong") + "</span>", ok: '<span class="tag amber">' + T("Getting there") + "</span>", weak: '<span class="tag red">' + T("Needs revision") + "</span>", new: '<span class="tag">' + T("Not tested yet") + "</span>" }[st];
    $("#cpTop", el).innerHTML = `<div class="row" style="gap:14px"><div class="ring-wrap">${ringSVG(mm ? mm.score : 0, 70, 8)}<div class="ring-label bold">${mm ? mm.score + "%" : "–"}</div></div><div class="grow stack" style="gap:6px">${tag}<p class="small muted">${T("{m} studied · {q} quizzes · {c} questions asked", { m: fmtMins(mins), q: rec.filter(r => r.type === "quiz").length, c: rec.filter(r => r.type === "chat").length })}</p></div></div>
      ${mm && mm.history.length > 1 ? `<div style="margin-top:12px">${lineChart(mm.history.map(h => h.s))}</div>` : ""}`;
    const q = "subject=" + encodeURIComponent(s) + "&chapter=" + encodeURIComponent(c);
    $("#cpAct", el).innerHTML = [["chat?helper=tutor&new=1&" + q, "compass", "", "Tutor"], ["quiz?" + q, "quiz", "c-green", "Quiz"], ["keypoints", "keypoints", "c-violet", "Key points"], ["video", "video", "c-red", "Videos"]].map(a => `<a class="quick" href="#${a[0]}" style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text-2);font-size:.78rem;font-weight:650"><span class="it ${a[2]}" style="width:52px;height:52px;border-radius:16px">${icon(a[1], 22)}</span>${T(a[3])}</a>`).join("");
    $("#cpTl", el).innerHTML = rec.length ? rec.slice(0, 30).map(r => `<div class="tl-item">${recordItem(r)}</div>`).join("") : `<p class="small muted">${T("Nothing recorded yet for this chapter.")}</p>`;
    const notes = getNotes().filter(n => n.subject === s && n.chapter === c);
    $("#cpNotes", el).innerHTML = notes.length ? `<div class="card"><h3>${T("Notes")}</h3><div class="list" style="margin-top:10px">${notes.map(n => `<a class="li" href="#note?id=${n.id}"><div class="it sm c-amber">${icon("notes", 15)}</div><div class="t"><b data-notr>${esc(n.title)}</b></div>${icon("chevR", 16, "chev")}</a>`).join("")}</div></div>` : "";
    const mist = getMistakes().filter(x => x.subject === s && x.chapter === c);
    $("#cpMist", el).innerHTML = mist.length ? `<div class="card"><h3>${T("Mistakes")}</h3>${mist.slice(0, 8).map(m => `<div class="mistake small" data-notr><b>${esc(m.q)}</b><br><span class="good-t">✓ ${esc(m.correct)}</span></div>`).join("")}</div>` : "";
  }
});

// ---------- Badges ----------
view("badges", {
  tab: "progress",
  html: () => `${ph("Badges", "Bronze, silver and gold for every habit")}<div id="bgList" class="stack-lg"></div>`,
  show(el) {
    const s = getStats(), cats = [...new Set(BADGES.map(b => b.cat))], earned = Store.get("badges", {});
    const total = BADGES.reduce((a, b) => a + (earned[b.id] || 0), 0);
    $("#bgList", el).innerHTML = `<div class="card row" style="gap:14px"><div class="ring-wrap">${ringSVG(Math.round(total / (BADGES.length * 3) * 100), 64, 7, "var(--warning)")}<div class="ring-label">${icon("trophy", 22)}</div></div><div><h3>${T("{n} of {m} medals", { n: total, m: BADGES.length * 3 })}</h3><p class="small muted">${T("Keep learning to upgrade each badge.")}</p></div></div>` +
      cats.map(c => `<div><div class="section-title" style="margin-bottom:10px"><h3>${T(c)}</h3></div><div class="badge-grid">${BADGES.filter(b => b.cat === c).map(b => {
        const v = b.stat(s), t = badgeTier(b, s), next = b.tiers[t], prev = t ? b.tiers[t - 1] : 0;
        const pct = next ? Math.round((v - prev) / (next - prev) * 100) : 100;
        return `<div class="badge"><div class="medal ${["locked", "bronze", "silver", "gold"][t]}">${icon(b.icon, 26)}</div><b>${T(b.name)}</b><span>${t ? T(["", "Bronze", "Silver", "Gold"][t]) : T("Locked")}</span><div class="bar thin" style="width:100%"><div style="width:${clamp(pct, 0, 100)}%;${t === 3 ? "background:var(--warning)" : ""}"></div></div><span>${next ? v + " / " + next + " " + T(b.unit) : T("Maxed out!")}</span></div>`;
      }).join("")}</div></div>`).join("");
  }
});

// ---------- Weekly report ----------
function buildReport() {
  const p = getProfile(), s = getStats(), days = weekDays(), ms = masteryList();
  const mins = days.reduce((a, k) => a + ((s.days[k] || {}).minutes || 0), 0), xp = days.reduce((a, k) => a + ((s.days[k] || {}).xp || 0), 0);
  const rec = getRecord().filter(r => days.includes(r.day));
  const strong = ms.filter(c => c.score >= 75).sort((a, b) => b.score - a.score).slice(0, 4), weak = weakChapters().slice(0, 4);
  const away = Store.get("parentLog", []).filter(x => x.type === "away" && Date.now() - x.t < 7 * 86400000);
  return [
    "Wayfinder weekly report", (p.name || "Student") + " · " + p.grade + " · " + p.board,
    "Week ending " + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), "",
    "Study time: " + fmtMins(mins) + " · XP earned: " + xp + " · Streak: " + streakNow() + " days",
    "Sessions: " + rec.filter(r => r.type === "session").length + " · Quizzes: " + rec.filter(r => r.type === "quiz").length + " · Doubts asked: " + rec.filter(r => r.type === "chat").length,
    "Left the app during focus: " + away.length + " time(s)", "",
    "Strong: " + (strong.length ? strong.map(c => c.chapter + " (" + c.score + "%)").join(", ") : "not enough quizzes yet"),
    "Needs practice: " + (weak.length ? weak.map(c => c.chapter + " (" + c.score + "%)").join(", ") : "nothing right now")
  ].join("\n");
}
view("report", {
  tab: "progress",
  html: () => `${ph("Weekly report", "Share with parents or teachers")}
    <div class="card"><pre id="rpT" data-notr style="white-space:pre-wrap;font-family:var(--font-body);margin:0;line-height:1.7;color:var(--text-2)"></pre><div id="rpAI" class="answer" style="margin-top:10px"></div></div>
    <button class="btn secondary block" id="rpAIgo">${icon("sparkles", 16)}Add an AI teacher comment</button>
    <div class="grid2"><button class="btn" id="rpWA">${icon("message", 18)}WhatsApp</button><button class="btn ghost" id="rpSh">${icon("share", 18)}Share</button></div>
    <button class="btn ghost block" id="rpCp">${icon("copy", 18)}Copy text</button>`,
  init(el) {
    let comment = "";
    const text = () => buildReport() + (comment ? "\n\nTeacher-style comment:\n" + comment : "");
    $("#rpAIgo", el).onclick = async () => { $("#rpAI", el).innerHTML = loadingHTML(); try { comment = await aiText("Here is a student's weekly study report:\n" + buildReport() + "\n\nWrite a short, kind comment (3 sentences, plain text, no markdown, in English) for their parent or teacher: one strength, one area to improve, one suggestion for next week.", { memory: false }); $("#rpAI", el).innerHTML = "<b>" + T("AI comment") + '</b><p data-notr>' + esc(comment) + "</p>"; } catch (e) { $("#rpAI", el).textContent = e.message; } };
    $("#rpWA", el).onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(text()), "_blank");
    $("#rpSh", el).onclick = async () => { if (navigator.share) try { await navigator.share({ title: "Wayfinder report", text: text() }); } catch (e) {} else window.open("https://wa.me/?text=" + encodeURIComponent(text()), "_blank"); };
    $("#rpCp", el).onclick = async () => { try { await navigator.clipboard.writeText(text()); toast(T("Copied"), "copy"); } catch (e) {} };
  },
  show(el) { $("#rpT", el).textContent = buildReport(); }
});

// ---------- Parent dashboard (PIN protected) ----------
view("parent", {
  tab: "progress",
  html: () => `${ph("Parent dashboard", "Study activity and focus alerts")}<div id="paBody"></div>`,
  show(el) {
    const p = getProfile(), body = $("#paBody", el);
    if (!p.parentPin) {
      body.innerHTML = `<div class="card stack"><div class="it c-slate lg">${icon("shield", 24)}</div><h3>${T("Set a parent PIN")}</h3><p class="small muted">${T("Parents use this 4-digit PIN to open this page and change parent settings.")}</p><input type="password" inputmode="numeric" maxlength="4" id="paNew" placeholder="••••" style="letter-spacing:.5em;text-align:center;font-size:1.4rem"><button class="btn block" id="paSet">${T("Save PIN")}</button></div>`;
      $("#paSet", el).onclick = () => { const v = $("#paNew", el).value; if (!/^\d{4}$/.test(v)) return toast(T("Use 4 digits")); setPref("parentPin", v); this.unlocked = true; this.show(el); };
      return;
    }
    if (!this.unlocked) {
      body.innerHTML = `<div class="card stack center" style="align-items:center"><div class="it c-slate lg">${icon("lock", 24)}</div><h3>${T("Enter parent PIN")}</h3><input type="password" inputmode="numeric" maxlength="4" id="paPin" placeholder="••••" style="letter-spacing:.5em;text-align:center;font-size:1.4rem;max-width:180px"><button class="btn" id="paGo">${T("Open")}</button></div>`;
      const go2 = () => { if ($("#paPin", el).value === p.parentPin) { this.unlocked = true; this.show(el); } else { toast(T("Wrong PIN")); sfx("bad"); } };
      $("#paGo", el).onclick = go2; $("#paPin", el).oninput = e => { if (e.target.value.length === 4) go2(); };
      return;
    }
    const s = getStats(), days = weekDays(), log = Store.get("parentLog", []);
    const week = log.filter(x => Date.now() - x.t < 7 * 86400000), aways = week.filter(x => x.type === "away"), awayMin = Math.round(aways.reduce((a, x) => a + x.secs, 0) / 60);
    const label = x => ({ start: T("Started focus"), done: T("Finished a session"), away: T("Left the app for {n}", { n: x.secs < 60 ? x.secs + "s" : Math.round(x.secs / 60) + " min" }), left: T("Away more than {n}s (alert sent)", { n: x.secs }) }[x.type] || x.type);
    body.innerHTML = `<div class="grid2"><div class="stat"><span class="k">${icon("clock", 14)}${T("Studied this week")}</span><span class="v">${fmtMins(days.reduce((a, k) => a + ((s.days[k] || {}).minutes || 0), 0))}</span></div><div class="stat"><span class="k">${icon("timer", 14)}${T("Sessions finished")}</span><span class="v">${week.filter(x => x.type === "done").length}</span></div>
      <div class="stat"><span class="k">${icon("alert", 14)}${T("Left during focus")}</span><span class="v">${aways.length}×</span></div><div class="stat"><span class="k">${icon("hourglass", 14)}${T("Time away")}</span><span class="v">${awayMin} min</span></div></div>
      <div class="card"><h3>${T("Study minutes")}</h3><div style="margin-top:10px">${barChart(days.map(k => (s.days[k] || {}).minutes || 0), days.map(k => fmtDay(k, { weekday: "short" })), { hi: 6 })}</div></div>
      <div class="card"><div class="row between"><h3>${T("Activity log")}</h3><span class="tag">${week.length}</span></div><div class="timeline" style="margin-top:12px">${week.slice(0, 40).map(x => `<div class="tl-item"><b class="small bold" style="${x.type === "away" || x.type === "left" ? "color:var(--danger-text)" : ""}">${label(x)}</b><p class="tiny muted">${new Date(x.t).toLocaleString(langCode(p.language), { weekday: "short", hour: "2-digit", minute: "2-digit" })}${x.ctx && x.ctx.subject ? ` · <span data-notr>${esc(x.ctx.subject)}${x.ctx.chapter ? ": " + esc(x.ctx.chapter) : ""}</span>` : ""}</p></div>`).join("") || `<p class="small muted">${T("No focus sessions this week yet.")}</p>`}</div></div>
      <div class="list"><a class="li" href="#settings?open=parent"><div class="it c-slate">${icon("mail", 18)}</div><div class="t"><b>${T("Email alerts")}</b><span>${p.parentEmail && CONFIG.emailjs ? T("On · ") + esc(p.parentEmail) : T("Set up in Settings")}</span></div>${icon("chevR", 18, "chev")}</a><a class="li" href="#report"><div class="it c-green">${icon("share", 18)}</div><div class="t"><b>${T("Weekly report")}</b></div>${icon("chevR", 18, "chev")}</a></div>`;
  }
});
