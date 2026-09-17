// TON Center API v2 client — read-only, used to poll incoming payments to
// TON_WALLET_ADDRESS. Docs: https://docs.ton.org/ecosystem/api/toncenter/v2/transactions/get-transactions
// Requests without TONCENTER_API_KEY are limited to 1 request/second, which
// is fine for our polling interval (see convex/crons.ts).

export type TonMessage = {
  source: string;
  destination: string;
  value: string; // nanotons, as a decimal string
  message?: string; // decoded UTF-8 text comment, present only for plain-text comment bodies
};

export type TonTransaction = {
  utime: number;
  transaction_id: { lt: string; hash: string };
  in_msg: TonMessage;
};

export async function getIncomingTransactions(
  walletAddress: string,
  limit = 30
): Promise<TonTransaction[]> {
  const url = new URL("https://toncenter.com/api/v2/getTransactions");
  url.searchParams.set("address", walletAddress);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("archival", "true");

  const headers: Record<string, string> = {};
  const apiKey = process.env.TONCENTER_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(url.toString(), { headers });
  const data = await res.json();
  if (!data.ok) throw new Error(`toncenter error: ${data.error || "unknown"}`);
  return data.result as TonTransaction[];
}
