import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceRecordButton } from "./VoiceRecordButton";
import { StepProgress } from "./StepIndicator";
import { StoryCoachNudge } from "./StoryCoachNudge";
import { ScoreDisplay } from "./ScoreDisplay";
import { InspirationImageUpload } from "./InspirationImageUpload";
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
  const hasSparkStep = bucket === 'personal' || bucket === 'business' || bucket === 'emotional';
  const [currentStep, setCurrentStep] = useState(hasSparkStep ? 0 : 1);
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

  const [inspirationImageUrl, setInspirationImageUrl] = useState<string | null>(null);
  const [inspirationText, setInspirationText] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(!!storyId);

  const isInspirationStep = currentStep === 0;
  const currentStepConfig = isInspirationStep ? null : STORY_STEPS[currentStep - 1];
  const currentContent = stepContent[currentStep] || "";
  const canProceed = isInspirationStep ? true : currentContent.trim().length > 10;
  const isLastStep = currentStep === 12;

  // Load existing draft from database
  useEffect(() => {
    async function loadDraft() {
      if (!storyId || !user) return;

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (error) {
        console.error('Error loading draft:', error);
        toast({
          title: "ERROR",
          description: "Failed to load draft",
          variant: "destructive",
        });
      } else if (data) {
        const content = data.content_json as Record<string, string> | null;
        if (content && typeof content === 'object') {
          // Convert string keys back to number keys
          const numbered: Record<number, string> = {};
          for (const [key, value] of Object.entries(content)) {
            numbered[Number(key)] = value as string;
          }
          setStepContent(numbered);
        }
        setCurrentStep(data.current_step);
        setDbStoryId(data.id);
        setIsEditing(true);
        if (data.inspiration_image_url) {
          setInspirationImageUrl(data.inspiration_image_url);
        }
        if ((data as any).inspiration_text) {
          setInspirationText((data as any).inspiration_text);
        }
      }
      setIsLoadingDraft(false);
    }

    loadDraft();
  }, [storyId, user]);

  // Create story in database on first content entry (only once)
  useEffect(() => {
    async function createStory() {
      if (!user || dbStoryId || isCreatingStory || (Object.keys(stepContent).length === 0 && !inspirationText && !inspirationImageUrl)) return;
      
      setIsCreatingStory(true);

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          bucket: bucket,
          title: null,
          content_json: stepContent,
          current_step: currentStep,
          inspiration_image_url: inspirationImageUrl,
          inspiration_text: inspirationText,
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
  }, [stepContent, user, bucket, dbStoryId, currentStep, isCreatingStory, inspirationText, inspirationImageUrl]);

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
        inspiration_image_url: inspirationImageUrl,
        inspiration_text: inspirationText,
      })
      .eq('id', dbStoryId);

    if (error) {
      console.error('Error saving story:', error);
    }
    setIsSaving(false);
  }, [dbStoryId, stepContent, currentStep, user, inspirationImageUrl, inspirationText]);

  // Debounced auto-save
  useEffect(() => {
    if (!dbStoryId) return;
    
    const timer = setTimeout(() => {
      saveStory();
    }, 1000);

    return () => clearTimeout(timer);
  }, [stepContent, currentStep, saveStory, dbStoryId, inspirationImageUrl]);

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

  const checkAuthenticity = async (text: string, step: number): Promise<{ needsRefinement: boolean; hookDetected?: boolean; ctaDetected?: boolean; softNudge?: string }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-authenticity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, step }),
        }
      );

      if (!response.ok) {
        throw new Error(`Authenticity check failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return { needsRefinement: data.needsRefinement, hookDetected: data.hookDetected, ctaDetected: data.ctaDetected, softNudge: data.softNudge };
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

  const sendRecapEmail = async (
    storyScores: StoryScores & { summary?: string },
  ) => {
    if (!user?.email) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-recap-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email: user.email,
            scores: storyScores,
            content: stepContent,
            bucket,
          }),
        }
      );

      if (!response.ok) {
        console.error("Recap email failed:", response.status);
      }
    } catch (error) {
      console.error("Recap email error:", error);
    }
  };

  const handleComplete = async () => {
    if (!canProceed || !dbStoryId) return;

    // Check if story is already locked to prevent duplicate submissions
    try {
      const { data: freshStory, error: fetchError } = await supabase
        .from('stories')
        .select('status')
        .eq('id', dbStoryId)
        .single();

      if (fetchError) {
        console.error('Error fetching story status:', fetchError);
      }

      if (freshStory?.status === 'locked') {
        toast({
          title: "ALREADY LOCKED",
          description: "this story has already been scored and locked.",
        });
        return;
      }
    } catch (err) {
      console.error('Status check error:', err);
      // Continue anyway - don't block on status check failure
    }

    setIsScoring(true);
    
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
          platformPlay: storyScores.platformPlay,
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

    // Send recap email (fire-and-forget, don't block the UI)
    sendRecapEmail(storyScores);

    setScores(storyScores);
    setShowScoreDisplay(true);
    setIsScoring(false);
  };

  const handleNext = async () => {
    if (!canProceed) return;

    // Inspiration step (step 0) - just proceed, no checks
    if (isInspirationStep) {
      setCurrentStep(1);
      setIsEditing(false);
      return;
    }

    // If on last step, handle completion
    if (isLastStep) {
      await handleComplete();
      return;
    }

    // Run coach check on every step
    setIsCheckingAuthenticity(true);
    
    const result = await checkAuthenticity(currentContent, currentStep);
    
    setIsCheckingAuthenticity(false);

    // Show non-blocking warning for hooks/CTAs
    if (result.hookDetected || result.ctaDetected) {
      const warnings = [
        result.hookDetected && "hook detected",
        result.ctaDetected && "call to action detected",
      ].filter(Boolean).join(" & ");
      toast({
        title: warnings.toUpperCase(),
        description: "this will significantly hurt your final score. consider removing it.",
      });
    }
    
    // Only block on step 1 for authenticity refinement
    if (currentStep === 1 && result.needsRefinement) {
      setCoachNudgeMessage(result.softNudge);
      setShowCoachNudge(true);
      return;
    }

    // Proceed to next step
    setCurrentStep(prev => prev + 1);
    setIsEditing(false);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      if (currentStep - 1 > 0) {
        setIsEditing(stepContent[currentStep - 1]?.length > 0);
      }
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

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-muted-foreground uppercase flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          LOADING DRAFT...
        </span>
      </div>
    );
  }

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
          {isInspirationStep ? (
            <>
              {/* Inspiration Pre-Step */}
              <div className="mb-12 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-muted-foreground">
                    BEFORE WE BEGIN
                  </span>
                  <div className="flex-1 h-[1px] bg-muted" />
                </div>
                <h1 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tighter-custom">
                  THE SPARK
                </h1>
                <p className="font-mono text-lg text-muted-foreground body-text">
                  what inspired this story? was it a song? a movie? a person in your life? something that happened at work?
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="font-mono text-xs uppercase text-muted-foreground">
                    DESCRIBE YOUR INSPIRATION
                  </label>
                  <textarea
                    value={inspirationText}
                    onChange={(e) => setInspirationText(e.target.value)}
                    placeholder="a conversation i overheard, a lyric that wouldn't leave my head, the look on someone's face..."
                    className={cn(
                      "clinical-input min-h-[120px] resize-none body-text",
                      "placeholder:text-muted-foreground/50"
                    )}
                  />
                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    THIS IS JUST FOR YOU. IT WON'T BE SCORED.
                  </p>
                </div>

                <InspirationImageUpload
                  imageUrl={inspirationImageUrl}
                  onImageChange={setInspirationImageUrl}
                  disabled={false}
                />
              </div>
            </>
          ) : (
            <>
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
                  {currentStepConfig!.title}
                </h1>
                <p className="font-mono text-lg text-muted-foreground body-text">
                  {currentStepConfig!.prompt}
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
                    placeholder={currentStepConfig!.placeholder}
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
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t-2 border-foreground">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={(hasSparkStep ? currentStep === 0 : currentStep === 1) || isProcessing}
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
              ) : isInspirationStep ? (
                "SET THE TABLE"
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
              ) : isInspirationStep ? (
                <>
                  BEGIN
                  <ArrowRight className="w-4 h-4" />
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
