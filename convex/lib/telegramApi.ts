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

// Saves a "prepared inline message" (with a real inline keyboard) that the
// Mini App can then hand to Telegram.WebApp.shareMessage(id) — this opens
// Telegram's native share sheet, and whatever chat the user picks receives
// this exact message with working buttons (unlike forwarding, which always
// strips inline keyboards, and unlike t.me/share/url, which only sends
// plain text+link with no buttons at all).
export async function savePreparedInlineMessage(
  botToken: string,
  telegramUserId: string,
  params: { text: string; buttons: { text: string; url: string }[][] }
): Promise<{ id: string; expireDate: number }> {
  const resultId = `ref_${telegramUserId}_${Date.now()}`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/savePreparedInlineMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: Number(telegramUserId),
      result: {
        type: "article",
        id: resultId,
        title: "Invite a friend",
        input_message_content: { message_text: params.text },
        reply_markup: { inline_keyboard: params.buttons },
      },
      allow_user_chats: true,
      allow_group_chats: true,
      allow_bot_chats: false,
      allow_channel_chats: false,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "savePreparedInlineMessage failed");
  return { id: data.result.id, expireDate: data.result.expire_date };
}
