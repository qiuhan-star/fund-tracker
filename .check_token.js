const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
const lines = src.split('\n');

// 把 1-318 行单独 parse
const slice = lines.slice(0, 318).join('\n');
try{
  new Function(slice);
  console.log('Lines 1-318: OK');
}catch(e){
  console.log('Lines 1-318 FAIL:', e.message);
}

// 检查 token 数
let so=0, sc=0, po=0, pc=0, bo=0, bc=0, sqo=0, sqc=0, dq=0, bt=0;
for(const c of slice){
  if(c==='{') so++; if(c==='}') sc++;
  if(c==='(') po++; if(c===')') pc++;
  if(c==='[') bo++; if(c===']') bc++;
  if(c==="'") sqo++; if(c==='"') dq++; if(c==='`') bt++;
}
console.log('Counts in 1-318:', '{', so, '/}', sc, '(', po, '/)', pc, '[', bo, '/]', bc, 'sq:', sqo, 'dq:', dq, 'bt:', bt);
console.log('Parity: { }=', so===sc, '( )=', po===pc, '[ ]=', bo===bc);
console.log('Single quote parity:', sqo%2, 'Double quote parity:', dq%2, 'Backtick parity:', bt%2);
