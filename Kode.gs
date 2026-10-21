/**
 * =====================================================================
 *  PPDB ONLINE SMA TRIGUNA 1956 JAKARTA — BACKEND REST API (Kode.gs)
 * =====================================================================
 *  Arsitektur : Google Apps Script sebagai pure REST API (JSON).
 *               Frontend statis (GitHub Pages) memanggil via fetch().
 *  Pola       : gas-pro-api + gas-instant-ux-pro + gas-migrasi-database
 *
 *  CARA PASANG (ringkas — lihat PANDUAN-INSTALASI.md):
 *   1. Tempel seluruh isi file ini ke editor Apps Script (file "Kode.gs").
 *   2. Jalankan fungsi  setupAwal()  SATU KALI → izinkan akses.
 *   3. Deploy → New deployment → Web app
 *        Execute as: Me   |   Who has access: Anyone
 *   4. Salin URL /exec ke  js/config.js  di frontend.
 *   5. Update berikutnya: Manage deployments → ✏️ Edit → New version
 *      (JANGAN "New deployment" — URL akan berubah).
 *
 *  Login admin awal:  admin / triguna1956  (wajib diganti saat login pertama)
 * =====================================================================
 */

// =====================================================================
// 1. KONFIGURASI
// =====================================================================
const APP_NAME = 'PPDB Online SMA Triguna 1956';
const TZ = 'Asia/Jakarta';
const SLOW_MS = 3000;
const TOKEN_HOURS = 6;
const MAX_LOGIN_FAIL = 5;
const LOCK_MINUTES = 15;
const BACKUP_KEEP = 12;

const CONFIG = {
  get SPREADSHEET_ID() { return prop_('SPREADSHEET_ID'); },
  get ROOT_FOLDER_ID() { return prop_('ROOT_FOLDER_ID'); },
  get BERKAS_FOLDER_ID() { return prop_('BERKAS_FOLDER_ID'); },
  get ASET_FOLDER_ID() { return prop_('ASET_FOLDER_ID'); },
  get EXPORT_FOLDER_ID() { return prop_('EXPORT_FOLDER_ID'); },
  get BACKUP_FOLDER_ID() { return prop_('BACKUP_FOLDER_ID'); }
};

const SH = {
  APPCONFIG: 'AppConfig',
  PENDAFTAR: 'Pendaftar',
  PENGATURAN: 'Pengaturan',
  JADWAL: 'Jadwal',
  KONTEN: 'Konten',
  REFERENSI: 'Referensi',
  LOG: 'Log_Aktivitas',
  AKUN: 'Akun'
};
const SCHEMA_VERSION = '2';

/** Kolom sistem (metadata) di sheet Pendaftar */
const META_FIELDS = [
  'No_Pendaftaran', 'Timestamp', 'Tahun_Ajaran',
  'Status_Berkas', 'Status_Bayar', 'Status_Seleksi',
  'Catatan_Admin', 'Rombel',
  'Folder_ID', 'File_Foto', 'File_KK', 'File_Rapor9', 'File_Ijazah_SKL', 'File_BuktiBayar', 'File_PDF_Formulir',
  'Email_Terkirim', 'Diubah_Oleh', 'Diubah_Pada'
];

/** Kolom data isian pendaftar (urutan mengikuti template Dapodik) */
const DATA_FIELDS = [
  'Nama', 'Jenis_Kelamin', 'NISN', 'Tempat_Lahir', 'Tanggal_Lahir', 'NIK', 'Agama',
  'Alamat', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kode_Pos', 'Jenis_Tinggal', 'Alat_Transportasi',
  'Telepon', 'HP', 'Email',
  'Ayah_Nama', 'Ayah_Tgl_Lahir', 'Ayah_Tempat_Lahir', 'Ayah_Pendidikan', 'Ayah_Pekerjaan', 'Ayah_Penghasilan', 'Ayah_NIK',
  'Ibu_Nama', 'Ibu_Tgl_Lahir', 'Ibu_Tempat_Lahir', 'Ibu_Pendidikan', 'Ibu_Pekerjaan', 'Ibu_Penghasilan', 'Ibu_NIK',
  'Wali_Nama', 'Wali_Tahun_Lahir', 'Wali_Pendidikan', 'Wali_Pekerjaan', 'Wali_Penghasilan', 'Wali_NIK',
  'No_Seri_Ijazah', 'No_Akta_Lahir', 'Sekolah_Asal', 'Anak_Ke', 'No_KK',
  'Berat_Badan', 'Tinggi_Badan', 'Lingkar_Kepala', 'Jml_Saudara', 'Jarak_Rumah'
];

/** Kolom tambahan v2 — selalu DI AKHIR agar sheet lama tetap kompatibel */
const EXTRA_FIELDS = ['ID_Akun', 'WA_Ortu'];
const PENDAFTAR_HEADERS = META_FIELDS.concat(DATA_FIELDS).concat(EXTRA_FIELDS);

/** Akun siswa (dibuat sebelum mengisi formulir). Username = email, password awal = NISN. */
const AKUN_HEADERS = ['ID_Akun', 'Timestamp', 'Tahun_Ajaran', 'Nama', 'Email', 'WA_Siswa', 'WA_Ortu', 'Sekolah_Asal', 'NISN',
  'Password_Hash', 'Salt', 'Password_Diganti', 'Status_Bayar', 'Catatan_Bayar', 'File_BuktiBayar', 'Waktu_Bukti', 'Folder_ID',
  'No_Pendaftaran', 'Diubah_Oleh', 'Diubah_Pada'];
const STATUS_BAYAR_AKUN = ['Belum Bayar', 'Menunggu Konfirmasi', 'Terkonfirmasi', 'Ditolak'];
/** Berkas yang diunggah di formulir (bukti bayar sudah diunggah saat membuat akun) */
const FORM_BERKAS = ['foto', 'kk', 'rapor', 'ijazah'];
const SISWA_TOKEN_DAYS = 7;
const MAX_SLIDES = 10;

const REQUIRED_FIELDS = [
  'Nama', 'Jenis_Kelamin', 'NISN', 'Tempat_Lahir', 'Tanggal_Lahir', 'NIK', 'Agama', 'No_Akta_Lahir', 'No_KK',
  'Anak_Ke', 'Jml_Saudara', 'Alamat', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kode_Pos', 'Jenis_Tinggal',
  'Alat_Transportasi', 'HP', 'Email', 'Jarak_Rumah', 'Ayah_Nama', 'Ayah_NIK', 'Ibu_Nama', 'Ibu_NIK',
  'Sekolah_Asal', 'Berat_Badan', 'Tinggi_Badan'
];

/** Urutan 51 kolom Dapodik (A–AY). '#' = nomor urut otomatis */
const DAPODIK_COLS = [
  '#', 'Nama', 'Jenis_Kelamin', 'NISN', 'Tempat_Lahir', 'Tanggal_Lahir', 'NIK', 'Agama',
  'Alamat', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kode_Pos', 'Jenis_Tinggal', 'Alat_Transportasi',
  'Telepon', 'HP', 'Email',
  'Ayah_Nama', 'Ayah_Tgl_Lahir', 'Ayah_Tempat_Lahir', 'Ayah_Pendidikan', 'Ayah_Pekerjaan', 'Ayah_Penghasilan', 'Ayah_NIK',
  'Ibu_Nama', 'Ibu_Tgl_Lahir', 'Ibu_Tempat_Lahir', 'Ibu_Pendidikan', 'Ibu_Pekerjaan', 'Ibu_Penghasilan', 'Ibu_NIK',
  'Wali_Nama', 'Wali_Tahun_Lahir', 'Wali_Pendidikan', 'Wali_Pekerjaan', 'Wali_Penghasilan', 'Wali_NIK',
  'Rombel', 'No_Seri_Ijazah', 'No_Akta_Lahir', 'Sekolah_Asal', 'Anak_Ke', 'No_KK',
  'Berat_Badan', 'Tinggi_Badan', 'Lingkar_Kepala', 'Jml_Saudara', 'Jarak_Rumah'
];

/** Berkas wajib: jenis → {kolom, nama file, mime yang boleh, batas byte} */
const BERKAS = {
  foto:    { col: 'File_Foto',       label: 'Pas Foto',              file: '01_PasFoto',       mimes: ['image/jpeg', 'image/png'], max: 1 * 1048576 },
  kk:      { col: 'File_KK',         label: 'Scan Kartu Keluarga',   file: '02_KK',            mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2 * 1048576 },
  rapor:   { col: 'File_Rapor9',     label: 'Scan Rapor Kelas 9',    file: '03_Rapor_Kelas9',  mimes: ['application/pdf'], max: 5 * 1048576 },
  ijazah:  { col: 'File_Ijazah_SKL', label: 'Ijazah / SKL',          file: '04_Ijazah_SKL',    mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2 * 1048576 },
  bukti:   { col: 'File_BuktiBayar', label: 'Bukti Pembayaran',      file: '05_BuktiBayar',    mimes: ['application/pdf', 'image/jpeg', 'image/png'], max: 2 * 1048576 }
};

const STATUS = {
  Status_Berkas: ['Menunggu Verifikasi', 'Lengkap', 'Kurang'],
  Status_Bayar: ['Menunggu Konfirmasi', 'Terkonfirmasi', 'Ditolak'],
  Status_Seleksi: ['Dalam Proses', 'Diterima', 'Ditolak']
};

const ASSET_KEYS = {
  logo_utama: 'logo_utama_id',
  logo_yayasan: 'logo_yayasan_id',
  logo_gelap: 'logo_gelap_id',
  favicon: 'favicon_id',
  bg_hero: 'bg_hero_id'
};

/** Nilai awal Pengaturan (dipakai setup & sebagai pembanding saat migrasi) */
const SEED = {
  nama_sekolah: ['SMA Triguna 1956 Jakarta', 'Nama sekolah'],
  nama_yayasan: ['Yayasan Pendidikan Triguna 1956', 'Nama yayasan (kop PDF)'],
  tahun_ajaran: ['2027/2028', 'Tahun ajaran PPDB aktif'],
  status_pendaftaran: ['TUTUP', 'BUKA / TUTUP — buka setelah rekening & jadwal diisi'],
  tanggal_buka: ['', 'Format YYYY-MM-DD (kosong = tanpa batas)'],
  tanggal_tutup: ['', 'Format YYYY-MM-DD (kosong = tanpa batas)'],
  biaya_formulir: ['250000', 'Biaya formulir (angka)'],
  bank_nama: ['Bank ...', 'Nama bank tujuan transfer'],
  bank_norek: ['0000000000', 'Nomor rekening'],
  bank_atas_nama: ['Yayasan Pendidikan Triguna 1956', 'Atas nama rekening'],
  catatan_bayar: ['Cantumkan nama calon siswa pada berita transfer.', 'Catatan pembayaran'],
  kontak_wa: ['081200000000', 'Nomor WhatsApp panitia'],
  kontak_telp: ['(021) 000000', 'Telepon sekolah'],
  kontak_email: ['ppdb@smatriguna1956.sch.id', 'Email panitia'],
  alamat_sekolah: ['Jl. ... , Jakarta', 'Alamat sekolah'],
  maps_embed_url: ['', 'Link Google Maps (Bagikan → Sematkan peta → salin src)'],
  maps_link: ['', 'Link Google Maps biasa (untuk tombol Buka di Maps)'],
  hero_judul: ['Selamat Datang di PPDB Online SMA Triguna 1956 Jakarta', 'Judul besar beranda'],
  hero_subjudul: ['Daftar dari rumah, tanpa antre, tanpa beli formulir di sekolah.', 'Subjudul beranda'],
  ttd_panitia: ['Ketua Panitia PPDB', 'Jabatan penanda tangan di PDF'],
  logo_utama_id: ['', 'ID file logo utama (diisi otomatis)'],
  logo_yayasan_id: ['', 'ID file logo yayasan (diisi otomatis)'],
  logo_gelap_id: ['', 'ID file logo mode gelap (opsional)'],
  favicon_id: ['', 'ID file favicon (diisi otomatis)'],
  bg_hero_id: ['', 'ID file background hero (diisi otomatis)'],
  tema_default: ['IKUTI_PERANGKAT', 'IKUTI_PERANGKAT / TERANG / GELAP'],
  hero_slides: ['', 'ID foto slideshow beranda (diisi otomatis, dipisah koma)'],
  slide_interval: ['6', 'Jeda pergantian foto slideshow (detik)'],
  formulir_setelah: ['UPLOAD', 'UPLOAD = formulir terbuka setelah bukti bayar diunggah; KONFIRMASI = setelah dikonfirmasi panitia'],
  admin_username: ['admin', 'Username admin'],
  admin_password_hash: ['', 'Hash password (jangan diedit manual)'],
  admin_salt: ['', 'Salt password (jangan diedit manual)'],
  admin_password_default: ['1', '1 = masih password bawaan']
};
const DEFAULT_PASSWORD = 'triguna1956';
const PRIVATE_SETTINGS = ['admin_password_hash', 'admin_salt'];

/** Logo bawaan untuk kop PDF (JPEG 120px, base64) — dipakai bila admin belum unggah logo */
const DEFAULT_LOGO_B64 = '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';

// =====================================================================
// 2. ENTRY POINTS
// =====================================================================
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.ping !== undefined) return json_({ success: true, pong: Date.now() });   // warm-up
  if (p.action === 'publicBoot') return json_(run_({ action: 'publicBoot' }));
  return json_({ success: true, app: APP_NAME, message: 'API aktif. Gunakan POST.' });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_(fail('Format permintaan tidak valid.')); }
  return json_(run_(body));
}

