function ehParseAlipayText(raw){
  const result={mv:null,profit:null,shares:null,nav:null,costPrice:null};
  if(!raw) return result;
  const txt=raw.replace(/[—–]/g,'-').replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))
               .replace(/[ \t]+/g,' ').replace(/\n+/g,'\n');
  const lines=txt.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean);
  const grab=function(s){
    const m=s.match(/[-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|[-]?\d+(?:\.\d+)?%?/);
    if(!m) return null;
    return parseFloat(m[0].replace(/[,%]/g,''));
  };
  const grabAfter=function(s, labelPattern){
    const re=new RegExp(labelPattern+'[^\\d\\-]*([-]?\\d[\\d,]*(?:\\.\\d+)?%?)');
    const m=s.match(re);
    if(!m) return null;
    return parseFloat(m[1].replace(/[,%]/g,''));
  };
  for(const line of lines){
    if(result.mv==null && /(?:金额.{0,3}元|当前持有.{0,3}元|持有金额|持仓金额|市值)/.test(line) && !/收益|成本|净值|份额|待确认/.test(line)){
      const v=grabAfter(line,'(?:金额.{0,3}元|当前持有.{0,3}元|持有金额|持仓金额|市值)');
      if(v!=null) result.mv=v;
    }
    if(result.profit==null && /持有收益|累计收益|总收益|浮动盈亏/.test(line)){
      const v=grabAfter(line,'(?:持有收益|累计收益|总收益|浮动盈亏)');
      if(v!=null) result.profit=v;
    }
    if(result.shares==null && /持有份额|总份额/.test(line)){
      const v=grabAfter(line,'(?:持有份额|总份额)');
      if(v!=null) result.shares=v;
    }
    if(result.costPrice==null && /(?:持仓)?(?:成本价|持有成本|持仓成本)/.test(line)){
      const v=grabAfter(line,'(?:持仓)?(?:成本价|持有成本|持仓成本)');
      if(v!=null) result.costPrice=v;
    }
    if(result.nav==null && /基金净值|单位净值/.test(line) && !/累计|估算|涨跌/.test(line)){
      const v=grabAfter(line,'(?:基金净值|单位净值)');
      if(v!=null) result.nav=v;
    }
  }
  if(result.profit==null){
    for(const line of lines){
      if(/累计收益|总收益/.test(line)){ result.profit=grabAfter(line,'(?:累计收益|总收益)'); if(result.profit!=null) break; }
    }
  }
  for(let i=0; i<lines.length-1; i++){
    const merged=lines[i]+' '+lines[i+1];
    if(result.mv==null && /(?:金额.{0,3}元|当前持有.{0,3}元|持有金额|持仓金额|市值)/.test(merged) && !/收益|成本|净值|份额|待确认/.test(merged)){
      const m=merged.match(/(?:金额.{0,3}元|当前持有.{0,3}元|持有金额|持仓金额|市值)[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
      if(m) result.mv=parseFloat(m[1].replace(/,/g,''));
    }
    if(result.profit==null && /持有收益/.test(merged)){
      const m=merged.match(/持有收益[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
      if(m) result.profit=parseFloat(m[1].replace(/,/g,''));
    }
  }
  if(result.profit==null){
    for(let i=0; i<lines.length-1; i++){
      const merged=lines[i]+' '+lines[i+1];
      if(/累计收益/.test(merged)){
        const m=merged.match(/累计收益[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
        if(m){ result.profit=parseFloat(m[1].replace(/,/g,'')); break; }
      }
    }
  }
  if(result.mv==null){
    const m=txt.match(/(?:金额.{0,3}元|当前持有.{0,3}元|持有金额|持仓金额|市值)[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
    if(m) result.mv=parseFloat(m[1].replace(/,/g,''));
  }
  if(result.profit==null){
    let m=txt.match(/持有收益[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
    if(!m) m=txt.match(/累计收益[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/);
    if(!m){ const fixed=txt.replace(/[—–]/g,'-'); m=fixed.match(/(?:持有|累计)?收益.{0,3}元[^\d\-]*([-]?\d[\d,]*(?:\.\d+)?)/); }
    if(m) result.profit=parseFloat(m[1].replace(/,/g,''));
  }
  if(result.shares==null){
    const m=txt.match(/份额[^\d\-]*([\d,]+\.?\d*)/);
    if(m) result.shares=parseFloat(m[1].replace(/,/g,''));
  }
  if(result.costPrice==null){
    const m=txt.match(/(?:持仓)?(?:成本价|持有成本|持仓成本)[^\d\-]*([\d,]+\.?\d*)/);
    if(m) result.costPrice=parseFloat(m[1].replace(/,/g,''));
  }
  if(result.nav==null){
    const m=txt.match(/(?:基金|单位)?净值[^\d\-]*([\d,]+\.?\d*)/);
    if(m) result.nav=parseFloat(m[1].replace(/,/g,''));
  }
  return result;
}

const goldText = `博时黄金ETF联接C
002611 中风险
当前持有(元)
19.36
昨日收益(元) 持有收益(元) 持有收益率
-0.11 -1.30 -6.29%
持有金额 19.36 待确认金额 0.00
持有份额 6.56 基金净值 2.9506 (08-14)
日涨幅 -0.95% 持有成本 3.1487`;

console.log('黄金基金解析结果:', JSON.stringify(ehParseAlipayText(goldText), null, 2));

const regularText = `易方达蓝筹精选混合
005827 中高风险
当前持有(元)
12345.67
昨日收益(元) 持有收益(元) 持有收益率
123.45 2345.67 23.45%
持有金额 12345.67 待确认金额 0.00
持有份额 456.78 基金净值 2.7045 (08-14)
日涨幅 1.23% 持仓成本价 2.1800`;

console.log('普通基金解析结果:', JSON.stringify(ehParseAlipayText(regularText), null, 2));
