const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
console.log('src length:', src.length);
console.log('last 30 chars:', JSON.stringify(src.slice(-30)));
// 看末尾字符
console.log('charCodes:', [...src.slice(-5)].map(c=>c.charCodeAt(0)));
