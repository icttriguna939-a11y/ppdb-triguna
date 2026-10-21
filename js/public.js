/* =====================================================================
   public.js — Portal publik: Beranda, Formulir 6 langkah, Berhasil, Cek Status
   ===================================================================== */
'use strict';

/* ---------------- Navbar & footer ---------------- */
const MENU = [['Beranda', '', 'house'], ['Info PPDB', 'info', 'info'], ['Alur', 'alur', 'list-checks'], ['Lokasi & Kontak', 'kontak', 'map-pin'], ['Cek Status', '#status', 'search']];
function navbar(mode) {
  const st = (App.boot && App.boot.status) || {};
  return `<nav class="nav ${mode}" data-nav aria-label="Navigasi utama"><div class="wrap">
    <a class="brand" href="#/" aria-label="Beranda PPDB SMA Triguna 1956"><img data-logo src="${logoUrl(App.boot)}" alt="" width="40" height="40"><span><b>SMA Triguna 1956</b><small>PPDB Online</small></span></a>
    <div class="nav-menu">${MENU.map(([t, h]) => h.startsWith('#') ? `<a href="#/${h.slice(1)}">${t}</a>` : `<a href="#/" data-scroll="${h}">${t}</a>`).join('')}</div>
    <div class="nav-aksi">${temaBtn()}<a class="btn btn-aksen btn-sm ${st.open === false ? 'is-disabled' : ''}" href="#/daftar">${ic('pencil-line', 'ic-sm')} Daftar</a>
    <button class="btn-ikon btn-menu" type="button" aria-label="Buka menu" onclick="document.body.classList.add('drawer-open')">${ic('menu')}</button></div>
  </div></nav>
  <div class="drawer-bg" onclick="document.body.classList.remove('drawer-open')"></div>
  <aside class="drawer" aria-label="Menu">
    <div class="row-between" style="margin-bottom:10px"><b style="font-family:var(--font-judul)">Menu</b><button class="btn-ikon" style="color:#fff;border-color:rgba(255,255,255,.3)" aria-label="Tutup menu" onclick="document.body.classList.remove('drawer-open')">${ic('x')}</button></div>
    ${MENU.map(([t, h, i]) => h.startsWith('#') ? `<a href="#/${h.slice(1)}">${ic(i)} ${t}</a>` : `<a href="#/" data-scroll="${h}">${ic(i)} ${t}</a>`).join('')}
    <a href="#" onclick="Tema.toggle();return false">${ic('sun-moon')} Ganti Tema Terang/Gelap</a>
    <div style="margin-top:auto"><a class="btn btn-aksen btn-block" href="#/daftar" style="color:var(--aksen-teks)">${ic('pencil-line')} Daftar Sekarang</a></div>
  </aside>`;
}
function footer(d) {
  const s = (d && d.settings) || {};
  return `<footer class="footer"><div class="wrap"><div class="fgrid3">
    <div><div class="logos"><img data-logo-yayasan src="${(d && d.assets && d.assets.logo_yayasan) || 'img/logo-triguna.png'}" alt="Logo yayasan"><img data-logo src="${logoUrl(d)}" alt="Logo sekolah"></div>
      <h4 style="margin-bottom:6px">${esc(s.nama_sekolah || 'SMA Triguna 1956 Jakarta')}</h4><p class="small" style="margin:0">${esc(s.nama_yayasan || '')}<br>${esc(s.alamat_sekolah || '')}</p></div>
    <div><h4>Tautan Cepat</h4><ul><li><a href="#/" data-scroll="info">Info PPDB</a></li><li><a href="#/daftar">Formulir Pendaftaran</a></li><li><a href="#/status">Cek Status Pendaftaran</a></li><li><a href="#/" data-scroll="faq">Pertanyaan Umum</a></li></ul></div>
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
  const sc = $('.sticky-cta'); if (sc) sc.classList.toggle('on', window.scrollY > 520);
}
window.addEventListener('scroll', navScroll, { passive: true });

/* ---------------- BERANDA ---------------- */
const SYARAT_IC = ['camera', 'users', 'file-text', 'award', 'receipt'];
function berandaSkeleton() {
  return `<div class="hero"><div class="wrap"><div class="sk" style="width:180px;height:28px;opacity:.3"></div><div class="sk sk-h" style="height:48px;opacity:.3;margin-top:20px"></div><div class="sk sk-line" style="width:50%;opacity:.3"></div></div></div>
  <div class="wrap info-strip"><div class="card" style="padding:24px"><div class="sk sk-line"></div><div class="sk sk-line" style="width:70%"></div></div></div>`;
}
function renderBeranda(el, d, err) {
  if (!d) {
    el.innerHTML = navbar('transparan') + (err ? `<div class="hero"><div class="wrap"><h1>PPDB Online SMA Triguna 1956</h1><p class="lead">${esc(err.message || 'Gagal memuat data.')}</p>
      <div class="cta"><button class="btn btn-aksen btn-lg" onclick="Boot.muat(true)">${ic('refresh-cw')} Coba lagi</button></div></div></div>` : berandaSkeleton());
    return;
  }
  const s = d.settings || {}, st = d.status || {};
  const today = new Date().toISOString().slice(0, 10);
  const jadwal = d.jadwal || [];
  const konten = d.konten || [];
  const by = (b) => konten.filter((k) => k.Bagian === b);
  const syarat = by('Syarat'), alur = by('Alur'), faq = by('FAQ');
  const buka = s.tanggal_buka || (jadwal[0] && jadwal[0].Tanggal_Mulai) || '';
  const tutup = s.tanggal_tutup || (jadwal[0] && jadwal[0].Tanggal_Selesai) || '';
  const mapOk = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(s.maps_embed_url || '');
  const mapsLink = s.maps_link || ('https://www.google.com/maps/search/' + encodeURIComponent(s.alamat_sekolah || s.nama_sekolah || ''));
  const judul = esc(s.hero_judul || 'Selamat Datang di PPDB Online SMA Triguna 1956 Jakarta').replace(/(SMA Triguna 1956[^<]*)$/, '<em>$1</em>');

  el.innerHTML = navbar('transparan') + `
  <header class="hero" id="atas">
    <svg class="hero-pola" viewBox="0 0 200 240" aria-hidden="true"><path d="M100 4 192 30v84c0 62-40 100-92 122C48 214 8 176 8 114V30z" fill="none" stroke="#fff" stroke-width="10"/></svg>
    <div class="wrap">
      <span class="badge ${st.open ? 'b-buka' : 'b-tutup'}">PPDB ${esc(s.tahun_ajaran || '')} • ${st.open ? 'Dibuka' : 'Ditutup'}</span>
      <h1>${judul}</h1>
      <p class="lead">${esc(s.hero_subjudul || '')}</p>
      <div class="cta">
        <a class="btn btn-aksen btn-lg ${st.open ? '' : 'is-disabled'}" href="${st.open ? '#/daftar' : '#/'}" ${st.open ? '' : `aria-disabled="true" title="${esc(st.reason)}"`}>${ic('pencil-line')} Daftar Sekarang ${ic('arrow-right')}</a>
        <a class="btn btn-putih btn-lg" href="#/status">${ic('search')} Cek Status Pendaftaran</a>
      </div>
      ${st.open ? '' : `<p class="small" style="margin-top:12px;opacity:.9">${ic('info', 'ic-sm')} ${esc(st.reason || '')}</p>`}
      <div class="trust"><span>${ic('clock')} Akses 24 jam dari HP</span><span>${ic('file-check')} Bukti PDF via email</span><span>${ic('shield-check')} Proses transparan</span></div>
    </div>
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

  <section class="sec alt"><div class="wrap">
    <div class="sec-head"><div class="overline">Persyaratan</div><h2>${syarat.length || 5} Dokumen yang Wajib Disiapkan</h2><p>Siapkan dalam bentuk scan/foto yang jelas sebelum mengisi formulir.</p></div>
    <div class="grid g3 syarat">${syarat.map((k, i) => `<div class="card hover"><span class="ic-bulat">${ic(SYARAT_IC[i] || 'file-text')}</span><div><h4>${esc(k.Judul)}</h4><p>${esc(k.Isi)}</p></div></div>`).join('')}</div>
  </div></section>

  <section class="sec" id="biaya"><div class="wrap">
    <div class="card biaya-card">
      <div><div class="overline">Biaya Formulir Pendaftaran</div><div class="nominal">${rupiah(s.biaya_formulir)}</div>
        <p style="opacity:.85;margin:0">${esc(s.catatan_bayar || '')} Bukti transfer diunggah pada langkah 5 formulir.</p></div>
      <div class="rek"><div class="small" style="opacity:.8">Transfer ke</div><div style="font-weight:700">${esc(s.bank_nama || '')}</div>
        <div class="norek mono">${esc(s.bank_norek || '')}</div><div class="small" style="opacity:.85">a.n. ${esc(s.bank_atas_nama || '')}</div>
        <button class="btn btn-putih btn-sm" style="margin-top:12px" onclick="salin('${esc(s.bank_norek || '').replace(/'/g, '')}','Nomor rekening disalin')">${ic('copy', 'ic-sm')} Salin No. Rekening</button></div>
    </div>
  </div></section>

  <section class="sec alt" id="alur"><div class="wrap">
    <div class="sec-head"><div class="overline">Alur</div><h2>${alur.length || 6} Langkah Mudah Mendaftar</h2><p>Seluruh proses dilakukan online — tidak perlu datang ke sekolah untuk membeli formulir.</p></div>
    <div class="grid g3 alur">${alur.map((k, i) => `<div class="card hover"><div class="no">${String(i + 1).padStart(2, '0')}</div><h4>${esc(k.Judul)}</h4><p>${esc(k.Isi)}</p></div>`).join('')}</div>
  </div></section>

  ${faq.length ? `<section class="sec" id="faq"><div class="wrap" style="max-width:860px"><div class="sec-head"><div class="overline">FAQ</div><h2>Pertanyaan yang Sering Diajukan</h2></div>
    <div class="faq">${faq.map((k) => `<details><summary>${esc(k.Judul)}</summary><p>${esc(k.Isi)}</p></details>`).join('')}</div></div></section>` : ''}

  <section class="cta-band"><div class="wrap"><h2>Siap Menjadi Bagian dari Keluarga Besar SMA Triguna 1956?</h2>
    <p>Isi formulir sekarang. Bukti pendaftaran langsung terkirim ke email Anda.</p>
    <div class="row"><a class="btn btn-aksen btn-lg ${st.open ? '' : 'is-disabled'}" href="${st.open ? '#/daftar' : '#/'}">${ic('pencil-line')} Daftar Sekarang</a>
    ${s.kontak_wa ? `<a class="btn btn-putih btn-lg" href="${waLink(s.kontak_wa, 'Halo Panitia PPDB SMA Triguna 1956, saya ingin bertanya.')}" target="_blank" rel="noopener">${ic('message-circle')} Hubungi Kami</a>` : ''}</div></div></section>

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
  <div class="sticky-cta"><a class="btn btn-aksen btn-block ${st.open ? '' : 'is-disabled'}" href="${st.open ? '#/daftar' : '#/'}">${ic('pencil-line')} Daftar Sekarang</a></div>`;
  navScroll();
}
registerPage('beranda', {
  title: 'Beranda',
  show(el, p, baru) {
    if (baru) Boot.on((d, c, err) => renderBeranda(el, d, err));
    else if (Boot.data) { Boot.muat(); navScroll(); }
    if (!Boot.data) renderBeranda(el, null, Boot.gagal);
  }
});
document.addEventListener('click', (e) => { const a = e.target.closest('a.is-disabled'); if (a) { e.preventDefault(); toast('Pendaftaran belum tersedia', (App.boot && App.boot.status && App.boot.status.reason) || '', 'warning'); } });

/* =====================================================================
   FORMULIR PENDAFTARAN (wizard 6 langkah)
   ===================================================================== */
const LANGKAH = ['Data Siswa', 'Alamat & Kontak', 'Orang Tua/Wali', 'Periodik & Sekolah Asal', 'Unggah Berkas', 'Periksa & Kirim'];
const F = (k, label, o = {}) => Object.assign({ k, label, t: 'text' }, o);
const ORTU = (p, wajib) => [F(p + '_Nama', 'Nama', { req: wajib, upper: true }), F(p + '_NIK', 'NIK', { req: wajib, t: 'num', len: 16, hint: '16 digit sesuai KK' }),
  F(p + '_Tempat_Lahir', 'Tempat Lahir'), F(p + '_Tgl_Lahir', 'Tanggal Lahir', { t: 'date' }), F(p + '_Pendidikan', 'Jenjang Pendidikan', { t: 'select', ref: 'Pendidikan' }),
  F(p + '_Pekerjaan', 'Pekerjaan', { t: 'select', ref: 'Pekerjaan' }), F(p + '_Penghasilan', 'Penghasilan', { t: 'select', ref: 'Penghasilan', full: true })];
const FIELDS = {
  1: [F('Nama', 'Nama Lengkap', { req: true, full: true, upper: true, hint: 'Sesuai akta kelahiran / ijazah', ac: 'name' }), F('Jenis_Kelamin', 'Jenis Kelamin', { req: true, t: 'jk', full: true }),
    F('NISN', 'NISN', { req: true, t: 'num', len: 10, hint: '10 digit — cek di nisn.data.kemdikbud.go.id' }), F('NIK', 'NIK Siswa', { req: true, t: 'num', len: 16, hint: '16 digit sesuai Kartu Keluarga' }),
    F('Tempat_Lahir', 'Tempat Lahir', { req: true }), F('Tanggal_Lahir', 'Tanggal Lahir', { req: true, t: 'date', age: true }),
    F('Agama', 'Agama', { req: true, t: 'select', ref: 'Agama' }), F('No_Akta_Lahir', 'No. Registrasi Akta Lahir', { req: true }),
    F('No_KK', 'No. Kartu Keluarga', { req: true, t: 'num', len: 16 }), F('Anak_Ke', 'Anak ke-berapa', { req: true, t: 'num', max: 2 }), F('Jml_Saudara', 'Jumlah Saudara Kandung', { req: true, t: 'num', max: 2 })],
  2: [F('Alamat', 'Alamat (Jalan, No. Rumah)', { req: true, t: 'area', full: true, ac: 'street-address' }), F('RT', 'RT', { req: true, t: 'num', max: 3 }), F('RW', 'RW', { req: true, t: 'num', max: 3 }),
    F('Dusun', 'Dusun'), F('Kelurahan', 'Kelurahan / Desa', { req: true }), F('Kecamatan', 'Kecamatan', { req: true }), F('Kode_Pos', 'Kode Pos', { req: true, t: 'num', len: 5, ac: 'postal-code' }),
    F('Jenis_Tinggal', 'Jenis Tinggal', { req: true, t: 'select', ref: 'Jenis_Tinggal' }), F('Alat_Transportasi', 'Alat Transportasi', { req: true, t: 'select', ref: 'Alat_Transportasi' }),
    F('Jarak_Rumah', 'Jarak Rumah ke Sekolah', { req: true, t: 'dec', suf: 'KM' }), F('Telepon', 'Telepon Rumah', { t: 'tel' }),
    F('HP', 'No. HP / WhatsApp', { req: true, t: 'tel', hint: 'Contoh: 081234567890', ac: 'tel' }), F('Email', 'E-Mail', { req: true, t: 'email', full: true, hint: 'Bukti pendaftaran & PDF dikirim ke email ini', ac: 'email' })],
  3: ORTU('Ayah', true).concat(ORTU('Ibu', true)).concat([F('Wali_Nama', 'Nama', { upper: true }), F('Wali_NIK', 'NIK', { t: 'num', len: 16 }), F('Wali_Tahun_Lahir', 'Tahun Lahir', { t: 'num', len: 4 }),
    F('Wali_Pendidikan', 'Jenjang Pendidikan', { t: 'select', ref: 'Pendidikan' }), F('Wali_Pekerjaan', 'Pekerjaan', { t: 'select', ref: 'Pekerjaan' }), F('Wali_Penghasilan', 'Penghasilan', { t: 'select', ref: 'Penghasilan' })]),
  4: [F('Sekolah_Asal', 'Nama Sekolah Asal (SMP/MTs)', { req: true, full: true }), F('No_Seri_Ijazah', 'No. Seri Ijazah', { full: true, hint: 'Kosongkan jika baru memiliki SKL' }),
    F('Berat_Badan', 'Berat Badan', { req: true, t: 'dec', suf: 'kg' }), F('Tinggi_Badan', 'Tinggi Badan', { req: true, t: 'dec', suf: 'cm' }), F('Lingkar_Kepala', 'Lingkar Kepala', { t: 'dec', suf: 'cm' })]
};
const ALL_FIELDS = [].concat(FIELDS[1], FIELDS[2], FIELDS[3], FIELDS[4]);
const fieldStep = (k) => +Object.keys(FIELDS).find((s) => FIELDS[s].some((f) => f.k === k));
const BERKAS = [
  { j: 'foto', label: 'Pas Foto', hint: 'JPG/PNG · maks 1 MB · latar polos', accept: 'image/jpeg,image/png', mimes: ['image/jpeg', 'image/png'], max: 1, ic: 'camera' },
  { j: 'kk', label: 'Scan Kartu Keluarga', hint: 'PDF/JPG/PNG · maks 2 MB', accept: 'application/pdf,image/jpeg,image/png', mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2, ic: 'users' },
  { j: 'rapor', label: 'Scan Rapor Kelas 9', hint: 'PDF · maks 5 MB · gabung semua halaman', accept: 'application/pdf', mimes: ['application/pdf'], max: 5, ic: 'file-text' },
  { j: 'ijazah', label: 'Ijazah / SKL', hint: 'PDF/JPG/PNG · maks 2 MB', accept: 'application/pdf,image/jpeg,image/png', mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2, ic: 'award' },
  { j: 'bukti', label: 'Bukti Pembayaran', hint: 'JPG/PNG/PDF · maks 2 MB', accept: 'application/pdf,image/jpeg,image/png', mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2, ic: 'receipt' }
];
const Form = { step: 1, data: {}, errors: {}, files: {}, wali: false, el: null };
(() => { const dr = Store.get('draft', null); if (dr) { Form.data = dr.data || {}; Form.step = Math.min(dr.step || 1, 5); Form.wali = !!dr.wali; } })();
const simpanDraft = debounce(() => { Store.set('draft', { data: Form.data, step: Form.step, wali: Form.wali, t: Date.now() }); const a = $('.autosave'); if (a) { a.hidden = false; } }, 400);

function validasiField(f, v) {
  v = String(v ?? '').trim();
  if (!v) return f.req ? 'Wajib diisi.' : '';
  if (f.t === 'num' && !/^\d+$/.test(v)) return 'Hanya angka.';
  if (f.len && v.length !== f.len) return `Harus ${f.len} digit angka.`;
  if (f.t === 'dec' && !/^\d+([.,]\d+)?$/.test(v)) return 'Masukkan angka, contoh 3,5.';
  if (f.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format email tidak valid.';
  if (f.k === 'HP') { let d = v.replace(/\D/g, ''); if (d.startsWith('62')) d = '0' + d.slice(2); if (!/^08\d{8,12}$/.test(d)) return 'Nomor HP diawali 08, 10–14 digit.'; }
  if (f.age) { const a = (Date.now() - new Date(v + 'T00:00:00')) / (365.25 * 864e5); if (!(a >= 13 && a <= 19)) return 'Usia calon siswa harus 13–19 tahun.'; }
  return '';
}
function opsi(ref) { return ((App.boot && App.boot.referensi) || {})[ref] || []; }
function fieldHtml(f) {
  const v = Form.data[f.k] ?? '';
  const er = Form.errors[f.k];
  const id = 'f-' + f.k;
  const lab = `<label for="${id}">${esc(f.label)}${f.req ? '<span class="req" aria-hidden="true">*</span>' : ''}</label>`;
  const aria = `aria-describedby="${id}-h" ${f.req ? 'aria-required="true"' : ''} ${er ? 'aria-invalid="true"' : ''}`;
  let ctl;
  if (f.t === 'jk') {
    return `<div class="field full ${er ? 'err' : ''}" data-f="${f.k}"><span class="lbl" id="${id}">${esc(f.label)}<span class="req">*</span></span>
      <div class="seg-pilih" role="radiogroup" aria-labelledby="${id}">${[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([x, t]) => `<label><input type="radio" name="${f.k}" value="${x}" ${v === x ? 'checked' : ''}> ${t}</label>`).join('')}</div>
      <div class="errmsg" id="${id}-h">${ic('circle-alert', 'ic-sm')} <span>${esc(er || '')}</span></div></div>`;
  }
  if (f.t === 'select') ctl = `<select id="${id}" name="${f.k}" class="inp" ${aria}><option value="">— Pilih —</option>${opsi(f.ref).map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.t === 'area') ctl = `<textarea id="${id}" name="${f.k}" class="inp" rows="2" ${f.ac ? `autocomplete="${f.ac}"` : ''} ${aria}>${esc(v)}</textarea>`;
  else {
    const typ = f.t === 'date' ? 'date' : f.t === 'email' ? 'email' : f.t === 'tel' ? 'tel' : 'text';
    const im = f.t === 'num' ? 'numeric' : f.t === 'dec' ? 'decimal' : f.t === 'tel' ? 'tel' : f.t === 'email' ? 'email' : '';
    ctl = `<div class="inp-wrap"><input id="${id}" name="${f.k}" class="inp ${f.upper ? '' : ''}" type="${typ}" value="${esc(v)}" ${im ? `inputmode="${im}"` : ''} ${f.len ? `maxlength="${f.len}"` : f.max ? `maxlength="${f.max}"` : ''} ${f.ac ? `autocomplete="${f.ac}"` : 'autocomplete="off"'} ${f.age ? `max="${new Date().toISOString().slice(0, 10)}"` : ''} ${aria}>
      ${f.suf ? `<span class="suffix">${f.suf}</span>` : `<span class="ok-ic">${ic('circle-check', 'ic-sm')}</span>`}</div>`;
  }
  return `<div class="field ${f.full ? 'full' : ''} ${er ? 'err' : ''}" data-f="${f.k}">${lab}${ctl}
    ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}<div class="errmsg" id="${id}-h">${ic('circle-alert', 'ic-sm')} <span>${esc(er || '')}</span></div></div>`;
}
const grid = (arr) => `<div class="fgrid">${arr.map(fieldHtml).join('')}</div>`;

