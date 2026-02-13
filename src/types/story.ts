export type StoryBucket = 'personal' | 'business' | 'emotional';

export type StoryStatus = 'draft' | 'locked';

export interface StoryScores {
  authenticity: number;
  vulnerability: number;
  credibility: number;
  cringeRisk: number;
  platformPlay: number;
}

export interface Story {
  id: string;
  userId: string;
  title: string;
  bucket: StoryBucket;
  status: StoryStatus;
  currentStep: number;
  content: StoryContent;
  scores?: StoryScores;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryContent {
  step1?: string; // What's the story about?
  step2?: string;
  step3?: string;
  step4?: string;
  step5?: string;
  step6?: string;
  step7?: string;
  step8?: string;
  step9?: string;
  step10?: string;
  step11?: string;
  step12?: string;
}

export interface StepConfig {
  number: number;
  title: string;
  prompt: string;
  placeholder: string;
}

export const STORY_STEPS: StepConfig[] = [
  {
    number: 1,
    title: "THE MOMENT",
    prompt: "describe a specific moment that changed everything. not a period of time. one moment.",
    placeholder: "i was standing in...",
  },
  {
    number: 2,
    title: "THE CONTEXT",
    prompt: "what was happening in your life before this moment? paint the scene.",
    placeholder: "at that time in my life...",
  },
  {
    number: 3,
    title: "WHAT HAPPENED",
    prompt: "what exactly happened? facts only. no interpretation yet.",
    placeholder: "then...",
  },
  {
    number: 4,
    title: "THE FEELING",
    prompt: "what did you feel in your body? not what you thought. what you felt.",
    placeholder: "my chest felt...",
  },
  {
    number: 5,
    title: "THE THOUGHT",
    prompt: "what was the first thought that entered your mind?",
    placeholder: "i remember thinking...",
  },
  {
    number: 6,
    title: "THE ACTION",
    prompt: "what did you do next? not what you should have done. what you did.",
    placeholder: "so i...",
  },
  {
    number: 7,
    title: "THE CONSEQUENCE",
    prompt: "what happened as a result of that action?",
    placeholder: "which led to...",
  },
  {
    number: 8,
    title: "THE REALIZATION",
    prompt: "what did you learn that you didn't know before?",
    placeholder: "i realized that...",
  },
  {
    number: 9,
    title: "THE COST",
    prompt: "what did this cost you? time, money, relationships, identity?",
    placeholder: "it cost me...",
  },
  {
    number: 10,
    title: "THE GIFT",
    prompt: "what unexpected gift came from this experience?",
    placeholder: "but it gave me...",
  },
  {
    number: 11,
    title: "THE TRUTH",
    prompt: "if you could tell your past self one thing, what would it be?",
    placeholder: "i would say...",
  },
  {
    number: 12,
    title: "THE MESSAGE",
    prompt: "what does this story mean for someone else going through the same thing?",
    placeholder: "if you're experiencing this...",
  },
];
