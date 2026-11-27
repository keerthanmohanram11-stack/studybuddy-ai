// ================= Wayfinder: content and data =================

// Subjects: each has a colour + icon so every screen looks consistent
const SUBJECTS = {
  "Maths": { icon: "sigma", c: "indigo" },
  "Science": { icon: "flask", c: "teal" },
  "English": { icon: "feather", c: "coral" },
  "Social Science": { icon: "landmark", c: "amber" },
  "Hindi": { icon: "languages", c: "rose" },
  "Telugu": { icon: "languages", c: "rose" },
  "Computers": { icon: "code", c: "violet" },
  "Physics": { icon: "atom", c: "sky" },
  "Chemistry": { icon: "flask", c: "green" },
  "Biology": { icon: "dna", c: "green" },
  "Other": { icon: "book", c: "slate" }
};
const ALL_SUBJECTS = ["Maths", "Science", "English", "Social Science", "Hindi", "Telugu", "Computers", "Physics", "Chemistry", "Biology"];
const CLASSES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Other"];
function subjIcon(s) { return (SUBJECTS[s] || SUBJECTS.Other).icon; }
function subjColor(s) { const c = (SUBJECTS[s] || SUBJECTS.Other).c; return c === "indigo" ? "" : "c-" + c; }

// Languages: app + AI + voice codes
const LANGS = [
  { id: "English", native: "English", code: "en-IN" },
  { id: "Hindi", native: "हिन्दी", code: "hi-IN" },
  { id: "Telugu", native: "తెలుగు", code: "te-IN" },
  { id: "Tamil", native: "தமிழ்", code: "ta-IN" },
  { id: "Kannada", native: "ಕನ್ನಡ", code: "kn-IN" },
  { id: "Malayalam", native: "മലയാളം", code: "ml-IN" },
  { id: "Marathi", native: "मराठी", code: "mr-IN" },
  { id: "Bengali", native: "বাংলা", code: "bn-IN" }
];
function langCode(id) { return (LANGS.find(l => l.id === id) || LANGS[0]).code; }

