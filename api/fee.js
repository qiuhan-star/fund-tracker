// Vercel Node.js Serverless Function
// 代理天天基金「基金费率」页，自动解析赎回费率多档（用于详情页赎回费提示）
// 数据源：fundf10.eastmoney.com/jjfl_{code}.html（服务端直出 HTML）
// 返回：{ ok:true, code, freeDays, tiers:[{d,rate,desc}], name, ts } 或 { ok:false, error }
module.exports = async function handler(req, res) {
  const code = req.query && req.query.code;
  if (!code || !/^\d{6}$/.test(String(code))) {
    res.status(400).json({ ok:false, error:'invalid code' });
    return;
  }
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const url = 'https://fundf10.eastmoney.com/jjfl_' + encodeURIComponent(String(code)) + '.html';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Referer': 'https://fundf10.eastmoney.com/' }
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ ok:false, error:'upstream '+r.status }); return; }
    const html = await r.text();
    const parsed = parseRedeem(html);
    if (!parsed || !parsed.tiers || !parsed.tiers.length) {
      res.status(200).json({ ok:false, error:'no fee data' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).json({ ok:true, code:String(code), freeDays:parsed.freeDays, tiers:parsed.tiers, ts:Date.now(), page:url });
  } catch (e) {
    res.status(502).json({ ok:false, error:String((e && e.message) || e) });
  }
};

// ---- 赎回费率解析 ----
function cnNum(s){
  s=String(s).trim();
  if(/^\d+$/.test(s)) return parseInt(s,10);
  const map={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,零:0};
  if(/^十$/.test(s)) return 10;
  const m=/^([一二三四五六七八九]?)(百|千|十)([一二三四五六七八九]?)$/.exec(s);
  if(m){ const u=m[2]==='百'?100:m[2]==='千'?1000:10; return (m[1]?(map[m[1]]||0):0)*u+(m[3]?(map[m[3]]||0):0); }
  return NaN;
}
function toStartDays(txt){
  txt=String(txt||'');
  let m;
  m=txt.match(/大于等于\s*([0-9一二三四五六七八九十百千]+)\s*(天|年|月)?/);
  if(m){ let n=cnNum(m[1]); const u=m[2]||'天'; if(u==='年')n*=365; else if(u==='月')n*=30; return n; }
  m=txt.match(/小于\s*([0-9一二三四五六七八九十百千]+)\s*(天|年|月)?/);
  if(m) return 0;
  m=txt.match(/(?:^|\s)([0-9一二三四五六七八九十百千]+)\s*(年|月|天)/);
  if(m){ let n=cnNum(m[1]); const u=m[2]; if(u==='年')n*=365; else if(u==='月')n*=30; return n; }
  return NaN;
}
function parseRateTxt(txt){ const m=String(txt||'').match(/(\d+(?:\.\d+)?)\s*%/); return m?parseFloat(m[1]):NaN; }
function parseRedeem(html){
  const tidx=html.indexOf('赎回费率');
  if(tidx<0) return null;
  let area=html.slice(tidx,tidx+6000);
  const t=area.match(/<table[^>]*jjfl[^>]*>([\s\S]*?)<\/table>/i);
  const body=t?t[1]:area;
  const rows=[]; const rowRe=/<tr[^>]*>([\s\S]*?)<\/tr>/gi; let rm;
  while((rm=rowRe.exec(body))){
    const tds=[]; const tdRe=/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi; let tm;
    while((tm=tdRe.exec(rm[1]))){ tds.push(tm[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim()); }
    if(tds.length>=2 && /%/.test(tds.join(' '))) rows.push(tds.slice(0,2));
  }
  const tiers=[];
  for(const rr of rows){
    const rate=parseRateTxt(rr[1]); if(isNaN(rate)) continue;
    let d=toStartDays(rr[0]); if(isNaN(d)) d=tiers.length?tiers[tiers.length-1].d:0;
    tiers.push({ d, rate, desc:rr[0] });
  }
  if(!tiers.length) return null;
  tiers.sort((a,b)=>a.d-b.d);
  let freeDays=null; for(const tt of tiers){ if(tt.rate<=0.001){ freeDays=tt.d; break; } }
  return { tiers, freeDays };
}