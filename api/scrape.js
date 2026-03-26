export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url, pdf } = req.body;
  if (!url) { res.status(400).json({ error: 'URL required' }); return; }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': pdf ? 'application/pdf,*/*' : 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) { res.status(422).json({ error: 'Could not fetch URL' }); return; }

    const contentType = response.headers.get('content-type') || '';

    // If it's a PDF, return as base64
    if (pdf || contentType.includes('pdf')) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      res.status(200).json({ pdf: base64 });
      return;
    }

    // Otherwise return as cleaned text
    const html = await response.text();
    const cleaned = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
      .replace(/\s{2,}/g, ' ').trim().slice(0, 100000);

    if (cleaned.length > 300) { res.status(200).json({ content: cleaned }); return; }
    res.status(422).json({ error: 'Could not extract content' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
