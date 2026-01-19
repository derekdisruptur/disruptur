-- Create enum for story status
CREATE TYPE public.story_status AS ENUM ('draft', 'locked');

-- Create enum for story bucket
CREATE TYPE public.story_bucket AS ENUM ('personal', 'business', 'emotional');

-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  bucket public.story_bucket NOT NULL DEFAULT 'personal',
  status public.story_status NOT NULL DEFAULT 'draft',
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 12),
  content_json JSONB NOT NULL DEFAULT '{}',
  scores_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_memory table for vector embeddings
CREATE TABLE public.brand_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_text TEXT NOT NULL,
  story_source_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media table for story assets
CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can view their own stories"
  ON public.stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for brand_memory
CREATE POLICY "Users can view their own brand memory"
  ON public.brand_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand memory"
  ON public.brand_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand memory"
  ON public.brand_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand memory"
  ON public.brand_memory FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for media (access through story ownership)
CREATE POLICY "Users can view media for their stories"
  ON public.media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = media.story_id 
    AND stories.user_id = auth.uid()
  ));

CREATE POLICY "Users can create media for their stories"
  ON public.media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = media.story_id 
    AND stories.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete media for their stories"
  ON public.media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = media.story_id 
    AND stories.user_id = auth.uid()
  ));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates on stories
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();