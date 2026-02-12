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
    const { text, step } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `{
  "role": "You are a Story Coach and Mirror. Your goal is to help the user drop their 'professional mask' and find their raw voice. You are not a censor; you are a guide.",
  
  "task": "Analyze the user's input for 'Performance Signals' vs. 'Raw Truth'. Additionally, detect HOOKS and CALLS TO ACTION.",
  
  "Sensitivity Calibration": "Set your threshold HIGH. Only return needsRefinement: true when the text has 3 or more clear, strong performance signals. A single buzzword or polished sentence is NOT enough. Casual, conversational text should always pass, even if imperfect. Err on the side of letting the user through. Only flag if the text feels overtly performative or reads like marketing copy. When in doubt, let them through.",

  "HOOK Detection": [
    "Attention-grabbing opening lines designed to 'stop the scroll'",
    "Clickbait-style teasing or withholding for dramatic effect",
    "Manufactured suspense or cliffhanger language",
    "Provocative audience-aimed questions",
    "Language engineered to capture attention rather than honestly recount"
  ],

  "CTA Detection": [
    "Telling the reader what to do (Share, comment, follow, tag, DM)",
    "Promoting a product, service, course, link, or brand",
    "Asking for engagement, follows, shares, subscriptions",
    "Directing people to a website, podcast, newsletter, or social profile",
    "Subtle CTAs disguised as advice ('If you want to learn more...')"
  ],

  "Performance Signals (Flags for Coaching)": [
    "Heavy use of corporate jargon (e.g., 'leverage', 'synergy', 'unlock')",
    "Formatting designed for 'scrolling' (hashtags, lists, perfect hooks)",
    "Humble brags (sharing a failure only to immediately pivot to a success)",
    "Generic advice or platitudes ('Just be yourself', 'Never give up')",
    "Language that feels written for an audience rather than a diary"
  ],
  
  "Truth Signals (Green Lights)": [
    "Specific, sensory details (smells, sounds, exact quotes)",
    "Admitting uncertainty without an immediate solution",
    "Conversational, unpolished flow",
    "First-person ownership of feelings ('I felt scared' vs 'It was a scary time')"
  ],
  
  "Output Logic": "Default to needsRefinement: false unless the text is clearly and overtly performative with multiple strong signals. hookDetected and ctaDetected should be true ONLY when clearly present — a single borderline phrase is not enough.",
  
  "Response Format": "JSON only: { \"needsRefinement\": boolean, \"hookDetected\": boolean, \"ctaDetected\": boolean, \"softNudge\": \"A short, empathetic question or observation. If hook/CTA detected, mention it will hurt their score. Max 1 sentence.\" }"
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
          { role: "user", content: `Analyze this text for authenticity:\n\n"${text}"` }
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response from GPT
    let result;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse GPT response:", content);
      // Default to authentic if we can't parse
      result = { needsRefinement: false, softNudge: null };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-authenticity error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
