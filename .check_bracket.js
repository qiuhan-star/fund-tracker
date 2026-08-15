const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];

let braces=0, parens=0, brackets=0;
let inStr=null, inComment=false, inLineComment=false;
for(let i=0;i<src.length;i++){
  const c=src[i], n=src[i+1], p=src[i-1];
  if(inLineComment){ if(c==='\n') inLineComment=false; continue; }
  if(inComment){ if(c==='*'&&n==='/'){inComment=false; i++; } continue; }
  if(inStr){
    if(c==='\\'){i++;continue;}
    if(c===inStr) inStr=null;
    continue;
  }
  if(c==='/'&&n==='/'){ inLineComment=true; i++; continue; }
  if(c==='/'&&n==='*'){ inComment=true; i++; continue; }
  if(c==='"'||c==="'"||c==='`'){ inStr=c; continue; }
  if(c==='{') braces++;
  if(c==='}') braces--;
  if(c==='(') parens++;
  if(c===')') parens--;
  if(c==='[') brackets++;
  if(c===']') brackets--;
  if(braces<0||parens<0||brackets<0){
    console.log('Negative at offset', i, 'line', src.substring(0,i).split('\n').length);
    console.log('Context:', JSON.stringify(src.substring(Math.max(0,i-40),i+40)));
    break;
  }
}
console.log('Final - braces:', braces, 'parens:', parens, 'brackets:', brackets);
