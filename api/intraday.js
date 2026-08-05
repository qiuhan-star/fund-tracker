// Vercel Node.js Serverless Function
// 代理新浪基金「盘中估值分时」接口，解决两个浏览器端无法绕过的问题：
//   1) 新浪响应正文开头含裸 </script>，用 <script src> 注入 JSONP 时会被 HTML 解析器提前截断，回调永不执行；
//   2) 新浪不返回 CORS 头，浏览器 fetch 直连被拦。
// 本函数在服务端拉取新浪、剥掉 /*...*/ 反爬前缀与 callback(...) 包裹，返回干净 JSON（带 ACAO:* 允许跨域）。
module.exports = async function handler(req, res) {
  const code = req.query && req.query.code;
  if (!code || !/^\d{6}$/.test(String(code))) {
    res.status(400).json({ error: 'invalid code' });
    return;
  }
  const url = 'https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/FdFundService.getEstimateNetworthPic?symbol='
    + encodeURIComponent(String(code)) + '&callback=cb';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': 'https://finance.sina.com.cn/'
      }
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    let text = await r.text();
    // 去掉开头的 /*<script>location.href=...;</script>*/ 反爬前缀
    text = text.replace(/^\s*\/\*[\s\S]*?\*\//, '');
    // 去掉 callback(...) 包裹，只保留内部 JSON 对象
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
