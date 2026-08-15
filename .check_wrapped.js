const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
// 包一个外层 function 让所有 })(); 变成函数内调用
const wrapped = '(function(){\n' + src + '\n})();';
try{
  acorn.parse(wrapped, { ecmaVersion: 2022, allowReturnOutsideFunction: true });
  console.log('OK - wrapped syntax valid');
}catch(e){
  console.log('Error at line', e.loc && e.loc.line, 'col', e.loc && e.loc.column, ':', e.message);
  const allLines = wrapped.split('\n');
  if(e.loc){
    for(let i=Math.max(0,e.loc.line-3); i<Math.min(allLines.length, e.loc.line+2); i++){
      console.log((i+1).toString().padStart(4), '|', allLines[i].slice(0,200));
    }
  }
}
