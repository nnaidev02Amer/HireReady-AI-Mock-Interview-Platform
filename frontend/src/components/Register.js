import React, { useState } from "react";
import { Alert, Button, Form, Input, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import AuthLayout from "./AuthLayout";

// Real, local strength hint (length and character variety), not a security guarantee.
const strength = (pw = "") => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return pw ? Math.max(1, score) : 0;
};
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const level = strength(password);

  const onFinish = async (values) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register", {
        email: values.email,
        password: values.password,
      });
      message.success("Account created. Please log in.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(getErrorMessage(err, "Registration failed"));
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a few seconds. Then set up your first interview."
      footer={
        <>
          Already registered? <Link to="/login">Log in</Link>
        </>
      }
    >
      {error && <Alert type="error" showIcon message={error} role="alert" className="auth-alert" />}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large" onValuesChange={() => error && setError(null)}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" autoComplete="email" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Please input your password!" },
            { min: 8, message: "Password must be at least 8 characters" },
          ]}
          extra={
            password ? (
              <span className="strength" aria-live="polite">
                <span className="strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <i key={n} className={n <= level ? `on on-${level}` : ""} />
                  ))}
                </span>
                {STRENGTH_LABELS[level]}
              </span>
            ) : (
              "At least 8 characters."
            )
          }
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block className="cta">
          Create account
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default Register;
