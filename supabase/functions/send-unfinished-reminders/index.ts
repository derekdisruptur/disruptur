import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

interface DraftStory {
  id: string;
  user_id: string;
  title: string | null;
  bucket: string;
  current_step: number;
}

function buildReminderHtml(
  stories: DraftStory[],
): string {
  const count = stories.length;
  const storyWord = count === 1 ? "story" : "stories";

  const storyRows = stories
    .map((s) => {
      const title = s.title || "Untitled Story";
      const bucket = (s.bucket || "personal").toUpperCase();
      const progress = `Step ${s.current_step} of 12`;
      return `<tr>
        <td style="padding:12px 16px;font-family:Georgia,serif;font-size:15px;color:#ccc;line-height:1.6;border-bottom:1px solid #222;">${title}</td>
        <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#888;text-transform:uppercase;vertical-align:middle;border-bottom:1px solid #222;">${bucket}</td>
        <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#888;vertical-align:middle;border-bottom:1px solid #222;white-space:nowrap;">${progress}</td>
      </tr>`;
    })
    .join("");

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
      <h2 style="font-family:monospace;font-size:14px;color:#888;margin:0 0 4px;text-transform:uppercase;">Unfinished Business</h2>
      <p style="font-family:Georgia,serif;font-size:18px;color:#fff;margin:0 0 8px;">You have <strong>${count}</strong> unfinished ${storyWord}.</p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#aaa;margin:0;line-height:1.5;">Your stories are waiting. The truth doesn't finish itself.</p>
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:monospace;font-size:14px;color:#888;margin:0 0 16px;text-transform:uppercase;">Your Drafts</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <th style="padding:8px 16px;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;text-align:left;border-bottom:1px solid #333;">Title</th>
          <th style="padding:8px 16px;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;text-align:left;border-bottom:1px solid #333;">Bucket</th>
          <th style="padding:8px 16px;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;text-align:left;border-bottom:1px solid #333;">Progress</th>
        </tr>
        ${storyRows}
      </table>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://app.disruptur.com" style="display:inline-block;padding:14px 32px;background:#fff;color:#0a0a0a;font-family:monospace;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;letter-spacing:2px;text-transform:uppercase;">Continue Writing</a>
    </div>

    <div style="text-align:center;padding:24px 0;">
      <p style="font-family:monospace;font-size:11px;color:#444;">Your drafts are safe. Pick up where you left off.</p>
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all draft stories
    const { data: drafts, error: draftsError } = await supabase
      .from("stories")
      .select("id, user_id, title, bucket, current_step")
      .eq("status", "draft");

    if (draftsError) {
      throw new Error(`Failed to fetch drafts: ${draftsError.message}`);
    }

    if (!drafts || drafts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No draft stories found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Group stories by user_id
    const byUser = new Map<string, DraftStory[]>();
    for (const story of drafts) {
      const list = byUser.get(story.user_id) || [];
      list.push(story);
      byUser.set(story.user_id, list);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [userId, stories] of byUser) {
      // Fetch user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError || !userData?.user?.email) {
        errors.push(`Could not fetch email for user ${userId}`);
        continue;
      }

      const email = userData.user.email;
      const html = buildReminderHtml(stories);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Sanctuary <onboarding@resend.dev>",
          to: [email],
          subject: `You have ${stories.length} unfinished ${stories.length === 1 ? "story" : "stories"}`,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Resend error for ${email}:`, res.status, errText);
        errors.push(`Failed to send to ${email}: ${res.status}`);
        continue;
      }

      sent++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        totalUsers: byUser.size,
        totalDrafts: drafts.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-unfinished-reminders error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
