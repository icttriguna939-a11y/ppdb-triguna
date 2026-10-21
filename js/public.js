/* =====================================================================
   public.js — Portal publik: Beranda (hero slideshow), Cek Status
   ===================================================================== */
'use strict';

/* ---------------- Navbar & footer ---------------- */
const MENU = [['Beranda', '', 'house'], ['Jadwal', 'info', 'calendar'], ['Persyaratan', 'syarat', 'list-checks'], ['Lokasi & Kontak', 'kontak', 'map-pin']];
function tombolAkun(kecil) {
  const masuk = (typeof Siswa !== 'undefined' && Siswa.sesi());
  return masuk ? `<a class="btn btn-aksen ${kecil ? 'btn-sm' : ''}" href="#/akun">${ic('user', 'ic-sm')} Akun Saya</a>`
    : `<a class="btn btn-outline-putih ${kecil ? 'btn-sm' : ''}" href="#/masuk" data-masuk>${ic('log-out', 'ic-sm')} Masuk</a><a class="btn btn-aksen ${kecil ? 'btn-sm' : ''}" href="#/daftar">${ic('pencil-line', 'ic-sm')} Daftar</a>`;
}
function navbar(mode) {
  return `<nav class="nav ${mode}" data-nav aria-label="Navigasi utama"><div class="wrap">
    <a class="brand" href="#/" aria-label="Beranda PPDB SMA Triguna 1956"><img data-logo src="${logoUrl(App.boot)}" alt="" width="40" height="40"><span><b>SMA Triguna 1956</b><small>PPDB Online</small></span></a>
    <div class="nav-menu">${MENU.map(([t, h]) => `<a href="#/" data-scroll="${h}">${t}</a>`).join('')}</div>
    <div class="nav-aksi">${temaBtn()}<span class="nav-akun">${tombolAkun(true)}</span>
    <button class="btn-ikon btn-menu" type="button" aria-label="Buka menu" onclick="document.body.classList.add('drawer-open')">${ic('menu')}</button></div>
  </div></nav>
  <div class="drawer-bg" onclick="document.body.classList.remove('drawer-open')"></div>
  <aside class="drawer" aria-label="Menu">
    <div class="row-between" style="margin-bottom:10px"><b style="font-family:var(--font-judul)">Menu</b><button class="btn-ikon" style="color:#fff;border-color:rgba(255,255,255,.3)" aria-label="Tutup menu" onclick="document.body.classList.remove('drawer-open')">${ic('x')}</button></div>
    ${MENU.map(([t, h, i]) => `<a href="#/" data-scroll="${h}">${ic(i)} ${t}</a>`).join('')}
    <a href="#" onclick="Tema.toggle();return false">${ic('sun-moon')} Ganti Tema Terang/Gelap</a>
    <div style="margin-top:auto;display:grid;gap:10px">${(typeof Siswa !== 'undefined' && Siswa.sesi()) ? `<a class="btn btn-aksen btn-block" href="#/akun" style="color:var(--aksen-teks)">${ic('user')} Akun Saya</a>`
      : `<a class="btn btn-putih btn-block" href="#/masuk">${ic('log-out')} Masuk</a><a class="btn btn-aksen btn-block" href="#/daftar" style="color:var(--aksen-teks)">${ic('pencil-line')} Daftar Akun</a>`}</div>
  </aside>`;
}
function footer(d) {
  const s = (d && d.settings) || {};
  return `<footer class="footer"><div class="wrap"><div class="fgrid3">
    <div><div class="logos"><img data-logo-yayasan src="${(d && d.assets && d.assets.logo_yayasan) || 'img/logo-triguna.png'}" alt="Logo yayasan"><img data-logo src="${logoUrl(d)}" alt="Logo sekolah"></div>
      <h4 style="margin-bottom:6px">${esc(s.nama_sekolah || 'SMA Triguna 1956 Jakarta')}</h4><p class="small" style="margin:0">${esc(s.nama_yayasan || '')}<br>${esc(s.alamat_sekolah || '')}</p></div>
    <div><h4>Tautan Cepat</h4><ul><li><a href="#/daftar">Daftar Akun PPDB</a></li><li><a href="#/masuk">Masuk Akun Siswa</a></li><li><a href="#/" data-scroll="info">Jadwal PPDB</a></li><li><a href="#/status">Cek Status dengan No. Pendaftaran</a></li></ul></div>
    <div><h4>Sekretariat PPDB</h4><ul>
      ${s.kontak_wa ? `<li><a href="${waLink(s.kontak_wa)}" target="_blank" rel="noopener">${ic('message-circle', 'ic-sm')} WhatsApp ${esc(s.kontak_wa)}</a></li>` : ''}
      ${s.kontak_telp ? `<li>${ic('phone', 'ic-sm')} ${esc(s.kontak_telp)}</li>` : ''}
      ${s.kontak_email ? `<li><a href="mailto:${esc(s.kontak_email)}">${ic('mail', 'ic-sm')} ${esc(s.kontak_email)}</a></li>` : ''}</ul></div>
  </div><div class="bawah"><span>© ${new Date().getFullYear()} ${esc(s.nama_sekolah || 'SMA Triguna 1956 Jakarta')}. Hak cipta dilindungi.</span><a href="#/admin">Login Admin</a></div></div></footer>`;
}
/* klik menu ber-anchor → gulir halus di beranda */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]'); if (!a) return;
  e.preventDefault(); document.body.classList.remove('drawer-open');
  const id = a.dataset.scroll;
  const lompat = () => { const el = id ? document.getElementById(id) : null; el ? el.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' }); };
  if (currentPage !== 'beranda') { go(''); setTimeout(lompat, 80); } else lompat();
});
function navScroll() {
  const n = $('.page[data-page="beranda"]:not([hidden]) [data-nav]'); if (!n) return;
  const solid = window.scrollY > 40;
  n.classList.toggle('solid', solid); n.classList.toggle('transparan', !solid);
  const sc = $('.sticky-cta'); if (sc) sc.classList.toggle('on', window.scrollY > window.innerHeight * 0.7);
}
window.addEventListener('scroll', navScroll, { passive: true });

