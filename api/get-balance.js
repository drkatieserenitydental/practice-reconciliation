import { PlaidApi, PlaidEnvironments, Configuration } from 'plaid';

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments.production,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });
  try {
    const response = await client.accountsBalanceGet({ access_token });
    res.json({ accounts: response.data.accounts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
