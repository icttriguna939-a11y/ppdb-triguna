/* =====================================================================
   admin.js — Panel Admin (dimuat lazy saat membuka #/admin)
   Login → 1 panggilan (token + bootstrap). Data daftar & statistik dihitung
   di browser dari bootstrap → pindah menu instan tanpa ke server.
   ===================================================================== */
'use strict';
const Adm = { boot: null, page: 'dasbor', filter: { tab: 'semua', q: '', berkas: '', bayar: '', seleksi: '', jk: '', sort: 'Timestamp', dir: -1, page: 1 }, charts: {}, detail: {}, files: {} };
const ADM_KEY = 'adm';
const PER_PAGE = 25;

/* ---------------- Sesi ---------------- */
function sesi() { const s = Store.get(ADM_KEY, null); return s && s.exp > Date.now() ? s : null; }
function simpanSesi(token, exp) { Store.set(ADM_KEY, { token, exp }); App.token = token; }
function keluar(pesan) { Store.del(ADM_KEY); Store.del('admboot'); App.token = ''; Adm.boot = null; Adm.detail = {}; Adm.files = {}; if (pesan) toast(pesan, '', 'info'); go('admin/login'); }
window.onSessionExpired = () => { if (location.hash.startsWith('#/admin')) keluar('Sesi berakhir, silakan login kembali.'); };
(() => { const s = sesi(); if (s) App.token = s.token; })();

function setBoot(d) {
  Adm.boot = d;
  Store.set('admboot', { t: Date.now(), h: hashStr(JSON.stringify(d)), data: d });
  if (d.settings) Tema.sesuaikanDefault(d.settings.tema_default);
}
async function muatBoot(force) {
  const c = Store.get('admboot', null);
  if (c && !Adm.boot) Adm.boot = c.data;
  if (!force && c && Date.now() - c.t < 60000) return true;
  const r = await api('adminBoot', {});
  if (r.success) {
    const h = hashStr(JSON.stringify(r.data));
    const berubah = !c || c.h !== h;
    setBoot(r.data);
    if (berubah && Adm.boot) rerender();
    return true;
  }
  if (!Adm.boot) toast('Gagal memuat data', r.message, 'error');
  return false;
}
// segarkan diam-diam saat tab kembali aktif (tanpa polling terus-menerus)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && sesi() && location.hash.startsWith('#/admin/') && !location.hash.includes('login')) muatBoot(); });

/* ---------------- Shell ---------------- */
const MENU_ADM = [
  ['NAVIGASI UTAMA'], ['dasbor', 'Dasbor', 'layout-dashboard'], ['pendaftar', 'Data Pendaftar', 'users'], ['ekspor', 'Ekspor Dapodik', 'file-spreadsheet'],
  ['KONFIGURASI'], ['tampilan', 'Pengaturan Tampilan', 'palette'], ['konten', 'Konten & Pendaftaran', 'settings'], ['backup', 'Backup & Migrasi', 'database-backup'], ['akun', 'Akun Admin', 'user-cog']
];
const JUDUL = { dasbor: 'Dasbor', pendaftar: 'Data Pendaftar', detail: 'Detail & Verifikasi', ekspor: 'Ekspor Dapodik', tampilan: 'Pengaturan Tampilan', konten: 'Konten & Pendaftaran', backup: 'Backup & Migrasi', akun: 'Akun Admin' };
function shell(el) {
  if (el.querySelector('.adm')) return el.querySelector('#adm-content');
  el.innerHTML = `<div class="adm"><aside class="sidebar" aria-label="Menu admin">
    <a class="brand" href="#/admin/dasbor"><img data-logo src="${logoUrl(App.boot || Adm.boot)}" alt="" width="40" height="40" style="background:#fff;border-radius:10px;padding:2px"><span><b>SMA Triguna 1956</b><small>Admin PPDB</small></span></a>
    ${MENU_ADM.map((m) => m.length === 1 ? `<div class="grp">${m[0]}</div>` : `<a href="#/admin/${m[0]}" data-menu="${m[0]}">${ic(m[2])} ${m[1]}${m[0] === 'pendaftar' ? '<span class="cnt" id="cnt-menunggu" hidden></span>' : ''}</a>`).join('')}
    <a href="#/" style="margin-top:14px">${ic('globe')} Lihat Portal Publik</a>
    <a href="#" class="keluar" onclick="keluar('Anda telah keluar.');return false">${ic('log-out')} Keluar</a></aside>
    <div class="drawer-bg" onclick="document.body.classList.remove('side-open')"></div>
    <div class="adm-main"><header class="topbar"><button class="btn-ikon btn-menu" aria-label="Buka menu" onclick="document.body.classList.add('side-open')">${ic('menu')}</button>
      <span class="judul" id="adm-judul">Panel Administrasi PPDB</span>
      <span class="hide-m" id="pill-status"></span><span class="chip hide-m" id="chip-ta"></span>${temaBtn()}<span class="avatar" title="Admin">A</span></header>
      <main class="adm-content" id="adm-content"></main></div></div>`;
  return el.querySelector('#adm-content');
}
function perbaruiShell() {
  const b = Adm.boot; if (!b) return;
  const menunggu = b.list.filter((x) => x.Status_Berkas === 'Menunggu Verifikasi').length;
  const c = $('#cnt-menunggu'); if (c) { c.hidden = !menunggu; c.textContent = menunggu; }
  const ps = $('#pill-status'); if (ps) ps.innerHTML = `<span class="badge ${b.status.open ? 'b-hijau' : 'b-tutup'}">PENDAFTARAN: ${b.status.open ? 'BUKA' : 'TUTUP'}</span>`;
  const ta = $('#chip-ta'); if (ta) ta.textContent = 'TA ' + (b.settings.tahun_ajaran || '');
  $$('[data-menu]').forEach((a) => a.classList.toggle('on', a.dataset.menu === (Adm.page === 'detail' ? 'pendaftar' : Adm.page)));
  $('#adm-judul').textContent = JUDUL[Adm.page] || 'Panel Administrasi PPDB';
}
let _adminEl = null, _adminParam = [];
function rerender() { if (_adminEl && currentPage === 'admin') renderAdminPage(_adminEl, _adminParam); }

registerPage('admin', {
  title: 'Panel Admin', layout: 'admin',
  async show(el, p) {
    _adminEl = el; _adminParam = p;
    const sub = p[0] || '';
    if (sub === 'login' || !sesi()) { renderLogin(el); return; }
    if (!sub) { go('admin/dasbor'); return; }
    const c = Store.get('admboot', null);
    if (!Adm.boot && c) Adm.boot = c.data;
    if (!Adm.boot) { shell(el).innerHTML = skelPage(); await muatBoot(true); if (!Adm.boot) return; }
    else muatBoot();                                     // SWR di latar
    renderAdminPage(el, p);
  }
});
function skelPage() { return `<div class="sk sk-h" style="width:240px"></div><div class="stat-grid">${'<div class="card"><div class="sk sk-line"></div><div class="sk sk-h" style="width:40%"></div></div>'.repeat(4)}</div><div class="card" style="margin-top:16px"><div class="sk sk-box"></div></div>`; }
function renderAdminPage(el, p) {
  const sub = p[0] || 'dasbor';
  Adm.page = PAGES_ADM[sub] ? sub : 'dasbor';
  const host = shell(el);
  perbaruiShell();
  document.title = (JUDUL[Adm.page] || 'Admin') + ' · Admin PPDB';
  PAGES_ADM[Adm.page](host, p.slice(1));
}

/* ---------------- Login ---------------- */
function renderLogin(el) {
  const d = App.boot;
  el.innerHTML = `<div class="login-wrap"><div class="login-kiri"><img data-logo src="${logoUrl(d)}" alt="Logo sekolah"><div class="overline" style="color:#9ADCFF">Panel Administrasi PPDB</div>
    <h2>${esc((d && d.settings && d.settings.nama_sekolah) || 'SMA Triguna 1956 Jakarta')}</h2><p style="opacity:.85;max-width:380px">Kelola verifikasi berkas, konfirmasi pembayaran, dan keputusan seleksi calon peserta didik baru.</p></div>
    <div class="login-kanan"><div class="pojok">${temaBtn()}</div><form class="card" id="lg-form" novalidate>
      <div class="overline">Portal Panitia PPDB</div><h2 style="font-size:26px;margin:6px 0 4px">Login Admin PPDB</h2><p class="muted small">Masukkan username dan password panitia untuk masuk ke dasbor.</p>
      <div id="lg-err"></div>
      <div class="stack" style="margin-top:16px">
        <div class="field"><label for="lg-u">Username</label><input id="lg-u" class="inp" autocomplete="username" autocapitalize="none" required></div>
        <div class="field"><label for="lg-p">Password</label><div class="inp-wrap"><input id="lg-p" class="inp" type="password" autocomplete="current-password" required style="padding-right:48px">
          <button type="button" class="btn-ikon" id="lg-eye" aria-label="Tampilkan password" style="position:absolute;right:4px;top:2px;border:0">${ic('eye')}</button></div></div>
        <button class="btn btn-primer btn-block btn-lg" id="lg-btn">Masuk ke Panel Administrasi ${ic('arrow-right')}</button>
      </div>
      <div class="callout" style="margin-top:18px">${ic('shield-alert')}<div class="small">Lima kali percobaan gagal akan membekukan akses selama 15 menit.</div></div>
      <a href="#/" class="btn btn-ghost btn-block" style="margin-top:10px">${ic('arrow-left', 'ic-sm')} Kembali ke Portal Publik</a>
      ${DEMO ? '<p class="hint" style="text-align:center;margin-top:8px">Mode demo: <b>admin</b> / <b>triguna1956</b></p>' : ''}
    </form></div></div>`;
  $('#lg-eye').onclick = () => { const i = $('#lg-p'); i.type = i.type === 'password' ? 'text' : 'password'; $('#lg-eye').innerHTML = ic(i.type === 'password' ? 'eye' : 'eye-off'); };
  $('#lg-form').onsubmit = async (e) => {
    e.preventDefault();
    const u = $('#lg-u').value.trim(), pw = $('#lg-p').value;
    if (!u || !pw) { $('#lg-err').innerHTML = `<div class="callout bahaya" style="margin-top:12px">${ic('circle-alert')}<div>Isi username dan password.</div></div>`; return; }
    const b = $('#lg-btn'); setBusy(b, true, 'Memeriksa…');
    const r = await api('login', { username: u, password: pw }, { tries: 1 });
    setBusy(b, false);
    if (!r.success) { $('#lg-err').innerHTML = `<div class="callout bahaya" style="margin-top:12px">${ic(r.data && r.data.code === 'LOCKED' ? 'lock' : 'circle-alert')}<div><b>${r.data && r.data.code === 'LOCKED' ? 'Akun terkunci sementara' : 'Autentikasi gagal'}</b><br>${esc(r.message)}</div></div>`; return; }
    simpanSesi(r.data.token, r.data.exp);
    setBoot(r.data.boot);
    toast('Selamat datang', 'Login berhasil.');
    go(r.data.mustChange ? 'admin/akun' : 'admin/dasbor');
    if (r.data.mustChange) setTimeout(() => toast('Ganti password bawaan', 'Demi keamanan, segera ganti password.', 'warning', 6000), 300);
  };
  setTimeout(() => $('#lg-u') && $('#lg-u').focus(), 50);
}

/* =====================================================================
   DASBOR — semua angka & grafik dihitung dari daftar di memori
   ===================================================================== */
