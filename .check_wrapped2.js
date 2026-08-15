const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
// 用 module 模式 parse
try{
  acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module' });
  console.log('module mode OK');
}catch(e){
  console.log('module mode FAIL at line', e.loc && e.loc.line, ':', e.message);
}
// 或者用 parseExpressionAt 多次
// 最简单：包成 function body
try{
  acorn.parse('(function(){\n' + src + '\n})()', { ecmaVersion: 2022 });
  console.log('wrapped IIFE OK');
}catch(e){
  console.log('wrapped IIFE FAIL at line', e.loc && e.loc.line, 'col', e.loc && e.loc.column, ':', e.message);
  const allLines = src.split('\n');
  if(e.loc){
    for(let i=Math.max(0,e.loc.line-3); i<Math.min(allLines.length, e.loc.line+2); i++){
      console.log((i+1).toString().padStart(4), '|', allLines[i].slice(0,200));
    }
  }
}