function run_(body) {
  const t0 = Date.now();
  let res;
  try { res = dispatch_(body); }
  catch (err) { res = fail(err && err.message ? err.message : String(err)); }
  res.ms = Date.now() - t0;
  if (res.ms > SLOW_MS) queueLog(['SLOW', '', (body.action || '?') + ' ' + res.ms + 'ms']);
  return res;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function ok(data, extra) { return Object.assign({ success: true, data: data === undefined ? null : data }, extra || {}); }
function fail(message, data) { return { success: false, message: message, data: data || null }; }

// =====================================================================
// 3. ROUTER — auth → idempotensi → lock → fungsi → notifikasi di luar lock
// =====================================================================
const ROUTES = {
  // Publik
  ping:          { fn: function () { return ok({ t: Date.now() }); } },
  publicBoot:    { fn: apiPublicBoot },
  akunDaftar:    { fn: apiAkunDaftar, write: true, lock: false },
  loginSiswa:    { fn: apiLoginSiswa },
  // Siswa (login)
  siswaBoot:     { fn: apiSiswaBoot, siswa: true },
  siswaPdf:      { fn: apiSiswaPdf, siswa: true },
  akunUploadBukti: { fn: apiAkunUploadBukti, siswa: true, write: true, lock: false },
  siswaGantiPassword: { fn: apiSiswaGantiPassword, siswa: true, write: true },
  regInit:       { fn: apiRegInit, siswa: true, write: true, lock: false },
  regUpload:     { fn: apiRegUpload, siswa: true, write: true, lock: false },
  regFinalize:   { fn: apiRegFinalize, siswa: true, write: true, lock: false },
  cekStatus:     { fn: apiCekStatus },
  getPdf:        { fn: apiGetPdf },
  login:         { fn: apiLogin },
  // Admin — baca
  adminBoot:     { fn: apiAdminBoot, admin: true },
  getDetail:     { fn: apiGetDetail, admin: true },
  getFile:       { fn: apiGetFile, admin: true },
  getLogs:       { fn: apiGetLogs, admin: true },
  exportDapodik: { fn: apiExportDapodik, admin: true },
  listBackups:   { fn: apiListBackups, admin: true },
  importScan:    { fn: function (ctx, d) { return apiImport(ctx, d, true); }, admin: true },
  getBuktiAkun:  { fn: apiGetBuktiAkun, admin: true },
  setBayarAkun:  { fn: apiSetBayarAkun, admin: true, write: true },
  resetPasswordSiswa: { fn: apiResetPasswordSiswa, admin: true, write: true },
  uploadSlide:   { fn: apiUploadSlide, admin: true, write: true, lock: false },
  deleteSlide:   { fn: apiDeleteSlide, admin: true, write: true },
  orderSlides:   { fn: apiOrderSlides, admin: true, write: true },
  // Admin — tulis
  setStatus:     { fn: apiSetStatus, admin: true, write: true },
  saveRombel:    { fn: apiSaveRombel, admin: true, write: true },
  saveCatatan:   { fn: apiSaveCatatan, admin: true, write: true },
  editData:      { fn: apiEditData, admin: true, write: true },
  resendEmail:   { fn: apiResendEmail, admin: true, write: true, lock: false },
  saveSettings:  { fn: apiSaveSettings, admin: true, write: true },
  saveJadwal:    { fn: apiSaveJadwal, admin: true, write: true },
  saveKonten:    { fn: apiSaveKonten, admin: true, write: true },
  uploadAsset:   { fn: apiUploadAsset, admin: true, write: true, lock: false },
  resetAsset:    { fn: apiResetAsset, admin: true, write: true },
  changePassword:{ fn: apiChangePassword, admin: true, write: true },
  backupNow:     { fn: apiBackupNow, admin: true, write: true, lock: false },
  installTriggers:{ fn: apiInstallTriggers, admin: true, write: true, lock: false },
  importRun:     { fn: function (ctx, d) { return apiImport(ctx, d, false); }, admin: true, write: true, lock: false }
};

function dispatch_(body) {
  const r = ROUTES[body.action];
  if (!r) return fail('Aksi tidak dikenal: ' + body.action);
  if (!CONFIG.SPREADSHEET_ID) return fail('Server belum di-setup. Jalankan setupAwal() di editor Apps Script.');
  ensureSchema_();
  const ctx = { session: verifyToken(body.token), reqId: String(body.reqId || ''), after: [] };
  if (r.admin && !(ctx.session && ctx.session.role === 'admin')) {
    return fail('Sesi berakhir. Silakan login kembali.', { code: 'AUTH' });
  }
  if (r.siswa && !(ctx.session && ctx.session.role === 'siswa')) {
    return fail('Sesi berakhir. Silakan masuk kembali dengan email & password Anda.', { code: 'AUTH' });
  }
  const data = body.data || {};
  if (!r.write) return r.fn(ctx, data);

  const c = CacheService.getScriptCache();
  const k = ctx.reqId ? 'idem_' + ctx.reqId : '';
  const exec = function () {
    const hit = k && c.get(k);
    if (hit) return JSON.parse(hit);                       // permintaan ulang → hasil sama
    const out = r.fn(ctx, data);
    if (k && out.success) { const s = JSON.stringify(out); if (s.length < 90000) c.put(k, s, 21600); }
    return out;
  };
  const res = r.lock === false ? exec() : withLock_(exec);
  ctx.after.forEach(function (fn) { try { fn(); } catch (e) { Logger.log(e); } });   // email dll. di luar lock
  return res;
}

let _IN_LOCK = false;
let _PENDING_LOGS = [];
function withLock_(fn) {
  if (_IN_LOCK) return fn();                                  // sudah memegang lock (panggilan bertingkat)
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Server sedang sibuk. Coba lagi beberapa detik lagi.');
  _IN_LOCK = true;
  try { return fn(); }
  finally {
    _IN_LOCK = false;
    lock.releaseLock();
    const p = _PENDING_LOGS; _PENDING_LOGS = [];
    p.forEach(function (row) { queueLog(row); });             // log ditulis setelah lock dilepas
  }
}

// =====================================================================
// 4. UTILITAS SHEETS, CACHE, PROPERTIES
// =====================================================================
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }

let _SS = null;
function ss_() { return _SS || (_SS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)); }
function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemukan.');
  return sh;
}

const _ROWS = {};
/** Baca sheet → array objek (memo per eksekusi). Baris kosong dibuang. */
function readSheet(name) {
  if (_ROWS[name]) return _ROWS[name];
  const v = sheet_(name).getDataRange().getValues();
  const h = v[0].map(String);
  const rows = [];
  for (let i = 1; i < v.length; i++) {
    if (v[i].join('') === '') continue;
    const o = { _row: i + 1 };
    h.forEach(function (k, j) { if (k) o[k] = v[i][j]; });
    rows.push(o);
  }
  return (_ROWS[name] = rows);
}
function invalidateRows(name) { delete _ROWS[name]; }

/** Tambah banyak objek sekaligus (1× setValues) */
function appendObjects_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name);
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const rows = objs.map(function (o) { return h.map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, h.length).setValues(rows);
  invalidateRows(name);
}

/** Ubah 1 baris berdasar kunci (1× setValues untuk baris itu) */
function updateByKey_(name, keyCol, key, patch) {
  const sh = sheet_(name);
  const v = sh.getDataRange().getValues();
  const h = v[0].map(String);
  const ki = h.indexOf(keyCol);
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ki]) === String(key)) {
      Object.keys(patch).forEach(function (k) { const c = h.indexOf(k); if (c > -1) v[i][c] = patch[k]; });
      sh.getRange(i + 1, 1, 1, h.length).setValues([v[i]]);
      invalidateRows(name);
      return true;
    }
  }
  return false;
}

/** Tulis ulang seluruh isi sheet (header tetap) */
function rewriteSheet_(name, objs) {
  const sh = sheet_(name);
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, h.length).clearContent();
  if (objs.length) {
    sh.getRange(2, 1, objs.length, h.length).setValues(objs.map(function (o) {
      return h.map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; });
    }));
  }
  invalidateRows(name);
}

/** Cache dengan pemecahan otomatis untuk nilai > 50 KB */
const CacheX = {
  SZ: 50000,
  c: function () { return CacheService.getScriptCache(); },
  get: function (key) {
    const c = this.c(), head = c.get(key);
    if (head == null) return null;
    if (head.indexOf('__chunks:') !== 0) return JSON.parse(head);
    const n = +head.slice(9), keys = [];
    for (let i = 0; i < n; i++) keys.push(key + '#' + i);
    const parts = c.getAll(keys); let s = '';
    for (let i = 0; i < n; i++) { if (parts[keys[i]] == null) return null; s += parts[keys[i]]; }
    return JSON.parse(s);
  },
  put: function (key, val, ttl) {
    const s = JSON.stringify(val), c = this.c();
    try {
      if (s.length <= this.SZ) return c.put(key, s, ttl);
      const n = Math.ceil(s.length / this.SZ); if (n > 20) return;
      const m = {}; for (let i = 0; i < n; i++) m[key + '#' + i] = s.substr(i * this.SZ, this.SZ);
      c.putAll(m, ttl); c.put(key, '__chunks:' + n, ttl);
    } catch (e) { /* cache opsional */ }
  },
  del: function (key) { try { this.c().remove(key); } catch (e) {} }
};
function ver(scope) {
  const c = CacheService.getScriptCache(), k = 'ver_' + scope;
  let v = c.get(k); if (!v) { v = String(Date.now()); c.put(k, v, 21600); }
  return v;
}
function bump(scope) { CacheService.getScriptCache().put('ver_' + scope, Date.now() + '.' + Math.random().toString(36).slice(2, 8), 21600); }   // selalu unik
function cached(key, ttl, build) { const v = CacheX.get(key); if (v !== null) return v; const d = build(); CacheX.put(key, d, ttl); return d; }

// ---- format nilai ----
function fmtDate_(d, pattern) { return Utilities.formatDate(d, TZ, pattern || 'yyyy-MM-dd'); }
function str_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : fmtDate_(v);
  return String(v).trim();
}
function iso_(v) {
  if (!v) return '';
  const d = Object.prototype.toString.call(v) === '[object Date]' ? v : new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function digits_(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }
/** Kembalikan angka 0 di depan yang hilang (mis. NIK 16 digit yang dibaca sebagai angka) */
function padDigits_(v, len) { const d = digits_(v); return d && d.length < len ? ('0000000000000000' + d).slice(-len) : d; }
/** Normalisasi nomor HP/WA → diawali 0 */
function waOf(v) {
  let d = digits_(v);
  if (!d) return '';
  if (d.indexOf('62') === 0) d = '0' + d.slice(2);
  else if (d.charAt(0) === '8') d = '0' + d;
  return d;
}
function esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function rupiah_(n) { return 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function maskEmail_(e) {
  const p = String(e).split('@'); if (p.length !== 2) return e;
  return p[0].slice(0, 2) + '***@' + p[1];
}
function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// =====================================================================
// 5. PENGATURAN, KONTEN, ASET
// =====================================================================
function getSettings_() {
  return cached('set_' + ver('global'), 3600, function () {
    const o = {};
    readSheet(SH.PENGATURAN).forEach(function (r) { o[String(r.Kunci)] = str_(r.Nilai); });
    Object.keys(SEED).forEach(function (k) { if (o[k] === undefined) o[k] = SEED[k][0]; });
    return o;
  });
}
function setSettings_(patch) {
  const sh = sheet_(SH.PENGATURAN);
  const v = sh.getDataRange().getValues();
  const idx = {};
  for (let i = 1; i < v.length; i++) idx[String(v[i][0])] = i;
  const add = [];
  Object.keys(patch).forEach(function (k) {
    if (idx[k] !== undefined) v[idx[k]][1] = patch[k];
    else add.push([k, patch[k], SEED[k] ? SEED[k][1] : '']);
  });
  sh.getRange(1, 1, v.length, 3).setValues(v.map(function (r) { return [r[0], r[1], r[2]]; }));
  if (add.length) sh.getRange(v.length + 1, 1, add.length, 3).setValues(add);
  invalidateRows(SH.PENGATURAN);
  bump('global');
}
function assetUrl_(id, w) { return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 600) : ''; }
function referensi_() {
  const o = {};
  readSheet(SH.REFERENSI).forEach(function (r) {
    const j = str_(r.Jenis); if (!j) return;
    (o[j] = o[j] || []).push(str_(r.Nilai));
  });
  return o;
}
function isOpen_(s) {
  if (String(s.status_pendaftaran).toUpperCase() !== 'BUKA') return { open: false, reason: 'Pendaftaran sedang ditutup.' };
  const today = fmtDate_(new Date());
  if (s.tanggal_buka && today < s.tanggal_buka) return { open: false, reason: 'Pendaftaran belum dibuka. Dibuka mulai ' + s.tanggal_buka + '.' };
  if (s.tanggal_tutup && today > s.tanggal_tutup) return { open: false, reason: 'Pendaftaran sudah ditutup pada ' + s.tanggal_tutup + '.' };
  return { open: true, reason: '' };
}
function publicSettings_(s) {
  const out = {};
  Object.keys(s).forEach(function (k) {
    if (k.indexOf('admin_') === 0) return;
    out[k] = s[k];
  });
  return out;
}
function assets_(s) {
  return {
    logo_utama: assetUrl_(s.logo_utama_id, 400),
    logo_yayasan: assetUrl_(s.logo_yayasan_id, 400),
    logo_gelap: assetUrl_(s.logo_gelap_id, 400),
    favicon: assetUrl_(s.favicon_id, 128),
    bg_hero: assetUrl_(s.bg_hero_id, 1920),
    slides: slideIds_(s).map(function (id) { return { id: id, url: assetUrl_(id, 1920) }; })
  };
}
function jadwal_() {
  return readSheet(SH.JADWAL).map(function (r) {
    return { Urutan: Number(r.Urutan) || 0, Kegiatan: str_(r.Kegiatan), Tanggal_Mulai: str_(r.Tanggal_Mulai), Tanggal_Selesai: str_(r.Tanggal_Selesai), Keterangan: str_(r.Keterangan) };
  }).sort(function (a, b) { return a.Urutan - b.Urutan; });
}
function konten_() {
  return readSheet(SH.KONTEN).map(function (r) {
    return { Bagian: str_(r.Bagian), Urutan: Number(r.Urutan) || 0, Judul: str_(r.Judul), Isi: str_(r.Isi) };
  }).sort(function (a, b) { return a.Bagian === b.Bagian ? a.Urutan - b.Urutan : (a.Bagian < b.Bagian ? -1 : 1); });
}

function apiPublicBoot() {
  return ok(cached('pub_' + ver('global'), 1800, function () {
    const s = getSettings_();
    return {
      settings: publicSettings_(s),
      assets: assets_(s),
      status: isOpen_(s),
      jadwal: jadwal_(),
      konten: konten_(),
      referensi: referensi_(),
      v: ver('global')
    };
  }));
}

// =====================================================================
// 6. PENDAFTARAN (3 tahap: init → upload ×5 → finalize)
// =====================================================================
function cleanForm_(d) {
  const o = {};
  DATA_FIELDS.forEach(function (k) { o[k] = str_(d[k]).slice(0, 300); });
  ['NISN'].forEach(function (k) { o[k] = digits_(o[k]); });
  ['NIK', 'No_KK', 'Ayah_NIK', 'Ibu_NIK', 'Wali_NIK'].forEach(function (k) { o[k] = digits_(o[k]); });
  ['RT', 'RW', 'Kode_Pos', 'Anak_Ke', 'Jml_Saudara'].forEach(function (k) { o[k] = digits_(o[k]); });
  ['Berat_Badan', 'Tinggi_Badan', 'Lingkar_Kepala', 'Jarak_Rumah'].forEach(function (k) { o[k] = o[k].replace(',', '.').replace(/[^\d.]/g, ''); });
  o.HP = waOf(o.HP);
  o.Telepon = o.Telepon.replace(/[^\d()+\- ]/g, '');
  o.Email = o.Email.toLowerCase();
  o.Nama = o.Nama.toUpperCase();
  o.Jenis_Kelamin = o.Jenis_Kelamin === 'P' ? 'P' : (o.Jenis_Kelamin === 'L' ? 'L' : '');
  return o;
}

function validateForm_(o) {
  const err = {};
  REQUIRED_FIELDS.forEach(function (k) { if (!o[k]) err[k] = 'Wajib diisi.'; });
  if (o.NISN && !/^\d{10}$/.test(o.NISN)) err.NISN = 'NISN harus 10 digit angka.';
  ['NIK', 'No_KK', 'Ayah_NIK', 'Ibu_NIK'].forEach(function (k) { if (o[k] && !/^\d{16}$/.test(o[k])) err[k] = 'Harus 16 digit angka.'; });
  if (o.Wali_NIK && !/^\d{16}$/.test(o.Wali_NIK)) err.Wali_NIK = 'Harus 16 digit angka.';
  if (o.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.Email)) err.Email = 'Format email tidak valid.';
  if (o.HP && !/^0\d{9,13}$/.test(o.HP)) err.HP = 'Nomor HP diawali 08, 10–14 digit.';
  if (o.Tanggal_Lahir) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.Tanggal_Lahir)) err.Tanggal_Lahir = 'Format tanggal tidak valid.';
    else {
      const age = (Date.now() - new Date(o.Tanggal_Lahir + 'T00:00:00').getTime()) / (365.25 * 864e5);
      if (age < 13 || age > 19) err.Tanggal_Lahir = 'Usia calon siswa harus 13–19 tahun.';
    }
  }
  if (o.Jenis_Kelamin === '' && !err.Jenis_Kelamin) err.Jenis_Kelamin = 'Pilih jenis kelamin.';
  return err;
}

function findDuplicate_(o, ta) {
  const rows = readSheet(SH.PENDAFTAR);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (str_(r.Tahun_Ajaran) !== ta) continue;
    if ((o.NISN && padDigits_(r.NISN, 10) === o.NISN) || (o.NIK && padDigits_(r.NIK, 16) === o.NIK)) return str_(r.No_Pendaftaran);
  }
  return '';
}

