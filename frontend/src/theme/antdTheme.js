import { theme } from "antd";

// antd tokens that match the CSS design tokens in index.css.
const shared = {
  colorPrimary: "#7c5cff",
  colorInfo: "#22d3ee",
  colorSuccess: "#34d399",
  colorWarning: "#fbbf24",
  colorError: "#f87171",
  borderRadius: 10,
  fontFamily:
    '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
  controlHeight: 38,
  controlHeightLG: 46,
};

export const getAntdTheme = (isDark) =>
  isDark
    ? {
        algorithm: theme.darkAlgorithm,
        token: {
          ...shared,
          colorBgBase: "#0b1020",
          colorBgContainer: "#121a2e",
          colorBgElevated: "#18223a",
          colorBorder: "rgba(148, 163, 255, 0.2)",
          colorBorderSecondary: "rgba(148, 163, 255, 0.12)",
          colorText: "#e8ecf8",
          colorTextSecondary: "#a3aecb",
          colorTextTertiary: "#7d89a8",
        },
      }
    : {
        algorithm: theme.defaultAlgorithm,
        token: {
          ...shared,
          colorPrimary: "#6a46ff",
          colorBgBase: "#f4f6fc",
          colorBgContainer: "#ffffff",
          colorBorder: "#d9dfef",
          colorBorderSecondary: "#e6eaf5",
          colorText: "#101935",
          colorTextSecondary: "#4b5878",
          colorTextTertiary: "#6b7899",
        },
      };
