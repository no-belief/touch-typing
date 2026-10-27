const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const home = await (await fetch('https://www.dazicesu.com/', { headers: UA })).text();
const links = new Set();
const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,40}?)<\/a>/gi;
let m;
while ((m = re.exec(home))) {
  const href = m[1];
  const label = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
  if (/拼音|pinyin/i.test(href + label)) links.add(label + ' -> ' + href);
}
console.log('--- 拼音相关链接 ---');
for (const l of links) console.log(l);

const target = [...links].map((x) => x.split(' -> ')[1]).find((h) => /^\//.test(h)) || null;
if (target) {
  const url = 'https://www.dazicesu.com' + target;
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  const html = await r.text();
  console.log('');
  console.log('=== ' + url + ' -> ' + r.status + ' bytes=' + html.length);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const at = body.indexOf('拼音');
  console.log(body.slice(Math.max(0, at - 200), at + 2600));
}
