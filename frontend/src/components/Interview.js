import React, { useContext, useEffect, useRef, useState } from "react";
import { Form, Modal, Spin, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { AppConfigContext } from "../context/AppConfigContext";
import SetupForm from "./interview/SetupForm";
import Studio from "./interview/Studio";
import { FailedPanel, ReviewPanel, UploadingPanel } from "./interview/Panels";

const Interview = () => {
  // setup -> recording -> review -> uploading -> (uploadFailed -> uploading ...) -> report
  const [phase, setPhase] = useState("setup");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [questionStart, setQuestionStart] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [reviewUrl, setReviewUrl] = useState(null);
  const [reviewDuration, setReviewDuration] = useState(0);

  const [form] = Form.useForm();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const drawTimerRef = useRef(null);
  const indexRef = useRef(0); // read by the canvas drawing loop
  const recordingStartedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const submittingRef = useRef(false); // blocks duplicate submissions
  const pendingBlobRef = useRef(null); // kept so a failed upload can be retried
  // Exact timing, sent with the upload so the analysis knows where each answer starts.
  const recordingStartRef = useRef(0);
  const questionStartsRef = useRef([0]); // seconds from recording start, one per question
  const timingRef = useRef(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("session");
  const initialMode = searchParams.get("mode") === "later" ? "later" : "now";
  const { demoMode } = useContext(AppConfigContext);

  const releaseCamera = () => {
    if (drawTimerRef.current) {
      clearInterval(drawTimerRef.current);
      drawTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  // Release the camera if the user leaves the page mid-interview.
  useEffect(
    () => () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      releaseCamera();
    },
    []
  );

  // A calmer, distraction-free layout while recording / reviewing.
  useEffect(() => {
    const studio = phase !== "setup";
    document.body.dataset.studio = studio ? "1" : "";
    return () => {
      document.body.dataset.studio = "";
    };
  }, [phase]);

  // Warn before a reload/close would throw the recording away.
  useEffect(() => {
    if (!["recording", "review", "uploadFailed"].includes(phase)) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(
    () => () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    },
    [reviewUrl]
  );

  const startRecording = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Video failed to load"));
        video.srcObject = stream;
      });
      await video.play().catch(() => {});

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // The recording is the canvas: camera frame + "Question N" label. The label
      // (top-left corner) lets the analysis confirm which question is on screen.
      const draw = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(10, 10, 200, 50);
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`Question ${indexRef.current + 1}`, 20, 40);
      };
      draw();
      // setInterval (not requestAnimationFrame) so the recording keeps going
      // if the user switches to another browser tab.
      drawTimerRef.current = setInterval(draw, 33);

      const canvasStream = canvas.captureStream(30);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);

      chunksRef.current = [];
      const recorder = new MediaRecorder(canvasStream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      recordingStartRef.current = performance.now();
      questionStartsRef.current = [0];
      setElapsed(0);
      setQuestionStart(0);
      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      releaseCamera();
      setCameraError(error.message || "Could not access the camera");
    }
  };

  // Start the camera once the studio screen (and its <canvas>) is on screen.
  useEffect(() => {
    if (phase === "recording" && !recordingStartedRef.current) {
      recordingStartedRef.current = true;
      startRecording();
    }
    // Intentionally runs only when the phase changes (start the camera once per take).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const beginInterview = (questionList, id) => {
    setQuestions(questionList);
    setSessionId(id);
    resetTake();
  };

  const resetTake = () => {
    setCurrentIndex(0);
    indexRef.current = 0;
    recordingStartedRef.current = false;
    setUploadError(null);
    setPhase("recording");
  };

  // Opened from the dashboard ("Start" / "Resume"): /interview?session=<id>
  useEffect(() => {
    if (!resumeSessionId || autoStartedRef.current) return;
    autoStartedRef.current = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.post(`/interview/sessions/${resumeSessionId}/start`);
        beginInterview(res.data.questions || [], res.data.session_id);
      } catch (error) {
        if (!error.sessionExpired) {
          message.error(getErrorMessage(error, "Could not start the interview"));
        }
        navigate("/dashboard", { replace: true });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  const uploadRecording = async () => {
    const blob = pendingBlobRef.current;
    if (!blob || submittingRef.current) return;
    submittingRef.current = true;
    setUploadError(null);
    setUploadPct(0);
    setPhase("uploading");

    // Send the real recorded format (webm in Chrome/Firefox, mp4 in Safari).
    const mimeType = blob.type || "video/webm";
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", blob, `interview.${extension}`);
    const timing = timingRef.current;
    if (timing && timing.timestamps.length === questions.length) {
      formData.append("question_timestamps", JSON.stringify(timing.timestamps));
      formData.append("duration_seconds", String(timing.duration));
    }

    try {
      await api.post("/interview/upload-video", formData, {
        onUploadProgress: (e) => setUploadPct(Math.min(100, Math.round((e.loaded * 100) / (e.total || e.loaded || 1)))),
      });
      pendingBlobRef.current = null;
      message.success("Interview submitted. Your report is ready.");
      navigate(`/sessions/${sessionId}/report`);
    } catch (error) {
      console.error("Upload error:", error);
      if (!error.sessionExpired) {
        setUploadError(getErrorMessage(error, "Failed to upload video"));
        setPhase("uploadFailed");
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const finishRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const elapsedSeconds = (performance.now() - recordingStartRef.current) / 1000;
    timingRef.current = {
      timestamps: [...questionStartsRef.current],
      duration: Math.max(elapsedSeconds, questionStartsRef.current.slice(-1)[0]),
    };
    const blob = await new Promise((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }));
      recorder.stop();
    });
    releaseCamera();
    pendingBlobRef.current = blob;
    setReviewDuration(timingRef.current.duration);
    setReviewUrl(URL.createObjectURL(blob));
    setPhase("review");
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const seconds = (performance.now() - recordingStartRef.current) / 1000;
      questionStartsRef.current.push(seconds);
      setQuestionStart(Math.floor(seconds));
      indexRef.current = currentIndex + 1;
      setCurrentIndex(currentIndex + 1);
    } else {
      finishRecording();
    }
  };

  const retake = () => {
    pendingBlobRef.current = null;
    timingRef.current = null;
    setReviewUrl(null);
    resetTake();
  };

  const confirmLeave = (what) => {
    Modal.confirm({
      title: "Leave this interview?",
      content: `${what} You can start the interview again from the dashboard.`,
      okText: "Leave",
      cancelText: "Stay",
      okButtonProps: { danger: true },
      onOk: () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.onstop = null;
          recorderRef.current.stop();
        }
        releaseCamera();
        pendingBlobRef.current = null;
        navigate("/dashboard");
      },
    });
  };

  const downloadRecording = () => {
    const blob = pendingBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview.${(blob.type || "").includes("mp4") ? "mp4" : "webm"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFinish = async (values) => {
    if (loading) return;
    setLoading(true);
    const payload = {
      job_description: values.job_description,
      difficulty: values.difficulty,
      num_questions: values.num_questions,
    };
    if (values.when === "later") {
      payload.scheduled_at = values.scheduled_at.toISOString();
    }
    try {
      const res = await api.post("/interview/generate-questions", payload);
      if (values.when === "later") {
        message.success(
          `Interview scheduled for ${new Date(res.data.scheduled_at).toLocaleString()}`
        );
        navigate("/dashboard");
        return;
      }
      beginInterview(res.data.questions || [], res.data.session_id);
    } catch (error) {
      console.error("Generate questions error:", error);
      if (!error.sessionExpired) {
        message.error(getErrorMessage(error, "Failed to generate questions"));
      }
    }
    setLoading(false);
  };

  if (phase === "setup") {
    return (
      <div className="page">
        <header className="page-head">
          <span className="eyebrow">New interview</span>
          <h1>Set up your interview</h1>
          <p className="muted">Four quick choices, then you&apos;re in the studio.</p>
        </header>
        {resumeSessionId ? (
          <div className="status-view" role="status">
            <Spin size="large" />
            <p className="muted">Starting your interview...</p>
          </div>
        ) : (
          <SetupForm form={form} loading={loading} onFinish={onFinish} demoMode={demoMode} initialMode={initialMode} />
        )}
      </div>
    );
  }

  return (
    <div className="page page-studio">
      {phase === "recording" && (
        <Studio
          questions={questions}
          index={currentIndex}
          recording={recording}
          elapsed={elapsed}
          questionElapsed={Math.max(0, elapsed - questionStart)}
          cameraError={cameraError}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onNext={handleNext}
          onRetryCamera={startRecording}
          onLeave={() => confirmLeave("The recording will be discarded.")}
        />
      )}
      {phase === "review" && (
        <ReviewPanel
          blobUrl={reviewUrl}
          duration={reviewDuration}
          demoMode={demoMode}
          onSubmit={uploadRecording}
          onRetake={retake}
          onDownload={downloadRecording}
          onLeave={() => confirmLeave("The recording will be discarded.")}
        />
      )}
      {phase === "uploading" && <UploadingPanel percent={uploadPct} demoMode={demoMode} />}
      {phase === "uploadFailed" && (
        <FailedPanel
          error={uploadError}
          onRetry={uploadRecording}
          onDownload={downloadRecording}
          onDiscard={() => {
            pendingBlobRef.current = null;
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default Interview;
