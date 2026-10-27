const base = 'http://127.0.0.1:5173/';
const files = ['index.html', 'assets/js/pinyin.js', 'assets/styles.css', 'assets/js/app.js'];
for (const f of files) {
  try {
    const r = await fetch(base + f);
    const t = await r.text();
    const flags = [
      f === 'index.html' ? 'py-hint:' + t.includes('id="py-hint"') : '',
      f === 'index.html' ? 'speed-label:' + t.includes('id="hud-speed-label"') : '',
      f === 'index.html' ? 'pinyin-script:' + t.includes('assets/js/pinyin.js') : '',
      f === 'assets/js/pinyin.js' ? 'pools:' + (t.match(/name: '/g) || []).length : ''
    ].filter(Boolean).join(' ');
    console.log(f + ' -> ' + r.status + ' ' + t.length + 'b ' + flags);
  } catch (e) {
    console.log(f + ' -> FAIL ' + e.message);
  }
}
