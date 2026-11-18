import React from "react";
import { Button, Popconfirm } from "antd";
import { CalendarOutlined, DeleteOutlined, PlayCircleOutlined, PlusOutlined } from "@ant-design/icons";
import StatusPill, { SampleTag } from "../common/StatusPill";
import { canStart, formatDateTime, sessionTitle, timeUntil } from "./sessionUtils";

// The one interview that needs attention next, or a prompt to start a new one.
const NextUpCard = ({ session, now, onStart, onDelete, onNew, onSchedule, busy }) => {
  if (!session) {
    return (
      <section className="panel nextup nextup-empty" aria-labelledby="nextup-title">
        <span className="eyebrow" id="nextup-title">Up next</span>
        <h2>Nothing scheduled</h2>
        <p className="muted">Start a practice interview now, or plan one for later.</p>
        <div className="row-gap">
          <Button type="primary" className="cta" icon={<PlusOutlined />} onClick={onNew}>
            New interview
          </Button>
          <Button icon={<CalendarOutlined />} onClick={onSchedule}>
            Schedule one
          </Button>
        </div>
      </section>
    );
  }

  const startable = session.status === "in_progress" || canStart(session, now);
  const until = session.scheduled_at ? timeUntil(session.scheduled_at, now) : null;

  let timing;
  if (session.status === "in_progress") timing = "You started this one but haven't submitted it yet.";
  else if (session.status === "missed") timing = `Was scheduled for ${formatDateTime(session.scheduled_at)}. You can still take it.`;
  else if (until) timing = `Opens in ${until}`;
  else timing = "Ready to start";

  return (
    <section className="panel nextup" aria-labelledby="nextup-title">
      <div className="nextup-head">
        <span className="eyebrow" id="nextup-title">Up next</span>
        <StatusPill status={session.status} />
        {session.demo && <SampleTag />}
      </div>
      <h2 className="nextup-title">{sessionTitle(session)}</h2>
      <p className="nextup-meta">
        {session.scheduled_at && (
          <>
            <CalendarOutlined /> {formatDateTime(session.scheduled_at)} &middot;{" "}
          </>
        )}
        {session.num_questions} questions &middot; {session.difficulty}
      </p>
      <p className={"nextup-timing" + (startable && session.status !== "in_progress" ? " ready" : "")}>{timing}</p>
      <div className="row-gap">
        <Button
          type="primary"
          size="large"
          className="cta"
          icon={<PlayCircleOutlined />}
          disabled={!startable || busy}
          onClick={() => onStart(session)}
        >
          {session.status === "in_progress" ? "Resume interview" : "Start interview"}
        </Button>
        <Popconfirm
          title={session.status === "scheduled" ? "Cancel this interview?" : "Delete this interview?"}
          description="Its recording and results will be removed permanently."
          okText={session.status === "scheduled" ? "Cancel interview" : "Delete"}
          cancelText="Keep"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(session)}
        >
          <Button size="large" icon={<DeleteOutlined />} disabled={busy} aria-label="Delete this interview">
            {session.status === "scheduled" ? "Cancel" : "Delete"}
          </Button>
        </Popconfirm>
      </div>
    </section>
  );
};

export default NextUpCard;