function taFolder_(ta) {
  const root = DriveApp.getFolderById(CONFIG.BERKAS_FOLDER_ID);
  const name = String(ta).replace('/', '-');
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

function apiRegInit(ctx, d) {
  const s = getSettings_();
  const st = isOpen_(s);
  if (!st.open) return fail(st.reason, { code: 'CLOSED' });
  const akun = findAkun_(ctx.session.user);
  if (!akun) return fail('Akun tidak ditemukan. Silakan masuk kembali.', { code: 'AUTH' });
  if (str_(akun.No_Pendaftaran)) return fail('Formulir sudah pernah dikirim dengan nomor ' + str_(akun.No_Pendaftaran) + '.', { code: 'DONE', no: str_(akun.No_Pendaftaran) });
  const gate = formulirGate_(akun, s);
  if (!gate.open) return fail(gate.reason, { code: 'LOCKED' });
  const o = cleanForm_(Object.assign({}, d.form || {}, { NISN: str_(akun.NISN) }));   // NISN dikunci sesuai akun
  const err = validateForm_(o);
  if (Object.keys(err).length) return fail('Periksa kembali isian yang ditandai.', { code: 'INVALID', errors: err });
  const dup = findDuplicate_(o, s.tahun_ajaran);
  if (dup) return fail('Data sudah terdaftar dengan nomor ' + dup + '.', { code: 'DUPLICATE', no: dup });

  const key = Utilities.getUuid().replace(/-/g, '');
  let folderId = str_(akun.Folder_ID);
  try { DriveApp.getFolderById(folderId); } catch (e) { folderId = taFolder_(s.tahun_ajaran).createFolder('_proses_' + key).getId(); }
  CacheX.put('reg_' + key, { form: o, folder: folderId, ta: str_(akun.Tahun_Ajaran) || s.tahun_ajaran, akun: str_(akun.ID_Akun), t: Date.now() }, 21600);
  return ok({ key: key });
}

function apiRegUpload(ctx, d) {
  const key = String(d.key || '');
  const reg = CacheX.get('reg_' + key);
  if (!reg) return fail('Sesi pendaftaran kedaluwarsa. Silakan kirim ulang formulir.', { code: 'EXPIRED' });
  if (reg.akun !== ctx.session.user) return fail('Sesi tidak cocok dengan akun.', { code: 'AUTH' });
  const j = FORM_BERKAS.indexOf(d.jenis) > -1 ? BERKAS[d.jenis] : null;
  if (!j) return fail('Jenis berkas tidak dikenal.');
  const mime = String(d.mime || '');
  if (j.mimes.indexOf(mime) === -1) return fail(j.label + ': format tidak didukung.');
  const bytes = Utilities.base64Decode(String(d.b64 || ''));
  if (!bytes.length) return fail(j.label + ': berkas kosong.');
  if (bytes.length > j.max) return fail(j.label + ': ukuran melebihi ' + Math.round(j.max / 1048576) + ' MB.');
  const ext = mime === 'application/pdf' ? '.pdf' : (mime === 'image/png' ? '.png' : '.jpg');
  const folder = DriveApp.getFolderById(reg.folder);
  const old = CacheService.getScriptCache().get('regf_' + key + '_' + d.jenis);
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  const file = folder.createFile(Utilities.newBlob(bytes, mime, j.file + ext));
  CacheService.getScriptCache().put('regf_' + key + '_' + d.jenis, file.getId(), 21600);
  return ok({ jenis: d.jenis, id: file.getId(), size: bytes.length });
}

function nextNumber_(ta) {
  const prefix = 'PPDB-' + String(ta).slice(0, 4) + '-';
  let max = 0;
  readSheet(SH.PENDAFTAR).forEach(function (r) {
    const n = str_(r.No_Pendaftaran);
    if (n.indexOf(prefix) === 0) max = Math.max(max, Number(n.slice(prefix.length)) || 0);
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

function apiRegFinalize(ctx, d) {
  const key = String(d.key || '');
  const done = CacheX.get('regdone_' + key);
  if (done) {                                                 // retry setelah koneksi putus → hasil yang sama
    const rr = findRow_(done.no);
    return ok(Object.assign({}, done, { pdf: rr ? pdfPayload_(rr).b64 : '' }));
  }
  const reg = CacheX.get('reg_' + key);
  if (!reg) return fail('Sesi pendaftaran kedaluwarsa. Silakan kirim ulang formulir.', { code: 'EXPIRED' });
  if (reg.akun !== ctx.session.user) return fail('Sesi tidak cocok dengan akun.', { code: 'AUTH' });
  const akun = findAkun_(reg.akun);
  if (!akun) return fail('Akun tidak ditemukan.', { code: 'AUTH' });
  const c = CacheService.getScriptCache();
  const files = { File_BuktiBayar: str_(akun.File_BuktiBayar) };
  const missing = [];
  FORM_BERKAS.forEach(function (j) {
    const id = c.get('regf_' + key + '_' + j);
    if (id) files[BERKAS[j].col] = id; else missing.push(BERKAS[j].label);
  });
  if (missing.length) return fail('Berkas belum lengkap: ' + missing.join(', ') + '.', { code: 'FILES' });

  const o = reg.form;
  // Bagian terkunci sesingkat mungkin: cek ganda + nomor + tulis baris
  const no = withLock_(function () {
    invalidateRows(SH.PENDAFTAR); invalidateRows(SH.AKUN);
    const ak = findAkun_(reg.akun);
    if (str_(ak.No_Pendaftaran)) throw new Error('Formulir sudah pernah dikirim dengan nomor ' + str_(ak.No_Pendaftaran) + '.');
    const dup = findDuplicate_(o, reg.ta);
    if (dup) throw new Error('Data sudah terdaftar dengan nomor ' + dup + '.');
    const n = nextNumber_(reg.ta);
    const sb = str_(ak.Status_Bayar);
    const row = Object.assign({}, o, files, {
      No_Pendaftaran: n, Timestamp: new Date(), Tahun_Ajaran: reg.ta,
      Status_Berkas: 'Menunggu Verifikasi', Status_Bayar: sb === 'Terkonfirmasi' || sb === 'Ditolak' ? sb : 'Menunggu Konfirmasi', Status_Seleksi: 'Dalam Proses',
      Catatan_Admin: '', Rombel: '', Folder_ID: reg.folder, File_PDF_Formulir: '', Email_Terkirim: 'Belum',
      Diubah_Oleh: 'pendaftar', Diubah_Pada: new Date(), ID_Akun: reg.akun, WA_Ortu: str_(ak.WA_Ortu)
    });
    appendObjects_(SH.PENDAFTAR, [row]);
    updateByKey_(SH.AKUN, 'ID_Akun', reg.akun, { No_Pendaftaran: n, Diubah_Pada: new Date() });
    bump('data');
    return n;
  });

  // Di luar lock: rapikan folder, buat PDF, kirim email
  try { DriveApp.getFolderById(reg.folder).setName(no + ' - ' + o.Nama); } catch (e) {}
  const row = findRow_(no);
  const pdf = buildPdf_(row);
  const pdfFile = DriveApp.getFolderById(reg.folder).createFile(pdf);
  const mail = sendConfirmation_(row, pdf);
  withLock_(function () {
    updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', no, { File_PDF_Formulir: pdfFile.getId(), Email_Terkirim: mail.ok ? 'Ya' : 'Gagal' });
    bump('data');
  });
  queueLog(['DAFTAR', no, o.Nama + (mail.ok ? '' : ' | email gagal: ' + mail.error)]);
  CacheX.del('reg_' + key);
  FORM_BERKAS.forEach(function (j) { c.remove('regf_' + key + '_' + j); });

  const result = {
    no: no, nama: o.Nama, nisn: o.NISN, sekolah: o.Sekolah_Asal, waktu: new Date().toISOString(),
    email: maskEmail_(o.Email), emailOk: mail.ok, pdfName: 'Bukti_Pendaftaran_' + no + '.pdf'
  };
  CacheX.put('regdone_' + key, result, 21600);
  return ok(Object.assign({ pdf: Utilities.base64Encode(pdf.getBytes()) }, result));
}

function findRow_(no) {
  const rows = readSheet(SH.PENDAFTAR);
  for (let i = 0; i < rows.length; i++) if (str_(rows[i].No_Pendaftaran) === String(no).trim().toUpperCase()) return rows[i];
  return null;
}

// =====================================================================
// 7. CEK STATUS (publik) — nomor + tanggal lahir, dibatasi percobaan
// =====================================================================
function checkOwner_(d) {
  const no = String(d.no || '').trim().toUpperCase();
  const c = CacheService.getScriptCache();
  const fk = 'cs_fail_' + no;
  const fails = Number(c.get(fk) || 0);
  if (fails >= 10) return { error: fail('Terlalu banyak percobaan. Coba lagi 15 menit lagi.') };
  const r = findRow_(no);
  if (!r || str_(r.Tanggal_Lahir) !== String(d.tgl || '').trim()) {
    c.put(fk, String(fails + 1), LOCK_MINUTES * 60);
    return { error: fail('Data tidak ditemukan. Periksa kembali nomor dan tanggal lahir.', { code: 'NOT_FOUND' }) };
  }
  return { row: r };
}

function apiCekStatus(ctx, d) {
  const chk = checkOwner_(d);
  if (chk.error) return chk.error;
  const r = chk.row;
  let foto = '';
  try { if (r.File_Foto) { const b = DriveApp.getFileById(r.File_Foto).getBlob(); foto = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } } catch (e) {}
  const out = {
    no: str_(r.No_Pendaftaran), nama: str_(r.Nama), sekolah: str_(r.Sekolah_Asal), nisn: str_(r.NISN),
    waktu: iso_(r.Timestamp), foto: foto,
    berkas: str_(r.Status_Berkas), bayar: str_(r.Status_Bayar), seleksi: str_(r.Status_Seleksi),
    catatan: str_(r.Catatan_Admin), rombel: str_(r.Rombel), hasPdf: !!r.File_PDF_Formulir
  };
  if (out.seleksi === 'Diterima') out.daftarUlang = konten_().filter(function (k) { return k.Bagian === 'Daftar Ulang'; });
  return ok(out);
}

function apiGetPdf(ctx, d) {
  const chk = checkOwner_(d);
  if (chk.error) return chk.error;
  return ok(pdfPayload_(chk.row));
}

function pdfPayload_(r) {
  let blob;
  if (r.File_PDF_Formulir) { try { blob = DriveApp.getFileById(r.File_PDF_Formulir).getBlob(); } catch (e) {} }
  if (!blob) blob = buildPdf_(r);
  return { b64: Utilities.base64Encode(blob.getBytes()), name: 'Bukti_Pendaftaran_' + str_(r.No_Pendaftaran) + '.pdf' };
}

// =====================================================================
// 8. PDF FORMULIR & EMAIL (selalu Mode Terang)
// =====================================================================
function imgData_(fileId, fallbackB64) {
  if (fileId) {
    try { const b = DriveApp.getFileById(fileId).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) {}
  }
  return fallbackB64 ? 'data:image/jpeg;base64,' + fallbackB64 : '';
}

function buildPdf_(r) {
  const s = getSettings_();
  const logoL = imgData_(s.logo_yayasan_id || s.logo_utama_id, DEFAULT_LOGO_B64);
  const logoR = imgData_(s.logo_utama_id, DEFAULT_LOGO_B64);
  const foto = imgData_(r.File_Foto, '');
  const v = function (k) { return esc_(str_(r[k]) || '-'); };
  const rowsHtml = function (pairs) {
    return pairs.map(function (p) {
      return '<tr><td class="l">' + p[0] + '</td><td class="c">:</td><td>' + p[1] + '</td></tr>';
    }).join('');
  };
  const sec = function (t, pairs) { return '<div class="sec">' + t + '</div><table class="kv">' + rowsHtml(pairs) + '</table>'; };
  const ortu = function (p, label) {
    return [[label + ' — Nama', v(p + '_Nama')], ['NIK', v(p + '_NIK')], ['Tempat, Tgl Lahir', v(p + '_Tempat_Lahir') + ', ' + v(p + '_Tgl_Lahir')],
      ['Pendidikan / Pekerjaan', v(p + '_Pendidikan') + ' / ' + v(p + '_Pekerjaan')], ['Penghasilan', v(p + '_Penghasilan')]];
  };
  const berkasRows = Object.keys(BERKAS).map(function (j, i) {
    const okF = !!r[BERKAS[j].col];
    return '<tr><td style="width:24px">' + (i + 1) + '</td><td>' + BERKAS[j].label + '</td><td style="width:110px;color:' + (okF ? '#15803D' : '#B5123E') + ';font-weight:bold">' + (okF ? 'Terunggah' : 'Belum ada') + '</td></tr>';
  }).join('');
  const tgl = r.Timestamp ? fmtDate_(new Date(r.Timestamp), 'dd MMMM yyyy, HH:mm') + ' WIB' : '-';

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#0F1E33;margin:0}table{font-size:10.5px;border-collapse:collapse}' +
    '.kop{width:100%;border-bottom:3px solid #004A87;padding-bottom:6px}.kop td{vertical-align:middle}' +
    '.kop .t1{font-size:11px;font-weight:bold;letter-spacing:.5px}.kop .t2{font-size:17px;font-weight:bold;color:#004A87}.kop .t3{font-size:9.5px;color:#5B6B80}' +
    '.thin{border-top:1px solid #0096D6;margin-top:2px}' +
    '.title{background:#004A87;color:#fff;text-align:center;font-weight:bold;font-size:12px;padding:7px;margin:10px 0 8px}' +
    '.meta td{font-size:11px;padding:2px 0}.no{font-family:Courier New,monospace;font-size:15px;font-weight:bold;color:#004A87;border:1.5px solid #F2C200;padding:4px 8px}' +
    '.sec{background:#E6F5FC;color:#004A87;font-weight:bold;padding:4px 6px;margin-top:8px;font-size:11px}' +
    '.kv{width:100%;border-collapse:collapse}.kv td{padding:1.5px 4px;border-bottom:1px solid #DCE5EF;vertical-align:top}.kv .l{width:34%;color:#5B6B80}.kv .c{width:8px}' +
    '.bk{width:100%;border-collapse:collapse;margin-top:2px}.bk td{border:1px solid #DCE5EF;padding:3px 5px}' +
    '.foto{width:90px;height:120px;border:1px solid #DCE5EF;text-align:center;color:#8A97A8;font-size:9px}' +
    '.ttd{width:100%;margin-top:14px}.ttd td{text-align:center;width:50%;font-size:10.5px}' +
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97A8;text-align:center;border-top:1px solid #DCE5EF;padding-top:4px}' +
    '</style></head><body>' +
    '<table class="kop"><tr>' +
    '<td style="width:70px">' + (logoL ? '<img src="' + logoL + '" width="62" height="62">' : '') + '</td>' +
    '<td style="text-align:center"><div class="t1">' + esc_(s.nama_yayasan).toUpperCase() + '</div><div class="t2">' + esc_(s.nama_sekolah).toUpperCase() + '</div>' +
    '<div class="t3">' + esc_(s.alamat_sekolah) + '<br>Telp. ' + esc_(s.kontak_telp) + ' · WA ' + esc_(s.kontak_wa) + ' · ' + esc_(s.kontak_email) + '</div></td>' +
    '<td style="width:70px;text-align:right">' + (logoR ? '<img src="' + logoR + '" width="62" height="62">' : '') + '</td>' +
    '</tr></table><div class="thin"></div>' +
    '<div class="title">BUKTI PENDAFTARAN PESERTA DIDIK BARU (PPDB) — TAHUN AJARAN ' + esc_(r.Tahun_Ajaran) + '</div>' +
    '<table style="width:100%"><tr><td style="vertical-align:top"><table class="meta">' +
    '<tr><td style="width:120px">No. Pendaftaran</td><td><span class="no">' + v('No_Pendaftaran') + '</span></td></tr>' +
    '<tr><td>Tanggal Daftar</td><td>' + tgl + '</td></tr>' +
    '<tr><td>Status Awal</td><td>Berkas: ' + v('Status_Berkas') + ' · Pembayaran: ' + v('Status_Bayar') + '</td></tr>' +
    '</table></td><td style="width:96px;text-align:right">' +
    (foto ? '<img src="' + foto + '" width="90" height="120" style="border:1px solid #DCE5EF">' : '<table class="foto"><tr><td>Pas Foto 3×4</td></tr></table>') +
    '</td></tr></table>' +
    sec('A. DATA CALON SISWA', [['Nama Lengkap', '<b>' + v('Nama') + '</b>'], ['Jenis Kelamin', str_(r.Jenis_Kelamin) === 'P' ? 'Perempuan' : 'Laki-laki'],
      ['NISN / NIK', v('NISN') + ' / ' + v('NIK')], ['Tempat, Tanggal Lahir', v('Tempat_Lahir') + ', ' + v('Tanggal_Lahir')], ['Agama', v('Agama')],
      ['No. Registrasi Akta Lahir', v('No_Akta_Lahir')], ['No. Kartu Keluarga', v('No_KK')], ['Anak ke- / Jml. Saudara Kandung', v('Anak_Ke') + ' / ' + v('Jml_Saudara')]]) +
    sec('B. ALAMAT & KONTAK', [['Alamat', v('Alamat') + ' RT ' + v('RT') + ' / RW ' + v('RW')], ['Dusun / Kelurahan', v('Dusun') + ' / ' + v('Kelurahan')],
      ['Kecamatan / Kode Pos', v('Kecamatan') + ' / ' + v('Kode_Pos')], ['Jenis Tinggal / Transportasi', v('Jenis_Tinggal') + ' / ' + v('Alat_Transportasi')],
      ['Telepon / HP', v('Telepon') + ' / ' + v('HP')], ['E-Mail', v('Email')]]) +
    sec('C. DATA ORANG TUA / WALI', ortu('Ayah', 'Ayah').concat(ortu('Ibu', 'Ibu')).concat(str_(r.Wali_Nama) ? [['Wali — Nama', v('Wali_Nama')], ['NIK / Tahun Lahir', v('Wali_NIK') + ' / ' + v('Wali_Tahun_Lahir')], ['Pekerjaan / Penghasilan', v('Wali_Pekerjaan') + ' / ' + v('Wali_Penghasilan')]] : [])) +
    sec('D. PERIODIK & SEKOLAH ASAL', [['Sekolah Asal', v('Sekolah_Asal')], ['No. Seri Ijazah', v('No_Seri_Ijazah')],
      ['Berat / Tinggi / Lingkar Kepala', v('Berat_Badan') + ' kg / ' + v('Tinggi_Badan') + ' cm / ' + v('Lingkar_Kepala') + ' cm'], ['Jarak Rumah ke Sekolah', v('Jarak_Rumah') + ' km']]) +
    '<div class="sec">E. STATUS KELENGKAPAN BERKAS</div><table class="bk">' + berkasRows + '</table>' +
    '<p style="margin:8px 0 0">Dengan ini saya menyatakan bahwa data yang diisikan adalah benar dan dapat dipertanggungjawabkan. Data tidak dapat diubah setelah formulir dikirim.</p>' +
    '<table class="ttd"><tr><td>Mengetahui,<br>Orang Tua / Wali<br><br><br><br>( ' + (v('Ayah_Nama') !== '-' ? v('Ayah_Nama') : '..............................') + ' )</td>' +
    '<td>Jakarta, ' + (r.Timestamp ? fmtDate_(new Date(r.Timestamp), 'dd MMMM yyyy') : '') + '<br>' + esc_(s.ttd_panitia) + '<br><br><br><br>( .............................. )</td></tr></table>' +
    '<div class="foot">Dokumen dibuat otomatis oleh PPDB Online ' + esc_(s.nama_sekolah) + ' · Simpan bukti ini untuk keperluan verifikasi & daftar ulang.</div>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).getAs('application/pdf').setName('Bukti_Pendaftaran_' + str_(r.No_Pendaftaran) + '.pdf');
}

function sendConfirmation_(r, pdfBlob) {
  try {
    const s = getSettings_();
    const no = str_(r.No_Pendaftaran);
    const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0F1E33">' +
      '<div style="background:#004A87;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><div style="font-size:12px;opacity:.85">' + esc_(s.nama_sekolah) + '</div>' +
      '<div style="font-size:19px;font-weight:bold;margin-top:4px">Pendaftaran PPDB Berhasil</div></div>' +
      '<div style="border:1px solid #DCE5EF;border-top:0;padding:20px;border-radius:0 0 12px 12px">' +
      '<p>Yth. Orang Tua/Wali dari <b>' + esc_(r.Nama) + '</b>,</p><p>Terima kasih, formulir PPDB Tahun Ajaran ' + esc_(r.Tahun_Ajaran) + ' telah kami terima.</p>' +
      '<p style="text-align:center;margin:18px 0"><span style="display:inline-block;border:2px dashed #004A87;border-radius:10px;padding:10px 18px;font-family:Courier New,monospace;font-size:20px;font-weight:bold;color:#004A87">' + no + '</span></p>' +
      '<p><b>Langkah selanjutnya:</b></p><ol style="padding-left:18px;line-height:1.6"><li>Simpan nomor pendaftaran dan PDF terlampir.</li>' +
      '<li>Panitia akan memverifikasi berkas & pembayaran.</li><li>Pantau status di menu <b>Cek Status</b> memakai nomor pendaftaran + tanggal lahir siswa.</li></ol>' +
      '<p style="background:#F4F8FC;border-radius:10px;padding:12px;font-size:13px">Butuh bantuan? WhatsApp panitia: <b>' + esc_(s.kontak_wa) + '</b> · Telp ' + esc_(s.kontak_telp) + '</p>' +
      '<p style="font-size:12px;color:#5B6B80">Email ini dikirim otomatis, mohon tidak dibalas.</p></div></div>';
    MailApp.sendEmail({
      to: str_(r.Email), subject: 'Bukti Pendaftaran PPDB ' + s.nama_sekolah + ' – ' + no,
      htmlBody: html, name: 'PPDB ' + s.nama_sekolah, attachments: [pdfBlob]
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

// =====================================================================
// 9. AUTENTIKASI ADMIN (token HMAC tanpa sesi tersimpan)
// =====================================================================
function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TOKEN_SECRET', s); }
  return s;
}
function sign_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_())).replace(/=+$/, ''); }
function signToken(p) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(p)).replace(/=+$/, '');
  return body + '.' + sign_(body);
}
function verifyToken(t) {
  try {
    const parts = String(t || '').split('.');
    if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return null;
    let b = parts[0]; while (b.length % 4) b += '=';
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString());
    if (!p.x || p.x < Date.now()) return null;
    const rev = Number(p.r === 'siswa' ? (prop_('REVS_' + p.u) || 0) : (prop_('REV_ADMIN') || 0));
    if (rev && p.i <= rev) return null;                     // token yang terbit pada/sebelum ganti/reset password gugur
    return { user: p.u, role: p.r, exp: p.x };
  } catch (e) { return null; }
}

function apiLogin(ctx, d) {
  const c = CacheService.getScriptCache();
  const fails = Number(c.get('login_fail') || 0);
  if (fails >= MAX_LOGIN_FAIL) return fail('Akun terkunci sementara. Coba lagi dalam ' + LOCK_MINUTES + ' menit.', { code: 'LOCKED' });
  const s = getSettings_();
  const user = String(d.username || '').trim().toLowerCase();
  const hash = sha256Hex_(s.admin_salt + String(d.password || ''));
  if (user !== String(s.admin_username).toLowerCase() || hash !== s.admin_password_hash) {
    c.put('login_fail', String(fails + 1), LOCK_MINUTES * 60);
    const left = MAX_LOGIN_FAIL - fails - 1;
    queueLog(['LOGIN_GAGAL', '', 'user: ' + user]);
    return fail(left > 0 ? 'Username atau password salah (sisa percobaan: ' + left + ' kali).' : 'Akun terkunci sementara. Coba lagi dalam ' + LOCK_MINUTES + ' menit.', { code: left > 0 ? 'WRONG' : 'LOCKED', left: left });
  }
  c.remove('login_fail');
  const now = Date.now();
  const token = signToken({ u: user, r: 'admin', i: now, x: now + TOKEN_HOURS * 3600e3 });
  queueLog(['LOGIN', '', 'user: ' + user]);
  return ok({ token: token, exp: now + TOKEN_HOURS * 3600e3, mustChange: s.admin_password_default === '1', boot: adminBootData_() });   // 1 panggilan
}

function apiChangePassword(ctx, d) {
  const s = getSettings_();
  if (sha256Hex_(s.admin_salt + String(d.old || '')) !== s.admin_password_hash) return fail('Password lama salah.');
  const nw = String(d.new || '');
  if (nw.length < 8) return fail('Password baru minimal 8 karakter.');
  const salt = Utilities.getUuid();
  const patch = { admin_password_hash: sha256Hex_(salt + nw), admin_salt: salt, admin_password_default: '0' };
  if (d.username) patch.admin_username = String(d.username).trim().toLowerCase();
  setSettings_(patch);
  const now = Date.now();
  PropertiesService.getScriptProperties().setProperty('REV_ADMIN', String(now - 1));
  queueLog(['GANTI_PASSWORD', '', '']);
  const token = signToken({ u: patch.admin_username || s.admin_username, r: 'admin', i: now, x: now + TOKEN_HOURS * 3600e3 });
  return ok({ token: token, exp: now + TOKEN_HOURS * 3600e3 });
}

// =====================================================================
// 10. ADMIN — DATA
// =====================================================================
const LIST_FIELDS = ['No_Pendaftaran', 'Nama', 'Jenis_Kelamin', 'NISN', 'Sekolah_Asal', 'Status_Berkas', 'Status_Bayar', 'Status_Seleksi', 'Rombel', 'Email_Terkirim', 'Tahun_Ajaran'];

function listData_() {
  return cached('list_' + ver('data'), 1800, function () {
    return readSheet(SH.PENDAFTAR).map(function (r) {
      const o = {};
      LIST_FIELDS.forEach(function (k) { o[k] = str_(r[k]); });
      o.NISN = padDigits_(o.NISN, 10);
      o.Timestamp = iso_(r.Timestamp);
      return o;
    });
  });
}

function adminBootData_() {
  const s = getSettings_();
  const set = publicSettings_(s);
  set.admin_username = s.admin_username;                       // hash & salt TIDAK pernah dikirim
  set.admin_password_default = s.admin_password_default;
  return {
    list: listData_(),
    akun: listAkun_(),
    settings: set,
    assets: assets_(s),
    status: isOpen_(s),
    jadwal: jadwal_(),
    konten: konten_(),
    referensi: referensi_(),
    v: ver('data') + ':' + ver('global')
  };
}
function apiAdminBoot() { return ok(adminBootData_()); }

function rowOut_(r) {
  const o = {};
  PENDAFTAR_HEADERS.forEach(function (k) { o[k] = (k === 'Timestamp' || k === 'Diubah_Pada') ? iso_(r[k]) : str_(r[k]); });
  ['NIK', 'No_KK', 'Ayah_NIK', 'Ibu_NIK', 'Wali_NIK'].forEach(function (k) { o[k] = padDigits_(o[k], 16); });
  o.NISN = padDigits_(o.NISN, 10);
  return o;
}

function apiGetDetail(ctx, d) {
  const r = findRow_(d.no);
  if (!r) return fail('Data tidak ditemukan.');
  const files = Object.keys(BERKAS).map(function (j) {
    const id = str_(r[BERKAS[j].col]);
    const f = { jenis: j, label: BERKAS[j].label, id: id, name: '', mime: '', size: 0, url: id ? 'https://drive.google.com/file/d/' + id + '/view' : '' };
    if (id) { try { const df = DriveApp.getFileById(id); f.name = df.getName(); f.mime = df.getMimeType(); f.size = df.getSize(); } catch (e) { f.error = 'Berkas tidak dapat dibuka'; } }
    return f;
  });
  return ok({ row: rowOut_(r), files: files, folderUrl: r.Folder_ID ? 'https://drive.google.com/drive/folders/' + r.Folder_ID : '', pdfUrl: r.File_PDF_Formulir ? 'https://drive.google.com/file/d/' + r.File_PDF_Formulir + '/view' : '' });
}

function apiGetFile(ctx, d) {
  const r = findRow_(d.no);
  if (!r) return fail('Data tidak ditemukan.');
  if (d.jenis === 'pdf') return ok(Object.assign(pdfPayload_(r), { mime: 'application/pdf' }));
  const j = BERKAS[d.jenis];
  if (!j || !r[j.col]) return fail('Berkas tidak ada.');
  const b = DriveApp.getFileById(str_(r[j.col])).getBlob();
  return ok({ b64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType(), name: b.getName() });
}

function apiGetLogs(ctx, d) {
  const no = String(d.no || '');
  const q = JSON.parse(CacheService.getScriptCache().get('logq') || '[]').map(function (x) { return { Waktu: x[1], Aksi: x[2], No_Pendaftaran: x[3], Detail: x[4] }; });
  const sh = sheet_(SH.LOG), last = sh.getLastRow();
  let rows = [];
  if (last > 1) {
    const n = Math.min(last - 1, 2000);
    rows = sh.getRange(last - n + 1, 1, n, 5).getValues().map(function (x) { return { Waktu: iso_(x[1]), Aksi: str_(x[2]), No_Pendaftaran: str_(x[3]), Detail: str_(x[4]) }; });
  }
  let all = rows.concat(q);
  if (no) all = all.filter(function (x) { return x.No_Pendaftaran === no; });
  return ok(all.slice(-200).reverse());
}

function stamp_(ctx) { return { Diubah_Oleh: (ctx.session && ctx.session.user) || 'admin', Diubah_Pada: new Date() }; }

function apiSetStatus(ctx, d) {
  const field = String(d.field || '');
  if (!STATUS[field]) return fail('Jenis status tidak dikenal.');
  if (STATUS[field].indexOf(d.value) === -1) return fail('Nilai status tidak valid.');
  const r = findRow_(d.no);
  if (!r) return fail('Data tidak ditemukan.');
  const note = String(d.note || '').trim();
  if (field === 'Status_Berkas' && d.value === 'Kurang' && !note) return fail('Catatan wajib diisi bila berkas Kurang.');
  if (field === 'Status_Seleksi' && d.value === 'Diterima' && !(str_(r.Status_Berkas) === 'Lengkap' && str_(r.Status_Bayar) === 'Terkonfirmasi')) {
    return fail('Diterima hanya bisa dipilih bila berkas Lengkap dan pembayaran Terkonfirmasi.');
  }
  const patch = Object.assign({}, stamp_(ctx));
  patch[field] = d.value;
  if (note) patch.Catatan_Admin = note;
  updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', r.No_Pendaftaran, patch);
  if (field === 'Status_Bayar' && str_(r.ID_Akun)) {
    const ap = { Status_Bayar: d.value, Diubah_Oleh: patch.Diubah_Oleh, Diubah_Pada: new Date() };
    if (d.value === 'Ditolak' && note) ap.Catatan_Bayar = note;
    updateByKey_(SH.AKUN, 'ID_Akun', str_(r.ID_Akun), ap);
  }
  bump('data');
  queueLog([field.replace('Status_', 'STATUS_').toUpperCase(), str_(r.No_Pendaftaran), d.value + (note ? ' | ' + note : '')]);
  return ok({ no: str_(r.No_Pendaftaran), field: field, value: d.value, note: note || str_(r.Catatan_Admin) });
}

function apiSaveRombel(ctx, d) {
  const r = findRow_(d.no); if (!r) return fail('Data tidak ditemukan.');
  updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', r.No_Pendaftaran, Object.assign({ Rombel: String(d.rombel || '').trim() }, stamp_(ctx)));
  bump('data'); queueLog(['ROMBEL', str_(r.No_Pendaftaran), String(d.rombel || '')]);
  return ok({ no: str_(r.No_Pendaftaran), rombel: String(d.rombel || '').trim() });
}

function apiSaveCatatan(ctx, d) {
  const r = findRow_(d.no); if (!r) return fail('Data tidak ditemukan.');
  updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', r.No_Pendaftaran, Object.assign({ Catatan_Admin: String(d.note || '').trim() }, stamp_(ctx)));
  bump('data'); queueLog(['CATATAN', str_(r.No_Pendaftaran), String(d.note || '').slice(0, 120)]);
  return ok({ no: str_(r.No_Pendaftaran), note: String(d.note || '').trim() });
}

function apiEditData(ctx, d) {
  const r = findRow_(d.no); if (!r) return fail('Data tidak ditemukan.');
  const merged = Object.assign({}, rowOut_(r), d.patch || {});
  const o = cleanForm_(merged);
  const all = validateForm_(o);
  const err = {};
  Object.keys(d.patch || {}).forEach(function (k) { if (all[k] && k !== 'Tanggal_Lahir') err[k] = all[k]; });   // hanya kolom yang diubah
  if (Object.keys(err).length) return fail('Periksa kembali isian.', { code: 'INVALID', errors: err });
  const patch = {};
  Object.keys(d.patch || {}).forEach(function (k) { if (DATA_FIELDS.indexOf(k) > -1) patch[k] = o[k]; });
  updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', r.No_Pendaftaran, Object.assign(patch, stamp_(ctx)));
  bump('data'); queueLog(['EDIT_DATA', str_(r.No_Pendaftaran), Object.keys(patch).join(', ')]);
  invalidateRows(SH.PENDAFTAR);
  return ok({ row: rowOut_(findRow_(r.No_Pendaftaran)) });
}

function apiResendEmail(ctx, d) {
  const r = findRow_(d.no); if (!r) return fail('Data tidak ditemukan.');
  let pdf, newPdf = false;
  if (d.regenerate || !r.File_PDF_Formulir) { pdf = buildPdf_(r); newPdf = true; }
  else { try { pdf = DriveApp.getFileById(r.File_PDF_Formulir).getBlob(); } catch (e) { pdf = buildPdf_(r); newPdf = true; } }
  const mail = sendConfirmation_(r, pdf);
  withLock_(function () {
    const patch = { Email_Terkirim: mail.ok ? 'Ya' : 'Gagal' };
    if (newPdf && r.Folder_ID) { try { patch.File_PDF_Formulir = DriveApp.getFolderById(r.Folder_ID).createFile(pdf).getId(); } catch (e) {} }
    updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', r.No_Pendaftaran, patch);
    bump('data');
  });
  queueLog(['KIRIM_ULANG_EMAIL', str_(r.No_Pendaftaran), mail.ok ? 'berhasil' : mail.error]);
  return mail.ok ? ok({ no: str_(r.No_Pendaftaran) }, { message: 'Email terkirim ke ' + maskEmail_(r.Email) }) : fail('Email gagal dikirim: ' + mail.error);
}

// =====================================================================
// 11. EKSPOR EXCEL FORMAT DAPODIK (51 kolom A–AY, header 2 baris)
// =====================================================================
function apiExportDapodik(ctx, d) {
  const scope = String(d.scope || 'diterima');
  let rows = readSheet(SH.PENDAFTAR);
  const ta = getSettings_().tahun_ajaran;
  rows = rows.filter(function (r) { return !d.ta || str_(r.Tahun_Ajaran) === (d.ta === 'aktif' ? ta : d.ta); });
  if (scope === 'diterima') rows = rows.filter(function (r) { return str_(r.Status_Seleksi) === 'Diterima'; });
  if (scope === 'pilihan') { const set = {}; (d.nos || []).forEach(function (n) { set[n] = 1; }); rows = rows.filter(function (r) { return set[str_(r.No_Pendaftaran)]; }); }
  rows.sort(function (a, b) { return str_(a.No_Pendaftaran) < str_(b.No_Pendaftaran) ? -1 : 1; });

  const tmp = SpreadsheetApp.create('tmp_ekspor_dapodik_' + Date.now());
  const sh = tmp.getSheets()[0].setName('Daftar Peserta Didik');
  const N = DAPODIK_COLS.length;   // 51
  const h5 = ['No', 'Nama', 'Jenis Kelamin', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Agama', 'Alamat', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kode Pos',
    'Jenis Tinggal', 'Alat Transportasi', 'Telepon', 'HP', 'E-Mail', 'Data Ayah', '', '', '', '', '', '', 'Data Ibu', '', '', '', '', '', '', 'Data Wali', '', '', '', '', '',
    'Rombel Saat Ini', 'No Seri Ijazah', 'No Registrasi Akta Lahir', 'Sekolah Asal', 'Anak ke-berapa', 'No KK', 'Berat Badan', 'Tinggi Badan', 'Lingkar Kepala',
    'Jml. Saudara\nKandung', 'Jarak Rumah\nke Sekolah (KM)'];
  const h6 = new Array(N).fill('');
  ['Nama', 'Tanggal Lahir', 'Tempat Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK'].forEach(function (t, i) { h6[20 + i] = t; h6[27 + i] = t; });
  ['Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK'].forEach(function (t, i) { h6[34 + i] = t; });
  if (sh.getMaxColumns() < N) sh.insertColumnsAfter(sh.getMaxColumns(), N - sh.getMaxColumns());
  const need = 6 + rows.length;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  sh.getRange(1, 1, Math.max(need, 7), N).setNumberFormat('@');           // NIK/NISN tetap teks
  sh.getRange(5, 1, 2, N).setValues([h5, h6]);
  for (let c = 1; c <= N; c++) { if (c < 21 || c > 40) sh.getRange(5, c, 2, 1).merge(); }
  sh.getRange(5, 21, 1, 7).merge(); sh.getRange(5, 28, 1, 7).merge(); sh.getRange(5, 35, 1, 6).merge();
  sh.getRange(5, 1, 2, N).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
    .setBackground('#DCE5EF').setBorder(true, true, true, true, true, true);
  if (rows.length) {
    const data = rows.map(function (r, i) {
      const o = rowOut_(r);
      return DAPODIK_COLS.map(function (k) { return k === '#' ? String(i + 1) : (o[k] || ''); });
    });
    sh.getRange(7, 1, data.length, N).setValues(data).setBorder(true, true, true, true, true, true);
  }
  sh.setFrozenRows(6);
  SpreadsheetApp.flush();
  const url = 'https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=xlsx';
  const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  DriveApp.getFileById(tmp.getId()).setTrashed(true);
  const name = 'PPDB_Dapodik_' + String(ta).replace('/', '-') + '_' + fmtDate_(new Date(), 'yyyyMMdd') + '.xlsx';
  queueLog(['EKSPOR_DAPODIK', '', scope + ' · ' + rows.length + ' baris']);
  return ok({ b64: Utilities.base64Encode(blob.getBytes()), name: name, count: rows.length });
}

// =====================================================================
// 12. ADMIN — PENGATURAN, KONTEN, ASET
// =====================================================================
function apiSaveSettings(ctx, d) {
  const patch = {};
  Object.keys(d.settings || {}).forEach(function (k) {
    if (k.indexOf('admin_') === 0 || !SEED[k] || /_id$/.test(k) || k === 'hero_slides') return;      // kredensial & ID aset lewat endpoint khusus
    patch[k] = String(d.settings[k] === null || d.settings[k] === undefined ? '' : d.settings[k]).slice(0, 2000);
  });
  if (patch.status_pendaftaran) patch.status_pendaftaran = patch.status_pendaftaran.toUpperCase() === 'BUKA' ? 'BUKA' : 'TUTUP';
  if (patch.tema_default && ['IKUTI_PERANGKAT', 'TERANG', 'GELAP'].indexOf(patch.tema_default) === -1) delete patch.tema_default;
  if (patch.formulir_setelah && ['UPLOAD', 'KONFIRMASI'].indexOf(patch.formulir_setelah) === -1) delete patch.formulir_setelah;
  if (patch.slide_interval) patch.slide_interval = String(Math.min(30, Math.max(3, Number(patch.slide_interval) || 6)));
  setSettings_(patch);
  queueLog(['PENGATURAN', '', Object.keys(patch).join(', ')]);
  return ok(adminBootData_());
}

function apiSaveJadwal(ctx, d) {
  const list = (d.jadwal || []).map(function (j, i) {
    return { Urutan: i + 1, Kegiatan: String(j.Kegiatan || '').slice(0, 200), Tanggal_Mulai: String(j.Tanggal_Mulai || ''), Tanggal_Selesai: String(j.Tanggal_Selesai || ''), Keterangan: String(j.Keterangan || '').slice(0, 500) };
  }).filter(function (j) { return j.Kegiatan; });
  rewriteSheet_(SH.JADWAL, list);
  bump('global'); queueLog(['JADWAL', '', list.length + ' kegiatan']);
  return ok(jadwal_());
}

function apiSaveKonten(ctx, d) {
  const bagian = String(d.bagian || '');
  if (['Syarat', 'Alur', 'FAQ', 'Daftar Ulang'].indexOf(bagian) === -1) return fail('Bagian konten tidak dikenal.');
  const others = konten_().filter(function (k) { return k.Bagian !== bagian; });
  const items = (d.items || []).map(function (k, i) { return { Bagian: bagian, Urutan: i + 1, Judul: String(k.Judul || '').slice(0, 200), Isi: String(k.Isi || '').slice(0, 2000) }; })
    .filter(function (k) { return k.Judul || k.Isi; });
  rewriteSheet_(SH.KONTEN, others.concat(items));
  bump('global'); queueLog(['KONTEN', '', bagian + ' · ' + items.length + ' item']);
  return ok(konten_());
}

function apiUploadAsset(ctx, d) {
  const key = ASSET_KEYS[d.jenis];
  if (!key) return fail('Jenis aset tidak dikenal.');
  const mime = String(d.mime || '');
  if (['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/svg+xml'].indexOf(mime) === -1) return fail('Format gambar tidak didukung.');
  const bytes = Utilities.base64Decode(String(d.b64 || ''));
  if (bytes.length > 3 * 1048576) return fail('Ukuran gambar maksimal 3 MB.');
  const folder = DriveApp.getFolderById(CONFIG.ASET_FOLDER_ID);
  const file = folder.createFile(Utilities.newBlob(bytes, mime, d.jenis + '_' + fmtDate_(new Date(), 'yyyyMMdd_HHmmss')));
  let shared = true;
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { shared = false; }
  const old = getSettings_()[key];
  withLock_(function () { const p = {}; p[key] = file.getId(); setSettings_(p); });
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  queueLog(['ASET', '', d.jenis]);
  return ok({ jenis: d.jenis, url: assetUrl_(file.getId(), d.jenis === 'bg_hero' ? 1920 : 400), shared: shared },
    shared ? {} : { message: 'Tersimpan, tetapi Drive menolak berbagi publik (kebijakan domain). Gambar mungkin tidak tampil di portal.' });
}

function apiResetAsset(ctx, d) {
  const key = ASSET_KEYS[d.jenis];
  if (!key) return fail('Jenis aset tidak dikenal.');
  const old = getSettings_()[key];
  const p = {}; p[key] = ''; setSettings_(p);
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  queueLog(['ASET_RESET', '', d.jenis]);
  return ok({ jenis: d.jenis });
}

// =====================================================================
// 13. LOG (antrean cache → ditulis berkala oleh trigger)
// =====================================================================
function queueLog(row) {
  if (_IN_LOCK) { _PENDING_LOGS.push(row); return; }
  try {
    const full = [Utilities.getUuid(), new Date().toISOString()].concat(row);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(300)) return appendLogRows_([full]);
    try {
      const c = CacheService.getScriptCache(), q = JSON.parse(c.get('logq') || '[]');
      q.push(full);
      if (q.length >= 150) { appendLogRows_(q); c.remove('logq'); }
      else c.put('logq', JSON.stringify(q), 21600);
    } finally { lock.releaseLock(); }
  } catch (e) { Logger.log(e); }
}
function flushLogs() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
  try {
    const c = CacheService.getScriptCache(), q = JSON.parse(c.get('logq') || '[]');
    if (!q.length) return;
    appendLogRows_(q);
    c.remove('logq');
  } finally { lock.releaseLock(); }
}
function appendLogRows_(rows) {
  const sh = sheet_(SH.LOG);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(rows.map(function (r) { return [r[0], new Date(r[1]), r[2] || '', r[3] || '', r[4] || '']; }));
}

