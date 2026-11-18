import React from "react";
import { ArrowDownOutlined, ArrowUpOutlined, InfoCircleOutlined } from "@ant-design/icons";
import ScoreRing from "../common/ScoreRing";
import { verdict } from "./sessionUtils";

// Readiness = average of the latest real AI-analysed scores. Demo samples never count.
const ReadinessCard = ({ readiness, hasDemoOnly }) => {
  const { score, basedOn, delta } = readiness;
  const has = score !== null;
  const v = has ? verdict(score) : null;

  return (
    <section className="panel readiness" aria-labelledby="readiness-title">
      <span className="eyebrow" id="readiness-title">
        Interview readiness
      </span>
      <div className="readiness-body">
        <ScoreRing value={score} size={132} stroke={11} label={has ? "of 100" : "no data"} />
        <div>
          {has ? (
            <>
              <strong className={`tone-${v.tone}`}>{v.label}</strong>
              <p className="muted small">
                Average of your last {basedOn} AI-analysed interview{basedOn === 1 ? "" : "s"}.
              </p>
              {delta !== null && delta !== 0 && (
                <span className={`delta ${delta > 0 ? "up" : "down"}`}>
                  {delta > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(delta)} vs the 3 before
                </span>
              )}
            </>
          ) : (
            <>
              <strong>Not enough data yet</strong>
              <p className="muted small">
                {hasDemoOnly
                  ? "Your completed interviews are Demo Mode samples, which don't count toward readiness."
                  : "Complete an interview with AI analysis to see your readiness."}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="note">
        <InfoCircleOutlined /> Only real AI analyses are counted.
      </p>
    </section>
  );
};

export default ReadinessCard;
