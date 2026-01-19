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
    const { text } = await req.json();
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

    const systemPrompt = `You are a truth detector. Your job is to identify when text sounds like marketing, content, or performance rather than genuine human truth.

DETECT these patterns and return isAuthentic: false:
- Buzzwords: "leverage", "synergy", "thought leader", "game-changer", "unlock", "empower"
- LinkedIn formatting: hashtags, emoji clusters, "Let me tell you about my journey"
- Sales hooks: "Want to know the secret?", "Here's what nobody tells you"
- Performative vulnerability: "I failed... but now I'm successful", humble brags
- Content templates: "3 things I learned", lists that feel optimized for engagement
- Passive voice that distances from emotion: "Mistakes were made"
- Generic platitudes: "Follow your passion", "Be authentic", "Never give up"

ALLOW these and return isAuthentic: true:
- Raw, unpolished language
- Specific details and sensory memories
- Admissions without redemption arcs
- Lowercase, conversational tone
- Incomplete thoughts
- Genuine confusion or uncertainty

Respond with JSON only: { "isAuthentic": boolean, "reason": "brief explanation if not authentic" }`;

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
        temperature: 0.3,
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
      result = { isAuthentic: true, reason: null };
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
