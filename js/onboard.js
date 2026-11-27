// ================= First-time setup: intro slides + profile =================
function startOnboarding() {
  const box = $("#onboard");
  box.classList.remove("hidden");
  document.body.classList.add("no-nav");
  const p = getProfile();

  box.innerHTML = `
  <div class="app col" style="gap:18px; padding-top:40px">
    <div id="slides" class="glass card" style="padding:28px 20px">
      <div class="slide on">
        <img src="icons/logo.png" alt="Wayfinder logo" class="ob-logo">
        <h1>Meet Wayfinder</h1>
        <p class="muted">Your AI guide for every subject. It doesn't just give answers: it asks, hints and guides you until you truly understand.</p>
      </div>
      <div class="slide">
        <div style="font-size:64px">📸</div>
        <h1>Snap. Practise. Remember.</h1>
        <p class="muted">Photo of your notes? It explains them. Quizzes, flashcards, mock exams and viva practice, all made by AI.</p>
      </div>
      <div class="slide">
        <div style="font-size:64px">📊</div>
        <h1>Always know your next step</h1>
        <p class="muted">It learns from every mistake, finds your weak topics, plans your day and keeps you motivated. Let's find your way!</p>
      </div>
      <div class="dots" style="margin-top:18px"><i class="on"></i><i></i><i></i></div>
    </div>
    <button class="btn full" id="obNext">Next</button>

    <form id="obForm" class="col hidden" style="gap:14px">
      <div class="glass card col">
        <h2>Let's set you up</h2>
        <div class="field"><label for="obName">Your name</label><input type="text" id="obName" maxlength="30" placeholder="Your name"></div>
        <p id="obErr" class="small hidden" style="color:var(--bad)">Please type your name first.</p>
        <div class="grid2">
          <div class="field"><label for="obBoard">Board</label>
            <select id="obBoard">${["CBSE", "ICSE", "State Board", "IB", "Other"].map(x => `<option>${x}</option>`).join("")}</select></div>
          <div class="field"><label for="obGrade">Class</label>
            <select id="obGrade">${["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12","College"].map(x => `<option>${x}</option>`).join("")}</select></div>
        </div>
      </div>
      <div class="glass card col">
        <span class="label">Your subjects</span>
        <div class="pills" id="obSubjects">${pillsHTML(["Maths","Science","English","Social Science","Hindi","Computers","Physics","Chemistry","Biology"])}</div>
      </div>
      <div class="glass card col">
        <span class="label">Choose your AI expert</span>
        <div class="pills" id="obExpert">${pillsHTML(["All-rounder tutor","Maths expert","Science expert","English coach","Social science expert","Coding mentor","Exam coach"])}</div>
        <span class="label">Its personality</span>
        <div class="pills" id="obPersona">${pillsHTML(["Friendly buddy","Calm teacher","Funny and fun","Strict coach"])}</div>
        <span class="label">Language</span>
        <div class="pills" id="obLang">${pillsHTML(["English","Hinglish","Hindi","Tamil","Kannada","Telugu","Malayalam","Marathi","Bengali"])}</div>
      </div>
      <button class="btn full" type="submit">Start learning 🚀</button>
    </form>
  </div>`;

  // Slides
  let slide = 0;
  const slides = $$(".slide", box), dots = $$(".dots i", box);
  $("#obNext").addEventListener("click", () => {
    slide++;
    if (slide < slides.length) {
      slides.forEach((s, i) => s.classList.toggle("on", i === slide));
      dots.forEach((d, i) => d.classList.toggle("on", i === slide));
      if (slide === slides.length - 1) $("#obNext").textContent = "Get started";
    } else {
      $("#slides").classList.add("hidden");
      $("#obNext").classList.add("hidden");
      $("#obForm").classList.remove("hidden");
      $("#obName").focus();
    }
  });

  // Profile form
  $("#obName").value = p.name;
  $("#obBoard").value = p.board;
  $("#obGrade").value = p.grade;
  const getSubjects = wireChoices($("#obSubjects"), p.subjects, true);
  const getExpert = wireChoices($("#obExpert"), p.expert, false);
  const getPersona = wireChoices($("#obPersona"), p.personality, false);
  const getLang = wireChoices($("#obLang"), p.language, false);
  $("#obName").addEventListener("input", () => $("#obErr").classList.add("hidden"));

  $("#obForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#obName").value.trim();
    if (!name) { $("#obErr").classList.remove("hidden"); $("#obName").focus(); return; }
    Object.assign(p, {
      name, board: $("#obBoard").value, grade: $("#obGrade").value,
      subjects: getSubjects().length ? getSubjects() : ["Maths", "Science", "English"],
      expert: getExpert(), personality: getPersona(), language: getLang(), onboarded: true
    });
    saveProfile(p);
    const list = listProfiles();
    const me = list.find(x => x.id === Store.pid());
    if (me) me.name = name; else list.push({ id: Store.pid(), name });
    Store.setRaw("sb_profiles", list);
    box.classList.add("hidden");
    box.innerHTML = "";
    document.body.classList.remove("no-nav");
    toast("👋 Welcome, " + name + "!");
    location.hash = "home";
    render();
  });
}
