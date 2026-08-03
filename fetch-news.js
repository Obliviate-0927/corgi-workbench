// 柯基财税工作台 — 每日资讯快报抓取脚本（纯 Node 内置模块，无需 npm install）
// 用法：node fetch-news.js  -> 生成 news.json
// 设计：每个来源多个栏目 URL 回退；通用解析抽取标题/日期/链接；按日期+政策关键词排序去重。

const fs = require('fs');

// 抓取来源（多部委）。每源可配多个栏目 URL，任一成功即用。
const SOURCES = [
  { name: '国家税务总局', base: 'https://www.chinatax.gov.cn', urls: [
    'https://www.chinatax.gov.cn/chinatax/n810219/n810744/',
    'https://www.chinatax.gov.cn/'
  ]},
  { name: '财政部', base: 'https://www.mof.gov.cn', urls: [
    'https://www.mof.gov.cn/zhengwuxinxi/zhengcefabu/',
    'https://www.mof.gov.cn/zhengwuxinxi/caizhengxinwen/'
  ]},
  { name: '河南省税务局', base: 'https://henan.chinatax.gov.cn', urls: [
    'https://henan.chinatax.gov.cn/chinatax/n810219/n810744/',
    'https://henan.chinatax.gov.cn/'
  ]},
  { name: '财政部会计司', base: 'http://kjs.mof.gov.cn', urls: [
    'http://kjs.mof.gov.cn/col/col1687/index.html',
    'http://kjs.mof.gov.cn/'
  ]},
  // 注：人社部官网为前端动态渲染(SPA)，静态 HTML 无 <a> 链接，通用抓取拿不到，暂未纳入；
  // 中国政府网政策库链接嵌在 JS 中，静态解析亦不稳定，同样未纳入。两者如需可后续接入其数据接口。
  // 当前 5 源已覆盖：税务 / 财政 / 河南地方税务 / 会计准则 / 货币金融。
  { name: '中国人民银行', base: 'http://www.pbc.gov.cn', urls: [
    'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html',
    'http://www.pbc.gov.cn/'
  ]}
];

// 政策类关键词：命中优先，更贴合"快报"
const POLICY_KW = /公告|通知|政策|办法|规定|细则|指引|意见|解读|批复|决定|措施|标准|调整|减免|优惠|改革|条例/;

function normalizeUrl(href, base) {
  if (!href || /^(#|javascript:|mailto:)/i.test(href)) return null;
  try { return new URL(href, base).href; } catch (e) { return null; }
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorgiNewsBot/1.0)' } });
    clearTimeout(t);
    if (!r.ok) return '';
    return await r.text();
  } catch (e) { clearTimeout(t); return ''; }
}

function extractItems(html, base, limit) {
  const items = []; const seen = new Set();
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, '').replace(/\s+/g, ' ').trim();
    if (title.length < 6) continue;
    if (/登录|注册|首页|更多>>|下一页|EN$|English|网站地图|无障碍|关注我们|设为首页|微信|微博|客户端|下载|下载客户端|APP/i.test(title)) continue;
    const after = html.slice(m.index, m.index + 260);
    const dm = after.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    const date = dm ? `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}` : '';
    const url = normalizeUrl(href, base);
    if (!url) continue;
    const key = title + url;
    if (seen.has(key)) continue;
    seen.add(key);
    const score = (POLICY_KW.test(title) ? 1 : 0) + (date ? 1 : 0);
    items.push({ title, date, url, score });
    if (items.length >= limit * 2) break;
  }
  return items;
}

async function getNews() {
  const out = [];
  const okSources = [];
  for (const s of SOURCES) {
    let got = 0;
    for (const u of s.urls) {
      const html = await fetchText(u);
      if (!html) continue;
      const its = extractItems(html, u, 12).map(i => ({ ...i, source: s.name }));
      if (its.length) { out.push(...its); got = its.length; if (got >= 6) break; }
    }
    if (got > 0) okSources.push(s.name);
    else console.error('✗ 未抓到:', s.name);
  }
  // 去重：同标题保留有日期/高分的
  const map = new Map();
  out.forEach(i => {
    const prev = map.get(i.title);
    if (!prev || (i.date && !prev.date) || i.score > prev.score) map.set(i.title, i);
  });
  let items = [...map.values()]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.score - a.score)
    .slice(0, 40)
    .map(({ title, date, url, source }) => ({ source, title, date, url }));
  return {
    updated: new Date().toISOString().slice(0, 10),
    sources: okSources,
    items
  };
}

(async () => {
  const data = await getNews();
  fs.writeFileSync('news.json', JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ 生成 news.json | 更新日 ${data.updated} | 来源 ${data.sources.length}/6 | 条目 ${data.items.length}`);
  console.log('  各源:', data.sources.join('、'));
})();
