import { Plus } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  onCreateStory: () => void;
}

export function EmptyState({ onCreateStory }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4">
        <h2 className="font-mono font-bold text-2xl md:text-3xl uppercase tracking-tighter-custom">
          NO STORIES DETECTED.
        </h2>
        <p className="font-mono text-lg uppercase tracking-tighter-custom text-muted-foreground">
          BEGIN LOG.
        </p>
      </div>
      
      <Button
        variant="clinical"
        size="lg"
        onClick={onCreateStory}
        className="gap-3"
      >
        <Plus className="w-5 h-5" />
        CREATE FIRST STORY
      </Button>

      <div className="flex items-center gap-4 mt-8">
        <div className="w-16 h-[1px] bg-muted" />
        <span className="font-mono text-xs text-muted-foreground uppercase">
          or press S
        </span>
        <div className="w-16 h-[1px] bg-muted" />
      </div>
    </div>
  );
}
