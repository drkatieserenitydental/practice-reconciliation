const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const fs = require("fs");
const path = require("path");

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
    const { public_token, account_name } = req.body;
    const response = await client.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    
    // Store in environment (in production, store in a database)
    // For now return it to be stored by the client
    res.json({ access_token, account_name });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error_message || e.message });
  }
};
