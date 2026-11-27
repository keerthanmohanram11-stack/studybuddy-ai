// Wayfinder server: Groq (fast text) + Gemini (photos, PDFs, YouTube videos, web search) + OpenRouter (free backup)
// Keys live in Vercel > Settings > Environment Variables: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY (optional)

const GROQ = { "groq-70b": "llama-3.3-70b-versatile", "groq-8b": "llama-3.1-8b-instant" };
const GEMINI = { "gemini": "gemini-flash-latest", "gemini-lite": "gemini-flash-lite-latest" };
const OPENROUTER_MODEL = "openrouter/free";
const key = (name) => (process.env[name] || "").trim();

// Safety: if a student seems to be in distress, reply kindly with real help instead of an AI answer
const DISTRESS = /\b(kill myself|end my life|want to die|suicide|hurt myself|self[- ]?harm|cut myself)\b/i;
const CARE_REPLY = "I'm really sorry you're feeling this way. You matter, and you don't have to handle this alone.\n\n" +
  "Please talk to someone you trust right now, like a parent, teacher or friend.\n\n" +
  "In India you can call **Tele-MANAS on 14416** (free, any time) to talk to a counsellor.\n\nI'm here for your studies whenever you're ready.";
const SAFETY = " Safety rules: you are talking to a child. Never produce adult, violent, hateful or dangerous content. If asked for something unsafe or unrelated to learning, kindly say you can't help with that and suggest a study topic instead. Never ask for personal details like phone numbers or addresses.";

async function fetchT(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function askOpenAIStyle(url, apiKey, model, system, prompt, json, ms) {
  const body = { model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.6, max_tokens: 2000 };
  if (json) body.response_format = { type: "json_object" };
  const r = await fetchT(url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey }, body: JSON.stringify(body) }, ms);
  const data = await r.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error(data.error?.message || "no answer");
  return reply;
}

async function askGemini(model, system, prompt, { attachment, video, json, search }, ms) {
  const parts = [];
  if (video) parts.push({ file_data: { file_uri: video } });
  if (attachment) parts.push({ inline_data: { mime_type: attachment.mimeType, data: attachment.data } });
  parts.push({ text: prompt });
  const body = { system_instruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }] };
  if (search) body.tools = [{ google_search: {} }];
  else if (json) body.generationConfig = { responseMimeType: "application/json" };
  const r = await fetchT("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key("GEMINI_API_KEY") }, body: JSON.stringify(body) }, ms);
  const data = await r.json();
  const cand = data.candidates?.[0];
  const reply = (cand?.content?.parts || []).map(p => p.text || "").join("").trim();
  if (!reply) throw new Error(data.error?.message || "no answer");
  const sources = (cand?.groundingMetadata?.groundingChunks || []).filter(c => c.web).map(c => ({ title: c.web.title || "Source", url: c.web.uri })).slice(0, 5);
  return { reply, sources };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ reply: "Please use POST" });
  const { prompt, system, image, file, video, json, search, check, model, task } = req.body || {};
  if (!prompt) return res.status(400).json({ reply: "No question was sent" });
  const sys = String(system || "You are Wayfinder, a friendly tutor.").slice(0, 6000) + (task === "translate" ? "" : SAFETY);
  const ask = String(prompt).slice(0, 16000);
  const attachment = image || file || null;
  const errors = [];
  if (!json && DISTRESS.test(String(check || ""))) return res.status(200).json({ reply: CARE_REPLY, sources: [], model: "Safety" });

  const tryGemini = async (names, ms) => {
    if (!key("GEMINI_API_KEY")) return null;
    for (const m of names) {
      try { return await askGemini(m, sys, ask, { attachment, video, json, search }, ms); }
      catch (e) { errors.push("Gemini " + m + ": " + e.message); }
    }
    return null;
  };
  const tryGroq = async (names) => {
    if (!key("GROQ_API_KEY")) return null;
    for (const m of names) {
      try { return { reply: await askOpenAIStyle("https://api.groq.com/openai/v1/chat/completions", key("GROQ_API_KEY"), m, sys, ask, json, 15000), sources: [] }; }
      catch (e) { errors.push("Groq " + m + ": " + e.message); }
    }
    return null;
  };
  const tryOpenRouter = async () => {
    if (!key("OPENROUTER_API_KEY")) return null;
    try { return { reply: await askOpenAIStyle("https://openrouter.ai/api/v1/chat/completions", key("OPENROUTER_API_KEY"), OPENROUTER_MODEL, sys, ask, false, 20000), sources: [] }; }
    catch (e) { errors.push("OpenRouter: " + e.message); return null; }
  };
  const send = (out, name) => res.status(200).json({ reply: out.reply, sources: out.sources || [], model: name });

  // Photos, PDFs, YouTube videos and web search need Gemini
  if (attachment || video || search) {
    const out = await tryGemini(Object.values(GEMINI), video ? 55000 : 25000);
    if (out) return send(out, "Gemini");
    if (attachment || video) return res.status(500).json({ reply: "The photo and video AI is busy right now. Please try again in a minute.", errors });
  }

  // Translations: Gemini is best at Indian languages
  if (task === "translate") {
    const out = (await tryGemini(Object.values(GEMINI), 25000)) || (await tryGroq([GROQ["groq-70b"]]));
    if (out) return send(out, "Translate");
  }

  // The student's chosen "brain" goes first, then automatic fallback
  const order = [];
  if (GROQ[model]) order.push(["groq", [GROQ[model]]]);
  if (GEMINI[model]) order.push(["gemini", [GEMINI[model]]]);
  if (model === "openrouter") order.push(["openrouter"]);
  order.push(["groq", Object.values(GROQ)], ["openrouter"], ["gemini", Object.values(GEMINI)]);
  for (const [kind, names] of order) {
    const out = kind === "groq" ? await tryGroq(names) : kind === "gemini" ? (search ? null : await tryGemini(names, 25000)) : await tryOpenRouter();
    if (out) return send(out, kind === "groq" ? "Groq" : kind === "gemini" ? "Gemini" : "OpenRouter");
  }
  res.status(500).json({ reply: "All the AIs are busy right now. Please try again in a minute.", errors });
};