// =====================================================================
// 14. BACKUP (salinan spreadsheet di Drive) & TRIGGER
// =====================================================================
function backupFolder_() { return DriveApp.getFolderById(CONFIG.BACKUP_FOLDER_ID); }

function doBackup_(label) {
  flushLogs();
  const name = 'Backup DB PPDB ' + fmtDate_(new Date(), 'yyyy-MM-dd HHmm') + (label ? ' (' + label + ')' : '');
  const f = DriveApp.getFileById(CONFIG.SPREADSHEET_ID).makeCopy(name, backupFolder_());
  // simpan maksimal BACKUP_KEEP salinan otomatis terbaru (backup manual tidak dihapus)
  const auto = [];
  const it = backupFolder_().getFiles();
  while (it.hasNext()) { const x = it.next(); if (x.getName().indexOf('(otomatis)') > -1) auto.push(x); }
  auto.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  auto.slice(BACKUP_KEEP).forEach(function (x) { x.setTrashed(true); });
  return { id: f.getId(), name: name, url: f.getUrl() };
}
/** Dipanggil trigger mingguan */
function autoBackup() { const b = doBackup_('otomatis'); queueLog(['BACKUP', '', 'otomatis · ' + b.name]); }

function apiBackupNow() {
  const b = doBackup_('manual');
  queueLog(['BACKUP', '', 'manual · ' + b.name]);
  return ok(b, { message: 'Backup tersimpan: ' + b.name });
}

