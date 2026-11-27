// ================= Learn: AI helpers chat, Snap & solve, Video lessons, Notes, tools =================

view("learn", {
  html: () => `
    ${ph("Learn", "Every question is a path. Let's walk it together.", { back: false })}
    <div class="section-title"><h3>Ask an AI helper</h3><button id="lnAll">${T("History")}</button></div>
    <div class="helpers stagger">${HELPERS.map(h => `<button class="helper" data-h="${h.id}"><span class="helper-av" style="background:${h.color}">${icon(h.icon, 20)}</span><b>${h.name}</b><span>${h.desc}</span></button>`).join("")}</div>
    <div class="section-title"><h3>Study tools</h3></div>
    <div class="list">
      ${[["snap", "camera", "c-coral", "Snap & solve", "Take a photo of any question or page"], ["video", "video", "c-red", "Video lessons", "Watch YouTube lessons and ask doubts mid-video"], ["notes", "notes", "c-amber", "My notes", "Your notebook, organised by subject and chapter"], ["pdf", "file", "c-sky", "Ask my PDF", "Chat with a chapter or worksheet"], ["mindmap", "mindmap", "c-violet", "Mind map", "See how a topic fits together"], ["keypoints", "keypoints", "c-green", "Key points sheet", "Formulas, definitions and must-know facts"], ["listen", "headphones", "c-teal", "Listen mode", "Hear your notes read aloud"]].map(t => `<a class="li" href="#${t[0]}"><div class="it ${t[2]}">${icon(t[1], 20)}</div><div class="t"><b>${t[3]}</b><span>${t[4]}</span></div>${icon("chevR", 18, "chev")}</a>`).join("")}
    </div>
    <div class="section-title"><h3>Recent chats</h3></div>
    <div id="lnRecent"></div>`,
  init(el) {
    $$("[data-h]", el).forEach(b => b.onclick = () => go("chat?helper=" + b.dataset.h + "&new=1"));
    $("#lnAll", el).onclick = () => threadsSheet();
  },
  show(el) {
    const th = getThreads().slice(0, 3);
    $("#lnRecent", el).innerHTML = th.length ? `<div class="list">${th.map(threadRow).join("")}</div>` : `<div class="card flat empty"><div class="it">${icon("messages", 26)}</div><p>${T("Your conversations will appear here, sorted by chapter.")}</p></div>`;
  }
});

// ---------- Chat threads ----------
function getThreads() { return Store.get("threads", []).sort((a, b) => b.updated - a.updated); }
function saveThread(th) { const all = Store.get("threads", []).filter(t => t.id !== th.id); th.updated = Date.now(); all.unshift(th); Store.set("threads", all.slice(0, 60)); }
function helperById(id) { return HELPERS.find(h => h.id === id) || HELPERS[0]; }
function threadRow(t) {
  const h = helperById(t.helper);
  return `<a class="li" href="#chat?thread=${t.id}"><span class="helper-av" style="background:${h.color};width:38px;height:38px;border-radius:12px">${icon(h.icon, 18)}</span><div class="t"><b data-notr>${esc(t.title || h.name)}</b><span><span>${h.name}</span>${t.subject ? ` · <span data-notr>${esc(t.chapter || t.subject)}</span>` : ""} · <span data-notr>${timeAgo(t.updated)}</span></span></div>${icon("chevR", 18, "chev")}</a>`;
}
function threadsSheet() {
  const th = getThreads();
  openSheet(`<div class="row between"><h3>${T("Chat history")}</h3><span class="tag">${th.length}</span></div><input type="search" id="thQ" placeholder="${T("Search chats")}" style="margin:12px 0"><div class="list" id="thList">${th.map(threadRow).join("") || `<p class="muted center" style="padding:20px">${T("No chats yet")}</p>`}</div>`, s => {
    $("#thQ", s).oninput = e => { const q = e.target.value.toLowerCase(); $("#thList", s).innerHTML = th.filter(t => (t.title + " " + t.chapter + " " + t.subject).toLowerCase().includes(q)).map(threadRow).join(""); };
    s.onclick = e => { if (e.target.closest("a.li")) closeSheet(); };
  });
}

