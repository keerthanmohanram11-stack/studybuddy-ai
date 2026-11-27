// ================= Wayfinder: translate the whole app =================
// How it works: screens are written in English. When another language is chosen,
// every piece of interface text on screen is looked up in a dictionary.
// Missing words are translated by the AI in small batches and saved on the phone,
// so each word is only translated once. Student content (chats, notes, names) is
// marked data-notr and is never touched.

const SEED_KEYS = ["Home", "Learn", "Practice", "Plan", "Progress", "Settings", "Start a study session", "Today's plan", "Ask AI", "Snap & solve", "Quiz", "Flashcards", "Notes", "Planner", "Language", "Save", "Cancel", "Next", "Back", "Continue", "Sign in", "Create account"];
const SEEDS = {
  Hindi: ["होम", "सीखें", "अभ्यास", "योजना", "प्रगति", "सेटिंग्स", "पढ़ाई शुरू करें", "आज की योजना", "AI से पूछें", "फ़ोटो से हल करें", "क्विज़", "फ़्लैशकार्ड", "नोट्स", "प्लानर", "भाषा", "सेव करें", "रद्द करें", "आगे", "वापस", "जारी रखें", "साइन इन करें", "खाता बनाएं"],
  Telugu: ["హోమ్", "నేర్చుకో", "సాధన", "ప్రణాళిక", "ప్రగతి", "సెట్టింగ్‌లు", "చదువు ప్రారంభించండి", "నేటి ప్రణాళిక", "AIని అడగండి", "ఫోటో తీసి పరిష్కరించండి", "క్విజ్", "ఫ్లాష్‌కార్డ్‌లు", "నోట్స్", "ప్లానర్", "భాష", "సేవ్ చేయండి", "రద్దు చేయండి", "తదుపరి", "వెనుకకు", "కొనసాగించండి", "సైన్ ఇన్ చేయండి", "ఖాతా సృష్టించండి"],
  Tamil: ["முகப்பு", "கற்றல்", "பயிற்சி", "திட்டம்", "முன்னேற்றம்", "அமைப்புகள்", "படிக்கத் தொடங்கு", "இன்றைய திட்டம்", "AI-யிடம் கேள்", "படம் எடுத்து தீர்", "வினாடி வினா", "ஃபிளாஷ் கார்டுகள்", "குறிப்புகள்", "திட்டமிடல்", "மொழி", "சேமி", "ரத்து", "அடுத்து", "பின்செல்", "தொடர்", "உள்நுழை", "கணக்கை உருவாக்கு"],
  Kannada: ["ಮುಖಪುಟ", "ಕಲಿಯಿರಿ", "ಅಭ್ಯಾಸ", "ಯೋಜನೆ", "ಪ್ರಗತಿ", "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", "ಅಧ್ಯಯನ ಪ್ರಾರಂಭಿಸಿ", "ಇಂದಿನ ಯೋಜನೆ", "AI ಅನ್ನು ಕೇಳಿ", "ಫೋಟೋ ತೆಗೆದು ಪರಿಹರಿಸಿ", "ರಸಪ್ರಶ್ನೆ", "ಫ್ಲ್ಯಾಶ್‌ಕಾರ್ಡ್‌ಗಳು", "ಟಿಪ್ಪಣಿಗಳು", "ಯೋಜಕ", "ಭಾಷೆ", "ಉಳಿಸಿ", "ರದ್ದುಮಾಡಿ", "ಮುಂದೆ", "ಹಿಂದೆ", "ಮುಂದುವರಿಸಿ", "ಸೈನ್ ಇನ್", "ಖಾತೆ ರಚಿಸಿ"],
  Malayalam: ["ഹോം", "പഠിക്കുക", "പരിശീലനം", "പ്ലാൻ", "പുരോഗതി", "ക്രമീകരണങ്ങൾ", "പഠനം ആരംഭിക്കുക", "ഇന്നത്തെ പ്ലാൻ", "AI-യോട് ചോദിക്കുക", "ഫോട്ടോ എടുത്ത് പരിഹരിക്കുക", "ക്വിസ്", "ഫ്ലാഷ് കാർഡുകൾ", "കുറിപ്പുകൾ", "പ്ലാനർ", "ഭാഷ", "സേവ് ചെയ്യുക", "റദ്ദാക്കുക", "അടുത്തത്", "തിരികെ", "തുടരുക", "സൈൻ ഇൻ", "അക്കൗണ്ട് സൃഷ്ടിക്കുക"],
  Marathi: ["होम", "शिका", "सराव", "नियोजन", "प्रगती", "सेटिंग्ज", "अभ्यास सुरू करा", "आजचे नियोजन", "AI ला विचारा", "फोटो काढून सोडवा", "प्रश्नमंजुषा", "फ्लॅशकार्ड्स", "नोट्स", "प्लॅनर", "भाषा", "जतन करा", "रद्द करा", "पुढे", "मागे", "सुरू ठेवा", "साइन इन करा", "खाते तयार करा"],
  Bengali: ["হোম", "শিখুন", "অনুশীলন", "পরিকল্পনা", "অগ্রগতি", "সেটিংস", "পড়া শুরু করুন", "আজকের পরিকল্পনা", "AI-কে জিজ্ঞাসা করুন", "ছবি তুলে সমাধান করুন", "কুইজ", "ফ্ল্যাশকার্ড", "নোটস", "প্ল্যানার", "ভাষা", "সংরক্ষণ করুন", "বাতিল", "পরবর্তী", "পিছনে", "চালিয়ে যান", "সাইন ইন করুন", "অ্যাকাউন্ট তৈরি করুন"]
};

