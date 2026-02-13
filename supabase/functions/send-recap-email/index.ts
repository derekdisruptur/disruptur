import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEP_TITLES = [
  "THE MOMENT",
  "THE CONTEXT",
  "WHAT HAPPENED",
  "THE FEELING",
  "THE THOUGHT",
  "THE ACTION",
  "THE CONSEQUENCE",
  "THE REALIZATION",
  "THE COST",
  "THE GIFT",
  "THE TRUTH",
  "THE MESSAGE",
];

function buildEmailHtml(
  scores: { authenticity: number; vulnerability: number; credibility: number; cringeRisk: number; platformPlay?: number; summary?: string },
  content: Record<string, string>,
  bucket: string,
) {
  const storyOutline = Object.entries(content)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([step, text]) => {
      const idx = Number(step) - 1;
      const title = STEP_TITLES[idx] || `STEP ${step}`;
      return `<tr>
        <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#888;text-transform:uppercase;vertical-align:top;width:140px;border-bottom:1px solid #222;">${title}</td>
        <td style="padding:12px 16px;font-family:Georgia,serif;font-size:15px;color:#ccc;line-height:1.6;border-bottom:1px solid #222;">${text}</td>
      </tr>`;
    })
    .join("");

  const scoreBar = (label: string, value: number, invert = false) => {
    const color = invert
      ? value > 60 ? "#ff4444" : value > 30 ? "#ffaa00" : "#44ff88"
      : value > 60 ? "#44ff88" : value > 30 ? "#ffaa00" : "#ff4444";
    return `<tr>
      <td style="padding:8px 0;font-family:monospace;font-size:13px;color:#888;text-transform:uppercase;">${label}</td>
      <td style="padding:8px 0;width:60%;">
        <div style="background:#222;border-radius:4px;height:20px;width:100%;position:relative;">
          <div style="background:${color};border-radius:4px;height:20px;width:${value}%;"></div>
        </div>
      </td>
      <td style="padding:8px 8px;font-family:monospace;font-size:14px;color:#fff;text-align:right;font-weight:bold;">${value}</td>
    </tr>`;
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#fff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-family:monospace;font-size:24px;letter-spacing:4px;color:#fff;margin:0;">THE SANCTUARY</h1>
      <p style="font-family:monospace;font-size:12px;color:#666;margin:8px 0 0;">DISRUPTUR STORY OS</p>
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:monospace;font-size:14px;color:#888;margin:0 0 4px;text-transform:uppercase;">Story Locked</h2>
      <p style="font-family:monospace;font-size:18px;color:#fff;margin:0 0 16px;text-transform:uppercase;">${bucket.toUpperCase()} STORY</p>
      ${scores.summary ? `<p style="font-family:Georgia,serif;font-size:15px;color:#aaa;margin:0;line-height:1.5;font-style:italic;">"${scores.summary}"</p>` : ""}
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:monospace;font-size:14px;color:#888;margin:0 0 16px;text-transform:uppercase;">Score Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;">
         ${scoreBar("Authenticity", scores.authenticity)}
         ${scoreBar("Vulnerability", scores.vulnerability)}
         ${scoreBar("Credibility", scores.credibility)}
         ${scoreBar("Cringe Risk", scores.cringeRisk, true)}
         ${scores.platformPlay !== undefined ? scoreBar("Platform Play", scores.platformPlay, true) : ""}
       </table>
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:monospace;font-size:14px;color:#888;margin:0 0 16px;text-transform:uppercase;">Your Story Outline</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${storyOutline}
      </table>
    </div>

    <div style="text-align:center;padding:24px 0;">
      <p style="font-family:monospace;font-size:11px;color:#444;">This story is now locked. Your truth has been recorded.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, scores, content, bucket } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    if (!email || !scores || !content) {
      return new Response(
        JSON.stringify({ error: "email, scores, and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildEmailHtml(scores, content, bucket || "personal");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Sanctuary <onboarding@resend.dev>",
        to: [email],
        subject: `Your ${(bucket || "personal").toUpperCase()} Story — Locked & Scored`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", res.status, errText);
      throw new Error(`Resend API error: ${res.status}`);
    }

    const data = await res.json();

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-recap-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
