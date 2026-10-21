# Panduan Instalasi — PPDB Online SMA Triguna 1956 Jakarta

Aplikasi ini terdiri dari **dua bagian** yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` (satu file) | Google Apps Script — akun Google **sekolah** |
| **Frontend** | Folder ini (`index.html`, `css/`, `js/`, `img/`) | GitHub Pages (gratis) |

Urutan pemasangan: **Backend dulu → salin URL → Frontend**.

> 💡 Sebelum backend dipasang pun, frontend sudah bisa dicoba dalam **MODE DEMO** (data contoh). Buka `index.html` lewat GitHub Pages; label kuning "MODE DEMO" muncul di pojok kiri bawah. Login admin demo: `admin` / `triguna1956`.

---

## BAGIAN A — Backend (Google Apps Script)

1. Masuk ke akun Google **resmi sekolah** (bukan akun pribadi), lalu buka https://script.google.com → **Proyek baru**.
2. Ganti nama proyek menjadi `PPDB Triguna 1956`.
3. Hapus semua isi file `Code.gs`, lalu **tempel seluruh isi `Kode.gs`**. Tekan **Simpan** (ikon disket).
4. *(Disarankan)* ⚙️ **Project Settings** → *Time zone* → pilih **(GMT+07:00) Jakarta**.
5. Pada daftar fungsi di toolbar, pilih **`setupAwal`** → klik **▶ Run**.
   - Muncul "Authorization required" → **Review permissions** → pilih akun sekolah → **Advanced** → **Go to PPDB Triguna 1956 (unsafe)** → **Allow**. (Peringatan ini normal untuk script buatan sendiri.)
   - Tunggu sampai **Execution log** menampilkan `✅ Setup selesai!`
   - Di Google Drive kini ada folder **📁 PPDB Online SMA Triguna 1956** berisi spreadsheet `DB_PPDB_Triguna1956` dan folder `Aset Tampilan`, `Berkas Pendaftar`, `Ekspor`, `Backup`.
   - ⚠️ **Jalankan `setupAwal` hanya SEKALI.** Bila dijalankan lagi, script hanya menampilkan peringatan dan tidak membuat duplikat.
6. *(Opsional)* Uji email & PDF: pilih fungsi **`ujiEmailPdf`** → ▶ Run. Email uji dengan lampiran PDF masuk ke akun sekolah.
7. **Deploy → New deployment** → ikon ⚙️ → **Web app**:
   - *Description*: `v1`
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Klik **Deploy** → salin **Web app URL** (berakhiran `/exec`).

> Untuk pembaruan kode berikutnya, **JANGAN** pilih "New deployment" (URL akan berubah dan situs berhenti bekerja). Gunakan **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.

---

## BAGIAN B — Frontend (GitHub Pages)

### B1. Isi alamat backend

Buka file **`js/config.js`** dengan Notepad, lalu tempel URL dari langkah A7:

```js
GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

Simpan file.

### B2. Pastikan foldernya benar (langkah paling penting)

Folder hasil ekstrak ZIP **inilah** folder proyek, tempat perintah `git init` dijalankan. Isinya harus seperti ini:

```
ppdb-triguna/            ← jalankan git di SINI
├── index.html           ← harus terlihat langsung di sini
├── PANDUAN-INSTALASI.md
├── README.md
├── css/style.css
├── js/  (config.js, core.js, public.js, admin.js, icons.js, demo.js)
└── img/ (logo-triguna.png, favicon.png)
```

Jangan menaruh `Kode.gs` di folder ini — file itu hanya untuk Apps Script.

### B3. Unggah ke GitHub

