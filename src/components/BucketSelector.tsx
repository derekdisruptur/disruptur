import { StoryBucket } from "@/types/story";
import { cn } from "@/lib/utils";
import { User, Briefcase, Heart, X } from "lucide-react";

interface BucketSelectorProps {
  onSelect: (bucket: StoryBucket) => void;
  onClose: () => void;
}

const buckets: { id: StoryBucket; label: string; icon: typeof User; description: string }[] = [
  {
    id: "personal",
    label: "PERSONAL",
    icon: User,
    description: "origin stories, transformations, identity shifts",
  },
  {
    id: "business",
    label: "BUSINESS",
    icon: Briefcase,
    description: "career pivots, failures, breakthroughs, lessons",
  },
  {
    id: "emotional",
    label: "INDUSTRY",
    icon: Heart,
    description: "sector insights, market truths, professional growth",
  },
];

export function BucketSelector({ onSelect, onClose }: BucketSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-8 right-8 p-2 hover:bg-secondary transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-4xl sanctuary-container">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tighter-custom">
            SELECT BUCKET
          </h1>
          <p className="font-mono text-muted-foreground body-text">
            categorize your story before entering the sanctuary.
          </p>
        </div>

        {/* Bucket Grid */}
        <div className="grid md:grid-cols-3 gap-[1px] bg-foreground">
          {buckets.map((bucket) => {
            const Icon = bucket.icon;
            return (
              <button
                key={bucket.id}
                onClick={() => onSelect(bucket.id)}
                className={cn(
                  "bg-background p-8 md:p-12 text-left group",
                  "hover:bg-foreground hover:text-background transition-colors",
                  "flex flex-col gap-6"
                )}
              >
                <Icon className="w-8 h-8" />
                <div className="space-y-2">
                  <h3 className="font-mono font-bold text-xl uppercase tracking-tighter-custom">
                    {bucket.label}
                  </h3>
                  <p className="font-mono text-sm text-muted-foreground group-hover:text-background/70 body-text">
                    {bucket.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <div className="text-center mt-12">
          <p className="font-mono text-xs text-muted-foreground uppercase">
            you can change this later
          </p>
        </div>
      </div>
    </div>
  );
}
