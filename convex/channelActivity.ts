import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Tracks the most recent post per channel (via settings table, keyed
// "latest_post_<channelId>") and which users have reacted to which message.
// Populated only from convex/http.ts's Telegram webhook handler.

export const _recordLatestPost = internalMutation({
  args: { channelId: v.string(), messageId: v.number() },
  handler: async (ctx, { channelId, messageId }) => {
    const key = `latest_post_${channelId}`;
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: messageId });
    } else {
      await ctx.db.insert("settings", { key, value: messageId });
    }
  },
});

export const _getLatestPostMessageId = internalQuery({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", `latest_post_${channelId}`))
      .unique();
    return typeof row?.value === "number" ? row.value : null;
  },
});

export const _recordReaction = internalMutation({
  args: { channelId: v.string(), messageId: v.number(), telegramId: v.string() },
  handler: async (ctx, { channelId, messageId, telegramId }) => {
    const existing = await ctx.db
      .query("taskReactions")
      .withIndex("by_channel_message_user", (q) =>
        q.eq("channelId", channelId).eq("messageId", messageId).eq("telegramId", telegramId)
      )
      .unique();
    if (existing) return;
    await ctx.db.insert("taskReactions", {
      channelId,
      messageId,
      telegramId,
      reactedAt: Date.now(),
    });
  },
});

export const _hasReacted = internalQuery({
  args: { channelId: v.string(), messageId: v.number(), telegramId: v.string() },
  handler: async (ctx, { channelId, messageId, telegramId }) => {
    const row = await ctx.db
      .query("taskReactions")
      .withIndex("by_channel_message_user", (q) =>
        q.eq("channelId", channelId).eq("messageId", messageId).eq("telegramId", telegramId)
      )
      .unique();
    return !!row;
  },
});
