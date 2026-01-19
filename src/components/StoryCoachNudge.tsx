import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface StoryCoachNudgeProps {
  isOpen: boolean;
  onRevise: () => void;
  onContinue: () => void;
  softNudge?: string;
}

export function StoryCoachNudge({ isOpen, onRevise, onContinue, softNudge }: StoryCoachNudgeProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onRevise}>
      <DialogContent className="max-w-lg p-0 border-2 border-primary bg-background gap-0">
        {/* Header */}
        <div className="bg-primary/10 p-6 flex items-center gap-4">
          <Lightbulb className="w-8 h-8 text-primary" />
          <DialogTitle className="font-mono font-bold text-xl uppercase tracking-tighter-custom text-foreground">
            A MOMENT TO REFLECT
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {softNudge ? (
            <p className="font-mono text-lg body-text leading-relaxed">
              {softNudge}
            </p>
          ) : (
            <p className="font-mono text-lg body-text leading-relaxed">
              This might be worth another look. Can you dig a little deeper?
            </p>
          )}

          <p className="font-mono text-sm text-muted-foreground">
            You can revise your answer or continue if this feels right to you.
          </p>

          <div className="pt-4 flex gap-3">
            <Button 
              variant="outline" 
              onClick={onContinue}
              className="flex-1"
            >
              CONTINUE ANYWAY
            </Button>
            <Button 
              variant="clinical" 
              onClick={onRevise}
              className="flex-1"
            >
              REVISE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