function apiListBackups() {
  const out = [];
  const it = backupFolder_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
    out.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), created: f.getDateCreated().toISOString() });
  }
  out.sort(function (a, b) { return a.created < b.created ? 1 : -1; });
  const trig = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return ok({ backups: out, folderUrl: backupFolder_().getUrl(), triggers: { backup: trig.indexOf('autoBackup') > -1, log: trig.indexOf('flushLogs') > -1 } });
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['flushLogs', 'autoBackup'].indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('flushLogs').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('autoBackup').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(1).create();
}
function apiInstallTriggers() { installTriggers_(); return ok({ backup: true, log: true }, { message: 'Backup mingguan (Senin 01.00) & penulisan log aktif.' }); }

// =====================================================================
// 15. MIGRASI / IMPORT DATA (idempoten, dry-run, delta sync)
//     Sumber: spreadsheet app lama, file backup, atau DB PPDB tahun lalu.
//     Sumber HANYA DIBACA — tidak pernah ditulis.
// =====================================================================
/** Alias header lama → kolom baru (dibandingkan setelah huruf kecil & tanpa simbol) */
const HEADER_ALIASES = {
  nopendaftaran: 'No_Pendaftaran', nomorpendaftaran: 'No_Pendaftaran', noreg: 'No_Pendaftaran', nodaftar: 'No_Pendaftaran',
  nama: 'Nama', namalengkap: 'Nama', namasiswa: 'Nama', namacalonsiswa: 'Nama',
  jk: 'Jenis_Kelamin', jeniskelamin: 'Jenis_Kelamin', lp: 'Jenis_Kelamin',
  nisn: 'NISN', nik: 'NIK', niksiswa: 'NIK', nokk: 'No_KK', nomorkk: 'No_KK', nokartukeluarga: 'No_KK',
  tempatlahir: 'Tempat_Lahir', tanggallahir: 'Tanggal_Lahir', tgllahir: 'Tanggal_Lahir', agama: 'Agama',
  alamat: 'Alamat', rt: 'RT', rw: 'RW', dusun: 'Dusun', kelurahan: 'Kelurahan', desakelurahan: 'Kelurahan', kecamatan: 'Kecamatan', kodepos: 'Kode_Pos',
  jenistinggal: 'Jenis_Tinggal', alattransportasi: 'Alat_Transportasi', telepon: 'Telepon', hp: 'HP', nohp: 'HP', nowa: 'HP', whatsapp: 'HP',
  email: 'Email', email2: 'Email', asalsekolah: 'Sekolah_Asal', sekolahasal: 'Sekolah_Asal', noseriijazah: 'No_Seri_Ijazah',
  noregistrasiaktalahir: 'No_Akta_Lahir', noaktalahir: 'No_Akta_Lahir', anakkeberapa: 'Anak_Ke', anakke: 'Anak_Ke',
  beratbadan: 'Berat_Badan', tinggibadan: 'Tinggi_Badan', lingkarkepala: 'Lingkar_Kepala', jmlsaudarakandung: 'Jml_Saudara', jumlahsaudara: 'Jml_Saudara',
  jarakrumahkesekolahkm: 'Jarak_Rumah', jarakrumah: 'Jarak_Rumah', namaayah: 'Ayah_Nama', nikayah: 'Ayah_NIK', pekerjaanayah: 'Ayah_Pekerjaan',
  namaibu: 'Ibu_Nama', nikibu: 'Ibu_NIK', pekerjaanibu: 'Ibu_Pekerjaan', namawali: 'Wali_Nama', rombelsaatini: 'Rombel', rombel: 'Rombel', kelas: 'Rombel',
  statusberkas: 'Status_Berkas', statusbayar: 'Status_Bayar', statusseleksi: 'Status_Seleksi', tahunajaran: 'Tahun_Ajaran', catatan: 'Catatan_Admin'
};
function normHeader_(h) {
  const raw = String(h).trim();
  if (PENDAFTAR_HEADERS.indexOf(raw) > -1) return raw;
  return HEADER_ALIASES[raw.toLowerCase().replace(/[^a-z0-9]/g, '')] || raw;
}

