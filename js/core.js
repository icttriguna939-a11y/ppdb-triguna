/* =====================================================================
   core.js — fondasi: API (fetch ke GAS), cache SWR, tema, router SPA, UI
   Pola: gas-pro-api (fetch + text/plain) + gas-instant-ux-pro
   ===================================================================== */
'use strict';
const CFG = window.APP_CONFIG || {};
const DEMO = !CFG.GAS_URL || /[?&]demo=1/.test(location.search);
const GAS_URL = CFG.GAS_URL || '';

/* ---------------- Utilitas ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls = '') => {
  const b = (window.ICONS || {})[n];
  return b ? `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${b}"/></svg>` : `<i class="ic ${cls}"></i>`;
};
const rupiah = (n) => 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function tglID(s, jam) {
  if (!s) return '-';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  if (isNaN(d)) return s;
  let o = d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  if (jam) o += ', ' + String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0') + ' WIB';
  return o;
}
const tglPendek = (s) => { if (!s) return '-'; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s); return isNaN(d) ? s : d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); };
const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const waLink = (n, msg) => 'https://wa.me/' + String(n || '').replace(/\D/g, '').replace(/^0/, '62') + (msg ? '?text=' + encodeURIComponent(msg) : '');

/* ---------------- Penyimpanan lokal (aman bila diblokir) ---------------- */
const LS = 'ppdb:v1:';
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* kuota penuh / diblokir: tetap jalan */ } },
  del(k) { try { localStorage.removeItem(LS + k); } catch (e) { } }
};

/* ---------------- Pengukur performa (Perf.table() di console) ---------------- */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server ?? null, net: server != null ? total - server : null }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

/* ---------------- API: timeout, retry baca, reqId untuk tulis ---------------- */
const READ_ACTIONS = /^(ping|publicBoot|cekStatus|getPdf|login|loginSiswa|siswaBoot|siswaPdf|adminBoot|getDetail|getFile|getLogs|getBuktiAkun|exportDapodik|listBackups|importScan)$/;
const App = { token: '', boot: null };

async function apiOnce(action, data, timeout, reqId, token) {
  if (DEMO) { if (!window.DemoAPI) await loadScript('js/demo.js'); const t0 = performance.now(); const r = await window.DemoAPI(action, data, token); Perf.add(action, Math.round(performance.now() - t0), r.ms); return r; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },        // wajib: hindari CORS preflight
      body: JSON.stringify({ action, token: token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Server membalas tidak semestinya (HTTP ' + res.status + '). Coba lagi.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus. Periksa internet Anda.' };
  } finally { clearTimeout(timer); }
}
async function api(action, data, opt = {}) {
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || uuid());
  const tries = opt.tries || (isRead ? 3 : 2);
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise((r) => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, opt.timeout || (isRead ? (i ? 45000 : 30000) : 120000), reqId, opt.token !== undefined ? opt.token : App.token);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH') { if (opt.onAuth) opt.onAuth(res); else if (window.onSessionExpired) window.onSessionExpired(); }
  return res;
}
function waitOnline(ms) { return new Promise((r) => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }
function warmUpServer() { if (!DEMO && GAS_URL) fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); }

