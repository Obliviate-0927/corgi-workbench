// 抓取国家税务总局 12366 全国办税日历（公开、无需登录、河南适用）
// 输出 taxdue.json：{updated, source, items:[{date,title,org,note}]}
// 用法：node fetch-taxdue.js  （Node 18+ 内置 fetch，无需安装任何包）
const fs = require('fs');
const path = require('path');

const API = 'http://12366.chinatax.gov.cn/bsfw/calendar/getCalendarListForMonth';
const REF = 'http://12366.chinatax.gov.cn/bsfw/calendar/main';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

// 代账日常关心的核心税种/费种（白名单，避免各省特殊事项噪音）
const KEYS = ['增值税','企业所得税','个人所得税','消费税','印花税','城市维护建设税','城建税',
  '教育费附加','地方教育','资源税','环境保护税','契税','房产税','城镇土地使用税','土地增值税',
  '车船税','车辆购置税','耕地占用税','烟叶税','文化事业建设费','水利建设','工会经费',
  '残疾人就业保障金','社保费','基本养老','基本医疗','社会保险'];

function keep(title){
  return KEYS.some(k => title.includes(k));
}
function pad(n){ return String(n).padStart(2,'0'); }
function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }

(async () => {
  const now = new Date();
  const today = ymd(now);
  // 目标：当月 + 未来 2 个月
  const targets = [];
  for (let i = 0; i < 3; i++){
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    targets.push({ y: d.getFullYear(), m: d.getMonth() + 1, key: d.getFullYear()+'-'+pad(d.getMonth()+1) });
  }
  const last = targets[targets.length - 1];
  const lastDay = new Date(last.y, last.m, 0); // 末月最后一天
  const windowEnd = ymd(lastDay);

  let items = [];
  for (const t of targets){
    try{
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(`${API}?year=${t.y}&month=${t.m}`, {
        signal: ctrl.signal, headers: { 'User-Agent': UA, 'Referer': REF }
      });
      clearTimeout(to);
      if (!r.ok) { console.log(`  ✗ ${t.key} HTTP ${r.status}`); continue; }
      const j = await r.json();
      const list = (j && j.json && j.json.list) || [];
      let cnt = 0;
      for (const x of list){
        if (x.sfyx !== '1') continue;
        const date = (x.bsjssj || '').slice(0, 10);
        if (!date) continue;
        if (date < today || date > windowEnd) continue;   // 仅保留 今日~未来2个月末
        const title = (x.bssz || '').trim();
        if (!title || !keep(title)) continue;
        items.push({ date, title, org: (x.ssjgmc || '国家税务总局').trim(), note: (x.bz || '').trim() });
        cnt++;
      }
      console.log(`  ✓ ${t.key} 命中 ${cnt} 条`);
    }catch(e){ console.log(`  ✗ ${t.key} 异常 ${e.message}`); }
  }

  // 聚合：各省录入粒度不同，按「截止日」归并——同一天所有相关税种取并集，
  // 合并为"全国通用"的一条，避免跨省重复噪音。
  const byDate = {};
  for (const it of items){
    if (!byDate[it.date]) byDate[it.date] = { date: it.date, keys: new Set(), org: '全国通用' };
    KEYS.forEach(k => { if (it.title.includes(k)) byDate[it.date].keys.add(k); });
  }
  items = Object.values(byDate)
    .map(o => ({ date: o.date, title: [...o.keys].join('、'), org: o.org, note: '' }))
    .sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));

  const out = {
    updated: new Date().toISOString().slice(0, 10),
    source: '国家税务总局 12366 办税日历（全国通用，河南适用）',
    items
  };
  fs.writeFileSync(path.join(__dirname, 'taxdue.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n生成 taxdue.json：${items.length} 条，窗口 ${today} ~ ${windowEnd}`);
})();
