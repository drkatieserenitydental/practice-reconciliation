async function kvGet(key) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const data = await res.json();
  return data.result || null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { account_name } = req.query;
    if (!account_name) return res.status(400).json({ error: "account_name required" });

    const token = await kvGet(`plaid_token_${account_name}`);
    res.json({ access_token: token, account_name });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
};
