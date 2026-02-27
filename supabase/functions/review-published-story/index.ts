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
    const { originalContent, publishedText } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!originalContent || typeof originalContent !== "object") {
      return new Response(
        JSON.stringify({ error: "Original story content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!publishedText || typeof publishedText !== "string") {
      return new Response(
        JSON.stringify({ error: "Published text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine all steps into a single narrative
    const fullOriginal = Object.entries(originalContent)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([step, text]) => `Step ${step}: ${text}`)
      .join("\n\n");

    const systemPrompt = `You are a story fidelity analyst for The Sanctuary — a platform for raw, unfiltered personal stories. Users build authentic stories through a 12-step truth process, lock them with scores, then publish externally (LinkedIn, blog, etc.). Your job: compare the published version against the original truth and determine what survived.

Score the PUBLISHED version on the same 5 dimensions as the original (0-100 each), then assess fidelity.

SCORING CRITERIA (score the PUBLISHED text):

1. AUTHENTICITY (0-100):
   - High: Specific details, sensory language, admits uncertainty, raw tone
   - Low: Generic statements, polished language, sounds rehearsed, clichés
   - PENALTY: If hooks are detected, cap at 40. Hooks signal performance, not truth.

2. VULNERABILITY (0-100):
   - High: Shares actual emotions, admits mistakes without justification, reveals internal conflict
   - Low: Surface-level sharing, always has an answer, distances from emotion
   - PENALTY: If CTAs are detected, cap at 30. You can't be vulnerable while selling.

3. CREDIBILITY (0-100):
   - High: Consistent timeline, specific names/places/dates, logical cause-effect
   - Low: Vague details, timeline jumps, claims without evidence
   - PENALTY: Hooks and CTAs both reduce credibility by 20 points each.

4. CRINGE RISK (0-100, higher = worse):
   - High: Humble brags, forced lessons, "journey" language, trying too hard
   - Low: Natural voice, earned insights, proportional emotion
   - PENALTY: Any hook adds +25. Any CTA adds +30. Both = cap at 85 minimum.

5. PLATFORM PLAY (0-100, higher = worse):
   - High: Revenue flexing, fake humility, engagement-bait, fake authority, promotional elements
   - Low: No engagement tactics, genuine story, no agenda

FIDELITY ASSESSMENT (compare published against original):
- Did the core truth survive publication?
- Were key details preserved or softened/removed?
- Was the emotional honesty maintained or polished away?
- Were hooks, CTAs, or marketing language added that weren't in the original?

FLAG SPECIFIC TEXT from the published version:
- hookExamples: Quote exact text that functions as attention hooks
- ctaExamples: Quote exact text that functions as calls to action
- marketingExamples: Quote exact text that is marketing jargon or corporate speak
- credibilityRiskExamples: Quote exact text where claims diverge from or embellish the original

Return JSON only:
{
  "authenticity": number,
  "vulnerability": number,
  "credibility": number,
  "cringeRisk": number,
  "platformPlay": number,
  "fidelityScore": number,
  "hookExamples": ["quoted text from published version"],
  "ctaExamples": ["quoted text from published version"],
  "marketingExamples": ["quoted text from published version"],
  "credibilityRiskExamples": ["quoted text from published version"],
  "summary": "2-3 sentence assessment of how the truth fared in publication"
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
          {
            role: "user",
            content: `ORIGINAL STORY (12-step truth process):\n\n${fullOriginal}\n\n---\n\nPUBLISHED VERSION:\n\n${publishedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
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
    let review;
    try {
      const cleanContent = responseContent.replace(/```json\n?|\n?```/g, "").trim();
      review = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse GPT response:", responseContent);
      review = {
        authenticity: 50,
        vulnerability: 50,
        credibility: 50,
        cringeRisk: 50,
        platformPlay: 50,
        fidelityScore: 50,
        hookExamples: [],
        ctaExamples: [],
        marketingExamples: [],
        credibilityRiskExamples: [],
        summary: "Unable to analyze published story",
      };
    }

    return new Response(
      JSON.stringify(review),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("review-published-story error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
