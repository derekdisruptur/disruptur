import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!content || typeof content !== "object") {
      return new Response(
        JSON.stringify({ error: "Story content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine all steps into a single narrative
    const fullStory = Object.entries(content)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([step, text]) => `Step ${step}: ${text}`)
      .join("\n\n");

    const systemPrompt = `You are a story analyst for The Sanctuary — a platform for raw, unfiltered personal stories. Score this story on 5 dimensions from 0-100.

CRITICAL VIOLATIONS — These should dramatically impact scores:

HOOKS (severely penalize):
- Attention-grabbing opening lines designed to "stop the scroll" (e.g., "I almost died that day", "What happened next changed everything", "Nobody talks about this but...")
- Clickbait-style teasing, withholding information for dramatic effect
- Manufactured suspense or cliffhanger language
- Opening with a provocative question aimed at an audience
- Any language that feels engineered to capture attention rather than honestly recount a moment

CALLS TO ACTION (severely penalize):
- Telling the reader what to do ("Share this if...", "Drop a comment", "Follow me for more", "Tag someone who...")
- Promoting a product, service, course, link, or brand
- Asking for engagement, follows, shares, or subscriptions
- Directing people to a website, podcast, newsletter, or social profile
- "DM me", "Link in bio", "Check out my..."
- Subtle CTAs disguised as advice ("If you want to learn more about X...")

PLATFORM PLAY (severely penalize - 0-100 scale where higher = worse):
- Revenue/achievement flexing ("$1M business", "$100k/mo", company valuations, client metrics)
- "I was told I'd never..." humble-bragging structure where failure is setup for success story
- Direct engagement tactics ("Comment X", "Drop a comment", "What do you think?", rhetorical questions designed to prompt replies)
- Fake authority/manufactured expertise ("Trust me", "I've done this for 1000s", self-aggrandizing titles)
- Affiliate links, sponsorships, or product promotions disguised as advice
- Artificial formatting for engagement (excessive line breaks, single-word lines, emoji)
- Forced "casual" sign-offs designed to seem relatable ("Cheers! 😊", "Let's go!", "We're cooking")
- "Teaching" or "advice" that's really a sales pitch for a service/course
- Fake vulnerability followed by immediate bragging
- Asking leading questions to manufacture engagement (e.g., "What do you think the strategy is?")

SCORING CRITERIA:

1. AUTHENTICITY (0-100):
   - High: Specific details, sensory language, admits uncertainty, lowercase/raw tone
   - Low: Generic statements, polished language, sounds rehearsed, clichés
   - PENALTY: If hooks are detected, cap authenticity at 40 maximum. Hooks signal performance, not truth.

2. VULNERABILITY (0-100):
   - High: Shares actual emotions, admits mistakes without justification, reveals internal conflict
   - Low: Surface-level sharing, always has an answer, distances from emotion
   - PENALTY: If CTAs are detected, cap vulnerability at 30 maximum. You can't be vulnerable while selling.

3. CREDIBILITY (0-100):
   - High: Consistent timeline, specific names/places/dates, logical cause-effect
   - Low: Vague details, timeline jumps, claims without evidence
   - PENALTY: Hooks and CTAs both reduce credibility by 20 points each — they signal the story serves an agenda.

4. CRINGE RISK (0-100):
   - High (bad): Humble brags, forced lessons, "journey" language, trying too hard
   - Low (good): Natural voice, earned insights, proportional emotion
   - PENALTY: Any hook adds +25 to cringe risk. Any CTA adds +30 to cringe risk. Both together = cap at 85 minimum.

5. PLATFORM PLAY (0-100, higher = worse):
   - High (bad): Heavy revenue flexing, fake humility, engagement-bait tactics, fake authority
   - Low (good): No engagement tactics, genuine story without agenda, no promotional elements
   - DETECTION: Look for metric-dropping, rhetorical questions, manufactured defiance, forced relatability, affiliate links
   - PENALTY: Platform Play directly reduces authenticity and vulnerability scores by up to 30 points each

Return JSON only:
{
  "authenticity": number,
  "vulnerability": number,
  "credibility": number,
  "cringeRisk": number,
  "platformPlay": number,
  "hookDetected": boolean,
  "ctaDetected": boolean,
  "summary": "One sentence overall assessment"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Score this story:\n\n${fullStory}` }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let scores;
    try {
      const cleanContent = responseContent.replace(/```json\n?|\n?```/g, "").trim();
      scores = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse GPT response:", responseContent);
      // Default scores if parsing fails
      scores = {
        authenticity: 70,
        vulnerability: 70,
        credibility: 70,
        cringeRisk: 30,
        platformPlay: 30,
        summary: "Unable to analyze story"
      };
    }

    return new Response(
      JSON.stringify(scores),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("score-story error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
