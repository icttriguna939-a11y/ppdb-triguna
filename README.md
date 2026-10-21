# PPDB Online — SMA Triguna 1956 Jakarta

Portal Penerimaan Peserta Didik Baru (v2): beranda slideshow, buat akun siswa → bayar & unggah bukti → login (email + NISN) → isi formulir 6 langkah dengan unggah berkas, bukti PDF via email, cek status, dan panel admin (verifikasi, dasbor, ekspor Dapodik, pengaturan tampilan, backup & migrasi). Tersedia Mode Terang & Mode Gelap.

- **Frontend**: HTML/CSS/JS murni (tanpa framework), di-hosting GitHub Pages.
- **Backend**: Google Apps Script sebagai REST API (`Kode.gs`, dipasang terpisah) + Google Sheets, Drive, Gmail.

Mulai dari **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**. Satu-satunya file yang perlu diubah adalah `js/config.js` (isi `GAS_URL`). Tanpa `GAS_URL`, situs berjalan dalam mode demo.

| File | Fungsi |
|---|---|
| `index.html` | Kerangka halaman + penerapan tema tanpa kedipan |
| `css/style.css` | Seluruh gaya, token warna Mode Terang & Mode Gelap |
| `js/config.js` | Alamat backend (`GAS_URL`) |
| `js/core.js` | API (timeout, retry, anti-dobel), cache instan, tema, router |
| `js/public.js` | Beranda (slideshow), jadwal, persyaratan, kontak, cek status |
| `js/siswa.js` | Daftar akun, pembayaran, login siswa, Akun Saya, formulir pendaftaran |
| `js/admin.js` | Panel admin (dimuat hanya saat membuka `#/admin`) |
| `js/icons.js` | Subset Material Design Icons (Apache 2.0) |
| `js/demo.js` | Data contoh untuk mode demo (dimuat hanya saat demo) |
