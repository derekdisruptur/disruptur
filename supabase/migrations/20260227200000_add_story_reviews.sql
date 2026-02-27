-- Story reviews table for comparing published versions against originals
create table public.story_reviews (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  published_text text not null,
  review_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by story
create index idx_story_reviews_story_id on public.story_reviews(story_id);

-- RLS policies
alter table public.story_reviews enable row level security;

create policy "Users can view their own reviews"
  on public.story_reviews for select
  using (auth.uid() = user_id);

create policy "Users can create their own reviews"
  on public.story_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on public.story_reviews for delete
  using (auth.uid() = user_id);
