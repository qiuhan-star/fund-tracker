const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
const lines = src.split('\n');
// 提取 9207-9211
for(let i=9207;i<=9211;i++){
  const l=lines[i-1]||'';
  console.log(i, JSON.stringify(l.slice(0,100)));
}
// 试只 parse 9207-9211 行
const sub = lines.slice(9206, 9211).join('\n');
try{ acorn.parse(sub, { ecmaVersion: 2022 }); console.log('9207-9211 OK'); }
catch(e){ console.log('9207-9211 FAIL:', e.message); }
// 试 1-9210
const sub2 = lines.slice(0, 9210).join('\n');
try{ acorn.parse(sub2, { ecmaVersion: 2022, allowReturnOutsideFunction: true }); console.log('1-9210 OK'); }
catch(e){ console.log('1-9210 FAIL:', e.message); }
// 试 1-9209
const sub3 = lines.slice(0, 9209).join('\n');
try{ acorn.parse(sub3, { ecmaVersion: 2022, allowReturnOutsideFunction: true }); console.log('1-9209 OK'); }
catch(e){ console.log('1-9209 FAIL:', e.message); }
