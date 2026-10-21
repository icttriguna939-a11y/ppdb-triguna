/* =====================================================================
   siswa.js — Akun siswa: Daftar Akun → Pembayaran → Masuk → Dasbor → Formulir
   Username = email siswa · Password awal = NISN
   ===================================================================== */
'use strict';

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
    F('NISN', 'NISN', { req: true, t: 'num', len: 10, lock: true, hint: 'Sesuai akun — tidak dapat diubah' }), F('NIK', 'NIK Siswa', { req: true, t: 'num', len: 16, hint: '16 digit sesuai Kartu Keluarga' }),
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
  { j: 'ijazah', label: 'Ijazah / SKL', hint: 'PDF/JPG/PNG · maks 2 MB', accept: 'application/pdf,image/jpeg,image/png', mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2, ic: 'award' }
];
/** Bukti bayar diunggah saat membuat akun (bukan di formulir) */
const BUKTI = { j: 'bukti', label: 'Bukti Pembayaran', hint: 'JPG/PNG/PDF · maks 2 MB', accept: 'application/pdf,image/jpeg,image/png', mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2, ic: 'receipt' };
const Form = { step: 1, data: {}, errors: {}, files: {}, wali: false, el: null, akun: null };
/** Muat draf milik akun ini + isi otomatis dari data akun (Nama, NISN, Sekolah Asal, HP, Email) */
function siapkanForm(ak) {
  if (Form.akun === ak.ID_Akun) return;
  Form.akun = ak.ID_Akun; Form.files = {}; Form.errors = {};
  const dr = Store.get('draft:' + ak.ID_Akun, null);
  Form.data = (dr && dr.data) || {}; Form.step = dr ? Math.min(dr.step || 1, 5) : 1; Form.wali = !!(dr && dr.wali);
  const isi = { Nama: ak.Nama, Sekolah_Asal: ak.Sekolah_Asal, HP: ak.WA_Siswa, Email: ak.Email };
  Object.keys(isi).forEach((k) => { if (!Form.data[k]) Form.data[k] = isi[k]; });
  Form.data.NISN = ak.NISN;
}
const simpanDraft = debounce(() => { if (!Form.akun) return; Store.set('draft:' + Form.akun, { data: Form.data, step: Form.step, wali: Form.wali, t: Date.now() }); const a = $('.autosave'); if (a) { a.hidden = false; } }, 400);

