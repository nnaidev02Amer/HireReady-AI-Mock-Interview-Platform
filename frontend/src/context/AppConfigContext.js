import React, { createContext, useEffect, useState } from "react";
import api from "../api/client";

// Non-secret server settings, e.g. whether the backend is running in Demo Mode.
export const AppConfigContext = createContext({
  demoMode: false,
  demoReason: "",
  maxVideoSizeMb: 100,
});

export const AppConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    demoMode: false,
    demoReason: "",
    maxVideoSizeMb: 100,
  });

  useEffect(() => {
    api
      .get("/config")
      .then((res) =>
        setConfig({
          demoMode: !!res.data.demo_mode,
          demoReason: res.data.demo_reason || "",
          maxVideoSizeMb: res.data.max_video_size_mb || 100,
        })
      )
      .catch(() => {
        // Backend unreachable: keep defaults. Other requests report the real error.
      });
  }, []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
};
