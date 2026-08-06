/**
 * pu-core.js —— 「平行宇宙」复盘推演 · 纯计算层（无 DOM / 无副作用）
 *
 * 本文件只做算法，不拼 HTML、不碰 localStorage、不改任何全局状态。
 * 所有函数均为纯函数：输入（f 持仓对象 + hist 历史净值 + ctx 上下文）→ 输出数据对象。
 * 渲染由 index.html 的 renderScenarioCard 负责，单测见 tests/pu-core.test.js。
 *
 * 同时支持两种加载方式：
 *   - 浏览器：<script src="pu-core.js"></script> 后挂到 window.PU
 *   - Node：   const PU = require('./pu-core.js')  （module.exports）
 */
(function (global) {
  'use strict';

  // ---------- 纯工具 ----------
  // 取 ds(YYYY-MM-DD) 当日或之前最近一条净值
  function navOnOrBefore(arr, ds) {
    if (!arr || !arr.length) return null;
    const target = new Date(String(ds).replace(/-/g, '/'));
    let best = null;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].t <= target) best = arr[i].nav; else break;
    }
    return best;
  }

  // 取某基金的全部「买入 / 转换转入」笔（按日期升序）
  function buyLots(f, trades) {
    return (trades || []).filter(t => t.name === f.name)
      .filter(t => (t.type === 'buy' || t.type === 'convert') && (+t.amount > 0) && t.nav != null && t.nav !== '')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  // 当前单位净值：优先缓存，其次用份额推算（只读，不修改）
  function curUnitOf(f, navCache) {
    if (navCache && navCache[f.name] && navCache[f.name].nav) return navCache[f.name].nav;
    if (f.shares > 0) return f.mv / f.shares;
    return null;
  }

  // ---------- A. 躺平不动 vs 实际操作 ----------
  function computeLazyHold(f, ctx) {
    const trades = ctx.trades || [];
    const buys = trades.filter(t => t.name === f.name)
      .filter(t => (t.type === 'buy' || t.type === 'convert') && (+t.amount > 0) && t.nav != null && t.nav !== '')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (!buys.length) return { empty: true, reason: 'noBuy' };
    const fb = buys[0];
    const inv = +fb.amount;
    const sh = inv / (+fb.nav);
    const curUnit = curUnitOf(f, ctx.navCache);
    if (curUnit == null) return { empty: true, reason: 'noNav' };
    const lazyVal = sh * curUnit;
    const lazyProfit = lazyVal - inv;
    const realProfit = (f.profit || 0) + (f.realized || 0);
    const diff = realProfit - lazyProfit;
    const pct = inv > 0 ? (diff / inv * 100) : 0;
    return {
      empty: false, inv, shares: sh, curUnit, lazyVal, lazyProfit,
      realProfit, diff, pct, better: diff >= 0
    };
  }

  // ---------- B. 定投版（从首笔月起每月定投到 today） ----------
  function computeDCA(f, hist, ctx) {
    const buys = buyLots(f, ctx.trades);
    if (!buys.length) return { empty: true, reason: 'noBuy' };
    const fb = buys[0];
    const monthly = Math.max(100, Math.round(fb.amount));
    const start = new Date((fb.date || '1970-01-01').replace(/-/g, '/'));
    const today = ctx.today || new Date();
    const dom = Math.min(28, start.getDate());
    const todayStr = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    let y = start.getFullYear(), m = start.getMonth(), totalInv = 0, totalSh = 0, months = 0;
    while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
      const ds = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + dom).slice(-2);
      if (ds <= todayStr) {
        const nav = navOnOrBefore(hist, ds);
        if (nav != null && nav > 0) { totalInv += monthly; totalSh += monthly / nav; months++; }
      }
      if (m === 11) { m = 0; y++; } else m++;
    }
    const curUnit = curUnitOf(f, ctx.navCache) || (hist && hist.length ? hist[hist.length - 1].nav : null);
    if (curUnit == null || months === 0) return { empty: true, reason: 'noNav' };
    const endVal = totalSh * curUnit;
    const profit = endVal - totalInv;
    const retPct = totalInv > 0 ? profit / totalInv * 100 : 0;
    const yrs = months / 12;
    const annual = (yrs > 0 && retPct / 100 > -1) ? (Math.pow(1 + retPct / 100, 1 / yrs) - 1) * 100 : null;
    const realInv = f.cost || 0;
    const realTotal = (f.profit || 0) + (f.realized || 0);
    const realRet = realInv > 0 ? realTotal / realInv * 100 : 0;
    return {
      empty: false, monthly, totalInv, totalSh, months, curUnit, endVal,
      profit, retPct, annual, realInv, realRet, better: retPct >= realRet, fbDate: fb.date
    };
  }

  // ---------- C. 分批建仓 vs 一次性 ----------
  function computeBatchBuild(f, ctx) {
    const buys = buyLots(f, ctx.trades);
    if (!buys.length) return { empty: true, reason: 'noBuy' };
    const fb = buys[0];
    let sAmt = 0, sSh = 0;
    buys.forEach(function (b) {
      const amt = +b.amount;
      const sh = (b.shares > 0) ? +b.shares : (+b.nav > 0 ? amt / +b.nav : 0);
      sAmt += amt; sSh += sh;
    });
    if (sSh <= 0) return { empty: true, reason: 'noShares' };
    const wAvg = sAmt / sSh;
    const firstNav = +fb.nav;
    const diffPct = (wAvg - firstNav) / firstNav * 100;
    const costDiff = sAmt * (wAvg - firstNav);
    const months = new Set(buys.map(function (b) { return b.date.slice(0, 7); })).size;
    return {
      empty: false, count: buys.length, months, firstNav, wAvg, diffPct, costDiff,
      fbDate: fb.date, cheaper: diffPct < 0
    };
  }

  // ---------- D. 止盈 / 止损假设 ----------
  function computeStopTarget(f, hist, ctx) {
    const buys = buyLots(f, ctx.trades);
    if (!buys.length || !hist || !hist.length) return { empty: true, reason: 'noData' };
    const fb = buys[0];
    const fbDate = new Date((fb.date || '1970-01-01').replace(/-/g, '/'));
    let sA = 0, sS = 0;
    buys.forEach(function (b) {
      const a = +b.amount;
      const s = (b.shares > 0) ? +b.shares : (+b.nav > 0 ? a / +b.nav : 0);
      sA += a; sS += s;
    });
    const costPx = f.costPx || (sS > 0 ? sA / sS : fb.nav);
    let minNav = Infinity, maxNav = -Infinity, minP = null, maxP = null;
    hist.forEach(function (p) {
      if (p.t >= fbDate) {
        if (p.nav < minNav) { minNav = p.nav; minP = p; }
        if (p.nav > maxNav) { maxNav = p.nav; maxP = p; }
      }
    });
    if (!minP || !maxP) return { empty: true, reason: 'noSpan' };
    const spanHi = (maxNav - costPx) / costPx * 100;
    const spanLo = (minNav - costPx) / costPx * 100;
    function firstReach(test) {
      for (let i = 0; i < hist.length; i++) {
        if (hist[i].t >= fbDate && test(hist[i].nav)) return hist[i];
      }
      return null;
    }
    const tp = firstReach(function (n) { return n >= costPx * 1.2; });
    const sl = firstReach(function (n) { return n <= costPx * 0.9; });
    const hold = f.profit || 0;
    const tpGain = tp ? f.shares * tp.nav - f.cost : null;
    const slLoss = sl ? f.shares * sl.nav - f.cost : null;
    const minLoss = f.shares * minNav - f.cost;
    return {
      empty: false, costPx, minNav, maxNav,
      minDate: minP.t, maxDate: maxP.t, spanHi, spanLo,
      tp: tp ? { date: tp.t.toISOString().slice(0, 10), gain: tpGain } : null,
      sl: sl ? { date: sl.t.toISOString().slice(0, 10), loss: slLoss } : null,
      minLoss, hold, holdBetterThanTp: (tp && hold > tpGain)
    };
  }

  // ---------- E. 转换来源分析 ----------
  function computeConvertSource(f, ctx) {
    const allTr = (ctx.trades || []).filter(function (t) { return t.name === f.name; });
    const convIns = allTr.filter(function (t) { return t.type === 'convert'; });
    const fresh = allTr.filter(function (t) { return t.type === 'buy'; });
    if (!convIns.length && !fresh.length) return { empty: true, reason: 'noTrades' };
    const convAmt = convIns.reduce(function (a, t) { return a + (+t.amount || 0); }, 0);
    const freshAmt = fresh.reduce(function (a, t) { return a + (+t.amount || 0); }, 0);
    const total = convAmt + freshAmt;
    const ratio = total > 0 ? convAmt / total * 100 : 0;
    return {
      empty: false, convAmt, freshAmt, total,
      convCount: convIns.length, freshCount: fresh.length, ratio,
      mostlyConvert: ratio >= 50
    };
  }

  // ---------- F. 补仓模拟（回本 / 补仓算法） ----------
  function computeAddPosition(f, add, nav) {
    if (nav == null) nav = f.nav || (f.shares ? f.mv / f.shares : 0);
    const curCost = f.costPx || (f.shares ? f.cost / f.shares : 0);
    const a = +add || 0;
    if (a <= 0 || nav <= 0 || !f.shares) return { empty: true, reason: 'invalid' };
    const totCost = (f.cost != null ? f.cost : curCost * f.shares) + a;
    const newShares = f.shares + a / nav;
    const newCostPx = newShares > 0 ? totCost / newShares : 0;
    const newNeed = nav > 0 ? (newCostPx - nav) / nav * 100 : 0;
    const dir = newCostPx < curCost ? '降到' : newCostPx > curCost ? '升到' : '持平';
    return { empty: false, nav, curCost, add: a, totCost, newShares, newCostPx, newNeed, dir };
  }

  const PU = {
    navOnOrBefore, buyLots, curUnitOf,
    computeLazyHold, computeDCA, computeBatchBuild,
    computeStopTarget, computeConvertSource, computeAddPosition
  };

  if (typeof window !== 'undefined') window.PU = PU;
  if (typeof module !== 'undefined' && module.exports) module.exports = PU;
})(typeof window !== 'undefined' ? window : globalThis);
