import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type LineNotificationActor = {
  profileId: string | null;
  name: string;
};

type LineNotificationOutcome = "sent" | "skipped" | "failed";

type RealPushResult = {
  outcome: LineNotificationOutcome;
  message: string;
  quoteToken: string | null;
};

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

function isLinePushEnabled(): boolean {
  return process.env.PICKING_LINE_PUSH_ENABLED === "true";
}

// Mirrors V1's pushLineMessages guard (Code.gs.txt): a missing channel
// token/group id fails the attempt before any network call.
async function attemptRealPush(summaryText: string): Promise<RealPushResult> {
  const channelToken = process.env.LINE_CHANNEL_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;

  if (!channelToken || !groupId) {
    return {
      outcome: "failed",
      message: "LINE channel not configured (missing token or group id).",
      quoteToken: null,
    };
  }

  try {
    const response = await fetch(LINE_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: "text", text: summaryText }],
      }),
    });

    if (!response.ok) {
      return { outcome: "failed", message: `LINE API HTTP ${response.status}`, quoteToken: null };
    }

    const data = (await response.json()) as { sentMessages?: { quoteToken?: string }[] };
    const quoteToken = data.sentMessages?.at(-1)?.quoteToken ?? null;
    return { outcome: "sent", message: "LINE push sent.", quoteToken };
  } catch (err) {
    return {
      outcome: "failed",
      message: err instanceof Error ? err.message : "LINE API request failed.",
      quoteToken: null,
    };
  }
}

function eventTypeFor(outcome: LineNotificationOutcome): string {
  if (outcome === "sent") return "line_notification_sent";
  if (outcome === "skipped") return "line_notification_skipped";
  return "line_push_failed";
}

/**
 * Notification outcome never changes picking_requisitions.status (V1's own
 * push failure is non-blocking: saved-with-warning, lineStatus stays
 * "pending"). Outside the caller's create transaction by design, matching
 * V1's "LINE push is intentionally outside the lock" comment.
 */
export async function sendPickingLineNotification(
  requisitionId: string,
  actor: LineNotificationActor,
): Promise<void> {
  const admin = createAdminClient();

  const { data: requisition } = await admin
    .from("picking_requisitions")
    .select("bill_no, bill_date, assignee_name")
    .eq("id", requisitionId)
    .maybeSingle();

  if (!requisition) {
    return;
  }

  const summaryText = `Picking bill ${requisition.bill_no ?? "?"} (${requisition.bill_date}) assigned to ${requisition.assignee_name}`;

  const result: RealPushResult = isLinePushEnabled()
    ? await attemptRealPush(summaryText)
    : { outcome: "skipped", message: "LINE push disabled (dry-run mode).", quoteToken: null };

  await admin.from("picking_requisition_events").insert({
    requisition_id: requisitionId,
    event_type: eventTypeFor(result.outcome),
    actor_profile_id: actor.profileId,
    actor_name: actor.name,
    metadata: { message: result.message },
  });

  if (result.outcome === "sent" && result.quoteToken) {
    await admin
      .from("picking_requisition_secrets")
      .upsert({ requisition_id: requisitionId, line_card_quote_token: result.quoteToken });
  }
}
