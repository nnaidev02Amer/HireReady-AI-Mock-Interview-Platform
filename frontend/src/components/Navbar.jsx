import React, { useContext, useState } from "react";
import { Button, Drawer } from "antd";
import {
  AppstoreOutlined,
  CloseOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  PlusOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { AppConfigContext } from "../context/AppConfigContext";
import { clearToken } from "../api/client";
import Brand from "./common/Brand";

const Navbar = ({ setAuth, auth }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const { demoMode } = useContext(AppConfigContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    setAuth(false);
    setOpen(false);
    navigate("/");
  };

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const themeToggle = (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
      title={isDarkMode ? "Light theme" : "Dark theme"}
    >
      {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
    </button>
  );

  const links = auth ? (
    <>
      <NavLink to="/dashboard" className="nav-link">
        <AppstoreOutlined /> Dashboard
      </NavLink>
      <NavLink to="/interview" className="nav-link">
        <PlusOutlined /> New interview
      </NavLink>
    </>
  ) : null;

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to={auth ? "/dashboard" : "/"} className="nav-brand" aria-label="HireReady AI home">
          <Brand />
        </Link>

        <nav className="nav-links" aria-label="Main">
          {links}
        </nav>

        <div className="nav-actions">
          {demoMode && (
            <span
              className="pill pill-demo"
              title="No Gemini API key is configured: questions and feedback are samples"
            >
              Demo mode
            </span>
          )}
          {themeToggle}
          {auth ? (
            <Button className="nav-desktop-only" icon={<LogoutOutlined />} onClick={handleLogout}>
              Log out
            </Button>
          ) : (
            <span className="nav-desktop-only nav-auth">
              <Button type="text" onClick={() => go("/login")}>
                Log in
              </Button>
              <Button type="primary" className="cta" onClick={() => go("/register")}>
                Get started
              </Button>
            </span>
          )}
          <button
            type="button"
            className="icon-btn nav-mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <MenuOutlined />
          </button>
        </div>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        width={300}
        closeIcon={<CloseOutlined aria-label="Close menu" />}
        title={<Brand compact />}
        className="nav-drawer"
      >
        <div className="drawer-links">
          {auth ? (
            <>
              <Button block size="large" icon={<AppstoreOutlined />} onClick={() => go("/dashboard")}>
                Dashboard
              </Button>
              <Button block size="large" type="primary" className="cta" icon={<PlusOutlined />} onClick={() => go("/interview")}>
                New interview
              </Button>
              <Button block size="large" icon={<LogoutOutlined />} onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button block size="large" onClick={() => go("/login")}>
                Log in
              </Button>
              <Button block size="large" type="primary" className="cta" onClick={() => go("/register")}>
                Get started
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </header>
  );
};

export default Navbar;
