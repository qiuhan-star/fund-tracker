// Vercel Node.js Serverless Function
// 代理天天基金历史净值接口，返回日频净值序列，用于计算自选基金涨跌幅
module.exports = async function handler(req, res) {
  const code = req.query && req.query.code;
  if (!code || !/^\d{6}$/.test(String(code))) {
    res.status(400).json({ error: 'invalid code' });
    return;
  }
  const url = 'https://fundf10.eastmoney.com/FundDataApi.ashx?type=lsjz&code='
    + encodeURIComponent(String(code))
    + '&page=1&per=60';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': 'https://fundf10.eastmoney.com/'
      }
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    const j = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).json(j);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