function hitung(list) {
  const c = (f, v) => list.filter((x) => x[f] === v).length;
  return { total: list.length, menunggu: c('Status_Berkas', 'Menunggu Verifikasi'), lengkap: c('Status_Berkas', 'Lengkap'), kurang: c('Status_Berkas', 'Kurang'),
    bayar: c('Status_Bayar', 'Terkonfirmasi'), belumBayar: list.length - c('Status_Bayar', 'Terkonfirmasi'), diterima: c('Status_Seleksi', 'Diterima'), ditolak: c('Status_Seleksi', 'Ditolak') };
}
async function chartLib() { if (!window.Chart) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'); return window.Chart; }
function warnaChart() {
  const g = Tema.aktif() === 'gelap';
  return { utama: g ? '#38BDF8' : '#004A87', kedua: g ? '#F2C200' : '#0096D6', grid: g ? '#233959' : '#DCE5EF', teks: g ? '#94A3B8' : '#5B6B80', aksen: '#F2C200', bg: g ? '#132238' : '#FFFFFF' };
}
document.addEventListener('tema', () => { if (Adm.page === 'dasbor' && currentPage === 'admin' && Adm.boot) gambarGrafik(); });
const PAGES_ADM = {};
PAGES_ADM.dasbor = (host) => {
  const L = Adm.boot.list, h = hitung(L);
  const kartu = (n, l, i, w, sub) => `<div class="card stat"><span class="ic-bulat ${w}">${ic(i)}</span><div><b>${n}</b><span>${l}</span>${sub ? `<div class="xs muted">${sub}</div>` : ''}</div></div>`;
  const hari = new Date().toISOString().slice(0, 10);
  const hariIni = L.filter((x) => (x.Timestamp || '').slice(0, 10) === hari).length;
  const terbaru = L.slice().sort((a, b) => (b.Timestamp > a.Timestamp ? 1 : -1)).slice(0, 6);
  host.innerHTML = `<div class="page-head"><div><h2>Dasbor</h2><p>Ringkasan PPDB TA ${esc(Adm.boot.settings.tahun_ajaran)}</p></div>
    <div class="row"><span class="small muted" id="upd">Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span><button class="btn btn-outline btn-sm" id="btn-muat">${ic('refresh-cw', 'ic-sm')} Muat Ulang</button></div></div>
    <div class="stat-grid">${kartu(h.total, 'Total Pendaftar', 'users', 'primer', hariIni ? '+' + hariIni + ' hari ini' : '')}${kartu(h.menunggu, 'Menunggu Verifikasi', 'hourglass', 'amber')}${kartu(h.lengkap, 'Berkas Lengkap', 'file-check', 'hijau')}${kartu(h.kurang, 'Berkas Kurang', 'file-x', 'merah')}</div>
    <div class="stat-grid" style="margin-top:16px">${kartu(h.bayar, 'Sudah Bayar', 'wallet', 'hijau')}${kartu(h.belumBayar, 'Belum/Menunggu Bayar', 'clock', 'amber')}${kartu(h.diterima, 'Diterima', 'badge-check', 'hijau')}${kartu(h.ditolak, 'Ditolak', 'circle-x', 'merah')}</div>
    <div class="chart-grid"><div class="card"><div class="row-between" style="margin-bottom:10px"><div class="card-title" style="margin:0">${ic('trending-up')} Tren Pendaftar per Hari</div>
      <div class="segmen" id="rentang"><button data-r="7">7 Hari</button><button data-r="30" class="on">30 Hari</button><button data-r="0">Semua</button></div></div><div class="chart-box"><canvas id="ch-hari" aria-label="Grafik pendaftar per hari"></canvas></div></div>
      <div class="card"><div class="card-title">${ic('pie-chart')} Rasio Pendaftar</div><div class="chart-box donat"><canvas id="ch-jk" aria-label="Grafik laki-laki dan perempuan"></canvas></div>
      <div class="row-between small" style="margin-top:12px"><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:50%;background:var(--primer)"></i> Laki-laki <b>${L.filter((x) => x.Jenis_Kelamin === 'L').length}</b></span><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:50%;background:${Tema.aktif() === 'gelap' ? 'var(--aksen)' : 'var(--sekunder)'}"></i> Perempuan <b>${L.filter((x) => x.Jenis_Kelamin === 'P').length}</b></span></div></div></div>
    <div class="chart-grid b"><div class="card"><div class="card-title">${ic('school')} 10 Asal Sekolah (SMP) Terbanyak</div><div class="chart-box" style="height:${Math.max(220, Math.min(10, new Set(L.map((x) => x.Sekolah_Asal)).size) * 34 + 40)}px"><canvas id="ch-sek"></canvas></div></div>
      <div class="card"><div class="row-between" style="margin-bottom:12px"><div class="card-title" style="margin:0">${ic('inbox')} Pendaftar Terbaru</div><a class="small" href="#/admin/pendaftar">Lihat semua</a></div>
      ${terbaru.length ? `<div class="stack" style="--g:10px">${terbaru.map((x) => `<a href="#/admin/detail/${encodeURIComponent(x.No_Pendaftaran)}" class="nama-sel" style="color:inherit;text-decoration:none;justify-content:space-between;min-width:0">
        <span class="nama-sel" style="min-width:0"><span class="ini">${inisial(x.Nama)}</span><span style="min-width:0"><b style="display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.Nama)}</b><span class="xs muted">${esc(x.Sekolah_Asal)} · ${tglPendek(x.Timestamp)}</span></span></span>${badgeStatus(x.Status_Berkas)}</a>`).join('')}</div>
        <a class="btn btn-primer btn-block" style="margin-top:14px" href="#/admin/pendaftar">Verifikasi Sekarang ${ic('arrow-right', 'ic-sm')}</a>` : `<div class="empty"><div class="ilus">${ic('inbox', 'ic-xl')}</div><b>Belum ada pendaftar</b><p class="small">Data akan muncul setelah calon siswa mengirim formulir.</p></div>`}</div></div>`;
  $('#btn-muat').onclick = async (e) => { setBusy(e.currentTarget, true); await muatBoot(true); toast('Data diperbarui'); };
  $('#rentang').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; $$('#rentang button').forEach((x) => x.classList.toggle('on', x === b)); Adm.rentang = +b.dataset.r; gambarGrafik(); };
  Adm.rentang = Adm.rentang ?? 30;
  $$('#rentang button').forEach((x) => x.classList.toggle('on', +x.dataset.r === Adm.rentang));
  gambarGrafik();
};
async function gambarGrafik() {
  let Chart;
  try { Chart = await chartLib(); }
  catch (e) { $$('.chart-box').forEach((b) => { b.innerHTML = `<div class="empty small">${ic('pie-chart', 'ic-xl')}<p>Grafik tidak dapat dimuat. Periksa koneksi internet lalu tekan Muat Ulang.</p></div>`; }); return; }
  if (Adm.page !== 'dasbor' || !$('#ch-hari')) return;
  const w = warnaChart(), L = Adm.boot.list;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif"; Chart.defaults.color = w.teks;
  Object.values(Adm.charts).forEach((c) => c.destroy()); Adm.charts = {};
  // per hari
  const per = {}; L.forEach((x) => { const k = (x.Timestamp || '').slice(0, 10); if (k) per[k] = (per[k] || 0) + 1; });
  let hari = Object.keys(per).sort();
  if (hari.length) {
    const akhir = new Date(), mulai = Adm.rentang ? new Date(Date.now() - (Adm.rentang - 1) * 864e5) : new Date(hari[0] + 'T00:00:00');
    hari = []; for (let d = new Date(mulai.toISOString().slice(0, 10) + 'T00:00:00'); d <= akhir; d.setDate(d.getDate() + 1)) hari.push(d.toISOString().slice(0, 10));
  }
  const grid = { color: w.grid }, tick = { color: w.teks };
  Adm.charts.hari = new Chart($('#ch-hari'), { type: 'line', data: { labels: hari.map((d) => tglPendek(d).replace(/ \d{4}$/, '')), datasets: [{ label: 'Pendaftar', data: hari.map((d) => per[d] || 0), borderColor: w.utama, backgroundColor: w.utama + '26', fill: true, tension: .35, pointRadius: 2.5, pointHoverRadius: 5 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: Object.assign({ maxTicksLimit: 8 }, tick) }, y: { beginAtZero: true, grid, ticks: Object.assign({ precision: 0 }, tick) } } } });
  const l = L.filter((x) => x.Jenis_Kelamin === 'L').length, p = L.filter((x) => x.Jenis_Kelamin === 'P').length;
  Adm.charts.jk = new Chart($('#ch-jk'), { type: 'doughnut', data: { labels: ['Laki-laki', 'Perempuan'], datasets: [{ data: [l, p], backgroundColor: [w.utama, w.kedua], borderColor: w.bg, borderWidth: 3 }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${L.length ? Math.round((c.raw / L.length) * 100) : 0}%)` } } } } });
  const sk = {}; L.forEach((x) => { const k = (x.Sekolah_Asal || '-').trim(); sk[k] = (sk[k] || 0) + 1; });
  const top = Object.entries(sk).sort((a, b) => b[1] - a[1]).slice(0, 10);
  Adm.charts.sek = new Chart($('#ch-sek'), { type: 'bar', data: { labels: top.map((t) => t[0]), datasets: [{ label: 'Siswa', data: top.map((t) => t[1]), backgroundColor: top.map((_, i) => (i === 0 ? w.aksen : w.utama)), borderRadius: 6, barThickness: 18 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid, ticks: Object.assign({ precision: 0 }, tick) }, y: { grid: { display: false }, ticks: tick } } } });
}

/* =====================================================================
   DATA PENDAFTAR — cari/filter/urut/paging lokal (instan)
   ===================================================================== */
const TABS = [['semua', 'Semua', () => true], ['menunggu', 'Menunggu Verifikasi', (x) => x.Status_Berkas === 'Menunggu Verifikasi'], ['kurang', 'Berkas Kurang', (x) => x.Status_Berkas === 'Kurang'],
  ['belumbayar', 'Belum Dikonfirmasi Bayar', (x) => x.Status_Bayar !== 'Terkonfirmasi'], ['diterima', 'Diterima', (x) => x.Status_Seleksi === 'Diterima'], ['ditolak', 'Ditolak', (x) => x.Status_Seleksi === 'Ditolak']];
function filterList() {
  const f = Adm.filter, q = f.q.toLowerCase();
  const tab = TABS.find((t) => t[0] === f.tab) || TABS[0];
  let L = Adm.boot.list.filter(tab[2]).filter((x) => (!f.berkas || x.Status_Berkas === f.berkas) && (!f.bayar || x.Status_Bayar === f.bayar) && (!f.seleksi || x.Status_Seleksi === f.seleksi) && (!f.jk || x.Jenis_Kelamin === f.jk)
    && (!q || [x.Nama, x.No_Pendaftaran, x.NISN, x.Sekolah_Asal].join(' ').toLowerCase().includes(q)));
  L.sort((a, b) => (String(a[f.sort] || '') > String(b[f.sort] || '') ? 1 : -1) * f.dir);
  return L;
}
PAGES_ADM.pendaftar = (host) => {
  const L = Adm.boot.list, f = Adm.filter;
  const sel = (id, label, opts) => `<select class="inp" id="${id}" aria-label="${label}"><option value="">${label}</option>${opts.map((o) => `<option ${f[id.slice(3)] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  host.innerHTML = `<div class="page-head"><div><h2>Data Pendaftar <span class="chip">${L.length} terdaftar</span></h2><p>Verifikasi berkas, konfirmasi pembayaran, dan tentukan hasil seleksi.</p></div>
    <button class="btn btn-primer" id="btn-ekspor-filter">${ic('file-down')} Ekspor Hasil Filter</button></div>
    <div class="tabs" role="tablist" id="tabs">${TABS.map((t) => `<button role="tab" data-tab="${t[0]}" class="${f.tab === t[0] ? 'on' : ''}">${t[1]} <span class="cnt">${L.filter(t[2]).length}</span></button>`).join('')}</div>
    <div class="card card-pad-sm" style="margin-bottom:14px"><div class="filter-bar">
      <div class="cari inp-wrap prefix"><span class="pre">${ic('search', 'ic-sm')}</span><input class="inp" id="q" placeholder="Cari nama, nomor pendaftaran, NISN, asal sekolah" value="${esc(f.q)}" aria-label="Cari"></div>
      ${sel('fl-berkas', 'Status Berkas', ['Menunggu Verifikasi', 'Lengkap', 'Kurang'])}${sel('fl-bayar', 'Status Bayar', ['Menunggu Konfirmasi', 'Terkonfirmasi', 'Ditolak'])}
      ${sel('fl-seleksi', 'Status Seleksi', ['Dalam Proses', 'Diterima', 'Ditolak'])}<select class="inp" id="fl-jk" aria-label="Jenis kelamin"><option value="">Jenis Kelamin</option><option value="L" ${f.jk === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${f.jk === 'P' ? 'selected' : ''}>Perempuan</option></select>
      <button class="btn btn-ghost" id="reset">${ic('x', 'ic-sm')} Reset</button></div></div>
    <div id="tbl"></div>`;
  const ulang = () => { f.page = 1; tabel(); };
  $('#q').oninput = debounce((e) => { f.q = e.target.value; ulang(); }, 250);
  ['berkas', 'bayar', 'seleksi', 'jk'].forEach((k) => { $('#fl-' + k).onchange = (e) => { f[k] = e.target.value; ulang(); }; });
  $('#reset').onclick = () => { Object.assign(f, { tab: 'semua', q: '', berkas: '', bayar: '', seleksi: '', jk: '', page: 1 }); PAGES_ADM.pendaftar(host); };
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; f.tab = b.dataset.tab; $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b)); ulang(); };
  $('#btn-ekspor-filter').onclick = () => { Adm.eksporPilihan = filterList().map((x) => x.No_Pendaftaran); Adm.eksporScope = 'pilihan'; go('admin/ekspor'); };
  tabel();
};
function tabel() {
  const f = Adm.filter, L = filterList(), tot = L.length, pages = Math.max(1, Math.ceil(tot / PER_PAGE));
  f.page = Math.min(f.page, pages);
  const rows = L.slice((f.page - 1) * PER_PAGE, f.page * PER_PAGE);
  const th = (k, t) => `<th data-sort="${k}" aria-sort="${f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}">${t} ${f.sort === k ? ic(f.dir > 0 ? 'chevron-up' : 'chevron-down', 'ic-sm') : ''}</th>`;
  const box = $('#tbl'); if (!box) return;
  if (!tot) { box.innerHTML = `<div class="card empty"><div class="ilus">${ic('search-x', 'ic-xl')}</div><h4>Tidak ada pendaftar yang cocok</h4><p class="small">Ubah kata kunci atau filter.</p><button class="btn btn-outline" onclick="$('#reset').click()">Reset Filter</button></div>`; return; }
  const pg = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - f.page) <= 1) pg.push(i); else if (pg[pg.length - 1] !== '…') pg.push('…');
  box.innerHTML = `<div class="tbl-wrap resp"><table class="tbl"><thead><tr>${th('No_Pendaftaran', 'No. Pendaftaran')}${th('Nama', 'Nama & NISN')}<th>JK</th>${th('Sekolah_Asal', 'Asal Sekolah')}${th('Timestamp', 'Tgl Daftar')}<th>Status Berkas · Bayar · Seleksi</th><th><span class="sr-only">Aksi</span></th></tr></thead>
    <tbody>${rows.map((x) => `<tr class="klik" data-no="${esc(x.No_Pendaftaran)}"><td class="mono" style="color:var(--primer);font-weight:700">${esc(x.No_Pendaftaran)}</td>
      <td><div class="nama-sel"><span class="ini">${inisial(x.Nama)}</span><div><b>${esc(x.Nama)}</b><div class="xs muted mono">NISN ${esc(x.NISN)}</div></div></div></td><td><span class="chip">${esc(x.Jenis_Kelamin)}</span></td>
      <td>${esc(x.Sekolah_Asal)}</td><td class="small">${tglPendek(x.Timestamp)}</td><td><div class="status3">${badgeStatus(x.Status_Berkas)}${badgeStatus(x.Status_Bayar)}${badgeStatus(x.Status_Seleksi)}</div></td>
      <td><a class="btn btn-ghost btn-sm" href="#/admin/detail/${encodeURIComponent(x.No_Pendaftaran)}" aria-label="Detail ${esc(x.Nama)}">${ic('eye', 'ic-sm')} Detail</a></td></tr>`).join('')}</tbody></table></div>
    <div class="kartu-list">${rows.map((x) => `<a class="card" href="#/admin/detail/${encodeURIComponent(x.No_Pendaftaran)}" style="color:inherit;text-decoration:none"><div class="nama-sel"><span class="ini">${inisial(x.Nama)}</span><div><b>${esc(x.Nama)}</b><div class="xs muted mono">${esc(x.No_Pendaftaran)} · ${esc(x.Sekolah_Asal)}</div></div></div>
      <div class="row">${badgeStatus(x.Status_Berkas)}${badgeStatus(x.Status_Bayar)}${badgeStatus(x.Status_Seleksi)}</div></a>`).join('')}</div>
    <div class="pager"><span>Menampilkan ${(f.page - 1) * PER_PAGE + 1}–${Math.min(f.page * PER_PAGE, tot)} dari ${tot} pendaftar</span>
      <div class="pg">${pages > 1 ? `<button data-pg="${f.page - 1}" ${f.page === 1 ? 'disabled' : ''} aria-label="Sebelumnya">${ic('chevron-left', 'ic-sm')}</button>${pg.map((i) => i === '…' ? '<span style="padding:8px">…</span>' : `<button data-pg="${i}" class="${i === f.page ? 'on' : ''}">${i}</button>`).join('')}<button data-pg="${f.page + 1}" ${f.page === pages ? 'disabled' : ''} aria-label="Berikutnya">${ic('chevron-right', 'ic-sm')}</button>` : ''}</div></div>`;
  box.onclick = (e) => {
    const s = e.target.closest('th[data-sort]'); if (s) { if (f.sort === s.dataset.sort) f.dir *= -1; else { f.sort = s.dataset.sort; f.dir = 1; } tabel(); return; }
    const p = e.target.closest('[data-pg]'); if (p && !p.disabled) { f.page = +p.dataset.pg; tabel(); box.scrollIntoView({ block: 'start' }); return; }
    const tr = e.target.closest('tr[data-no]'); if (tr && !e.target.closest('a')) go('admin/detail/' + encodeURIComponent(tr.dataset.no));
  };
}

/* =====================================================================
   DETAIL & VERIFIKASI — optimistic UI + rollback bila gagal
   ===================================================================== */
const TAB_DETAIL = [
  ['siswa', 'Siswa', [['Nama', 'Nama Lengkap'], ['Jenis_Kelamin', 'Jenis Kelamin'], ['NISN', 'NISN'], ['NIK', 'NIK'], ['Tempat_Lahir', 'Tempat Lahir'], ['Tanggal_Lahir', 'Tanggal Lahir'], ['Agama', 'Agama'], ['No_Akta_Lahir', 'No. Registrasi Akta Lahir'], ['No_KK', 'No. KK'], ['Anak_Ke', 'Anak ke-'], ['Jml_Saudara', 'Jml. Saudara Kandung']]],
  ['alamat', 'Alamat', [['Alamat', 'Alamat'], ['RT', 'RT'], ['RW', 'RW'], ['Dusun', 'Dusun'], ['Kelurahan', 'Kelurahan'], ['Kecamatan', 'Kecamatan'], ['Kode_Pos', 'Kode Pos'], ['Jenis_Tinggal', 'Jenis Tinggal'], ['Alat_Transportasi', 'Alat Transportasi'], ['Jarak_Rumah', 'Jarak ke Sekolah (KM)'], ['Telepon', 'Telepon'], ['HP', 'HP / WA'], ['Email', 'E-Mail']]],
  ['ortu', 'Ortu/Wali', ['Ayah', 'Ibu'].flatMap((p) => [[p + '_Nama', 'Nama ' + p], [p + '_NIK', 'NIK ' + p], [p + '_Tempat_Lahir', 'Tempat Lahir ' + p], [p + '_Tgl_Lahir', 'Tgl Lahir ' + p], [p + '_Pendidikan', 'Pendidikan ' + p], [p + '_Pekerjaan', 'Pekerjaan ' + p], [p + '_Penghasilan', 'Penghasilan ' + p]])
    .concat([['Wali_Nama', 'Nama Wali'], ['Wali_NIK', 'NIK Wali'], ['Wali_Tahun_Lahir', 'Tahun Lahir Wali'], ['Wali_Pendidikan', 'Pendidikan Wali'], ['Wali_Pekerjaan', 'Pekerjaan Wali'], ['Wali_Penghasilan', 'Penghasilan Wali']])],
  ['periodik', 'Periodik', [['Sekolah_Asal', 'Sekolah Asal'], ['No_Seri_Ijazah', 'No. Seri Ijazah'], ['Berat_Badan', 'Berat Badan (kg)'], ['Tinggi_Badan', 'Tinggi Badan (cm)'], ['Lingkar_Kepala', 'Lingkar Kepala (cm)']]],
  ['berkas', 'Berkas', null], ['pdf', 'PDF', null]
];
PAGES_ADM.detail = async (host, p) => {
  const no = p[0]; if (!no) return go('admin/pendaftar');
  const ringkas = Adm.boot.list.find((x) => x.No_Pendaftaran === no);
  Adm.tabDetail = Adm.tabDetail || 'berkas';
  const cache = Adm.detail[no] || Store.get('det:' + no, null);
  if (cache) gambarDetail(host, no, cache.data || cache);
  else host.innerHTML = `<div class="page-head"><div><a href="#/admin/pendaftar" class="small">${ic('arrow-left', 'ic-sm')} Data Pendaftar</a><h2>${esc(ringkas ? ringkas.Nama : no)}</h2></div></div><div class="detail-grid"><div class="card"><div class="sk sk-h"></div><div class="sk sk-box"></div><div class="sk sk-box" style="margin-top:12px"></div></div><div class="card"><div class="sk sk-box"></div></div></div>`;
  const r = await api('getDetail', { no });
  if (!r.success) { if (!cache) host.innerHTML = `<div class="card empty"><div class="ilus">${ic('triangle-alert', 'ic-xl')}</div><h4>${esc(r.message)}</h4><button class="btn btn-primer" onclick="rerender()">Coba lagi</button></div>`; return; }
  const baru = !cache || hashStr(JSON.stringify(cache.data || cache)) !== hashStr(JSON.stringify(r.data));
  Adm.detail[no] = { data: r.data };
  Store.set('det:' + no, { data: r.data });
  if (baru && Adm.page === 'detail' && _adminParam[1] === no) gambarDetail(host, no, r.data);
};
function gambarDetail(host, no, d) {
  const R = d.row;
  const L = Adm.boot.list, idx = L.findIndex((x) => x.No_Pendaftaran === no);
  const prev = L[idx - 1], next = L[idx + 1];
  const bisaTerima = R.Status_Berkas === 'Lengkap' && R.Status_Bayar === 'Terkonfirmasi';
  const tab = Adm.tabDetail;
  host.innerHTML = `<div class="page-head"><div><a href="#/admin/pendaftar" class="small">${ic('arrow-left', 'ic-sm')} Data Pendaftar</a><span class="small muted"> / ${esc(no)}</span></div>
    <div class="row">${prev ? `<a class="btn btn-ghost btn-sm" href="#/admin/detail/${encodeURIComponent(prev.No_Pendaftaran)}">${ic('chevron-left', 'ic-sm')} Sebelumnya</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="#/admin/detail/${encodeURIComponent(next.No_Pendaftaran)}">Berikutnya ${ic('chevron-right', 'ic-sm')}</a>` : ''}</div></div>
    <div class="card" style="margin-bottom:16px"><div class="profil"><div class="foto34" id="foto-kecil">${ic('user', 'ic-xl')}</div>
      <div style="flex:1;min-width:220px"><div class="overline mono">${esc(no)}</div><h2 style="margin:4px 0;font-size:24px">${esc(R.Nama)}</h2><div class="small muted">${esc(R.Sekolah_Asal)} · NISN <span class="mono">${esc(R.NISN)}</span> · Daftar ${tglID(R.Timestamp, true)}</div>
        <div class="row" style="margin-top:10px" id="pill3">${badgeStatus(R.Status_Berkas)}${badgeStatus(R.Status_Bayar)}${badgeStatus(R.Status_Seleksi)}${R.Rombel ? `<span class="chip">Rombel ${esc(R.Rombel)}</span>` : ''}</div></div>
      <div class="row">${d.folderUrl ? `<a class="btn btn-ghost btn-sm" href="${d.folderUrl}" target="_blank" rel="noopener">${ic('folder-open', 'ic-sm')} Folder Drive</a>` : ''}<button class="btn btn-outline btn-sm" id="unduh-pdf-adm">${ic('download', 'ic-sm')} Unduh PDF</button></div></div></div>
    <div class="detail-grid"><div class="card"><div class="tabs" id="tab-d">${TAB_DETAIL.map((t) => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><div id="isi-tab"></div></div>
    <div class="aksi-stack">
      <div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('files', 'ic-sm')} Verifikasi Berkas</span>${badgeStatus(R.Status_Berkas)}</h4><div class="row"><button class="btn btn-sukses btn-sm" data-st="Status_Berkas|Lengkap" ${R.Status_Berkas === 'Lengkap' ? 'disabled' : ''}>${ic('check', 'ic-sm')} Lengkap</button><button class="btn btn-bahaya-o btn-sm" data-st="Status_Berkas|Kurang">${ic('x', 'ic-sm')} Kurang</button></div></div>
      <div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('wallet', 'ic-sm')} Konfirmasi Pembayaran</span>${badgeStatus(R.Status_Bayar)}</h4>
        <button class="file-it" data-lihat="bukti" style="margin-bottom:10px"><span class="ic-bulat aksen">${ic('receipt')}</span><span class="nm"><b>Bukti Pembayaran</b><span>${rupiah(Adm.boot.settings.biaya_formulir)} · klik untuk melihat</span></span></button>
        <div class="row"><button class="btn btn-sukses btn-sm" data-st="Status_Bayar|Terkonfirmasi" ${R.Status_Bayar === 'Terkonfirmasi' ? 'disabled' : ''}>${ic('check', 'ic-sm')} Terkonfirmasi</button><button class="btn btn-bahaya-o btn-sm" data-st="Status_Bayar|Ditolak">${ic('x', 'ic-sm')} Tolak</button></div></div>
      <div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('award', 'ic-sm')} Keputusan Seleksi</span>${badgeStatus(R.Status_Seleksi)}</h4><div class="row"><button class="btn btn-primer btn-sm" data-st="Status_Seleksi|Diterima" ${bisaTerima && R.Status_Seleksi !== 'Diterima' ? '' : 'disabled'}>${ic('badge-check', 'ic-sm')} Diterima</button><button class="btn btn-bahaya-o btn-sm" data-st="Status_Seleksi|Ditolak" ${R.Status_Seleksi === 'Ditolak' ? 'disabled' : ''}>${ic('circle-x', 'ic-sm')} Ditolak</button></div>
        ${bisaTerima ? '' : `<p class="hint" style="margin:10px 0 0">${ic('lock', 'ic-sm')} Aktif setelah berkas Lengkap dan pembayaran Terkonfirmasi.</p>`}</div>
      ${R.Status_Seleksi === 'Diterima' ? `<div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('door-open', 'ic-sm')} Rombel</span></h4><div class="row"><input class="inp" id="in-rombel" value="${esc(R.Rombel)}" placeholder="mis. X-1" style="flex:1"><button class="btn btn-primer btn-sm" id="sv-rombel" style="flex:none">Simpan</button></div></div>` : ''}
      <div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('message-square-text', 'ic-sm')} Catatan untuk Pendaftar</span></h4><textarea class="inp" id="in-cat" placeholder="Tampil di halaman Cek Status pendaftar">${esc(R.Catatan_Admin)}</textarea><button class="btn btn-outline btn-sm btn-block" style="margin-top:10px" id="sv-cat">Simpan Catatan</button></div>
      <div class="card aksi-card"><h4><span class="row" style="gap:8px">${ic('mail', 'ic-sm')} Email & Aktivitas</span><span class="chip">Email: ${esc(R.Email_Terkirim || '-')}</span></h4>
        <button class="btn btn-outline btn-sm btn-block" id="kirim-ulang">${ic('send', 'ic-sm')} Kirim Ulang Email + PDF</button>
        <ul class="log-list" id="log-list" style="margin-top:14px"><li><span class="small muted">Memuat aktivitas…</span></li></ul></div>
    </div></div>`;
  $('#tab-d').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; Adm.tabDetail = b.dataset.t; $$('#tab-d button').forEach((x) => x.classList.toggle('on', x === b)); isiTab(no, d); };
  isiTab(no, d);
  host.querySelectorAll('[data-st]').forEach((b) => { b.onclick = () => ubahStatus(no, ...b.dataset.st.split('|')); });
  $('[data-lihat="bukti"]').onclick = () => { Adm.tabDetail = 'berkas'; Adm.fileAktif = 'bukti'; $$('#tab-d button').forEach((x) => x.classList.toggle('on', x.dataset.t === 'berkas')); isiTab(no, d); $('#isi-tab').scrollIntoView({ behavior: 'smooth' }); };
  $('#sv-cat').onclick = (e) => simpanKecil(e.currentTarget, 'saveCatatan', { no, note: $('#in-cat').value }, (x) => { R.Catatan_Admin = x.note; }, 'Catatan disimpan');
  $('#sv-rombel') && ($('#sv-rombel').onclick = (e) => simpanKecil(e.currentTarget, 'saveRombel', { no, rombel: $('#in-rombel').value }, (x) => { R.Rombel = x.rombel; patchList(no, { Rombel: x.rombel }); }, 'Rombel disimpan'));
  $('#kirim-ulang').onclick = async (e) => { if (!(await konfirmasi({ judul: 'Kirim ulang email?', pesan: `Email bukti pendaftaran + PDF akan dikirim ke <b>${esc(R.Email)}</b>.`, ok: 'Kirim', ikon: 'send' }))) return; const b = e.currentTarget; setBusy(b, true, 'Mengirim…'); const r = await api('resendEmail', { no }); setBusy(b, false); r.success ? (toast('Email terkirim', r.message), patchList(no, { Email_Terkirim: 'Ya' })) : toast('Gagal', r.message, 'error'); };
  $('#unduh-pdf-adm').onclick = async (e) => { const b = e.currentTarget; setBusy(b, true); const r = await api('getFile', { no, jenis: 'pdf' }); setBusy(b, false); r.success ? unduhB64(r.data.b64, r.data.name) : toast('Gagal', r.message, 'error'); };
  ambilBerkas(no, 'foto').then((f) => { const el = $('#foto-kecil'); if (f && el && f.mime.startsWith('image/')) el.outerHTML = `<img class="foto34" src="data:${f.mime};base64,${f.b64}" alt="Pas foto">`; });
  api('getLogs', { no }).then((r) => { const ul = $('#log-list'); if (!ul) return; ul.innerHTML = r.success && r.data.length ? r.data.slice(0, 20).map((x) => `<li><div><b>${esc(x.Aksi.replace(/_/g, ' '))}</b> <span class="muted">${esc(x.Detail || '')}</span><div class="xs muted">${tglID(x.Waktu, true)}</div></div></li>`).join('') : '<li><span class="small muted">Belum ada aktivitas.</span></li>'; });
}
function isiTab(no, d) {
  const box = $('#isi-tab'), t = Adm.tabDetail, R = d.row;
  const def = TAB_DETAIL.find((x) => x[0] === t);
  if (def && def[2]) {
    box.innerHTML = `<div class="kv" style="border:1px solid var(--border);border-radius:12px;overflow:hidden">${def[2].map(([k, l]) => `<div>${esc(l)}</div><div class="${/NIK|NISN|KK/.test(k) ? 'mono' : ''}">${esc(k === 'Jenis_Kelamin' ? (R[k] === 'P' ? 'Perempuan' : 'Laki-laki') : R[k] || '-')}</div>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn btn-outline btn-sm" id="btn-edit">${ic('pencil', 'ic-sm')} Edit Data</button></div>`;
    $('#btn-edit').onclick = () => editData(no, d, def);
    return;
  }
  if (t === 'pdf') {
    box.innerHTML = `<div class="viewer" id="viewer"><div class="sk" style="width:100%;height:420px"></div></div>`;
    ambilBerkas(no, 'pdf').then((f) => tampilFile(f));
    return;
  }
  const aktif = Adm.fileAktif || 'foto';
  box.innerHTML = `<div class="file-list">${d.files.map((f) => `<button class="file-it ${f.jenis === aktif ? 'on' : ''}" data-jf="${f.jenis}"><span class="ic-bulat ${f.id ? 'hijau' : 'merah'}">${ic(f.mime === 'application/pdf' ? 'file-text' : 'image')}</span>
    <span class="nm"><b>${esc(f.label)}</b><span>${f.id ? esc(f.name) + ' · ' + ukuran(f.size) : 'Belum ada'}</span></span>${f.url ? `<a class="btn btn-ghost btn-sm" href="${f.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()" aria-label="Buka di Drive">${ic('external-link', 'ic-sm')}</a>` : ''}</button>`).join('')}</div>
    <div class="viewer" id="viewer"><div class="sk" style="width:100%;height:420px"></div></div>`;
  box.querySelector('.file-list').onclick = (e) => { const b = e.target.closest('[data-jf]'); if (!b) return; Adm.fileAktif = b.dataset.jf; $$('.file-it', box).forEach((x) => x.classList.toggle('on', x === b)); $('#viewer').innerHTML = '<div class="sk" style="width:100%;height:420px"></div>'; ambilBerkas(no, b.dataset.jf).then(tampilFile); };
  ambilBerkas(no, aktif).then(tampilFile);
}
async function ambilBerkas(no, jenis) {
  const k = no + ':' + jenis;
  if (Adm.files[k]) return Adm.files[k];
  const r = await api('getFile', { no, jenis });
  if (!r.success) return { error: r.message };
  return (Adm.files[k] = r.data);
}
function tampilFile(f) {
  const v = $('#viewer'); if (!v) return;
  if (!f || f.error) { v.innerHTML = `<div class="empty">${ic('file-x', 'ic-xl')}<p>${esc((f && f.error) || 'Berkas tidak tersedia')}</p></div>`; return; }
  if (f.mime.startsWith('image/')) v.innerHTML = `<img src="data:${f.mime};base64,${f.b64}" alt="${esc(f.name)}">`;
  else { const url = URL.createObjectURL(b64ToBlob(f.b64, f.mime)); v.innerHTML = `<iframe src="${url}" title="${esc(f.name)}"></iframe>`; }
}
function patchList(no, patch) { const x = Adm.boot.list.find((y) => y.No_Pendaftaran === no); if (x) Object.assign(x, patch); setBoot(Adm.boot); perbaruiShell(); }
async function ubahStatus(no, field, value) {
  const det = Adm.detail[no] && Adm.detail[no].data; if (!det) return;
  const R = det.row;
  const butuhCatatan = field === 'Status_Berkas' && value === 'Kurang';
  const label = { Status_Berkas: 'status berkas', Status_Bayar: 'status pembayaran', Status_Seleksi: 'status seleksi' }[field];
  const jawab = await konfirmasi({ judul: `Ubah ${label} menjadi ${value.toUpperCase()}?`, pesan: `Untuk <b>${esc(R.Nama)}</b> (${esc(no)}). Perubahan tercatat di log aktivitas.`,
    ok: 'Ya, Simpan', kelas: /Kurang|Ditolak/.test(value) ? 'btn-bahaya' : 'btn-primer', ikon: /Kurang|Ditolak/.test(value) ? 'triangle-alert' : 'circle-check',
    catatan: butuhCatatan || /Ditolak/.test(value), wajib: butuhCatatan, placeholder: butuhCatatan ? 'Contoh: Scan KK buram, mohon kirim ulang via WhatsApp panitia.' : 'Alasan (opsional, tampil di Cek Status)' });
  if (!jawab) return;
  const note = jawab.catatan || '';
  // optimistic: ubah tampilan dulu, kirim ke server, kembalikan bila gagal
  const lama = { [field]: R[field], Catatan_Admin: R.Catatan_Admin };
  R[field] = value; if (note) R.Catatan_Admin = note;
  patchList(no, { [field]: value });
  gambarDetail($('#adm-content'), no, det);
  const r = await api('setStatus', { no, field, value, note });
  if (!r.success) { Object.assign(R, lama); patchList(no, { [field]: lama[field] }); gambarDetail($('#adm-content'), no, det); toast('Gagal menyimpan', r.message, 'error'); return; }
  Store.set('det:' + no, { data: det });
  toast('Tersimpan', `${R.Nama}: ${value}`);
}
async function simpanKecil(btn, action, data, apply, pesan) {
  setBusy(btn, true);
  const r = await api(action, data);
  setBusy(btn, false);
  if (!r.success) return toast('Gagal', r.message, 'error');
  apply(r.data); const no = data.no; if (Adm.detail[no]) Store.set('det:' + no, Adm.detail[no]);
  toast(pesan);
}
function editData(no, d, def) {
  const R = d.row;
  const ref = (Adm.boot && Adm.boot.referensi) || {};
  const pilihan = { Agama: ref.Agama, Jenis_Tinggal: ref.Jenis_Tinggal, Alat_Transportasi: ref.Alat_Transportasi };
  const m = modal(`<h3>${ic('pencil')} Edit ${esc(def[1])}</h3><p class="muted small">Untuk koreksi salah ketik. Perubahan tercatat di log.</p><form id="ed-form" class="fgrid" style="margin-top:12px">${def[2].map(([k, l]) => {
    const opts = pilihan[k] || (/Pendidikan$/.test(k) ? ref.Pendidikan : /Pekerjaan$/.test(k) ? ref.Pekerjaan : /Penghasilan$/.test(k) ? ref.Penghasilan : k === 'Jenis_Kelamin' ? ['L', 'P'] : null);
    return `<div class="field" data-f="${k}"><label>${esc(l)}</label>${opts ? `<select class="inp" name="${k}"><option value=""></option>${opts.map((o) => `<option ${o === R[k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input class="inp" name="${k}" value="${esc(R[k])}" ${/Tanggal_Lahir|Tgl_Lahir/.test(k) ? 'type="date"' : ''}>`}<div class="errmsg">${ic('circle-alert', 'ic-sm')} <span></span></div></div>`;
  }).join('')}</form><div class="aksi"><button class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primer" data-ok>Simpan Perubahan</button></div>`, { lebar: true });
  m.querySelector('[data-x]').onclick = () => m.tutup();
  m.querySelector('[data-ok]').onclick = async (e) => {
    const patch = {}; new FormData(m.querySelector('#ed-form')).forEach((v, k) => { if (String(v) !== String(R[k] || '')) patch[k] = v; });
    if (!Object.keys(patch).length) return m.tutup();
    setBusy(e.currentTarget, true);
    const r = await api('editData', { no, patch });
    setBusy(e.currentTarget, false);
    if (!r.success) { const er = (r.data && r.data.errors) || {}; Object.keys(er).forEach((k) => { const f = m.querySelector(`[data-f="${k}"]`); if (f) { f.classList.add('err'); f.querySelector('.errmsg span').textContent = er[k]; } }); toast('Gagal', r.message, 'error'); return; }
    d.row = r.data.row; Adm.detail[no] = { data: d }; Store.set('det:' + no, { data: d });
    patchList(no, { Nama: d.row.Nama, NISN: d.row.NISN, Sekolah_Asal: d.row.Sekolah_Asal, Jenis_Kelamin: d.row.Jenis_Kelamin });
    m.tutup(); gambarDetail($('#adm-content'), no, d); toast('Data diperbarui');
  };
}

/* =====================================================================
   EKSPOR DAPODIK
   ===================================================================== */
PAGES_ADM.ekspor = (host) => {
  const L = Adm.boot.list, nT = L.filter((x) => x.Status_Seleksi === 'Diterima').length, nP = (Adm.eksporPilihan || []).length;
  const scope = Adm.eksporScope || 'diterima';
  const contoh = L.filter((x) => scope === 'semua' || (scope === 'diterima' ? x.Status_Seleksi === 'Diterima' : (Adm.eksporPilihan || []).includes(x.No_Pendaftaran))).slice(0, 3);
  host.innerHTML = `<div class="page-head"><div><h2>Ekspor Data Format Dapodik</h2><p>File Excel mengikuti template <b>Daftar Peserta Didik</b> — 51 kolom (A–AY), header 2 baris.</p></div></div>
    <div class="card"><div class="card-title"><span class="ic-bulat hijau">${ic('file-spreadsheet')}</span> 1. Pilih Cakupan Data</div>
      <div class="radio-kartu" id="scope">
        <label><input type="radio" name="sc" value="diterima" ${scope === 'diterima' ? 'checked' : ''}><b>Hanya Siswa Diterima</b><span class="jml">${nT}</span><span class="small muted">Disarankan untuk impor peserta didik baru ke Dapodik.</span></label>
        <label><input type="radio" name="sc" value="semua" ${scope === 'semua' ? 'checked' : ''}><b>Semua Pendaftar</b><span class="jml">${L.length}</span><span class="small muted">Termasuk yang masih diproses / ditolak.</span></label>
        <label><input type="radio" name="sc" value="pilihan" ${scope === 'pilihan' ? 'checked' : ''} ${nP ? '' : 'disabled'}><b>Sesuai Filter Aktif</b><span class="jml">${nP}</span><span class="small muted">${nP ? 'Dari halaman Data Pendaftar.' : 'Gunakan tombol "Ekspor Hasil Filter" di Data Pendaftar.'}</span></label>
      </div>
      <div class="callout" style="margin-top:16px">${ic('info')}<div>NIK, NISN, dan No. KK disimpan sebagai <b>teks</b> sehingga angka 0 di depan dan 16 digit tetap utuh. Tanggal berformat <span class="mono">YYYY-MM-DD</span>.</div></div></div>
    <div class="card" style="margin-top:16px"><div class="card-title">${ic('table')} 2. Pratinjau Struktur Kolom</div>
      <div class="tbl-wrap"><table class="tbl" style="font-size:12.5px"><thead><tr><th rowspan="2">No</th><th rowspan="2">Nama</th><th rowspan="2">JK</th><th rowspan="2">NISN</th><th rowspan="2">…</th><th colspan="3" style="text-align:center;background:var(--sekunder-tint)">Data Ayah</th><th colspan="2" style="text-align:center;background:var(--sekunder-tint)">Data Ibu</th><th rowspan="2">Rombel</th><th rowspan="2">Sekolah Asal</th><th rowspan="2">… s.d. AY</th></tr>
        <tr><th>Nama</th><th>Tgl Lahir</th><th>…</th><th>Nama</th><th>…</th></tr></thead>
        <tbody>${contoh.length ? contoh.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.Nama)}</td><td>${esc(x.Jenis_Kelamin)}</td><td class="mono">${esc(x.NISN)}</td><td>…</td><td colspan="3" class="muted">(data ayah)</td><td colspan="2" class="muted">(data ibu)</td><td>${esc(x.Rombel || '-')}</td><td>${esc(x.Sekolah_Asal)}</td><td>…</td></tr>`).join('') : `<tr><td colspan="14" class="muted" style="text-align:center">Belum ada data pada cakupan ini.</td></tr>`}</tbody></table></div>
      <div class="row-between" style="margin-top:16px"><span class="chip">${ic('file-spreadsheet', 'ic-sm')} PPDB_Dapodik_${esc(String(Adm.boot.settings.tahun_ajaran).replace('/', '-'))}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx</span>
        <button class="btn btn-sukses btn-lg" id="btn-unduh-x">${ic('download')} Unduh File Excel (.xlsx)</button></div></div>`;
  $('#scope').onchange = (e) => { Adm.eksporScope = e.target.value; PAGES_ADM.ekspor(host); };
  $('#btn-unduh-x').onclick = async (e) => {
    const b = e.currentTarget; setBusy(b, true, 'Menyiapkan file…');
    const r = await api('exportDapodik', { scope, nos: scope === 'pilihan' ? Adm.eksporPilihan : [] }, { timeout: 180000, tries: 1 });
    setBusy(b, false);
    if (!r.success) return toast('Ekspor gagal', r.message, 'error');
    unduhB64(r.data.b64, r.data.name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast('Ekspor selesai', r.data.count + ' baris data');
  };
};

/* =====================================================================
   PENGATURAN TAMPILAN
   ===================================================================== */
const ASET = [['logo_utama', 'Logo Utama Sekolah', 'PNG transparan, persegi · navbar, sidebar, PDF'], ['logo_yayasan', 'Logo Yayasan / Kop PDF', 'PNG persegi · footer & kop PDF'],
  ['logo_gelap', 'Logo Mode Gelap (opsional)', 'Versi putih/terang agar jelas di latar gelap'], ['favicon', 'Favicon', 'PNG 512×512 · ikon tab browser'], ['bg_hero', 'Background Hero Beranda', 'JPG 1920×1080 · maks 3 MB']];
PAGES_ADM.tampilan = (host) => {
  const a = Adm.boot.assets || {}, s = Adm.boot.settings;
  const fallback = { logo_utama: 'img/logo-triguna.png', logo_yayasan: 'img/logo-triguna.png', favicon: 'img/favicon.png' };
  host.innerHTML = `<div class="page-head"><div><h2>Pengaturan Tampilan</h2><p>Unggah logo, favicon, dan gambar latar langsung dari komputer. Perubahan langsung dipakai di portal & PDF.</p></div></div>
    <div class="detail-grid"><div class="stack">
      <div class="aset-grid">${ASET.map(([k, t, h]) => `<div class="card" data-aset="${k}"><div class="aset-prev ${k === 'bg_hero' ? 'bg' : ''}">${a[k] || fallback[k] ? `<img src="${a[k] || fallback[k]}" alt="${esc(t)}">` : `<span class="muted small">${ic('image')} Belum diatur</span>`}</div>
        <b>${t}</b><div class="hint" style="margin-bottom:12px">${h}${a[k] ? '' : fallback[k] ? ' · <i>memakai bawaan</i>' : ''}</div>
        <div class="row"><label class="btn btn-primer btn-sm" style="flex:1">${ic('upload', 'ic-sm')} Unggah dari Komputer<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-up="${k}"></label>
        ${a[k] ? `<button class="btn btn-ghost btn-sm" data-reset="${k}">Kembalikan Default</button>` : ''}</div></div>`).join('')}</div>
      <div class="card"><div class="card-title">${ic('sun-moon')} Tema Default Pengunjung</div><p class="small muted">Dipakai bagi pengunjung yang belum pernah memilih tema sendiri.</p>
        <div class="segmen" id="tema-def">${[['IKUTI_PERANGKAT', 'Ikuti Perangkat'], ['TERANG', 'Terang'], ['GELAP', 'Gelap']].map(([v, t]) => `<button data-v="${v}" class="${s.tema_default === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    </div>
    <div class="aksi-stack"><div class="card"><div class="row-between" style="margin-bottom:12px"><div class="card-title" style="margin:0">${ic('monitor')} Pratinjau Langsung</div>${temaBtn()}</div>
      <div class="mini-browser"><div class="bar"><span class="dots"><i></i><i></i><i></i></span><img src="${a.favicon || 'img/favicon.png'}" alt="" id="pv-fav"><span>PPDB Online — ${esc(s.nama_sekolah)}</span></div>
      <div class="mini-hero" id="pv-hero" style="--mini-img:${a.bg_hero ? `url('${a.bg_hero}')` : 'none'}"><div class="bb"><img src="${logoUrl(Adm.boot)}" alt="" id="pv-logo">SMA Triguna 1956</div><div><span class="badge b-buka" style="background:rgba(255,255,255,.15);color:#fff;font-size:10px">PPDB ${esc(s.tahun_ajaran)}</span><h5 style="margin-top:6px">${esc(s.hero_judul)}</h5></div></div></div>
      <p class="hint" style="margin-top:10px">Ganti tema dengan tombol di atas untuk melihat hasil di Mode Terang & Mode Gelap.</p></div></div></div>`;
  host.onchange = async (e) => {
    const inp = e.target.closest('[data-up]'); if (!inp || !inp.files[0]) return;
    const k = inp.dataset.up; let f = inp.files[0];
    if (f.size > 3 * 1048576 || k === 'bg_hero') f = await kompresGambar(f, k === 'bg_hero' ? 1920 : 800, 0.85, 2.5 * 1048576);
    const card = inp.closest('[data-aset]');
    const url = URL.createObjectURL(f);
    card.querySelector('.aset-prev').innerHTML = `<img src="${url}" alt="">`;
    const ok = await konfirmasi({ judul: 'Terapkan gambar baru?', pesan: `<img src="${url}" alt="" style="max-height:160px;margin:10px auto;border-radius:10px">${esc(f.name)} · ${ukuran(f.size)}`, ok: 'Terapkan', ikon: 'image' });
    if (!ok) { PAGES_ADM.tampilan(host); return; }
    toast('Mengunggah…', '', 'info', 2000);
    const r = await api('uploadAsset', { jenis: k, mime: f.type, b64: await fileToB64(f) }, { timeout: 120000 });
    if (!r.success) { toast('Gagal mengunggah', r.message, 'error'); PAGES_ADM.tampilan(host); return; }
    Adm.boot.assets[k] = r.data.url; setBoot(Adm.boot);
    if (App.boot) { App.boot.assets[k] = r.data.url; terapkanAset(App.boot); Store.del('boot'); }
    toast('Tampilan diperbarui', r.message || '');
    PAGES_ADM.tampilan(host);
  };
  host.onclick = async (e) => {
    const rs = e.target.closest('[data-reset]');
    if (rs) { if (!(await konfirmasi({ judul: 'Kembalikan ke bawaan?', pesan: 'Gambar yang diunggah akan dihapus.', ok: 'Kembalikan', kelas: 'btn-bahaya', ikon: 'rotate-ccw' }))) return;
      const r = await api('resetAsset', { jenis: rs.dataset.reset }); if (!r.success) return toast('Gagal', r.message, 'error');
      Adm.boot.assets[rs.dataset.reset] = ''; setBoot(Adm.boot); if (App.boot) { App.boot.assets[rs.dataset.reset] = ''; terapkanAset(App.boot); Store.del('boot'); } toast('Dikembalikan ke bawaan'); PAGES_ADM.tampilan(host); }
    const tv = e.target.closest('#tema-def [data-v]');
    if (tv) { const lama = s.tema_default; s.tema_default = tv.dataset.v; $$('#tema-def button').forEach((b) => b.classList.toggle('on', b === tv));
      const r = await api('saveSettings', { settings: { tema_default: tv.dataset.v } });
      if (!r.success) { s.tema_default = lama; toast('Gagal', r.message, 'error'); return PAGES_ADM.tampilan(host); }
      setBoot(r.data); Store.del('boot'); toast('Tema default disimpan'); }
  };
};
document.addEventListener('tema', () => { const l = $('#pv-logo'); if (l && Adm.boot) l.src = logoUrl(Adm.boot); });

/* =====================================================================
   KONTEN & PENDAFTARAN
   ===================================================================== */
const TAB_KONTEN = [['pendaftaran', 'Pendaftaran'], ['jadwal', 'Jadwal'], ['Syarat', 'Syarat'], ['biaya', 'Biaya & Rekening'], ['Alur', 'Alur'], ['FAQ', 'FAQ'], ['Daftar Ulang', 'Daftar Ulang'], ['kontak', 'Kontak & Lokasi'], ['teks', 'Teks & Identitas']];
PAGES_ADM.konten = (host) => {
  Adm.tabKonten = Adm.tabKonten || 'pendaftaran';
  host.innerHTML = `<div class="page-head"><div><h2>Konten & Pendaftaran</h2><p>Atur status pendaftaran, jadwal, syarat, biaya, dan informasi yang tampil di portal publik.</p></div></div>
    <div class="tabs" id="tab-k">${TAB_KONTEN.map(([k, t]) => `<button data-k="${k}" class="${Adm.tabKonten === k ? 'on' : ''}">${t}</button>`).join('')}</div><div id="isi-k"></div>`;
  $('#tab-k').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; Adm.tabKonten = b.dataset.k; $$('#tab-k button').forEach((x) => x.classList.toggle('on', x === b)); isiKonten(); };
  isiKonten();
};
function inputSet(k, label, o = {}) {
  const v = Adm.boot.settings[k] ?? '';
  return `<div class="field ${o.full ? 'full' : ''}"><label for="s-${k}">${label}</label>${o.area ? `<textarea class="inp" id="s-${k}" data-set="${k}">${esc(v)}</textarea>` : o.pre ? `<div class="inp-wrap prefix"><span class="pre">${o.pre}</span><input class="inp" id="s-${k}" data-set="${k}" value="${esc(v)}" ${o.type ? `type="${o.type}"` : ''} inputmode="${o.im || ''}"></div>` : `<input class="inp" id="s-${k}" data-set="${k}" value="${esc(v)}" ${o.type ? `type="${o.type}"` : ''}>`}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
}
const simpanBar = (id = 'sv-set') => `<div class="simpan-bar"><span class="small muted">${ic('info', 'ic-sm')} Perubahan tampil di portal setelah disimpan.</span><button class="btn btn-aksen" id="${id}">${ic('save', 'ic-sm')} Simpan Perubahan</button></div>`;
function ikatSimpanSet() {
  $('#sv-set').onclick = async (e) => {
    const patch = {}; $$('[data-set]').forEach((i) => { patch[i.dataset.set] = i.type === 'checkbox' ? (i.checked ? 'BUKA' : 'TUTUP') : i.value; });
    setBusy(e.currentTarget, true, 'Menyimpan…');
    const r = await api('saveSettings', { settings: patch });
    setBusy(e.currentTarget, false);
    if (!r.success) return toast('Gagal menyimpan', r.message, 'error');
    setBoot(r.data); Store.del('boot'); Boot.muat(true); perbaruiShell(); toast('Pengaturan disimpan');
  };
}
function isiKonten() {
  const box = $('#isi-k'), t = Adm.tabKonten, s = Adm.boot.settings;
  if (t === 'pendaftaran') {
    box.innerHTML = `<div class="card"><div class="row-between"><div><b style="font-size:17px">Status Pendaftaran</b><p class="small muted" style="margin:4px 0 0">Bila TUTUP, tombol Daftar di portal dinonaktifkan dan formulir tidak bisa dikirim.</p></div>
      <label class="row" style="gap:10px;font-weight:700"><span class="switch"><input type="checkbox" data-set="status_pendaftaran" ${s.status_pendaftaran === 'BUKA' ? 'checked' : ''} id="sw-buka"><span></span></span><span id="lbl-buka">${s.status_pendaftaran === 'BUKA' ? 'BUKA' : 'TUTUP'}</span></label></div>
      <div class="fgrid" style="margin-top:20px">${inputSet('tahun_ajaran', 'Tahun Ajaran', { hint: 'Contoh: 2027/2028 — menentukan awalan nomor pendaftaran' })}<div></div>${inputSet('tanggal_buka', 'Tanggal Buka', { type: 'date', hint: 'Kosongkan bila tanpa batas' })}${inputSet('tanggal_tutup', 'Tanggal Tutup', { type: 'date', hint: 'Kosongkan bila tanpa batas' })}</div>
      <div class="callout ${Adm.boot.status.open ? 'sukses' : 'peringatan'}" style="margin-top:16px">${ic(Adm.boot.status.open ? 'circle-check' : 'triangle-alert')}<div>Saat ini: <b>${Adm.boot.status.open ? 'Pendaftaran dibuka untuk umum.' : esc(Adm.boot.status.reason)}</b></div></div></div>${simpanBar()}`;
    $('#sw-buka').onchange = (e) => { $('#lbl-buka').textContent = e.target.checked ? 'BUKA' : 'TUTUP'; };
    return ikatSimpanSet();
  }
  if (t === 'biaya') {
    box.innerHTML = `<div class="detail-grid"><div class="card"><div class="fgrid">${inputSet('biaya_formulir', 'Biaya Formulir', { pre: 'Rp', im: 'numeric' })}${inputSet('bank_nama', 'Nama Bank')}${inputSet('bank_norek', 'No. Rekening')}${inputSet('bank_atas_nama', 'Atas Nama')}${inputSet('catatan_bayar', 'Catatan Pembayaran', { area: true, full: true })}</div></div>
      <div class="card biaya-card" style="grid-template-columns:1fr"><div><div class="overline">Pratinjau</div><div class="nominal" id="pv-biaya">${rupiah(s.biaya_formulir)}</div></div><div class="rek"><div style="font-weight:700" id="pv-bank">${esc(s.bank_nama)}</div><div class="norek mono" id="pv-norek">${esc(s.bank_norek)}</div><div class="small">a.n. <span id="pv-an">${esc(s.bank_atas_nama)}</span></div></div></div></div>${simpanBar()}`;
    box.oninput = () => { $('#pv-biaya').textContent = rupiah($('#s-biaya_formulir').value.replace(/\D/g, '')); $('#pv-bank').textContent = $('#s-bank_nama').value; $('#pv-norek').textContent = $('#s-bank_norek').value; $('#pv-an').textContent = $('#s-bank_atas_nama').value; };
    return ikatSimpanSet();
  }
  if (t === 'kontak') {
    box.innerHTML = `<div class="card"><div class="fgrid">${inputSet('kontak_wa', 'WhatsApp Panitia', { hint: 'Contoh: 081234567890' })}${inputSet('kontak_telp', 'Telepon Sekolah')}${inputSet('kontak_email', 'Email Panitia', { type: 'email' })}<div></div>
      ${inputSet('alamat_sekolah', 'Alamat Sekolah', { area: true, full: true })}${inputSet('maps_embed_url', 'Link Sematan Google Maps', { full: true, hint: 'Google Maps → Bagikan → Sematkan peta → salin alamat di dalam src="…" (diawali https://www.google.com/maps/embed)' })}${inputSet('maps_link', 'Link Google Maps (tombol Buka di Maps)', { full: true })}</div></div>${simpanBar()}`;
    return ikatSimpanSet();
  }
  if (t === 'teks') {
    box.innerHTML = `<div class="card"><div class="fgrid">${inputSet('nama_sekolah', 'Nama Sekolah')}${inputSet('nama_yayasan', 'Nama Yayasan (kop PDF)')}${inputSet('hero_judul', 'Judul Beranda', { full: true })}${inputSet('hero_subjudul', 'Subjudul Beranda', { full: true, area: true })}${inputSet('ttd_panitia', 'Jabatan Penanda Tangan PDF', { hint: 'Contoh: Ketua Panitia PPDB' })}</div></div>${simpanBar()}`;
    return ikatSimpanSet();
  }
  if (t === 'jadwal') {
    let L = (Adm.boot.jadwal || []).map((j) => Object.assign({}, j));
    const gambar = () => {
      box.innerHTML = `<div class="row-between" style="margin-bottom:12px"><span class="small muted">Urutkan dengan tombol panah. Kegiatan yang sedang berlangsung otomatis disorot di portal.</span><button class="btn btn-primer btn-sm" id="tambah">${ic('plus', 'ic-sm')} Tambah Jadwal</button></div>
        <div class="item-list">${L.map((j, i) => `<div class="item-row" data-i="${i}"><div class="urut"><button aria-label="Naikkan" data-up="${i}" ${i ? '' : 'disabled'}>${ic('chevron-up', 'ic-sm')}</button><button aria-label="Turunkan" data-dn="${i}" ${i < L.length - 1 ? '' : 'disabled'}>${ic('chevron-down', 'ic-sm')}</button></div>
          <div class="isi"><input class="inp" data-k="Kegiatan" value="${esc(j.Kegiatan)}" placeholder="Nama kegiatan" aria-label="Kegiatan"><div class="two"><input class="inp" type="date" data-k="Tanggal_Mulai" value="${esc(j.Tanggal_Mulai)}" aria-label="Tanggal mulai"><input class="inp" type="date" data-k="Tanggal_Selesai" value="${esc(j.Tanggal_Selesai)}" aria-label="Tanggal selesai"></div><input class="inp" data-k="Keterangan" value="${esc(j.Keterangan)}" placeholder="Keterangan (opsional)" aria-label="Keterangan"></div>
          <button class="btn btn-ikon" data-del="${i}" aria-label="Hapus" style="color:var(--bahaya)">${ic('trash-2')}</button></div>`).join('') || `<div class="card empty">Belum ada jadwal.</div>`}</div>${simpanBar('sv-jd')}`;
    };
    gambar();
    box.oninput = (e) => { const r = e.target.closest('[data-i]'); if (r && e.target.dataset.k) L[+r.dataset.i][e.target.dataset.k] = e.target.value; };
    box.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'tambah') { L.push({ Kegiatan: '', Tanggal_Mulai: '', Tanggal_Selesai: '', Keterangan: '' }); gambar(); $$('.item-row').pop().querySelector('input').focus(); }
      if (b.dataset.up) { const i = +b.dataset.up; [L[i - 1], L[i]] = [L[i], L[i - 1]]; gambar(); }
      if (b.dataset.dn) { const i = +b.dataset.dn; [L[i + 1], L[i]] = [L[i], L[i + 1]]; gambar(); }
      if (b.dataset.del) { if (await konfirmasi({ judul: 'Hapus jadwal ini?', pesan: esc(L[+b.dataset.del].Kegiatan), ok: 'Hapus', kelas: 'btn-bahaya', ikon: 'trash-2' })) { L.splice(+b.dataset.del, 1); gambar(); } }
      if (b.id === 'sv-jd') { setBusy(b, true, 'Menyimpan…'); const r = await api('saveJadwal', { jadwal: L }); setBusy(b, false); if (!r.success) return toast('Gagal', r.message, 'error'); Adm.boot.jadwal = r.data; L = r.data.map((j) => Object.assign({}, j)); setBoot(Adm.boot); Store.del('boot'); gambar(); toast('Jadwal disimpan'); }
    };
    return;
  }
  // Syarat / Alur / FAQ / Daftar Ulang
  let L = (Adm.boot.konten || []).filter((k) => k.Bagian === t).map((k) => ({ Judul: k.Judul, Isi: k.Isi }));
  const gambar = () => {
    box.innerHTML = `<div class="row-between" style="margin-bottom:12px"><span class="small muted">${{ Syarat: 'Daftar dokumen di beranda.', Alur: 'Langkah pendaftaran di beranda.', FAQ: 'Pertanyaan umum di beranda.', 'Daftar Ulang': 'Tampil di Cek Status bagi siswa yang diterima.' }[t]}</span><button class="btn btn-primer btn-sm" id="tambah">${ic('plus', 'ic-sm')} Tambah</button></div>
      <div class="item-list">${L.map((k, i) => `<div class="item-row" data-i="${i}"><div class="urut"><button aria-label="Naikkan" data-up="${i}" ${i ? '' : 'disabled'}>${ic('chevron-up', 'ic-sm')}</button><button aria-label="Turunkan" data-dn="${i}" ${i < L.length - 1 ? '' : 'disabled'}>${ic('chevron-down', 'ic-sm')}</button></div>
        <div class="isi"><input class="inp" data-k="Judul" value="${esc(k.Judul)}" placeholder="Judul" aria-label="Judul"><textarea class="inp" data-k="Isi" rows="2" placeholder="Isi" aria-label="Isi" style="min-height:70px">${esc(k.Isi)}</textarea></div>
        <button class="btn btn-ikon" data-del="${i}" aria-label="Hapus" style="color:var(--bahaya)">${ic('trash-2')}</button></div>`).join('') || `<div class="card empty">Belum ada item.</div>`}</div>${simpanBar('sv-kt')}`;
  };
  gambar();
  box.oninput = (e) => { const r = e.target.closest('[data-i]'); if (r && e.target.dataset.k) L[+r.dataset.i][e.target.dataset.k] = e.target.value; };
  box.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'tambah') { L.push({ Judul: '', Isi: '' }); gambar(); $$('.item-row').pop().querySelector('input').focus(); }
    if (b.dataset.up) { const i = +b.dataset.up; [L[i - 1], L[i]] = [L[i], L[i - 1]]; gambar(); }
    if (b.dataset.dn) { const i = +b.dataset.dn; [L[i + 1], L[i]] = [L[i], L[i + 1]]; gambar(); }
    if (b.dataset.del) { L.splice(+b.dataset.del, 1); gambar(); }
    if (b.id === 'sv-kt') { setBusy(b, true, 'Menyimpan…'); const r = await api('saveKonten', { bagian: t, items: L }); setBusy(b, false); if (!r.success) return toast('Gagal', r.message, 'error'); Adm.boot.konten = r.data; setBoot(Adm.boot); Store.del('boot'); toast(t + ' disimpan'); }
  };
}

/* =====================================================================
   BACKUP & MIGRASI
   ===================================================================== */
PAGES_ADM.backup = async (host) => {
  host.innerHTML = `<div class="page-head"><div><h2>Backup & Migrasi Data</h2><p>Salinan database otomatis/manual di Google Drive, serta impor data dari aplikasi lama, file backup, atau PPDB tahun sebelumnya.</p></div></div>
  <div class="detail-grid"><div class="stack">
    <div class="card"><div class="row-between" style="margin-bottom:12px"><div class="card-title" style="margin:0"><span class="ic-bulat primer">${ic('database-backup')}</span> Backup Database</div><button class="btn btn-primer" id="bk-now">${ic('save', 'ic-sm')} Backup Sekarang</button></div>
      <div id="bk-trig" class="callout" style="margin-bottom:14px">${ic('info')}<div>Memeriksa jadwal backup otomatis…</div></div>
      <div id="bk-list"><div class="sk sk-line"></div><div class="sk sk-line"></div></div></div>
    <div class="card"><div class="card-title"><span class="ic-bulat aksen">${ic('import')}</span> Impor / Migrasi Data</div>
      <div class="callout" style="margin-bottom:16px">${ic('shield-check')}<div class="small">Spreadsheet sumber <b>hanya dibaca</b>, tidak pernah diubah. Impor <b>aman diulang</b>: data yang sudah ada tidak digandakan. Selalu tekan <b>Pindai</b> dulu.</div></div>
      <div class="stack">
        <div class="field"><label for="im-src">URL / ID Spreadsheet Sumber<span class="req">*</span></label><input class="inp" id="im-src" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(Adm.imSrc || '')}"><div class="hint">App PPDB lama, file backup di atas, atau database PPDB tahun lalu. Harus bisa dibuka akun Google pemilik script.</div></div>
        <div class="field"><label for="im-sheet">Nama Sheet Data Pendaftar di Sumber</label><input class="inp" id="im-sheet" placeholder="Pendaftar (kosongkan bila sama)"><div class="hint">Header kolom dicocokkan otomatis (mis. "Nama Lengkap" → Nama, "No HP" → HP).</div></div>
        <div><span class="lbl">Data yang diimpor</span><div class="row" style="margin-top:8px" id="im-sheets">${[['Pendaftar', 1], ['Jadwal', 0], ['Konten', 0], ['Referensi', 0], ['Pengaturan', 0], ['Log_Aktivitas', 0]].map(([n, on]) => `<label class="chip" style="cursor:pointer"><input type="checkbox" value="${n}" ${on ? 'checked' : ''}> ${n.replace('_', ' ')}</label>`).join('')}</div></div>
        <label class="cek"><input type="checkbox" id="im-delta"> <span><b>Sinkron status (delta)</b> — perbarui status berkas/bayar/seleksi data yang sudah ada dari sumber. Pakai tepat sebelum pindah ke app baru.</span></label>
        <label class="cek"><input type="checkbox" id="im-over"> <span><b>Timpa data yang sudah ada</b> — termasuk isian & pengaturan. Biarkan mati kecuali memulihkan dari backup.</span></label>
        <div class="row"><button class="btn btn-outline" id="im-scan">${ic('scan-search', 'ic-sm')} Pindai (Dry-run)</button><button class="btn btn-aksen" id="im-run" disabled>${ic('play', 'ic-sm')} Jalankan Impor</button></div>
      </div><div id="im-hasil"></div></div>
  </div>
  <div class="aksi-stack"><div class="card"><div class="card-title">${ic('book-open')} Panduan Singkat</div><ol class="small" style="padding-left:18px;margin:0;display:grid;gap:8px">
    <li><b>Backup</b> otomatis setiap Senin 01.00 (12 salinan terbaru disimpan). Tekan <i>Backup Sekarang</i> sebelum perubahan besar.</li>
    <li><b>Pulihkan</b>: salin URL backup → tempel di Impor → centang data → Pindai → Jalankan (centang <i>Timpa</i> bila ingin mengembalikan isian).</li>
    <li><b>Migrasi app lama</b>: gunakan akun Google yang sama agar berkas Drive lama tetap terbaca. Pindai → Jalankan → ulangi dengan <i>Sinkron status</i> tepat sebelum pindah.</li>
    <li>Akun & password admin <b>tidak pernah</b> ikut diimpor.</li></ol></div></div></div>`;
  muatBackup();
  $('#bk-now').onclick = async (e) => { const b = e.currentTarget; setBusy(b, true, 'Membuat backup…'); const r = await api('backupNow', {}, { timeout: 120000 }); setBusy(b, false); r.success ? (toast('Backup tersimpan', r.data.name), muatBackup()) : toast('Gagal', r.message, 'error'); };
  const payload = () => ({ source: $('#im-src').value.trim(), sourceSheet: $('#im-sheet').value.trim() || undefined, sheets: $$('#im-sheets input:checked').map((i) => i.value), delta: $('#im-delta').checked, overwrite: $('#im-over').checked });
  $('#im-src').oninput = () => { $('#im-run').disabled = true; };
  $('#im-scan').onclick = async (e) => {
    const p = payload(); if (!p.source) return toast('Isi URL spreadsheet sumber', '', 'warning');
    Adm.imSrc = p.source; const b = e.currentTarget; setBusy(b, true, 'Memindai…');
    const r = await api('importScan', p, { timeout: 300000, tries: 1 }); setBusy(b, false);
    laporan(r, true); $('#im-run').disabled = !r.success;
  };
  $('#im-run').onclick = async (e) => {
    const p = payload();
    if (!(await konfirmasi({ judul: 'Jalankan impor sekarang?', pesan: 'Data akan ditulis ke database aplikasi. Disarankan <b>Backup Sekarang</b> lebih dulu.', ok: 'Jalankan Impor', kelas: 'btn-aksen', ikon: 'import' }))) return;
    const b = e.currentTarget; setBusy(b, true, 'Mengimpor…');
    const r = await api('importRun', p, { timeout: 300000, tries: 1 }); setBusy(b, false);
    laporan(r, false);
    if (r.success) { await muatBoot(true); toast('Impor selesai', 'Data pendaftar diperbarui.'); }
  };
};
async function muatBackup() {
  const r = await api('listBackups', {});
  const box = $('#bk-list'), tr = $('#bk-trig'); if (!box) return;
  if (!r.success) { box.innerHTML = `<p class="muted">${esc(r.message)}</p>`; return; }
  const t = r.data.triggers;
  tr.className = 'callout ' + (t.backup ? 'sukses' : 'peringatan');
  tr.innerHTML = t.backup ? `${ic('circle-check')}<div>Backup otomatis <b>aktif</b> (setiap Senin 01.00 WIB).</div>` : `${ic('triangle-alert')}<div>Backup otomatis <b>belum aktif</b>. <button class="btn btn-primer btn-sm" id="aktif-trig" style="margin-left:8px">Aktifkan</button></div>`;
  $('#aktif-trig') && ($('#aktif-trig').onclick = async (e) => { setBusy(e.currentTarget, true); const x = await api('installTriggers', {}); x.success ? (toast('Backup otomatis aktif'), muatBackup()) : toast('Gagal', x.message, 'error'); });
  box.innerHTML = r.data.backups.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama Backup</th><th>Dibuat</th><th></th></tr></thead><tbody>${r.data.backups.slice(0, 15).map((b) => `<tr><td>${ic('sheet', 'ic-sm')} ${esc(b.name)}</td><td class="small">${tglID(b.created, true)}</td>
    <td style="white-space:nowrap"><a class="btn btn-ghost btn-sm" href="${b.url}" target="_blank" rel="noopener">${ic('external-link', 'ic-sm')} Buka</a><button class="btn btn-ghost btn-sm" data-pakai="${esc(b.url)}">${ic('rotate-ccw', 'ic-sm')} Pulihkan…</button></td></tr>`).join('')}</tbody></table></div>
    <a class="small" href="${r.data.folderUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px">${ic('folder-open', 'ic-sm')} Buka folder Backup di Drive</a>`
    : `<div class="empty" style="padding:20px">${ic('archive', 'ic-xl')}<p>Belum ada backup.</p></div>`;
  box.onclick = (e) => { const b = e.target.closest('[data-pakai]'); if (!b) return; $('#im-src').value = b.dataset.pakai; $('#im-run').disabled = true; $('#im-src').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('URL backup dipasang', 'Pilih data lalu tekan Pindai.', 'info'); };
}
function laporan(r, dry) {
  const box = $('#im-hasil');
  if (!r.success) { box.innerHTML = `<div class="callout bahaya" style="margin-top:16px">${ic('circle-alert')}<div>${esc(r.message)}</div></div>`; return; }
  const rep = r.data.report;
  box.innerHTML = `<div class="callout ${dry ? '' : 'sukses'}" style="margin-top:16px">${ic(dry ? 'scan-search' : 'circle-check')}<div><b>${dry ? 'Hasil pindai (belum ada yang ditulis)' : 'Impor selesai'}</b> — sumber: ${esc(r.data.source.name)}</div></div>
    <div class="tbl-wrap" style="margin-top:12px"><table class="tbl laporan"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>
    ${Object.keys(rep).map((k) => rep[k].missing ? `<tr><td>${k}</td><td colspan="4" class="muted">Sheet tidak ditemukan di sumber</td></tr>` : `<tr><td><b>${k.replace('_', ' ')}</b></td><td>${rep[k].source}</td><td style="color:var(--sukses);font-weight:700">${rep[k].inserted}</td><td style="color:var(--sekunder);font-weight:700">${rep[k].updated}</td><td class="muted">${rep[k].skipped}</td></tr>`).join('')}</tbody></table></div>
    ${r.data.warnings.length ? `<div class="callout peringatan" style="margin-top:12px">${ic('triangle-alert')}<div><b>Catatan</b><ul style="margin:6px 0 0;padding-left:18px">${r.data.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : ''}`;
}

/* =====================================================================
   AKUN
   ===================================================================== */
PAGES_ADM.akun = (host) => {
  const s = Adm.boot.settings;
  const def = s.admin_password_default === '1';
  host.innerHTML = `<div class="page-head"><div><h2>Akun Admin</h2><p>Kelola username dan password panel administrasi.</p></div></div>
    ${def ? `<div class="callout peringatan" style="margin-bottom:16px">${ic('triangle-alert')}<div><b>Anda masih memakai password bawaan.</b> Segera ganti password demi keamanan data pendaftar.</div></div>` : ''}
    <div class="detail-grid"><form class="card" id="pw-form" novalidate><div class="card-title">${ic('key-round')} Ganti Password</div><div class="stack">
      <div class="field"><label for="pw-u">Username</label><input class="inp" id="pw-u" value="${esc(s.admin_username || 'admin')}" autocomplete="username"></div>
      <div class="field"><label for="pw-o">Password Lama</label><input class="inp" id="pw-o" type="password" autocomplete="current-password"></div>
      <div class="field"><label for="pw-n">Password Baru</label><input class="inp" id="pw-n" type="password" autocomplete="new-password"><div class="prog" style="margin-top:6px"><i id="pw-kuat"></i></div><div class="hint" id="pw-hint">Minimal 8 karakter, campurkan huruf & angka.</div></div>
      <div class="field" data-f="k"><label for="pw-k">Ulangi Password Baru</label><input class="inp" id="pw-k" type="password" autocomplete="new-password"><div class="errmsg">${ic('circle-alert', 'ic-sm')} <span>Password tidak sama.</span></div></div>
      <button class="btn btn-primer" id="pw-btn">${ic('save', 'ic-sm')} Simpan Password</button></div></form>
    <div class="aksi-stack"><div class="card"><div class="card-title">${ic('clock')} Sesi Login</div><p class="small muted">Sesi berakhir otomatis setelah 6 jam. Mengganti password mengeluarkan semua perangkat lain.</p>
      <p class="small">Berakhir: <b>${tglID(new Date(sesi().exp).toISOString(), true)}</b></p><button class="btn btn-bahaya-o btn-block" onclick="keluar('Anda telah keluar.')">${ic('log-out', 'ic-sm')} Keluar</button></div>
      <div class="card"><div class="card-title">${ic('activity')} Performa</div><p class="small muted">Waktu respons server terakhir (ms) untuk diagnosis kecepatan.</p><div class="small mono" id="perf"></div></div></div></div>`;
  const n = $('#pw-n');
  n.oninput = () => { const v = n.value; let sk = 0; if (v.length >= 8) sk++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) sk++; if (/\d/.test(v)) sk++; if (/[^\w]/.test(v) || v.length >= 12) sk++;
    $('#pw-kuat').style.width = sk * 25 + '%'; $('#pw-kuat').style.background = ['var(--bahaya)', 'var(--bahaya)', 'var(--aksen)', 'var(--sukses)', 'var(--sukses)'][sk]; };
  $('#perf').innerHTML = Perf.rows.slice(-6).reverse().map((r) => `${esc(r.action)} · total ${r.total} · server ${r.server ?? '-'}`).join('<br>') || '-';
  $('#pw-form').onsubmit = async (e) => {
    e.preventDefault();
    const nw = n.value, k = $('#pw-k').value;
    $('[data-f="k"]').classList.toggle('err', nw !== k); if (nw !== k) return;
    if (nw.length < 8) return toast('Password terlalu pendek', 'Minimal 8 karakter.', 'warning');
    const b = $('#pw-btn'); setBusy(b, true, 'Menyimpan…');
    const r = await api('changePassword', { old: $('#pw-o').value, new: nw, username: $('#pw-u').value.trim() });
    setBusy(b, false);
    if (!r.success) return toast('Gagal', r.message, 'error');
    simpanSesi(r.data.token, r.data.exp);
    Adm.boot.settings.admin_password_default = '0'; Adm.boot.settings.admin_username = $('#pw-u').value.trim().toLowerCase(); setBoot(Adm.boot);
    toast('Password diganti', 'Perangkat lain otomatis keluar.'); PAGES_ADM.akun(host);
  };
};
