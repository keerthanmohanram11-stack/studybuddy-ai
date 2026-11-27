// Search YouTube for study videos (needs YOUTUBE_API_KEY in Vercel; free quota)
module.exports = async (req, res) => {
  const k = (process.env.YOUTUBE_API_KEY || "").trim();
  const q = String((req.query && req.query.q) || "").slice(0, 120);
  if (!k) return res.status(200).json({ items: [], error: "no-key" });
  if (!q) return res.status(400).json({ items: [] });
  try {
    const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&safeSearch=strict&relevanceLanguage=en&videoEmbeddable=true&q=" + encodeURIComponent(q) + "&key=" + k;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(200).json({ items: [], error: data.error.message });
    res.status(200).json({ items: (data.items || []).map(i => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle, thumb: (i.snippet.thumbnails.medium || i.snippet.thumbnails.default || {}).url })) });
  } catch (e) { res.status(200).json({ items: [], error: e.message }); }
};
