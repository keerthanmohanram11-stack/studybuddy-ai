// StudyBuddy AI server: Groq (fast text) + Gemini (photos, PDFs, web search) + OpenRouter (free backup)
// Keys live in Vercel > Settings > Environment Variables: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY (optional)

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const OPENROUTER_MODELS = ["openrouter/free"];
const DEFAULT_SYSTEM = "You are StudyBuddy, a friendly tutor for school students. Explain in simple words, step by step.";
const TIMEOUT_MS = 15000; // give up on a slow AI quickly and try the next one

// Read a key and remove any accidental spaces or new lines
const key = (name) => (process.env[name] || "").trim();

// ---------- Safety check (runs before any AI is asked) ----------
// If a student seems to be in distress, reply kindly with real help instead of an AI answer.
const DISTRESS = /\b(kill myself|end my life|want to die|suicide|hurt myself|self[- ]?harm|cut myself)\b/i;
const CARE_REPLY = "I'm really sorry you're feeling this way. You matter, and you don't have to handle this alone. 💙\n\n" +
  "Please talk to someone you trust right now, like a parent, teacher or friend.\n\n" +
  "In India you can call **Tele-MANAS on 14416** (free, any time) to talk to a counsellor.\n\n" +
  "I'm here for your studies whenever you're ready.";
const SAFETY_RULES = " Safety rules: you are talking to a child. Never produce adult, violent, hateful or dangerous content. " +
  "If asked for something unsafe or unrelated to learning, kindly say you can't help with that and suggest a study topic instead. " +
  "Never ask for or repeat personal details like phone numbers or addresses.";

// fetch that gives up after TIMEOUT_MS, so the app never hangs
async function fetchWithTimeout(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Groq and OpenRouter use the same "OpenAI-style" format
async function askOpenAIStyle(url, apiKey, model, system, prompt, json) {
  const body = {
    model: model,
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 1500
  };
  if (json) body.response_format = { type: "json_object" };
  const r = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error(data.error?.message || "no answer");
  return reply;
}

async function askGemini(model, system, prompt, attachment, json, search) {
  const parts = [{ text: prompt }];
  if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: parts }]
  };
  if (search) body.tools = [{ google_search: {} }];
  else if (json) body.generationConfig = { responseMimeType: "application/json" };

  const r = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key("GEMINI_API_KEY") },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json();
  const cand = data.candidates?.[0];
  const reply = (cand?.content?.parts || []).map(p => p.text || "").join("").trim();
  if (!reply) throw new Error(data.error?.message || "no answer");
  const sources = (cand?.groundingMetadata?.groundingChunks || [])
    .filter(c => c.web)
    .map(c => ({ title: c.web.title || "Source", url: c.web.uri }))
    .slice(0, 5);
  return { reply, sources };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ reply: "Please use POST" });

  const { prompt, system, image, file, json, search, check } = req.body || {};
  if (!prompt) return res.status(400).json({ reply: "No question was sent" });
  const sys = String(system || DEFAULT_SYSTEM).slice(0, 3000) + SAFETY_RULES;
  const ask = String(prompt).slice(0, 12000);
  const attachment = image || file || null;
  const errors = [];

  // Safety first: "check" is the student's own words, sent by the app
  if (!json && DISTRESS.test(String(check || ""))) {
    return res.status(200).json({ reply: CARE_REPLY, sources: [], model: "Safety" });
  }

  // 1) Photos, PDFs and web search need Gemini
  if (attachment || search) {
    if (key("GEMINI_API_KEY")) {
      for (const m of GEMINI_MODELS) {
        try {
          const out = await askGemini(m, sys, ask, attachment, json, search);
          return res.status(200).json({ reply: out.reply, sources: out.sources, model: "Gemini" });
        } catch (e) { errors.push("Gemini: " + e.message); }
      }
    }
    // A photo or PDF can't go to the text-only AIs
    if (attachment) {
      return res.status(500).json({ reply: "The photo AI is busy right now. Please try again in a minute.", errors });
    }
  }

  // 2) Text: Groq first (fastest), then OpenRouter, then Gemini
  if (key("GROQ_API_KEY")) {
    for (const m of GROQ_MODELS) {
      try {
        const reply = await askOpenAIStyle("https://api.groq.com/openai/v1/chat/completions", key("GROQ_API_KEY"), m, sys, ask, json);
        return res.status(200).json({ reply, sources: [], model: "Groq" });
      } catch (e) { errors.push("Groq: " + e.message); }
    }
  }
  if (key("OPENROUTER_API_KEY")) {
    for (const m of OPENROUTER_MODELS) {
      try {
        const reply = await askOpenAIStyle("https://openrouter.ai/api/v1/chat/completions", key("OPENROUTER_API_KEY"), m, sys, ask, false);
        return res.status(200).json({ reply, sources: [], model: "OpenRouter" });
      } catch (e) { errors.push("OpenRouter: " + e.message); }
    }
  }
  if (key("GEMINI_API_KEY") && !search) {
    for (const m of GEMINI_MODELS) {
      try {
        const out = await askGemini(m, sys, ask, null, json, false);
        return res.status(200).json({ reply: out.reply, sources: [], model: "Gemini" });
      } catch (e) { errors.push("Gemini: " + e.message); }
    }
  }

  res.status(500).json({ reply: "All the AIs are busy right now. Please try again in a minute.", errors });
};