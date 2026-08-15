const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
// 完整复制成 .js 让 acorn 当 module 跑
const full = src;
// 把每行加一个前缀便于看错位置
const lines = full.split('\n');
let numbered = lines.map((l,i)=>`${(i+1).toString().padStart(5,' ')} | ${l}`).join('\n');
fs.writeFileSync('/tmp/b7_numbered.txt', numbered);
// 用 module 模式但用更严格
try{
  acorn.parse(full, { ecmaVersion: 2022, sourceType: 'script', locations: true });
  console.log('OK');
}catch(e){
  console.log('Error:', e.message);
  console.log('Loc:', JSON.stringify(e.loc));
  console.log('Pos:', e.pos);
  // 找位置
  const before = full.substring(0, e.pos);
  const lineNum = before.split('\n').length;
  console.log('Line in src:', lineNum);
  // 看 src 中出错位置前 100 字符
  console.log('Context:', JSON.stringify(full.substring(Math.max(0,e.pos-80), e.pos+20)));
}
