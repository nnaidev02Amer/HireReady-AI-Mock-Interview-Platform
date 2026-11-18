import React, { useContext, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ConfigProvider, message } from "antd";
import Landing from "./components/Landing";
import Login from "./components/Login";
import Register from "./components/Register";
import Interview from "./components/Interview";
import Dashboard from "./components/Dashboard";
import Report from "./components/Report";
import Navbar from "./components/Navbar";
import { getToken, setUnauthorizedHandler } from "./api/client";
import { ThemeContext } from "./context/ThemeContext";
import { getAntdTheme } from "./theme/antdTheme";

// New page = start at the top.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => {
  const [auth, setAuth] = useState(!!getToken());
  const { isDarkMode } = useContext(ThemeContext);

  // Any API call that comes back 401 (e.g. expired token) logs the user out here;
  // the route guards below then redirect to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuth(false);
      message.warning("Your session has expired. Please log in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const guard = (element) => (auth ? element : <Navigate to="/login" />);
  const guestOnly = (element) => (auth ? <Navigate to="/dashboard" /> : element);

  return (
    <ConfigProvider theme={getAntdTheme(isDarkMode)}>
      <Router>
        <ScrollToTop />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Navbar setAuth={setAuth} auth={auth} />
        <main id="main" className="app-main">
          <Routes>
            <Route path="/" element={auth ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="/login" element={guestOnly(<Login setAuth={setAuth} />)} />
            <Route path="/register" element={guestOnly(<Register setAuth={setAuth} />)} />
            <Route path="/interview" element={guard(<Interview />)} />
            <Route path="/dashboard" element={guard(<Dashboard />)} />
            <Route path="/sessions/:id/report" element={guard(<Report />)} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </Router>
    </ConfigProvider>
  );
};

export default App;
