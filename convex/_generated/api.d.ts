/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as channelActivity from "../channelActivity.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_telegramApi from "../lib/telegramApi.js";
import type * as lib_telegramAuth from "../lib/telegramAuth.js";
import type * as lib_tonApi from "../lib/tonApi.js";
import type * as migrate from "../migrate.js";
import type * as miners from "../miners.js";
import type * as mining from "../mining.js";
import type * as profile from "../profile.js";
import type * as recompute from "../recompute.js";
import type * as referralShare from "../referralShare.js";
import type * as referralSprint from "../referralSprint.js";
import type * as referrals from "../referrals.js";
import type * as seed from "../seed.js";
import type * as spin from "../spin.js";
import type * as tasks from "../tasks.js";
import type * as webhookFix from "../webhookFix.js";
import type * as withdrawals from "../withdrawals.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  channelActivity: typeof channelActivity;
  crons: typeof crons;
  http: typeof http;
  "lib/telegramApi": typeof lib_telegramApi;
  "lib/telegramAuth": typeof lib_telegramAuth;
  "lib/tonApi": typeof lib_tonApi;
  migrate: typeof migrate;
  miners: typeof miners;
  mining: typeof mining;
  profile: typeof profile;
  recompute: typeof recompute;
  referralShare: typeof referralShare;
  referralSprint: typeof referralSprint;
  referrals: typeof referrals;
  seed: typeof seed;
  spin: typeof spin;
  tasks: typeof tasks;
  webhookFix: typeof webhookFix;
  withdrawals: typeof withdrawals;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
