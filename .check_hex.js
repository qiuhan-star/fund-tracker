const fs = require('fs');
const src = fs.readFileSync('/tmp/b7.js', 'utf8');
// 看末尾 100 字符
const tail = src.slice(-100);
console.log('Tail:', JSON.stringify(tail));
console.log('---');
for(let i=0;i<tail.length;i++){
  const c = tail[i];
  process.stdout.write(c.charCodeAt(0).toString(16).padStart(2,'0') + ' ');
  if(i % 16 === 15) process.stdout.write('\n');
}
process.stdout.write('\n');
