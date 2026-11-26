// ================= Learn tab: AI Tutor, Snap & Learn, Ask my PDF, Mind map, Key points, Listen, Saved =================
view("learn", {
  html: () => `
    <div><h1>📚 Learn</h1><p class="muted">Understand anything, your way.</p></div>
    <a class="glass card row" href="#tutor" style="text-decoration:none;color:var(--text)">
      <div style="font-size:40px">🤖</div>
      <div class="grow"><h3>AI Tutor</h3><p class="muted small">Socratic teaching · hints first · voice · web sources</p></div><span class="muted">›</span>
    </a>
    <div class="grid2">
      <a class="glass tile" href="#snap"><span class="ico">📸</span><b>Snap &amp; Learn</b><span>Photo → explanation</span></a>
      <a class="glass tile" href="#pdf"><span class="ico">📄</span><b>Ask my PDF</b><span>Chat with a chapter</span></a>
      <a class="glass tile" href="#mindmap"><span class="ico">🧠</span><b>Mind map</b><span>See a topic visually</span></a>
      <a class="glass tile" href="#keypoints"><span class="ico">📋</span><b>Key points</b><span>Formulas &amp; facts</span></a>
      <a class="glass tile" href="#listen"><span class="ico">🎧</span><b>Listen mode</b><span>Notes read aloud</span></a>
      <a class="glass tile" href="#notes"><span class="ico">🗂️</span><b>My notes</b><span>Organise &amp; revise</span></a>
    </div>
  `
});

