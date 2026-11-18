import React from "react";
import { Alert, Button, Progress } from "antd";
import { ArrowRightOutlined, CheckOutlined, LogoutOutlined, StopOutlined } from "@ant-design/icons";

export const clock = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;

// The recording workspace: one calm screen, the current question as the focus.
const Studio = ({
  questions,
  index,
  recording,
  elapsed,
  questionElapsed,
  cameraError,
  videoRef,
  canvasRef,
  onNext,
  onLeave,
  onRetryCamera,
}) => {
  const isLast = index === questions.length - 1;
  const percent = Math.round((index / questions.length) * 100);

  return (
    <div className="studio">
      <div className="studio-main">
        <div className="studio-top">
          <span className="eyebrow">
            Question {index + 1} of {questions.length}
          </span>
          <Progress percent={percent} showInfo={false} size="small" aria-label="Interview progress" />
        </div>

        <div className="question-focus" aria-live="polite">
          <h1>{questions[index]}</h1>
          <p className="muted">Take a breath. Structure your answer: the situation, what you did, and the result.</p>
        </div>

        <div className="stage">
          {recording && (
            <span className="rec-badge" role="status">
              <i className="rec-dot" /> REC {clock(elapsed)}
            </span>
          )}
          {!recording && !cameraError && <span className="stage-wait">Starting camera...</span>}
          {recording && <span className="answer-timer">This answer {clock(questionElapsed)}</span>}
          <video ref={videoRef} autoPlay muted playsInline className="hidden-video" />
          <canvas ref={canvasRef} className="stage-canvas" style={{ display: cameraError ? "none" : "block" }} />
          {cameraError && (
            <div className="stage-error">
              <Alert
                type="error"
                showIcon
                message="Camera or microphone unavailable"
                description={`${cameraError}. Allow camera and microphone access in the browser (the page must be on localhost or HTTPS) and try again.`}
                action={
                  <Button size="small" onClick={onRetryCamera}>
                    Try again
                  </Button>
                }
              />
            </div>
          )}
        </div>

        <div className="studio-controls">
          <Button icon={<LogoutOutlined />} onClick={onLeave}>
            Leave
          </Button>
          <Button
            type="primary"
            size="large"
            className="cta"
            onClick={onNext}
            disabled={!recording}
            icon={isLast ? <StopOutlined /> : <ArrowRightOutlined />}
            iconPosition="end"
          >
            {isLast ? "Finish & Submit" : "Next question"}
          </Button>
        </div>
      </div>

      <aside className="studio-side" aria-label="Question navigation">
        <span className="eyebrow">Questions</span>
        <ol className="qnav">
          {questions.map((q, i) => (
            <li
              key={i}
              className={i < index ? "done" : i === index ? "current" : ""}
              aria-current={i === index ? "step" : undefined}
            >
              <span className="qnav-dot">{i < index ? <CheckOutlined /> : i + 1}</span>
              <span className="qnav-text">{q}</span>
            </li>
          ))}
        </ol>
        <p className="note">
          Questions move forward only, so each answer is matched to the right question.
        </p>
      </aside>
    </div>
  );
};

export default Studio;
