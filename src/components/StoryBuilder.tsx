import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceRecordButton } from "./VoiceRecordButton";
import { StepProgress } from "./StepIndicator";
import { StoryCoachNudge } from "./StoryCoachNudge";
import { ScoreDisplay } from "./ScoreDisplay";
import { STORY_STEPS, StoryBucket, StoryScores } from "@/types/story";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface StoryBuilderProps {
  onBack: () => void;
  bucket: StoryBucket;
  storyId?: string;
}

export function StoryBuilder({ onBack, bucket, storyId }: StoryBuilderProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepContent, setStepContent] = useState<Record<number, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbStoryId, setDbStoryId] = useState<string | null>(storyId || null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  
  // Story Coach state
  const [isCheckingAuthenticity, setIsCheckingAuthenticity] = useState(false);
  const [showCoachNudge, setShowCoachNudge] = useState(false);
  const [coachNudgeMessage, setCoachNudgeMessage] = useState<string | undefined>();
  
  // Scoring state
  const [isScoring, setIsScoring] = useState(false);
  const [scores, setScores] = useState<StoryScores & { summary?: string } | null>(null);
  const [showScoreDisplay, setShowScoreDisplay] = useState(false);

  const currentStepConfig = STORY_STEPS[currentStep - 1];
  const currentContent = stepContent[currentStep] || "";
  const canProceed = currentContent.trim().length > 10;
  const isLastStep = currentStep === 12;

  // Create story in database on first content entry (only once)
  useEffect(() => {
    async function createStory() {
      if (!user || dbStoryId || isCreatingStory || Object.keys(stepContent).length === 0) return;
      
      setIsCreatingStory(true);

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          bucket: bucket,
          title: null,
          content_json: stepContent,
          current_step: currentStep,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating story:', error);
        setIsCreatingStory(false);
        toast({
          title: "ERROR",
          description: "Failed to save story",
          variant: "destructive",
        });
      } else if (data) {
        setDbStoryId(data.id);
      }
    }

    createStory();
  }, [stepContent, user, bucket, dbStoryId, currentStep, isCreatingStory]);

  // Auto-save story updates
  const saveStory = useCallback(async () => {
    if (!dbStoryId || !user) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('stories')
      .update({
        title: stepContent[1]?.slice(0, 100) || null,
        content_json: stepContent,
        current_step: currentStep,
      })
      .eq('id', dbStoryId);

    if (error) {
      console.error('Error saving story:', error);
    }
    setIsSaving(false);
  }, [dbStoryId, stepContent, currentStep, user]);

  // Debounced auto-save
  useEffect(() => {
    if (!dbStoryId) return;
    
    const timer = setTimeout(() => {
      saveStory();
    }, 1000);

    return () => clearTimeout(timer);
  }, [stepContent, currentStep, saveStory, dbStoryId]);

  const handleTranscription = useCallback((text: string) => {
    setStepContent(prev => ({
      ...prev,
      [currentStep]: prev[currentStep] ? `${prev[currentStep]} ${text}` : text
    }));
    setIsEditing(true);
  }, [currentStep]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStepContent(prev => ({
      ...prev,
      [currentStep]: e.target.value
    }));
  };

  const checkAuthenticity = async (text: string): Promise<{ needsRefinement: boolean; softNudge?: string }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-authenticity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error(`Authenticity check failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return { needsRefinement: data.needsRefinement, softNudge: data.softNudge };
    } catch (error) {
      console.error("Authenticity check error:", error);
      return { needsRefinement: false };
    }
  };

  const scoreStory = async (): Promise<StoryScores & { summary?: string } | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-story`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ content: stepContent }),
        }
      );

      if (!response.ok) {
        throw new Error(`Scoring failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Scoring error:", error);
      toast({
        title: "SCORING FAILED",
        description: "could not analyze your story. try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleComplete = async () => {
    if (!canProceed || !dbStoryId) return;

    setIsScoring(true);
    
    // Score the story
    const storyScores = await scoreStory();
    
    if (!storyScores) {
      setIsScoring(false);
      return;
    }

    // Save scores and lock the story
    const { error } = await supabase
      .from('stories')
      .update({
        title: stepContent[1]?.slice(0, 100) || null,
        content_json: stepContent,
        current_step: 12,
        status: 'locked',
        scores_json: {
          authenticity: storyScores.authenticity,
          vulnerability: storyScores.vulnerability,
          credibility: storyScores.credibility,
          cringeRisk: storyScores.cringeRisk,
        },
      })
      .eq('id', dbStoryId);

    if (error) {
      console.error('Error locking story:', error);
      toast({
        title: "ERROR",
        description: "Failed to lock story",
        variant: "destructive",
      });
      setIsScoring(false);
      return;
    }

    setScores(storyScores);
    setShowScoreDisplay(true);
    setIsScoring(false);
  };

  const handleNext = async () => {
    if (!canProceed) return;

    // If on last step, handle completion
    if (isLastStep) {
      await handleComplete();
      return;
    }

    // Run coach check on Step 1
    if (currentStep === 1) {
      setIsCheckingAuthenticity(true);
      
      const result = await checkAuthenticity(currentContent);
      
      setIsCheckingAuthenticity(false);
      
      if (result.needsRefinement) {
        setCoachNudgeMessage(result.softNudge);
        setShowCoachNudge(true);
        return;
      }
    }

    // Proceed to next step
    setCurrentStep(prev => prev + 1);
    setIsEditing(false);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setIsEditing(stepContent[currentStep - 1]?.length > 0);
    }
  };

  const handleCoachRevise = () => {
    setShowCoachNudge(false);
    setCoachNudgeMessage(undefined);
  };

  const handleCoachContinue = () => {
    setShowCoachNudge(false);
    setCoachNudgeMessage(undefined);
    // Proceed to next step anyway
    setCurrentStep(prev => prev + 1);
    setIsEditing(false);
  };

  const handleScoreClose = () => {
    setShowScoreDisplay(false);
    onBack();
  };

  const bucketLabel = bucket.toUpperCase();
  const isProcessing = isCheckingAuthenticity || isScoring;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Story Coach Nudge Modal */}
      <StoryCoachNudge 
        isOpen={showCoachNudge}
        onRevise={handleCoachRevise}
        onContinue={handleCoachContinue}
        softNudge={coachNudgeMessage}
      />

      {/* Score Display */}
      {showScoreDisplay && scores && (
        <ScoreDisplay 
          scores={scores}
          onClose={handleScoreClose}
        />
      )}

      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="sanctuary-container flex items-center justify-between">
          <button 
            onClick={onBack}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 font-mono text-sm uppercase hover:text-muted-foreground transition-colors",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            EXIT
          </button>
          
          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="font-mono text-xs text-muted-foreground uppercase">
                SAVING...
              </span>
            )}
            <span className="font-mono text-xs uppercase text-muted-foreground hidden md:block">
              {bucketLabel} STORY
            </span>
            <StepProgress currentStep={currentStep} totalSteps={12} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 sanctuary-container">
        <div className="max-w-3xl mx-auto">
          {/* Step Header */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-muted-foreground">
                STEP {currentStep.toString().padStart(2, '0')}
              </span>
              <div className="flex-1 h-[1px] bg-muted" />
              {isLastStep && (
                <span className="font-mono text-xs uppercase text-accent font-bold">
                  FINAL STEP
                </span>
              )}
            </div>
            <h1 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tighter-custom">
              {currentStepConfig.title}
            </h1>
            <p className="font-mono text-lg text-muted-foreground body-text">
              {currentStepConfig.prompt}
            </p>
          </div>

          {/* Input Area */}
          <div className="space-y-6">
            <VoiceRecordButton 
              onTranscription={handleTranscription}
              disabled={isProcessing}
            />

            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-muted" />
              <span className="font-mono text-xs text-muted-foreground uppercase">
                or type below
              </span>
              <div className="flex-1 h-[1px] bg-muted" />
            </div>

            <div className="relative">
              <textarea
                value={currentContent}
                onChange={handleTextChange}
                onFocus={() => setIsEditing(true)}
                placeholder={currentStepConfig.placeholder}
                disabled={isProcessing}
                className={cn(
                  "clinical-input min-h-[200px] resize-none body-text",
                  "placeholder:text-muted-foreground/50",
                  isProcessing && "opacity-50"
                )}
              />
              {currentContent && (
                <div className="absolute bottom-4 right-4 font-mono text-xs text-muted-foreground">
                  {currentContent.length} chars
                </div>
              )}
            </div>

            {/* Minimum requirement hint */}
            {currentContent.length > 0 && currentContent.length < 11 && (
              <p className="font-mono text-xs text-muted-foreground">
                keep going. minimum 10 characters required.
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t-2 border-foreground">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isProcessing}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              PREVIOUS
            </Button>

            <div className="font-mono text-sm text-muted-foreground hidden md:block">
              {isCheckingAuthenticity ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ANALYZING TRUTH...
                </span>
              ) : isScoring ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SCORING STORY...
                </span>
              ) : (
                `${currentStep}/12`
              )}
            </div>

            <Button
              variant="clinical"
              onClick={handleNext}
              disabled={!canProceed || isProcessing}
              className="gap-2"
            >
              {isCheckingAuthenticity ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CHECKING...
                </>
              ) : isScoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SCORING...
                </>
              ) : isLastStep ? (
                <>
                  <Lock className="w-4 h-4" />
                  LOCK & SCORE
                </>
              ) : (
                <>
                  NEXT
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-muted">
        <div className="sanctuary-container py-4">
          <div className="flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="uppercase">THE SANCTUARY</span>
            <span>•</span>
            <span className="uppercase">DISRUPTUR STORY OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
