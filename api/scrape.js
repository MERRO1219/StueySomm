export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.body;
  if (!url) { res.status(400).json({ error: 'URL required' }); return; }

  try {
    // Try ScrapingBee first — handles JS-rendered sites (Wix, Squarespace etc.)
    const apiKey = process.env.SCRAPINGBEE_KEY;
    if (apiKey) {
      const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render_js=true&block_ads=true&block_resources=true`;
      const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(15000) });
      if (sbRes.ok) {
        const html = await sbRes.text();
        const cleaned = cleanHtml(html);
        if (cleaned.length > 300) {
          res.status(200).json({ content: cleaned });
          return;
        }
      }
    }

    // Fallback — simple fetch for plain HTML sites
    const plainRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimpleSomm/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    if (plainRes.ok) {
      const html = await plainRes.text();
      const cleaned = cleanHtml(html);
      if (cleaned.length > 300) {
        res.status(200).json({ content: cleaned });
        return;
      }
    }

    res.status(422).json({ error: 'Could not extract content from URL' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

function cleanHtml(h) {
  return h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim().slice(0, 100000);
}
