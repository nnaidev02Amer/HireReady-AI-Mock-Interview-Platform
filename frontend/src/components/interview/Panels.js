import React, { useEffect, useState } from "react";
import { Alert, Button, Progress, Space } from "antd";
import {
  CloudUploadOutlined,
  DownloadOutlined,
  LoadingOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SendOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { clock } from "./Studio";

// After recording: play it back, then submit, re-record or save a copy.
export const ReviewPanel = ({ blobUrl, duration, demoMode, onSubmit, onRetake, onDownload, onLeave }) => (
  <div className="status-view review">
    <span className="eyebrow">Review your recording</span>
    <h1>Happy with that take?</h1>
    <p className="muted">
      Watch it back before you submit. Nothing has been uploaded yet.
      {duration ? ` Length: ${clock(duration)}.` : ""}
    </p>
    <video className="review-video" src={blobUrl} controls playsInline aria-label="Playback of your recorded interview" />
    <div className="row-gap center">
      <Button type="primary" size="large" className="cta" icon={<SendOutlined />} onClick={onSubmit}>
        {demoMode ? "Submit (demo feedback)" : "Submit for analysis"}
      </Button>
      <Button size="large" icon={<UndoOutlined />} onClick={onRetake}>
        Record again
      </Button>
      <Button size="large" icon={<DownloadOutlined />} onClick={onDownload}>
        Download copy
      </Button>
    </div>
    <Button type="text" icon={<LogoutOutlined />} onClick={onLeave}>
      Leave without submitting
    </Button>
  </div>
);

// Upload progress is the real byte count; analysis time can't be predicted, so it is indeterminate.
export const UploadingPanel = ({ percent, demoMode }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const uploaded = percent >= 100;

  return (
    <div className="status-view" role="status" aria-live="polite">
      <span className="eyebrow">Submitting</span>
      <h1>{uploaded ? (demoMode ? "Preparing your sample feedback" : "Analysing your answers") : "Uploading your recording"}</h1>
      <ol className="phases">
        <li className={uploaded ? "done" : "active"}>
          {uploaded ? <CloudUploadOutlined /> : <LoadingOutlined />} Upload {uploaded ? "complete" : `${percent}%`}
        </li>
        <li className={uploaded ? "active" : ""}>
          {uploaded ? <LoadingOutlined /> : <span className="phase-dot" />} {demoMode ? "Preparing demo feedback" : "AI analysis"}
        </li>
      </ol>
      <Progress
        percent={uploaded ? 100 : percent}
        status="active"
        showInfo={false}
        strokeColor={{ from: "#7c5cff", to: "#22d3ee" }}
        aria-label="Upload progress"
      />
      <p className="muted small">
        {uploaded && !demoMode
          ? `This usually takes under a minute, sometimes longer. Elapsed: ${clock(seconds)}. Please keep this page open.`
          : "Please keep this page open."}
      </p>
    </div>
  );
};

export const FailedPanel = ({ error, onRetry, onDownload, onDiscard }) => (
  <div className="status-view">
    <Alert type="error" showIcon message="Your interview could not be submitted" description={error} role="alert" />
    <p className="muted">
      Your recording is still in this page. Retry the upload, or download a copy to keep it.
    </p>
    <Space wrap>
      <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
        Retry upload
      </Button>
      <Button icon={<DownloadOutlined />} onClick={onDownload}>
        Download recording
      </Button>
      <Button danger onClick={onDiscard}>
        Discard
      </Button>
    </Space>
  </div>
);
