// Calls Telegram Bot API's getChatMember to verify a user's channel
// membership before paying out a "channel_join" task. Must run inside a
// Convex ACTION (uses fetch — mutations/queries cannot make HTTP calls).

const MEMBER_STATUSES = new Set(["creator", "administrator", "member", "restricted"]);

export async function isChannelMember(
  botToken: string,
  channelId: string,
  telegramUserId: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
    channelId
  )}&user_id=${encodeURIComponent(telegramUserId)}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) return false;

  const status = data.result?.status;
  return MEMBER_STATUSES.has(status);
}
