import React from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { STATUS } from "../dashboard/sessionUtils";

const ICONS = {
  scheduled: <CalendarOutlined />,
  in_progress: <ClockCircleOutlined />,
  completed: <CheckCircleOutlined />,
  missed: <ExclamationCircleOutlined />,
};

// Status is conveyed by icon + text + colour (never colour alone).
const StatusPill = ({ status }) => {
  const meta = STATUS[status] || STATUS.in_progress;
  return (
    <span className={`pill pill-${meta.tone}`}>
      {ICONS[status] || ICONS.in_progress}
      {meta.label}
    </span>
  );
};

export const SampleTag = () => <span className="pill pill-sample">Demo sample</span>;

export default StatusPill;
