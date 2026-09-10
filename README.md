# Miner Coffee — starter build

A Telegram Mini App mining game: Next.js (App Router) frontend + Convex
backend. Implements the full spec except two features that were deliberately
left out — see "What's intentionally not here" below.

## Setup

```bash
npm install
npx convex dev        # creates your Convex deployment, generates convex/_generated/*
```

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_CONVEX_URL` — printed by `npx convex dev`
- `TELEGRAM_BOT_TOKEN` — from @BotFather, server-side only

Seed the task catalog once your Convex dev server is running:

```bash
npx convex run seed:seedTasks
```

Then:

```bash
npm run dev
```

Point your Telegram bot's Mini App URL at your deployed frontend (BotFather →
your bot → Bot Settings → Menu Button / Mini App).

## Project layout

```
convex/          server-authoritative logic (schema, auth, mining, miners,
                  tasks, referrals, profile) — nothing here trusts the client
lib/              shared constants/formulas used by both server and UI
                  (lib/minerCatalog.ts is the single source of truth for
                  miner costs/hashrate/upgrade formulas)
components/       Counter, ClaimButton, MinerCard, MinerRack, BottomNav,
                  Balance, Modal — presentational only
app/tabs/*        one folder per tab, each independent — editing one tab
                  cannot break another
public/miners/    put mini.png, starter.png, bronze.png, silver.png,
                  gold.png, platinum.png, diamond.png, titan.png, omega.png,
                  ultimate.png here (10 distinct miner art assets)
```

## What's intentionally not here

**Binary MLM system** — not implemented. **Referral rewards are a flat,
fixed COFFEE amount** (see `lib/minerCatalog.ts:REFERRAL_FLAT_BONUS`), paid
once when a referred player completes their first claim — never a
percentage of what they've spent, and never a multi-level payout tree. That
combination (real-money purchases + purchase-linked commissions + a
multi-level payout structure) is the standard architecture of a pyramid
scheme, independent of whether the token has a stated price. If you want
this changed, changing it back is straightforward — but worth thinking
through the legal exposure first.

**Miner expiration** — miners are permanent by design. There is no
`expiresAt` field anywhere in the schema, and none should be added.

**Real token value / withdrawals** — `profile.ts` reports withdrawal as
locked until the 10,000-user threshold and a paid miner are both true, and
nothing here creates real blockchain transactions, wallet balances, or a
token contract. That's follow-on work for whenever an actual launch is
planned, not something to fake in the meantime.

## Security notes already baked in

- `convex/lib/telegramAuth.ts` validates Telegram `initData` server-side
  (HMAC check + freshness) before a player row is ever created or looked up.
- Balance, hashrate, and mining rewards are computed and written only inside
  Convex mutations — the client never sends a balance or hashrate value that
  gets trusted.
- `mining.claim` resets `lastMiningTick` atomically with the balance update,
  so a claim can't be replayed to double-pay.
- Every balance-changing mutation writes a row to `transactions` for audit.

## Not yet built (follow-up work)

- Actual verification for the YouTube/Telegram-channel tasks (this starter
  assumes a `complete` call means the client already proved completion —
  replace with a real check, e.g. Bot API channel-membership/reaction
  lookup, before shipping)
- Rate limiting / anti-bot on mutations
- Withdrawal execution once token launch infrastructure exists
- Convex `internal` mutations + `crons` for any scheduled jobs
- Miner art assets (`public/miners/*.png`)
