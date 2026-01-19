import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceRecordButton } from "./VoiceRecordButton";
import { StepProgress } from "./StepIndicator";
import { STORY_STEPS, StoryBucket } from "@/types/story";
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

  const currentStepConfig = STORY_STEPS[currentStep - 1];
  const currentContent = stepContent[currentStep] || "";
  const canProceed = currentContent.trim().length > 10;

  // Create story in database on first content entry
  useEffect(() => {
    async function createStory() {
      if (!user || dbStoryId || Object.keys(stepContent).length === 0) return;

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          bucket: bucket,
          title: stepContent[1]?.slice(0, 100) || null,
          content_json: stepContent,
          current_step: currentStep,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating story:', error);
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
  }, [stepContent, user, bucket, dbStoryId, currentStep]);

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

  const handleNext = () => {
    if (currentStep < 12 && canProceed) {
      setCurrentStep(prev => prev + 1);
      setIsEditing(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setIsEditing(stepContent[currentStep - 1]?.length > 0);
    }
  };

  const bucketLabel = bucket.toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="sanctuary-container flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 font-mono text-sm uppercase hover:text-muted-foreground transition-colors"
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
              disabled={false}
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
                className={cn(
                  "clinical-input min-h-[200px] resize-none body-text",
                  "placeholder:text-muted-foreground/50"
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
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              PREVIOUS
            </Button>

            <div className="font-mono text-sm text-muted-foreground hidden md:block">
              {currentStep}/12
            </div>

            <Button
              variant="clinical"
              onClick={handleNext}
              disabled={!canProceed || currentStep === 12}
              className="gap-2"
            >
              {currentStep === 12 ? "COMPLETE" : "NEXT"}
              {currentStep < 12 && <ArrowRight className="w-4 h-4" />}
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