function openSource_(idOrUrl) {
  const m = String(idOrUrl || '').match(/\/d\/([A-Za-z0-9_-]{20,})/);
  const id = m ? m[1] : String(idOrUrl || '').trim();
  if (!id) throw new Error('Tempel URL atau ID spreadsheet sumber.');
  if (id === CONFIG.SPREADSHEET_ID) throw new Error('Itu spreadsheet aktif aplikasi ini. Tempel spreadsheet LAMA / file backup.');
  try { return SpreadsheetApp.openById(id); }
  catch (e) { throw new Error('Spreadsheet tidak bisa dibuka. Pastikan ID benar & dapat diakses akun pemilik script.'); }
}

function readSource_(ss, name, norm) {
  const sh = ss.getSheetByName(name); if (!sh) return null;
  const v = sh.getDataRange().getValues(); if (v.length <= 1) return [];
  const h = v[0].map(function (x) { return norm ? normHeader_(x) : String(x); });
  return v.slice(1).filter(function (r) { return r.join('') !== ''; })
    .map(function (r) { const o = {}; h.forEach(function (k, i) { if (k) o[k] = r[i]; }); return o; });
}

/** plan = { target, key(o), rows[], updatable[], sortBy? } → {inserted, updated, skipped} */
function upsertPlan_(plan, dryRun) {
  const sh = sheet_(plan.target), values = sh.getDataRange().getValues(), h = values[0].map(String);
  const index = {};
  for (let r = 1; r < values.length; r++) { const o = {}; h.forEach(function (k, i) { o[k] = values[r][i]; }); const k = plan.key(o); if (k) index[k] = r; }
  const res = { source: plan.rows.length, inserted: 0, updated: 0, skipped: 0 }, newRows = [], seen = {};
  plan.rows.forEach(function (src) {
    const k = plan.key(src);
    if (!k || seen[k]) { res.skipped++; return; } seen[k] = true;
    if (index[k] !== undefined) {
      const row = values[index[k]];
      let changed = false;
      (plan.updatable || []).forEach(function (f) {
        const i = h.indexOf(f); if (i === -1 || src[f] === undefined || src[f] === '') return;
        if (String(row[i]) !== String(src[f])) { row[i] = src[f]; changed = true; }
      });
      changed ? res.updated++ : res.skipped++;
    } else {
      if (plan.beforeInsert) plan.beforeInsert(src, dryRun);
      newRows.push(h.map(function (f) { return src[f] !== undefined ? src[f] : ''; }));
      res.inserted++;
    }
  });
  if (!dryRun && (res.updated || newRows.length)) {
    let all = values.concat(newRows);
    if (plan.sortBy && newRows.length) {
      const si = h.indexOf(plan.sortBy);
      all = [values[0]].concat(all.slice(1).sort(function (a, b) { return new Date(a[si]) - new Date(b[si]); }));
    }
    sh.getRange(1, 1, all.length, h.length).setValues(all);
    invalidateRows(plan.target);
  }
  return res;
}

function normPendaftar_(o, taDefault) {
  const r = {};
  PENDAFTAR_HEADERS.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; });
  DATA_FIELDS.forEach(function (k) { if (r[k] !== undefined) r[k] = str_(r[k]); });
  if (r.NISN !== undefined) r.NISN = padDigits_(r.NISN, 10);
  ['NIK', 'No_KK', 'Ayah_NIK', 'Ibu_NIK', 'Wali_NIK'].forEach(function (k) { if (r[k] !== undefined) r[k] = padDigits_(r[k], 16); });
  if (r.HP !== undefined) r.HP = waOf(r.HP);
  if (r.Email !== undefined) r.Email = String(r.Email).trim().toLowerCase();
  if (r.Jenis_Kelamin !== undefined) { const jk = String(r.Jenis_Kelamin).trim().toUpperCase(); r.Jenis_Kelamin = jk.charAt(0) === 'P' ? 'P' : (jk.charAt(0) === 'L' ? 'L' : jk); }
  if (r.No_Pendaftaran !== undefined) r.No_Pendaftaran = str_(r.No_Pendaftaran).toUpperCase();
  r.Tahun_Ajaran = str_(r.Tahun_Ajaran) || taDefault;
  if (!r.Status_Berkas) r.Status_Berkas = 'Menunggu Verifikasi';
  if (!r.Status_Bayar) r.Status_Bayar = 'Menunggu Konfirmasi';
  if (!r.Status_Seleksi) r.Status_Seleksi = 'Dalam Proses';
  if (!r.Timestamp) r.Timestamp = new Date();
  r.Diubah_Oleh = 'import'; r.Diubah_Pada = new Date();
  if (!r.Email_Terkirim) r.Email_Terkirim = 'Import';
  return r;
}

const IMPORT_SHEETS = ['Akun', 'Pendaftar', 'Jadwal', 'Konten', 'Referensi', 'Pengaturan', 'Log_Aktivitas'];

