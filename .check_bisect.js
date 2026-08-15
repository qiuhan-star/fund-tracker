// 二分查找错误行
const fs = require('fs');
const html = fs.readFileSync('/Users/qiuhan/Documents/GitHub/fund-tracker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const src = scripts[7][1];
const lines = src.split('\n');
console.log('Total lines in block 7:', lines.length);

// 用一个小的简单 tokenizer
function tryParse(upToLine){
  const slice = lines.slice(0, upToLine).join('\n');
  try{
    new Function(slice);
    return true;
  }catch(e){
    return e.message;
  }
}

// 二分找最后能解析的行
let lo=0, hi=lines.length;
while(lo<hi-1){
  const mid=Math.floor((lo+hi)/2);
  const r=tryParse(mid);
  if(r===true) lo=mid;
  else hi=mid;
}
console.log('Last good line:', lo);
console.log('First bad line:', hi);
console.log('Bad line content:', JSON.stringify(lines[hi-1]));
console.log('Context:');
for(let i=Math.max(0,hi-3); i<Math.min(lines.length,hi+2); i++){
  console.log((i+1).toString().padStart(4), '|', lines[i].slice(0,120));
}
