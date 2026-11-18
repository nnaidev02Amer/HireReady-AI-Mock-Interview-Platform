export const STATUS = {
  scheduled: { label: "Scheduled", tone: "info" },
  in_progress: { label: "In progress", tone: "warn" },
  completed: { label: "Completed", tone: "success" },
  missed: { label: "Missed", tone: "danger" },
};

export const sessionTitle = (session) => {
  const text = (session.job_description || "Untitled interview")
    .trim()
    .replace(/\s+/g, " ");
  return text.length > 56 ? `${text.slice(0, 53)}...` : text;
};

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "";

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

export const formatDuration = (seconds) => {
  const total = Math.round(seconds || 0);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  return minutes < 60
    ? `${minutes} min ${String(total % 60).padStart(2, "0")}s`
    : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

export const overallScore = (session) =>
  session.analytics && typeof session.analytics.overall_score === "number"
    ? session.analytics.overall_score
    : null;

// A completed interview analysed by the real AI (not Demo Mode sample data).
export const isRealAnalysis = (session) =>
  session.status === "completed" &&
  !session.demo &&
  !(session.analytics && session.analytics.demo) &&
  overallScore(session) !== null;

// A scheduled interview can be started once its time has arrived. Missed ones too.
export const canStart = (session, now) =>
  session.status === "missed" ||
  (session.status === "scheduled" &&
    session.scheduled_at &&
    new Date(session.scheduled_at) <= now);

// "2 h 15 min", "3 days", ... or null if the time has already passed.
export const timeUntil = (iso, now) => {
  const minutes = Math.ceil((new Date(iso) - now) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};

export const scoreTone = (score) =>
  score >= 75 ? "success" : score >= 50 ? "warn" : "danger";

export const scoreColor = (score) =>
  score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

export const verdict = (score) =>
  score >= 80
    ? { label: "Strong performance", tone: "success" }
    : score >= 65
    ? { label: "Solid, with room to sharpen", tone: "success" }
    : score >= 45
    ? { label: "Developing", tone: "warn" }
    : { label: "Needs more practice", tone: "danger" };

const byCompletion = (a, b) =>
  new Date(a.completed_at || a.created_at) - new Date(b.completed_at || b.created_at);

// Interview readiness = average of the most recent real AI-analysed scores (max 3).
// Demo Mode results are sample data and never count.
export const readiness = (sessions) => {
  const real = sessions.filter(isRealAnalysis).sort(byCompletion);
  if (real.length === 0) return { score: null, basedOn: 0, delta: null };
  const recent = real.slice(-3).map(overallScore);
  const score = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  const previous = real.slice(-6, -3).map(overallScore);
  const delta = previous.length
    ? score - Math.round(previous.reduce((a, b) => a + b, 0) / previous.length)
    : null;
  return { score, basedOn: recent.length, delta };
};

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export const nameFromEmail = (email) => {
  if (!email) return "";
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
};