// ---------- The 8 AI helpers ----------
const HELPERS = [
  { id: "tutor", name: "Socratic Tutor", icon: "compass", color: "#4F46E5", desc: "Guides you with questions until you truly get it",
    rules: "You are a Socratic tutor. If you don't know what the student already understands, ask ONE short question first. Teach in small steps and check understanding after each step with one quick question. For homework or exercise problems never give the final answer straight away: give hints until the student gets it, unless they clearly ask for the full answer. Keep replies under 130 words and usually end with a question.",
    starters: ["Why do we see lightning before thunder?", "Help me understand photosynthesis", "I don't get fractions. Start from the basics"] },
  { id: "doubt", name: "Doubt Solver", icon: "lightbulb", color: "#F59E0B", desc: "Clear step-by-step answers to any doubt",
    rules: "You are a doubt solver. Give a clear, complete, step-by-step answer. Number the steps. Show working for maths. End with a one-line summary and one quick check question.",
    starters: ["Solve: 2x + 5 = 17, step by step", "What is the difference between mass and weight?", "Explain Newton's third law with an example"] },
  { id: "exam", name: "Exam Coach", icon: "exam", color: "#E11D48", desc: "Important questions, marking schemes, exam tips",
    rules: "You are a CBSE/board exam coach. Write answers the way examiners expect: key points, keywords in bold, correct length for the marks. When useful, mention the marking scheme, common mistakes and likely exam questions. Give time-saving exam tips.",
    starters: ["Most important questions from my chapter", "How do I write a 5-mark answer?", "Make me a last-day revision checklist"] },
  { id: "essay", name: "Essay & Grammar Coach", icon: "feather", color: "#FF7A59", desc: "Better writing, grammar and letters",
    rules: "You are a writing coach. Improve the student's writing without rewriting it all for them: point out grammar, structure and vocabulary issues, explain why, then show a short improved example. Help with essays, letters, notices, stories and comprehension.",
    starters: ["Check the grammar in my paragraph", "How do I write a formal letter?", "Give me 5 better words for 'good'"] },
  { id: "code", name: "Coding Mentor", icon: "code", color: "#7C3AED", desc: "Learn coding, debug, understand logic",
    rules: "You are a patient coding mentor for school students (Python, Scratch, HTML, Java). Explain logic simply, use tiny code examples in code blocks, help debug by asking what they expected, and encourage them to try before showing the full solution.",
    starters: ["Explain loops in Python simply", "Why is my code giving an error?", "Give me a fun beginner project"] },
  { id: "lang", name: "Language Buddy", icon: "languages", color: "#0D9488", desc: "Practise speaking, translate, learn words",
    rules: "You are a friendly language practice partner. Chat naturally, gently correct mistakes (show the correction in bold), teach useful words, and help with translation between English and Indian languages. Keep it fun and short.",
    starters: ["Let's practise English conversation", "Translate this sentence to Hindi", "Teach me 5 new words today"] },
  { id: "quizmaster", name: "Quiz Master", icon: "quiz", color: "#0EA5E9", desc: "Rapid-fire questions in the chat",
    rules: "You are a quiz master. Ask ONE question at a time about the student's topic (multiple choice with options A to D, or short answer). Wait for their answer, say if it's right, explain briefly, keep score, then ask the next question. Get harder when they're right, easier when they're wrong.",
    starters: ["Quiz me on my chapter", "Rapid-fire science quiz", "10 general knowledge questions"] },
  { id: "career", name: "Career Guide", icon: "briefcase", color: "#059669", desc: "Streams, careers, skills and goals",
    rules: "You are a warm career guide for Indian school students. Help them explore streams (Science, Commerce, Arts), careers, entrance exams and skills. Ask about their interests, give balanced options, and suggest small next steps. Be encouraging and realistic.",
    starters: ["Which stream should I choose after Class 10?", "Careers for someone who loves drawing", "What skills should I build now?"] }
];

// ---------- AI "brains" (Settings > AI) ----------
const BRAINS = [
  { id: "auto", name: "Auto (recommended)", desc: "Picks the fastest working AI and switches if one is busy" },
  { id: "groq-70b", name: "Llama 3.3 70B", desc: "Smart and very fast (Groq)" },
  { id: "groq-8b", name: "Llama 3.1 8B", desc: "Fastest replies, simpler answers (Groq)" },
  { id: "gemini", name: "Gemini Flash", desc: "Great with Indian languages and photos (Google)" },
  { id: "gemini-lite", name: "Gemini Flash Lite", desc: "Light and quick (Google)" },
  { id: "openrouter", name: "OpenRouter free", desc: "Free backup models" }
];

// ---------- Greetings: changes with the time, streak and exams ----------
const GREETINGS = {
  early: ["Up early, {n}. Fresh minds learn fastest.", "Good morning, {n}. Let's start strong.", "Rise and learn, {n}."],
  morning: ["Good morning, {n}.", "Morning, {n}. What's first today?", "Fresh start, {n}. Let's make it count."],
  afternoon: ["Good afternoon, {n}.", "Welcome back, {n}.", "Afternoon, {n}. Ready for a quick win?"],
  evening: ["Welcome home, {n}.", "Good evening, {n}. Let's plan your study time.", "Evening, {n}. Ready when you are."],
  night: ["Studying late, {n}? Keep it short and sleep well.", "Night owl mode, {n}.", "Still going, {n}? Your future self says thanks."]
};

