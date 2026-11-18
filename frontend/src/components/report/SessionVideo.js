import React, { useEffect, useState } from "react";
import { Spin, Typography } from "antd";
import api from "../../api/client";

// Recordings are protected (JWT required), so a plain <video src> cannot load them.
// Fetch the file through the API client and play it from a temporary blob URL.
const SessionVideo = ({ url }) => {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url.startsWith("/")) {
      setSrc(url); // legacy absolute URL from older sessions
      return undefined;
    }
    let objectUrl;
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    api
      .get(url, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed)
    return <Typography.Text type="secondary">Recording unavailable.</Typography.Text>;
  if (!src) return <Spin size="small" />;
  return <video controls src={src} className="video-player" />;
};

export default SessionVideo;
