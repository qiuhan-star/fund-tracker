// 用 acorn (Node 内置 dep) 解析找错
let acorn;
try{ acorn = require('acorn'); }catch(e){
  // 尝试本地 node_modules
  try{ acorn = require('/Users/qiuhan/.nvm/versions/node/lib/node_modules/acorn'); }catch(e2){
    console.log('acorn not available, try npm install');
    process.exit(0);
  }
}
const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
try{
  acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true });
  console.log('OK');
}catch(e){
  console.log('Error at line', e.loc && e.loc.line, 'col', e.loc && e.loc.column, ':', e.message);
  const lines = src.split('\n');
  if(e.loc){
    for(let i=Math.max(0,e.loc.line-3); i<Math.min(lines.length, e.loc.line+2); i++){
      console.log((i+1).toString().padStart(4), '|', lines[i]);
    }
  }
}
