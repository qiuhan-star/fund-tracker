const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
const lines = src.split('\n');

// 测试只到 300 行
for(let end=300;end<=320;end++){
  const slice = lines.slice(0, end).join('\n');
  try{
    new Function(slice);
    console.log(end, 'OK');
  }catch(e){
    console.log(end, 'FAIL:', e.message.slice(0,100));
  }
}
