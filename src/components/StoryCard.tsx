import { Story, StoryBucket } from "@/types/story";
import { cn } from "@/lib/utils";
import { ArrowRight, FileText } from "lucide-react";

interface StoryCardProps {
  story: Story;
  onClick: () => void;
}

const bucketLabels: Record<StoryBucket, string> = {
  personal: "PERSONAL",
  business: "BUSINESS",
  emotional: "EMOTIONAL",
};

export function StoryCard({ story, onClick }: StoryCardProps) {
  const progressPercent = Math.round((story.currentStep / 12) * 100);

  return (
    <button
      onClick={onClick}
      className="clinical-card text-left w-full group hover:bg-secondary transition-colors"
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="font-mono text-xs uppercase text-muted-foreground">
            {bucketLabels[story.bucket]}
          </span>
          <span className={cn(
            "font-mono text-xs uppercase px-2 py-1 border",
            story.status === 'locked' 
              ? "border-foreground bg-foreground text-background" 
              : "border-muted text-muted-foreground"
          )}>
            {story.status === 'locked' ? 'LOCKED' : 'DRAFT'}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-mono font-bold text-lg uppercase tracking-tighter-custom line-clamp-2">
          {story.title || "UNTITLED STORY"}
        </h3>

        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-muted-foreground">
              STEP {story.currentStep}/12
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-1 bg-muted">
            <div 
              className="h-full bg-foreground transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span className="font-mono text-xs">
              {new Date(story.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }).toUpperCase()}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
}