// ---------- Quotes: a new one every time Home opens ----------
const QUOTES = [
  ["Education is the most powerful weapon which you can use to change the world.", "Nelson Mandela"],
  ["The beautiful thing about learning is that nobody can take it away from you.", "B.B. King"],
  ["Small steps every day add up to big results.", ""],
  ["Mistakes are proof that you are trying.", ""],
  ["Focus on progress, not perfection.", ""],
  ["The expert in anything was once a beginner.", ""],
  ["Your future self will thank you for this hour.", ""],
  ["Discipline is choosing what you want most over what you want now.", ""],
  ["Don't watch the clock. Do what it does: keep going.", ""],
  ["Hard work beats talent when talent doesn't work hard.", ""],
  ["Success is the sum of small efforts repeated day after day.", ""],
  ["Every doubt you clear today is a mark you earn tomorrow.", ""],
  ["Curiosity is the compass that finds every answer.", ""],
  ["You don't have to be great to start, but you have to start to be great.", ""],
  ["One focused hour beats three distracted ones.", ""],
  ["Understanding beats memorising. Ask why.", ""],
  ["The phone can wait. Your goals can't.", ""],
  ["Be the student you'd want to teach.", ""],
  ["Learning is a journey. Today is one more step on the map.", ""],
  ["Strong roots grow tall trees. Master the basics.", ""],
  ["Confidence comes from preparation.", ""],
  ["A little progress each day adds up to big results.", ""],
  ["Ask questions. That's how great minds are built.", ""],
  ["Today's effort is tomorrow's result.", ""],
  ["Find your way to every answer.", "Wayfinder"]
];
const TIPS = [
  "Testing yourself helps you remember far more than re-reading.",
  "Spread revision over a few days instead of cramming in one night.",
  "Explain the topic out loud, as if you're teaching a friend.",
  "Mix different types of questions when you practise.",
  "Sleep helps your brain store what you learned today.",
  "After about 25 minutes of focus, take a 5-minute break.",
  "Turn each heading into a question, then answer it from memory.",
  "Write your mistakes down: they show exactly what to fix."
];
const FLOATERS = ["Keep going", "You've got this", "Curiosity is your compass", "One step at a time", "Mistakes are lessons", "Small steps, big wins", "Stay curious", "Practice makes progress", "Focus. Learn. Grow.", "Think, don't copy", "Progress over perfection", "Find your way"];
const LOADING_LINES = ["Finding the best path…", "Checking the map…", "Thinking it through…", "Connecting the dots…", "Charting your route…", "Lighting the way…"];

// ---------- Badges: 12 badges x 3 tiers (bronze, silver, gold) ----------
const BADGES = [
  { id: "questions", cat: "Learning", icon: "message", name: "Curious Mind", stat: s => s.counts.questions || 0, tiers: [1, 25, 100], unit: "questions asked" },
  { id: "sessions", cat: "Learning", icon: "book", name: "Study Sessions", stat: s => s.counts.sessions || 0, tiers: [1, 10, 50], unit: "sessions done" },
  { id: "notes", cat: "Learning", icon: "notes", name: "Note Keeper", stat: s => s.counts.notes || 0, tiers: [1, 10, 30], unit: "notes" },
  { id: "videos", cat: "Learning", icon: "video", name: "Video Explorer", stat: s => s.counts.videos || 0, tiers: [1, 5, 20], unit: "video lessons" },
  { id: "quizzes", cat: "Practice", icon: "quiz", name: "Quiz Champion", stat: s => s.counts.quizzes || 0, tiers: [1, 10, 50], unit: "quizzes" },
  { id: "perfect", cat: "Practice", icon: "trophy", name: "Perfect Score", stat: s => s.counts.perfect || 0, tiers: [1, 5, 20], unit: "perfect quizzes" },
  { id: "cards", cat: "Practice", icon: "cards", name: "Card Master", stat: s => s.counts.cardsGot || 0, tiers: [10, 100, 500], unit: "cards remembered" },
  { id: "fixed", cat: "Practice", icon: "wand", name: "Mistake Fixer", stat: s => s.counts.mistakesFixed || 0, tiers: [1, 10, 50], unit: "mistakes fixed" },
  { id: "focus", cat: "Focus", icon: "tree", name: "Focus Forest", stat: s => s.counts.focus || 0, tiers: [1, 10, 50], unit: "focus sessions" },
  { id: "streak", cat: "Focus", icon: "flame", name: "On Fire", stat: s => s.best || 0, tiers: [3, 7, 30], unit: "day streak" },
  { id: "snaps", cat: "Explorer", icon: "camera", name: "Snap Star", stat: s => s.counts.snaps || 0, tiers: [1, 10, 50], unit: "photos solved" },
  { id: "level", cat: "Explorer", icon: "rocket", name: "Level Up", stat: s => Math.floor((s.xp || 0) / 100) + 1, tiers: [5, 10, 20], unit: "level" }
];

