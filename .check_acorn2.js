const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
try{
  acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true });
  console.log('OK - syntax valid');
}catch(e){
  console.log('Error at line', e.loc && e.loc.line, 'col', e.loc && e.loc.column, ':', e.message);
  const lines = src.split('\n');
  if(e.loc){
    for(let i=Math.max(0,e.loc.line-3); i<Math.min(lines.length, e.loc.line+2); i++){
      console.log((i+1).toString().padStart(4), '|', lines[i].slice(0,200));
    }
  }
}
