import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Skeleton, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { ThemeContext } from "../context/ThemeContext";
import ReadinessCard from "./dashboard/ReadinessCard";
import NextUpCard from "./dashboard/NextUpCard";
import PerformanceChart from "./dashboard/PerformanceChart";
import SessionHistory from "./dashboard/SessionHistory";
import {
  formatDuration,
  greeting,
  isRealAnalysis,
  nameFromEmail,
  overallScore,
  readiness,
} from "./dashboard/sessionUtils";

const newestFirst = (list) =>
  [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// The session that needs attention next: earliest upcoming, else an unfinished one.
const pickNextUp = (sessions) => {
  const upcoming = sessions
    .filter((s) => s.status === "scheduled" || s.status === "missed")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (upcoming.length) return upcoming[0];
  return sessions.find((s) => s.status === "in_progress") || null;
};

const Tile = ({ icon, label, value, hint }) => (
  <div className="tile">
    <span className="tile-icon" aria-hidden="true">{icon}</span>
    <span className="tile-label">{label}</span>
    <strong className="tile-value">{value}</strong>
    {hint && <span className="tile-hint">{hint}</span>}
  </div>
);

const DashboardSkeleton = () => (
  <div aria-busy="true" aria-label="Loading your dashboard">
    <Skeleton.Input active block style={{ height: 40, width: 320, marginBottom: 24 }} />
    <div className="dash-grid">
      <div className="dash-main">
        <div className="panel"><Skeleton active paragraph={{ rows: 3 }} /></div>
        <div className="panel"><Skeleton active paragraph={{ rows: 5 }} /></div>
      </div>
      <div className="dash-side">
        <div className="panel"><Skeleton.Avatar active size={120} shape="circle" /><Skeleton active paragraph={{ rows: 2 }} /></div>
        <div className="panel"><Skeleton active paragraph={{ rows: 3 }} /></div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const { isDarkMode } = useContext(ThemeContext);

  // Keeps countdowns and "Start" buttons for scheduled interviews current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [dash, me] = await Promise.allSettled([
        api.get("/interview/dashboard"),
        api.get("/auth/me"),
      ]);
      if (dash.status === "rejected") throw dash.reason;
      setSessions(newestFirst(dash.value.data.sessions || []));
      if (me.status === "fulfilled") setEmail(me.value.data.email);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setFailed(true);
      // A 401 is handled globally by the API client (logout + redirect).
      if (!error.sessionExpired) message.error(getErrorMessage(error, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startSession = useCallback(
    (session) => navigate(`/interview?session=${session.session_id}`),
    [navigate]
  );
  const openReport = useCallback(
    (session) => navigate(`/sessions/${session.session_id}/report`),
    [navigate]
  );

  const deleteSession = useCallback(async (session) => {
    setDeletingId(session.session_id);
    try {
      await api.delete(`/interview/sessions/${session.session_id}`);
      message.success("Interview deleted");
      setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
    } catch (error) {
      if (!error.sessionExpired) message.error(getErrorMessage(error, "Failed to delete interview"));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    const real = sessions.filter(isRealAnalysis);
    const avg = real.length
      ? Math.round(real.reduce((a, s) => a + overallScore(s), 0) / real.length)
      : null;
    const seconds = completed.reduce(
      (sum, s) => sum + (s.analytics?.questions || []).reduce((a, q) => a + (q.time_consumed_seconds || 0), 0),
      0
    );
    return {
      completed: completed.length,
      avg,
      realCount: real.length,
      seconds,
      upcoming: sessions.filter((s) => s.status === "scheduled" || s.status === "missed").length,
      demoOnly: completed.length > 0 && real.length === 0,
    };
  }, [sessions]);

  const name = nameFromEmail(email).split(" ")[0];
  const nextUp = useMemo(() => pickNextUp(sessions), [sessions]);
  const ready = useMemo(() => readiness(sessions), [sessions]);

  if (loading) {
    return (
      <div className="page">
        <DashboardSkeleton />
      </div>
    );
  }

  if (failed && sessions.length === 0) {
    return (
      <div className="page">
        <div className="panel empty">
          <ClockCircleOutlined />
          <p>We couldn&apos;t load your dashboard.</p>
          <Button type="primary" onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="welcome">
        <div>
          <span className="eyebrow">{greeting(now)}</span>
          <h1>{name ? `${name}, ` : ""}here&apos;s where your practice stands.</h1>
        </div>
        <div className="row-gap">
          <Button size="large" icon={<CalendarOutlined />} onClick={() => navigate("/interview?mode=later")}>
            Schedule
          </Button>
          <Button type="primary" size="large" className="cta" icon={<PlusOutlined />} onClick={() => navigate("/interview")}>
            New interview
          </Button>
        </div>
      </header>

      <div className="dash-grid">
        <div className="dash-main">
          <NextUpCard
            session={nextUp}
            now={now}
            busy={deletingId !== null}
            onStart={startSession}
            onDelete={deleteSession}
            onNew={() => navigate("/interview")}
            onSchedule={() => navigate("/interview?mode=later")}
          />
          <section className="panel" aria-labelledby="perf-title">
            <div className="section-head">
              <h2 id="perf-title">Performance over time</h2>
              <span className="muted small">Overall score per completed interview</span>
            </div>
            <PerformanceChart sessions={sessions} isDarkMode={isDarkMode} />
          </section>
        </div>

        <div className="dash-side">
          <ReadinessCard readiness={ready} hasDemoOnly={stats.demoOnly} />
          <section className="tiles" aria-label="Summary">
            <Tile icon={<CheckCircleOutlined />} label="Completed" value={stats.completed} />
            <Tile
              icon={<LineChartOutlined />}
              label="Average score"
              value={stats.avg === null ? "-" : stats.avg}
              hint={stats.avg === null ? "AI-analysed only" : `${stats.realCount} AI-analysed`}
            />
            <Tile icon={<ThunderboltOutlined />} label="Practice time" value={stats.seconds ? formatDuration(stats.seconds) : "-"} hint="answering" />
            <Tile icon={<CalendarOutlined />} label="Upcoming" value={stats.upcoming} />
          </section>
        </div>
      </div>

      <SessionHistory
        sessions={sessions}
        now={now}
        deletingId={deletingId}
        onOpen={openReport}
        onStart={startSession}
        onDelete={deleteSession}
        onNew={() => navigate("/interview")}
      />
    </div>
  );
};

export default Dashboard;
