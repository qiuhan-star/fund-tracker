const fs = require('fs');
const esprima = require('esprima');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
try{
  esprima.parseScript(src, { tolerant: false, jsx: false });
  console.log('OK');
}catch(e){
  console.log('Error at line', e.lineNumber, 'col', e.column, ':', e.message);
  const lines = src.split('\n');
  for(let i=Math.max(0,e.lineNumber-3); i<Math.min(lines.length, e.lineNumber+2); i++){
    console.log((i+1).toString().padStart(4), '|', lines[i].slice(0,150));
  }
}
