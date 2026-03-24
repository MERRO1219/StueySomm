export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.body;
  if (!url) { res.status(400).json({ error: 'URL required' }); return; }

  try {
    // Try ScrapingBee if key is available (optional paid upgrade)
    const sbKey = process.env.SCRAPINGBEE_KEY;
    if (sbKey) {
      const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${sbKey}&url=${encodeURIComponent(url)}&render_js=true&block_ads=true&block_resources=true`;
      const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(15000) });
      if (sbRes.ok) {
        const html = await sbRes.text();
        const cleaned = cleanHtml(html);
        if (cleaned.length > 300) { res.status(200).json({ content: cleaned }); return; }
      }
    }

    // Free fallback — direct fetch with real browser headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    };

    const plainRes = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (plainRes.ok) {
      const html = await plainRes.text();
      const cleaned = cleanHtml(html);
      if (cleaned.length > 300) { res.status(200).json({ content: cleaned }); return; }
    }

    res.status(422).json({ error: 'Could not extract content' });
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
