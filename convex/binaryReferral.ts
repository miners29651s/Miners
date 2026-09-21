import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  BINARY_MINER_PURCHASE_LEVEL1_PERCENT,
  BINARY_CLAIM_LEVEL1_PERCENT,
  BINARY_MAX_LEVELS,
  BINARY_MIN_PERCENT,
  binaryLevelPercent,
} from "../lib/binaryReferralCatalog";

async function getNodeByPlayer(ctx: any, playerId: any) {
  return await ctx.db
    .query("binaryNodes")
    .withIndex("by_player", (q: any) => q.eq("playerId", playerId))
    .unique();
}

export async function ensureBinaryNode(ctx: any, playerId: any) {
  const existing = await getNodeByPlayer(ctx, playerId);
  if (existing) return existing;
  const id = await ctx.db.insert("binaryNodes", {
    playerId,
    parentId: undefined,
    position: undefined,
    leftChildId: undefined,
    rightChildId: undefined,
    createdAt: Date.now(),
  });
  return await ctx.db.get(id);
}

export async function placeInBinaryTree(ctx: any, inviterId: any, newPlayerId: any) {
  const already = await getNodeByPlayer(ctx, newPlayerId);
  if (already) return already;

  const inviterNode = await ensureBinaryNode(ctx, inviterId);
  const queue: any[] = [inviterNode];

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node.leftChildId) {
      const id = await ctx.db.insert("binaryNodes", {
        playerId: newPlayerId,
        parentId: node.playerId,
        position: "left",
        leftChildId: undefined,
        rightChildId: undefined,
        createdAt: Date.now(),
      });
      await ctx.db.patch(node._id, { leftChildId: newPlayerId });
      return await ctx.db.get(id);
    }

    if (!node.rightChildId) {
      const id = await ctx.db.insert("binaryNodes", {
        playerId: newPlayerId,
        parentId: node.playerId,
        position: "right",
        leftChildId: undefined,
        rightChildId: undefined,
        createdAt: Date.now(),
      });
      await ctx.db.patch(node._id, { rightChildId: newPlayerId });
      return await ctx.db.get(id);
    }

    const leftNode = await getNodeByPlayer(ctx, node.leftChildId);
    const rightNode = await getNodeByPlayer(ctx, node.rightChildId);
    if (leftNode) queue.push(leftNode);
    if (rightNode) queue.push(rightNode);
  }

  return null;
}

export async function payBinaryCommission(
  ctx: any,
  sourcePlayerId: any,
  amount: number,
  kind: "miner_purchase" | "claim"
) {
  if (amount <= 0) return;

  const basePercent =
    kind === "miner_purchase" ? BINARY_MINER_PURCHASE_LEVEL1_PERCENT : BINARY_CLAIM_LEVEL1_PERCENT;

  let node = await getNodeByPlayer(ctx, sourcePlayerId);
  if (!node) return;

  let level = 1;
  while (node.parentId && level <= BINARY_MAX_LEVELS) {
    const percent = binaryLevelPercent(basePercent, level);
    if (percent < BINARY_MIN_PERCENT) break;

    const upline = await ctx.db.get(node.parentId);
    if (!upline) break;

    const payout = amount * percent;
    if (payout > 0) {
      const newBalance = upline.balance + payout;
      await ctx.db.patch(upline._id, { balance: newBalance });
      await ctx.db.insert("transactions", {
        playerId: upline._id,
        type: "binary_bonus",
        amount: payout,
        balanceAfter: newBalance,
        meta: { sourcePlayerId, kind, level },
        createdAt: Date.now(),
      });
    }

    node = await getNodeByPlayer(ctx, node.parentId);
    if (!node) break;
    level += 1;
  }
}

export const getMyBinaryState = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const node = await getNodeByPlayer(ctx, playerId);
    if (!node) {
      return { hasNode: false as const, leftFilled: false, rightFilled: false, totalEarned: 0 };
    }

    const leftPlayer: any = node.leftChildId ? await ctx.db.get(node.leftChildId as any) : null;
    const rightPlayer: any = node.rightChildId ? await ctx.db.get(node.rightChildId as any) : null;

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_player", (q: any) => q.eq("playerId", playerId))
      .filter((q: any) => q.eq(q.field("type"), "binary_bonus"))
      .collect();
    const totalEarned = tx.reduce((sum: number, t: any) => sum + t.amount, 0);

    return {
      hasNode: true as const,
      leftFilled: !!node.leftChildId,
      rightFilled: !!node.rightChildId,
      leftUsername: leftPlayer?.username ?? null,
      rightUsername: rightPlayer?.username ?? null,
      totalEarned,
    };
  },
});
