// api/cleanup-items.js
// Safe one-time Plaid Item cleanup
//
// HOW TO USE:
//   Step 1 — DRY RUN (see what will be removed, nothing deleted):
//     GET https://practice-reconciliation.vercel.app/api/cleanup-items
//
//   Step 2 — EXECUTE (only after reviewing the dry-run output):
//     GET https://practice-reconciliation.vercel.app/api/cleanup-items?confirm=true
//
// The two tokens currently stored in Upstash (plaid_token_BoA and
// plaid_token_Amex) are ALWAYS protected — they are fetched live from KV
// before any comparison, so they can never accidentally be removed.

const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

// ── Plaid client ──────────────────────────────────────────────────────────────
const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "production"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

// ── Upstash helper ────────────────────────────────────────────────────────────
async function upstashGet(key) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.result; // null if key doesn't exist
}

// ── All 57 tokens from the Plaid-supplied CSV ─────────────────────────────────
// These were provided by Plaid Support. Do not edit this list manually.
const ALL_CSV_TOKENS = [
  "access-production-74c0b93f-9864-4863-97c8-7b5d25bb83ba",
  "access-production-025ed237-7db3-4aba-9275-341b0437cdde",
  "access-production-67c012a2-638d-4aad-8eb6-fa327fe6c7c1",
  "access-production-8d6bfebe-2d8d-47ff-8aa4-572a6b8faf2f",
  "access-production-b66a57ff-a714-4c69-8242-034c563afbc9",
  "access-production-bc62f7da-86c7-4bcd-9d0d-f60141863318",
  "access-production-dafc18b9-826c-4de9-abf1-893babe32664",
  "access-production-24dfca74-ec54-47bd-bf93-1b8f99f2fc2c",
  "access-production-b3009e28-587f-48cc-87a0-f71c8cd81318",
  "access-production-0f44fc6f-7fc2-42dd-8f62-4110acb68e77",
  "access-production-078680d3-3fb0-4c02-9aa8-fa2f7838739b",
  "access-production-e5f76c8f-ba56-4c56-a6e1-9c514c893f68",
  "access-production-6dca08e4-6a75-4906-9bf9-11d0709d177c",
  "access-production-ece1b617-70eb-47e2-beb2-a2b9ac7e2ad6",
  "access-production-02eebc44-2b11-429b-b3c7-6785df06e720",
  "access-production-d791aee6-1946-4c2d-9514-cb2f159f8a09",
  "access-production-6544f6f7-19f3-4907-821b-00d5f2758f55",
  "access-production-d528d821-6958-499b-9c49-c1e7248c1ae6",
  "access-production-ba780c40-675f-4b4a-8942-8c2d2ab8a47d",
  "access-production-592e8ce5-aaf9-4c1a-ad65-0a535bcf1d9d",
  "access-production-c9588e88-cdae-4d0c-ae8d-40f4f5980cd1",
  "access-production-31129e5d-f6ef-4942-99cc-bcd23ed2799e",
  "access-production-8448d3fe-4dff-4a4a-b751-f3826f5fea72",
  "access-production-7cd32c41-ce55-45d0-aa89-77f2015cd489",
  "access-production-ad7ec885-2496-4207-ac24-0cac7c178cea",
  "access-production-0e3df63e-0894-4fbb-acc2-30b19cd1549b",
  "access-production-5230452c-1fd0-4069-89d6-bb73555ac967",
  "access-production-129f92be-8c75-4fa7-8c51-f77cb2ed774a",
  "access-production-b742cdda-99e9-4c88-ab4a-0b5b46a3732d",
  "access-production-10e937d6-49b7-4ae2-80c9-188487ceb3a6",
  "access-production-e50645eb-7ce6-4148-9f34-581bf7541211",
  "access-production-3629c642-9a4c-4e14-b514-f6c7574827e5",
  "access-production-deb59e95-1e3b-4c45-98da-df9cc851cfd6",
  "access-production-b2532f2c-3cb9-4d13-b3d5-b96ad106a5fb",
  "access-production-74fac0bb-747e-4d79-bc7a-8f3c4b3b8726",
  "access-production-d0aa311e-81c3-489d-b039-d92b02371c1e",
  "access-production-a767261b-2d53-4814-b93d-12b041d13b1e",
  "access-production-03ffa476-9d96-4936-88c2-6fe7214de09b",
  "access-production-abe7ee92-1083-43b7-81f1-139a35a7521e",
  "access-production-866a6580-579d-4020-881f-4080f0caa3fd",
  "access-production-1c0b8983-c6ca-4f0f-be8f-5e1b79d67dc2",
  "access-production-b9b993b9-5af0-459b-a768-69cafbc86487",
  "access-production-aa4f693f-8cfe-4a50-8f9a-fd7d567e4890",
  "access-production-2f5aa99d-3741-4d27-9034-a96ebd72ba51",
  "access-production-6ffb8a66-7ffe-4251-8e67-64d3b2ea64d1",
  "access-production-5cc81a81-df15-4e32-8a06-ef7c6648cbe2",
  "access-production-26640e43-3c1e-4b5c-9acc-d1752c8e93be",
  "access-production-fc9a30f0-9544-4bf5-a46f-9cc713d95353",
  "access-production-4ef3721e-407f-413f-b9cd-c8632c3518a2",
  "access-production-45a7cd57-cb93-486e-8c68-fccbe5621ba6",
  "access-production-e87963b7-f158-4a9c-b0b7-5ace846d739b",
  "access-production-09078378-09de-44bd-9a52-092fb6387d81",
  "access-production-da7478a2-bcfa-4384-8ed9-099caf2b466f",
  "access-production-f55b169d-a1a6-4571-85ba-6277a02694e0",
  "access-production-3ef5bf08-c282-400c-9b14-f380c673ebe7",
  "access-production-cc6277e9-3e88-4f3b-b595-e06205bdcdbd",
  "access-production-bc206322-e458-413d-980d-bcb28eceb37a",
];

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const confirm = req.query.confirm === "true";

  try {
    // ── 1. Fetch the two keeper tokens from Upstash ──────────────────────────
    const [boaToken, amexToken] = await Promise.all([
      upstashGet("plaid_token_BoA"),
      upstashGet("plaid_token_Amex"),
    ]);

    const keeperTokens = new Set();
    const keeperLabels = {};

    if (boaToken) {
      keeperTokens.add(boaToken);
      keeperLabels[boaToken] = "BoA (active app token — KEEP)";
    }
    if (amexToken) {
      keeperTokens.add(amexToken);
      keeperLabels[amexToken] = "Amex (active app token — KEEP)";
    }

    // ── 2. Classify every CSV token ──────────────────────────────────────────
    const toKeep = [];
    const toRemove = [];

    for (const token of ALL_CSV_TOKENS) {
      if (keeperTokens.has(token)) {
        toKeep.push({ token, label: keeperLabels[token] });
      } else {
        toRemove.push({ token });
      }
    }

    // ── 3. Enrich tokens to remove with Plaid /item/get info ─────────────────
    // We call /item/get for each token so you can see the institution name
    // before anything is deleted. Errors are soft — if a token is already
    // invalid, we still include it in the remove list (it won't charge you).
    const enriched = await Promise.allSettled(
      toRemove.map(async ({ token }) => {
        try {
          const resp = await plaidClient.itemGet({ access_token: token });
          const item = resp.data.item;
          return {
            token,
            institution_id: item.institution_id,
            item_id: item.item_id,
            error: item.error ? item.error.error_code : null,
          };
        } catch (err) {
          const code = err.response?.data?.error_code || err.message;
          return { token, institution_id: "UNKNOWN", item_id: "UNKNOWN", error: code };
        }
      })
    );

    const removeList = enriched.map((r) =>
      r.status === "fulfilled" ? r.value : { token: "UNKNOWN", error: r.reason?.message }
    );

    // ── 4. Dry-run response ───────────────────────────────────────────────────
    if (!confirm) {
      return res.json({
        mode: "DRY RUN — nothing has been removed yet",
        instructions:
          "Review this list. When ready, call /api/cleanup-items?confirm=true to execute the removal.",
        keepers: toKeep,
        upstash_boa_found: !!boaToken,
        upstash_amex_found: !!amexToken,
        total_csv_tokens: ALL_CSV_TOKENS.length,
        tokens_to_keep: toKeep.length,
        tokens_to_remove: removeList.length,
        tokens_to_remove_detail: removeList,
      });
    }

    // ── 5. Execute removal ────────────────────────────────────────────────────
    const results = [];
    for (const item of removeList) {
      try {
        await plaidClient.itemRemove({ access_token: item.token });
        results.push({ token: item.token, status: "REMOVED", institution_id: item.institution_id });
      } catch (err) {
        const code = err.response?.data?.error_code || err.message;
        results.push({
          token: item.token,
          status: "ERROR",
          error: code,
          institution_id: item.institution_id,
        });
      }
    }

    const removedCount = results.filter((r) => r.status === "REMOVED").length;
    const errorCount = results.filter((r) => r.status === "ERROR").length;

    return res.json({
      mode: "EXECUTED",
      keepers_protected: toKeep,
      removed: removedCount,
      errors: errorCount,
      results,
    });
  } catch (err) {
    console.error("cleanup-items error:", err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data?.error_message || err.message });
  }
};
