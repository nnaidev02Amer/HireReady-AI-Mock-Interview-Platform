import React, { useContext, useEffect, useState } from "react";
import { Button } from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  FileSearchOutlined,
  FieldTimeOutlined,
  LockOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AppConfigContext } from "../context/AppConfigContext";
import ScoreRing from "./common/ScoreRing";
import Brand from "./common/Brand";

const SAMPLE_QUESTIONS = [
  "Tell me about a project you are proud of and your part in it.",
  "How would you design an API that stays fast under heavy load?",
  "Describe a time you disagreed with a teammate. What happened?",
];

const SAMPLE_BARS = [
  { label: "Q1", value: 82 },
  { label: "Q2", value: 68 },
  { label: "Q3", value: 91 },
];

// An illustrative (non-functional) preview of the interview studio and report.
const StudioPreview = () => {
  const [seconds, setSeconds] = useState(41);
  const [qIndex, setQIndex] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    const swap = setInterval(() => setQIndex((i) => (i + 1) % SAMPLE_QUESTIONS.length), 6000);
    return () => {
      clearInterval(tick);
      clearInterval(swap);
    };
  }, []);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="preview" aria-label="Illustrative preview of the interview studio">
      <div className="preview-window">
        <div className="preview-bar">
          <span /> <span /> <span />
          <em>Interview studio</em>
        </div>
        <div className="preview-stage">
          <div className="preview-person" aria-hidden="true">
            <div className="preview-head" />
            <div className="preview-shoulders" />
          </div>
          <span className="rec-badge">
            <i className="rec-dot" /> REC {clock}
          </span>
          <div className="preview-question" key={qIndex}>
            <small>
              Question {qIndex + 1} of {SAMPLE_QUESTIONS.length}
            </small>
            {SAMPLE_QUESTIONS[qIndex]}
          </div>
        </div>
      </div>
      <div className="preview-report">
        <ScoreRing value={84} size={84} stroke={8} sample />
        <div className="preview-bars">
          {SAMPLE_BARS.map((b, i) => (
            <div key={b.label} className="preview-bar-row">
              <span>{b.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${b.value}%`, animationDelay: `${i * 120}ms` }} />
              </div>
              <b>{b.value}</b>
            </div>
          ))}
        </div>
      </div>
      <p className="preview-caption">Illustrative preview, not real results</p>
    </div>
  );
};

const STEPS = [
  {
    icon: <FormOutlined />,
    title: "Set up your interview",
    text: "Paste a job description, pick a difficulty and how many questions. Start now or schedule it for later.",
  },
  {
    icon: <VideoCameraOutlined />,
    title: "Record your answers",
    text: "Answer on camera in a calm, distraction-free studio. Review the recording before you submit it.",
  },
  {
    icon: <FileSearchOutlined />,
    title: "Read your evaluation",
    text: "Get a transcript, a score for each answer, and feedback on your communication, with a recording to replay.",
  },
];

const FEATURES = [
  { icon: <SoundOutlined />, title: "Role-specific questions", text: "Questions are generated from the job description you provide, at the difficulty you choose." },
  { icon: <FieldTimeOutlined />, title: "Measured answer timing", text: "The studio notes exactly when each question appeared, so every answer is matched to the right question." },
  { icon: <CalendarOutlined />, title: "Practice on a schedule", text: "Plan interviews ahead and start them from your dashboard when the time arrives." },
  { icon: <LockOutlined />, title: "Your recordings stay yours", text: "Videos are stored on your own server and only you can watch them. The temporary copy sent for analysis is deleted afterwards." },
];

const Landing = () => {
  const navigate = useNavigate();
  const { demoMode } = useContext(AppConfigContext);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI interview practice</span>
          <h1 className="hero-title">
            Rehearse the interview.
            <br />
            <span className="grad-text">Hear how you actually sound.</span>
          </h1>
          <p className="hero-sub">
            Generate questions for the role you want, answer them on camera, and get a structured
            evaluation of what you said and how you said it.
          </p>
          <div className="hero-cta">
            <Button type="primary" size="large" className="cta" onClick={() => navigate("/register")}>
              Start practising <ArrowRightOutlined />
            </Button>
            <Button size="large" onClick={() => navigate("/login")}>
              I already have an account
            </Button>
          </div>
          {demoMode && (
            <p className="hero-note">
              This server is running in <b>Demo Mode</b>: questions and feedback are built-in samples,
              not an analysis of your recording.
            </p>
          )}
        </div>
        <StudioPreview />
      </section>

      <section className="section" id="how">
        <span className="eyebrow">How it works</span>
        <h2 className="section-title">From job description to feedback in three steps</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-num">{i + 1}</span>
              <span className="step-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <span className="eyebrow">Built for real practice</span>
        <h2 className="section-title">Everything you need, nothing you don&apos;t</h2>
        <div className="feature-list">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Your next interview starts with one practice run.</h2>
        <Button type="primary" size="large" className="cta" onClick={() => navigate("/register")}>
          Create your free account <ArrowRightOutlined />
        </Button>
      </section>

      <footer className="footer">
        <Brand compact />
        <span>HireReady AI - The Interview Studio. A final-year academic project.</span>
      </footer>
    </div>
  );
};

export default Landing;
