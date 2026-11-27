// Public settings the app needs (these values are safe to show in a browser).
// Add them in Vercel > Settings > Environment Variables, then Redeploy.
module.exports = (req, res) => {
  const v = (n) => (process.env[n] || "").trim();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    firebase: v("FIREBASE_API_KEY") ? { apiKey: v("FIREBASE_API_KEY"), authDomain: v("FIREBASE_AUTH_DOMAIN"), projectId: v("FIREBASE_PROJECT_ID"), appId: v("FIREBASE_APP_ID") } : null,
    emailjs: v("EMAILJS_PUBLIC_KEY") ? { publicKey: v("EMAILJS_PUBLIC_KEY"), serviceId: v("EMAILJS_SERVICE_ID"), templateId: v("EMAILJS_TEMPLATE_ID") } : null,
    youtube: !!v("YOUTUBE_API_KEY"),
    ai: { groq: !!v("GROQ_API_KEY"), gemini: !!v("GEMINI_API_KEY"), openrouter: !!v("OPENROUTER_API_KEY") }
  });
};