const I18N = {
  lang: "English", dict: {}, pending: new Set(), failed: new Set(), timer: null, busy: false,
  orig: new WeakMap(), wrote: new WeakMap(), observer: null
};
const ATTRS = ["placeholder", "aria-label", "title"];

function i18nLoad(lang) {
  I18N.lang = lang || "English";
  I18N.dict = {};
  I18N.failed = new Set();
  if (I18N.lang === "English") return;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("wf_i18n_" + I18N.lang) || "{}"); } catch (e) {}
  const seed = SEEDS[I18N.lang] || [];
  SEED_KEYS.forEach((k, i) => { if (seed[i]) I18N.dict[k] = seed[i]; });
  Object.assign(I18N.dict, saved);
}
function i18nSave() {
  if (I18N.lang === "English") return;
  try { localStorage.setItem("wf_i18n_" + I18N.lang, JSON.stringify(I18N.dict)); } catch (e) {}
}
// For text built in code (toasts, alerts)
function T(s, vars) {
  let out = String(s);
  if (I18N.lang !== "English") {
    if (I18N.dict[out]) out = I18N.dict[out];
    else queueTranslate(out);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return out;
}
function translatable(s) { return s && s.length > 1 && s.length < 400 && /[A-Za-z]{2}/.test(s) && !/^https?:/.test(s); }
function skip(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !el || !!el.closest("[data-notr], script, style, code, pre, textarea, svg");
}

// Translate one text node (or restore English)
function trNode(node) {
  if (skip(node)) return;
  const raw = node.nodeValue;
  if (I18N.wrote.get(node) === raw) {
    // we wrote this; if language changed back to English, restore
    if (I18N.lang === "English" && I18N.orig.has(node)) { const o = I18N.orig.get(node); I18N.wrote.set(node, o); if (raw !== o) node.nodeValue = o; }
    else if (I18N.lang !== "English") {
      const o = I18N.orig.get(node), core = o.trim(), tr = I18N.dict[core];
      const v = tr ? o.replace(core, tr) : o;
      if (!tr && translatable(core)) queueTranslate(core);
      if (v !== raw) { I18N.wrote.set(node, v); node.nodeValue = v; }
    }
    return;
  }
  // new English text from the app
  I18N.orig.set(node, raw);
  if (I18N.lang === "English") return;
  const core = raw.trim();
  if (!translatable(core)) return;
  const tr = I18N.dict[core];
  if (tr) { const v = raw.replace(core, tr); I18N.wrote.set(node, v); node.nodeValue = v; }
  else queueTranslate(core);
}
function trAttrs(el) {
  if (skip(el)) return;
  ATTRS.forEach(a => {
    if (!el.hasAttribute(a)) return;
    const key = "data-en-" + a;
    if (!el.hasAttribute(key) || (el.getAttribute(a) !== el.getAttribute(key) && el.getAttribute(a) !== I18N.dict[el.getAttribute(key)])) el.setAttribute(key, el.getAttribute(a));
    const en = el.getAttribute(key);
    const put = v => { if (el.getAttribute(a) !== v) el.setAttribute(a, v); };
    if (I18N.lang === "English") { put(en); return; }
    if (!translatable(en)) return;
    if (I18N.dict[en]) put(I18N.dict[en]); else queueTranslate(en);
  });
}
function trTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { trNode(root); return; }
  if (root.nodeType !== 1 || skip(root)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) trNode(n);
  if (root.querySelectorAll) { trAttrs(root); root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(trAttrs); }
}
function i18nStart() {
  if (I18N.observer) return;
  I18N.observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(trTree);
      else if (m.type === "characterData") trNode(m.target);
      else if (m.type === "attributes" && ATTRS.includes(m.attributeName)) trAttrs(m.target);
    }
  });
  I18N.observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  trTree(document.body);
}
function setLanguage(lang) {
  i18nLoad(lang);
  document.documentElement.lang = langCode(lang).slice(0, 2);
  trTree(document.body);
}

