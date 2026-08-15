const acorn = require('acorn');
try{ acorn.parse("})();\n", { ecmaVersion: 2022, allowReturnOutsideFunction: true }); console.log('OK'); }
catch(e){ console.log('FAIL:', e.message); }
try{ acorn.parse("})();", { ecmaVersion: 2022, allowReturnOutsideFunction: true }); console.log('OK2'); }
catch(e){ console.log('FAIL2:', e.message); }
try{ acorn.parse("})()\n", { ecmaVersion: 2022, allowReturnOutsideFunction: true }); console.log('OK3'); }
catch(e){ console.log('FAIL3:', e.message); }
