import { useState, useEffect } from "react";
import { Plus, Filter, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { StoryCard } from "./StoryCard";
import { EmptyState } from "./EmptyState";
import { BucketSelector } from "./BucketSelector";
import { StoryBuilder } from "./StoryBuilder";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Story, StoryBucket } from "@/types/story";

type FilterType = 'all' | StoryBucket;

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showBucketSelector, setShowBucketSelector] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<StoryBucket | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch stories from database
  useEffect(() => {
    async function fetchStories() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
      } else if (data) {
        const mappedStories: Story[] = data.map(s => ({
          id: s.id,
          userId: s.user_id,
          title: s.title || '',
          bucket: s.bucket as StoryBucket,
          status: s.status as 'draft' | 'locked',
          currentStep: s.current_step,
          content: s.content_json as unknown as Story['content'],
          scores: s.scores_json as unknown as Story['scores'],
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at),
        }));
        setStories(mappedStories);
      }
      setLoading(false);
    }

    fetchStories();
  }, [user]);

  // Keyboard shortcut for creating a story
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setShowBucketSelector(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredStories = filter === 'all' 
    ? stories 
    : stories.filter(s => s.bucket === filter);

  const handleCreateStory = () => {
    setShowBucketSelector(true);
  };

  const handleBucketSelect = (bucket: StoryBucket) => {
    setSelectedBucket(bucket);
    setShowBucketSelector(false);
  };

  const handleBackFromBuilder = () => {
    setSelectedBucket(null);
    setActiveStoryId(null);
    // Refresh stories
    if (user) {
      supabase
        .from('stories')
        .select('*')
        .order('updated_at', { ascending: false })
        .then(({ data }) => {
          if (data) {
            const mappedStories: Story[] = data.map(s => ({
              id: s.id,
              userId: s.user_id,
              title: s.title || '',
              bucket: s.bucket as StoryBucket,
              status: s.status as 'draft' | 'locked',
              currentStep: s.current_step,
              content: s.content_json as unknown as Story['content'],
              scores: s.scores_json as unknown as Story['scores'],
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at),
            }));
            setStories(mappedStories);
          }
        });
    }
  };

  const handleStoryClick = (story: Story) => {
    setActiveStoryId(story.id);
    setSelectedBucket(story.bucket);
  };

  // Show Story Builder
  if (selectedBucket && !activeStoryId) {
    return <StoryBuilder bucket={selectedBucket} onBack={handleBackFromBuilder} />;
  }

  // Show Bucket Selector
  if (showBucketSelector) {
    return (
      <BucketSelector
        onSelect={handleBucketSelect}
        onClose={() => setShowBucketSelector(false)}
      />
    );
  }

  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'personal', label: 'PERSONAL' },
    { id: 'business', label: 'BUSINESS' },
    { id: 'emotional', label: 'INDUSTRY' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="sanctuary-container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono font-bold text-xl uppercase tracking-tighter-custom">
              DISRUPTUR
            </h1>
            <span className="font-mono text-xs text-muted-foreground uppercase hidden md:block">
              STORY OS
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="clinical"
              size="sm"
              onClick={handleCreateStory}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">NEW STORY</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">EXIT</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 sanctuary-container">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <span className="font-mono text-muted-foreground uppercase">LOADING...</span>
          </div>
        ) : stories.length === 0 ? (
          <EmptyState onCreateStory={handleCreateStory} />
        ) : (
          <div className="space-y-8">
            {/* Filter Bar */}
            <div className="flex items-center gap-2 pb-4 border-b border-muted overflow-x-auto">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`font-mono text-xs uppercase px-3 py-1 border-2 transition-colors flex-shrink-0 ${
                    filter === option.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-muted text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <div className="ml-auto font-mono text-xs text-muted-foreground flex-shrink-0">
                {filteredStories.length} {filteredStories.length === 1 ? 'STORY' : 'STORIES'}
              </div>
            </div>

            {/* Stories Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onClick={() => handleStoryClick(story)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-muted">
        <div className="sanctuary-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-mono text-xs text-muted-foreground uppercase">
              THE TRUTH LEDGER
            </div>
            <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span>v0.1.0</span>
              <span>•</span>
              <span>DIGITAL SANCTUARY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