view("chat", {
  tab: "learn", chat: true,
  html: () => `
    <div class="chat-head">
      <div class="row" style="gap:10px">
        <button class="back-btn" onclick="goBack()" aria-label="Back">${icon("back", 20)}</button>
        <button class="row grow" id="chHelper" style="gap:10px;text-align:left;min-width:0"><span class="helper-av" id="chAv"></span><span class="grow" style="min-width:0"><b class="bold ellipsis" id="chName" style="display:block"></b><span class="tiny muted row" style="gap:5px"><span class="dot-live"></span><span id="chMode"></span></span></span>${icon("chevD", 18)}</button>
        <button class="icon-btn plain" id="chMenu" aria-label="Chat options">${icon("more", 20)}</button>
      </div>
      <div class="row" style="margin-top:10px;gap:8px"><button class="ctx-chip grow" id="chCtx">${icon("book", 15)}<span class="ellipsis" id="chCtxT" data-notr></span>${icon("chevD", 14)}</button><button class="ctx-chip" id="chNew">${icon("plus", 15)}${T("New")}</button></div>
    </div>
    <div class="msgs" id="chMsgs"></div>
    <div class="composer">
      <div class="refine hidden" id="chRefine"></div>
      <div class="attach-preview hidden" id="chPrev"></div>
      <div class="bar-row">
        <button class="icon-btn plain" id="chAttach" aria-label="Add a photo">${icon("camera", 22)}</button>
        <textarea id="chIn" rows="1" placeholder="Ask anything…" aria-label="Your message"></textarea>
        <button class="icon-btn plain" id="chMic" aria-label="Speak">${icon("mic", 22)}</button>
        <button class="send" id="chSend" aria-label="Send">${icon("arrowup", 22)}</button>
      </div>
    </div>
    <input type="file" id="chFile" accept="image/*" class="hidden">`,
  init(el) {
    const self = this;
    const input = $("#chIn", el);
    let attach = null, busy = false;
    input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(140, input.scrollHeight) + "px"; });
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    $("#chSend", el).onclick = () => send();
    $("#chNew", el).onclick = () => { self.th = self.newThread(self.th.helper, self.th); self.paint(el); };
    $("#chCtx", el).onclick = () => pickContext(self.th, c => { self.th.subject = c.subject; self.th.chapter = c.chapter; if (self.th.msgs.length) saveThread(self.th); self.paint(el); });
    $("#chHelper", el).onclick = () => openSheet(`<h3>${T("Switch helper")}</h3><div class="list" style="margin-top:12px">${HELPERS.map(h => `<button class="li" data-h="${h.id}"><span class="helper-av" style="background:${h.color}">${icon(h.icon, 18)}</span><div class="t"><b>${h.name}</b><span>${h.desc}</span></div>${h.id === self.th.helper ? icon("checkc", 20) : ""}</button>`).join("")}</div>`, s => $$("[data-h]", s).forEach(b => b.onclick = () => { closeSheet(); self.th = self.newThread(b.dataset.h, self.th); self.paint(el); }));
    $("#chMenu", el).onclick = () => self.menu(el);
    $("#chAttach", el).onclick = () => openSheet(`<h3>${T("Add a photo")}</h3><div class="grid2" style="margin-top:14px"><button class="tile" id="aCam"><span class="it c-coral">${icon("camera", 22)}</span><b>${T("Camera")}</b></button><button class="tile" id="aGal"><span class="it">${icon("image", 22)}</span><b>${T("Gallery")}</b></button></div>`, s => {
      $("#aCam", s).onclick = () => { closeSheet(); openCamera(img => setAttach(img)); };
      $("#aGal", s).onclick = () => { closeSheet(); $("#chFile", el).click(); };
    });
    $("#chFile", el).onchange = async e => { const f = e.target.files[0]; if (f) setAttach(await shrinkImage(f)); e.target.value = ""; };
    function setAttach(img) {
      attach = img;
      const pv = $("#chPrev", el);
      pv.innerHTML = img ? `<img src="${img.preview}" alt="Photo to send"><span class="small muted grow">${T("Photo added. Ask your question about it.")}</span><button class="icon-btn plain" id="pvX" aria-label="Remove photo">${icon("x", 18)}</button>` : "";
      pv.classList.toggle("hidden", !img);
      if (img) { $("#pvX", pv).onclick = () => setAttach(null); input.focus(); }
    }
    $("#chMic", el).onclick = () => { const m = $("#chMic", el); m.classList.add("on"); listen(t => { input.value = (input.value + " " + t).trim(); send(); }, () => m.classList.remove("on")); };

    const words = t => new Set(String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length > 2));
    const sim = (a, b) => { const A = words(a), B = words(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.max(A.size, B.size); };

    async function send(text, quick) {
      const q = (text || input.value).trim();
      if ((!q && !attach) || busy) return;
      busy = true; $("#chSend", el).disabled = true;
      const th = self.th, h = helperById(th.helper), p = getProfile();
      const repeated = !quick && th.msgs.some(m => m.role === "user" && sim(m.text, q) >= 0.6);
      const confused = /\b(don'?t|didn'?t|do not|not) (get|understand)|confus|still (stuck|lost)|\?\?+$/i.test(q);
      const userMsg = { role: "user", text: q || T("Explain this photo"), t: Date.now() };
      if (attach) userMsg.img = attach.preview;
      th.msgs.push(userMsg);
      if (!th.title) th.title = (q || T("Photo question")).slice(0, 60);
      input.value = ""; input.style.height = "auto";
      const sentImg = attach; setAttach(null);
      self.paintMsgs(el);
      const wait = document.createElement("div"); wait.className = "msg ai";
      wait.innerHTML = `<span class="mini-av" style="background:${h.color}">${icon(h.icon, 16)}</span><div class="bubble">${loadingHTML()}</div>`;
      $("#chMsgs", el).appendChild(wait); scrollEnd();
      const ctx = (th.subject ? "Subject: " + th.subject + ". " : "") + (th.chapter ? "NCERT chapter: " + th.chapter + ". " : "");
      const convo = th.msgs.slice(-10).map(m => (m.role === "user" ? "Student: " : "You: ") + String(m.text).slice(0, 1500)).join("\n");
      let rules = h.rules;
      if (h.id === "tutor") rules += { "Hints first": " MODE: give a hint first for homework problems; full answer only when asked.", "Direct": " MODE: explain fully and directly this time, but still check understanding at the end." }[p.teachMode] || "";
      if (repeated || confused) rules += " IMPORTANT: the student " + (repeated ? "asked this before" : "says they don't understand") + ". Do NOT repeat your earlier explanation. Use a completely different approach: a new everyday analogy, simpler words or a tiny worked example. Then check understanding with one easy question.";
      try {
        const out = await ai(ctx + "\nConversation so far:\n" + convo + "\n\nReply to the student's last message." + (sentImg ? " The student attached a photo: read it carefully." : ""),
          { extra: rules, search: !!th.web, image: sentImg ? { mimeType: sentImg.mimeType, data: sentImg.data } : null, check: q });
        th.msgs.push({ role: "ai", text: out.reply, sources: out.sources || [], t: Date.now(), model: out.model });
        saveThread(th);
        wait.remove();
        self.paintMsgs(el, true);
        addXP(5, "questions");
        if (!quick) logRecord({ type: "chat", subject: th.subject, chapter: th.chapter, title: q || T("Photo question"), detail: h.name, thread: th.id });
        setLast("chat?thread=" + th.id, h.name + ": " + (th.title || ""), "messages");
        if (p.autoRead || th.read) speak(out.reply);
      } catch (e) {
        th.msgs.pop();
        wait.querySelector(".bubble").innerHTML = `<p>${esc(e.message)}</p><button class="btn sm secondary" style="margin-top:8px">${icon("refresh", 16)}${T("Try again")}</button>`;
        $("button", wait).onclick = () => { wait.remove(); input.value = q; if (sentImg) setAttach(sentImg); send(); };
      }
      busy = false; $("#chSend", el).disabled = false;
    }
    this.send = send;
    function scrollEnd() { requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })); }
    this.scrollEnd = scrollEnd;
  },
  newThread(helper, from) { return { id: uid(), helper: helper || "tutor", subject: from ? from.subject : "", chapter: from ? from.chapter : "", title: "", msgs: [], web: from ? from.web : getProfile().webSearch, read: false }; },
  show(el, params) {
    const tid = params.get("thread");
    if (tid) { const t = getThreads().find(x => x.id === tid); if (t) this.th = t; }
    else if (params.get("new") || !this.th) {
      const ctx = { subject: params.get("subject") || "", chapter: params.get("chapter") || "" };
      this.th = this.newThread(params.get("helper") || getProfile().helper, ctx);
    }
    this.paint(el);
    const q = params.get("q");
    if (q) { history.replaceState(null, "", "#chat?thread=" + this.th.id); setTimeout(() => this.send(q), 150); }
  },
  paint(el) {
    const h = helperById(this.th.helper), p = getProfile();
    $("#chAv", el).style.background = h.color; $("#chAv", el).innerHTML = icon(h.icon, 20);
    $("#chName", el).textContent = h.name;
    $("#chMode", el).textContent = h.id === "tutor" ? T({ Socratic: "Socratic mode", "Hints first": "Hints-first mode", Direct: "Direct mode" }[p.teachMode] || "Socratic mode") : T("Online");
    $("#chCtxT", el).textContent = ctxLabel(this.th);
    $("#chIn", el).placeholder = T("Ask anything…");
    this.paintMsgs(el);
  },
  paintMsgs(el, animateLast) {
    const th = this.th, h = helperById(th.helper), box = $("#chMsgs", el);
    if (!th.msgs.length) {
      const extra = th.chapter ? [T("Explain {c} simply", { c: th.chapter }), T("Most important questions from {c}", { c: th.chapter })] : [];
      box.innerHTML = `<div class="starter"><span class="helper-av" style="background:${h.color}">${icon(h.icon, 30)}</span><h2>${h.name}</h2><p class="muted" style="max-width:330px">${h.desc}</p>
        <div class="suggest">${extra.concat(h.starters).slice(0, 4).map(s => `<button data-s="${esc(s)}">${icon("sparkles", 16)}<span class="grow">${esc(s)}</span>${icon("arrowup", 16)}</button>`).join("")}</div></div>`;
      $$("[data-s]", box).forEach(b => b.onclick = () => this.send(b.dataset.s));
      $("#chRefine", el).classList.add("hidden");
      return;
    }
    box.innerHTML = th.msgs.map((m, i) => m.role === "user"
      ? `<div class="msg user"><div class="bubble" data-notr>${m.img ? `<img class="attach" src="${m.img}" alt="Your photo">` : ""}${esc(m.text)}</div></div>`
      : `<div class="msg ai" data-i="${i}"><span class="mini-av" style="background:${h.color}">${icon(h.icon, 16)}</span><div class="bubble"><div class="ans" data-notr>${md(m.text)}</div>
          ${m.sources && m.sources.length ? `<div class="sources">${m.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${icon("link", 14)}<span class="ellipsis" data-notr>${esc(s.title)}</span></a>`).join("")}</div>` : ""}
          <div class="msg-actions"><button data-a="listen">${icon("volume", 15)}${T("Listen")}</button><button data-a="copy">${icon("copy", 15)}${T("Copy")}</button><button data-a="note">${icon("notes", 15)}${T("Save to notes")}</button><button data-a="cards">${icon("cards", 15)}${T("Flashcards")}</button><button data-a="up" aria-label="Helpful">${icon("thumbup", 15)}</button><button data-a="down" aria-label="Not helpful">${icon("thumbdown", 15)}</button></div>
          <p class="ai-note">${icon("sparkles", 12)}${T("AI answer. Check important facts with your textbook.")}</p></div></div>`).join("");
    const lastAI = [...th.msgs].reverse().find(m => m.role === "ai");
    if (lastAI && th.msgs[th.msgs.length - 1].role === "ai") {
      const ladder = h.id === "tutor" || h.id === "doubt" ? [T("Give me a hint"), T("Show the full solution")] : [];
      const f = document.createElement("div"); f.className = "follow";
      f.innerHTML = [T("Explain it simpler"), T("Give a real-life example")].concat(ladder).map(s => `<button data-f="${esc(s)}">${esc(s)}</button>`).join("");
      box.appendChild(f);
      $$("[data-f]", f).forEach(b => b.onclick = () => this.send(b.dataset.f, true));
    }
    // typewriter effect for the newest answer
    if (animateLast && getProfile().motion !== "reduced") {
      const last = box.querySelector(".msg.ai:last-of-type .ans");
      if (last) { const full = last.innerHTML; const txt = last.textContent; if (txt.length > 60) { let n = 0; last.textContent = ""; const step = Math.max(3, Math.round(txt.length / 70)); const t = setInterval(() => { n += step; last.textContent = txt.slice(0, n); if (n >= txt.length) { clearInterval(t); last.innerHTML = full; } }, 16); } }
    }
    $$(".msg.ai", box).forEach(m => {
      const msg = th.msgs[+m.dataset.i];
      $$("[data-a]", m).forEach(b => b.onclick = async () => {
        const a = b.dataset.a;
        if (a === "listen") speak(msg.text);
        if (a === "copy") { try { await navigator.clipboard.writeText(msg.text); toast(T("Copied"), "copy"); } catch (e) {} }
        if (a === "note") { saveNote({ title: th.title || h.name, text: msg.text, subject: th.subject, chapter: th.chapter }); toast(T("Saved to My notes"), "notes"); }
        if (a === "cards") { b.disabled = true; try { const d = await aiJSON('Make 6 flashcards from this explanation. Return JSON {"cards":[{"front":"...","back":"..."}]}:\n' + msg.text.slice(0, 3000), { memory: false }); const cards = (d.cards || []).filter(c => c.front && c.back); if (cards.length) { addDeck(th.chapter || th.title || "Chat", cards, th.subject); toast(T("{n} flashcards added", { n: cards.length }), "cards"); } } catch (e) { toast(e.message); } b.disabled = false; }
        if (a === "up" || a === "down") { b.classList.add("on"); const fb = Store.get("feedback", []); fb.push({ v: a, q: th.title, a: msg.text.slice(0, 200), d: dayKey() }); Store.set("feedback", fb.slice(-100)); toast(a === "up" ? T("Thanks for the feedback") : T("Thanks. Ask again and I'll try a different way."), a === "up" ? "thumbup" : "info"); }
      });
    });
    // one-tap refinements in the composer
    const rf = $("#chRefine", el);
    rf.innerHTML = [["Simpler", "smile"], ["Quiz me", "quiz"], ["Make notes", "notes"], ["Summarise", "list"], ["Translate", "languages"]].map(r => `<button data-r="${r[0]}">${icon(r[1], 14)}${T(r[0])}</button>`).join("");
    rf.classList.remove("hidden");
    $$("[data-r]", rf).forEach(b => b.onclick = () => {
      const r = b.dataset.r;
      if (r === "Quiz me") { go("quiz?subject=" + encodeURIComponent(th.subject || "") + "&chapter=" + encodeURIComponent(th.chapter || th.title || "")); return; }
      if (r === "Make notes") { const l = [...th.msgs].reverse().find(m => m.role === "ai"); if (l) { saveNote({ title: th.title, text: l.text, subject: th.subject, chapter: th.chapter }); toast(T("Saved to My notes"), "notes"); } return; }
      this.send({ Simpler: T("Explain that again more simply, like I'm 10."), Summarise: T("Summarise our chat in 5 short bullet points for revision."), Translate: T("Repeat your last answer in simple Hindi and then simple English.") }[r], true);
    });
    this.scrollEnd && this.scrollEnd();
  },
  menu(el) {
    const th = this.th, p = getProfile();
    openSheet(`<h3>${T("Chat options")}</h3><div class="list" style="margin-top:12px">
      ${th.helper === "tutor" ? `<div class="li"><div class="it">${icon("compass", 18)}</div><div class="t"><b>${T("Teaching mode")}</b></div></div><div style="padding:0 16px 14px"><div class="seg" id="mMode"><button data-v="Socratic">${T("Socratic")}</button><button data-v="Hints first">${T("Hints first")}</button><button data-v="Direct">${T("Direct")}</button></div></div>` : ""}
      <label class="li switch"><div class="it c-sky">${icon("globe", 18)}</div><div class="t"><b>${T("Search the web")}</b><span>${T("Adds sources (uses Google)")}</span></div><input type="checkbox" id="mWeb" ${th.web ? "checked" : ""}><span class="track"></span></label>
      <label class="li switch"><div class="it c-green">${icon("volume", 18)}</div><div class="t"><b>${T("Read answers aloud")}</b></div><input type="checkbox" id="mRead" ${th.read || p.autoRead ? "checked" : ""}><span class="track"></span></label>
      <button class="li" id="mHist"><div class="it c-violet">${icon("history", 18)}</div><div class="t"><b>${T("Chat history")}</b></div>${icon("chevR", 18, "chev")}</button>
      <button class="li" id="mDel"><div class="it c-red">${icon("trash", 18)}</div><div class="t"><b>${T("Delete this chat")}</b></div></button></div>`, s => {
      if ($("#mMode", s)) wireSeg($("#mMode", s), p.teachMode, v => { setPref("teachMode", v); this.paint(el); });
      $("#mWeb", s).onchange = e => { th.web = e.target.checked; };
      $("#mRead", s).onchange = e => { th.read = e.target.checked; };
      $("#mHist", s).onclick = () => threadsSheet();
      $("#mDel", s).onclick = async () => { closeSheet(); if (await askSheet(T("Delete this chat?"), T("This can't be undone."), T("Delete"), true)) { Store.set("threads", Store.get("threads", []).filter(t => t.id !== th.id)); this.th = this.newThread(th.helper, th); this.paint(el); } };
    });
  }
});

// ---------- Camera (in-app) with crop ----------
async function openCamera(done) {
  const wrap = document.createElement("div");
  wrap.className = "camera";
  wrap.innerHTML = `<video playsinline autoplay muted></video><div class="guide"></div><p class="hint">${T("Fit the question inside the box")}</p>
    <div class="cam-top"><button class="cam-btn" data-a="close" aria-label="Close">${icon("x", 24)}</button><button class="cam-btn" data-a="torch" aria-label="Flash">${icon("flash", 22)}</button></div>
    <div class="cam-bottom"><button class="cam-btn" data-a="gallery" aria-label="Gallery">${icon("image", 22)}</button><button class="shutter" data-a="shot" aria-label="Take photo"></button><button class="cam-btn" data-a="flip" aria-label="Switch camera">${icon("flip", 22)}</button></div>
    <input type="file" accept="image/*" class="hidden">`;
  document.body.appendChild(wrap);
  const video = $("video", wrap);
  let stream = null, facing = "environment", torch = false;
  const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  const close = () => { stop(); wrap.remove(); };
  const startCam = async () => {
    stop();
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); video.srcObject = stream; }
    catch (e) { toast(T("Camera not available. Choose a photo instead."), "camera"); $("input", wrap).click(); }
  };
  $("input", wrap).onchange = async e => { const f = e.target.files[0]; if (!f) return; close(); cropImage(URL.createObjectURL(f), done); };
  wrap.onclick = async e => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    const k = a.dataset.a;
    if (k === "close") close();
    if (k === "gallery") $("input", wrap).click();
    if (k === "flip") { facing = facing === "environment" ? "user" : "environment"; startCam(); }
    if (k === "torch") { try { torch = !torch; await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch }] }); a.style.background = torch ? "rgba(255,255,255,.5)" : ""; } catch (err) { toast(T("Flash isn't supported on this camera")); } }
    if (k === "shot") {
      if (!video.videoWidth) return;
      const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext("2d").drawImage(video, 0, 0); sfx("tap"); haptic(20);
      const url = c.toDataURL("image/jpeg", 0.92); close(); cropImage(url, done);
    }
  };
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) startCam(); else $("input", wrap).click();
}
function cropImage(src, done) {
  openSheet(`<h3>${T("Crop to the question")}</h3><p class="muted small" style="margin:4px 0 12px">${T("Drag the box, or the white dot to resize.")}</p>
    <div class="crop-wrap" id="cpW"><img src="${src}" alt="Photo to crop"><div class="crop-box" id="cpB" style="left:6%;top:10%;width:88%;height:80%"><span class="h"></span></div></div>
    <div class="grid2" style="margin-top:14px"><button class="btn ghost" id="cpFull">${T("Use whole photo")}</button><button class="btn" id="cpOk">${icon("crop", 18)}${T("Use this part")}</button></div>`, s => {
    const w = $("#cpW", s), b = $("#cpB", s);
    let mode = null, sx, sy, start;
    const pct = (v, t) => clamp(v / t * 100, 0, 100);
    b.addEventListener("pointerdown", e => { mode = e.target.classList.contains("h") ? "size" : "move"; sx = e.clientX; sy = e.clientY; start = { l: parseFloat(b.style.left), t: parseFloat(b.style.top), w: parseFloat(b.style.width), h: parseFloat(b.style.height) }; b.setPointerCapture(e.pointerId); });
    b.addEventListener("pointermove", e => {
      if (!mode) return; const r = w.getBoundingClientRect(); const dx = pct(e.clientX - sx, r.width) - 0, dy = pct(e.clientY - sy, r.height);
      const ddx = (e.clientX - sx) / r.width * 100, ddy = (e.clientY - sy) / r.height * 100;
      if (mode === "move") { b.style.left = clamp(start.l + ddx, 0, 100 - start.w) + "%"; b.style.top = clamp(start.t + ddy, 0, 100 - start.h) + "%"; }
      else { b.style.width = clamp(start.w + ddx, 12, 100 - start.l) + "%"; b.style.height = clamp(start.h + ddy, 10, 100 - start.t) + "%"; }
    });
    b.addEventListener("pointerup", () => mode = null);
    const finish = async (full) => {
      const img = $("img", w);
      const c = document.createElement("canvas");
      const box = full ? { l: 0, t: 0, w: 100, h: 100 } : { l: parseFloat(b.style.left), t: parseFloat(b.style.top), w: parseFloat(b.style.width), h: parseFloat(b.style.height) };
      const sxp = img.naturalWidth * box.l / 100, syp = img.naturalHeight * box.t / 100, sw = img.naturalWidth * box.w / 100, sh = img.naturalHeight * box.h / 100;
      c.width = sw; c.height = sh; c.getContext("2d").drawImage(img, sxp, syp, sw, sh, 0, 0, sw, sh);
      closeSheet(); done(await shrinkImage(c.toDataURL("image/jpeg", 0.92)));
    };
    $("#cpOk", s).onclick = () => finish(false);
    $("#cpFull", s).onclick = () => finish(true);
  });
}

// ---------- Snap & solve ----------
view("snap", {
  tab: "learn",
  html: () => `
    ${ph("Snap & solve", "Point, snap, understand")}
    <div class="card card-hero center" id="snHero" style="padding:26px 18px">
      <div style="position:relative;z-index:1" class="stack"><div style="margin:0 auto" class="it lg" >${icon("camera", 28)}</div>
      <h2>Take a photo of a question</h2><p class="muted">Homework, a textbook page, your notes or your own answer.</p>
      <div class="grid2" style="margin-top:6px"><button class="btn white" id="snCam">${icon("camera", 18)}Camera</button><button class="btn white" id="snGal" style="background:rgba(255,255,255,.18);color:#fff">${icon("image", 18)}Gallery</button></div></div>
    </div>
    <input type="file" id="snFile" accept="image/*" class="hidden">
    <div id="snWork" class="stack-lg hidden">
      <div class="card" style="padding:10px"><img id="snImg" alt="Your photo" style="width:100%;border-radius:14px;max-height:320px;object-fit:contain;background:var(--surface-2)"><div class="row" style="margin-top:8px"><button class="btn sm ghost" id="snRetake">${icon("refresh", 16)}Retake</button><span class="grow"></span><span class="label">Level</span><div class="seg" id="snLevel" style="width:200px"><button data-v="Easy">Easy</button><button data-v="Medium">Medium</button><button data-v="Advanced">Advanced</button></div></div></div>
      <div class="section-title"><h3>What do you need?</h3></div>
      <div class="grid2" id="snModes">
        ${[["hint", "puzzle", "", "Help me solve", "Hints first, so you learn"], ["explain", "lightbulb", "c-amber", "Explain it", "Step by step"], ["check", "checkc", "c-green", "Check my answer", "Marks + mistakes"], ["notes", "notes", "c-violet", "Make notes", "Short revision notes"], ["questions", "quiz", "c-sky", "Practice questions", "Similar questions"], ["translate", "languages", "c-teal", "Translate", "Into your language"]].map(m => `<button class="tile" data-m="${m[0]}"><span class="it ${m[2]}">${icon(m[1], 20)}</span><b>${m[3]}</b><span>${m[4]}</span></button>`).join("")}
      </div>
      <div id="snOut"></div>
    </div>`,
  init(el) {
    let photo = null;
    const getLevel = wireSeg($("#snLevel", el), "Medium");
    const use = img => { photo = img; $("#snImg", el).src = img.preview; $("#snWork", el).classList.remove("hidden"); $("#snHero", el).classList.add("hidden"); $("#snOut", el).innerHTML = ""; setTimeout(() => $("#snWork", el).scrollIntoView({ behavior: "smooth" }), 50); };
    $("#snCam", el).onclick = () => openCamera(use);
    $("#snGal", el).onclick = () => $("#snFile", el).click();
    $("#snFile", el).onchange = e => { const f = e.target.files[0]; if (f) cropImage(URL.createObjectURL(f), use); e.target.value = ""; };
    $("#snRetake", el).onclick = () => openCamera(use);
    const P = {
      hint: "This photo shows a question a student is stuck on. Do NOT give the final answer. Say in one line what it asks, then give the first helpful hint and one guiding question.",
      solve: "Show the full solution to the question in the photo, step by step, explaining why each step works, and give the final answer clearly.",
      explain: "Explain what this photo is about, step by step, with one real-life example.",
      check: "This is a student's own answer. Mark it fairly like a CBSE teacher: give marks out of 5, list what is correct, each mistake with the fix, and a model answer.",
      notes: "Turn this photo into short revision notes: headings, 5 to 8 bullet points, key terms in bold.",
      questions: "Write 5 practice questions similar to the ones in this photo (easy to hard), then the answers at the end.",
      translate: "Read all the text in this photo and translate it into " + getProfile().language + ", then explain it simply."
    };
    const LV = { Easy: " Explain at an EASY level with very simple words.", Medium: "", Advanced: " Explain at an ADVANCED level with correct technical terms." };
    const multi = " If the photo has several questions, label them Q1, Q2 and handle each one.";
    const run = async (mode, label) => {
      const out = $("#snOut", el);
      out.innerHTML = `<div class="card">${loadingHTML()}</div>`; out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      try {
        const reply = await aiText(P[mode] + multi + LV[getLevel()], { image: { mimeType: photo.mimeType, data: photo.data } });
        addXP(10, "snaps");
        logRecord({ type: "snap", title: label, detail: reply.slice(0, 140) });
        setLast("snap", T("Snap & solve"), "camera");
        out.innerHTML = `<div class="card"><div class="row between" style="margin-bottom:8px"><span class="tag indigo">${icon("sparkles", 13)} ${esc(T(label))}</span><button class="icon-btn plain" id="snSpk" aria-label="Listen">${icon("volume", 18)}</button></div><div data-notr>${md(reply)}</div>
          ${mode === "hint" ? `<div class="feedback good" style="background:var(--primary-soft);color:var(--primary)">${T("Try the next step yourself first. Still stuck?")}<button class="btn sm block" id="snSolve" style="margin-top:10px">${T("Show the full solution")}</button></div>` : ""}
          <div class="grid2" style="margin-top:14px"><button class="btn ghost sm" id="snChat">${icon("messages", 16)}${T("Ask a follow-up")}</button><button class="btn ghost sm" id="snSave">${icon("notes", 16)}${T("Save to notes")}</button></div></div>`;
        $("#snSpk", out).onclick = () => speak(reply);
        $("#snSave", out).onclick = () => { saveNote({ title: T("Snap: ") + T(label), text: reply }); toast(T("Saved to My notes"), "notes"); };
        $("#snChat", out).onclick = () => {
          const th = { id: uid(), helper: mode === "check" ? "exam" : "tutor", subject: "", chapter: "", title: T(label), web: false, msgs: [{ role: "user", text: T(label), img: photo.preview, t: Date.now() }, { role: "ai", text: reply, t: Date.now() }] };
          saveThread(th); go("chat?thread=" + th.id);
        };
        if (mode === "hint") $("#snSolve", out).onclick = () => run("solve", "Full solution");
      } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
    $$("[data-m]", el).forEach(b => b.onclick = () => run(b.dataset.m, $("b", b).textContent));
  }
});

// ---------- Video lessons (YouTube) ----------
function ytId(url) { const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null); }
view("video", {
  tab: "learn",
  html: () => `
    ${ph("Video lessons", "Watch, pause, ask. Learn from any YouTube lesson.")}
    <div class="card stack">
      <div class="input-icon">${icon("search", 18)}<input type="search" id="vdQ" placeholder="Search a topic, or paste a YouTube link"></div>
      <div class="chips scroll" id="vdSug"></div>
    </div>
    <div id="vdResults"></div>
    <div id="vdPlayer" class="stack-lg hidden">
      <div class="yt"><div id="vdFrame"></div></div>
      <h3 id="vdTitle" data-notr></h3>
      <div class="card stack">
        <span class="label">Ask a doubt about this moment</span>
        <div class="row"><input type="text" id="vdAsk" placeholder="What does this step mean?"><button class="btn" id="vdAskB" aria-label="Ask">${icon("send", 18)}</button></div>
        <p class="tiny muted" id="vdTime"></p>
      </div>
      <div class="grid2">
        ${[["summary", "list", "", "Summary"], ["notes", "notes", "c-amber", "Make notes"], ["quiz", "quiz", "c-green", "Quiz me"], ["moments", "clock", "c-sky", "Key moments"]].map(t => `<button class="tile" data-t="${t[0]}" style="min-height:90px"><span class="it ${t[2]}">${icon(t[1], 20)}</span><b>${t[3]}</b></button>`).join("")}
      </div>
      <div id="vdOut"></div>
    </div>
    <div class="section-title" id="vdHistT"><h3>Recently watched</h3></div><div id="vdHist"></div>`,
  init(el) {
    const self = this;
    const q = $("#vdQ", el);
    q.addEventListener("keydown", e => { if (e.key === "Enter") self.search(el, q.value.trim()); });
    $("#vdAskB", el).onclick = () => self.tool(el, "ask");
    $("#vdAsk", el).addEventListener("keydown", e => { if (e.key === "Enter") self.tool(el, "ask"); });
    $$("[data-t]", el).forEach(b => b.onclick = () => self.tool(el, b.dataset.t));
    setInterval(() => { if (self.player && self.player.getCurrentTime && el.classList.contains("active")) $("#vdTime", el).textContent = T("Paused at {t}", { t: self.stamp() }); }, 1000);
  },
  show(el) {
    const p = getProfile(), sub = p.subjects[0];
    const sug = [p.grade + " " + sub + " NCERT", ...p.subjects.slice(0, 3).map(s => p.grade + " " + s + " explained")];
    $("#vdSug", el).innerHTML = sug.map(s => `<button class="chip soft" data-s="${esc(s)}">${icon("search", 14)}<span data-notr>${esc(s)}</span></button>`).join("");
    $$("[data-s]", el).forEach(b => b.onclick = () => { $("#vdQ", el).value = b.dataset.s; this.search(el, b.dataset.s); });
    const hist = Store.get("videos", []);
    $("#vdHistT", el).classList.toggle("hidden", !hist.length);
    $("#vdHist", el).innerHTML = hist.length ? `<div class="list">${hist.slice(0, 6).map(v => `<button class="li" data-v="${v.id}"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" style="width:86px;border-radius:9px;aspect-ratio:16/9;object-fit:cover"><div class="t"><b data-notr>${esc(v.title)}</b><span data-notr>${timeAgo(v.t)}</span></div></button>`).join("")}</div>` : "";
    $$("[data-v]", el).forEach(b => b.onclick = () => this.load(el, b.dataset.v, (hist.find(v => v.id === b.dataset.v) || {}).title));
  },
  async search(el, text) {
    if (!text) return;
    const id = ytId(text);
    if (id) return this.load(el, id);
    const out = $("#vdResults", el);
    await loadConfig();
    if (!CONFIG.youtube) {
      out.innerHTML = `<div class="card stack"><p class="small">${T("Search inside Wayfinder needs a free YouTube key (see the setup guide). For now: open YouTube, copy the video link, and paste it above.")}</p><a class="btn ghost" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(text)}">${icon("video", 18)}${T("Search on YouTube")}</a></div>`;
      return;
    }
    out.innerHTML = `<div class="card">${loadingHTML(T("Searching YouTube…"))}</div>`;
    try {
      const r = await (await fetch("/api/youtube?q=" + encodeURIComponent(text))).json();
      out.innerHTML = r.items && r.items.length ? `<div class="list">${r.items.map(v => `<button class="li" data-id="${v.id}" data-title="${esc(v.title)}"><img src="${esc(v.thumb)}" alt="" style="width:110px;border-radius:10px;aspect-ratio:16/9;object-fit:cover"><div class="t"><b data-notr>${v.title}</b><span data-notr>${esc(v.channel)}</span></div></button>`).join("")}</div>` : `<div class="card"><p class="muted">${T("No videos found.")}</p></div>`;
      $$("[data-id]", out).forEach(b => b.onclick = () => this.load(el, b.dataset.id, b.dataset.title));
    } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
  },
  async load(el, id, title) {
    this.vid = id; this.title = title || "YouTube lesson";
    $("#vdResults", el).innerHTML = "";
    $("#vdPlayer", el).classList.remove("hidden");
    $("#vdTitle", el).textContent = this.title;
    $("#vdOut", el).innerHTML = "";
    const hist = Store.get("videos", []).filter(v => v.id !== id); hist.unshift({ id, title: this.title, t: Date.now() }); Store.set("videos", hist.slice(0, 30));
    bump("videos"); logRecord({ type: "video", title: this.title, detail: "https://youtu.be/" + id });
    setLast("video", T("Video: ") + this.title, "video");
    try {
      if (!window.YT || !YT.Player) { await loadScript("https://www.youtube.com/iframe_api"); await new Promise(r => { const t = setInterval(() => { if (window.YT && YT.Player) { clearInterval(t); r(); } }, 100); setTimeout(r, 6000); }); }
      if (this.player && this.player.loadVideoById) this.player.loadVideoById(id);
      else this.player = new YT.Player("vdFrame", { videoId: id, host: "https://www.youtube-nocookie.com", playerVars: { rel: 0, modestbranding: 1, playsinline: 1 }, events: { onReady: e => { if (!title && e.target.getVideoData) { this.title = e.target.getVideoData().title || this.title; $("#vdTitle", el).textContent = this.title; } } } });
    } catch (e) { $("#vdFrame", el).outerHTML = `<iframe id="vdFrame" src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" allowfullscreen title="YouTube video"></iframe>`; }
    $("#vdPlayer", el).scrollIntoView({ behavior: "smooth" });
  },
  stamp() { try { const s = Math.floor(this.player.getCurrentTime()); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); } catch (e) { return "0:00"; } },
  async tool(el, t) {
    if (!this.vid) return;
    const out = $("#vdOut", el), url = "https://www.youtube.com/watch?v=" + this.vid;
    const q = $("#vdAsk", el).value.trim();
    if (t === "ask" && !q) { toast(T("Type your doubt first")); return; }
    try { if (t === "ask" && this.player && this.player.pauseVideo) this.player.pauseVideo(); } catch (e) {}
    out.innerHTML = `<div class="card">${loadingHTML(T("Watching the video…"))}</div>`;
    const prompts = {
      summary: "Summarise this video lesson for a student: the main idea in 2 lines, then 6 key points.",
      notes: "Make clean revision notes from this video: headings, bullet points, key terms in bold, formulas if any.",
      moments: "List the key moments of this video with timestamps (mm:ss) and one line each, so a student can jump to them.",
      ask: "The student paused this video at " + this.stamp() + " and asks: " + q + ". Answer clearly using what the video says around that time, in simple steps.",
      quiz: 'Make a 5-question multiple choice quiz from this video. Return JSON {"subject":"Other","questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"level":"medium","explanation":"..."}]}'
    };
    try {
      if (t === "quiz") {
        const data = await aiJSON(prompts.quiz, { video: url, memory: false });
        out.innerHTML = `<div id="vdQuiz"></div>`;
        runQuiz($("#vdQuiz", out), data, { subject: "Other", chapter: this.title, again: () => this.tool(el, "quiz") });
        return;
      }
      const reply = await aiText(prompts[t], { video: url });
      if (t === "ask") { $("#vdAsk", el).value = ""; addXP(5, "questions"); logRecord({ type: "chat", title: q, detail: "Video: " + this.title }); }
      out.innerHTML = `<div class="card"><div data-notr>${md(reply)}</div><div class="row" style="margin-top:12px"><button class="btn sm ghost" id="vdSave">${icon("notes", 16)}${T("Save to notes")}</button><button class="btn sm ghost" id="vdSpk">${icon("volume", 16)}${T("Listen")}</button></div></div>`;
      $("#vdSave", out).onclick = () => { saveNote({ title: this.title, text: reply + "\n\nVideo: https://youtu.be/" + this.vid }); toast(T("Saved to My notes"), "notes"); };
      $("#vdSpk", out).onclick = () => speak(reply);
    } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p><p class="tiny muted" style="margin-top:6px">${T("Only public YouTube videos work.")}</p></div>`; }
  }
});

// ---------- Notes ----------
const NOTE_COLORS = ["#4F46E5", "#FF7A59", "#22C55E", "#F59E0B", "#0EA5E9", "#E11D48", "#7C3AED"];
function getNotes() { return Store.get("notes", []); }
function saveNote(n) {
  const notes = getNotes();
  const note = Object.assign({ id: uid(), title: "Untitled", text: "", subject: "", chapter: "", color: NOTE_COLORS[0], pinned: false, created: Date.now() }, n, { updated: Date.now() });
  const i = notes.findIndex(x => x.id === note.id);
  if (i >= 0) notes[i] = note; else { notes.unshift(note); bump("notes"); logRecord({ type: "note", subject: note.subject, chapter: note.chapter, title: note.title }); }
  Store.set("notes", notes); return note;
}
view("notes", {
  tab: "learn",
  html: () => `
    ${ph("My notes", "Your notebook, organised by subject", { right: `<button class="btn sm" id="ntNew">${icon("plus", 16)}New</button>` })}
    <div class="input-icon">${icon("search", 18)}<input type="search" id="ntQ" placeholder="Search notes"></div>
    <div class="chips scroll" id="ntF"></div>
    <div id="ntList" class="stack"></div>`,
  init(el) {
    this.filter = "All";
    $("#ntNew", el).onclick = () => go("note?id=new");
    $("#ntQ", el).oninput = () => this.paint(el);
  },
  show(el) { this.paint(el); },
  paint(el) {
    const notes = getNotes();
    const subs = ["All", "Pinned"].concat([...new Set(notes.map(n => n.subject).filter(Boolean))]);
    $("#ntF", el).innerHTML = subs.map(s => `<button class="chip ${s === this.filter ? "on" : ""}" data-f="${esc(s)}">${s === "Pinned" ? icon("pin", 14) : ""}${esc(s)}</button>`).join("");
    $$("[data-f]", el).forEach(b => b.onclick = () => { this.filter = b.dataset.f; this.paint(el); });
    const q = $("#ntQ", el).value.toLowerCase();
    const list = notes.filter(n => (this.filter === "All" || (this.filter === "Pinned" ? n.pinned : n.subject === this.filter)) && (!q || (n.title + " " + n.text + " " + n.chapter).toLowerCase().includes(q)))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
    $("#ntList", el).innerHTML = list.length ? list.map(n => `<a class="card tap note-card" href="#note?id=${n.id}" style="border-left-color:${n.color};display:block;color:inherit">
        <div class="row between"><b class="bold ellipsis" data-notr>${esc(n.title)}</b>${n.pinned ? icon("pin", 15) : ""}</div>
        <p class="tiny muted" style="margin:2px 0 6px">${n.subject ? `<span data-notr>${esc(n.subject)}${n.chapter ? " · " + esc(n.chapter) : ""}</span> · ` : ""}<span data-notr>${timeAgo(n.updated)}</span></p>
        <p class="small" data-notr style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.text.replace(/[#*>`-]/g, "").slice(0, 200))}</p></a>`).join("")
      : `<div class="card flat empty"><div class="it c-amber">${icon("notes", 28)}</div><b class="bold">${T("No notes yet")}</b><p>${T("Write notes, paste class notes, or save answers from the AI. Then organise, summarise or turn them into flashcards.")}</p><button class="btn" onclick="go('note?id=new')">${icon("plus", 18)}${T("Write a note")}</button></div>`;
  }
});
view("note", {
  tab: "learn",
  html: () => `
    <div class="ph"><button class="back-btn" onclick="goBack()" aria-label="Back">${icon("back", 20)}</button><div class="titles"><span class="tiny muted" id="neSaved">Saved</span></div>
      <button class="icon-btn plain" id="nePin" aria-label="Pin">${icon("pin", 20)}</button><button class="icon-btn plain" id="neShare" aria-label="Share">${icon("share", 20)}</button><button class="icon-btn plain" id="neDel" aria-label="Delete">${icon("trash", 20)}</button></div>
    <input type="text" id="neTitle" placeholder="Title" data-notr style="font-family:var(--font-head);font-size:1.35rem;font-weight:800;border:none;background:transparent;padding:4px 2px;box-shadow:none">
    <div class="row wrap"><button class="ctx-chip" id="neCtx">${icon("book", 14)}<span data-notr id="neCtxT"></span></button><div class="row" id="neColors" style="gap:6px"></div></div>
    <div class="note-toolbar"><button data-md="**" aria-label="Bold"><b>B</b></button><button data-md="## " aria-label="Heading">H</button><button data-md="- " aria-label="Bullet">${icon("list", 16)}</button><button data-md="1. " aria-label="Numbered">1.</button><button data-md="[ ] " aria-label="Checkbox">${icon("checkc", 16)}</button><button id="neMic" aria-label="Dictate">${icon("mic", 16)}</button><span class="grow"></span><button id="nePrev">${icon("eye", 16)}${T("Preview")}</button></div>
    <textarea id="neText" placeholder="Start typing, or paste your class notes…" data-notr style="min-height:300px"></textarea>
    <div id="nePv" class="card hidden" data-notr></div>
    <div class="section-title"><h3>AI tools</h3></div>
    <div class="chips" id="neAI">${[["organise", "wand", "Organise"], ["summary", "list", "Summarise"], ["formulas", "sigma", "Formulas"], ["simple", "smile", "Explain simply"], ["grammar", "pen", "Fix grammar"], ["cards", "cards", "Flashcards"], ["quiz", "quiz", "Quiz me"], ["translate", "languages", "Translate"]].map(a => `<button class="chip soft" data-ai="${a[0]}">${icon(a[1], 15)}${a[2]}</button>`).join("")}</div>
    <div id="neOut"></div>`,
  init(el) {
    const self = this;
    const save = () => { if (!self.note) return; const tt = $("#neTitle", el).value.trim(), tx = $("#neText", el).value; if (!tt && !tx.trim() && !getNotes().some(n => n.id === self.note.id)) return; self.note.title = tt || T("Untitled"); self.note.text = tx; self.note = saveNote(self.note); $("#neSaved", el).textContent = T("Saved"); };
    let t;
    const later = () => { $("#neSaved", el).textContent = T("Saving…"); clearTimeout(t); t = setTimeout(save, 600); };
    $("#neTitle", el).oninput = later; $("#neText", el).oninput = later;
    $("#neColors", el).innerHTML = NOTE_COLORS.map(c => `<button class="color-dot" data-c="${c}" style="background:${c};width:24px;height:24px" aria-label="Colour"></button>`).join("");
    $$("[data-c]", el).forEach(b => b.onclick = () => { self.note.color = b.dataset.c; save(); self.paintColors(el); });
    $$("[data-md]", el).forEach(b => b.onclick = () => {
      const ta = $("#neText", el), s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, m = b.dataset.md;
      if (m === "**") ta.value = v.slice(0, s) + "**" + (v.slice(s, e) || T("bold")) + "**" + v.slice(e);
      else { const ls = v.lastIndexOf("\n", s - 1) + 1; ta.value = v.slice(0, ls) + m + v.slice(ls); }
      ta.focus(); later();
    });
    $("#neMic", el).onclick = () => { const b = $("#neMic", el); b.style.background = "var(--primary-soft)"; listen(txt => { const ta = $("#neText", el); ta.value += (ta.value ? " " : "") + txt; later(); }, () => b.style.background = ""); };
    $("#nePrev", el).onclick = () => { const pv = $("#nePv", el), ta = $("#neText", el), on = pv.classList.contains("hidden"); pv.innerHTML = md(ta.value.replace(/\[ \]/g, "☐").replace(/\[x\]/gi, "☑")); pv.classList.toggle("hidden", !on); ta.classList.toggle("hidden", on); };
    $("#nePin", el).onclick = () => { self.note.pinned = !self.note.pinned; save(); $("#nePin", el).style.color = self.note.pinned ? "var(--primary)" : ""; toast(self.note.pinned ? T("Pinned") : T("Unpinned"), "pin"); };
    $("#neShare", el).onclick = async () => { save(); const txt = self.note.title + "\n\n" + self.note.text; if (navigator.share) try { await navigator.share({ title: self.note.title, text: txt }); } catch (e) {} else { await navigator.clipboard.writeText(txt); toast(T("Copied")); } };
    $("#neDel", el).onclick = async () => { if (await askSheet(T("Delete this note?"), T("This can't be undone."), T("Delete"), true)) { Store.set("notes", getNotes().filter(n => n.id !== self.note.id)); self.note = null; goBack(); } };
    $("#neCtx", el).onclick = () => pickContext(self.note, c => { self.note.subject = c.subject; self.note.chapter = c.chapter; save(); $("#neCtxT", el).textContent = ctxLabel(self.note); });
    $$("[data-ai]", el).forEach(b => b.onclick = () => self.aiTool(el, b.dataset.ai, save));
  },
  show(el, params) {
    const id = params.get("id");
    this.note = id === "new" ? null : getNotes().find(n => n.id === id);
    if (!this.note) { this.note = { id: uid(), title: T("Untitled"), text: "", subject: params.get("subject") || "", chapter: params.get("chapter") || "", color: NOTE_COLORS[0], pinned: false, created: Date.now() }; history.replaceState(null, "", "#note?id=" + this.note.id); }
    $("#neTitle", el).value = this.note.title === T("Untitled") ? "" : this.note.title;
    $("#neText", el).value = this.note.text;
    $("#neCtxT", el).textContent = ctxLabel(this.note);
    $("#nePin", el).style.color = this.note.pinned ? "var(--primary)" : "";
    $("#neOut", el).innerHTML = ""; $("#nePv", el).classList.add("hidden"); $("#neText", el).classList.remove("hidden");
    this.paintColors(el);
    if (!this.note.text) setTimeout(() => $("#neTitle", el).focus(), 100);
  },
  paintColors(el) { $$("[data-c]", el).forEach(b => b.classList.toggle("on", b.dataset.c === this.note.color)); },
  async aiTool(el, a, save) {
    save();
    const text = this.note.text.trim(), out = $("#neOut", el);
    if (text.length < 15) { toast(T("Write a bit more first")); return; }
    if (a === "quiz") { go("quiz?subject=" + encodeURIComponent(this.note.subject || "") + "&chapter=" + encodeURIComponent(this.note.chapter || this.note.title) + "&note=" + this.note.id); return; }
    out.innerHTML = `<div class="card">${loadingHTML()}</div>`;
    try {
      if (a === "cards") {
        const d = await aiJSON('Make 10 flashcards from these notes. Return JSON {"cards":[{"front":"short question","back":"short answer"}]}. Notes:\n' + text.slice(0, 6000), { memory: false });
        const cards = (d.cards || []).filter(c => c.front && c.back);
        addDeck(this.note.title, cards, this.note.subject);
        out.innerHTML = `<div class="card row"><div class="it c-violet">${icon("cards", 20)}</div><div class="grow"><b class="bold">${T("{n} flashcards made", { n: cards.length })}</b></div><a class="btn sm" href="#cards">${T("Practise")}</a></div>`;
        return;
      }
      const P = { organise: "Reorganise these notes into clean revision notes: short headings, bullet points, key terms in bold, fix spelling. Keep every fact, add nothing new.", summary: "Summarise these notes in 5 short bullet points.", formulas: "List every formula, definition and must-remember fact from these notes as a cheat sheet.", simple: "Explain these notes in very simple words with one everyday example.", grammar: "Fix the grammar and spelling of these notes. Keep the meaning and structure. Return only the corrected notes.", translate: "Translate these notes into " + getProfile().language + "." };
      const reply = await aiText(P[a] + "\n\nNotes:\n" + text.slice(0, 7000), { memory: false });
      const replace = a === "organise" || a === "grammar";
      out.innerHTML = `<div class="card"><div data-notr>${md(reply)}</div><div class="row wrap" style="margin-top:12px">${replace ? `<button class="btn sm" id="neRep">${icon("check", 16)}${T("Replace my note")}</button>` : ""}<button class="btn sm ghost" id="neAdd">${icon("plus", 16)}${T("Add to note")}</button><button class="btn sm ghost" id="neX">${T("Dismiss")}</button></div></div>`;
      if (replace) $("#neRep", out).onclick = () => { $("#neText", el).value = reply; save(); out.innerHTML = ""; toast(T("Note updated"), "check"); };
      $("#neAdd", out).onclick = () => { $("#neText", el).value += "\n\n" + reply; save(); out.innerHTML = ""; toast(T("Added"), "check"); };
      $("#neX", out).onclick = () => out.innerHTML = "";
    } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
  }
});