// ---------- AI Tutor ----------
view("tutor", {
  tab: "learn",
  inputbar: true,
  html: () => `
    ${head("🤖 AI Tutor", '<span id="tExpert"></span>')}
    <div class="glass card col" style="gap:10px">
      <div class="grid2">
        <div class="field"><label for="tSubject">Subject</label><select id="tSubject"></select></div>
        <div class="field"><label for="tChapter">Chapter (optional)</label><input type="text" id="tChapter" placeholder="e.g. Ch 4 Force"></div>
      </div>
      <span class="label">How should I teach you?</span>
      <div class="pills" id="tMode">${pillsHTML(["🧭 Socratic", "💡 Hints first", "✅ Direct answer"])}</div>
      <p class="muted small" id="tModeTip"></p>
      <label class="switch"><span>🌐 Search the web (shows sources)</span><input type="checkbox" id="tSearch"><span class="track"></span></label>
      <label class="switch"><span>🔊 Read answers aloud</span><input type="checkbox" id="tSpeak"><span class="track"></span></label>
    </div>
    <div class="chat" id="tChat"></div>
    <div class="pills" id="tQuick">
      <button class="pill" data-q="Explain that again in a simpler way, like I'm 10 years old.">🧸 Simpler</button>
      <button class="pill" data-q="Give me one real-life example of that.">🌍 Example</button>
      <button class="pill" data-q="Now show me the full answer step by step.">✅ Full answer</button>
      <button class="pill" id="tQuiz">📝 Quiz me</button>
      <button class="pill" id="tNew">🗑️ New chat</button>
    </div>
    <div class="inputbar glass">
      <button class="icon-btn" id="tMic" aria-label="Speak your question">🎤</button>
      <input type="text" id="tInput" placeholder="Ask any doubt…" aria-label="Your question" enterkeyhint="send">
      <button class="icon-btn on" id="tSend" aria-label="Send">➤</button>
    </div>
  `,
  init(el) {
    const p = getProfile();
    const chat = $("#tChat", el), input = $("#tInput", el);
    let history = Store.get("chat", []);
    let lastQuestion = "";
    let busy = false;

    $("#tSubject", el).innerHTML = ["Any subject"].concat(p.subjects).map(s => `<option>${esc(s)}</option>`).join("");
    const ctx = Store.get("tutorCtx", {});
    if (ctx.subject) $("#tSubject", el).value = ctx.subject;
    $("#tChapter", el).value = ctx.chapter || "";
    const saveCtx = () => Store.set("tutorCtx", { subject: $("#tSubject", el).value, chapter: $("#tChapter", el).value });
    $("#tSubject", el).addEventListener("change", saveCtx);
    $("#tChapter", el).addEventListener("change", saveCtx);
    $("#tSpeak", el).checked = p.speak;
    const MODE_TIPS = {
      "🧭 Socratic": "I'll ask you questions and guide you to the answer, like a real tutor.",
      "💡 Hints first": "For homework, I'll give a hint first. Ask for the full answer any time.",
      "✅ Direct answer": "I'll explain fully straight away. Best for quick revision."
    };
    const modeKey = m => "🧭 Socratic|💡 Hints first|✅ Direct answer".split("|").find(k => k.includes(m)) || "🧭 Socratic";
    const getMode = wireChoices($("#tMode", el), modeKey(p.tutorMode), false, v => {
      const q = getProfile(); q.tutorMode = v.replace(/^\S+\s/, ""); q.hintFirst = !v.includes("Direct"); saveProfile(q);
      $("#tModeTip", el).textContent = MODE_TIPS[v];
    });
    $("#tModeTip", el).textContent = MODE_TIPS[getMode()];
    $("#tSpeak", el).addEventListener("change", e => { const q = getProfile(); q.speak = e.target.checked; saveProfile(q); if (!q.speak && window.speechSynthesis) speechSynthesis.cancel(); });

    function bubble(msg) {
      const d = document.createElement("div");
      d.className = msg.role === "you" ? "bubble you" : "glass bubble ai";
      if (msg.role === "you") d.textContent = msg.text;
      else {
        d.innerHTML = `<div class="answer">${fmt(msg.text)}</div>` +
          (msg.sources && msg.sources.length ? `<div class="sources"><b>Sources</b>${msg.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">🔗 ${esc(s.title)}</a>`).join("")}</div>` : "") +
          `<div class="ai-label">🤖 AI answer · check important facts with your textbook</div>` +
          `<div class="acts"><button data-a="listen">🔊 Listen</button><button data-a="save">🔖 Save</button><button data-a="report">👎 Wrong?</button></div>`;
        d.querySelector('[data-a="listen"]').onclick = () => speak(msg.text);
        d.querySelector('[data-a="save"]').onclick = () => saveItem(msg.q || "Tutor answer", msg.text, "Answer");
        d.querySelector('[data-a="report"]').onclick = (e) => {
          const reports = Store.get("reports", []);
          reports.push({ q: msg.q, a: msg.text.slice(0, 300), date: dayKey() });
          Store.set("reports", reports);
          e.target.textContent = "✓ Reported";
          toast("Thanks! Always double-check important facts with your textbook.");
        };
      }
      chat.appendChild(d);
      return d;
    }
    function renderAll() {
      chat.innerHTML = "";
      const hi = bubble({ role: "ai", text: "Hi " + (getProfile().name || "") + "! 👋 Ask me anything you're studying. I'll guide you step by step." });
      hi.querySelector(".acts").remove(); hi.querySelector(".ai-label").remove();
      history.forEach(bubble);
    }
    renderAll();

    async function send(text, isQuick) {
      const q = (text || input.value).trim();
      if (!q || busy) return;
      busy = true;
      input.value = "";
      if (!isQuick) lastQuestion = q;
      history.push({ role: "you", text: q });
      bubble({ role: "you", text: q });
      const wait = bubble({ role: "ai", text: "" });
      wait.innerHTML = LOADING;
      window.scrollTo(0, document.body.scrollHeight);

      const subj = $("#tSubject", el).value, chap = $("#tChapter", el).value.trim();
      const context = (subj !== "Any subject" ? "Subject: " + subj + ". " : "") + (chap ? "Chapter: " + chap + ". " : "");
      const convo = history.slice(-8).map(m => (m.role === "you" ? "Student: " : "Tutor: ") + m.text.slice(0, 1200)).join("\n");
      const MODE_RULES = {
        "🧭 Socratic": "Teach with the Socratic method. If you don't yet know what the student already understands about this topic, start by asking ONE short question to find out. " +
          "Then explain in small steps. After each step, ask one quick question to check they understood. If they answer wrongly, gently correct the misconception and try a simpler question. " +
          "For homework or exercise problems, never give the final answer straight away: guide them with hints until they get it, unless they clearly ask for the full answer. " +
          "Keep each reply short (under 120 words) and usually end with a question for the student.",
        "💡 Hints first": "If the student asks you to solve a homework or exercise problem, first give a helpful hint and a guiding question instead of the final answer. Give the full worked answer only if they ask for it.",
        "✅ Direct answer": "Give a clear, complete explanation straight away."
      };
      const hint = MODE_RULES[getMode()] || "";
      try {
        const out = await ai(context + "\nConversation so far:\n" + convo + "\n\nReply to the student's last message.", { search: $("#tSearch", el).checked, extra: hint, check: q });
        const msg = { role: "ai", text: out.reply, sources: out.sources || [], q: lastQuestion };
        history.push(msg);
        history = history.slice(-30);
        Store.set("chat", history);
        wait.remove();
        const b = bubble(msg);
        const ans = b.querySelector(".answer");
        // Quick "live typing" reveal
        const words = out.reply.split(" ");
        if (!getProfile().lite && words.length > 8) {
          let n = 0;
          const timer = setInterval(() => {
            n += 6;
            ans.innerHTML = fmt(words.slice(0, n).join(" "));
            if (n >= words.length) { clearInterval(timer); ans.innerHTML = fmt(out.reply); }
          }, 22);
        }
        addXP(5, "questions");
        if (getProfile().speak) speak(out.reply);
      } catch (e) {
        history.pop();
        wait.innerHTML = "⚠️ " + esc(e.message) + ' <button class="btn sm ghost" style="margin-left:6px">Try again</button>';
        wait.querySelector("button").onclick = () => { wait.remove(); chat.lastElementChild && chat.lastElementChild.remove(); send(q, isQuick); };
      }
      busy = false;
    }

    $("#tSend", el).addEventListener("click", () => send());
    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
    $$("[data-q]", el).forEach(b => b.addEventListener("click", () => {
      if (!history.length) { toast("Ask a question first 🙂"); return; }
      send(b.dataset.q, true);
    }));
    $("#tQuiz", el).addEventListener("click", () => {
      if (!lastQuestion && !history.length) { toast("Ask a question first, then I'll quiz you"); return; }
      const topic = lastQuestion || (history.filter(m => m.role === "you").pop() || {}).text;
      go("quiz?topic=" + encodeURIComponent(topic.slice(0, 80)));
    });
    $("#tNew", el).addEventListener("click", () => { history = []; Store.set("chat", []); lastQuestion = ""; renderAll(); toast("New chat started"); });
    $("#tMic", el).addEventListener("click", () => {
      $("#tMic", el).classList.add("on");
      input.placeholder = "Listening… 👂";
      listen(t => { input.value = t; send(); }, () => { $("#tMic", el).classList.remove("on"); input.placeholder = "Ask any doubt…"; });
    });
  },
  show(el, params) {
    const p = getProfile();
    $("#tExpert", el).textContent = p.expert + " · " + p.personality + " · " + p.language;
    const q = params.get("q");
    if (q) { $("#tInput", el).value = q; }
  }
});

// ---------- Snap & Learn ----------
view("snap", {
  tab: "learn",
  html: () => `
    ${head("📸 Snap &amp; Learn", "Photo of notes, a textbook page or your solved answer")}
    <label for="sPhoto" class="glass card col center" style="align-items:center; cursor:pointer">
      <div style="font-size:48px">📷</div>
      <b>Tap to take or choose a photo</b>
      <span class="muted small">JPG or PNG</span>
      <img id="sPreview" alt="Your photo" class="hidden" style="max-width:100%; max-height:280px; border-radius:16px">
    </label>
    <input type="file" id="sPhoto" accept="image/*" class="hidden">
    <div class="grid2">
      <button class="btn" data-m="hint">🧩 Help me solve</button>
      <button class="btn" data-m="explain">💡 Explain it</button>
      <button class="btn ghost" data-m="notes">📝 Short notes</button>
      <button class="btn ghost" data-m="mistake">🔍 Find my mistake</button>
    </div>
    <button class="btn ghost full" data-m="questions">❓ Make practice questions</button>
    <p class="muted small center">🧩 "Help me solve" gives hints first, so you learn instead of copying.</p>
    <div id="sOut" class="glass card answer hidden"></div>
  `,
  init(el) {
    let photo = null;
    const out = $("#sOut", el);
    const PROMPTS = {
      hint: "This is a photo of a question or problem a student is stuck on. Do NOT give the final answer. Say in one line what the question is asking, then give the first helpful hint and one guiding question. Keep it under 80 words.",
      solve: "This is a photo of a question or problem. Now show the full solution step by step, explaining why each step works, and give the final answer clearly.",
      explain: "This is a photo of a student's notes or textbook. Explain what it is about, step by step, with one real-life example.",
      notes: "This is a photo of a student's notes or textbook. Turn it into short revision notes: 5 to 8 bullet points with the key facts.",
      mistake: "This is a photo of a student's solved answer. Check it carefully. Say what is correct, point out each mistake, and show the right way.",
      questions: "This is a photo of a student's notes or textbook. Write 5 practice questions about it, then give the answers at the end."
    };
    const show = h => { out.classList.remove("hidden"); out.innerHTML = h; };
    function showReply(mode, label, reply) {
      show(fmt(reply) +
        (mode === "hint" ? `<p class="muted small" style="margin-top:10px">Try it yourself first. Still stuck?</p><button class="btn full" id="sSolve">✅ Show full solution</button>` : "") +
        `<div class="row" style="margin-top:12px"><button class="btn sm ghost" id="sSave">🔖 Save</button><button class="btn sm ghost" id="sListen">🔊 Listen</button></div>`);
      $("#sSave", el).onclick = () => saveItem("Snap: " + label, reply, "Snap");
      $("#sListen", el).onclick = () => speak(reply);
      if (mode === "hint") $("#sSolve", el).onclick = async () => {
        show(LOADING);
        try { showReply("solve", "Full solution", await aiText(PROMPTS.solve, { image: { mimeType: photo.mimeType, data: photo.data } })); }
        catch (err) { show("⚠️ " + esc(err.message)); }
      };
    }
    $("#sPhoto", el).addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        photo = await shrinkImage(f);
        $("#sPreview", el).src = photo.preview;
        $("#sPreview", el).classList.remove("hidden");
        out.classList.add("hidden");
      } catch (err) { show("⚠️ Couldn't open that photo. Try a JPG or PNG."); }
    });
    $$("[data-m]", el).forEach(b => b.addEventListener("click", async () => {
      if (!photo) { show("👆 Choose a photo first."); return; }
      show(LOADING);
      try {
        const reply = await aiText(PROMPTS[b.dataset.m], { image: { mimeType: photo.mimeType, data: photo.data } });
        showReply(b.dataset.m, b.textContent.trim(), reply);
        addXP(10, "snaps");
      } catch (err) { show("⚠️ " + esc(err.message)); }
    }));
  }
});

// ---------- Ask my PDF ----------
view("pdf", {
  tab: "learn",
  html: () => `
    ${head("📄 Ask my PDF", "Upload a chapter (up to 3 MB) and ask about it")}
    <label for="pFile" class="glass card row" style="cursor:pointer">
      <div style="font-size:36px">📎</div>
      <div class="grow"><b id="pName">Choose a PDF</b><p class="muted small">Your file stays private to this chat</p></div>
    </label>
    <input type="file" id="pFile" accept="application/pdf" class="hidden">
    <div class="pills">
      <button class="pill" data-p="Summarise this chapter in 8 bullet points.">📝 Summarise</button>
      <button class="pill" data-p="List the important definitions and formulas in this chapter.">📋 Key terms</button>
      <button class="pill" data-p="Make 5 likely exam questions from this chapter, with short answers.">❓ Exam questions</button>
    </div>
    <div class="row"><input type="text" id="pQ" placeholder="Ask anything about the PDF…"><button class="btn" id="pAsk">Ask</button></div>
    <div id="pOut" class="glass card answer hidden"></div>
  `,
  init(el) {
    let file = null;
    const out = $("#pOut", el);
    const show = h => { out.classList.remove("hidden"); out.innerHTML = h; };
    $("#pFile", el).addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { file = null; show("⚠️ That PDF is bigger than 3 MB. Try a single chapter."); return; }
      file = await fileToBase64(f);
      $("#pName", el).textContent = "✅ " + f.name;
    });
    async function ask(q) {
      if (!file) { show("👆 Choose a PDF first."); return; }
      if (!q) return;
      show(LOADING);
      try {
        const reply = await aiText("Answer using only this PDF. If the answer isn't in it, say so. Question: " + q, { file });
        show(fmt(reply) + `<div class="row" style="margin-top:12px"><button class="btn sm ghost" id="pSave">🔖 Save</button></div>`);
        $("#pSave", el).onclick = () => saveItem("PDF: " + q, reply, "PDF");
        addXP(10, "pdfs");
      } catch (err) { show("⚠️ " + esc(err.message)); }
    }
    $("#pAsk", el).addEventListener("click", () => ask($("#pQ", el).value.trim()));
    $("#pQ", el).addEventListener("keydown", e => { if (e.key === "Enter") ask($("#pQ", el).value.trim()); });
    $$("[data-p]", el).forEach(b => b.addEventListener("click", () => ask(b.dataset.p)));
  }
});

// ---------- Mind map ----------
view("mindmap", {
  tab: "learn",
  html: () => `
    ${head("🧠 Mind map", "See how a topic fits together")}
    <div class="row"><input type="text" id="mTopic" placeholder="e.g. Photosynthesis, French Revolution"><button class="btn" id="mGo">Make</button></div>
    <div id="mOut" class="col"></div>
  `,
  init(el) {
    const out = $("#mOut", el);
    async function make() {
      const topic = $("#mTopic", el).value.trim();
      if (!topic) { toast("Type a topic first"); return; }
      out.innerHTML = `<div class="glass card">${LOADING}</div>`;
      try {
        const d = await aiJSON('Make a mind map for a student on "' + topic + '". Return JSON: {"title":"...","branches":[{"name":"...","emoji":"one emoji","points":["short point","short point"]}]}. Use 4 to 6 branches with 2 to 4 short points each.');
        out.innerHTML = `<div class="mm-root">${esc(d.title || topic)}</div>` +
          (d.branches || []).map(b => `<div class="mm-line"></div><div class="glass mm-branch"><b>${esc(b.emoji || "•")} ${esc(b.name)}</b><ul>${(b.points || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("") +
          `<button class="btn ghost full" id="mSave" style="margin-top:6px">🔖 Save mind map</button>`;
        $("#mSave", el).onclick = () => saveItem("Mind map: " + topic, (d.branches || []).map(b => "## " + b.name + "\n" + (b.points || []).map(x => "- " + x).join("\n")).join("\n\n"), "Mind map");
        addXP(10, "maps");
      } catch (e) { out.innerHTML = `<div class="glass card">⚠️ ${esc(e.message)}</div>`; }
    }
    $("#mGo", el).addEventListener("click", make);
    $("#mTopic", el).addEventListener("keydown", e => { if (e.key === "Enter") make(); });
  }
});

// ---------- Key points / formula sheet ----------
view("keypoints", {
  tab: "learn",
  html: () => `
    ${head("📋 Key points", "A one-page revision sheet for any chapter")}
    <div class="glass card col">
      <div class="field"><label for="kSub">Subject</label><select id="kSub"></select></div>
      <div class="field"><label for="kCh">Chapter or topic</label><input type="text" id="kCh" placeholder="e.g. Light: Reflection and Refraction"></div>
      <button class="btn full" id="kGo">Make my sheet</button>
    </div>
    <div id="kOut" class="glass card answer hidden"></div>
  `,
  init(el) {
    $("#kSub", el).innerHTML = getProfile().subjects.map(s => `<option>${esc(s)}</option>`).join("");
    const out = $("#kOut", el);
    $("#kGo", el).addEventListener("click", async () => {
      const ch = $("#kCh", el).value.trim();
      if (!ch) { toast("Type a chapter first"); return; }
      out.classList.remove("hidden");
      out.innerHTML = LOADING;
      try {
        const reply = await aiText("Make a one-page revision sheet for " + $("#kSub", el).value + ", chapter: " + ch + ". Include: key definitions, formulas (if any), important facts, and 3 common exam mistakes. Keep it short and clear.");
        out.innerHTML = fmt(reply) + `<div class="row" style="margin-top:12px"><button class="btn sm ghost" id="kSave">🔖 Save</button><button class="btn sm ghost" id="kListen">🔊 Listen</button></div>`;
        $("#kSave", el).onclick = () => saveItem("Key points: " + ch, reply, "Sheet");
        $("#kListen", el).onclick = () => speak(reply);
        addXP(10, "sheets");
      } catch (e) { out.innerHTML = "⚠️ " + esc(e.message); }
    });
  }
});

// ---------- Listen mode ----------
view("listen", {
  tab: "learn",
  html: () => `
    ${head("🎧 Listen mode", "Hear your notes like a podcast")}
    <div class="field"><label for="lPick">Pick a saved note</label><select id="lPick"></select></div>
    <textarea id="lText" placeholder="…or paste any notes here"></textarea>
    <div class="row">
      <button class="btn grow" id="lPlay">▶ Play</button>
      <button class="btn ghost" id="lPause">⏸</button>
      <button class="btn ghost" id="lStop">⏹</button>
    </div>
  `,
  show(el) {
    const items = Store.get("notes", []).map(n => ({ title: "📒 " + n.title, text: n.text })).concat(Store.get("saved", []));
    $("#lPick", el).innerHTML = `<option value="">Choose…</option>` + items.map((it, i) => `<option value="${i}">${esc(it.title)}</option>`).join("");
    $("#lPick", el).onchange = e => { const it = items[e.target.value]; if (it) $("#lText", el).value = it.text; };
    $("#lPlay", el).onclick = () => {
      if (window.speechSynthesis && speechSynthesis.paused) { speechSynthesis.resume(); return; }
      const t = $("#lText", el).value.trim();
      if (!t) { toast("Pick or paste some notes first"); return; }
      speak(t);
    };
    $("#lPause", el).onclick = () => window.speechSynthesis && speechSynthesis.pause();
    $("#lStop", el).onclick = () => window.speechSynthesis && speechSynthesis.cancel();
  }
});

// ---------- Saved ----------
function renderSaved(list) {
  const items = Store.get("saved", []);
  if (!items.length) { list.innerHTML = `<div class="glass empty">Nothing saved yet. Tap 🔖 on any answer to keep it here.</div>`; return; }
  list.innerHTML = items.map((it, i) => `
    <details class="glass card">
      <summary class="row between" style="cursor:pointer; list-style:none">
        <span class="grow"><b>${esc(it.title)}</b><br><span class="muted small">${esc(it.kind)} · ${esc(it.date)}</span></span><span class="muted">▾</span>
      </summary>
      <div class="answer" style="margin-top:10px">${fmt(it.text)}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-l="${i}">🔊 Listen</button><button class="btn sm ghost" data-d="${i}">🗑️ Delete</button></div>
    </details>`).join("");
  $$("[data-l]", list).forEach(b => b.onclick = () => speak(items[b.dataset.l].text));
  $$("[data-d]", list).forEach(b => b.onclick = () => { items.splice(b.dataset.d, 1); Store.set("saved", items); renderSaved(list); });
}
view("saved", {
  tab: "learn",
  html: () => `${head("🔖 Saved", "Answers, notes and sheets you kept · works offline")}<div id="svList" class="col"></div>`,
  show(el) { renderSaved($("#svList", el)); }
});

// ---------- Notes organiser ----------
view("notes", {
  tab: "learn",
  html: () => `
    ${head("🗂️ My notes", "Write, organise and revise your notes")}
    <div class="pills" id="nTabs">${pillsHTML(["📒 My notes", "🔖 Saved answers"])}</div>
    <div id="nMine" class="col">
      <button class="btn full" id="nNew">➕ New note</button>
      <form id="nForm" class="glass card col hidden">
        <div class="field"><label for="nTitle">Title</label><input type="text" id="nTitle" maxlength="60" placeholder="e.g. Ch 3 Synthetic fibres"></div>
        <div class="field"><label for="nSub">Subject</label><select id="nSub"></select></div>
        <div class="field"><label for="nText">Notes</label><textarea id="nText" placeholder="Type or paste messy notes. The AI can organise them for you." style="min-height:140px"></textarea></div>
        <div class="row"><button class="btn grow" type="submit">Save note</button><button class="btn ghost" type="button" id="nCancel">Cancel</button></div>
      </form>
      <input type="text" id="nSearch" placeholder="🔍 Search your notes">
      <div class="pills" id="nFilter"></div>
      <div id="nList" class="col"></div>
    </div>
    <div id="nSaved" class="col hidden"></div>
  `,
  init(el) {
    const self = this;
    let editing = null, filter = "All";
    const subjects = () => getProfile().subjects;
    $("#nSub", el).innerHTML = subjects().concat("Other").map(s => `<option>${esc(s)}</option>`).join("");
    wireChoices($("#nTabs", el), "📒 My notes", false, v => {
      $("#nMine", el).classList.toggle("hidden", !v.includes("My notes"));
      $("#nSaved", el).classList.toggle("hidden", v.includes("My notes"));
      if (!v.includes("My notes")) renderSaved($("#nSaved", el));
    });
    const openForm = (n) => {
      editing = n ? n.id : null;
      $("#nTitle", el).value = n ? n.title : "";
      $("#nText", el).value = n ? n.text : "";
      if (n) $("#nSub", el).value = n.subject;
      $("#nForm", el).classList.remove("hidden");
      $("#nNew", el).classList.add("hidden");
      $("#nTitle", el).focus();
    };
    const closeForm = () => { $("#nForm", el).classList.add("hidden"); $("#nNew", el).classList.remove("hidden"); editing = null; };
    $("#nNew", el).onclick = () => openForm(null);
    $("#nCancel", el).onclick = closeForm;
    $("#nForm", el).addEventListener("submit", e => {
      e.preventDefault();
      const title = $("#nTitle", el).value.trim(), text = $("#nText", el).value.trim();
      if (!title || !text) { toast("Add a title and some notes"); return; }
      const notes = Store.get("notes", []);
      if (editing) Object.assign(notes.find(n => n.id === editing), { title, text, subject: $("#nSub", el).value, date: dayKey() });
      else { notes.unshift({ id: Date.now(), title, text, subject: $("#nSub", el).value, date: dayKey() }); addXP(5, "notes"); }
      Store.set("notes", notes);
      closeForm();
      toast("📒 Note saved");
      self.paint(el);
    });
    $("#nSearch", el).addEventListener("input", () => self.paint(el));
    this._filter = () => filter;
    this._setFilter = f => { filter = f; self.paint(el); };
    this._edit = openForm;
  },
  paint(el) {
    const self = this;
    const all = Store.get("notes", []);
    const subs = ["All"].concat([...new Set(all.map(n => n.subject))]);
    const f = this._filter();
    $("#nFilter", el).innerHTML = subs.length > 2 ? subs.map(s => `<button class="pill ${s === f ? "on" : ""}" data-f="${esc(s)}">${esc(s)}</button>`).join("") : "";
    $$("[data-f]", el).forEach(b => b.onclick = () => self._setFilter(b.dataset.f));
    const q = $("#nSearch", el).value.trim().toLowerCase();
    const list = all.filter(n => (f === "All" || n.subject === f) && (!q || (n.title + " " + n.text).toLowerCase().includes(q)));
    const box = $("#nList", el);
    if (!all.length) { box.innerHTML = `<div class="glass empty">No notes yet. Tap ➕ New note, or paste class notes and let the AI organise them.</div>`; return; }
    if (!list.length) { box.innerHTML = `<div class="glass empty">No notes match.</div>`; return; }
    box.innerHTML = list.map(n => `
      <details class="glass card" data-id="${n.id}">
        <summary class="row between" style="cursor:pointer;list-style:none">
          <span class="grow"><b>${esc(n.title)}</b><br><span class="muted small">${esc(n.subject)} · ${esc(n.date)}</span></span><span class="muted">▾</span>
        </summary>
        <div class="answer" style="margin-top:10px">${fmt(n.text)}</div>
        <div class="pills" style="margin-top:10px">
          <button class="pill" data-act="organise">✨ Organise</button>
          <button class="pill" data-act="summary">📝 Summary</button>
          <button class="pill" data-act="cards">🃏 Flashcards</button>
          <button class="pill" data-act="quiz">📝 Quiz me</button>
          <button class="pill" data-act="listen">🔊 Listen</button>
          <button class="pill" data-act="edit">✏️ Edit</button>
          <button class="pill" data-act="del">🗑️</button>
        </div>
        <div class="nOut answer"></div>
      </details>`).join("");
    $$("[data-act]", box).forEach(b => b.onclick = async () => {
      const card = b.closest("details"), id = Number(card.dataset.id);
      const notes = Store.get("notes", []), n = notes.find(x => x.id === id);
      const out = $(".nOut", card);
      const act = b.dataset.act;
      if (act === "listen") return speak(n.text);
      if (act === "edit") return this._edit(n);
      if (act === "quiz") return go("quiz?topic=" + encodeURIComponent(n.title));
      if (act === "cards") return go("cards?note=" + n.id);
      if (act === "del") {
        if (b.dataset.sure) { Store.set("notes", notes.filter(x => x.id !== id)); toast("Deleted"); return this.paint(el); }
        b.dataset.sure = 1; b.textContent = "Tap again to delete"; return;
      }
      out.innerHTML = LOADING;
      try {
        if (act === "organise") {
          const t = await aiText("Reorganise these student notes into clean revision notes: short headings, bullet points, key terms in bold, and fix spelling. Keep every fact, add nothing new. Notes:\n\n" + n.text.slice(0, 6000));
          out.innerHTML = fmt(t) + `<div class="row" style="margin-top:10px"><button class="btn sm">✅ Replace my note with this</button><button class="btn sm ghost">Keep original</button></div>`;
          const [yes, no] = $$("button", out);
          yes.onclick = () => { n.text = t; n.date = dayKey(); Store.set("notes", notes); toast("✨ Note organised"); this.paint(el); };
          no.onclick = () => { out.innerHTML = ""; };
        } else {
          const t = await aiText("Summarise these notes in 5 short bullet points a student can revise in one minute:\n\n" + n.text.slice(0, 6000));
          out.innerHTML = fmt(t);
        }
      } catch (e) { out.innerHTML = "⚠️ " + esc(e.message); }
    });
  },
  show(el) { this.paint(el); }
});