import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Popconfirm, Skeleton, message } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import ScoreRing from "./common/ScoreRing";
import StatusPill, { SampleTag } from "./common/StatusPill";
import SessionVideo from "./report/SessionVideo";
import {
  formatDateTime,
  formatDuration,
  overallScore,
  scoreTone,
  sessionTitle,
  verdict,
} from "./dashboard/sessionUtils";

const QuestionItem = ({ index, q, sample, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const score = Math.round(q.score || 0);
  const id = `q-${index}`;
  return (
    <li className={"qitem" + (open ? " open" : "")}>
      <button type="button" className="qitem-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="qitem-num">{index + 1}</span>
        <span className="qitem-q">{q.question}</span>
        <span className={`qitem-score tone-${scoreTone(score)}`}>
          {score}
          {sample && <small>sample</small>}
        </span>
        <span className="qitem-bar" aria-hidden="true">
          <i className={`bar-fill tone-bg-${scoreTone(score)}`} style={{ width: `${score}%` }} />
        </span>
        <DownOutlined className="qitem-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="qitem-body" id={id}>
          <h4>{sample ? "Sample transcript" : "Transcript"}</h4>
          {q.answer ? <blockquote>{q.answer}</blockquote> : <p className="muted">No answer was detected for this question.</p>}
          <div className="qitem-notes">
            <div>
              <h4>Communication</h4>
              <p>{q.communication || "No observation available."}</p>
            </div>
            <div>
              <h4>Body language</h4>
              <p>{q.body_language || "No observation available."}</p>
            </div>
            <div>
              <h4>Answer time</h4>
              <p>{formatDuration(q.time_consumed_seconds)}</p>
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/interview/dashboard");
      setSession((res.data.sessions || []).find((s) => s.session_id === id) || null);
    } catch (err) {
      if (!err.sessionExpired) setError(getErrorMessage(err, "Could not load this report"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/interview/sessions/${id}`);
      message.success("Interview deleted");
      navigate("/dashboard");
    } catch (err) {
      if (!err.sessionExpired) message.error(getErrorMessage(err, "Failed to delete interview"));
      setDeleting(false);
    }
  };

  const analytics = session?.analytics;
  const sample = !!(session?.demo || analytics?.demo);
  const questions = useMemo(() => analytics?.questions || [], [analytics]);
  const answeredSeconds = questions.reduce((a, q) => a + (q.time_consumed_seconds || 0), 0);

  if (loading) {
    return (
      <div className="page" aria-busy="true" aria-label="Loading report">
        <Skeleton.Input active style={{ width: 280, height: 36, marginBottom: 20 }} />
        <div className="panel"><Skeleton active paragraph={{ rows: 4 }} /></div>
        <div className="panel"><Skeleton active paragraph={{ rows: 6 }} /></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="page">
        <div className="panel empty">
          <WarningOutlined />
          <p>{error || "We couldn't find this interview. It may have been deleted."}</p>
          <div className="row-gap">
            {error && <Button onClick={load}>Try again</Button>}
            <Button type="primary" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (session.status !== "completed" || !analytics) {
    return (
      <div className="page">
        <Link to="/dashboard" className="back-link"><ArrowLeftOutlined /> Dashboard</Link>
        <div className="panel empty">
          <StatusPill status={session.status} />
          <h2>{sessionTitle(session)}</h2>
          <p>This interview has no evaluation yet. Finish and submit it to see your report.</p>
          <Button
            type="primary"
            className="cta"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/interview?session=${session.session_id}`)}
            disabled={session.status === "scheduled"}
          >
            {session.status === "in_progress" ? "Resume interview" : "Start interview"}
          </Button>
        </div>
      </div>
    );
  }

  const score = overallScore(session);
  const comm = analytics.communication || {};
  const v = score !== null ? verdict(score) : null;

  return (
    <div className="page report">
      <Link to="/dashboard" className="back-link">
        <ArrowLeftOutlined /> Dashboard
      </Link>

      <header className="report-head">
        <div>
          <span className="eyebrow">Interview evaluation</span>
          <h1>{sessionTitle(session)}</h1>
          <div className="row-meta">
            <StatusPill status={session.status} />
            {sample && <SampleTag />}
            <span>{session.num_questions} questions &middot; {session.difficulty}</span>
            <span>Completed {formatDateTime(session.completed_at)}</span>
          </div>
        </div>
        <Popconfirm
          title="Delete this interview?"
          description="Its recording and results will be removed permanently."
          okText="Delete"
          cancelText="Keep"
          okButtonProps={{ danger: true, loading: deleting }}
          onConfirm={remove}
        >
          <Button icon={<DeleteOutlined />} danger disabled={deleting}>
            Delete
          </Button>
        </Popconfirm>
      </header>

      {sample ? (
        <Alert
          className="source-banner sample"
          type="warning"
          showIcon
          icon={<ExperimentOutlined />}
          message="Demo sample: not an analysis of your recording"
          description={
            analytics.demo_note ||
            "These scores and comments are built-in sample data so you can explore the app without a Gemini API key. Your recording was saved but not analysed."
          }
        />
      ) : (
        <Alert
          className="source-banner real"
          type="success"
          showIcon
          icon={<RobotOutlined />}
          message="AI analysis of your recording"
          description="Generated from your recorded answers. Scores and observations are AI estimates, best used as guidance."
        />
      )}

      <section className={"panel summary" + (sample ? " is-sample" : "")} aria-label="Summary">
        <div className="summary-score">
          <ScoreRing value={score} size={164} stroke={13} label="overall" sample={sample} />
          {v && !sample ? <strong className={`tone-${v.tone}`}>{v.label}</strong> : <strong className="muted">Sample score</strong>}
        </div>
        <div className="summary-body">
          <h2>Key takeaways</h2>
          {(analytics.insights || []).length > 0 ? (
            <ul className="insights">
              {analytics.insights.map((t, i) => (
                <li key={i}>
                  <CheckCircleOutlined /> {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No summary insights were returned.</p>
          )}
          <div className="summary-facts">
            <div>
              <span className="muted small">Communication</span>
              <b>{typeof comm.score === "number" ? `${comm.score}/10` : "-"}</b>
            </div>
            <div>
              <span className="muted small">Answered</span>
              <b>{questions.filter((q) => q.answer).length}/{questions.length}</b>
            </div>
            <div>
              <span className="muted small">Time answering</span>
              <b>{answeredSeconds ? formatDuration(answeredSeconds) : "-"}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="qb-title">
        <div className="section-head">
          <h2 id="qb-title">Question by question</h2>
          <span className="muted small">Select a question for the transcript and notes</span>
        </div>
        <ol className="qlist">
          {questions.map((q, i) => (
            <QuestionItem key={i} index={i} q={q} sample={sample} defaultOpen={i === 0} />
          ))}
        </ol>
      </section>

      <section className="panel" aria-labelledby="comm-title">
        <h2 id="comm-title">Communication</h2>
        {comm.overallFeedback && <p className="lead">{comm.overallFeedback}</p>}
        <div className="two-col">
          <div className="callout good">
            <h3>Strengths</h3>
            {(comm.strengths || []).length ? (
              <ul>{comm.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul>
            ) : (
              <p className="muted">None listed.</p>
            )}
          </div>
          <div className="callout improve">
            <h3>Areas to improve</h3>
            {(comm.improvementAreas || []).length ? (
              <ul>{comm.improvementAreas.map((t, i) => <li key={i}>{t}</li>)}</ul>
            ) : (
              <p className="muted">None listed.</p>
            )}
          </div>
        </div>
        {(comm.supportingQuotes || []).length > 0 && (
          <>
            <h3 className="sub">Evidence from your answers</h3>
            <ul className="quotes">
              {comm.supportingQuotes.map((qt, i) => (
                <li key={i} className={qt.type === "strength" ? "good" : "improve"}>
                  <blockquote>&ldquo;{qt.quote}&rdquo;</blockquote>
                  <span>{qt.analysis}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {session.video_url && (
        <section className="panel" aria-labelledby="rec-title">
          <h2 id="rec-title">Your recording</h2>
          <SessionVideo url={session.video_url} />
        </section>
      )}
    </div>
  );
};

export default Report;