/** Stale-while-revalidate: tampilkan cache seketika, segarkan di latar bila sudah basi. */
async function swr(key, action, payload, render, opt = {}) {
  const fresh = opt.fresh ?? 60000;
  const c = Store.get(key, null);
  if (c) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(key, { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  return res;
}

/* ---------------- Tema terang / gelap ---------------- */
const Tema = {
  pilihan() { try { return localStorage.getItem('ppdb:tema'); } catch (e) { return null; } },
  aktif() { return document.documentElement.dataset.tema || 'terang'; },
  terapkan(t, animasi) {
    if (animasi) { document.body.classList.add('tema-transisi'); setTimeout(() => document.body.classList.remove('tema-transisi'), 260); }
    document.documentElement.dataset.tema = t;
    const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'gelap' ? '#0B1320' : '#004A87';
    $$('[data-tema-btn]').forEach((b) => { b.innerHTML = ic(t === 'gelap' ? 'sun' : 'moon'); b.setAttribute('aria-label', t === 'gelap' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'); b.title = b.getAttribute('aria-label'); });
    document.dispatchEvent(new CustomEvent('tema', { detail: t }));
  },
  toggle() { const t = this.aktif() === 'gelap' ? 'terang' : 'gelap'; try { localStorage.setItem('ppdb:tema', t); } catch (e) { } this.terapkan(t, true); },
  /** dipanggil saat pengaturan tema_default diketahui (boot) */
  sesuaikanDefault(def) {
    try { localStorage.setItem('ppdb:tema-default', def || 'IKUTI_PERANGKAT'); } catch (e) { }
    if (this.pilihan()) return;
    const t = def === 'GELAP' ? 'gelap' : def === 'TERANG' ? 'terang' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang');
    if (t !== this.aktif()) this.terapkan(t, true);
  }
};
const temaBtn = () => `<button class="btn-ikon" type="button" data-tema-btn onclick="Tema.toggle()" aria-label="Ganti tema">${ic(Tema.aktif() === 'gelap' ? 'sun' : 'moon')}</button>`;
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
  let def = null; try { def = localStorage.getItem('ppdb:tema-default'); } catch (x) { }
  if (!Tema.pilihan() && (!def || def === 'IKUTI_PERANGKAT')) Tema.terapkan(e.matches ? 'gelap' : 'terang', true);
});

/* ---------------- Toast & Modal ---------------- */
function toast(judul, pesan = '', tipe = 'sukses', ms = 3800) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + tipe;
  el.innerHTML = ic({ sukses: 'circle-check', error: 'circle-alert', warning: 'triangle-alert', info: 'info' }[tipe] || 'info') + `<div><b>${esc(judul)}</b>${pesan ? `<span class="small muted">${esc(pesan)}</span>` : ''}</div>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('keluar'); setTimeout(() => el.remove(), 180); }, ms);
}
function modal(html, opt = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${opt.lebar ? 'lebar' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const prevFocus = document.activeElement;
  const tutup = () => { bg.remove(); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); };
  const onKey = (e) => { if (e.key === 'Escape' && !opt.kunci) tutup(); };
  document.addEventListener('keydown', onKey);
  if (!opt.kunci) bg.addEventListener('mousedown', (e) => { if (e.target === bg) tutup(); });
  document.body.appendChild(bg);
  setTimeout(() => { const f = bg.querySelector('[autofocus], textarea, input, .btn'); f && f.focus(); }, 30);
  bg.tutup = tutup;
  return bg;
}
/** Konfirmasi; bila opt.catatan → minta isian teks (wajib bila opt.wajib) */
function konfirmasi({ judul, pesan, ok = 'Ya, Lanjutkan', kelas = 'btn-primer', ikon = 'circle-help', catatan = false, wajib = false, placeholder = '', nilai = '' }) {
  return new Promise((resolve) => {
    const m = modal(`<h3>${ic(ikon)} ${esc(judul)}</h3><p class="muted">${pesan || ''}</p>
      ${catatan ? `<div class="field"><label for="mk-cat">Catatan${wajib ? '<span class="req">*</span>' : ' (opsional)'}</label><textarea id="mk-cat" class="inp" placeholder="${esc(placeholder)}">${esc(nilai)}</textarea><div class="errmsg">${ic('circle-alert', 'ic-sm')} Catatan wajib diisi.</div></div>` : ''}
      <div class="aksi"><button class="btn btn-ghost" data-x>Batal</button><button class="btn ${kelas}" data-ok>${esc(ok)}</button></div>`);
    m.querySelector('[data-x]').onclick = () => { m.tutup(); resolve(null); };
    m.querySelector('[data-ok]').onclick = () => {
      const t = catatan ? m.querySelector('#mk-cat').value.trim() : true;
      if (catatan && wajib && !t) { m.querySelector('.field').classList.add('err'); return; }
      m.tutup(); resolve(catatan ? { catatan: t } : true);
    };
  });
}
function setBusy(btn, busy, teks) {
  if (!btn) return;
  if (busy) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${teks ? ' ' + esc(teks) : ''}`; }
  else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
}

/* ---------------- Berkas ---------------- */
function b64ToBlob(b64, mime) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
function unduhB64(b64, nama, mime = 'application/pdf') {
  const url = URL.createObjectURL(b64ToBlob(b64, mime));
  const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const fileToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
/** Kompres gambar di browser (sisi terpanjang maxW, JPEG) agar unggahan ringan di HP */
async function kompresGambar(file, maxW = 1600, q = 0.82, targetByte = 900 * 1024) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let w = img.naturalWidth, h = img.naturalHeight;
    const sc = Math.min(1, maxW / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
    let out = null;
    for (let qq = q; qq >= 0.5; qq -= 0.08) { out = await new Promise((r) => cv.toBlob(r, 'image/jpeg', qq)); if (out && out.size <= targetByte) break; }
    if (!out || out.size >= file.size) return file;
    return new File([out], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) { return file; } finally { URL.revokeObjectURL(url); }
}
const ukuran = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
async function salin(teks, label = 'Disalin') {
  try { await navigator.clipboard.writeText(teks); toast(label, teks); }
  catch (e) { const t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(label, teks); }
}

/* ---------------- Status → badge ---------------- */
function badgeStatus(v) {
  const m = { 'Menunggu Verifikasi': 'b-amber', 'Menunggu Konfirmasi': 'b-amber', 'Dalam Proses': 'b-sky', 'Lengkap': 'b-hijau', 'Terkonfirmasi': 'b-hijau', 'Diterima': 'b-hijau', 'Kurang': 'b-merah', 'Ditolak': 'b-merah' };
  return `<span class="badge ${m[v] || 'b-tutup'}">${esc(v || '-')}</span>`;
}

/* ---------------- Router SPA (hash) — halaman tidak dibuang saat pindah ---------------- */
const Pages = {};
let currentPage = null;
function registerPage(name, def) { Pages[name] = def; }
function go(path) { if (location.hash === '#/' + path) route(); else location.hash = '#/' + path; }
async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let name = parts[0] || 'beranda';
  if (name === 'admin' && !Pages['admin']) {             // bundel admin dimuat hanya saat dibutuhkan
    await loadScript('js/admin.js?v=' + (CFG.VERSION || '1'));
  }
  if (!Pages[name]) name = 'beranda';
  const def = Pages[name];
  const host = $('#app');
  let el = host.querySelector(`.page[data-page="${name}"]`);
  const baru = !el;
  if (baru) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; host.appendChild(el); }
  $$('.page', host).forEach((p) => { p.hidden = p !== el; });
  document.body.dataset.layout = def.layout || 'publik';
  document.body.classList.remove('drawer-open', 'side-open');
  if (currentPage !== name || def.scrollTop !== false) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  currentPage = name;
  if (def.title) document.title = def.title + ' · PPDB Online SMA Triguna 1956';
  try { await def.show(el, parts.slice(1), baru); } catch (e) { console.error(e); el.innerHTML = `<div class="wrap" style="padding:120px 0"><div class="card empty"><div class="ilus">${ic('triangle-alert', 'ic-xl')}</div><h3>Terjadi kesalahan</h3><p>${esc(e.message)}</p><button class="btn btn-primer" onclick="location.reload()">Muat ulang</button></div></div>`; }
}
const _scripts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  return (_scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete _scripts[src]; s.remove(); rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
}

