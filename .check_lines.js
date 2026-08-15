const fs = require('fs');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
const lines = src.split('\n');
// 显示 9205-9212
for(let i=9205;i<9212;i++){
  console.log((i+1).toString().padStart(4), JSON.stringify(lines[i]));
}