function queueTranslate(s) {
  if (I18N.lang === "English" || I18N.failed.has(s) || I18N.dict[s]) return;
  I18N.pending.add(s);
  clearTimeout(I18N.timer);
  I18N.timer = setTimeout(flushTranslate, 450);
}
async function flushTranslate() {
  if (I18N.busy) { clearTimeout(I18N.timer); I18N.timer = setTimeout(flushTranslate, 700); return; }
  const lang = I18N.lang;
  const batch = [...I18N.pending].filter(s => !I18N.dict[s]).slice(0, 60);
  batch.forEach(s => I18N.pending.delete(s));
  if (!batch.length || lang === "English") return;
  I18N.busy = true;
  showTranslating(true);
  try {
    const native = (LANGS.find(l => l.id === lang) || {}).native || lang;
    const data = await aiJSON(
      "Translate these mobile app interface texts from English into " + lang + " (" + native + "). " +
      "Rules: natural, simple words for Indian school students; keep them short like app buttons; keep {placeholders}, numbers and the brand name Wayfinder unchanged; keep common tech words like AI, Quiz, XP, PDF, YouTube in English letters if that is how students say them. " +
      'Return JSON exactly like {"t": ["...", "..."]} with the translations in the SAME order. Texts:\n' + JSON.stringify(batch),
      { task: "translate", plain: true }
    );
    const arr = Array.isArray(data) ? data : (data.t || data.translations || []);
    if (lang === I18N.lang) {
      batch.forEach((s, i) => { if (typeof arr[i] === "string" && arr[i].trim()) I18N.dict[s] = arr[i].trim(); else I18N.failed.add(s); });
      i18nSave();
      trTree(document.body);
    }
  } catch (e) {
    batch.forEach(s => I18N.failed.add(s));
  }
  I18N.busy = false;
  showTranslating(false);
  if (I18N.pending.size) flushTranslate();
}
function showTranslating(on) {
  let el = document.getElementById("trBadge");
  if (!el) {
    el = document.createElement("div");
    el.id = "trBadge"; el.setAttribute("data-notr", "");
    el.style.cssText = "position:fixed;top:10px;right:12px;z-index:95;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--muted);display:none;align-items:center;gap:6px";
    el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> Translating';
    document.body.appendChild(el);
  }
  el.style.display = on ? "flex" : "none";
}
