// pages/api/search-sources.js
import { getSearchSourcesForQuery } from '../../lib/searchSources';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { q = '' } = req.query;
  res.json({ sources: getSearchSourcesForQuery(String(q)) });
}
