import React, { useState } from "react";
import { Button, Popconfirm, Segmented } from "antd";
import { DeleteOutlined, FileSearchOutlined, PlayCircleOutlined, PlusOutlined } from "@ant-design/icons";
import StatusPill, { SampleTag } from "../common/StatusPill";
import {
  canStart,
  formatDateTime,
  overallScore,
  scoreTone,
  sessionTitle,
  timeUntil,
} from "./sessionUtils";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
];

const matches = (s, filter) =>
  filter === "all" ||
  (filter === "completed" ? s.status === "completed" : s.status !== "completed");

const EMPTY = {
  all: "No interviews yet.",
  upcoming: "Nothing to do right now. You're all caught up.",
  completed: "No completed interviews yet.",
};

const SessionHistory = ({ sessions, now, deletingId, onOpen, onStart, onDelete, onNew }) => {
  const [filter, setFilter] = useState("all");
  const visible = sessions.filter((s) => matches(s, filter));
  const counts = {
    all: sessions.length,
    upcoming: sessions.filter((s) => s.status !== "completed").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  };

  return (
    <section className="panel history" aria-labelledby="history-title">
      <div className="section-head">
        <h2 id="history-title">Interview history</h2>
        <Segmented
          options={FILTERS.map((f) => ({ ...f, label: `${f.label} (${counts[f.value]})` }))}
          value={filter}
          onChange={setFilter}
          aria-label="Filter interviews"
        />
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <FileSearchOutlined />
          <p>{EMPTY[filter]}</p>
          <Button type="primary" className="cta" icon={<PlusOutlined />} onClick={onNew}>
            New interview
          </Button>
        </div>
      ) : (
        <ul className="rows">
          {visible.map((s) => {
            const score = overallScore(s);
            const done = s.status === "completed";
            const startable = s.status === "in_progress" || canStart(s, now);
            const until = s.scheduled_at ? timeUntil(s.scheduled_at, now) : null;
            const deleting = deletingId === s.session_id;
            return (
              <li key={s.session_id} className="row">
                <div className="row-main">
                  <button
                    type="button"
                    className="row-title"
                    onClick={() => (done ? onOpen(s) : onStart(s))}
                    disabled={!done && !startable}
                  >
                    {sessionTitle(s)}
                  </button>
                  <div className="row-meta">
                    <StatusPill status={s.status} />
                    {s.demo && <SampleTag />}
                    <span>
                      {s.status === "scheduled" || s.status === "missed"
                        ? formatDateTime(s.scheduled_at)
                        : formatDateTime(s.completed_at || s.created_at)}
                    </span>
                    <span>
                      {s.num_questions} q &middot; {s.difficulty}
                    </span>
                    {s.status === "scheduled" && until && <span>opens in {until}</span>}
                  </div>
                </div>

                {score !== null && (
                  <div className={`row-score tone-${scoreTone(score)}`} aria-label={`Score ${score} out of 100${s.demo ? ", demo sample" : ""}`}>
                    {score}
                    <small>{s.demo ? "sample" : "/100"}</small>
                  </div>
                )}

                <div className="row-actions">
                  {done ? (
                    <Button type="primary" ghost icon={<FileSearchOutlined />} onClick={() => onOpen(s)}>
                      View report
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      disabled={!startable || deleting}
                      onClick={() => onStart(s)}
                    >
                      {s.status === "in_progress" ? "Resume" : "Start"}
                    </Button>
                  )}
                  <Popconfirm
                    title={s.status === "scheduled" ? "Cancel this interview?" : "Delete this interview?"}
                    description="Its recording and results will be removed permanently."
                    okText={s.status === "scheduled" ? "Cancel interview" : "Delete"}
                    cancelText="Keep"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDelete(s)}
                  >
                    <Button
                      type="text"
                      danger
                      loading={deleting}
                      icon={<DeleteOutlined />}
                      aria-label={`${s.status === "scheduled" ? "Cancel" : "Delete"} interview: ${sessionTitle(s)}`}
                    />
                  </Popconfirm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default SessionHistory;
