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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { access_token, start_date, end_date } = req.body;
    const response = await client.transactionsGet({
      access_token,
      start_date,
      end_date,
    });
    res.json({ transactions: response.data.transactions });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error_message || e.message });
  }
};
