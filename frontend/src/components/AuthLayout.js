import React from "react";
import { CheckCircleFilled } from "@ant-design/icons";
import Brand from "./common/Brand";

const POINTS = [
  "Questions generated from your target role",
  "Record on camera and review before you submit",
  "A scored evaluation for every answer",
];

// Split layout shared by Login and Register.
const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="auth">
    <aside className="auth-aside">
      <Brand />
      <div className="auth-aside-body">
        <h2>
          Walk into your next interview <span className="grad-text">already warmed up.</span>
        </h2>
        <ul>
          {POINTS.map((p) => (
            <li key={p}>
              <CheckCircleFilled /> {p}
            </li>
          ))}
        </ul>
      </div>
    </aside>
    <main className="auth-main">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </main>
  </div>
);

export default AuthLayout;
