import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PublishedReviewResult } from "@/types/story";

interface ReviewDisplayProps {
  review: PublishedReviewResult;
  onClose: () => void;
  onAnalyzeAnother: () => void;
}

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

function FlaggedSection({ title, examples }: { title: string; examples: string[] }) {
  if (!examples || examples.length === 0) return null;
  return (
    <div className="space-y-2">
      <span className="font-mono text-xs uppercase tracking-tight text-accent">
        {title}
      </span>
      {examples.map((text, i) => (
        <div
          key={i}
          className="border-l-2 border-accent pl-3 py-1"
        >
          <p className="font-mono text-sm body-text italic">"{text}"</p>
        </div>
      ))}
    </div>
  );
}

/*
 * Ceremony phases:
 *
 *  0  (0.0s)  Dark screen, "ANALYZING PUBLISHED VERSION" pulse
 *  1  (1.5s)  Header reveal — "PUBLISHED REVIEW"
 *  2  (2.6s)  Authenticity
 *  3  (3.8s)  Vulnerability
 *  4  (5.0s)  Credibility
 *  5  (6.2s)  Cringe Risk
 *  6  (7.4s)  Platform Play
 *  7  (9.0s)  Fidelity score (big number)
 *  8  (11.0s) Flagged evidence + summary
 *  9  (12.5s) Action buttons
 */

export function ReviewDisplay({ review, onClose, onAnalyzeAnother }: ReviewDisplayProps) {
  const [phase, setPhase] = useState(0);

  const animatedFidelity = useCountUp(review.fidelityScore, 1200, phase >= 7);

  useEffect(() => {
    const delays = [0, 1500, 2600, 3800, 5000, 6200, 7400, 9000, 11000, 12500];
    const timers: ReturnType<typeof setTimeout>[] = [];

    delays.forEach((delay, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => setPhase(i), delay));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const fidelityVerdict =
    review.fidelityScore >= 80
      ? "YOUR TRUTH SURVIVED."
      : review.fidelityScore >= 60
        ? "MOSTLY INTACT. MINOR DRIFT."
        : review.fidelityScore >= 40
          ? "THE TRUTH GOT POLISHED."
          : "THE TRUTH DIDN'T MAKE IT.";

  const hasFlags =
    (review.hookExamples?.length > 0) ||
    (review.ctaExamples?.length > 0) ||
    (review.marketingExamples?.length > 0) ||
    (review.credibilityRiskExamples?.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-y-auto">
      {/* Phase 0 — Analyzing pulse */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          phase >= 1 ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <span className="font-mono text-sm uppercase tracking-widest text-muted-foreground pulse-recording">
          ANALYZING PUBLISHED VERSION
        </span>
      </div>

      {/* Main reveal container */}
      <div
        className={cn(
          "w-full max-w-xl mx-4 my-8 transition-all duration-700",
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
              PUBLISHED REVIEW
            </h2>
            <p className="font-mono text-sm text-muted-foreground body-text">
              how your truth fared in the wild.
            </p>
          </div>

          {/* Phases 2–6 — Individual scores */}
          <div className="space-y-6">
            <RevealScore
              label="AUTHENTICITY"
              value={review.authenticity}
              active={phase >= 2}
              verdict={getVerdict("authenticity", review.authenticity)}
            />
            <RevealScore
              label="VULNERABILITY"
              value={review.vulnerability}
              active={phase >= 3}
              verdict={getVerdict("vulnerability", review.vulnerability)}
            />
            <RevealScore
              label="CREDIBILITY"
              value={review.credibility}
              active={phase >= 4}
              verdict={getVerdict("credibility", review.credibility)}
            />
            <RevealScore
              label="CRINGE RISK"
              value={review.cringeRisk}
              inverted
              active={phase >= 5}
              verdict={getVerdict("cringe", review.cringeRisk, true)}
            />
            <RevealScore
              label="PLATFORM PLAY"
              value={review.platformPlay}
              inverted
              active={phase >= 6}
              verdict={getVerdict("platform", review.platformPlay, true)}
            />
          </div>

          {/* Phase 7 — Fidelity score */}
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
              {animatedFidelity}
            </div>
            <div className="font-mono text-xs uppercase text-muted-foreground mt-3">
              FIDELITY SCORE
            </div>
            <div
              className={cn(
                "font-mono text-sm uppercase tracking-wider mt-4 transition-opacity duration-700 delay-500",
                phase >= 7 ? "opacity-100" : "opacity-0"
              )}
            >
              {fidelityVerdict}
            </div>
          </div>

          {/* Phase 8 — Flagged evidence + summary */}
          <div
            className={cn(
              "transition-all duration-700 space-y-6",
              phase >= 8 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {review.summary && (
              <div className="border-l-2 border-accent pl-4 py-2">
                <p className="font-mono text-sm body-text">{review.summary}</p>
              </div>
            )}

            {hasFlags && (
              <div className="space-y-4">
                <FlaggedSection title="HOOKS DETECTED" examples={review.hookExamples} />
                <FlaggedSection title="CALLS TO ACTION" examples={review.ctaExamples} />
                <FlaggedSection title="MARKETING LANGUAGE" examples={review.marketingExamples} />
                <FlaggedSection title="CREDIBILITY RISKS" examples={review.credibilityRiskExamples} />
              </div>
            )}
          </div>

          {/* Phase 9 — Action buttons */}
          <div
            className={cn(
              "space-y-3 transition-all duration-700",
              phase >= 9 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <button
              onClick={onAnalyzeAnother}
              disabled={phase < 9}
              className={cn(
                "w-full py-4 border-2 border-foreground font-mono font-bold uppercase transition-colors",
                phase >= 9
                  ? "hover:bg-foreground hover:text-background cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              ANALYZE ANOTHER VERSION
            </button>
            <button
              onClick={onClose}
              disabled={phase < 9}
              className={cn(
                "w-full py-3 border-2 border-muted font-mono text-sm uppercase text-muted-foreground transition-colors",
                phase >= 9
                  ? "hover:border-foreground hover:text-foreground cursor-pointer"
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