// ---------- Ask my PDF ----------
view("pdf", {
  tab: "learn",
  html: () => `
    ${ph("Ask my PDF", "Upload a chapter or worksheet (up to 3 MB)")}
    <label class="card tap row" for="pdFile" style="gap:14px"><div class="it c-sky lg">${icon("upload", 24)}</div><div class="grow"><b class="bold" id="pdName">Choose a PDF</b><p class="small muted">It stays private to this question</p></div></label>
    <input type="file" id="pdFile" accept="application/pdf" class="hidden">
    <div class="chips">${["Summarise in 8 points", "Key definitions and formulas", "5 likely exam questions with answers", "Explain the hardest part simply"].map(s => `<button class="chip soft" data-p="${s}">${s}</button>`).join("")}</div>
    <div class="row"><input type="text" id="pdQ" placeholder="Ask anything about the PDF"><button class="btn" id="pdAsk" aria-label="Ask">${icon("send", 18)}</button></div>
    <div id="pdOut"></div>`,
  init(el) {
    let file = null;
    const out = $("#pdOut", el);
    $("#pdFile", el).onchange = async e => { const f = e.target.files[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) { file = null; toast(T("That PDF is bigger than 3 MB. Try one chapter.")); return; } file = await fileToBase64(f); $("#pdName", el).textContent = f.name; };
    const ask = async q => {
      if (!file) { toast(T("Choose a PDF first"), "file"); return; }
      if (!q) return;
      out.innerHTML = `<div class="card">${loadingHTML(T("Reading your PDF…"))}</div>`;
      try { const r = await aiText("Answer using only this PDF. If it isn't in the PDF, say so. Question: " + q, { file }); out.innerHTML = `<div class="card"><div data-notr>${md(r)}</div><button class="btn sm ghost" id="pdSave" style="margin-top:12px">${icon("notes", 16)}${T("Save to notes")}</button></div>`; $("#pdSave", out).onclick = () => { saveNote({ title: "PDF: " + q, text: r }); toast(T("Saved to My notes"), "notes"); }; addXP(10, "pdfs"); }
      catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
    $("#pdAsk", el).onclick = () => ask($("#pdQ", el).value.trim());
    $("#pdQ", el).onkeydown = e => { if (e.key === "Enter") ask($("#pdQ", el).value.trim()); };
    $$("[data-p]", el).forEach(b => b.onclick = () => ask(b.dataset.p));
  }
});

// ---------- Mind map ----------
view("mindmap", {
  tab: "learn",
  html: () => `${ph("Mind map", "See how a topic fits together")}
    <button class="ctx-chip" id="mmCtx" style="align-self:flex-start">${icon("book", 14)}<span data-notr id="mmCtxT"></span>${icon("chevD", 14)}</button>
    <div class="row"><input type="text" id="mmT" placeholder="Topic, e.g. Photosynthesis"><button class="btn" id="mmGo">${T("Make")}</button></div><div id="mmOut"></div>`,
  init(el) {
    this.ctx = {};
    $("#mmCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#mmCtxT", el).textContent = ctxLabel(c); if (c.chapter) $("#mmT", el).value = c.chapter; });
    const make = async () => {
      const t = $("#mmT", el).value.trim(); if (!t) { toast(T("Type a topic first")); return; }
      const out = $("#mmOut", el); out.innerHTML = `<div class="card">${loadingHTML()}</div>`;
      try {
        const d = await aiJSON('Make a mind map on "' + t + '". Return JSON {"title":"...","branches":[{"name":"...","points":["...","..."]}]} with 4 to 6 branches and 2 to 4 short points each.', { memory: false });
        const colors = ["", "c-coral", "c-green", "c-amber", "c-sky", "c-violet"];
        out.innerHTML = `<div class="card card-hero center"><h2 data-notr style="position:relative;z-index:1">${esc(d.title || t)}</h2></div><div class="stack" style="margin-top:12px">${(d.branches || []).map((b, i) => `<div class="card" style="border-left:4px solid var(--primary)"><div class="row"><span class="it sm ${colors[i % 6]}">${i + 1}</span><b class="bold" data-notr>${esc(b.name)}</b></div><ul class="small" style="margin:10px 0 0;padding-left:20px" data-notr>${(b.points || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div><button class="btn ghost block" id="mmSave" style="margin-top:12px">${icon("notes", 18)}${T("Save to notes")}</button>`;
        $("#mmSave", out).onclick = () => { saveNote({ title: T("Mind map: ") + t, subject: this.ctx.subject, chapter: this.ctx.chapter, text: (d.branches || []).map(b => "## " + b.name + "\n" + (b.points || []).map(x => "- " + x).join("\n")).join("\n\n") }); toast(T("Saved to My notes"), "notes"); };
        addXP(10, "maps");
      } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
    $("#mmGo", el).onclick = make; $("#mmT", el).onkeydown = e => { if (e.key === "Enter") make(); };
  },
  show(el) { $("#mmCtxT", el).textContent = ctxLabel(this.ctx); }
});

// ---------- Key points sheet ----------
view("keypoints", {
  tab: "learn",
  html: () => `${ph("Key points sheet", "A one-page revision sheet for any chapter")}
    <button class="card tap row" id="kpCtx" style="gap:12px;text-align:left"><div class="it c-green">${icon("book", 20)}</div><div class="grow"><span class="tiny muted">Chapter</span><br><b class="bold" id="kpCtxT" data-notr></b></div>${icon("chevR", 18)}</button>
    <button class="btn block lg" id="kpGo">${icon("sparkles", 18)}Make my sheet</button><div id="kpOut"></div>`,
  init(el) {
    this.ctx = {};
    $("#kpCtx", el).onclick = () => pickContext(this.ctx, c => { this.ctx = c; $("#kpCtxT", el).textContent = ctxLabel(c); });
    $("#kpGo", el).onclick = async () => {
      if (!this.ctx.chapter) { $("#kpCtx", el).click(); return; }
      const out = $("#kpOut", el); out.innerHTML = `<div class="card">${loadingHTML()}</div>`;
      try {
        const r = await aiText("Make a one-page revision sheet for " + this.ctx.subject + ", NCERT chapter: " + this.ctx.chapter + ". Include: key definitions, formulas (if any), important facts, a small table if useful, and 3 common exam mistakes.");
        out.innerHTML = `<div class="card"><div data-notr>${md(r)}</div><div class="row" style="margin-top:12px"><button class="btn sm ghost" id="kpSave">${icon("notes", 16)}${T("Save to notes")}</button><button class="btn sm ghost" id="kpSpk">${icon("volume", 16)}${T("Listen")}</button></div></div>`;
        $("#kpSave", out).onclick = () => { saveNote({ title: T("Key points: ") + this.ctx.chapter, text: r, subject: this.ctx.subject, chapter: this.ctx.chapter }); toast(T("Saved to My notes"), "notes"); };
        $("#kpSpk", out).onclick = () => speak(r);
        addXP(10, "sheets");
        logRecord({ type: "sheet", subject: this.ctx.subject, chapter: this.ctx.chapter, title: T("Key points sheet") });
      } catch (e) { out.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; }
    };
  },
  show(el) { $("#kpCtxT", el).textContent = ctxLabel(this.ctx); }
});

// ---------- Listen mode ----------
view("listen", {
  tab: "learn",
  html: () => `${ph("Listen mode", "Hear your notes like a podcast")}
    <div class="field"><label for="lsPick">Pick a note</label><select id="lsPick" data-notr></select></div>
    <textarea id="lsText" placeholder="…or paste anything here" data-notr></textarea>
    <div class="range-row"><span class="label">Speed</span><input type="range" id="lsRate" min="0.6" max="1.6" step="0.1"><span class="v" id="lsRateV"></span></div>
    <div class="grid3"><button class="btn" id="lsPlay">${icon("play", 18)}Play</button><button class="btn ghost" id="lsPause">${icon("pause", 18)}Pause</button><button class="btn ghost" id="lsStop">${icon("stop", 18)}Stop</button></div>
    <p class="tiny muted center" id="lsVoice"></p>`,
  init(el) {
    const r = $("#lsRate", el);
    r.value = getProfile().voiceRate; rangeFill(r); $("#lsRateV", el).textContent = r.value + "×";
    r.oninput = () => { $("#lsRateV", el).textContent = r.value + "×"; };
    r.onchange = () => setPref("voiceRate", parseFloat(r.value));
    $("#lsPlay", el).onclick = () => { if (speechSynthesis.paused) return speechSynthesis.resume(); const t = $("#lsText", el).value.trim(); if (!t) return toast(T("Pick or paste something first")); speak(t); };
    $("#lsPause", el).onclick = () => speechSynthesis.pause();
    $("#lsStop", el).onclick = () => stopSpeak();
  },
  show(el) {
    const notes = getNotes();
    $("#lsPick", el).innerHTML = `<option value="">${T("Choose…")}</option>` + notes.map(n => `<option value="${n.id}">${esc(n.title)}</option>`).join("");
    $("#lsPick", el).onchange = e => { const n = notes.find(x => x.id === e.target.value); if (n) $("#lsText", el).value = n.text; };
    const v = bestVoice(); $("#lsVoice", el).textContent = v ? T("Voice: {v}. Change it in Settings > Voice.", { v: v.name }) : "";
  }
});
