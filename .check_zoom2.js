const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
const lines = src.split('\n');

// 看 300-320 行附近
console.log('Lines 300-320:');
for(let i=300;i<320;i++){
  console.log((i+1).toString().padStart(4), '|', lines[i].slice(0,150));
}
