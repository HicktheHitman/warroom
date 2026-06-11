export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith('https://')) {
    return res.status(400).json({ error: 'Missing or invalid url param' });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARROOM-RSS/1.0)' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }

    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
