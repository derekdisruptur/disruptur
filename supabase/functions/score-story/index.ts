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

    const systemPrompt = `You are a story analyst. Score this personal story on 4 dimensions from 0-100.

SCORING CRITERIA:

1. AUTHENTICITY (0-100):
   - High: Specific details, sensory language, admits uncertainty, lowercase/raw tone
   - Low: Generic statements, polished language, sounds rehearsed, clichés

2. VULNERABILITY (0-100):
   - High: Shares actual emotions, admits mistakes without justification, reveals internal conflict
   - Low: Surface-level sharing, always has an answer, distances from emotion

3. CREDIBILITY (0-100):
   - High: Consistent timeline, specific names/places/dates, logical cause-effect
   - Low: Vague details, timeline jumps, claims without evidence

4. CRINGE RISK (0-100):
   - High (bad): Humble brags, forced lessons, "journey" language, trying too hard
   - Low (good): Natural voice, earned insights, proportional emotion

Return JSON only:
{
  "authenticity": number,
  "vulnerability": number,
  "credibility": number,
  "cringeRisk": number,
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