/* ---------------- Slideshow hero ---------------- */
const Slide = { i: 0, n: 0, timer: null, ms: 6000, el: null };
function daftarSlide(d) {
  const a = (d && d.assets) || {};
  const s = (a.slides || []).map((x) => x.url).filter(Boolean);
  return s.length ? s : (a.bg_hero ? [a.bg_hero] : []);
}
function slideKe(i, manual) {
  const box = Slide.el; if (!box || !Slide.n) return;
  Slide.i = (i + Slide.n) % Slide.n;
  box.querySelectorAll('.slide').forEach((s, k) => {
    const on = k === Slide.i;
    if ((on || k === (Slide.i + 1) % Slide.n) && s.dataset.src && !s.style.backgroundImage) s.style.backgroundImage = `url("${s.dataset.src}")`;   // muat foto saat dibutuhkan
    s.classList.toggle('on', on);
  });
  box.querySelectorAll('.dots button').forEach((b, k) => { b.classList.toggle('on', k === Slide.i); b.setAttribute('aria-current', k === Slide.i ? 'true' : 'false'); });
  if (manual) mulaiSlide();
}
function mulaiSlide() {
  clearInterval(Slide.timer);
  if (Slide.n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Slide.timer = setInterval(() => { if (document.visibilityState === 'visible' && currentPage === 'beranda' && !Slide.jeda) slideKe(Slide.i + 1); }, Slide.ms);
}

/* ---------------- BERANDA ---------------- */
const SYARAT_IC = ['camera', 'users', 'file-text', 'award', 'receipt'];
function berandaSkeleton() {
  return `<div class="hero hero-full"><div class="wrap"><div class="sk" style="width:180px;height:28px;opacity:.3"></div><div class="sk sk-h" style="height:48px;opacity:.3;margin-top:20px"></div><div class="sk sk-line" style="width:50%;opacity:.3"></div></div></div>`;
}
function renderBeranda(el, d, err) {
  if (!d) {
    el.innerHTML = navbar('transparan') + (err ? `<div class="hero hero-full"><div class="wrap"><h1>PPDB Online SMA Triguna 1956</h1><p class="lead">${esc(err.message || 'Gagal memuat data.')}</p>
      <div class="cta"><button class="btn btn-aksen btn-lg" onclick="Boot.muat(true)">${ic('refresh-cw')} Coba lagi</button></div></div></div>` : berandaSkeleton());
    return;
  }
  const s = d.settings || {}, st = d.status || {};
  const today = new Date().toISOString().slice(0, 10);
  const jadwal = d.jadwal || [];
  const syarat = (d.konten || []).filter((k) => k.Bagian === 'Syarat');
  const buka = s.tanggal_buka || (jadwal[0] && jadwal[0].Tanggal_Mulai) || '';
  const tutup = s.tanggal_tutup || (jadwal[0] && jadwal[0].Tanggal_Selesai) || '';
  const mapOk = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(s.maps_embed_url || '');
  const mapsLink = s.maps_link || ('https://www.google.com/maps/search/' + encodeURIComponent(s.alamat_sekolah || s.nama_sekolah || ''));
  const judul = esc(s.hero_judul || 'Selamat Datang di PPDB Online SMA Triguna 1956 Jakarta').replace(/(SMA Triguna 1956[^<]*)$/, '<em>$1</em>');
  const slides = daftarSlide(d);
  const masuk = (typeof Siswa !== 'undefined' && Siswa.sesi());

  el.innerHTML = navbar('transparan') + `
  <header class="hero hero-full" id="atas" aria-roledescription="carousel" aria-label="Foto sekolah">
    <div class="slides" aria-hidden="true">${slides.map((u, k) => `<div class="slide ${k === 0 ? 'on' : ''}" data-src="${esc(u)}" ${k === 0 ? `style="background-image:url('${esc(u)}')"` : ''}></div>`).join('')}</div>
    <div class="hero-ov"></div>
    <svg class="hero-pola" viewBox="0 0 200 240" aria-hidden="true"><path d="M100 4 192 30v84c0 62-40 100-92 122C48 214 8 176 8 114V30z" fill="none" stroke="#fff" stroke-width="10"/></svg>
    <div class="wrap hero-isi">
      <span class="badge ${st.open ? 'b-buka' : 'b-tutup'}">PPDB ${esc(s.tahun_ajaran || '')} • ${st.open ? 'Dibuka' : 'Ditutup'}</span>
      <h1>${judul}</h1>
      <p class="lead">${esc(s.hero_subjudul || '')}</p>
      <div class="cta">
        ${masuk ? `<a class="btn btn-aksen btn-lg" href="#/akun">${ic('user')} Buka Akun Saya ${ic('arrow-right')}</a>`
        : `<a class="btn btn-aksen btn-lg ${st.open ? '' : 'is-disabled'}" href="${st.open ? '#/daftar' : '#/'}" ${st.open ? '' : `aria-disabled="true" title="${esc(st.reason)}"`}>${ic('pencil-line')} Daftar Akun Sekarang ${ic('arrow-right')}</a>
           <a class="btn btn-putih btn-lg" href="#/masuk">${ic('log-out')} Masuk Akun Siswa</a>`}
      </div>
      ${st.open ? '' : `<p class="small" style="margin-top:12px;opacity:.9">${ic('info', 'ic-sm')} ${esc(st.reason || '')}</p>`}
      <div class="trust"><span>${ic('user')} 1 · Buat akun</span><span>${ic('wallet')} 2 · Bayar & unggah bukti</span><span>${ic('file-text')} 3 · Masuk & isi formulir</span></div>
    </div>
    ${slides.length > 1 ? `<div class="slide-nav"><button class="slide-btn" data-sl="-1" aria-label="Foto sebelumnya">${ic('chevron-left')}</button>
      <div class="dots" role="tablist">${slides.map((_, k) => `<button role="tab" data-dot="${k}" class="${k === 0 ? 'on' : ''}" aria-label="Foto ${k + 1}"></button>`).join('')}</div>
      <button class="slide-btn" data-sl="1" aria-label="Foto berikutnya">${ic('chevron-right')}</button></div>` : ''}
    <a class="scroll-hint" href="#/" data-scroll="info" aria-label="Gulir ke informasi">${ic('chevron-down')}</a>
  </header>

  <div class="wrap info-strip"><div class="card">
    <div class="it"><span class="ic-bulat primer">${ic('calendar-check')}</span><div><b>${esc(buka ? tglPendek(buka) : 'Segera')}</b><span>Pendaftaran Dibuka</span></div></div>
    <div class="it"><span class="ic-bulat amber">${ic('calendar-clock')}</span><div><b>${esc(tutup ? tglPendek(tutup) : 'Segera')}</b><span>Batas Pendaftaran</span></div></div>
    <div class="it"><span class="ic-bulat aksen">${ic('wallet')}</span><div><b>${rupiah(s.biaya_formulir)}</b><span>Biaya Formulir</span></div></div>
  </div></div>

  <section class="sec" id="info"><div class="wrap">
    <div class="sec-head"><div class="overline">Jadwal</div><h2>Timeline PPDB ${esc(s.tahun_ajaran || '')}</h2><p>Catat tanggal-tanggal penting berikut agar tidak terlewat.</p></div>
    ${jadwal.length ? `<div class="timeline" style="--n:${Math.min(jadwal.length, 6)}">${jadwal.map((j, i) => {
      const cls = j.Tanggal_Selesai && j.Tanggal_Selesai < today ? 'lewat' : (j.Tanggal_Mulai <= today && (!j.Tanggal_Selesai || today <= j.Tanggal_Selesai) ? 'kini' : '');
      return `<div class="tl-it ${cls}"><div class="tl-dot">${cls === 'lewat' ? ic('check', 'ic-sm') : i + 1}</div><div class="tgl">${tglPendek(j.Tanggal_Mulai)}${j.Tanggal_Selesai && j.Tanggal_Selesai !== j.Tanggal_Mulai ? ' – ' + tglPendek(j.Tanggal_Selesai) : ''}</div><h4>${esc(j.Kegiatan)}</h4><p>${esc(j.Keterangan)}</p></div>`;
    }).join('')}</div>` : `<div class="card empty"><div class="ilus">${ic('calendar')}</div><h4>Jadwal akan segera diumumkan</h4><p>Silakan hubungi panitia untuk informasi terbaru.</p><a class="btn btn-ghost" href="#/" data-scroll="kontak">Hubungi Kami</a></div>`}
  </div></section>

  <section class="sec alt" id="syarat"><div class="wrap">
    <div class="sec-head"><div class="overline">Persyaratan</div><h2>${syarat.length || 5} Dokumen yang Wajib Disiapkan</h2><p>Siapkan dalam bentuk scan/foto yang jelas sebelum mengisi formulir.</p></div>
    <div class="grid g3 syarat">${syarat.map((k, i) => `<div class="card hover"><span class="ic-bulat">${ic(SYARAT_IC[i] || 'file-text')}</span><div><h4>${esc(k.Judul)}</h4><p>${esc(k.Isi)}</p></div></div>`).join('')}</div>
  </div></section>

  <section class="sec" id="kontak"><div class="wrap">
    <div class="sec-head"><div class="overline">Lokasi & Kontak</div><h2>Kunjungi atau Hubungi Kami</h2></div>
    <div class="grid g2">
      <div class="peta">${mapOk ? `<iframe src="${esc(s.maps_embed_url)}" loading="lazy" title="Peta lokasi sekolah" referrerpolicy="no-referrer-when-downgrade"></iframe>` : `<div class="empty"><div class="ilus">${ic('map-pin')}</div><p>${esc(s.alamat_sekolah || '')}</p></div>`}</div>
      <div class="card"><div class="card-title">${ic('school')} ${esc(s.nama_sekolah || '')}</div>
        <a class="kontak-li" href="${mapsLink}" target="_blank" rel="noopener"><span class="ic-bulat">${ic('map-pin')}</span><div><b>Alamat</b><span>${esc(s.alamat_sekolah || '-')}</span></div></a>
        ${s.kontak_wa ? `<a class="kontak-li" href="${waLink(s.kontak_wa)}" target="_blank" rel="noopener"><span class="ic-bulat hijau">${ic('message-circle')}</span><div><b>WhatsApp Panitia</b><span>${esc(s.kontak_wa)}</span></div></a>` : ''}
        ${s.kontak_telp ? `<a class="kontak-li" href="tel:${esc(String(s.kontak_telp).replace(/[^\d+]/g, ''))}"><span class="ic-bulat primer">${ic('phone')}</span><div><b>Telepon Sekolah</b><span>${esc(s.kontak_telp)}</span></div></a>` : ''}
        ${s.kontak_email ? `<a class="kontak-li" href="mailto:${esc(s.kontak_email)}"><span class="ic-bulat aksen">${ic('mail')}</span><div><b>Email</b><span>${esc(s.kontak_email)}</span></div></a>` : ''}
        <a class="btn btn-outline btn-block" style="margin-top:14px" href="${mapsLink}" target="_blank" rel="noopener">${ic('navigation')} Buka di Maps</a>
      </div>
    </div>
  </div></section>` + footer(d) + `
  <div class="sticky-cta">${masuk ? `<a class="btn btn-aksen btn-block" href="#/akun">${ic('user')} Akun Saya</a>`
    : `<div class="row" style="flex-wrap:nowrap"><a class="btn btn-outline" style="flex:1" href="#/masuk">Masuk</a><a class="btn btn-aksen ${st.open ? '' : 'is-disabled'}" style="flex:1.6" href="${st.open ? '#/daftar' : '#/'}">${ic('pencil-line')} Daftar Akun</a></div>`}</div>`;

  // slideshow
  Slide.el = el.querySelector('.hero'); Slide.n = slides.length; Slide.i = 0;
  Slide.ms = Math.max(3, Number(s.slide_interval) || 6) * 1000;
  slideKe(0);
  Slide.el.onclick = (e) => { const b = e.target.closest('[data-sl]'); if (b) slideKe(Slide.i + Number(b.dataset.sl), true); const t = e.target.closest('[data-dot]'); if (t) slideKe(Number(t.dataset.dot), true); };
  Slide.el.onmouseenter = () => { Slide.jeda = true; }; Slide.el.onmouseleave = () => { Slide.jeda = false; };
  let x0 = null;                                                    // geser di HP
  Slide.el.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
  Slide.el.ontouchend = (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) slideKe(Slide.i + (dx < 0 ? 1 : -1), true); x0 = null; };
  mulaiSlide();
  navScroll();
}
registerPage('beranda', {
  title: 'Beranda',
  show(el, p, baru) {
    if (baru) Boot.on((d, c, err) => renderBeranda(el, d, err));
    else if (Boot.data) { renderBeranda(el, Boot.data); Boot.muat(); }      // render ulang: tombol Masuk/Akun Saya selalu sesuai sesi
    if (!Boot.data) renderBeranda(el, null, Boot.gagal);
  }
});
document.addEventListener('click', (e) => { const a = e.target.closest('a.is-disabled'); if (a) { e.preventDefault(); toast('Pendaftaran belum tersedia', (App.boot && App.boot.status && App.boot.status.reason) || '', 'warning'); } });

