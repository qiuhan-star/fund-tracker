const acorn = require('acorn');
try{
  acorn.parse("let a=1;\n", { ecmaVersion: 2022 });
  console.log('parse("let a=1;\\n") OK');
}catch(e){ console.log('FAIL:', e.message); }
try{
  acorn.parse("let a=1;\n\n", { ecmaVersion: 2022 });
  console.log('parse("let a=1;\\n\\n") OK');
}catch(e){ console.log('FAIL:', e.message); }
try{
  acorn.parse("let a=1;", { ecmaVersion: 2022 });
  console.log('parse("let a=1;") OK');
}catch(e){ console.log('FAIL:', e.message); }
