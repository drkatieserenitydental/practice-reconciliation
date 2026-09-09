const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "production"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
}));

async function kvGet(key) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const data = await res.json();
  return data.result || null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    let { access_token, account_name, start_date, end_date } = req.body;

    // If no access_token provided, try to load from KV
    if (!access_token && account_name) {
      access_token = await kvGet(`plaid_token_${account_name}`);
      if (!access_token) {
        return res.status(400).json({ error: "No stored token found. Please reconnect via Plaid." });
      }
    }

    // Force a fresh sync from the bank
    try {
      await client.transactionsRefresh({ access_token });
      await new Promise(r => setTimeout(r, 3000));
    } catch (refreshErr) {
      console.log("Refresh skipped:", refreshErr.message);
    }

    const response = await client.transactionsGet({
      access_token,
      start_date,
      end_date,
      options: { count: 500 }
    });
    res.json({ transactions: response.data.transactions });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error_message || e.message });
  }
};
