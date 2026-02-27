import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ReviewDisplay } from "./ReviewDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PublishedReviewResult, StoryReview } from "@/types/story";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface PublishedReviewProps {
  storyId: string;
  onBack: () => void;
}

export function PublishedReview({ storyId, onBack }: PublishedReviewProps) {
  const { user } = useAuth();
  const [publishedText, setPublishedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewResult, setReviewResult] = useState<PublishedReviewResult | null>(null);
  const [originalContent, setOriginalContent] = useState<Record<string, string> | null>(null);
  const [pastReviews, setPastReviews] = useState<StoryReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch story content and past reviews on mount
  useEffect(() => {
    async function fetchData() {
      if (!user || !storyId) return;

      const [storyRes, reviewsRes] = await Promise.all([
        supabase
          .from("stories")
          .select("content_json")
          .eq("id", storyId)
          .single(),
        supabase
          .from("story_reviews")
          .select("*")
          .eq("story_id", storyId)
          .order("created_at", { ascending: false }),
      ]);

      if (storyRes.error) {
        console.error("Error fetching story:", storyRes.error);
        toast({ title: "Error loading story", variant: "destructive" });
      } else if (storyRes.data) {
        setOriginalContent(storyRes.data.content_json as unknown as Record<string, string>);
      }

      if (reviewsRes.error) {
        console.error("Error fetching reviews:", reviewsRes.error);
      } else if (reviewsRes.data) {
        setPastReviews(
          reviewsRes.data.map((r) => ({
            id: r.id,
            storyId: r.story_id,
            userId: r.user_id,
            publishedText: r.published_text,
            review: r.review_json as unknown as PublishedReviewResult,
            createdAt: new Date(r.created_at),
          }))
        );
      }

      setLoading(false);
    }

    fetchData();
  }, [user, storyId]);

  const handleAnalyze = async () => {
    if (!originalContent || !publishedText.trim()) return;

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "review-published-story",
        {
          body: { originalContent, publishedText },
        }
      );

      if (error) throw error;

      const result = data as PublishedReviewResult;
      setReviewResult(result);

      // Save to database
      if (user) {
        const { data: saved, error: saveError } = await supabase
          .from("story_reviews")
          .insert({
            story_id: storyId,
            user_id: user.id,
            published_text: publishedText,
            review_json: data,
          })
          .select()
          .single();

        if (saveError) {
          console.error("Error saving review:", saveError);
        } else if (saved) {
          setPastReviews((prev) => [
            {
              id: saved.id,
              storyId: saved.story_id,
              userId: saved.user_id,
              publishedText: saved.published_text,
              review: saved.review_json as unknown as PublishedReviewResult,
              createdAt: new Date(saved.created_at),
            },
            ...prev,
          ]);
        }
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the published version. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setReviewResult(null);
    setPublishedText("");
  };

  // Results state — show ReviewDisplay ceremony
  if (reviewResult) {
    return (
      <ReviewDisplay
        review={reviewResult}
        onClose={onBack}
        onAnalyzeAnother={handleAnalyzeAnother}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="sanctuary-container flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={isAnalyzing}
            className={cn(
              "flex items-center gap-2 font-mono text-sm uppercase hover:text-muted-foreground transition-colors",
              isAnalyzing && "opacity-50 cursor-not-allowed"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            EXIT
          </button>
          <span className="font-mono text-xs uppercase text-muted-foreground">
            PUBLISHED REVIEW
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 sanctuary-container">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <span className="font-mono text-muted-foreground uppercase">LOADING...</span>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Title + Description */}
            <div className="space-y-3">
              <h2 className="font-mono font-bold text-2xl uppercase tracking-tighter-custom">
                PUBLISHED REVIEW
              </h2>
              <p className="font-mono text-sm text-muted-foreground body-text">
                paste the version you published externally. we'll compare it against your
                original truth and score how much survived.
              </p>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <textarea
                value={publishedText}
                onChange={(e) => setPublishedText(e.target.value)}
                placeholder="paste your published version here..."
                disabled={isAnalyzing}
                className="clinical-input w-full min-h-[300px] resize-y"
              />
              <div className="flex justify-end">
                <span className="font-mono text-xs text-muted-foreground">
                  {publishedText.length} CHARS
                </span>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!publishedText.trim() || isAnalyzing}
              className={cn(
                "w-full py-4 border-2 border-foreground font-mono font-bold uppercase transition-colors",
                publishedText.trim() && !isAnalyzing
                  ? "hover:bg-foreground hover:text-background cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              {isAnalyzing ? (
                <span className="pulse-recording">ANALYZING...</span>
              ) : (
                "ANALYZE"
              )}
            </button>

            {/* Past Reviews */}
            {pastReviews.length > 0 && (
              <div className="space-y-4 pt-8 border-t border-muted">
                <h3 className="font-mono text-xs uppercase text-muted-foreground">
                  PREVIOUS REVIEWS
                </h3>
                {pastReviews.map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setReviewResult(pr.review)}
                    className="clinical-card w-full text-left hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-2xl font-bold tabular-nums">
                          {pr.review.fidelityScore}
                        </span>
                        <div className="space-y-1">
                          <span className="font-mono text-xs uppercase text-muted-foreground block">
                            FIDELITY
                          </span>
                          <span className="font-mono text-xs text-muted-foreground block">
                            {pr.createdAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                        <span>A:{pr.review.authenticity}</span>
                        <span>V:{pr.review.vulnerability}</span>
                        <span>C:{pr.review.credibility}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
