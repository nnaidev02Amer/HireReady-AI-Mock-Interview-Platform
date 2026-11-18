import React from "react";
import { Alert, Button, DatePicker, Form, Input, Slider } from "antd";
import {
  AimOutlined,
  CalendarOutlined,
  CameraOutlined,
  FireOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import ChoiceCards from "../common/ChoiceCards";

const ROLE_TEMPLATES = [
  { label: "Software engineer", text: "Software engineer working with Python and React on web applications." },
  { label: "Data analyst", text: "Data analyst using SQL and Python to build dashboards and answer business questions." },
  { label: "Product manager", text: "Product manager responsible for roadmap, stakeholder communication and shipping features." },
  { label: "DevOps engineer", text: "DevOps engineer managing CI/CD pipelines, containers and cloud infrastructure." },
];

const DIFFICULTY = [
  { value: "easy", title: "Easy", description: "Fundamentals and a gentle warm-up", icon: <AimOutlined /> },
  { value: "medium", title: "Medium", description: "Typical questions for the role", icon: <ThunderboltOutlined /> },
  { value: "hard", title: "Hard", description: "Deep, probing follow-ups", icon: <FireOutlined /> },
];

const WHEN = [
  { value: "now", title: "Start now", description: "Generate questions and begin recording", icon: <RocketOutlined /> },
  { value: "later", title: "Schedule for later", description: "Pick a date; start from your dashboard", icon: <CalendarOutlined /> },
];

const Step = ({ n, title, hint, children }) => (
  <section className="step-block">
    <div className="step-title">
      <span className="step-badge">{n}</span>
      <div>
        <h2>{title}</h2>
        {hint && <p className="muted small">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

const SetupForm = ({ form, loading, onFinish, demoMode, initialMode }) => {
  const values = Form.useWatch([], form) || {};
  const later = values.when === "later";
  const role = (values.job_description || "").trim();
  const count = values.num_questions || 5;

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="vertical"
      requiredMark={false}
      initialValues={{ difficulty: "medium", num_questions: 5, when: initialMode }}
      className="setup"
    >
      <div className="setup-main">
        <Step n={1} title="Which role are you practising for?" hint="Paste a job description or describe the role. Questions are based on this.">
          <div className="chips" role="group" aria-label="Role examples">
            {ROLE_TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.label}
                className="chip"
                onClick={() => form.setFieldsValue({ job_description: t.text })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Form.Item
            name="job_description"
            rules={[
              { required: true, message: "Please input the job description!" },
              { whitespace: true, message: "Please input the job description!" },
            ]}
          >
            <Input.TextArea
              placeholder="e.g., Software Engineer with 5 years of experience in Python and React"
              rows={5}
              showCount
              maxLength={2000}
              aria-label="Job description"
            />
          </Form.Item>
        </Step>

        <Step n={2} title="How demanding should it be?">
          <Form.Item name="difficulty" rules={[{ required: true, message: "Please select difficulty!" }]}>
            <ChoiceCards options={DIFFICULTY} label="Difficulty" />
          </Form.Item>
        </Step>

        <Step n={3} title="How many questions?" hint="Each answer is recorded separately in one continuous session.">
          <div className="count-row">
            <strong className="count-big" aria-live="polite">{count}</strong>
            <Form.Item name="num_questions" noStyle>
              <Slider min={2} max={10} step={1} marks={{ 2: "2", 5: "5", 10: "10" }} tooltip={{ open: false }} aria-label="Number of questions" />
            </Form.Item>
          </div>
        </Step>

        <Step n={4} title="When do you want to do it?">
          <Form.Item name="when">
            <ChoiceCards options={WHEN} label="When" />
          </Form.Item>
          {later && (
            <Form.Item
              name="scheduled_at"
              label="Date and time"
              extra="You can start the interview from the dashboard once this time arrives."
              rules={[
                { required: true, message: "Please choose a date and time!" },
                {
                  validator: (_, value) =>
                    !value || value.valueOf() > Date.now()
                      ? Promise.resolve()
                      : Promise.reject(new Error("Please choose a future time")),
                },
              ]}
            >
              <DatePicker
                showTime={{ format: "HH:mm", minuteStep: 5 }}
                format="DD MMM YYYY, HH:mm"
                style={{ width: "100%" }}
                size="large"
                disabledDate={(d) => d && d.endOf("day").valueOf() < Date.now()}
              />
            </Form.Item>
          )}
        </Step>
      </div>

      <aside className="setup-summary panel" aria-label="Interview summary">
        <span className="eyebrow">Your interview</span>
        <dl>
          <div>
            <dt>Role</dt>
            <dd className={role ? "" : "muted"}>{role ? (role.length > 90 ? `${role.slice(0, 87)}...` : role) : "Not set yet"}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd className="cap">{values.difficulty || "medium"}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>
              {count} <span className="muted small">(roughly {count * 2} min)</span>
            </dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {later
                ? values.scheduled_at
                  ? values.scheduled_at.format("DD MMM YYYY, HH:mm")
                  : "Pick a date and time"
                : "Right away"}
            </dd>
          </div>
          <div>
            <dt>Feedback</dt>
            <dd>{demoMode ? "Demo samples" : "AI analysis"}</dd>
          </div>
        </dl>

        {demoMode && (
          <Alert
            type="info"
            showIcon
            message="Demo Mode"
            description="No Gemini API key is configured, so questions and feedback are built-in samples. Your recording is still saved."
          />
        )}
        {!later && (
          <p className="note">
            <CameraOutlined /> You&apos;ll be asked to allow camera and microphone access.
          </p>
        )}

        <Button type="primary" htmlType="submit" size="large" block loading={loading} className="cta" icon={later ? <CalendarOutlined /> : <PlayCircleOutlined />}>
          {later ? "Schedule Interview" : "Generate Questions & Start"}
        </Button>
      </aside>
    </Form>
  );
};

export default SetupForm;