function apiImport(ctx, d, dryRun) {
  const src = openSource_(d.source);
  const want = (d.sheets && d.sheets.length ? d.sheets : ['Pendaftar']).filter(function (s) { return IMPORT_SHEETS.indexOf(s) > -1; });
  const overwrite = !!d.overwrite;
  const report = {}, warnings = [];
  const s = getSettings_();
  const runAll = function () {
    want.forEach(function (name) {
      if (name === 'Pendaftar') {
        let rows = readSource_(src, d.sourceSheet || 'Pendaftar', true);
        if (rows === null && !d.sourceSheet) rows = readSource_(src, src.getSheets()[0].getName(), true);
        if (rows === null) { report[name] = { missing: true }; return; }
        const emailSeen = {};
        rows = rows.map(function (o) { return normPendaftar_(o, s.tahun_ajaran); }).filter(function (o) {
          if (!o.Nama) { warnings.push('Baris tanpa Nama dilewati.'); return false; }
          if (o.Email) { if (emailSeen[o.Email]) warnings.push('Email ganda di sumber: ' + o.Email); emailSeen[o.Email] = 1; }
          return true;
        });
        // Nomor pendaftaran untuk baris yang belum punya (dihitung saat insert)
        let seq = 0;
        const plan = {
          target: SH.PENDAFTAR, rows: rows,
          key: function (o) { return str_(o.No_Pendaftaran) || ('NISN:' + padDigits_(o.NISN, 10) + '|' + str_(o.Tahun_Ajaran)); },
          updatable: overwrite ? ['Status_Berkas', 'Status_Bayar', 'Status_Seleksi', 'Catatan_Admin', 'Rombel'].concat(DATA_FIELDS) : ['Status_Berkas', 'Status_Bayar', 'Status_Seleksi'].filter(function () { return !!d.delta; }),
          beforeInsert: function (o, dry) {
            if (!o.No_Pendaftaran) {
              seq++;
              if (!dry) { invalidateRows(SH.PENDAFTAR); const base = nextNumber_(o.Tahun_Ajaran); const n = Number(base.slice(-4)) + seq - 1; o.No_Pendaftaran = base.slice(0, -4) + ('000' + n).slice(-4); }
            }
          }
        };
        // Kunci baris tanpa nomor → cocokkan via NISN+TA ke data yang ada
        const existingByNisn = {};
        readSheet(SH.PENDAFTAR).forEach(function (r) { existingByNisn['NISN:' + padDigits_(r.NISN, 10) + '|' + str_(r.Tahun_Ajaran)] = str_(r.No_Pendaftaran); });
        rows.forEach(function (o) { if (!o.No_Pendaftaran) { const k = 'NISN:' + o.NISN + '|' + o.Tahun_Ajaran; if (existingByNisn[k]) o.No_Pendaftaran = existingByNisn[k]; } });
        report[name] = upsertPlan_(plan, dryRun);
        if (seq) warnings.push(seq + ' baris tanpa No. Pendaftaran akan diberi nomor baru.');
      } else if (name === 'Akun') {
        const rows = readSource_(src, SH.AKUN, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        report[name] = upsertPlan_({ target: SH.AKUN, rows: rows.map(function (o) {
            const r = {}; AKUN_HEADERS.forEach(function (k) { if (o[k] !== undefined) r[k] = (k === 'Timestamp' || k === 'Diubah_Pada' || k === 'Waktu_Bukti') ? o[k] : str_(o[k]); });
            r.NISN = padDigits_(r.NISN, 10); r.Email = String(r.Email || '').toLowerCase(); r.WA_Siswa = waOf(r.WA_Siswa); r.WA_Ortu = waOf(r.WA_Ortu);
            return r; }),
          key: function (o) { return str_(o.ID_Akun) || (String(o.Email || '').toLowerCase() + '|' + str_(o.Tahun_Ajaran)); },
          updatable: overwrite ? ['Status_Bayar', 'Catatan_Bayar', 'No_Pendaftaran', 'File_BuktiBayar'] : (d.delta ? ['Status_Bayar', 'No_Pendaftaran'] : []) }, dryRun);
        warnings.push('Akun diimpor beserta password-nya (hash); siswa tetap login dengan password lama.');
      } else if (name === 'Jadwal') {
        const rows = readSource_(src, SH.JADWAL, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        report[name] = upsertPlan_({ target: SH.JADWAL, rows: rows.map(function (o) { return { Urutan: o.Urutan, Kegiatan: str_(o.Kegiatan), Tanggal_Mulai: str_(o.Tanggal_Mulai), Tanggal_Selesai: str_(o.Tanggal_Selesai), Keterangan: str_(o.Keterangan) }; }),
          key: function (o) { return str_(o.Kegiatan).toLowerCase(); }, updatable: overwrite ? ['Tanggal_Mulai', 'Tanggal_Selesai', 'Keterangan', 'Urutan'] : [] }, dryRun);
      } else if (name === 'Konten') {
        const rows = readSource_(src, SH.KONTEN, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        report[name] = upsertPlan_({ target: SH.KONTEN, rows: rows, key: function (o) { return str_(o.Bagian) + '|' + str_(o.Judul).toLowerCase(); }, updatable: overwrite ? ['Isi', 'Urutan'] : [] }, dryRun);
      } else if (name === 'Referensi') {
        const rows = readSource_(src, SH.REFERENSI, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        report[name] = upsertPlan_({ target: SH.REFERENSI, rows: rows, key: function (o) { return str_(o.Jenis) + '|' + str_(o.Nilai); }, updatable: [] }, dryRun);
      } else if (name === 'Log_Aktivitas') {
        const rows = readSource_(src, SH.LOG, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        report[name] = upsertPlan_({ target: SH.LOG, rows: rows, key: function (o) { return str_(o.Log_ID); }, updatable: [], sortBy: 'Waktu' }, dryRun);
      } else if (name === 'Pengaturan') {
        const rows = readSource_(src, SH.PENGATURAN, false);
        if (rows === null) { report[name] = { missing: true }; return; }
        const patch = {}; let skipped = 0;
        rows.forEach(function (o) {
          const k = str_(o.Kunci), v = str_(o.Nilai);
          if (!SEED[k] || k.indexOf('admin_') === 0 || v === '') { skipped++; return; }
          const cur = s[k];
          if (overwrite || cur === '' || cur === SEED[k][0]) { if (cur !== v) { patch[k] = v; warnings.push('Pengaturan "' + k + '" diambil dari sumber.'); } else skipped++; }
          else skipped++;
        });
        if (!dryRun && Object.keys(patch).length) setSettings_(patch);
        report[name] = { source: rows.length, inserted: 0, updated: Object.keys(patch).length, skipped: skipped };
      }
    });
  };
  if (dryRun) runAll(); else withLock_(runAll);
  if (want.indexOf('Pengaturan') > -1) warnings.push('Akun & password admin tidak pernah diimpor.');
  if (!dryRun) {
    bump('data'); bump('global');
    queueLog(['IMPORT_RUN', '', src.getName() + ' · ' + JSON.stringify(report)]);
  }
  return ok({ source: { name: src.getName(), id: src.getId() }, dryRun: dryRun, report: report, warnings: warnings.filter(function (w, i, a) { return a.indexOf(w) === i; }).slice(0, 30) });
}

// =====================================================================
// 15b. AKUN SISWA — daftar akun → bayar → login → isi formulir
//      Username = email siswa, password awal = NISN (bisa diganti siswa).
// =====================================================================

/** Upgrade otomatis untuk deployment lama: tambah sheet Akun & kolom baru tanpa menyentuh data. */
function ensureSchema_() {
  if (prop_('SCHEMA_VER') === SCHEMA_VERSION) return;
  const c = CacheService.getScriptCache();
  if (c.get('schema_ok') === SCHEMA_VERSION) return;
  withLock_(function () {
    if (prop_('SCHEMA_VER') === SCHEMA_VERSION) return;
    upgradeSchema_();
  });
  c.put('schema_ok', SCHEMA_VERSION, 21600);
}
function upgradeSchema_() {
  const ss = ss_();
  // 1. Sheet Akun
  let ak = ss.getSheetByName(SH.AKUN);
  if (!ak) {
    ak = ss.insertSheet(SH.AKUN);
    ak.getRange(1, 1, ak.getMaxRows(), AKUN_HEADERS.length).setNumberFormat('@');
    ['Timestamp', 'Waktu_Bukti', 'Diubah_Pada'].forEach(function (k) { ak.getRange(2, AKUN_HEADERS.indexOf(k) + 1, ak.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss'); });
    ak.getRange(1, 1, 1, AKUN_HEADERS.length).setValues([AKUN_HEADERS]);
    ak.setFrozenRows(1);
    ak.getRange(1, 1, 1, AKUN_HEADERS.length).setFontWeight('bold').setBackground('#00305A').setFontColor('#ffffff');
  }
  // 2. Kolom baru di Pendaftar (ditambahkan di akhir)
  const p = ss.getSheetByName(SH.PENDAFTAR);
  const h = p.getRange(1, 1, 1, p.getLastColumn()).getValues()[0].map(String);
  const miss = PENDAFTAR_HEADERS.filter(function (k) { return h.indexOf(k) === -1; });
  if (miss.length) {
    const start = h.length + 1;
    if (p.getMaxColumns() < h.length + miss.length) p.insertColumnsAfter(p.getMaxColumns(), h.length + miss.length - p.getMaxColumns());
    p.getRange(1, start, p.getMaxRows(), miss.length).setNumberFormat('@');
    p.getRange(1, start, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#004A87').setFontColor('#ffffff');
  }
  invalidateRows(SH.PENDAFTAR);
  PropertiesService.getScriptProperties().setProperty('SCHEMA_VER', SCHEMA_VERSION);
  bump('data'); bump('global');
  Logger.log('✅ Skema database diperbarui ke versi ' + SCHEMA_VERSION);
}
/** Bisa dijalankan manual dari editor bila ingin memastikan upgrade skema. */
function upgradeSkema() { PropertiesService.getScriptProperties().deleteProperty('SCHEMA_VER'); upgradeSchema_(); }

function findAkun_(id) {
  const rows = readSheet(SH.AKUN);
  for (let i = 0; i < rows.length; i++) if (str_(rows[i].ID_Akun) === String(id)) return rows[i];
  return null;
}
function findAkunByEmail_(email) {
  const e = String(email || '').trim().toLowerCase();
  const rows = readSheet(SH.AKUN).filter(function (r) { return str_(r.Email).toLowerCase() === e; });
  return rows.length ? rows[rows.length - 1] : null;                  // terbaru (bila daftar ulang tahun berikutnya)
}
function slideIds_(s) { return String(s.hero_slides || '').split(',').map(function (x) { return x.trim(); }).filter(String); }

/** Kapan formulir boleh diisi (pengaturan formulir_setelah) */
function formulirGate_(akun, s) {
  const sb = str_(akun.Status_Bayar);
  if (sb === 'Terkonfirmasi') return { open: true, reason: '' };
  if (s.formulir_setelah === 'KONFIRMASI') return { open: false, reason: sb === 'Menunggu Konfirmasi' ? 'Formulir terbuka setelah pembayaran dikonfirmasi panitia.' : 'Unggah bukti pembayaran terlebih dahulu.' };
  if (sb === 'Menunggu Konfirmasi') return { open: true, reason: '' };
  return { open: false, reason: sb === 'Ditolak' ? 'Bukti pembayaran ditolak. Unggah ulang bukti yang benar.' : 'Unggah bukti pembayaran terlebih dahulu.' };
}

const AKUN_LIST_FIELDS = ['ID_Akun', 'Tahun_Ajaran', 'Nama', 'Email', 'WA_Siswa', 'WA_Ortu', 'Sekolah_Asal', 'NISN', 'Status_Bayar', 'Catatan_Bayar', 'No_Pendaftaran', 'Password_Diganti'];
function akunOut_(r) {
  const o = {};
  AKUN_LIST_FIELDS.forEach(function (k) { o[k] = str_(r[k]); });
  o.NISN = padDigits_(o.NISN, 10);
  o.Timestamp = iso_(r.Timestamp); o.Waktu_Bukti = iso_(r.Waktu_Bukti);
  o.Ada_Bukti = !!str_(r.File_BuktiBayar);
  return o;
}
function listAkun_() {
  return cached('akun_' + ver('data'), 1800, function () { return readSheet(SH.AKUN).map(akunOut_); });
}

function paymentInfo_(s) {
  return { biaya_formulir: s.biaya_formulir, bank_nama: s.bank_nama, bank_norek: s.bank_norek, bank_atas_nama: s.bank_atas_nama, catatan_bayar: s.catatan_bayar, kontak_wa: s.kontak_wa };
}
function siswaBootData_(akun) {
  const s = getSettings_();
  const out = { akun: akunOut_(akun), bayar: paymentInfo_(s), gate: formulirGate_(akun, s), status: isOpen_(s), formulir_setelah: s.formulir_setelah, pendaftaran: null };
  const no = str_(akun.No_Pendaftaran);
  if (no) {
    const r = findRow_(no);
    if (r) {
      out.pendaftaran = { no: no, waktu: iso_(r.Timestamp), berkas: str_(r.Status_Berkas), bayar: str_(r.Status_Bayar), seleksi: str_(r.Status_Seleksi),
        catatan: str_(r.Catatan_Admin), rombel: str_(r.Rombel), hasPdf: !!str_(r.File_PDF_Formulir), nama: str_(r.Nama) };
      if (out.pendaftaran.seleksi === 'Diterima') out.pendaftaran.daftarUlang = konten_().filter(function (k) { return k.Bagian === 'Daftar Ulang'; });
    }
  }
  return out;
}
function siswaToken_(id) {
  const now = Date.now();
  return { token: signToken({ u: id, r: 'siswa', i: now, x: now + SISWA_TOKEN_DAYS * 864e5 }), exp: now + SISWA_TOKEN_DAYS * 864e5 };
}

function apiAkunDaftar(ctx, d) {
  const s = getSettings_();
  const st = isOpen_(s);
  if (!st.open) return fail(st.reason, { code: 'CLOSED' });
  const o = {
    Nama: str_(d.Nama).toUpperCase().slice(0, 120), Email: str_(d.Email).toLowerCase().slice(0, 120),
    WA_Siswa: waOf(d.WA_Siswa), WA_Ortu: waOf(d.WA_Ortu), Sekolah_Asal: str_(d.Sekolah_Asal).slice(0, 150), NISN: digits_(d.NISN)
  };
  const err = {};
  ['Nama', 'Email', 'WA_Siswa', 'WA_Ortu', 'Sekolah_Asal', 'NISN'].forEach(function (k) { if (!o[k]) err[k] = 'Wajib diisi.'; });
  if (o.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.Email)) err.Email = 'Format email tidak valid.';
  if (o.NISN && !/^\d{10}$/.test(o.NISN)) err.NISN = 'NISN harus 10 digit angka.';
  ['WA_Siswa', 'WA_Ortu'].forEach(function (k) { if (o[k] && !/^0\d{9,13}$/.test(o[k])) err[k] = 'Nomor WhatsApp diawali 08, 10–14 digit.'; });
  if (Object.keys(err).length) return fail('Periksa kembali isian yang ditandai.', { code: 'INVALID', errors: err });
  const cekGanda = function () {
    const ta = s.tahun_ajaran;
    const ada = readSheet(SH.AKUN).filter(function (r) { return str_(r.Tahun_Ajaran) === ta && (padDigits_(r.NISN, 10) === o.NISN || str_(r.Email).toLowerCase() === o.Email); })[0];
    if (ada) return fail(padDigits_(ada.NISN, 10) === o.NISN ? 'NISN ini sudah memiliki akun. Silakan masuk dengan email terdaftar.' : 'Email ini sudah dipakai akun lain. Silakan masuk atau gunakan email berbeda.', { code: 'DUPLICATE', email: maskEmail_(str_(ada.Email)) });
    const lama = findDuplicate_({ NISN: o.NISN }, ta);
    if (lama) return fail('NISN ini sudah terdaftar dengan nomor ' + lama + '. Hubungi panitia bila butuh bantuan.', { code: 'DUPLICATE' });
    return null;
  };
  const g = cekGanda(); if (g) return g;
  const folder = taFolder_(s.tahun_ajaran).createFolder('AKUN ' + o.NISN + ' - ' + o.Nama);   // di luar lock (lambat)
  const salt = Utilities.getUuid();
  let akun;
  const res = withLock_(function () {
    invalidateRows(SH.AKUN); invalidateRows(SH.PENDAFTAR);
    const g2 = cekGanda(); if (g2) return g2;
    const prefix = 'AKN-' + String(s.tahun_ajaran).slice(0, 4) + '-';
    let max = 0;
    readSheet(SH.AKUN).forEach(function (r) { const n = str_(r.ID_Akun); if (n.indexOf(prefix) === 0) max = Math.max(max, Number(n.slice(prefix.length)) || 0); });
    akun = Object.assign({}, o, {
      ID_Akun: prefix + ('000' + (max + 1)).slice(-4), Timestamp: new Date(), Tahun_Ajaran: s.tahun_ajaran,
      Password_Hash: sha256Hex_(salt + o.NISN), Salt: salt, Password_Diganti: 'Tidak', Status_Bayar: 'Belum Bayar', Catatan_Bayar: '',
      File_BuktiBayar: '', Waktu_Bukti: '', Folder_ID: folder.getId(), No_Pendaftaran: '', Diubah_Oleh: 'siswa', Diubah_Pada: new Date()
    });
    appendObjects_(SH.AKUN, [akun]);
    bump('data');
    return null;
  });
  if (res) { try { folder.setTrashed(true); } catch (e) {} return res; }
  ctx.after.push(function () { sendCredentials_(akun); });
  queueLog(['AKUN_BARU', '', akun.ID_Akun + ' · ' + akun.Nama]);
  const t = siswaToken_(akun.ID_Akun);
  return ok({ token: t.token, exp: t.exp, boot: siswaBootData_(findAkun_(akun.ID_Akun) || akun) });
}

function apiLoginSiswa(ctx, d) {
  const email = String(d.username || '').trim().toLowerCase();
  const c = CacheService.getScriptCache(), fk = 'ls_fail_' + email;
  const fails = Number(c.get(fk) || 0);
  if (fails >= MAX_LOGIN_FAIL) return fail('Terlalu banyak percobaan. Coba lagi dalam ' + LOCK_MINUTES + ' menit.', { code: 'LOCKED' });
  const akun = findAkunByEmail_(email);
  if (!akun || sha256Hex_(str_(akun.Salt) + String(d.password || '').trim()) !== str_(akun.Password_Hash)) {
    c.put(fk, String(fails + 1), LOCK_MINUTES * 60);
    const left = MAX_LOGIN_FAIL - fails - 1;
    return fail(left > 0 ? 'Email atau password salah. Password awal adalah NISN (10 digit). Sisa percobaan: ' + left + '.' : 'Terlalu banyak percobaan. Coba lagi dalam ' + LOCK_MINUTES + ' menit.', { code: left > 0 ? 'WRONG' : 'LOCKED', left: left });
  }
  c.remove(fk);
  const t = siswaToken_(str_(akun.ID_Akun));
  return ok({ token: t.token, exp: t.exp, boot: siswaBootData_(akun) });
}

function apiSiswaBoot(ctx) {
  const akun = findAkun_(ctx.session.user);
  if (!akun) return fail('Akun tidak ditemukan.', { code: 'AUTH' });
  return ok(siswaBootData_(akun));
}

function apiSiswaPdf(ctx) {
  const akun = findAkun_(ctx.session.user);
  const r = akun && str_(akun.No_Pendaftaran) ? findRow_(akun.No_Pendaftaran) : null;
  if (!r) return fail('Formulir belum dikirim.');
  return ok(pdfPayload_(r));
}

function apiAkunUploadBukti(ctx, d) {
  const akun = findAkun_(ctx.session.user);
  if (!akun) return fail('Akun tidak ditemukan.', { code: 'AUTH' });
  if (str_(akun.Status_Bayar) === 'Terkonfirmasi') return fail('Pembayaran sudah dikonfirmasi panitia.');
  const j = BERKAS.bukti, mime = String(d.mime || '');
  if (j.mimes.indexOf(mime) === -1) return fail('Format bukti tidak didukung (JPG/PNG/PDF).');
  const bytes = Utilities.base64Decode(String(d.b64 || ''));
  if (!bytes.length) return fail('Berkas kosong.');
  if (bytes.length > j.max) return fail('Ukuran bukti melebihi 2 MB.');
  let folder;
  try { folder = DriveApp.getFolderById(str_(akun.Folder_ID)); } catch (e) { folder = taFolder_(str_(akun.Tahun_Ajaran)).createFolder('AKUN ' + str_(akun.NISN) + ' - ' + str_(akun.Nama)); }
  const file = folder.createFile(Utilities.newBlob(bytes, mime, j.file + (mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg')));
  const old = str_(akun.File_BuktiBayar);
  withLock_(function () {
    updateByKey_(SH.AKUN, 'ID_Akun', str_(akun.ID_Akun), { File_BuktiBayar: file.getId(), Waktu_Bukti: new Date(), Status_Bayar: 'Menunggu Konfirmasi', Catatan_Bayar: '', Folder_ID: folder.getId(), Diubah_Oleh: 'siswa', Diubah_Pada: new Date() });
    if (str_(akun.No_Pendaftaran)) updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', str_(akun.No_Pendaftaran), { File_BuktiBayar: file.getId(), Status_Bayar: 'Menunggu Konfirmasi', Diubah_Oleh: 'siswa', Diubah_Pada: new Date() });
    bump('data');
  });
  if (old && old !== file.getId()) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  queueLog(['BUKTI_BAYAR', str_(akun.No_Pendaftaran), str_(akun.ID_Akun) + ' · ' + str_(akun.Nama)]);
  invalidateRows(SH.AKUN);
  return ok(siswaBootData_(findAkun_(akun.ID_Akun)));
}

function apiSiswaGantiPassword(ctx, d) {
  const akun = findAkun_(ctx.session.user);
  if (!akun) return fail('Akun tidak ditemukan.', { code: 'AUTH' });
  if (sha256Hex_(str_(akun.Salt) + String(d.old || '').trim()) !== str_(akun.Password_Hash)) return fail('Password lama salah.');
  const nw = String(d.new || '');
  if (nw.length < 6) return fail('Password baru minimal 6 karakter.');
  const salt = Utilities.getUuid();
  updateByKey_(SH.AKUN, 'ID_Akun', str_(akun.ID_Akun), { Password_Hash: sha256Hex_(salt + nw), Salt: salt, Password_Diganti: 'Ya', Diubah_Oleh: 'siswa', Diubah_Pada: new Date() });
  PropertiesService.getScriptProperties().setProperty('REVS_' + str_(akun.ID_Akun), String(Date.now() - 1));
  bump('data');
  const t = siswaToken_(str_(akun.ID_Akun));
  return ok({ token: t.token, exp: t.exp });
}

// ---- Admin: akun & pembayaran ----
function apiGetBuktiAkun(ctx, d) {
  const akun = findAkun_(d.id);
  if (!akun || !str_(akun.File_BuktiBayar)) return fail('Bukti pembayaran belum diunggah.');
  const b = DriveApp.getFileById(str_(akun.File_BuktiBayar)).getBlob();
  return ok({ b64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType(), name: b.getName() });
}
function apiSetBayarAkun(ctx, d) {
  const akun = findAkun_(d.id);
  if (!akun) return fail('Akun tidak ditemukan.');
  if (['Menunggu Konfirmasi', 'Terkonfirmasi', 'Ditolak'].indexOf(d.value) === -1) return fail('Status tidak valid.');
  const note = String(d.note || '').trim();
  if (d.value === 'Ditolak' && !note) return fail('Tuliskan alasan penolakan (tampil di akun siswa).');
  if (d.value === 'Terkonfirmasi' && !str_(akun.File_BuktiBayar)) return fail('Belum ada bukti pembayaran.');
  const st = stamp_(ctx);
  updateByKey_(SH.AKUN, 'ID_Akun', str_(akun.ID_Akun), Object.assign({ Status_Bayar: d.value, Catatan_Bayar: d.value === 'Ditolak' ? note : '' }, st));
  if (str_(akun.No_Pendaftaran)) updateByKey_(SH.PENDAFTAR, 'No_Pendaftaran', str_(akun.No_Pendaftaran), Object.assign({ Status_Bayar: d.value }, st));
  bump('data');
  queueLog(['BAYAR_AKUN', str_(akun.No_Pendaftaran), str_(akun.ID_Akun) + ' · ' + d.value + (note ? ' | ' + note : '')]);
  return ok({ id: str_(akun.ID_Akun), value: d.value, note: note });
}
function apiResetPasswordSiswa(ctx, d) {
  const akun = findAkun_(d.id);
  if (!akun) return fail('Akun tidak ditemukan.');
  const salt = Utilities.getUuid();
  updateByKey_(SH.AKUN, 'ID_Akun', str_(akun.ID_Akun), Object.assign({ Password_Hash: sha256Hex_(salt + padDigits_(akun.NISN, 10)), Salt: salt, Password_Diganti: 'Tidak' }, stamp_(ctx)));
  PropertiesService.getScriptProperties().setProperty('REVS_' + str_(akun.ID_Akun), String(Date.now()));
  bump('data');
  queueLog(['RESET_PASSWORD_SISWA', '', str_(akun.ID_Akun)]);
  return ok({ id: str_(akun.ID_Akun) }, { message: 'Password dikembalikan ke NISN.' });
}

// ---- Admin: foto slideshow beranda ----
function apiUploadSlide(ctx, d) {
  const mime = String(d.mime || '');
  if (['image/png', 'image/jpeg', 'image/webp'].indexOf(mime) === -1) return fail('Format gambar tidak didukung.');
  const bytes = Utilities.base64Decode(String(d.b64 || ''));
  if (bytes.length > 3 * 1048576) return fail('Ukuran foto maksimal 3 MB.');
  if (slideIds_(getSettings_()).length >= MAX_SLIDES) return fail('Maksimal ' + MAX_SLIDES + ' foto slideshow.');
  const file = DriveApp.getFolderById(CONFIG.ASET_FOLDER_ID).createFile(Utilities.newBlob(bytes, mime, 'slide_' + fmtDate_(new Date(), 'yyyyMMdd_HHmmss')));
  let shared = true;
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { shared = false; }
  withLock_(function () { setSettings_({ hero_slides: slideIds_(getFreshSettings_()).concat([file.getId()]).join(',') }); });
  queueLog(['SLIDE_TAMBAH', '', file.getId()]);
  return ok({ slides: assets_(getSettings_()).slides }, shared ? {} : { message: 'Tersimpan, tetapi Drive menolak berbagi publik (kebijakan domain). Foto mungkin tidak tampil.' });
}
function apiDeleteSlide(ctx, d) {
  const ids = slideIds_(getFreshSettings_());
  if (ids.indexOf(d.id) === -1) return fail('Foto tidak ditemukan.');
  setSettings_({ hero_slides: ids.filter(function (x) { return x !== d.id; }).join(',') });
  try { DriveApp.getFileById(d.id).setTrashed(true); } catch (e) {}
  queueLog(['SLIDE_HAPUS', '', d.id]);
  return ok({ slides: assets_(getSettings_()).slides });
}
function apiOrderSlides(ctx, d) {
  const ids = slideIds_(getFreshSettings_());
  const baru = (d.ids || []).filter(function (x) { return ids.indexOf(x) > -1; });
  ids.forEach(function (x) { if (baru.indexOf(x) === -1) baru.push(x); });
  setSettings_({ hero_slides: baru.join(',') });
  return ok({ slides: assets_(getSettings_()).slides });
}
/** Baca pengaturan langsung dari sheet (bukan cache) — untuk operasi baca-ubah-tulis */
function getFreshSettings_() {
  invalidateRows(SH.PENGATURAN);
  const o = {};
  readSheet(SH.PENGATURAN).forEach(function (r) { o[String(r.Kunci)] = str_(r.Nilai); });
  return o;
}

function sendCredentials_(a) {
  try {
    const s = getSettings_();
    const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0F1E33">' +
      '<div style="background:#004A87;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><div style="font-size:12px;opacity:.85">' + esc_(s.nama_sekolah) + '</div>' +
      '<div style="font-size:19px;font-weight:bold;margin-top:4px">Akun PPDB Anda Telah Dibuat</div></div>' +
      '<div style="border:1px solid #DCE5EF;border-top:0;padding:20px;border-radius:0 0 12px 12px">' +
      '<p>Halo <b>' + esc_(a.Nama) + '</b>, berikut data masuk akun PPDB Anda:</p>' +
      '<table style="background:#F4F8FC;border-radius:10px;padding:12px;width:100%;font-size:14px"><tr><td style="color:#5B6B80;width:110px">Username</td><td><b>' + esc_(a.Email) + '</b></td></tr>' +
      '<tr><td style="color:#5B6B80">Password</td><td><b>NISN Anda (10 digit)</b></td></tr></table>' +
      '<p style="margin-top:16px"><b>Langkah selanjutnya:</b></p><ol style="padding-left:18px;line-height:1.6">' +
      '<li>Transfer biaya formulir <b>' + rupiah_(s.biaya_formulir) + '</b> ke ' + esc_(s.bank_nama) + ' <b>' + esc_(s.bank_norek) + '</b> a.n. ' + esc_(s.bank_atas_nama) + '.</li>' +
      '<li>Masuk ke akun lalu unggah bukti pembayaran (bila belum).</li><li>Isi formulir pendaftaran dan unggah berkas.</li></ol>' +
      '<p style="background:#FFF8DB;border-radius:10px;padding:10px;font-size:13px">Demi keamanan, ganti password di menu Akun setelah masuk.</p>' +
      '<p style="font-size:13px">Bantuan: WhatsApp panitia <b>' + esc_(s.kontak_wa) + '</b></p></div></div>';
    MailApp.sendEmail({ to: a.Email, subject: 'Akun PPDB ' + s.nama_sekolah + ' – ' + a.ID_Akun, htmlBody: html, name: 'PPDB ' + s.nama_sekolah });
    return true;
  } catch (e) { Logger.log(e); return false; }
}

// =====================================================================
// 16. SETUP — jalankan SATU KALI dari editor
// =====================================================================
function setupAwal() { return setupAppEnvironment(); }

function setupAppEnvironment() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SPREADSHEET_ID')) {
    Logger.log('⚠️ Setup sudah pernah dijalankan. Spreadsheet: https://docs.google.com/spreadsheets/d/' + props.getProperty('SPREADSHEET_ID'));
    Logger.log('   Bila ingin setup ulang, hapus Script Properties lebih dulu (Project Settings → Script Properties).');
    return;
  }
  Logger.log('🚀 Memulai setup ' + APP_NAME + '...');
  const root = DriveApp.createFolder('📁 ' + APP_NAME);
  const aset = root.createFolder('Aset Tampilan');
  const berkas = root.createFolder('Berkas Pendaftar');
  const ekspor = root.createFolder('Ekspor');
  const backup = root.createFolder('Backup');

  const ss = SpreadsheetApp.create('🗃️ DB_PPDB_Triguna1956');
  DriveApp.getFileById(ss.getId()).moveTo(root);
  ss.setSpreadsheetTimeZone(TZ);

  const style = function (sh, n, color) {
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground(color || '#004A87').setFontColor('#ffffff');
  };

  // AppConfig
  const cfg = ss.getSheets()[0].setName(SH.APPCONFIG);
  cfg.getRange(1, 1, 9, 3).setValues([
    ['key', 'value', 'keterangan'],
    ['APP_NAME', APP_NAME, 'Nama aplikasi'],
    ['SPREADSHEET_ID', ss.getId(), 'Spreadsheet database ini'],
    ['ROOT_FOLDER_ID', root.getId(), 'Folder utama di Drive'],
    ['BERKAS_FOLDER_ID', berkas.getId(), 'Berkas pendaftar (privat)'],
    ['ASET_FOLDER_ID', aset.getId(), 'Logo, favicon, background (publik)'],
    ['EXPORT_FOLDER_ID', ekspor.getId(), 'Hasil ekspor'],
    ['BACKUP_FOLDER_ID', backup.getId(), 'Salinan backup database'],
    ['CREATED_AT', new Date().toISOString(), 'Tanggal setup']
  ]);
  style(cfg, 3);

  // Pendaftar — semua kolom teks agar 0 di depan tidak hilang
  const p = ss.insertSheet(SH.PENDAFTAR);
  p.getRange(1, 1, 1, PENDAFTAR_HEADERS.length).setValues([PENDAFTAR_HEADERS]);
  p.getRange(1, 1, p.getMaxRows(), PENDAFTAR_HEADERS.length).setNumberFormat('@');
  [PENDAFTAR_HEADERS.indexOf('Timestamp') + 1, PENDAFTAR_HEADERS.indexOf('Diubah_Pada') + 1].forEach(function (c) {
    p.getRange(2, c, p.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  });
  style(p, PENDAFTAR_HEADERS.length);
  p.getRange(1, 1, 1, META_FIELDS.length).setBackground('#00305A');

  // Pengaturan
  const salt = Utilities.getUuid();
  const seedRows = Object.keys(SEED).map(function (k) {
    let v = SEED[k][0];
    if (k === 'admin_password_hash') v = sha256Hex_(salt + DEFAULT_PASSWORD);
    if (k === 'admin_salt') v = salt;
    return [k, v, SEED[k][1]];
  });
  const st = ss.insertSheet(SH.PENGATURAN);
  st.getRange(1, 1, 1, 3).setValues([['Kunci', 'Nilai', 'Keterangan']]);
  st.getRange(1, 1, seedRows.length + 1, 3).setNumberFormat('@');
  st.getRange(2, 1, seedRows.length, 3).setValues(seedRows);
  style(st, 3);

  // Jadwal
  const jd = ss.insertSheet(SH.JADWAL);
  const jh = ['Urutan', 'Kegiatan', 'Tanggal_Mulai', 'Tanggal_Selesai', 'Keterangan'];
  jd.getRange(1, 1, 50, 5).setNumberFormat('@');
  jd.getRange(1, 1, 6, 5).setValues([jh,
    ['1', 'Pendaftaran Dibuka', '2027-01-15', '2027-06-30', 'Pendaftaran online 24 jam'],
    ['2', 'Verifikasi Berkas & Pembayaran', '2027-01-16', '2027-07-03', 'Dilakukan bertahap oleh panitia'],
    ['3', 'Pengumuman Hasil Seleksi', '2027-07-06', '2027-07-06', 'Lihat di menu Cek Status'],
    ['4', 'Daftar Ulang', '2027-07-07', '2027-07-12', 'Datang ke sekolah membawa berkas asli'],
    ['5', 'Masa Pengenalan Lingkungan Sekolah', '2027-07-14', '2027-07-16', '']]);
  style(jd, 5);

  // Konten
  const kt = ss.insertSheet(SH.KONTEN);
  kt.getRange(1, 1, 100, 4).setNumberFormat('@');
  const konten = [['Bagian', 'Urutan', 'Judul', 'Isi'],
    ['Syarat', '1', 'Pas Foto', 'Foto berwarna terbaru, latar polos (JPG/PNG, maks 1 MB).'],
    ['Syarat', '2', 'Scan Kartu Keluarga', 'Scan/foto KK yang jelas (PDF/JPG, maks 2 MB).'],
    ['Syarat', '3', 'Scan Rapor Kelas 9', 'Gabungkan halaman rapor semester 1–5 dalam satu PDF (maks 5 MB).'],
    ['Syarat', '4', 'Ijazah / SKL', 'Ijazah SMP atau Surat Keterangan Lulus sementara (maks 2 MB).'],
    ['Syarat', '5', 'Bukti Pembayaran Formulir', 'Bukti transfer biaya formulir (maks 2 MB).'],
    ['Alur', '1', 'Bayar Formulir', 'Transfer biaya formulir ke rekening sekolah.'],
    ['Alur', '2', 'Isi Formulir Online', 'Lengkapi data siswa, alamat, dan orang tua/wali.'],
    ['Alur', '3', 'Unggah Berkas', 'Unggah 5 berkas wajib termasuk bukti bayar.'],
    ['Alur', '4', 'Terima Email & PDF', 'Bukti pendaftaran dikirim otomatis ke email.'],
    ['Alur', '5', 'Verifikasi Panitia', 'Panitia memeriksa berkas dan pembayaran.'],
    ['Alur', '6', 'Pengumuman & Daftar Ulang', 'Pantau hasil di menu Cek Status lalu daftar ulang.'],
    ['FAQ', '1', 'Apakah bisa mengubah data setelah dikirim?', 'Tidak. Bila ada kesalahan, hubungi panitia melalui WhatsApp.'],
    ['FAQ', '2', 'Saya lupa nomor pendaftaran.', 'Cek email bukti pendaftaran atau hubungi panitia.'],
    ['Daftar Ulang', '1', 'Waktu & Tempat', 'Sesuai jadwal Daftar Ulang, di ruang Tata Usaha sekolah.'],
    ['Daftar Ulang', '2', 'Berkas yang Dibawa', 'Bukti pendaftaran (PDF), KK asli, akta kelahiran asli, ijazah/SKL asli, pas foto 3×4 (2 lembar).']];
  kt.getRange(1, 1, konten.length, 4).setValues(konten);
  style(kt, 4);

  // Referensi (pilihan dropdown, bisa diedit langsung di sheet)
  const ref = ss.insertSheet(SH.REFERENSI);
  const R = {
    Agama: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu', 'Lainnya'],
    Jenis_Tinggal: ['Bersama orang tua', 'Wali', 'Kos', 'Asrama', 'Panti Asuhan', 'Lainnya'],
    Alat_Transportasi: ['Jalan kaki', 'Kendaraan pribadi', 'Kendaraan umum/angkot', 'Jemputan sekolah', 'Kereta api', 'Ojek', 'Lainnya'],
    Pendidikan: ['Tidak sekolah', 'SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3'],
    Pekerjaan: ['Tidak bekerja', 'Nelayan', 'Petani', 'Peternak', 'PNS/TNI/Polri', 'Karyawan Swasta', 'Pedagang Kecil', 'Pedagang Besar', 'Wiraswasta', 'Wirausaha', 'Buruh', 'Pensiunan', 'Lainnya'],
    Penghasilan: ['Tidak berpenghasilan', 'Kurang dari Rp 500.000', 'Rp 500.000 - Rp 999.999', 'Rp 1.000.000 - Rp 1.999.999', 'Rp 2.000.000 - Rp 4.999.999', 'Rp 5.000.000 - Rp 20.000.000', 'Lebih dari Rp 20.000.000']
  };
  const refRows = [['Jenis', 'Nilai']];
  Object.keys(R).forEach(function (j) { R[j].forEach(function (v) { refRows.push([j, v]); }); });
  ref.getRange(1, 1, refRows.length, 2).setNumberFormat('@').setValues(refRows);
  style(ref, 2);

  // Log
  const lg = ss.insertSheet(SH.LOG);
  lg.getRange(1, 1, 1, 5).setValues([['Log_ID', 'Waktu', 'Aksi', 'No_Pendaftaran', 'Detail']]);
  style(lg, 5, '#5B6B80');

  props.setProperties({
    SPREADSHEET_ID: ss.getId(), ROOT_FOLDER_ID: root.getId(), BERKAS_FOLDER_ID: berkas.getId(),
    ASET_FOLDER_ID: aset.getId(), EXPORT_FOLDER_ID: ekspor.getId(), BACKUP_FOLDER_ID: backup.getId()
  });
  _SS = ss;
  upgradeSchema_();                                            // sheet Akun & kolom versi terbaru
  secret_();
  try { installTriggers_(); Logger.log('✅ Trigger log (5 menit) & backup mingguan aktif.'); }
  catch (e) { Logger.log('⚠️ Trigger belum terpasang: ' + e.message + ' — aktifkan dari menu Backup & Migrasi.'); }

  Logger.log('');
  Logger.log('✅ Setup selesai!');
  Logger.log('   Spreadsheet  : ' + ss.getUrl());
  Logger.log('   Folder Drive : ' + root.getUrl());
  Logger.log('   Login admin  : admin / ' + DEFAULT_PASSWORD + '  (wajib diganti saat login pertama)');
  Logger.log('   Lanjut: Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)');
}

/** Lupa password admin? Jalankan fungsi ini dari editor Apps Script → password kembali ke bawaan. */
function resetPasswordAdmin() {
  const salt = Utilities.getUuid();
  setSettings_({ admin_username: 'admin', admin_password_hash: sha256Hex_(salt + DEFAULT_PASSWORD), admin_salt: salt, admin_password_default: '1' });
  PropertiesService.getScriptProperties().setProperty('REV_ADMIN', String(Date.now()));
  CacheService.getScriptCache().remove('login_fail');
  Logger.log('✅ Login admin direset ke  admin / ' + DEFAULT_PASSWORD + '  — segera ganti setelah login.');
}

/** Uji cepat dari editor: memastikan email & PDF berfungsi (kirim ke akun pemilik). */
function ujiEmailPdf() {
  const me = Session.getEffectiveUser().getEmail();
  const r = { No_Pendaftaran: 'PPDB-UJI-0000', Nama: 'SISWA UJI COBA', Tahun_Ajaran: getSettings_().tahun_ajaran, Timestamp: new Date(), Email: me,
    Status_Berkas: 'Menunggu Verifikasi', Status_Bayar: 'Menunggu Konfirmasi', Jenis_Kelamin: 'L' };
  const pdf = buildPdf_(r);
  const res = sendConfirmation_(r, pdf);
  Logger.log(res.ok ? '✅ Email uji terkirim ke ' + me : '❌ Gagal: ' + res.error);
}