function stepBody(n) {
  if (n === 1) return `<div class="sub-judul">${ic('user')} Data Diri Calon Siswa</div>${grid(FIELDS[1])}`;
  if (n === 2) return `<div class="sub-judul">${ic('house')} Alamat Tempat Tinggal</div>${grid(FIELDS[2].slice(0, 10))}<div class="sub-judul">${ic('phone')} Kontak</div>${grid(FIELDS[2].slice(10))}`;
  if (n === 3) {
    const k = (p, t, ico, arr, wali) => `<div class="ortu-card"><header>${ic(ico)} ${t}${wali ? `<label class="cek" style="margin-left:auto;font-weight:600;font-family:var(--font)"><span class="switch"><input type="checkbox" id="tog-wali" ${Form.wali ? 'checked' : ''}><span></span></span> Isi data wali</label>` : ''}</header>
      <div class="isi" ${wali && !Form.wali ? 'hidden' : ''}>${grid(arr)}</div></div>`;
    return k('Ayah', 'Data Ayah Kandung', 'user', FIELDS[3].slice(0, 7)) + k('Ibu', 'Data Ibu Kandung', 'user', FIELDS[3].slice(7, 14)) + k('Wali', 'Data Wali (opsional)', 'user-round', FIELDS[3].slice(14), true);
  }
  if (n === 4) return `<div class="sub-judul">${ic('school')} Sekolah Asal</div>${grid(FIELDS[4].slice(0, 2))}<div class="sub-judul">${ic('ruler')} Data Periodik</div>${grid(FIELDS[4].slice(2))}`;
  if (n === 5) {
    const s = (App.boot && App.boot.settings) || {};
    const siap = BERKAS.filter((b) => Form.files[b.j] && Form.files[b.j].ok).length;
    return `<div class="callout" style="margin-bottom:16px">${ic('info')}<div>Semua <b>5 berkas wajib</b> diunggah. Berkas <b>tidak dapat diganti</b> setelah formulir dikirim. Foto otomatis dikecilkan agar unggahan ringan.</div></div>
      <div class="row-between" style="margin-bottom:12px"><span class="chip" id="cnt-berkas">${ic('files', 'ic-sm')} ${siap} dari 5 berkas siap</span>
      <span class="small muted">Transfer ke ${esc(s.bank_nama || '')} <b class="mono">${esc(s.bank_norek || '')}</b> a.n. ${esc(s.bank_atas_nama || '')} · <b>${rupiah(s.biaya_formulir)}</b></span></div>
      <div class="unggah-grid">${BERKAS.map(unggahTile).join('')}</div>`;
  }
  return ringkasan();
}
function unggahTile(b) {
  const f = Form.files[b.j];
  const st = !f ? '' : f.ok ? 'ok' : 'gagal';
  const thumb = f && f.ok ? (f.preview ? `<img src="${f.preview}" alt="">` : ic('file-text')) : '';
  return `<div class="unggah ${st}" data-berkas="${b.j}">
    <div class="head"><span class="ic-bulat ${f && f.ok ? 'hijau' : ''}">${ic(f && f.ok ? 'circle-check' : b.ic)}</span><div><b>${b.label}<span class="req">*</span></b><span>${b.hint}</span></div></div>
    ${f && f.ok ? `<div class="file"><div class="thumb">${thumb}</div><div class="nm"><b>${esc(f.file.name)}</b><span class="small muted">${ukuran(f.file.size)} · <span style="color:var(--sukses);font-weight:600">Siap diunggah</span></span></div>
      <button class="btn btn-ghost btn-sm" type="button" data-ganti="${b.j}">${ic('refresh-cw', 'ic-sm')} Ganti</button></div>`
      : `<label class="pilih">${ic('upload-cloud')} Pilih berkas atau seret ke sini<input type="file" accept="${b.accept}" data-file="${b.j}" aria-label="Unggah ${b.label}"></label>
      ${f && !f.ok ? `<div class="errmsg" style="display:flex">${ic('circle-alert', 'ic-sm')} ${esc(f.err)}</div>` : ''}`}
  </div>`;
}
function ringkasan() {
  const lbl = {}; ALL_FIELDS.forEach((f) => { lbl[f.k] = f.label; });
  const blok = (judul, keys, step) => `<details ${step === 1 ? 'open' : ''}><summary><span>${judul}</span><button class="btn btn-ghost btn-sm" type="button" data-ke="${step}">${ic('pencil', 'ic-sm')} Ubah</button></summary>
    <div class="kv">${keys.filter((k) => Form.data[k] || ['Nama'].includes(k)).map((k) => `<div>${esc(lbl[k] || k)}</div><div>${esc(k === 'Jenis_Kelamin' ? (Form.data[k] === 'P' ? 'Perempuan' : 'Laki-laki') : Form.data[k] || '-')}</div>`).join('')}</div></details>`;
  const pre = (p, keys) => keys.map((k) => k);
  return `<div class="ringkas">
    ${blok('Data Siswa', FIELDS[1].map((f) => f.k), 1)}
    ${blok('Alamat & Kontak', FIELDS[2].map((f) => f.k), 2)}
    ${blok('Orang Tua / Wali', pre('', FIELDS[3].filter((f) => Form.wali || !f.k.startsWith('Wali')).map((f) => f.k)), 3)}
    ${blok('Periodik & Sekolah Asal', FIELDS[4].map((f) => f.k), 4)}
    <details><summary><span>Berkas (${BERKAS.filter((b) => Form.files[b.j] && Form.files[b.j].ok).length}/5)</span><button class="btn btn-ghost btn-sm" type="button" data-ke="5">${ic('pencil', 'ic-sm')} Ubah</button></summary>
      <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap">${BERKAS.map((b) => { const ok = Form.files[b.j] && Form.files[b.j].ok; return `<span class="badge ${ok ? 'b-hijau' : 'b-merah'}">${b.label}</span>`; }).join('')}</div></details>
  </div>
  <div class="callout peringatan" style="margin-top:18px">${ic('triangle-alert')}<div><b>Data dan berkas TIDAK DAPAT DIUBAH setelah dikirim.</b> Periksa kembali sebelum menekan Kirim.</div></div>
  <div class="stack" style="margin-top:16px">
    <label class="cek"><input type="checkbox" id="setuju1"> Data yang saya isi benar dan dapat dipertanggungjawabkan.</label>
    <label class="cek"><input type="checkbox" id="setuju2"> Saya menyetujui penggunaan data untuk keperluan PPDB SMA Triguna 1956.</label>
  </div>`;
}

