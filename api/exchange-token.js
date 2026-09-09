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

async function kvSet(key, value) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  return res.json();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { public_token, account_name } = req.body;
    const response = await client.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;

    // Persist token in Upstash KV keyed by account name
    await kvSet(`plaid_token_${account_name}`, access_token);
    console.log(`Saved token for ${account_name}`);

    res.json({ success: true, account_name });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error_message || e.message });
  }
};
