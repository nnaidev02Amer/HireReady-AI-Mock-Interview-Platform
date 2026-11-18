import React from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { formatDate, overallScore, sessionTitle } from "./sessionUtils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const byCompletion = (a, b) =>
  new Date(a.completed_at || a.created_at) - new Date(b.completed_at || b.created_at);

// Score history. AI-analysed scores are the solid line; Demo Mode samples are shown
// separately (dashed, grey) so they are never mistaken for real performance.
const PerformanceChart = ({ sessions, isDarkMode }) => {
  const done = sessions
    .filter((s) => s.status === "completed" && overallScore(s) !== null)
    .sort(byCompletion)
    .slice(-12);

  const isDemo = (s) => s.demo || s.analytics?.demo;
  const realCount = done.filter((s) => !isDemo(s)).length;

  if (done.length < 2) {
    return (
      <div className="chart-empty">
        <p>
          Your score history will appear here after two completed interviews.
          {done.length === 1 && " You have 1 so far."}
        </p>
      </div>
    );
  }

  const tick = isDarkMode ? "#a3aecb" : "#4b5878";
  const grid = isDarkMode ? "rgba(148,163,255,0.12)" : "rgba(16,25,53,0.08)";
  const summary = `Score history for ${done.length} interviews: ${done
    .map((s) => `${overallScore(s)}${isDemo(s) ? " (demo sample)" : ""}`)
    .join(", ")}.`;

  return (
    <div className="chart-wrap" role="img" aria-label={summary}>
      <Line
        data={{
          labels: done.map((s) => formatDate(s.completed_at || s.created_at)),
          datasets: [
            {
              label: "AI-analysed",
              data: done.map((s) => (isDemo(s) ? null : overallScore(s))),
              borderColor: "#7c5cff",
              backgroundColor: "rgba(124,92,255,0.16)",
              pointBackgroundColor: "#22d3ee",
              pointBorderColor: "#7c5cff",
              pointRadius: 5,
              fill: true,
              tension: 0.35,
              spanGaps: true,
            },
            {
              label: "Demo samples",
              data: done.map((s) => (isDemo(s) ? overallScore(s) : null)),
              borderColor: isDarkMode ? "#7d89a8" : "#8b97b5",
              borderDash: [5, 5],
              pointStyle: "rectRot",
              pointRadius: 7,
              pointBorderWidth: 2,
              pointBackgroundColor: isDarkMode ? "rgba(163,174,203,0.35)" : "rgba(75,88,120,0.3)",
              showLine: false,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "nearest", intersect: false },
          plugins: {
            legend: {
              display: realCount > 0 && realCount < done.length,
              labels: { color: tick, usePointStyle: true, boxWidth: 8 },
            },
            tooltip: {
              callbacks: {
                title: (items) => sessionTitle(done[items[0].dataIndex]),
                label: (item) => `${item.dataset.label}: ${item.formattedValue}`,
              },
            },
          },
          scales: {
            y: { min: 0, max: 100, ticks: { color: tick, stepSize: 25 }, grid: { color: grid }, border: { display: false } },
            x: { ticks: { color: tick }, grid: { display: false }, border: { display: false } },
          },
        }}
      />
    </div>
  );
};

export default PerformanceChart;