function validasiField(f, v) {
  v = String(v ?? '').trim();
  if (!v) return f.req ? 'Wajib diisi.' : '';
  if (f.t === 'num' && !/^\d+$/.test(v)) return 'Hanya angka.';
  if (f.len && v.length !== f.len) return `Harus ${f.len} digit angka.`;
  if (f.t === 'dec' && !/^\d+([.,]\d+)?$/.test(v)) return 'Masukkan angka, contoh 3,5.';
  if (f.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format email tidak valid.';
  if (f.k === 'HP' || f.wa) { let d = v.replace(/\D/g, ''); if (d.startsWith('62')) d = '0' + d.slice(2); if (!/^08\d{8,12}$/.test(d)) return 'Nomor HP diawali 08, 10–14 digit.'; }
  if (f.age) { const a = (Date.now() - new Date(v + 'T00:00:00')) / (365.25 * 864e5); if (!(a >= 13 && a <= 19)) return 'Usia calon siswa harus 13–19 tahun.'; }
  return '';
}
function opsi(ref) { return ((App.boot && App.boot.referensi) || {})[ref] || []; }
function fieldHtml(f, S = Form) {
  const v = S.data[f.k] ?? '';
  const er = S.errors[f.k];
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
    ctl = `<div class="inp-wrap"><input id="${id}" name="${f.k}" class="inp ${f.upper ? '' : ''}" type="${typ}" value="${esc(v)}" ${im ? `inputmode="${im}"` : ''} ${f.len ? `maxlength="${f.len}"` : f.max ? `maxlength="${f.max}"` : ''} ${f.ac ? `autocomplete="${f.ac}"` : 'autocomplete="off"'} ${f.age ? `max="${new Date().toISOString().slice(0, 10)}"` : ''} ${f.lock ? 'readonly' : ''} ${aria}>
      ${f.suf ? `<span class="suffix">${f.suf}</span>` : `<span class="ok-ic">${ic('circle-check', 'ic-sm')}</span>`}</div>`;
  }
  return `<div class="field ${f.full ? 'full' : ''} ${er ? 'err' : ''}" data-f="${f.k}">${lab}${ctl}
    ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}<div class="errmsg" id="${id}-h">${ic('circle-alert', 'ic-sm')} <span>${esc(er || '')}</span></div></div>`;
}
const grid = (arr) => `<div class="fgrid">${arr.map((f) => fieldHtml(f)).join('')}</div>`;

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
    const siap = BERKAS.filter((b) => Form.files[b.j] && Form.files[b.j].ok).length;
    return `<div class="callout" style="margin-bottom:16px">${ic('info')}<div>Semua <b>${BERKAS.length} berkas wajib</b> diunggah. Berkas <b>tidak dapat diganti</b> setelah formulir dikirim. Foto otomatis dikecilkan agar unggahan ringan.</div></div>
      <div class="row-between" style="margin-bottom:12px"><span class="chip" id="cnt-berkas">${ic('files', 'ic-sm')} ${siap} dari ${BERKAS.length} berkas siap</span>
      <span class="badge b-hijau">${ic('receipt', 'ic-sm')} Bukti pembayaran sudah diunggah di akun</span></div>
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
    <details><summary><span>Berkas (${BERKAS.filter((b) => Form.files[b.j] && Form.files[b.j].ok).length}/${BERKAS.length})</span><button class="btn btn-ghost btn-sm" type="button" data-ke="5">${ic('pencil', 'ic-sm')} Ubah</button></summary>
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
    <span style="margin-left:auto"></span>${temaBtn()}<a class="btn btn-ghost btn-sm" href="#/akun">${ic('arrow-left', 'ic-sm')} <span class="hide-xs">Akun Saya</span></a></div></div>`;
  const sb = Siswa.boot;
  if (sb && (sb.pendaftaran || !sb.gate.open)) {
    el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:640px"><div class="card empty"><div class="ilus">${ic(sb.pendaftaran ? 'circle-check' : 'lock', 'ic-xl')}</div>
      <h3>${sb.pendaftaran ? 'Formulir sudah dikirim' : 'Formulir belum dapat diisi'}</h3><p>${sb.pendaftaran ? 'Nomor pendaftaran Anda: <b class="mono">' + esc(sb.pendaftaran.no) + '</b>' : esc(sb.gate.reason)}</p>
      <a class="btn btn-primer" href="#/akun">${ic('user')} Ke Akun Saya</a></div></div></div>`;
    return;
  }
  if (!d || !sb) { el.innerHTML = head + `<div class="fokus-body"><div class="wrap"><div class="card"><div class="sk sk-h"></div><div class="sk sk-line"></div><div class="sk sk-line" style="width:70%"></div></div></div></div>`; return; }
  if (!st.open) {
    el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:640px"><div class="card empty"><div class="ilus">${ic('calendar-x', 'ic-xl')}</div><h3>Pendaftaran belum tersedia</h3><p>${esc(st.reason || '')}</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primer" href="#/akun">Ke Akun Saya</a></div></div></div></div>`;
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
  const c = $('#cnt-berkas'); if (c) c.innerHTML = ic('files', 'ic-sm') + ` ${siap} dari ${BERKAS.length} berkas siap`;
  const l = $('#btn-lanjut'); if (l) l.disabled = siap < BERKAS.length;
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
  const init = await apiS('regInit', { form: data });
  if (!init.success) {
    if (init.data && init.data.code === 'INVALID') {
      const er = init.data.errors || {}; Form.errors = Object.assign({}, er);
      const k0 = Object.keys(er)[0];
      gagal(0, 'Ada isian yang perlu diperbaiki: ' + Object.keys(er).map((k) => (ALL_FIELDS.find((f) => f.k === k) || {}).label || k).join(', ') + '.');
      m.querySelector('[data-tutup]').onclick = () => { m.tutup(); Form.step = fieldStep(k0) || 1; renderForm(); };
      return;
    }
    if (init.data && /DUPLICATE|DONE|LOCKED/.test(init.data.code)) return gagal(0, init.message, `<a class="btn btn-outline" href="#/akun" onclick="this.closest('.modal-bg').tutup()">Ke Akun Saya</a>`);
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
      const r = await apiS('regUpload', { key, jenis: b.j, mime: f.type, b64: await fileToB64(f) }, { timeout: 180000 });
      if (!r.success) { errUp = { i, msg: b.label + ': ' + (r.message || 'gagal diunggah') }; return; }
      set(i, 'done');
    }
  };
  await Promise.all([pekerja(), pekerja()]);
  if (errUp) return gagal(errUp.i, errUp.msg + ' Periksa koneksi lalu coba kirim lagi.', `<button class="btn btn-aksen" onclick="this.closest('.modal-bg').tutup();kirimPendaftaran()">${ic('refresh-cw', 'ic-sm')} Coba lagi</button>`);
  const iF = langkah.length - 1; set(iF, 'on');
  const fin = await apiS('regFinalize', { key }, { timeout: 180000, tries: 3 });
  if (!fin.success) return gagal(iF, fin.message || 'Gagal menyelesaikan pendaftaran.', `<button class="btn btn-aksen" onclick="this.closest('.modal-bg').tutup();kirimPendaftaran()">Coba lagi</button>`);
  set(iF, 'done');
  App.hasil = Object.assign({}, fin.data, { tgl: data.Tanggal_Lahir });
  Store.set('hasil', Object.assign({}, fin.data, { pdf: undefined, tgl: data.Tanggal_Lahir }));
  Store.del('draft:' + Form.akun);
  Siswa.muat(true);
  Object.values(Form.files).forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
  Form.data = {}; Form.files = {}; Form.step = 1; Form.errors = {}; Form.wali = false; Form.akun = null;
  setTimeout(() => { m.tutup(); go('berhasil'); }, 400);
}
registerPage('formulir', {
  title: 'Formulir Pendaftaran', layout: 'fokus',
  async show(el, p, baru) {
    Form.el = el;
    if (!Siswa.sesi()) { go('masuk'); return; }
    // segarkan hanya bila belum tampil / status buka-tutup berubah (agar fokus mengetik tidak hilang)
    if (baru) Boot.on((d) => { if (currentPage !== 'formulir') return; const o = !!(d && d.status && d.status.open); if (Form.el.querySelector('#frm') && Form.renderedOpen === o) return; renderForm(); });
    if (Siswa.boot) { siapkanForm(Siswa.boot.akun); renderForm(); }
    else renderForm();
    const sebelum = JSON.stringify(Siswa.boot && Siswa.boot.gate);
    await Siswa.muat();
    if (!Siswa.boot || currentPage !== 'formulir') return;
    siapkanForm(Siswa.boot.akun);
    if (!el.querySelector('#frm') || JSON.stringify(Siswa.boot.gate) !== sebelum) renderForm();
  }
});
window.addEventListener('beforeunload', (e) => { if (currentPage === 'formulir' && Object.keys(Form.files).length) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- PENDAFTARAN BERHASIL ---------------- */
registerPage('berhasil', {
  title: 'Pendaftaran Berhasil', layout: 'fokus',
  show(el) {
    const h = App.hasil || Store.get('hasil', null);
    const s = (App.boot && App.boot.settings) || {};
    if (!h) { go('akun'); return; }
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
          <a class="btn btn-primer btn-lg" href="#/akun">${ic('user')} Ke Akun Saya</a>
          <a class="btn btn-ghost btn-lg" href="#/">Beranda</a>
        </div>
      </div>
      <div class="card"><div class="card-title">${ic('clipboard-list')} Ringkasan Pendaftaran <span class="badge b-amber" style="margin-left:auto">Menunggu Verifikasi</span></div>
        <div class="kv" style="border-bottom:1px solid var(--border)"><div>Nama Calon Siswa</div><div>${esc(h.nama)}</div><div>NISN</div><div class="mono">${esc(h.nisn || '-')}</div><div>Sekolah Asal</div><div>${esc(h.sekolah || '-')}</div>
          <div>Waktu Kirim</div><div>${tglID(h.waktu, true)}</div><div>Biaya Formulir</div><div>${rupiah(s.biaya_formulir)}</div></div></div>
      <div class="card"><div class="card-title">${ic('list-checks')} Langkah Selanjutnya</div>
        <div class="lanjut-grid"><div><div class="n">1</div><b>Simpan Nomor & PDF</b><p class="small muted">Dibutuhkan untuk cek status dan daftar ulang.</p></div>
          <div><div class="n">2</div><b>Tunggu Verifikasi</b><p class="small muted">Panitia memeriksa berkas & bukti pembayaran Anda.</p></div>
          <div><div class="n">3</div><b>Pantau Status</b><p class="small muted">Masuk ke Akun Saya untuk melihat hasil verifikasi & seleksi.</p></div></div></div>
      ${s.kontak_wa ? `<div class="wa-strip"><div><b>Butuh bantuan pendaftaran?</b><div class="small" style="opacity:.9">Hubungi panitia PPDB melalui WhatsApp.</div></div><a class="btn" href="${waLink(s.kontak_wa, 'Halo Panitia, saya sudah mendaftar dengan nomor ' + h.no)}" target="_blank" rel="noopener">${ic('message-circle')} WhatsApp ${esc(s.kontak_wa)}</a></div>` : ''}
    </div></div>`;
    $('#unduh-pdf').onclick = async (e) => {
      if (App.hasil && App.hasil.pdf && App.hasil.no === h.no) return unduhB64(App.hasil.pdf, h.pdfName || 'Bukti_Pendaftaran.pdf');
      const b = e.currentTarget; setBusy(b, true, 'Menyiapkan…');
      const r = await apiS('siswaPdf', {});
      setBusy(b, false);
      r.success ? unduhB64(r.data.b64, r.data.name) : toast('Gagal mengunduh', r.message, 'error');
    };
  }
});


/* ---------------- Sesi siswa (terpisah dari sesi admin) ---------------- */
const Siswa = {
  boot: null,
  sesi() { const s = Store.get('siswa', null); return s && s.exp > Date.now() ? s : null; },
  simpan(token, exp, boot) { Store.set('siswa', { token, exp }); if (boot) this.set(boot); },
  set(b) { this.boot = b; Store.set('siswa-boot', { t: Date.now(), data: b }); },
  keluar(pesan) {
    Store.del('siswa'); Store.del('siswa-boot'); this.boot = null; Form.akun = null;
    if (pesan) toast(pesan, '', 'info');
    go('masuk');
  },
  async muat() {
    if (!this.sesi()) return null;
    const r = await apiS('siswaBoot', {});
    if (r.success) this.set(r.data);
    return r;
  }
};
(() => { if (Siswa.sesi()) { const c = Store.get('siswa-boot', null); if (c) Siswa.boot = c.data; } })();
/** api() dengan token siswa; sesi kedaluwarsa → kembali ke halaman Masuk */
function apiS(action, data, opt = {}) {
  const s = Siswa.sesi();
  return api(action, data, Object.assign({ token: s ? s.token : '', onAuth: () => Siswa.keluar('Sesi berakhir, silakan masuk kembali.') }, opt));
}
const headFokus = (judul, kanan = '') => `<div class="fokus-head"><div class="wrap"><a class="brand" href="#/"><img data-logo src="${logoUrl(App.boot)}" alt="" width="36" height="36"><span><b style="font-size:15px">${judul}</b><small>SMA Triguna 1956</small></span></a>
  <span style="margin-left:auto"></span>${temaBtn()}${kanan}</div></div>`;

/* ---------------- Kartu petunjuk pembayaran (dipakai di Daftar & Dasbor) ---------------- */
function kartuBayar(b) {
  b = b || (App.boot && App.boot.settings) || {};
  return `<div class="card biaya-card bayar-fleks">
    <div><div class="overline">Biaya Formulir Pendaftaran</div><div class="nominal">${rupiah(b.biaya_formulir)}</div>
      <p style="opacity:.85;margin:0" class="small">${esc(b.catatan_bayar || '')}</p></div>
    <div class="rek"><div class="small" style="opacity:.8">Transfer ke</div><div style="font-weight:700">${esc(b.bank_nama || '')}</div>
      <div class="norek mono">${esc(b.bank_norek || '')}</div><div class="small" style="opacity:.85">a.n. ${esc(b.bank_atas_nama || '')}</div>
      <button type="button" class="btn btn-putih btn-sm" style="margin-top:12px" onclick="salin('${esc(String(b.bank_norek || '').replace(/'/g, ''))}','Nomor rekening disalin')">${ic('copy', 'ic-sm')} Salin No. Rekening</button></div></div>
  <ol class="small" style="margin:14px 0 0;padding-left:20px;display:grid;gap:6px">
    <li>Transfer <b>tepat ${rupiah(b.biaya_formulir)}</b> ke rekening di atas (bisa lewat m-banking, ATM, atau teller).</li>
    <li>Simpan/foto bukti transfer yang memperlihatkan nominal, tanggal, dan rekening tujuan.</li>
    <li>Unggah bukti di bawah ini. Panitia akan memeriksa dan mengonfirmasi.</li></ol>`;
}
/** Widget unggah bukti bayar */
const Bukti = { f: null };
function buktiWidget() {
  const f = Bukti.f, b = BUKTI;
  return `<div class="unggah ${!f ? '' : f.ok ? 'ok' : 'gagal'}" id="w-bukti" data-berkas="bukti" style="margin-top:16px">
    <div class="head"><span class="ic-bulat ${f && f.ok ? 'hijau' : 'aksen'}">${ic(f && f.ok ? 'circle-check' : 'receipt')}</span><div><b>${b.label}<span class="req">*</span></b><span>${b.hint}</span></div></div>
    ${f && f.ok ? `<div class="file"><div class="thumb">${f.preview ? `<img src="${f.preview}" alt="">` : ic('file-text')}</div><div class="nm"><b>${esc(f.file.name)}</b><span class="small muted">${ukuran(f.file.size)} · siap dikirim</span></div>
      <button class="btn btn-ghost btn-sm" type="button" id="bukti-ganti">${ic('refresh-cw', 'ic-sm')} Ganti</button></div>`
      : `<label class="pilih">${ic('upload-cloud')} Pilih foto/scan bukti transfer<input type="file" accept="${b.accept}" id="bukti-file" aria-label="Unggah bukti pembayaran"></label>
      ${f && !f.ok ? `<div class="errmsg" style="display:flex">${ic('circle-alert', 'ic-sm')} ${esc(f.err)}</div>` : ''}`}</div>`;
}
function ikatBukti(root, onSiap) {
  const segar = () => { const w = root.querySelector('#w-bukti'); if (!w) return; const t = document.createElement('template'); t.innerHTML = buktiWidget().trim(); w.replaceWith(t.content.firstChild); ikatBukti(root, onSiap); onSiap && onSiap(); };
  const inp = root.querySelector('#bukti-file');
  if (inp) inp.onchange = async () => {
    let f = inp.files[0]; if (!f) return;
    if (!BUKTI.mimes.includes(f.type)) { Bukti.f = { ok: false, file: f, err: 'Format tidak didukung. Gunakan JPG, PNG, atau PDF.' }; return segar(); }
    if (/^image\//.test(f.type)) f = await kompresGambar(f, 1600, 0.85, 1.6 * 1048576);
    if (f.size > BUKTI.max * 1048576) { Bukti.f = { ok: false, file: f, err: `Ukuran ${ukuran(f.size)} melebihi 2 MB.` }; return segar(); }
    Bukti.f = { ok: true, file: f, preview: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' };
    segar();
  };
  const g = root.querySelector('#bukti-ganti');
  if (g) g.onclick = () => { Bukti.f = null; segar(); };
  const w = root.querySelector('#w-bukti');
  if (w) { w.ondragover = (e) => { e.preventDefault(); w.classList.add('drag'); }; w.ondragleave = () => w.classList.remove('drag');
    w.ondrop = (e) => { e.preventDefault(); w.classList.remove('drag'); const fi = root.querySelector('#bukti-file'); if (fi && e.dataTransfer.files[0]) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); fi.files = dt.files; fi.onchange(); } }; }
}
async function kirimBukti(btn) {
  if (!Bukti.f || !Bukti.f.ok) { toast('Pilih bukti pembayaran dulu', '', 'warning'); return false; }
  setBusy(btn, true, 'Mengunggah…');
  const f = Bukti.f.file;
  const r = await apiS('akunUploadBukti', { mime: f.type, b64: await fileToB64(f) }, { timeout: 120000 });
  setBusy(btn, false);
  if (!r.success) { toast('Gagal mengunggah', r.message, 'error'); return false; }
  if (Bukti.f.preview) URL.revokeObjectURL(Bukti.f.preview);
  Bukti.f = null;
  Siswa.set(r.data);
  toast('Bukti pembayaran terkirim', 'Panitia akan memeriksa pembayaran Anda.');
  return true;
}

/* =====================================================================
   DAFTAR AKUN — 1 Buat Akun · 2 Pembayaran · 3 Selesai
   ===================================================================== */
const AKUN_FIELDS = [
  F('Nama', 'Nama Lengkap Siswa', { req: true, full: true, upper: true, hint: 'Sesuai akta kelahiran / ijazah', ac: 'name' }),
  F('Email', 'Email Siswa', { req: true, t: 'email', full: true, hint: 'Menjadi USERNAME untuk masuk. Pastikan aktif — info akun dikirim ke sini.', ac: 'email' }),
  F('WA_Siswa', 'No. WhatsApp Siswa', { req: true, t: 'tel', wa: true, hint: 'Contoh: 081234567890', ac: 'tel' }),
  F('WA_Ortu', 'No. WhatsApp Orang Tua/Wali', { req: true, t: 'tel', wa: true, hint: 'Untuk informasi penting dari panitia' }),
  F('Sekolah_Asal', 'Asal Sekolah (SMP/MTs)', { req: true, full: true }),
  F('NISN', 'NISN', { req: true, t: 'num', len: 10, full: true, hint: '10 digit — menjadi PASSWORD awal. Cek di nisn.data.kemdikbud.go.id' })
];
const DA = { step: 1, data: Store.get('draft-akun', {}), errors: {}, el: null };
const LANGKAH_DA = ['Buat Akun', 'Pembayaran', 'Selesai'];
function stepperDA(n) {
  return `<div class="stepper" aria-hidden="true">${LANGKAH_DA.map((t, i) => `<div class="s ${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}"><span class="n">${i + 1 < n ? ic('check', 'ic-sm') : i + 1}</span>${t}</div>`).join('')}</div>
    <div class="step-mobile"><div class="row-between"><b>Langkah ${n} dari 3</b><span class="small muted">${LANGKAH_DA[n - 1]}</span></div><div class="bar"><i style="width:${(n / 3) * 100}%"></i></div></div>`;
}
function renderDaftarAkun() {
  const el = DA.el; if (!el) return;
  const d = App.boot, st = (d && d.status) || {};
  const sb = Siswa.sesi() && Siswa.boot;
  if (sb) DA.step = ['Belum Bayar', 'Ditolak'].includes(sb.akun.Status_Bayar) && DA.step < 3 ? 2 : 3;
  const head = headFokus('Daftar PPDB', `<a class="btn btn-ghost btn-sm" href="#/masuk">${ic('log-out', 'ic-sm')} <span class="hide-xs">Sudah punya akun? Masuk</span></a>`);
  if (!d) { el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:760px"><div class="card"><div class="sk sk-h"></div><div class="sk sk-box"></div></div></div></div>`; return; }
  if (!st.open && !sb) {
    el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:640px"><div class="card empty"><div class="ilus">${ic('calendar-x', 'ic-xl')}</div><h3>Pendaftaran belum tersedia</h3><p>${esc(st.reason || '')}</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primer" href="#/">Beranda</a><a class="btn btn-outline" href="#/masuk">Masuk</a></div></div></div></div>`;
    return;
  }
  let isi = '';
  if (DA.step === 1) {
    isi = `<h2 style="font-size:22px;margin-bottom:4px">Buat Akun Pendaftaran</h2><p class="muted small" style="margin-bottom:18px">Isi data singkat di bawah. Setelah itu lakukan pembayaran, lalu masuk untuk mengisi formulir lengkap.</p>
      <div class="callout" style="margin-bottom:18px">${ic('key-round')}<div><b>Data masuk Anda nanti:</b><br>Username = <b>email siswa</b> · Password = <b>NISN</b> (bisa diganti setelah masuk)</div></div>
      <form id="frm-akun" novalidate><div class="fgrid">${AKUN_FIELDS.map((f) => fieldHtml(f, DA)).join('')}</div>
      <label class="cek" style="margin-top:18px"><input type="checkbox" id="setuju-akun"> Data yang saya isi benar dan saya menyetujui penggunaannya untuk keperluan PPDB.</label></form>
      <div class="aksi-bar"><a class="btn btn-outline" href="#/">${ic('arrow-left')} Batal</a><button class="btn btn-aksen" type="button" id="btn-buat" disabled>Buat Akun & Lanjut ${ic('arrow-right')}</button></div>`;
  } else if (DA.step === 2) {
    const ak = sb.akun;
    isi = `<h2 style="font-size:22px;margin-bottom:4px">Pembayaran Formulir</h2><p class="muted small" style="margin-bottom:18px">Akun <b>${esc(ak.Email)}</b> berhasil dibuat. Lakukan pembayaran lalu unggah buktinya.</p>
      ${ak.Status_Bayar === 'Ditolak' ? `<div class="callout bahaya" style="margin-bottom:14px">${ic('circle-alert')}<div><b>Bukti sebelumnya ditolak:</b> ${esc(ak.Catatan_Bayar || '-')}</div></div>` : ''}
      ${kartuBayar(sb.bayar)}${buktiWidget()}
      <div class="aksi-bar"><a class="btn btn-ghost" href="#/akun">Unggah nanti</a><button class="btn btn-aksen" type="button" id="btn-bukti" ${Bukti.f && Bukti.f.ok ? '' : 'disabled'}>${ic('send')} Kirim Bukti Pembayaran</button></div>`;
  } else {
    const ak = sb.akun;
    isi = `<div style="text-align:center"><div class="sukses-ic">${ic('circle-check', 'ic-xl')}</div><h2>Akun Anda Siap!</h2>
      <p class="muted">${ak.Status_Bayar === 'Terkonfirmasi' ? 'Pembayaran sudah dikonfirmasi.' : 'Bukti pembayaran sedang diperiksa panitia.'} Gunakan data berikut untuk masuk:</p></div>
      <div class="card" style="background:var(--bg-alt);box-shadow:none;margin:10px 0 16px"><div class="kv" style="border-bottom:1px solid var(--border)">
        <div>Username</div><div class="row" style="justify-content:space-between"><span class="mono">${esc(ak.Email)}</span><button class="btn btn-ghost btn-sm" onclick="salin('${esc(ak.Email)}','Username disalin')">${ic('copy', 'ic-sm')}</button></div>
        <div>Password</div><div class="row" style="justify-content:space-between"><span class="mono">${esc(ak.NISN)}</span><span class="small muted">(NISN Anda)</span></div></div></div>
      <div class="callout peringatan">${ic('shield-alert')}<div class="small">Simpan data ini. Demi keamanan, ganti password di menu <b>Akun Saya</b>. Info akun juga dikirim ke email Anda.</div></div>
      <div class="row" style="justify-content:center;margin-top:20px">
        ${sb.gate.open ? `<a class="btn btn-aksen btn-lg" href="#/formulir">${ic('pencil-line')} Isi Formulir Sekarang</a>` : ''}
        <a class="btn ${sb.gate.open ? 'btn-outline' : 'btn-primer'} btn-lg" href="#/akun">${ic('user')} Ke Akun Saya</a></div>
      ${sb.gate.open ? '' : `<p class="hint" style="text-align:center;margin-top:12px">${esc(sb.gate.reason)}</p>`}`;
  }
  el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:820px"><main class="card form-card">${stepperDA(DA.step)}${isi}</main></div></div>`;
  if (DA.step === 1) ikatDaftarAkun();
  if (DA.step === 2) { const root = el.querySelector('main'); ikatBukti(root, () => { $('#btn-bukti').disabled = !(Bukti.f && Bukti.f.ok); }); $('#btn-bukti').onclick = async (e) => { if (await kirimBukti(e.currentTarget)) { DA.step = 3; renderDaftarAkun(); window.scrollTo(0, 0); } }; }
}
function ikatDaftarAkun() {
  const frm = $('#frm-akun'), btn = $('#btn-buat'), cek = $('#setuju-akun');
  cek.onchange = () => { btn.disabled = !cek.checked; };
  frm.addEventListener('input', (e) => {
    const t = e.target, f = AKUN_FIELDS.find((x) => x.k === t.name); if (!f) return;
    if (f.t === 'num') { const v = t.value.replace(/\D/g, ''); if (v !== t.value) t.value = v; }
    DA.data[f.k] = f.upper ? t.value.toUpperCase() : t.value;
    const box = t.closest('.field');
    if (box.classList.contains('err') && !validasiField(f, t.value)) { box.classList.remove('err'); delete DA.errors[f.k]; }
    if (f.len) box.classList.toggle('ok', t.value.length === f.len);
    Store.set('draft-akun', DA.data);
  });
  frm.addEventListener('focusout', (e) => { const t = e.target, f = AKUN_FIELDS.find((x) => x.k === t.name); if (f && String(t.value).trim()) tandaiS(DA, f.k, validasiField(f, t.value)); });
  frm.onsubmit = (e) => e.preventDefault();
  btn.onclick = async () => {
    let pertama = null;
    AKUN_FIELDS.forEach((f) => { const m = validasiField(f, DA.data[f.k]); tandaiS(DA, f.k, m); if (m && !pertama) pertama = f.k; });
    if (pertama) { const i = $(`#f-${pertama}`); i && i.focus(); toast('Periksa kembali isian', '', 'warning'); return; }
    setBusy(btn, true, 'Membuat akun…');
    const data = {}; AKUN_FIELDS.forEach((f) => { data[f.k] = String(DA.data[f.k] || '').trim(); });
    const r = await api('akunDaftar', data, { token: '' });
    setBusy(btn, false);
    if (!r.success) {
      if (r.data && r.data.errors) { Object.keys(r.data.errors).forEach((k) => tandaiS(DA, k, r.data.errors[k])); }
      if (r.data && r.data.code === 'DUPLICATE') {
        const m = modal(`<h3>${ic('user')} Akun sudah ada</h3><p class="muted">${esc(r.message)}</p><div class="aksi"><button class="btn btn-ghost" data-x>Tutup</button><a class="btn btn-primer" href="#/masuk" data-x>Masuk</a></div>`);
        m.querySelectorAll('[data-x]').forEach((b) => { b.onclick = () => m.tutup(); });
        return;
      }
      return toast('Gagal membuat akun', r.message, 'error');
    }
    Siswa.simpan(r.data.token, r.data.exp, r.data.boot);
    Store.del('draft-akun'); DA.data = {};
    toast('Akun berhasil dibuat', 'Info akun dikirim ke ' + r.data.boot.akun.Email);
    DA.step = 2; renderDaftarAkun(); window.scrollTo(0, 0);
  };
}
function tandaiS(S, k, msg) {
  const box = $(`.field[data-f="${k}"]`);
  if (msg) S.errors[k] = msg; else delete S.errors[k];
  if (!box) return;
  box.classList.toggle('err', !!msg);
  const sp = box.querySelector('.errmsg span'); if (sp) sp.textContent = msg || '';
}
registerPage('daftar', {
  title: 'Daftar Akun', layout: 'fokus',
  show(el, p, baru) {
    DA.el = el;
    if (!Siswa.sesi()) DA.step = 1;
    if (baru) Boot.on(() => { if (currentPage === 'daftar' && !el.querySelector('#frm-akun, #w-bukti')) renderDaftarAkun(); });
    renderDaftarAkun();
  }
});

/* =====================================================================
   MASUK (login siswa)
   ===================================================================== */
registerPage('masuk', {
  title: 'Masuk', layout: 'fokus',
  show(el) {
    if (Siswa.sesi()) { go('akun'); return; }
    const s = (App.boot && App.boot.settings) || {};
    el.innerHTML = headFokus('Masuk Akun PPDB', `<a class="btn btn-ghost btn-sm" href="#/">${ic('arrow-left', 'ic-sm')} <span class="hide-xs">Beranda</span></a>`) + `
    <div class="fokus-body"><div class="wrap" style="max-width:460px"><form class="card" id="ms-form" novalidate style="padding:30px">
      <div style="text-align:center;margin-bottom:8px"><img data-logo src="${logoUrl(App.boot)}" alt="" width="64" height="64" style="margin:0 auto 10px"><div class="overline">Akun Calon Siswa</div><h2 style="font-size:24px;margin:6px 0 2px">Masuk</h2>
        <p class="muted small">Masuk untuk membayar, mengisi formulir, dan memantau status pendaftaran.</p></div>
      <div id="ms-err"></div>
      <div class="stack" style="margin-top:14px">
        <div class="field"><label for="ms-u">Username (Email Siswa)</label><input id="ms-u" class="inp" type="email" autocomplete="username" inputmode="email" autocapitalize="none" placeholder="nama@email.com"></div>
        <div class="field"><label for="ms-p">Password</label><div class="inp-wrap"><input id="ms-p" class="inp" type="password" autocomplete="current-password" style="padding-right:48px" placeholder="NISN (10 digit) bila belum diganti">
          <button type="button" class="btn-ikon" id="ms-eye" aria-label="Tampilkan password" style="position:absolute;right:4px;top:2px;border:0">${ic('eye')}</button></div></div>
        <button class="btn btn-primer btn-block btn-lg" id="ms-btn">${ic('log-out')} Masuk</button>
      </div>
      <p class="small" style="text-align:center;margin:18px 0 0">Belum punya akun? <a href="#/daftar"><b>Daftar sekarang</b></a></p>
      ${s.kontak_wa ? `<p class="hint" style="text-align:center;margin:6px 0 0">Lupa password? <a href="${waLink(s.kontak_wa, 'Halo Panitia PPDB, saya lupa password akun. Email saya: ')}" target="_blank" rel="noopener">Hubungi panitia</a> untuk mengembalikannya ke NISN.</p>` : ''}
      ${DEMO ? '<p class="hint" style="text-align:center">Mode demo: <b>raihan@contoh.id</b> / <b>0098234190</b></p>' : ''}
    </form></div></div>`;
    $('#ms-eye').onclick = () => { const i = $('#ms-p'); i.type = i.type === 'password' ? 'text' : 'password'; $('#ms-eye').innerHTML = ic(i.type === 'password' ? 'eye' : 'eye-off'); };
    $('#ms-form').onsubmit = async (e) => {
      e.preventDefault();
      const u = $('#ms-u').value.trim(), pw = $('#ms-p').value.trim();
      if (!u || !pw) { $('#ms-err').innerHTML = `<div class="callout bahaya" style="margin-top:12px">${ic('circle-alert')}<div>Isi email dan password.</div></div>`; return; }
      const b = $('#ms-btn'); setBusy(b, true, 'Memeriksa…');
      const r = await api('loginSiswa', { username: u, password: pw }, { token: '', tries: 1 });
      setBusy(b, false);
      if (!r.success) { $('#ms-err').innerHTML = `<div class="callout bahaya" style="margin-top:12px">${ic(r.data && r.data.code === 'LOCKED' ? 'lock' : 'circle-alert')}<div>${esc(r.message)}</div></div>`; return; }
      Siswa.simpan(r.data.token, r.data.exp, r.data.boot);
      toast('Selamat datang', r.data.boot.akun.Nama);
      go('akun');
    };
    setTimeout(() => $('#ms-u') && $('#ms-u').focus(), 60);
  }
});

/* =====================================================================
   DASBOR AKUN SISWA
   ===================================================================== */
function trackerSiswa(b) {
  const ak = b.akun, p = b.pendaftaran;
  const tahap = [
    ['Akun Dibuat', 'done', 'user', tglID(ak.Timestamp)],
    ['Pembayaran', ak.Status_Bayar === 'Terkonfirmasi' ? 'done' : ak.Status_Bayar === 'Ditolak' ? 'gagal' : 'kini', 'wallet', ak.Status_Bayar],
    ['Formulir', p ? 'done' : b.gate.open ? 'kini' : '', 'file-text', p ? 'Terkirim · ' + p.no : b.gate.open ? 'Silakan isi formulir' : 'Menunggu pembayaran'],
    ['Verifikasi Berkas', !p ? '' : p.berkas === 'Lengkap' ? 'done' : p.berkas === 'Kurang' ? 'gagal' : 'kini', 'files', p ? p.berkas : '-'],
    ['Hasil Seleksi', !p ? '' : p.seleksi === 'Diterima' ? 'done' : p.seleksi === 'Ditolak' ? 'gagal' : p.berkas === 'Lengkap' ? 'kini' : '', 'award', p ? p.seleksi : '-']
  ];
  let kiniAda = false;
  return `<div class="tracker">${tahap.map(([t, cls, i, ket]) => { if (cls === 'kini') { if (kiniAda) cls = ''; kiniAda = true; }
    return `<div class="tr-it ${cls}"><div class="dot">${ic(cls === 'done' ? 'check' : cls === 'gagal' ? 'x' : i)}</div><div><h4>${t} ${ket && ket !== '-' && !/^\d/.test(ket) && t !== 'Akun Dibuat' && t !== 'Formulir' ? badgeStatus(ket) : ''}</h4><p class="small muted" style="margin:0">${esc(t === 'Akun Dibuat' || t === 'Formulir' ? ket : cls === 'kini' ? 'Sedang diproses' : cls === 'done' ? 'Selesai' : cls === 'gagal' ? 'Perlu tindak lanjut' : 'Menunggu tahap sebelumnya')}</p></div></div>`; }).join('')}</div>`;
}
function renderAkun(el) {
  const b = Siswa.boot;
  const s = (App.boot && App.boot.settings) || {};
  const head = headFokus('Akun Saya', `<button class="btn btn-ghost btn-sm" id="btn-keluar">${ic('log-out', 'ic-sm')} <span class="hide-xs">Keluar</span></button>`);
  if (!b) { el.innerHTML = head + `<div class="fokus-body"><div class="wrap" style="max-width:960px"><div class="card"><div class="sk sk-h"></div><div class="sk sk-box"></div></div></div></div>`; $('#btn-keluar').onclick = () => Siswa.keluar('Anda telah keluar.'); return; }
  const ak = b.akun, p = b.pendaftaran;
  const perluBayar = ['Belum Bayar', 'Ditolak'].includes(ak.Status_Bayar);
  const draft = Store.get('draft:' + ak.ID_Akun, null);
  el.innerHTML = head + `<div class="fokus-body"><div class="wrap stack" style="max-width:960px">
    ${p && p.seleksi === 'Diterima' ? `<div class="selamat"><div class="trofi">${ic('trophy', 'ic-xl')}</div><div><h3>SELAMAT! ${esc(ak.Nama)} DITERIMA di ${esc(s.nama_sekolah || 'SMA Triguna 1956')}</h3><div style="opacity:.9">Silakan lakukan daftar ulang sesuai jadwal.${p.rombel ? ' Rombel: <b>' + esc(p.rombel) + '</b>' : ''}</div></div></div>` : ''}
    <div class="card"><div class="profil"><span class="ini" style="width:64px;height:64px;font-size:22px">${inisial(ak.Nama)}</span>
      <div style="flex:1;min-width:200px"><div class="overline mono">${esc(ak.ID_Akun)}</div><h2 style="margin:4px 0;font-size:22px">${esc(ak.Nama)}</h2><div class="small muted">${esc(ak.Email)} · NISN <span class="mono">${esc(ak.NISN)}</span> · ${esc(ak.Sekolah_Asal)}</div></div>
      ${p ? `<div style="text-align:right"><div class="small muted">No. Pendaftaran</div><div class="mono" style="font-size:20px;font-weight:800;color:var(--primer)">${esc(p.no)}</div></div>` : ''}</div></div>
    <div class="detail-grid">
      <div class="stack">
        <div class="card" id="kartu-bayar"><div class="card-title">${ic('wallet')} Pembayaran Formulir <span style="margin-left:auto">${badgeStatus(ak.Status_Bayar)}</span></div>
          ${ak.Status_Bayar === 'Terkonfirmasi' ? `<div class="callout sukses">${ic('circle-check')}<div>Pembayaran Anda sudah <b>dikonfirmasi</b> panitia.</div></div>`
          : ak.Status_Bayar === 'Menunggu Konfirmasi' ? `<div class="callout">${ic('hourglass')}<div>Bukti pembayaran sedang diperiksa panitia${ak.Waktu_Bukti ? ' (dikirim ' + tglID(ak.Waktu_Bukti, true) + ')' : ''}. ${b.gate.open ? 'Sambil menunggu, Anda sudah bisa mengisi formulir.' : ''}</div></div>`
          : `${ak.Status_Bayar === 'Ditolak' ? `<div class="callout bahaya" style="margin-bottom:14px">${ic('circle-alert')}<div><b>Bukti ditolak:</b> ${esc(ak.Catatan_Bayar || '-')}. Silakan unggah ulang.</div></div>` : ''}
            ${kartuBayar(b.bayar)}${buktiWidget()}<button class="btn btn-aksen btn-block" style="margin-top:14px" id="btn-bukti" ${Bukti.f && Bukti.f.ok ? '' : 'disabled'}>${ic('send')} Kirim Bukti Pembayaran</button>`}</div>
        <div class="card"><div class="card-title">${ic('file-text')} Formulir Pendaftaran ${p ? `<span style="margin-left:auto" class="badge b-hijau">Terkirim</span>` : ''}</div>
          ${p ? `<div class="kv" style="border:1px solid var(--border);border-radius:12px;overflow:hidden"><div>No. Pendaftaran</div><div class="mono">${esc(p.no)}</div><div>Dikirim</div><div>${tglID(p.waktu, true)}</div>
              <div>Status Berkas</div><div>${badgeStatus(p.berkas)}</div><div>Status Pembayaran</div><div>${badgeStatus(p.bayar)}</div><div>Hasil Seleksi</div><div>${badgeStatus(p.seleksi)}</div></div>
              <button class="btn btn-outline btn-block" style="margin-top:14px" id="btn-pdf">${ic('download')} Unduh Bukti Pendaftaran (PDF)</button>`
          : b.gate.open ? `<p class="muted small">Lengkapi data siswa, alamat, orang tua/wali, data periodik, dan unggah 4 berkas (pas foto, KK, rapor kelas 9, ijazah/SKL).</p>
              ${draft ? `<div class="callout" style="margin-bottom:12px">${ic('cloud-check')}<div class="small">Ada isian tersimpan di perangkat ini (langkah ${draft.step || 1} dari 6).</div></div>` : ''}
              <a class="btn btn-aksen btn-block btn-lg" href="#/formulir">${ic('pencil-line')} ${draft ? 'Lanjutkan Mengisi Formulir' : 'Isi Formulir Sekarang'}</a>`
          : `<div class="callout peringatan">${ic('lock')}<div>${esc(b.gate.reason)}</div></div>`}</div>
        ${p && p.catatan ? `<div class="card" style="border-left:4px solid var(--sekunder)"><div class="card-title">${ic('message-square-text')} Catatan dari Panitia</div><p style="margin:0">${esc(p.catatan)}</p></div>` : ''}
        ${p && p.daftarUlang && p.daftarUlang.length ? `<div class="card"><div class="card-title">${ic('clipboard-check')} Informasi Daftar Ulang</div><div class="kv" style="border-bottom:1px solid var(--border)">${p.daftarUlang.map((k) => `<div>${esc(k.Judul)}</div><div>${esc(k.Isi)}</div>`).join('')}</div></div>` : ''}
      </div>
      <div class="aksi-stack">
        <div class="card"><div class="row-between" style="margin-bottom:10px"><div class="card-title" style="margin:0">${ic('route')} Tahapan Pendaftaran</div><button class="btn btn-ghost btn-sm" id="btn-segar" aria-label="Perbarui">${ic('refresh-cw', 'ic-sm')}</button></div>${trackerSiswa(b)}</div>
        <div class="card"><div class="card-title">${ic('key-round')} Keamanan Akun</div>
          ${ak.Password_Diganti === 'Ya' ? '<p class="small muted">Password sudah diganti.</p>' : `<div class="callout peringatan" style="margin-bottom:12px">${ic('shield-alert')}<div class="small">Anda masih memakai password awal (NISN). Sebaiknya diganti.</div></div>`}
          <button class="btn btn-outline btn-block" id="btn-pw">${ic('key-round', 'ic-sm')} Ganti Password</button></div>
        ${s.kontak_wa ? `<div class="wa-strip"><div><b>Ada pertanyaan?</b></div><a class="btn" href="${waLink(s.kontak_wa, 'Halo Panitia PPDB, saya ' + ak.Nama + ' (' + ak.ID_Akun + ').')}" target="_blank" rel="noopener">${ic('message-circle')} WhatsApp Panitia</a></div>` : ''}
      </div></div></div></div>`;
  $('#btn-keluar').onclick = () => Siswa.keluar('Anda telah keluar.');
  $('#btn-segar').onclick = async (e) => { setBusy(e.currentTarget, true); await Siswa.muat(); renderAkun(el); };
  if (perluBayar) { const kb = $('#kartu-bayar'); ikatBukti(kb, () => { $('#btn-bukti').disabled = !(Bukti.f && Bukti.f.ok); }); $('#btn-bukti').onclick = async (e) => { if (await kirimBukti(e.currentTarget)) renderAkun(el); }; }
  if (p) $('#btn-pdf').onclick = async (e) => { const bt = e.currentTarget; setBusy(bt, true, 'Menyiapkan…'); const r = await apiS('siswaPdf', {}); setBusy(bt, false); r.success ? unduhB64(r.data.b64, r.data.name) : toast('Gagal', r.message, 'error'); };
  $('#btn-pw').onclick = gantiPasswordSiswa;
}
function gantiPasswordSiswa() {
  const m = modal(`<h3>${ic('key-round')} Ganti Password</h3><form id="pw-s" class="stack" novalidate>
    <div class="field"><label for="pw-lama">Password Lama</label><input class="inp" id="pw-lama" type="password" autocomplete="current-password" placeholder="NISN bila belum pernah diganti"></div>
    <div class="field"><label for="pw-baru">Password Baru</label><input class="inp" id="pw-baru" type="password" autocomplete="new-password"><div class="hint">Minimal 6 karakter.</div></div>
    <div class="field" data-f="k2"><label for="pw-k2">Ulangi Password Baru</label><input class="inp" id="pw-k2" type="password" autocomplete="new-password"><div class="errmsg">${ic('circle-alert', 'ic-sm')} <span>Password tidak sama.</span></div></div></form>
    <div class="aksi"><button class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primer" data-ok>Simpan</button></div>`);
  m.querySelector('[data-x]').onclick = () => m.tutup();
  m.querySelector('[data-ok]').onclick = async (e) => {
    const nw = m.querySelector('#pw-baru').value, k2 = m.querySelector('#pw-k2').value;
    m.querySelector('[data-f="k2"]').classList.toggle('err', nw !== k2); if (nw !== k2) return;
    if (nw.length < 6) return toast('Password terlalu pendek', 'Minimal 6 karakter.', 'warning');
    setBusy(e.currentTarget, true);
    const r = await apiS('siswaGantiPassword', { old: m.querySelector('#pw-lama').value, new: nw });
    setBusy(e.currentTarget, false);
    if (!r.success) return toast('Gagal', r.message, 'error');
    Store.set('siswa', { token: r.data.token, exp: r.data.exp });
    Siswa.boot.akun.Password_Diganti = 'Ya'; Siswa.set(Siswa.boot);
    m.tutup(); toast('Password diganti', 'Gunakan password baru saat masuk berikutnya.'); renderAkun($('.page[data-page="akun"]'));
  };
}
registerPage('akun', {
  title: 'Akun Saya', layout: 'fokus',
  async show(el) {
    if (!Siswa.sesi()) { go('masuk'); return; }
    renderAkun(el);                                   // tampil seketika dari cache
    const lama = JSON.stringify(Siswa.boot);
    await Siswa.muat();
    if (currentPage === 'akun' && JSON.stringify(Siswa.boot) !== lama) renderAkun(el);
  }
});

