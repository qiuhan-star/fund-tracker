const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
const lines = src.split('\n');
// 写一个完整文件包含包装
const wrapped = '(function(){\n' + src + '\n})()';
const wLines = wrapped.split('\n');
// 错误在 9212:1，对应 src 的位置
// wrapped 的 line 9212 = src 的 line 9211 = lines[9210] = ?
console.log('src lines total:', lines.length);
console.log('wrapped lines total:', wLines.length);
// wrapped line 9212 = src line 9211 (因为多了一行 'function(){')
// 错误 col 1 = src lines[9210] col 1
console.log('src lines[9210]:', JSON.stringify(lines[9210]));  // 应该是 undefined
console.log('src lines[9209]:', JSON.stringify(lines[9209]));  // 应该是空字符串或最后一行
console.log('src lines[9208]:', JSON.stringify(lines[9208]));
