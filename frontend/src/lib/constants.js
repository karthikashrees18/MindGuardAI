// Shared option lists + presentation copy. Keys match the backend enums
// (backend/app/auth/models.py) exactly.

export const TRIGGERS = [
  { key: "exam_pressure", label: "Exam pressure", hint: "Tests, vivas, finals" },
  { key: "deadlines", label: "Deadlines", hint: "Assignments & submissions piling up" },
  { key: "low_marks", label: "Low marks", hint: "Grades, results, backlogs" },
  { key: "public_speaking", label: "Public speaking", hint: "Presentations, seminars" },
  { key: "social_conflict", label: "Social conflict", hint: "Arguments, feeling left out" },
];

export const RECOVERY = [
  { key: "lt_1h", label: "< 1 hour", hint: "I bounce back quickly" },
  { key: "few_hours", label: "A few hours", hint: "Usually by the evening" },
  { key: "full_day", label: "A full day", hint: "It lingers until tomorrow" },
  { key: "multiple_days", label: "Multiple days", hint: "It can take a while to shake off" },
];

export const COPING = [
  { key: "music", label: "Music", hint: "Sound that settles me" },
  { key: "breathing", label: "Breathing", hint: "Slow, guided breaths" },
  { key: "mini_games", label: "Casual mini-games", hint: "Something gentle to focus on" },
  { key: "journaling", label: "Journaling", hint: "Getting thoughts onto paper" },
];

export const GENRES = [
  { key: "lofi", label: "Lo-Fi" },
  { key: "classical", label: "Classical" },
  { key: "ambient", label: "Ambient / Binaural" },
  { key: "indie", label: "Indie" },
  { key: "pop", label: "Pop" },
];

export const LANGUAGES = [
  { key: "english", label: "English" },
  { key: "hindi", label: "Hindi" },
  { key: "tamil", label: "Tamil" },
  { key: "telugu", label: "Telugu" },
  { key: "kannada", label: "Kannada" },
  { key: "instrumental", label: "Instrumental" },
];

// Spotify playlists the student may paste, one per emotional destination.
export const PLAYLIST_STATES = [
  { key: "uplifting", label: "Uplifting", hint: "When I'm feeling flat or low" },
  { key: "calming", label: "Calming", hint: "When everything feels like too much" },
  { key: "focus", label: "Focus", hint: "When I need to get things done" },
];

export const MOODS = [
  { emoji: "😀", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😢", label: "Rough" },
];

// The three score bands from the product spec.
export const CATEGORY_META = {
  calm: { label: "Normal / Calm", range: "0–40", color: "var(--teal)", icon: "calm" },
  mild: { label: "Mild Overthinking", range: "41–70", color: "var(--amber)", icon: "mild" },
  critical: { label: "Critical / High Distress", range: "71–100", color: "var(--coral)", icon: "critical" },
};

export function categoryOf(score) {
  if (score == null) return "calm";
  return score <= 40 ? "calm" : score <= 70 ? "mild" : "critical";
}

export const RISK_META = {
  critical: { label: "Critical", cls: "critical" },
  moderate: { label: "Moderate", cls: "moderate" },
  stable: { label: "Stable", cls: "stable" },
};

// One-click demo text for live presentations (shown on the check-in page in demo mode).
export const SAMPLE_TEXTS = {
  high:
    "I keep thinking about the exam over and over. What if I fail? I always mess up, nothing ever works for me. " +
    "I can't stop thinking about it and I feel so hopeless and stressed. It's all my fault, I should have studied more.",
  mild:
    "Pretty stressed about the assignment deadline and a bit anxious about the viva. Feeling tired but I'll manage.",
  calm:
    "Had a good day. Finished my assignment early and went for a walk with friends. Feeling grateful and relaxed.",
};

export const HELPLINES = [
  { name: "Tele-MANAS (India, 24×7)", number: "14416" },
  { name: "Kiran Mental Health Helpline", number: "1800-599-0019" },
  { name: "iCall (TISS)", number: "9152987821" },
];

export function displayName(user) {
  if (!user) return "";
  return user.preferred_name || (user.name || "").split(" ")[0] || "there";
}

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good evening";
}
