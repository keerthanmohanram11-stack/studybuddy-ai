// ================= Learn tab: AI Tutor, Snap & Learn, Ask my PDF, Mind map, Key points, Listen, Saved =================
view("learn", {
  html: () => `
    <div><h1>📚 Learn</h1><p class="muted">Understand anything, your way.</p></div>
    <a class="glass card row" href="#tutor" style="text-decoration:none;color:var(--text)">
      <div style="font-size:40px">🤖</div>
      <div class="grow"><h3>AI Tutor</h3><p class="muted small">Ask any doubt · hints first · voice · web sources</p></div><span class="muted">›</span>
    </a>
    <div class="grid2">
      <a class="glass tile" href="#snap"><span class="ico">📸</span><b>Snap &amp; Learn</b><span>Photo → explanation</span></a>
      <a class="glass tile" href="#pdf"><span class="ico">📄</span><b>Ask my PDF</b><span>Chat with a chapter</span></a>
      <a class="glass tile" href="#mindmap"><span class="ico">🧠</span><b>Mind map</b><span>See a topic visually</span></a>
      <a class="glass tile" href="#keypoints"><span class="ico">📋</span><b>Key points</b><span>Formulas &amp; facts</span></a>
      <a class="glass tile" href="#listen"><span class="ico">🎧</span><b>Listen mode</b><span>Notes read aloud</span></a>
      <a class="glass tile" href="#saved"><span class="ico">🔖</span><b>Saved</b><span>Your notes</span></a>
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
      <label class="switch"><span>💡 Hints first (learn, don't copy)</span><input type="checkbox" id="tHint"><span class="track"></span></label>
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
    $("#tHint", el).checked = p.hintFirst;
    $("#tSpeak", el).checked = p.speak;
    $("#tHint", el).addEventListener("change", e => { const q = getProfile(); q.hintFirst = e.target.checked; saveProfile(q); });
    $("#tSpeak", el).addEventListener("change", e => { const q = getProfile(); q.speak = e.target.checked; saveProfile(q); if (!q.speak && window.speechSynthesis) speechSynthesis.cancel(); });

    function bubble(msg) {
      const d = document.createElement("div");
      d.className = msg.role === "you" ? "bubble you" : "glass bubble ai";
      if (msg.role === "you") d.textContent = msg.text;
      else {
        d.innerHTML = `<div class="answer">${fmt(msg.text)}</div>` +
          (msg.sources && msg.sources.length ? `<div class="sources"><b>Sources</b>${msg.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">🔗 ${esc(s.title)}</a>`).join("")}</div>` : "") +
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
      bubble({ role: "ai", text: "Hi " + (getProfile().name || "") + "! 👋 Ask me anything you're studying. I'll guide you step by step." }).querySelector(".acts").remove();
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
      const hint = getProfile().hintFirst
        ? "If the student asks you to solve a homework or exercise problem, first give a helpful hint and a guiding question instead of the final answer. Give the full worked answer only if they ask for it."
        : "";
      try {
        const out = await ai(context + "\nConversation so far:\n" + convo + "\n\nReply to the student's last message.", { search: $("#tSearch", el).checked, extra: hint });
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
      <button class="btn" data-m="explain">💡 Explain it</button>
      <button class="btn" data-m="notes">📝 Short notes</button>
      <button class="btn ghost" data-m="mistake">🔍 Find my mistake</button>
      <button class="btn ghost" data-m="questions">❓ Make questions</button>
    </div>
    <div id="sOut" class="glass card answer hidden"></div>
  `,
  init(el) {
    let photo = null;
    const out = $("#sOut", el);
    const PROMPTS = {
      explain: "This is a photo of a student's notes or textbook. Explain what it is about, step by step, with one real-life example.",
      notes: "This is a photo of a student's notes or textbook. Turn it into short revision notes: 5 to 8 bullet points with the key facts.",
      mistake: "This is a photo of a student's solved answer. Check it carefully. Say what is correct, point out each mistake, and show the right way.",
      questions: "This is a photo of a student's notes or textbook. Write 5 practice questions about it, then give the answers at the end."
    };
    const show = h => { out.classList.remove("hidden"); out.innerHTML = h; };
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
        show(fmt(reply) + `<div class="row" style="margin-top:12px"><button class="btn sm ghost" id="sSave">🔖 Save</button><button class="btn sm ghost" id="sListen">🔊 Listen</button></div>`);
        $("#sSave", el).onclick = () => saveItem("Snap: " + b.textContent.trim(), reply, "Snap");
        $("#sListen", el).onclick = () => speak(reply);
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
    const items = Store.get("saved", []);
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
view("saved", {
  tab: "learn",
  html: () => `${head("🔖 Saved", "Answers, notes and sheets you kept · works offline")}<div id="svList" class="col"></div>`,
  show(el) {
    const list = $("#svList", el);
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
    $$("[data-d]", list).forEach(b => b.onclick = () => { items.splice(b.dataset.d, 1); Store.set("saved", items); this.show(el); });
  }
});