/* ---------------- CEK STATUS ---------------- */
registerPage('status', {
  title: 'Cek Status',
  show(el, p, baru) {
    const h = Store.get('hasil', null) || {};
    const s = (App.boot && App.boot.settings) || {};
    if (baru || !el.querySelector('#cs-form')) {
      el.innerHTML = navbar('solid') + `<div class="fokus-body" style="padding-top:calc(var(--navh) + 28px)"><div class="wrap stack" style="max-width:900px">
        <div><div class="overline">Pengumuman & Status</div><h2>Cek Status Pendaftaran</h2><p class="muted">Masukkan nomor pendaftaran dan tanggal lahir calon siswa untuk melihat perkembangan proses seleksi.</p></div>
        <form class="card" id="cs-form" novalidate><div class="fgrid">
          <div class="field" data-f="no"><label for="cs-no">Nomor Pendaftaran<span class="req">*</span></label><input id="cs-no" class="inp mono" placeholder="PPDB-2027-0001" value="${esc(h.no || '')}" autocomplete="off" style="text-transform:uppercase"></div>
          <div class="field" data-f="tgl"><label for="cs-tgl">Tanggal Lahir Siswa<span class="req">*</span></label><input id="cs-tgl" class="inp" type="date" value="${esc(h.tgl || '')}"></div>
        </div><div id="cs-err"></div><button class="btn btn-primer btn-block" style="margin-top:16px" id="cs-btn">${ic('search')} Cek Status</button>
        <p class="hint" style="margin:10px 0 0">${ic('shield-check', 'ic-sm')} Data hanya tampil bila nomor dan tanggal lahir cocok.</p></form>
        <div id="cs-hasil"></div></div></div>` + footer(App.boot);
      $('#cs-form').onsubmit = async (e) => {
        e.preventDefault();
        const no = $('#cs-no').value.trim().toUpperCase(), tgl = $('#cs-tgl').value;
        if (!no || !tgl) { $('#cs-err').innerHTML = `<div class="callout bahaya" style="margin-top:14px">${ic('circle-alert')}<div>Isi nomor pendaftaran dan tanggal lahir.</div></div>`; return; }
        $('#cs-err').innerHTML = '';
        const b = $('#cs-btn'); setBusy(b, true, 'Mencari…');
        $('#cs-hasil').innerHTML = `<div class="card"><div class="profil"><div class="sk foto34"></div><div style="flex:1"><div class="sk sk-h"></div><div class="sk sk-line" style="width:40%"></div></div></div><div class="sk sk-box" style="margin-top:18px"></div></div>`;
        const r = await api('cekStatus', { no, tgl });
        setBusy(b, false);
        if (!r.success) { $('#cs-hasil').innerHTML = ''; $('#cs-err').innerHTML = `<div class="callout bahaya" style="margin-top:14px">${ic('circle-alert')}<div>${esc(r.message)}</div></div>`; return; }
        Store.set('hasil', Object.assign({}, Store.get('hasil', {}), { no, tgl }));
        tampilStatus(r.data, tgl, s);
      };
    }
    if (p[0]) { $('#cs-no').value = p[0]; }
  }
});
function tampilStatus(d, tgl, s) {
  const tahap = [['Verifikasi Berkas', d.berkas, 'files', 'Lengkap', 'Kurang'], ['Konfirmasi Pembayaran', d.bayar, 'wallet', 'Terkonfirmasi', 'Ditolak'], ['Hasil Seleksi', d.seleksi, 'award', 'Diterima', 'Ditolak']];
  let kiniSet = false;
  const items = tahap.map(([t, v, i, ok, no]) => {
    let cls = '';
    if (v === ok) cls = 'done'; else if (v === no) cls = 'gagal'; else if (!kiniSet) { cls = 'kini'; kiniSet = true; }
    return `<div class="tr-it ${cls}"><div class="dot">${ic(cls === 'done' ? 'check' : cls === 'gagal' ? 'x' : i)}</div><div><h4>${t} ${badgeStatus(v)}</h4>
      <p class="small muted" style="margin:0">${cls === 'done' ? 'Tahap selesai.' : cls === 'gagal' ? 'Perlu tindak lanjut — lihat catatan panitia.' : cls === 'kini' ? 'Sedang diproses oleh panitia.' : 'Menunggu tahap sebelumnya.'}</p></div></div>`;
  }).join('');
  const du = d.daftarUlang || [];
  $('#cs-hasil').innerHTML = `<div class="stack">
    ${d.seleksi === 'Diterima' ? `<div class="selamat"><div class="trofi">${ic('trophy', 'ic-xl')}</div><div><h3>SELAMAT! ${esc(d.nama)} DITERIMA di ${esc(s.nama_sekolah || 'SMA Triguna 1956')}</h3><div style="opacity:.9">Silakan lakukan daftar ulang sesuai jadwal.${d.rombel ? ' Rombel: <b>' + esc(d.rombel) + '</b>' : ''}</div></div></div>` : ''}
    <div class="card"><div class="profil">${d.foto ? `<img class="foto34" src="${d.foto}" alt="Pas foto">` : `<div class="foto34">${ic('user', 'ic-xl')}</div>`}
      <div style="flex:1;min-width:200px"><div class="overline">${esc(d.no)}</div><h3 style="margin:4px 0">${esc(d.nama)}</h3><div class="small muted">${esc(d.sekolah)} · NISN <span class="mono">${esc(d.nisn)}</span></div><div class="small muted">Terdaftar ${tglID(d.waktu, true)}</div></div>
      <button class="btn btn-outline" id="cs-pdf">${ic('download')} Unduh Ulang PDF</button></div></div>
    <div class="card"><div class="card-title">${ic('route')} Pelacak Tahapan</div><div class="tracker">${items}</div></div>
    ${d.catatan ? `<div class="card" style="border-left:4px solid var(--sekunder)"><div class="card-title">${ic('message-square-text')} Catatan dari Panitia</div><p style="margin:0">${esc(d.catatan)}</p></div>` : ''}
    ${du.length ? `<div class="card"><div class="card-title">${ic('clipboard-check')} Informasi Daftar Ulang</div><div class="kv" style="border-bottom:1px solid var(--border)">${du.map((k) => `<div>${esc(k.Judul)}</div><div>${esc(k.Isi)}</div>`).join('')}</div></div>` : ''}
    ${s.kontak_wa ? `<div class="wa-strip"><div><b>Ada pertanyaan tentang status?</b></div><a class="btn" href="${waLink(s.kontak_wa, 'Halo Panitia, saya ingin menanyakan status pendaftaran ' + d.no)}" target="_blank" rel="noopener">${ic('message-circle')} WhatsApp Panitia</a></div>` : ''}
  </div>`;
  $('#cs-pdf').onclick = async (e) => {
    const b = e.currentTarget; setBusy(b, true, 'Menyiapkan…');
    const r = await api('getPdf', { no: d.no, tgl });
    setBusy(b, false);
    r.success ? unduhB64(r.data.b64, r.data.name) : toast('Gagal mengunduh', r.message, 'error');
  };
  $('#cs-hasil').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
