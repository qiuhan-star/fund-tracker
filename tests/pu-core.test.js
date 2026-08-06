// tests/pu-core.test.js
// 纯计算层单测（无 DOM / 无 localStorage 依赖，Node 直接跑）：
//   node tests/pu-core.test.js
const PU = require('../pu-core.js');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? (' -> ' + extra) : '')); }
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }

// 构造按月历史净值
function mkHist(start, navs) {
  const arr = [];
  let d = new Date(start);
  for (const n of navs) { arr.push({ t: new Date(d), nav: n }); d.setMonth(d.getMonth() + 1); }
  return arr;
}

console.log('computeLazyHold');
{
  const f = { name: 'F', shares: 1000, mv: 12000, cost: 10000, profit: 1000, realized: 200 };
  const ctx = {
    trades: [{ name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15' }],
    navCache: { 'F': { nav: 12 } },
    today: new Date('2026-08-05')
  };
  const d = PU.computeLazyHold(f, ctx);
  ok('normal not empty', !d.empty);
  ok('inv=5000', d.inv === 5000);
  ok('shares=500', approx(d.shares, 500));
  ok('curUnit=12', d.curUnit === 12);
  ok('lazyProfit=1000', approx(d.lazyProfit, 1000));
  ok('realProfit=1200', d.realProfit === 1200);
  ok('diff=200', d.diff === 200);
  ok('better=true (操作净赚)', d.better === true);

  const e = PU.computeLazyHold({ name: 'X' }, ctx);
  ok('empty: noBuy', e.empty && e.reason === 'noBuy');

  const e2 = PU.computeLazyHold({ name: 'F', shares: 0 }, {
    trades: [{ name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15' }],
    navCache: {}, today: new Date()
  });
  ok('empty: noNav', e2.empty && e2.reason === 'noNav');
}

console.log('computeDCA');
{
  const f = { name: 'F', cost: 10000, profit: 1000, realized: 200, shares: 1000, mv: 12000 };
  const ctx = {
    trades: [{ name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15' }],
    navCache: { 'F': { nav: 12 } },
    today: new Date('2026-08-05')
  };
  const hist = mkHist('2024-12-01', [9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75, 14, 14.25, 14.5, 14.75]);
  const d = PU.computeDCA(f, hist, ctx);
  ok('normal not empty', !d.empty);
  ok('monthly=5000', d.monthly === 5000);
  ok('months>0', d.months > 0);
  ok('endVal>0', d.endVal > 0);
  ok('profit=endVal-totalInv', approx(d.profit, d.endVal - d.totalInv));
  ok('retPct 是数字', typeof d.retPct === 'number');
  ok('better 是布尔', typeof d.better === 'boolean');
  ok('fbDate 透传', d.fbDate === '2025-01-15');

  const e = PU.computeDCA(f, [], ctx);
  ok('empty: noNav 无历史', e.empty && e.reason === 'noNav');
  const e2 = PU.computeDCA({ name: 'X' }, hist, ctx);
  ok('empty: noBuy', e2.empty && e2.reason === 'noBuy');
}

console.log('computeBatchBuild');
{
  const f = { name: 'F' };
  const ctx = {
    trades: [
      { name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15', shares: 500 },
      { name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-03-20', shares: 500 },
      { name: 'F', type: 'convert', amount: 3000, nav: 11, date: '2025-06-01' }
    ],
    navCache: {}, today: new Date()
  };
  const d = PU.computeBatchBuild(f, ctx);
  ok('normal not empty', !d.empty);
  ok('count=3', d.count === 3);
  ok('firstNav=10', d.firstNav === 10);
  ok('wAvg>0', d.wAvg > 0);
  ok('cheaper 是布尔', typeof d.cheaper === 'boolean');
  ok('fbDate 透传', d.fbDate === '2025-01-15');

  const e = PU.computeBatchBuild({ name: 'X' }, ctx);
  ok('empty: noBuy', e.empty && e.reason === 'noBuy');
}

console.log('computeStopTarget');
{
  const f = { name: 'F', shares: 1000, cost: 10000, costPx: 10, profit: 500 };
  // 净值序列：10,9,8.5,9,11,12,13,12 —— 成本10 → +20%触发于12，-10%触发于9
  const hist = mkHist('2025-01-01', [10, 9, 8.5, 9, 11, 12, 13, 12]);
  const ctx = {
    trades: [{ name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15' }],
    navCache: {}, today: new Date()
  };
  const d = PU.computeStopTarget(f, hist, ctx);
  ok('normal not empty', !d.empty);
  ok('tp 触发(gain>0)', d.tp && d.tp.gain > 0);
  ok('sl 触发(loss<0)', d.sl && d.sl.loss < 0);
  ok('spanHi>0', d.spanHi > 0);
  ok('spanLo<0', d.spanLo < 0);

  const e = PU.computeStopTarget(f, [], ctx);
  ok('empty: noData 无历史', e.empty && e.reason === 'noData');
}

console.log('computeConvertSource');
{
  const ctx = {
    trades: [
      { name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-01-15' },
      { name: 'F', type: 'buy', amount: 5000, nav: 10, date: '2025-03-20' },
      { name: 'F', type: 'convert', amount: 3000, nav: 11, date: '2025-06-01' }
    ],
    navCache: {}, today: new Date()
  };
  const d = PU.computeConvertSource({ name: 'F' }, ctx);
  ok('normal not empty', !d.empty);
  ok('convAmt=3000', d.convAmt === 3000);
  ok('freshAmt=10000', d.freshAmt === 10000);
  ok('ratio=23.0769%', approx(d.ratio, 3000 / 13000 * 100, 1e-6));
  ok('mostlyConvert=false', d.mostlyConvert === false);

  const ctx2 = {
    trades: [
      { name: 'F', type: 'convert', amount: 8000, nav: 11, date: '2025-06-01' },
      { name: 'F', type: 'buy', amount: 2000, nav: 10, date: '2025-01-15' }
    ],
    navCache: {}, today: new Date()
  };
  const d2 = PU.computeConvertSource({ name: 'F' }, ctx2);
  ok('mostlyConvert=true 当 ratio>=50', d2.mostlyConvert === true);

  const e = PU.computeConvertSource({ name: 'X' }, ctx);
  ok('empty: noTrades', e.empty && e.reason === 'noTrades');
}

console.log('computeAddPosition');
{
  const f = { name: 'F', shares: 1000, mv: 12000, cost: 10000, costPx: 10, nav: 12 };
  const d = PU.computeAddPosition(f, 2000, 12);
  ok('normal not empty', !d.empty);
  ok('nav=12 (来自 DOM 派生价)', d.nav === 12);
  ok('curCost=10', d.curCost === 10);
  ok('newShares=1000+2000/12', approx(d.newShares, 1000 + 2000 / 12));
  ok('totCost=12000', d.totCost === 12000);
  ok('newCostPx>0', d.newCostPx > 0);
  ok('dir 取值合法', ['降到', '升到', '持平'].includes(d.dir));

  const e = PU.computeAddPosition(f, 0, 12);
  ok('empty: add<=0', e.empty && e.reason === 'invalid');
  const e2 = PU.computeAddPosition({ name: 'F', shares: 0 }, 2000, 12);
  ok('empty: shares=0', e2.empty && e2.reason === 'invalid');
}

console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed ====');
process.exit(fail > 0 ? 1 : 0);
