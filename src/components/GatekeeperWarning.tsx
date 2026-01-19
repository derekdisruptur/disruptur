import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface GatekeeperWarningProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function GatekeeperWarning({ isOpen, onClose, reason }: GatekeeperWarningProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 border-2 border-accent bg-background gap-0">
        {/* Header */}
        <div className="bg-accent p-6 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-accent-foreground" />
          <DialogTitle className="font-mono font-bold text-xl uppercase tracking-tighter-custom text-accent-foreground">
            TRUTH CHECK FAILED
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <p className="font-mono text-lg uppercase font-bold tracking-tighter-custom">
            THIS READS LIKE CONTENT.
          </p>
          
          <p className="font-mono text-lg uppercase font-bold tracking-tighter-custom">
            REWRITE IT LIKE THE TRUTH.
          </p>

          {reason && (
            <div className="border-l-2 border-accent pl-4 py-2">
              <p className="font-mono text-sm text-muted-foreground uppercase mb-1">
                DETECTED:
              </p>
              <p className="font-mono text-sm body-text">
                {reason}
              </p>
            </div>
          )}

          <div className="pt-4">
            <Button 
              variant="clinical" 
              onClick={onClose}
              className="w-full"
            >
              REVISE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
