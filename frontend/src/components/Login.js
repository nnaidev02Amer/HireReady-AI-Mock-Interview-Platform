import React, { useState } from "react";
import { Alert, Button, Form, Input, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage, setToken } from "../api/client";
import AuthLayout from "./AuthLayout";

const Login = ({ setAuth }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await api.post("/auth/token", formData);
      setToken(response.data.access_token);
      setAuth(true);
      message.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(getErrorMessage(err, "Login failed"));
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your interview practice."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
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
        <Form.Item label="Password" name="password" rules={[{ required: true, message: "Please enter your password" }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block className="cta">
          Log in
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default Login;
