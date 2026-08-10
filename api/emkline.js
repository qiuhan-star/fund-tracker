// Vercel Node.js Serverless Function
// 代理东方财富「历史 K 线」接口（push2his.eastmoney.com），解决浏览器端拉取失败：
//   1) 东方财富对 JSONP 做了 Referer/防盗链校验，浏览器从 vercel.app 发起的 <script> 请求被拒（onerror）；
//   2) 服务端用 fetch 拉取，伪装 Referer=quote.eastmoney.com，绕过防盗链，返回干净 JSON（带 ACAO:*）。
// 入参：secid（如 1.000001 / 100.HSI / 100.DJI）、fields2（可选，默认 f51,f52,f53,f54,f55,f56）、klt（默认 101 日线）
module.exports = async function handler(req, res) {
  const secid = req.query && req.query.secid;
  if (!secid || !/^[0-9]+\.[A-Za-z0-9.]+$/.test(String(secid))) {
    res.status(400).json({ error: 'invalid secid' });
    return;
  }
  const fields2 = (req.query && req.query.fields2) || 'f51,f52,f53,f54,f55,f56';
  const klt = (req.query && req.query.klt) || '101';
  const d = new Date(); const beg = new Date(d.getTime() - 480 * 864e5);
  const fmt = x => x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0');
  const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=' + encodeURIComponent(secid)
    + '&fields1=f1,f2,f3&fields2=' + encodeURIComponent(fields2) + '&klt=' + encodeURIComponent(klt)
    + '&fqt=1&beg=' + fmt(beg) + '&end=20500101';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    let text = await r.text();
    // 兼容上游返回裸 JSON 或 JSONP(callback 包裹)：统一剥壳为裸 JSON
    const m = text.match(/^\s*[A-Za-z_$][\w$]*\s*\(\s*([\s\S]*)\)\s*;?\s*$/);
    if (m) text = m[1];
    const obj = JSON.parse(text);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(obj);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
