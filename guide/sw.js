// JIS 가이드북 듣는 전자책 — 페이지 보관(판 c189e13a). 먼저 기기 것을 보이고, 인터넷이 되면 새 판을 받아 다음에 씀.
const C = 'ebk-jisg-c189e13a', FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
const H = {};   // 파일마다 내용 지문 — 새 판에서 바뀐 파일만 새로 받음(조판 11-18 22:3x, 저자: 올릴 때마다 처음 재생이 10–20초 늦음)
const BUSY = {};
const mark = (r, h) => r.blob().then(b => new Response(b, { status: 200, headers: { 'Content-Type': r.headers.get('Content-Type') || '', 'X-H': h } }));
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => {
  const one = f => (H[f] ? caches.match(f, { ignoreSearch: true }) : Promise.resolve(null)).then(hit => (hit && hit.headers.get('X-H') === H[f]) ? c.put(f, hit)
    : fetch(new Request(f, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(f); return H[f] ? mark(r, H[f]).then(m => c.put(f, m)) : c.put(f, r); }));
  // 설치 때 받는 것은 글 · 장 예제만. 음원 · 서랍 악보는 옛 보관본에 같은 지문이 있으면 옮기기만 하고, 없으면 들을 때 받음(감사창 0948 — 아이패드 열)
  const keep = f => caches.match(f, { ignoreSearch: true }).then(hit => (hit && hit.headers.get('X-H') === H[f]) ? c.put(f, hit) : null).catch(() => null);
  const now = FILES.filter(f => !/\/(audio|drawer)\//.test(f)), later = FILES.filter(f => /\/(audio|drawer)\//.test(f));
  const q = now.slice(); const run = () => q.length ? one(q.shift()).then(run) : Promise.resolve();
  return Promise.all([run(), run()]).then(() => Promise.all(later.map(keep)));
})); });
self.addEventListener('activate', e => { /* 제 책 옛 판만 지움 — 같은 주소(github.io) 아래 다른 책 보관본은 그대로(PRG 11-23 · EBK 조판 2001 · TNS 감사 2053) */ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ebk-jisg-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const rg = e.request.headers.get('range');   // 아이패드 사파리는 음원을 조각(Range)으로 달라 함 — 보관본 전체(200)를 주면 첫 재생이 안 나옴 → 그 조각만 206으로(저자 11-18 01:11)
  if (rg) {
    let c2; e.respondWith(caches.open(C).then(c => { c2 = c; return c.match(e.request, { ignoreSearch: true }); }).then(hit => {
      if (!hit) { const f = './' + u.pathname.slice(new URL(self.registration.scope).pathname.length); if (H[f] && !BUSY[f]) { BUSY[f] = 1; e.waitUntil(fetch(f).then(r => r.ok ? mark(r, H[f]).then(m => c2.put(f, m)) : null).catch(() => null).then(() => { delete BUSY[f]; })); } return fetch(e.request); }
      return hit.arrayBuffer().then(buf => {
        const m = /bytes=(\d*)-(\d*)/.exec(rg) || [], n = buf.byteLength;
        let s0 = m[1] ? +m[1] : 0, s1 = m[2] ? +m[2] : n - 1; if (s1 >= n) s1 = n - 1;
        if (s0 >= n) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
        return new Response(buf.slice(s0, s1 + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + s0 + '-' + s1 + '/' + n, 'Content-Length': String(s1 - s0 + 1), 'Accept-Ranges': 'bytes' } });
      });
    }).catch(() => fetch(e.request)));
    return;
  }
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {   // 책 페이지는 인터넷이 되면 늘 새것 먼저, 안 되면 보관본(조판 11-18 — 새 판인데 옛 페이지가 보이던 것)
    e.respondWith(caches.open(C).then(c => fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => c.match(e.request, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.open(C).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
    const f = './' + u.pathname.slice(new URL(self.registration.scope).pathname.length);   // 보관본이 이 판 것이면 그대로 — 열 때마다 다시 받던 것 뺌(감사창 0948 열)
    if (hit && (!H[f] || hit.headers.get('X-H') === H[f] || !hit.headers.get('X-H'))) return hit;
    return fetch(e.request).then(r => { if (r.ok) (H[f] ? mark(r.clone(), H[f]).then(m => c.put(f, m)) : c.put(e.request, r.clone())); return r; }).catch(() => hit);
  })));
});
