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

interface ScoreGaugeProps {
  label: string;
  value: number;
  inverted?: boolean; // For cringe risk where lower is better
}

function ScoreGauge({ label, value, inverted }: ScoreGaugeProps) {
  // For inverted scores (like cringe risk), we show the inverse for the visual
  const displayValue = inverted ? 100 - value : value;
  const isGood = inverted ? value < 40 : value > 60;
  const isBad = inverted ? value > 60 : value < 40;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-tight">
          {label}
        </span>
        <span className={cn(
          "font-mono text-sm font-bold",
          isGood && "text-foreground",
          isBad && "text-accent"
        )}>
          {value}
        </span>
      </div>
      <div className="w-full h-2 bg-muted">
        <div 
          className={cn(
            "h-full transition-all duration-500",
            isGood ? "bg-foreground" : isBad ? "bg-accent" : "bg-muted-foreground"
          )}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreDisplay({ scores, onClose }: ScoreDisplayProps) {
  const overallScore = Math.round(
    (scores.authenticity + scores.vulnerability + scores.credibility + (100 - scores.cringeRisk) + (100 - scores.platformPlay)) / 5
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-xl mx-4">
        <div className="clinical-card space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="font-mono font-bold text-2xl uppercase tracking-tighter-custom">
              STORY ANALYSIS
            </h2>
            <p className="font-mono text-sm text-muted-foreground body-text">
              your truth has been evaluated.
            </p>
          </div>

          {/* Overall Score */}
          <div className="text-center py-8 border-y-2 border-foreground">
            <div className="font-mono text-6xl font-bold tracking-tighter-custom">
              {overallScore}
            </div>
            <div className="font-mono text-xs uppercase text-muted-foreground mt-2">
              OVERALL TRUTH SCORE
            </div>
          </div>

           {/* Individual Scores */}
           <div className="space-y-6">
             <ScoreGauge label="AUTHENTICITY" value={scores.authenticity} />
             <ScoreGauge label="VULNERABILITY" value={scores.vulnerability} />
             <ScoreGauge label="CREDIBILITY" value={scores.credibility} />
             <ScoreGauge label="CRINGE RISK" value={scores.cringeRisk} inverted />
             <ScoreGauge label="PLATFORM PLAY" value={scores.platformPlay} inverted />
           </div>

          {/* Summary */}
          {scores.summary && (
            <div className="border-l-2 border-accent pl-4 py-2">
              <p className="font-mono text-sm body-text">
                {scores.summary}
              </p>
            </div>
          )}

          {/* Status */}
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

          {/* Action */}
          <button
            onClick={onClose}
            className="w-full py-4 border-2 border-foreground font-mono font-bold uppercase hover:bg-foreground hover:text-background transition-colors"
          >
            RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
