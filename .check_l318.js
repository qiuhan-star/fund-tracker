const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
const lines = src.split('\n');
// 看 318 行
console.log('Line 318:', JSON.stringify(lines[317]));
console.log('Line 319:', JSON.stringify(lines[318]));
console.log('Line 320:', JSON.stringify(lines[319]));
console.log('Line 321:', JSON.stringify(lines[320]));
console.log('Line 322:', JSON.stringify(lines[321]));
console.log('Line 323:', JSON.stringify(lines[322]));
