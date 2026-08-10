// Vercel Node.js Serverless Function
// 统一行情代理（解决东方财富 API 在云服务器 IP 被拦截、浏览器端 JSONP 受限的问题）：
//   - A股（sh/sz 前缀，含指数与 ETF）：走新浪日K线 money.finance.sina.com.cn，返回收盘价序列（迷你走势 + 涨跌% + 区间高低）。
//   - 港股 / 美股 / 全球（hk/us/jp/uk/kr 前缀）：走腾讯实时行情 qt.gtimg.cn（新浪 hq 对全球指数返回空，腾讯覆盖更全）。
// 入参：symbol（如 sh000001 / sh512480 / hkHSI / usDJI / usINX），可选 datalen（A股 K线默认 250）。
module.exports = async function handler(req, res) {
  const symbol = req.query && req.query.symbol;
  if (!symbol || !/^[a-zA-Z]{1,3}[a-zA-Z0-9_]{1,14}$/.test(String(symbol))) {
    res.status(400).json({ error: 'invalid symbol' });
    return;
  }
  const isIntl = !/^(sh|sz)/i.test(symbol);
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    let data;
    if (!isIntl) {
      // A股日K线（含收盘序列）
      const datalen = (req.query && req.query.datalen) || '250';
      const url = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol='
        + encodeURIComponent(symbol) + '&scale=240&ma=5&datalen=' + encodeURIComponent(datalen);
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, 'Referer': 'https://finance.sina.com.cn/' }
      });
      clearTimeout(timer);
      if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
      let text = await r.text();
      const m = text.match(/^\s*[A-Za-z_$][\w$]*\s*\(\s*([\s\S]*)\)\s*;?\s*$/);
      if (m) text = m[1];
      let arr;
      try { arr = JSON.parse(text); } catch (e) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      const closes = arr.map(k => +(k.close)).filter(v => isFinite(v) && v > 0);
      const last = closes.length ? closes[closes.length - 1] : null;
      const prev = closes.length > 1 ? closes[closes.length - 2] : null;
      const day = (last != null && prev > 0) ? (last - prev) / prev * 100 : null;
      let hi = null, lo = null;
      arr.forEach(k => { const h = +(k.high), l = +(k.low); if (isFinite(h) && h > 0 && (hi == null || h > hi)) hi = h; if (isFinite(l) && l > 0 && (lo == null || l < lo)) lo = l; });
      data = { symbol, closes, last, prev, day, high: hi, low: lo };
    } else {
      // 腾讯实时行情（港股/美股/全球指数）。格式 v_XXX="市场旗~名称~代码~当前~昨收~今开~...~时间~涨跌点~涨跌%~最高~最低~..."（~ 分隔）
      const url = 'https://qt.gtimg.cn/q=' + encodeURIComponent(symbol);
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, 'Referer': 'https://gu.qq.com/' }
      });
      clearTimeout(timer);
      if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
      const text = await r.text();
      const m = text.match(/=\s*"([\s\S]*?)"/);
      if (!m || !m[1]) { res.status(200).json({ symbol, closes: [], last: null, prev: null, day: null, high: null, low: null }); return; }
      const f = m[1].split('~');
      const price = parseFloat(f[3]);
      const prevClose = parseFloat(f[4]);
      const high = parseFloat(f[46]);
      const low = parseFloat(f[47]);
      const day = (isFinite(price) && isFinite(prevClose) && prevClose > 0) ? (price - prevClose) / prevClose * 100 : null;
      data = {
        symbol,
        closes: [],
        last: isFinite(price) ? price : null,
        prev: isFinite(prevClose) ? prevClose : null,
        day,
        high: isFinite(high) ? high : null,
        low: isFinite(low) ? low : null
      };
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