/* ---------------- Boot publik (pengaturan, jadwal, konten, aset) ---------------- */
const Boot = {
  data: null,
  listeners: [],
  on(fn) { this.listeners.push(fn); if (this.data) fn(this.data, true); },
  set(d, fromCache) {
    this.data = d; App.boot = d;
    terapkanAset(d);
    Tema.sesuaikanDefault(d.settings && d.settings.tema_default);
    this.listeners.forEach((fn) => { try { fn(d, fromCache); } catch (e) { console.error(e); } });
  },
  async muat(force) {
    return swr('boot', 'publicBoot', {}, (d, c) => this.set(d, c), {
      fresh: 5 * 60000, force,
      onError: (r) => { this.gagal = r; this.listeners.forEach((fn) => fn(null, false, r)); }
    });
  }
};
function logoUrl(d) {
  const a = (d && d.assets) || {};
  if (Tema.aktif() === 'gelap' && a.logo_gelap) return a.logo_gelap;
  return a.logo_utama || 'img/logo-triguna.png';
}
function terapkanAset(d) {
  if (!d) return;
  const a = d.assets || {};
  const fav = $('link[rel="icon"]'); if (fav) fav.href = a.favicon || 'img/favicon.png';
  document.documentElement.style.setProperty('--hero-img', a.bg_hero ? `url("${a.bg_hero}")` : '');
  $$('img[data-logo]').forEach((im) => { im.src = logoUrl(d); });
  $$('img[data-logo-yayasan]').forEach((im) => { im.src = a.logo_yayasan || 'img/logo-triguna.png'; });
}
document.addEventListener('tema', () => App.boot && terapkanAset(App.boot));

/* ---------------- Mulai ---------------- */
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', () => {
  if (DEMO) { const b = document.createElement('div'); b.className = 'demo-band'; b.textContent = 'MODE DEMO · data contoh'; b.title = 'Isi GAS_URL di js/config.js untuk menyambungkan ke server'; document.body.prepend(b); }
  Tema.terapkan(Tema.aktif());
  warmUpServer();
  Boot.muat();
  route();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = Store.get('lastSeen', 0);
  if (Date.now() - t > 2 * 60000) warmUpServer();
  Store.set('lastSeen', Date.now());
});