function renderForm() {
  const el = Form.el; if (!el) return;
  const d = App.boot;
  const st = (d && d.status) || {};
  const head = `<div class="fokus-head"><div class="wrap"><a class="brand" href="#/"><img data-logo src="${logoUrl(d)}" alt="" width="36" height="36"><span><b style="font-size:15px">Formulir PPDB</b><small>SMA Triguna 1956</small></span></a>
    <span style="margin-left:auto"></span>${temaBtn()}<a class="btn btn-ghost btn-sm" href="#/">${ic('arrow-left', 'ic-sm')} <span class="hide-xs">Beranda</span></a></div></div>`;
  if (!d) { el.innerHTML = head + `<div class="fokus-body"><div class="wrap"><div class="card"><div class="sk sk-h"></div><div class="sk sk-line"></div><div class="sk sk-line" style="width:70%"></div></div></div></div>`; return; }
  if (!st.open) {
    el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:640px"><div class="card empty"><div class="ilus">${ic('calendar-x', 'ic-xl')}</div><h3>Pendaftaran belum tersedia</h3><p>${esc(st.reason || '')}</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primer" href="#/">Kembali ke Beranda</a><a class="btn btn-outline" href="#/status">Cek Status</a></div></div></div></div>`;
    return;
  }
  const n = Form.step;
  const s = d.settings || {};
  Form.renderedOpen = true;
  el.innerHTML = head + `<div class="fokus-body"><div class="wrap"><div class="form-layout">
    <aside class="panduan card"><div class="overline" style="margin-bottom:10px">Langkah Pendaftaran</div>
      <ol class="langkah-list">${LANGKAH.map((t, i) => `<li class="${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}"><span class="n">${i + 1 < n ? ic('check', 'ic-sm') : i + 1}</span>${t}</li>`).join('')}</ol>
      <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
      <span class="autosave" ${Object.keys(Form.data).length ? '' : 'hidden'}>${ic('cloud-check', 'ic-sm')} Isian tersimpan otomatis di perangkat ini</span>
      ${s.kontak_wa ? `<div class="callout" style="margin-top:14px">${ic('message-circle')}<div><b>Butuh bantuan?</b><br><a href="${waLink(s.kontak_wa, 'Halo Panitia PPDB, saya butuh bantuan mengisi formulir.')}" target="_blank" rel="noopener">WhatsApp Panitia</a></div></div>` : ''}
    </aside>
    <main class="card form-card" aria-labelledby="judul-langkah">
      <div class="stepper" aria-hidden="true">${LANGKAH.map((t, i) => `<div class="s ${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}"><span class="n">${i + 1 < n ? ic('check', 'ic-sm') : i + 1}</span>${t}</div>`).join('')}</div>
      <div class="step-mobile"><div class="row-between"><b>Langkah ${n} dari 6</b><span class="small muted">${LANGKAH[n - 1]}</span></div><div class="bar"><i style="width:${(n / 6) * 100}%"></i></div></div>
      <h2 id="judul-langkah" style="font-size:22px;margin-bottom:4px">${LANGKAH[n - 1]}</h2>
      <p class="muted small" style="margin-bottom:22px">Kolom bertanda <span class="req">*</span> wajib diisi.</p>
      <form id="frm" novalidate>${stepBody(n)}</form>
      <div class="aksi-bar">
        ${n > 1 ? `<button class="btn btn-outline" type="button" id="btn-kembali">${ic('arrow-left')} Kembali</button>` : '<span></span>'}
        ${n < 6 ? `<button class="btn btn-primer" type="button" id="btn-lanjut" ${n === 5 && BERKAS.some((b) => !(Form.files[b.j] && Form.files[b.j].ok)) ? 'disabled' : ''}>Lanjut ${ic('arrow-right')}</button>`
      : `<button class="btn btn-aksen btn-lg" type="button" id="btn-kirim" disabled>${ic('send')} Kirim Pendaftaran</button>`}
      </div>
    </main></div></div></div>`;
  ikatForm();
}
function ikatForm() {
  const frm = $('#frm');
  frm.addEventListener('input', (e) => {
    const t = e.target; if (!t.name) return;
    const f = ALL_FIELDS.find((x) => x.k === t.name); if (!f) return;
    if (f.t === 'num') { const v = t.value.replace(/\D/g, ''); if (v !== t.value) t.value = v; }
    Form.data[f.k] = f.upper ? t.value.toUpperCase() : t.value;
    const box = t.closest('.field');
    if (box.classList.contains('err')) { const m = validasiField(f, t.value); if (!m) { box.classList.remove('err'); delete Form.errors[f.k]; } }
    if (f.len) box.classList.toggle('ok', t.value.length === f.len && !validasiField(f, t.value));
    simpanDraft();
  });
  frm.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio') { Form.data[t.name] = t.value; t.closest('.field').classList.remove('err'); delete Form.errors[t.name]; simpanDraft(); }
    if (t.id === 'tog-wali') { Form.wali = t.checked; t.closest('.ortu-card').querySelector('.isi').hidden = !t.checked; simpanDraft(); }
    if (t.dataset.file) pilihBerkas(t.dataset.file, t.files[0]);
  });
  frm.addEventListener('focusout', (e) => {
    const t = e.target; if (!t.name || t.type === 'radio') return;
    const f = ALL_FIELDS.find((x) => x.k === t.name); if (!f || !String(t.value).trim()) return;
    const m = validasiField(f, t.value); tandai(f.k, m);
  });
  frm.addEventListener('click', (e) => {
    const g = e.target.closest('[data-ganti]'); if (g) { delete Form.files[g.dataset.ganti]; perbaruiBerkas(g.dataset.ganti); }
    const k = e.target.closest('[data-ke]'); if (k) { e.preventDefault(); Form.step = +k.dataset.ke; simpanDraft(); renderForm(); window.scrollTo(0, 0); }
  });
  $$('.unggah', frm).forEach(ikatDrop);
  frm.addEventListener('submit', (e) => e.preventDefault());
  const s1 = $('#setuju1'), s2 = $('#setuju2'), kirim = $('#btn-kirim');
  if (kirim) { const cek = () => { kirim.disabled = !(s1.checked && s2.checked); }; s1.onchange = cek; s2.onchange = cek; kirim.onclick = kirimPendaftaran; }
  $('#btn-kembali') && ($('#btn-kembali').onclick = () => { Form.step--; simpanDraft(); renderForm(); window.scrollTo(0, 0); });
  $('#btn-lanjut') && ($('#btn-lanjut').onclick = () => {
    if (Form.step <= 4 && !validasiLangkah(Form.step)) return;
    Form.step++; simpanDraft(); renderForm(); window.scrollTo(0, 0);
  });
}
function tandai(k, msg) {
  const box = $(`.field[data-f="${k}"]`);
  if (msg) Form.errors[k] = msg; else delete Form.errors[k];
  if (!box) return;
  box.classList.toggle('err', !!msg);
  const sp = box.querySelector('.errmsg span'); if (sp) sp.textContent = msg || '';
  const inp = box.querySelector('input,select,textarea'); if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
function validasiLangkah(n) {
  let pertama = null;
  FIELDS[n].forEach((f) => {
    if (n === 3 && f.k.startsWith('Wali') && !Form.wali) return;
    const m = validasiField(f, Form.data[f.k]);
    tandai(f.k, m);
    if (m && !pertama) pertama = f.k;
  });
  if (pertama) {
    const box = $(`.field[data-f="${pertama}"]`);
    box && box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { const i = box && box.querySelector('input,select,textarea'); i && i.focus({ preventScroll: true }); }, 350);
    toast('Periksa kembali isian', 'Ada kolom yang belum benar.', 'warning');
    return false;
  }
  return true;
}
async function pilihBerkas(j, file) {
  const b = BERKAS.find((x) => x.j === j); if (!file || !b) return;
  let f = file;
  if (!b.mimes.includes(f.type)) { Form.files[j] = { ok: false, file: f, err: 'Format tidak didukung. Gunakan ' + b.hint.split('·')[0].trim() + '.' }; return perbaruiBerkas(j); }
  if (/^image\//.test(f.type)) f = await kompresGambar(f, j === 'foto' ? 900 : 1800, 0.85, (b.max * 1024 * 1024) * 0.85);
  if (f.size > b.max * 1048576) { Form.files[j] = { ok: false, file: f, err: `Ukuran ${ukuran(f.size)} melebihi ${b.max} MB.` }; return perbaruiBerkas(j); }
  const prev = Form.files[j] && Form.files[j].preview; if (prev) URL.revokeObjectURL(prev);
  Form.files[j] = { ok: true, file: f, preview: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' };
  perbaruiBerkas(j);
}
function ikatDrop(u) {
  u.addEventListener('dragover', (e) => { e.preventDefault(); u.classList.add('drag'); });
  u.addEventListener('dragleave', () => u.classList.remove('drag'));
  u.addEventListener('drop', (e) => { e.preventDefault(); u.classList.remove('drag'); if (e.dataTransfer.files[0]) pilihBerkas(u.dataset.berkas, e.dataTransfer.files[0]); });
}
/** Gambar ulang HANYA kotak berkas yang berubah — input berkas lain tidak tersentuh (aman bila pengguna sedang memilih file lain). */
function perbaruiBerkas(j) {
  BERKAS.filter((b) => !j || b.j === j).forEach((b) => {
    const el = $(`.unggah[data-berkas="${b.j}"]`); if (!el) return;
    const t = document.createElement('template'); t.innerHTML = unggahTile(b).trim();
    const baru = t.content.firstChild; el.replaceWith(baru); ikatDrop(baru);
  });
  const siap = BERKAS.filter((b) => Form.files[b.j] && Form.files[b.j].ok).length;
  const c = $('#cnt-berkas'); if (c) c.innerHTML = ic('files', 'ic-sm') + ` ${siap} dari 5 berkas siap`;
  const l = $('#btn-lanjut'); if (l) l.disabled = siap < 5;
}

async function kirimPendaftaran() {
  // validasi ulang semua langkah sebelum mengirim
  for (const n of [1, 2, 3, 4]) {
    const salah = FIELDS[n].find((f) => !(n === 3 && f.k.startsWith('Wali') && !Form.wali) && validasiField(f, Form.data[f.k]));
    if (salah) { Form.step = n; renderForm(); setTimeout(() => validasiLangkah(n), 50); return; }
  }
  const langkah = ['Memeriksa data', ...BERKAS.map((b) => 'Mengunggah ' + b.label), 'Membuat PDF & mengirim email'];
  const m = modal(`<h3>${ic('send')} Mengirim Pendaftaran</h3><p class="muted small">Jangan tutup halaman ini. Proses biasanya 20–60 detik tergantung koneksi.</p>
    <div class="prog" style="margin-top:8px"><i id="pg-all"></i></div><ul class="progress-list">${langkah.map((t, i) => `<li data-i="${i}"><span class="st">${ic('circle', 'ic-sm')}</span>${esc(t)}</li>`).join('')}</ul><div id="pg-err"></div>`, { kunci: true });
  const set = (i, st) => { const li = m.querySelector(`[data-i="${i}"]`); if (!li) return; li.className = st; li.querySelector('.st').innerHTML = st === 'done' ? ic('circle-check', 'ic-sm') : st === 'on' ? '<span class="spin" style="width:16px;height:16px"></span>' : st === 'gagal' ? ic('circle-x', 'ic-sm') : ic('circle', 'ic-sm');
    const done = m.querySelectorAll('li.done').length; m.querySelector('#pg-all').style.width = (done / langkah.length) * 100 + '%'; };
  const gagal = (i, msg, aksi) => {
    set(i, 'gagal');
    m.querySelector('#pg-err').innerHTML = `<div class="callout bahaya" style="margin-top:14px">${ic('circle-alert')}<div>${esc(msg)}</div></div><div class="aksi">${aksi || ''}<button class="btn btn-primer" data-tutup>Tutup</button></div>`;
    m.querySelector('[data-tutup]').onclick = () => m.tutup();
  };
  const data = {}; ALL_FIELDS.forEach((f) => { if (!f.k.startsWith('Wali') || Form.wali) data[f.k] = String(Form.data[f.k] ?? '').trim(); });
  set(0, 'on');
  const init = await api('regInit', { form: data });
  if (!init.success) {
    if (init.data && init.data.code === 'INVALID') {
      const er = init.data.errors || {}; Form.errors = Object.assign({}, er);
      const k0 = Object.keys(er)[0];
      gagal(0, 'Ada isian yang perlu diperbaiki: ' + Object.keys(er).map((k) => (ALL_FIELDS.find((f) => f.k === k) || {}).label || k).join(', ') + '.');
      m.querySelector('[data-tutup]').onclick = () => { m.tutup(); Form.step = fieldStep(k0) || 1; renderForm(); };
      return;
    }
    if (init.data && init.data.code === 'DUPLICATE') return gagal(0, init.message + ' Gunakan menu Cek Status untuk melihat pendaftaran Anda.', `<a class="btn btn-outline" href="#/status" onclick="this.closest('.modal-bg').tutup()">Cek Status</a>`);
    return gagal(0, init.message || 'Gagal mengirim.');
  }
  set(0, 'done');
  const key = init.data.key;
  // unggah 2 berkas sekaligus agar cepat tanpa membebani koneksi HP
  const antre = BERKAS.map((b, i) => ({ b, i: i + 1 }));
  let errUp = null;
  const pekerja = async () => {
    while (antre.length && !errUp) {
      const { b, i } = antre.shift(); set(i, 'on');
      const f = Form.files[b.j].file;
      const r = await api('regUpload', { key, jenis: b.j, mime: f.type, b64: await fileToB64(f) }, { timeout: 180000 });
      if (!r.success) { errUp = { i, msg: b.label + ': ' + (r.message || 'gagal diunggah') }; return; }
      set(i, 'done');
    }
  };
  await Promise.all([pekerja(), pekerja()]);
  if (errUp) return gagal(errUp.i, errUp.msg + ' Periksa koneksi lalu coba kirim lagi.', `<button class="btn btn-aksen" onclick="this.closest('.modal-bg').tutup();kirimPendaftaran()">${ic('refresh-cw', 'ic-sm')} Coba lagi</button>`);
  const iF = langkah.length - 1; set(iF, 'on');
  const fin = await api('regFinalize', { key }, { timeout: 180000, tries: 3 });
  if (!fin.success) return gagal(iF, fin.message || 'Gagal menyelesaikan pendaftaran.', `<button class="btn btn-aksen" onclick="this.closest('.modal-bg').tutup();kirimPendaftaran()">Coba lagi</button>`);
  set(iF, 'done');
  App.hasil = Object.assign({}, fin.data, { tgl: data.Tanggal_Lahir });
  Store.set('hasil', Object.assign({}, fin.data, { pdf: undefined, tgl: data.Tanggal_Lahir }));
  Store.del('draft');
  Object.values(Form.files).forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
  Form.data = {}; Form.files = {}; Form.step = 1; Form.errors = {}; Form.wali = false;
  setTimeout(() => { m.tutup(); go('berhasil'); }, 400);
}
registerPage('daftar', {
  title: 'Formulir Pendaftaran', layout: 'fokus',
  show(el, p, baru) {
    Form.el = el;
    // segarkan hanya bila belum tampil / status buka-tutup berubah (agar fokus mengetik tidak hilang)
    if (baru) Boot.on((d) => { if (currentPage !== 'daftar') return; const o = !!(d && d.status && d.status.open); if (Form.el.querySelector('#frm') && Form.renderedOpen === o) return; renderForm(); });
    renderForm();
  }
});
window.addEventListener('beforeunload', (e) => { if (currentPage === 'daftar' && Object.keys(Form.files).length) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- PENDAFTARAN BERHASIL ---------------- */
registerPage('berhasil', {
  title: 'Pendaftaran Berhasil', layout: 'fokus',
  show(el) {
    const h = App.hasil || Store.get('hasil', null);
    const s = (App.boot && App.boot.settings) || {};
    if (!h) { go('status'); return; }
    const konfeti = Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${['#F2C200', '#0096D6', '#004A87', '#15803D'][i % 4]};animation-delay:${(i % 9) * 0.12}s"></i>`).join('');
    el.innerHTML = `<div class="fokus-head"><div class="wrap"><a class="brand" href="#/"><img data-logo src="${logoUrl(App.boot)}" alt="" width="36" height="36"><span><b style="font-size:15px">PPDB Online</b><small>SMA Triguna 1956</small></span></a><span style="margin-left:auto"></span>${temaBtn()}</div></div>
    <div class="fokus-body"><div class="wrap stack" style="max-width:900px">
      <div class="card sukses-card"><div class="konfeti">${konfeti}</div>
        <div class="sukses-ic">${ic('circle-check', 'ic-xl')}</div>
        <span class="badge b-hijau">Sistem Pendaftaran Online</span>
        <h2 style="margin-top:12px">Pendaftaran Berhasil Dikirim!</h2>
        <p class="muted">Terima kasih. Data calon siswa telah kami terima untuk PPDB Tahun Ajaran ${esc(s.tahun_ajaran || '')}. Simpan nomor berikut:</p>
        <div class="no-box"><span class="mono">${esc(h.no)}</span><button class="btn btn-primer btn-sm" onclick="salin('${esc(h.no)}','Nomor pendaftaran disalin')">${ic('copy', 'ic-sm')} Salin Nomor</button></div>
        <p class="small muted">${h.emailOk === false ? `<span style="color:var(--bahaya)">${ic('triangle-alert', 'ic-sm')} Email gagal terkirim — unduh PDF di bawah, panitia akan mengirim ulang.</span>` : `${ic('mail', 'ic-sm')} Bukti pendaftaran (PDF) telah dikirim ke <b>${esc(h.email || '')}</b>`}</p>
        <div class="row" style="justify-content:center;margin-top:16px">
          <button class="btn btn-aksen btn-lg" id="unduh-pdf">${ic('download')} Unduh Bukti PDF (A4)</button>
          <a class="btn btn-primer btn-lg" href="#/status">${ic('search')} Cek Status</a>
          <a class="btn btn-ghost btn-lg" href="#/">Beranda</a>
        </div>
      </div>
      <div class="card"><div class="card-title">${ic('clipboard-list')} Ringkasan Pendaftaran <span class="badge b-amber" style="margin-left:auto">Menunggu Verifikasi</span></div>
        <div class="kv" style="border-bottom:1px solid var(--border)"><div>Nama Calon Siswa</div><div>${esc(h.nama)}</div><div>NISN</div><div class="mono">${esc(h.nisn || '-')}</div><div>Sekolah Asal</div><div>${esc(h.sekolah || '-')}</div>
          <div>Waktu Kirim</div><div>${tglID(h.waktu, true)}</div><div>Biaya Formulir</div><div>${rupiah(s.biaya_formulir)}</div></div></div>
      <div class="card"><div class="card-title">${ic('list-checks')} Langkah Selanjutnya</div>
        <div class="lanjut-grid"><div><div class="n">1</div><b>Simpan Nomor & PDF</b><p class="small muted">Dibutuhkan untuk cek status dan daftar ulang.</p></div>
          <div><div class="n">2</div><b>Tunggu Verifikasi</b><p class="small muted">Panitia memeriksa berkas & bukti pembayaran Anda.</p></div>
          <div><div class="n">3</div><b>Pantau Status</b><p class="small muted">Gunakan nomor pendaftaran + tanggal lahir siswa.</p></div></div></div>
      ${s.kontak_wa ? `<div class="wa-strip"><div><b>Butuh bantuan pendaftaran?</b><div class="small" style="opacity:.9">Hubungi panitia PPDB melalui WhatsApp.</div></div><a class="btn" href="${waLink(s.kontak_wa, 'Halo Panitia, saya sudah mendaftar dengan nomor ' + h.no)}" target="_blank" rel="noopener">${ic('message-circle')} WhatsApp ${esc(s.kontak_wa)}</a></div>` : ''}
    </div></div>`;
    $('#unduh-pdf').onclick = async (e) => {
      if (App.hasil && App.hasil.pdf && App.hasil.no === h.no) return unduhB64(App.hasil.pdf, h.pdfName || 'Bukti_Pendaftaran.pdf');
      const b = e.currentTarget; setBusy(b, true, 'Menyiapkan…');
      const r = await api('getPdf', { no: h.no, tgl: h.tgl });
      setBusy(b, false);
      r.success ? unduhB64(r.data.b64, r.data.name) : toast('Gagal mengunduh', r.message, 'error');
    };
  }
});

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