Sekali saja per komputer: pasang Git (https://git-scm.com/download/win) dan buat akun di https://github.com.

1. Di github.com: **+** → **New repository** → nama mis. `ppdb-triguna` → **Public** → **jangan** centang README → **Create repository**.
2. Buka folder proyek di File Explorer → klik address bar → ketik `powershell` → Enter.
3. Pastikan posisinya benar: ketik `dir`. Baris `index.html` **harus** terlihat. Bila yang terlihat justru folder lain, masuk dulu ke folder yang berisi `index.html`.
4. Jalankan satu per satu:

```powershell
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
git init
git add .
git commit -m "Upload pertama PPDB Online"
git branch -M main
git remote add origin https://github.com/USERNAME/ppdb-triguna.git
git push -u origin main
```

   - Saat diminta **Password**, tempel **Personal Access Token**, bukan password akun. Buat token di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
   - Saat menempel token, layar memang **tidak menampilkan apa pun**. Itu normal; tekan Enter.
5. Di repository GitHub: **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save**. Centang **Enforce HTTPS**.
6. Tunggu 1–2 menit. Situs aktif di `https://USERNAME.github.io/ppdb-triguna/`.

**Update berikutnya** (setelah mengubah file):

```powershell
git add .
git commit -m "Perbarui tampilan"
git push
```

Bila browser masih menampilkan versi lama, tekan **Ctrl+Shift+R**. Bila file JS diubah, naikkan juga `VERSION` di `js/config.js` dan angka `?v=` di `index.html`.

---

## BAGIAN C — Pengaturan Awal Setelah Online

1. Buka situs → footer **Login Admin** (atau `…/#/admin`).
2. Login dengan `admin` / `triguna1956` → aplikasi langsung membuka **Akun Admin** → **ganti password** (minimal 8 karakter).
3. **Pengaturan Tampilan**: unggah logo sekolah, logo yayasan, favicon, dan foto latar beranda. Pilih tema default pengunjung.
4. **Konten & Pendaftaran**:
   - *Biaya & Rekening*: isi biaya formulir, nama bank, nomor rekening, dan atas nama.
   - *Jadwal*: isi tanggal resmi PPDB.
   - *Kontak & Lokasi*: isi WhatsApp panitia, telepon, email, alamat, dan link sematan Google Maps.
   - *Teks & Identitas*: judul beranda dan jabatan penanda tangan PDF.
   - Terakhir, tab *Pendaftaran*: atur Tahun Ajaran, nyalakan **BUKA**, lalu **Simpan**.
   - (Bawaan setelah setup: pendaftaran **TUTUP**, agar tidak ada yang mendaftar sebelum rekening & jadwal benar.)
5. **Uji coba**: daftarkan 1–2 siswa uji dari HP → cek email & PDF → proses statusnya di admin → coba **Ekspor Dapodik**.
6. Hapus data uji: buka spreadsheet `DB_PPDB_Triguna1956` → sheet `Pendaftar` → hapus barisnya (folder berkasnya ada di Drive `Berkas Pendaftar`).

---

## BAGIAN D — Backup & Migrasi Data

Menu **Backup & Migrasi** di panel admin:

- **Backup otomatis** setiap Senin 01.00 WIB; 12 salinan otomatis terbaru disimpan di folder Drive `Backup`. Bila statusnya "belum aktif", tekan **Aktifkan**.
- **Backup Sekarang**: buat salinan manual sebelum perubahan besar. Salinan manual tidak pernah dihapus otomatis.
- **Pulihkan dari backup**:
  1. Tekan **Pulihkan…** pada backup yang dipilih.
  2. Centang data yang ingin dipulihkan → **Pindai** → periksa laporannya → **Jalankan Impor**.
  3. Centang **Timpa** bila isian lama juga ingin dikembalikan.
- **Migrasi dari aplikasi/spreadsheet lama** (mis. PPDB tahun lalu atau rekap Excel yang diunggah ke Google Sheets):
  1. Pastikan spreadsheet sumber bisa dibuka oleh **akun Google yang sama** dengan pemilik script. Dengan begitu file Drive lama tetap terbaca.
  2. Tempel URL-nya → isi nama sheet bila bukan `Pendaftar` → **Pindai (Dry-run)**. Belum ada yang ditulis pada tahap ini.
  3. Periksa laporan (ditambah / diperbarui / dilewati) dan catatan → **Jalankan Impor**.
  4. Impor **aman diulang**: data yang sudah ada tidak digandakan.
  5. Header kolom lama dicocokkan otomatis, mis. "Nama Lengkap" → Nama, "No HP" → HP, "Asal Sekolah" → Sekolah_Asal.
  6. NISN/NIK yang kehilangan angka 0 di depan dipulihkan otomatis.
- **Cutover** (pindah dari app lama ke app ini): impor sekali, cek hasilnya, lalu **tepat sebelum pindah** jalankan impor lagi dengan centang **Sinkron status (delta)**. Setelah itu umumkan alamat baru.

Batasan yang perlu diketahui:
- Akun & password admin **tidak pernah** ikut diimpor.
- Impor tidak menghapus data di aplikasi ini; hanya menambah dan memperbarui.
- Spreadsheet sumber hanya dibaca, tidak pernah diubah.

---

## BAGIAN E — Kecepatan & Keandalan

- Data beranda dan panel admin disimpan sementara di perangkat, sehingga **pindah menu tanpa menunggu server**. Data disegarkan otomatis di latar belakang.
- Setiap kirim data memakai nomor permintaan unik. Bila koneksi HP putus lalu dicoba ulang, **tidak terjadi data ganda**.
- Pertama kali dibuka setelah lama tidak dipakai, server Google perlu 2–4 detik untuk "bangun". Aplikasi otomatis "membangunkan" server saat halaman dibuka.
- Untuk melihat waktu respons: buka Console browser (F12) lalu ketik `Perf.table()`, atau lihat kartu **Performa** di menu Akun Admin.

---

## BAGIAN F — Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Masih muncul label "MODE DEMO" | `GAS_URL` di `js/config.js` belum diisi / belum di-push. Isi, lalu `git add . → commit → push`. |
| "Server belum di-setup" | `setupAwal` belum dijalankan di Apps Script. |
| Data tidak muncul, error koneksi | URL `/exec` salah, atau deployment bukan *Who has access: Anyone*. |
| Setelah update kode, situs error | Anda membuat *New deployment* (URL baru). Pakai URL baru di `config.js`, atau ulangi lewat *Manage deployments → Edit → New version*. |
| Situs GitHub Pages 404 | `index.html` tidak berada di root repository (salah folder saat `git init`). Ulangi dari folder yang berisi `index.html`, lalu `git push --force`. |
| Halaman tampil tanpa warna/gaya | Folder `css/`/`js/` tidak ikut. Selalu unggah lewat `git`, bukan "Upload files" di web GitHub. |
| Logo/latar dari admin tidak tampil | Kebijakan Google Workspace sekolah melarang berbagi "siapa saja yang punya link". Minta admin Workspace mengizinkan untuk folder `Aset Tampilan`, atau biarkan logo bawaan. |
| Email tidak terkirim | Kuota Gmail habis (akun biasa ±100/hari, Workspace ±1.500/hari). Pendaftaran tetap tersimpan; kirim ulang dari Detail Pendaftar. |
| Akun admin terkunci | 5× salah password → tunggu 15 menit. |
| Lupa password admin | Buka editor Apps Script → pilih fungsi **`resetPasswordAdmin`** → ▶ Run. Login kembali menjadi `admin` / `triguna1956`, lalu segera ganti. |
