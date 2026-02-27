import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  scores: {
    authenticity: number;
    vulnerability: number;
    credibility: number;
    cringeRisk: number;
    platformPlay: number;
    summary?: string;
  };
  onClose: () => void;
}

// Eased count-up hook
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value;
}

interface RevealScoreProps {
  label: string;
  value: number;
  inverted?: boolean;
  active: boolean;
  verdict?: string;
}

function RevealScore({ label, value, inverted, active, verdict }: RevealScoreProps) {
  const displayValue = inverted ? 100 - value : value;
  const isGood = inverted ? value < 40 : value > 60;
  const isBad = inverted ? value > 60 : value < 40;
  const animatedValue = useCountUp(value, 800, active);
  const animatedBarWidth = useCountUp(displayValue, 800, active);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-tight">
            {label}
          </span>
          {active && verdict && (
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider transition-opacity duration-500 delay-500",
                active ? "opacity-60" : "opacity-0"
              )}
            >
              {verdict}
            </span>
          )}
        </div>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            isGood && "text-foreground",
            isBad && "text-accent"
          )}
        >
          {animatedValue}
        </span>
      </div>
      <div className="w-full h-2 bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-800 ease-out",
            isGood ? "bg-foreground" : isBad ? "bg-accent" : "bg-muted-foreground"
          )}
          style={{ width: `${animatedBarWidth}%` }}
        />
      </div>
    </div>
  );
}

function getVerdict(label: string, value: number, inverted?: boolean): string {
  if (inverted) {
    if (value <= 20) return "clean";
    if (value <= 40) return "minimal";
    if (value <= 60) return "present";
    if (value <= 80) return "heavy";
    return "saturated";
  }
  if (value >= 80) return "exceptional";
  if (value >= 60) return "strong";
  if (value >= 40) return "moderate";
  if (value >= 20) return "weak";
  return "absent";
}

/*
 * Ceremony phases (approximate timing):
 *
 *  0  (0.0s)  Dark screen, "EVALUATING YOUR TRUTH" pulse
 *  1  (1.5s)  Header reveal — "STORY ANALYSIS"
 *  2  (2.6s)  Authenticity
 *  3  (3.8s)  Vulnerability
 *  4  (5.0s)  Credibility
 *  5  (6.2s)  Cringe Risk
 *  6  (7.4s)  Platform Play
 *  7  (9.0s)  Overall score (big number, count-up)
 *  8  (11.0s) Summary text + LOCKED badge
 *  9  (12.5s) Return button
 */

export function ScoreDisplay({ scores, onClose }: ScoreDisplayProps) {
  const [phase, setPhase] = useState(0);

  const overallScore = Math.round(
    (scores.authenticity +
      scores.vulnerability +
      scores.credibility +
      (100 - scores.cringeRisk) +
      (100 - scores.platformPlay)) /
      5
  );

  const animatedOverall = useCountUp(overallScore, 1200, phase >= 7);

  // Phase scheduler
  useEffect(() => {
    const delays = [
      0,     // phase 0 — immediate
      1500,  // phase 1 — header
      2600,  // phase 2 — authenticity
      3800,  // phase 3 — vulnerability
      5000,  // phase 4 — credibility
      6200,  // phase 5 — cringe risk
      7400,  // phase 6 — platform play
      9000,  // phase 7 — overall score
      11000, // phase 8 — summary + locked
      12500, // phase 9 — return button
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    delays.forEach((delay, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => setPhase(i), delay));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Determine overall verdict
  const overallVerdict =
    overallScore >= 80
      ? "YOUR TRUTH RUNS DEEP."
      : overallScore >= 60
        ? "THERE'S REAL TRUTH HERE."
        : overallScore >= 40
          ? "THE SURFACE HAS BEEN SCRATCHED."
          : "THE MASK IS STILL ON.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Phase 0 — Evaluating pulse */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          phase >= 1 ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <span className="font-mono text-sm uppercase tracking-widest text-muted-foreground pulse-recording">
          EVALUATING YOUR TRUTH
        </span>
      </div>

      {/* Main reveal container */}
      <div
        className={cn(
          "w-full max-w-xl mx-4 transition-all duration-700",
          phase >= 1 ? "opacity-100" : "opacity-0 scale-95"
        )}
      >
        <div className="clinical-card space-y-8">
          {/* Phase 1 — Header */}
          <div
            className={cn(
              "text-center space-y-2 transition-all duration-700",
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <h2 className="font-mono font-bold text-2xl uppercase tracking-tighter-custom">
              STORY ANALYSIS
            </h2>
            <p className="font-mono text-sm text-muted-foreground body-text">
              your truth has been evaluated.
            </p>
          </div>

          {/* Phases 2–6 — Individual scores */}
          <div className="space-y-6">
            <RevealScore
              label="AUTHENTICITY"
              value={scores.authenticity}
              active={phase >= 2}
              verdict={getVerdict("authenticity", scores.authenticity)}
            />
            <RevealScore
              label="VULNERABILITY"
              value={scores.vulnerability}
              active={phase >= 3}
              verdict={getVerdict("vulnerability", scores.vulnerability)}
            />
            <RevealScore
              label="CREDIBILITY"
              value={scores.credibility}
              active={phase >= 4}
              verdict={getVerdict("credibility", scores.credibility)}
            />
            <RevealScore
              label="CRINGE RISK"
              value={scores.cringeRisk}
              inverted
              active={phase >= 5}
              verdict={getVerdict("cringe", scores.cringeRisk, true)}
            />
            <RevealScore
              label="PLATFORM PLAY"
              value={scores.platformPlay}
              inverted
              active={phase >= 6}
              verdict={getVerdict("platform", scores.platformPlay, true)}
            />
          </div>

          {/* Phase 7 — Overall score */}
          <div
            className={cn(
              "text-center py-8 border-y-2 border-foreground transition-all duration-700",
              phase >= 7
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
          >
            <div
              className={cn(
                "font-mono text-7xl font-bold tracking-tighter-custom transition-transform duration-300",
                phase === 7 && "score-land"
              )}
            >
              {animatedOverall}
            </div>
            <div className="font-mono text-xs uppercase text-muted-foreground mt-3">
              OVERALL TRUTH SCORE
            </div>
            <div
              className={cn(
                "font-mono text-sm uppercase tracking-wider mt-4 transition-opacity duration-700 delay-500",
                phase >= 7 ? "opacity-100" : "opacity-0"
              )}
            >
              {overallVerdict}
            </div>
          </div>

          {/* Phase 8 — Summary + Locked */}
          <div
            className={cn(
              "transition-all duration-700",
              phase >= 8 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {scores.summary && (
              <div className="border-l-2 border-accent pl-4 py-2 mb-6">
                <p className="font-mono text-sm body-text">{scores.summary}</p>
              </div>
            )}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background">
                <span className="font-mono text-sm uppercase font-bold">
                  STORY LOCKED
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground body-text">
                this story is now preserved in its current form.
              </p>
            </div>
          </div>

          {/* Phase 9 — Return button */}
          <div
            className={cn(
              "transition-all duration-700",
              phase >= 9 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <button
              onClick={onClose}
              disabled={phase < 9}
              className={cn(
                "w-full py-4 border-2 border-foreground font-mono font-bold uppercase transition-colors",
                phase >= 9
                  ? "hover:bg-foreground hover:text-background cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