// ---------- NCERT chapters (latest books). Other classes are fetched live by the AI with Google Search. ----------
const NCERT = {
  "Class 10": {
    "Maths": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"],
    "Science": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Life Processes", "Control and Coordination", "How do Organisms Reproduce?", "Heredity", "Light: Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current", "Our Environment"],
    "Social Science": ["History: The Rise of Nationalism in Europe", "History: Nationalism in India", "History: The Making of a Global World", "History: The Age of Industrialisation", "History: Print Culture and the Modern World", "Geography: Resources and Development", "Geography: Forest and Wildlife Resources", "Geography: Water Resources", "Geography: Agriculture", "Geography: Minerals and Energy Resources", "Geography: Manufacturing Industries", "Geography: Lifelines of National Economy", "Civics: Power-sharing", "Civics: Federalism", "Civics: Gender, Religion and Caste", "Civics: Political Parties", "Civics: Outcomes of Democracy", "Economics: Development", "Economics: Sectors of the Indian Economy", "Economics: Money and Credit", "Economics: Globalisation and the Indian Economy", "Economics: Consumer Rights"],
    "English": ["A Letter to God", "Nelson Mandela: Long Walk to Freedom", "Two Stories about Flying", "From the Diary of Anne Frank", "Glimpses of India", "Mijbil the Otter", "Madam Rides the Bus", "The Sermon at Benares", "The Proposal"]
  },
  "Class 11": {
    "Physics": ["Units and Measurements", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work, Energy and Power", "System of Particles and Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves"],
    "Chemistry": ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity in Properties", "Chemical Bonding and Molecular Structure", "Thermodynamics", "Equilibrium", "Redox Reactions", "Organic Chemistry: Some Basic Principles and Techniques", "Hydrocarbons"],
    "Biology": ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom", "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals", "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development", "Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products and their Elimination", "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination and Integration"],
    "Maths": ["Sets", "Relations and Functions", "Trigonometric Functions", "Complex Numbers and Quadratic Equations", "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequences and Series", "Straight Lines", "Conic Sections", "Introduction to Three Dimensional Geometry", "Limits and Derivatives", "Statistics", "Probability"]
  },
  "Class 12": {
    "Physics": ["Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics", "Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics"],
    "Chemistry": ["Solutions", "Electrochemistry", "Chemical Kinetics", "The d- and f-Block Elements", "Coordination Compounds", "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules"],
    "Biology": ["Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health", "Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution", "Human Health and Disease", "Microbes in Human Welfare", "Biotechnology: Principles and Processes", "Biotechnology and its Applications", "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation"],
    "Maths": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Application of Derivatives", "Integrals", "Application of Integrals", "Differential Equations", "Vector Algebra", "Three Dimensional Geometry", "Linear Programming", "Probability"]
  }
};

// Ambient focus sounds (made live with Web Audio, no downloads)
const SOUNDS = [
  { id: "alpha", name: "Alpha waves", icon: "wave", desc: "10 Hz binaural beat for calm focus (use headphones)" },
  { id: "rain", name: "Rain", icon: "rain", desc: "Soft steady rain" },
  { id: "brown", name: "Deep noise", icon: "wind", desc: "Warm brown noise that blocks distractions" },
  { id: "white", name: "White noise", icon: "waves", desc: "Even static sound" },
  { id: "lofi", name: "Lo-fi pad", icon: "music", desc: "Slow calm chords" },
  { id: "cafe", name: "Study café", icon: "coffee", desc: "Gentle murmur and warmth" }
];
