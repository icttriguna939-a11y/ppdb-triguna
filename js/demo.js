/* =====================================================================
   demo.js — API tiruan untuk MODE DEMO (dimuat hanya bila GAS_URL kosong
   atau URL berisi ?demo=1). Data contoh disimpan di browser ini saja.
   ===================================================================== */
'use strict';
(function () {
  const KEY = 'ppdb:demo-db:v1';
  const tunda = (ms) => new Promise((r) => setTimeout(r, ms));
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const svgFoto = (n, c) => btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${c}"/><circle cx="150" cy="150" r="70" fill="#fff" opacity=".85"/><rect x="60" y="240" width="180" height="160" rx="80" fill="#fff" opacity=".85"/><text x="150" y="385" font-size="28" text-anchor="middle" fill="#00305A" font-family="Arial">${n}</text></svg>`);
  const PDF = btoa('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj 4 0 obj<</Length 120>>stream\nBT /F1 18 Tf 60 760 Td (BUKTI PENDAFTARAN PPDB - MODE DEMO) Tj 0 -30 Td /F1 12 Tf (Dokumen contoh. Di server asli PDF berisi data lengkap.) Tj ET\nendstream endobj 5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

  const NAMA = ['RAIHAN ARYA PRATAMA', 'AMANDA SYIFA MAHARANI', 'FARHAN DWI PUTRA', 'NABILA PUTRI AZZAHRA', 'KEVIN JONATHAN SIMANJUNTAK', 'MUHAMMAD RIZKY PRATAMA', 'SALSABILA KHAIRUNNISA', 'DIMAS ANGGORO', 'AURELIA PUTRI', 'BAGAS SAPUTRA',
    'CINDY LARASATI', 'YOGA PRASETYO', 'NADIA RAHMAWATI', 'ILHAM MAULANA', 'PUTRI AYU LESTARI', 'ARDIANSYAH', 'KEZIA NATALIA', 'FAJAR NUGROHO', 'ZAHRA AULIA', 'REZA MAHENDRA', 'TIARA ANINDITA', 'ADITYA WICAKSONO'];
  const SEK = ['SMP Negeri 19 Jakarta', 'SMP Labschool Kebayoran', 'SMP Negeri 11 Jakarta', 'SMP Al-Azhar Pusat', 'SMP Tarakanita 1', 'SMP Negeri 13 Jakarta', 'SMP Negeri 19 Jakarta', 'SMP Negeri 11 Jakarta'];
  function seed() {
    const list = [], rows = {};
    NAMA.forEach((n, i) => {
      const t = new Date(today.getTime() - (21 - i) * 864e5 * 0.9 - (i % 3) * 3600e3);
      const no = 'PPDB-2027-' + String(i + 1).padStart(4, '0');
      const berkas = i < 10 ? 'Lengkap' : i < 14 ? 'Kurang' : 'Menunggu Verifikasi';
      const bayar = i < 9 ? 'Terkonfirmasi' : i === 9 ? 'Ditolak' : 'Menunggu Konfirmasi';
      const seleksi = i < 6 ? 'Diterima' : i === 6 ? 'Ditolak' : 'Dalam Proses';
      const r = { No_Pendaftaran: no, Timestamp: t.toISOString(), Tahun_Ajaran: '2027/2028', Status_Berkas: berkas, Status_Bayar: bayar, Status_Seleksi: seleksi, Catatan_Admin: berkas === 'Kurang' ? 'Scan KK buram, mohon kirim ulang via WhatsApp panitia.' : '', Rombel: seleksi === 'Diterima' ? 'X-' + ((i % 3) + 1) : '',
        Email_Terkirim: 'Ya', Nama: n, Jenis_Kelamin: i % 2 ? 'P' : 'L', NISN: '00' + (98234190 + i * 7919), NIK: '31740101' + String(10000001 + i * 37), Tempat_Lahir: 'Jakarta', Tanggal_Lahir: (today.getFullYear() - 15) + '-0' + ((i % 9) + 1) + '-1' + (i % 9),
        Agama: ['Islam', 'Kristen', 'Katholik', 'Islam'][i % 4], No_Akta_Lahir: '3174-LT-' + (100 + i), No_KK: '31740101' + String(20000001 + i), Anak_Ke: '1', Jml_Saudara: '2', Alamat: 'Jl. Melati No. ' + (i + 3), RT: '003', RW: '007', Dusun: '', Kelurahan: 'Cikini', Kecamatan: 'Menteng', Kode_Pos: '10330',
        Jenis_Tinggal: 'Bersama orang tua', Alat_Transportasi: 'Ojek', Telepon: '', HP: '08121234' + String(1000 + i), Email: 'ortu' + i + '@contoh.id', Ayah_Nama: 'BAMBANG PRATAMA', Ayah_NIK: '3174010101700001', Ayah_Pendidikan: 'D4/S1', Ayah_Pekerjaan: 'Karyawan Swasta', Ayah_Penghasilan: 'Rp 5.000.000 - Rp 20.000.000',
        Ibu_Nama: 'SITI AMINAH', Ibu_NIK: '3174010101750002', Ibu_Pendidikan: 'SMA/sederajat', Ibu_Pekerjaan: 'Wiraswasta', Ibu_Penghasilan: 'Rp 2.000.000 - Rp 4.999.999', Sekolah_Asal: SEK[i % SEK.length], No_Seri_Ijazah: '', Berat_Badan: '50', Tinggi_Badan: '160', Lingkar_Kepala: '54', Jarak_Rumah: '3.5' };
      rows[no] = r;
      list.push(no);
    });
    return {
      rows, order: list, logs: [], backups: [{ id: 'bk1', name: 'Backup DB PPDB ' + iso(new Date(today - 2 * 864e5)) + ' 0100 (otomatis)', url: '#', created: new Date(today - 2 * 864e5).toISOString() }],
      settings: { nama_sekolah: 'SMA Triguna 1956 Jakarta', nama_yayasan: 'Yayasan Pendidikan Triguna 1956', tahun_ajaran: '2027/2028', status_pendaftaran: 'BUKA', tanggal_buka: '', tanggal_tutup: '', biaya_formulir: '250000',
        bank_nama: 'Bank Contoh Syariah', bank_norek: '1270011956001', bank_atas_nama: 'Yayasan Pendidikan Triguna 1956', catatan_bayar: 'Cantumkan nama calon siswa pada berita transfer.', kontak_wa: '081200001956', kontak_telp: '(021) 7390 0000',
        kontak_email: 'ppdb@smatriguna1956.sch.id', alamat_sekolah: 'Jl. Contoh Raya No. 1956, Kebayoran Baru, Jakarta Selatan', maps_embed_url: '', maps_link: '', hero_judul: 'Selamat Datang di PPDB Online SMA Triguna 1956 Jakarta',
        hero_subjudul: 'Daftar dari rumah, tanpa antre, tanpa beli formulir di sekolah.', ttd_panitia: 'Ketua Panitia PPDB', tema_default: 'IKUTI_PERANGKAT', admin_username: 'admin', admin_password_default: '1' },
      assets: { logo_utama: '', logo_yayasan: '', logo_gelap: '', favicon: '', bg_hero: '' },
      jadwal: [['Pendaftaran Dibuka', -20, 40, 'Pendaftaran online 24 jam'], ['Verifikasi Berkas & Pembayaran', -19, 43, 'Dilakukan bertahap oleh panitia'], ['Pengumuman Hasil Seleksi', 46, 46, 'Lihat di menu Cek Status'], ['Daftar Ulang', 47, 52, 'Datang ke sekolah membawa berkas asli'], ['Masa Pengenalan Lingkungan Sekolah', 60, 62, '']]
        .map((j, i) => ({ Urutan: i + 1, Kegiatan: j[0], Tanggal_Mulai: iso(new Date(+today + j[1] * 864e5)), Tanggal_Selesai: iso(new Date(+today + j[2] * 864e5)), Keterangan: j[3] })),
      konten: [['Syarat', 'Pas Foto', 'Foto berwarna terbaru, latar polos (JPG/PNG, maks 1 MB).'], ['Syarat', 'Scan Kartu Keluarga', 'Scan/foto KK yang jelas (PDF/JPG, maks 2 MB).'], ['Syarat', 'Scan Rapor Kelas 9', 'Gabungkan halaman rapor semester 1–5 dalam satu PDF (maks 5 MB).'],
        ['Syarat', 'Ijazah / SKL', 'Ijazah SMP atau Surat Keterangan Lulus sementara (maks 2 MB).'], ['Syarat', 'Bukti Pembayaran Formulir', 'Bukti transfer biaya formulir (maks 2 MB).'],
        ['Alur', 'Bayar Formulir', 'Transfer biaya formulir ke rekening sekolah.'], ['Alur', 'Isi Formulir Online', 'Lengkapi data siswa, alamat, dan orang tua/wali.'], ['Alur', 'Unggah Berkas', 'Unggah 5 berkas wajib termasuk bukti bayar.'],
        ['Alur', 'Terima Email & PDF', 'Bukti pendaftaran dikirim otomatis ke email.'], ['Alur', 'Verifikasi Panitia', 'Panitia memeriksa berkas dan pembayaran.'], ['Alur', 'Pengumuman & Daftar Ulang', 'Pantau hasil di menu Cek Status lalu daftar ulang.'],
        ['FAQ', 'Apakah bisa mengubah data setelah dikirim?', 'Tidak. Bila ada kesalahan, hubungi panitia melalui WhatsApp.'], ['FAQ', 'Saya lupa nomor pendaftaran.', 'Cek email bukti pendaftaran atau hubungi panitia.'],
        ['Daftar Ulang', 'Waktu & Tempat', 'Sesuai jadwal Daftar Ulang, di ruang Tata Usaha sekolah.'], ['Daftar Ulang', 'Berkas yang Dibawa', 'Bukti pendaftaran (PDF), KK asli, akta kelahiran asli, ijazah/SKL asli, pas foto 3×4 (2 lembar).']]
        .map((k, i) => ({ Bagian: k[0], Urutan: i + 1, Judul: k[1], Isi: k[2] })),
      referensi: { Agama: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu', 'Lainnya'], Jenis_Tinggal: ['Bersama orang tua', 'Wali', 'Kos', 'Asrama', 'Panti Asuhan', 'Lainnya'],
        Alat_Transportasi: ['Jalan kaki', 'Kendaraan pribadi', 'Kendaraan umum/angkot', 'Jemputan sekolah', 'Kereta api', 'Ojek', 'Lainnya'], Pendidikan: ['Tidak sekolah', 'SD/sederajat', 'SMP/sederajat', 'SMA/sederajat', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3'],
        Pekerjaan: ['Tidak bekerja', 'Nelayan', 'Petani', 'Peternak', 'PNS/TNI/Polri', 'Karyawan Swasta', 'Pedagang Kecil', 'Pedagang Besar', 'Wiraswasta', 'Wirausaha', 'Buruh', 'Pensiunan', 'Lainnya'],
        Penghasilan: ['Tidak berpenghasilan', 'Kurang dari Rp 500.000', 'Rp 500.000 - Rp 999.999', 'Rp 1.000.000 - Rp 1.999.999', 'Rp 2.000.000 - Rp 4.999.999', 'Rp 5.000.000 - Rp 20.000.000', 'Lebih dari Rp 20.000.000'] },
      pass: 'triguna1956', reg: {}
    };
  }
  let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (!db || !db.rows) db = seed();
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, db, { reg: {} }))); } catch (e) { } };
  const ok = (data, extra) => Object.assign({ success: true, data, ms: 120 + Math.round(Math.random() * 180) }, extra || {});
  const fail = (message, data) => ({ success: false, message, data: data || null, ms: 90 });
  const status = () => { const s = db.settings; if (s.status_pendaftaran !== 'BUKA') return { open: false, reason: 'Pendaftaran sedang ditutup.' }; return { open: true, reason: '' }; };
  const LIST_F = ['No_Pendaftaran', 'Nama', 'Jenis_Kelamin', 'NISN', 'Sekolah_Asal', 'Status_Berkas', 'Status_Bayar', 'Status_Seleksi', 'Rombel', 'Email_Terkirim', 'Tahun_Ajaran', 'Timestamp'];
  const list = () => db.order.map((no) => { const r = db.rows[no], o = {}; LIST_F.forEach((k) => { o[k] = r[k] || ''; }); return o; });
  const boot = () => ({ list: list(), settings: db.settings, assets: db.assets, status: status(), jadwal: db.jadwal, konten: db.konten, referensi: db.referensi, v: Date.now() });
  const pub = () => { const s = Object.assign({}, db.settings); delete s.admin_username; delete s.admin_password_default; return { settings: s, assets: db.assets, status: status(), jadwal: db.jadwal, konten: db.konten, referensi: db.referensi }; };
  const log = (a, no, d) => { db.logs.unshift({ Waktu: new Date().toISOString(), Aksi: a, No_Pendaftaran: no || '', Detail: d || '' }); db.logs = db.logs.slice(0, 300); };
  const butuhAdmin = (t) => t === 'demo-token';
  const FILES = { foto: 'Pas Foto', kk: 'Scan Kartu Keluarga', rapor: 'Scan Rapor Kelas 9', ijazah: 'Ijazah / SKL', bukti: 'Bukti Pembayaran' };
  const H = {
    ping: () => ok({}),
    publicBoot: () => ok(pub()),
    regInit: (d) => {
      if (!status().open) return fail('Pendaftaran sedang ditutup.', { code: 'CLOSED' });
      const f = d.form || {};
      const dup = Object.values(db.rows).find((r) => r.NISN === f.NISN || r.NIK === f.NIK);
      if (dup) return fail('Data sudah terdaftar dengan nomor ' + dup.No_Pendaftaran + '.', { code: 'DUPLICATE', no: dup.No_Pendaftaran });
      const key = Math.random().toString(36).slice(2); db.reg[key] = { form: f, files: {} }; return ok({ key });
    },
    regUpload: (d) => { const r = db.reg[d.key]; if (!r) return fail('Sesi kedaluwarsa.', { code: 'EXPIRED' }); r.files[d.jenis] = { mime: d.mime, b64: d.mime.startsWith('image/') && d.b64.length < 400000 ? d.b64 : '' }; return ok({ jenis: d.jenis }); },
    regFinalize: (d) => {
      const r = db.reg[d.key]; if (!r) return fail('Sesi kedaluwarsa.', { code: 'EXPIRED' });
      const no = 'PPDB-2027-' + String(db.order.length + 1).padStart(4, '0');
      const f = r.form;
      db.rows[no] = Object.assign({}, f, { Nama: String(f.Nama).toUpperCase(), No_Pendaftaran: no, Timestamp: new Date().toISOString(), Tahun_Ajaran: db.settings.tahun_ajaran, Status_Berkas: 'Menunggu Verifikasi', Status_Bayar: 'Menunggu Konfirmasi', Status_Seleksi: 'Dalam Proses', Catatan_Admin: '', Rombel: '', Email_Terkirim: 'Ya', _foto: r.files.foto });
      db.order.push(no); delete db.reg[d.key]; log('DAFTAR', no, f.Nama); simpan();
      const e = String(f.Email || '').split('@');
      return ok({ no, nama: db.rows[no].Nama, nisn: f.NISN, sekolah: f.Sekolah_Asal, waktu: new Date().toISOString(), email: e[0].slice(0, 2) + '***@' + (e[1] || ''), emailOk: true, pdf: PDF, pdfName: 'Bukti_Pendaftaran_' + no + '.pdf' });
    },
    cekStatus: (d) => {
      const r = db.rows[String(d.no).toUpperCase()];
      if (!r || r.Tanggal_Lahir !== d.tgl) return fail('Data tidak ditemukan. Periksa kembali nomor dan tanggal lahir.', { code: 'NOT_FOUND' });
      const foto = r._foto && r._foto.b64 ? 'data:' + r._foto.mime + ';base64,' + r._foto.b64 : 'data:image/svg+xml;base64,' + svgFoto('FOTO', '#9ADCFF');
      return ok({ no: r.No_Pendaftaran, nama: r.Nama, sekolah: r.Sekolah_Asal, nisn: r.NISN, waktu: r.Timestamp, foto, berkas: r.Status_Berkas, bayar: r.Status_Bayar, seleksi: r.Status_Seleksi, catatan: r.Catatan_Admin, rombel: r.Rombel,
        daftarUlang: r.Status_Seleksi === 'Diterima' ? db.konten.filter((k) => k.Bagian === 'Daftar Ulang') : [] });
    },
    getPdf: (d) => { const r = db.rows[String(d.no).toUpperCase()]; if (!r || r.Tanggal_Lahir !== d.tgl) return fail('Data tidak ditemukan.'); return ok({ b64: PDF, name: 'Bukti_Pendaftaran_' + r.No_Pendaftaran + '.pdf' }); },
    login: (d) => {
      if (String(d.username).toLowerCase() !== db.settings.admin_username || d.password !== db.pass) return fail('Username atau password salah (sisa percobaan: 4 kali).', { code: 'WRONG', left: 4 });
      log('LOGIN'); return ok({ token: 'demo-token', exp: Date.now() + 6 * 3600e3, mustChange: db.settings.admin_password_default === '1', boot: boot() });
    },
    adminBoot: () => ok(boot()),
    getDetail: (d) => { const r = db.rows[d.no]; if (!r) return fail('Data tidak ditemukan.'); return ok({ row: r, files: Object.keys(FILES).map((j) => ({ jenis: j, label: FILES[j], id: 'demo', name: j + (j === 'foto' || j === 'bukti' ? '.jpg' : '.pdf'), mime: j === 'foto' || j === 'bukti' ? 'image/svg+xml' : 'application/pdf', size: 180000 + j.length * 9000, url: '' })), folderUrl: '', pdfUrl: '' }); },
    getFile: (d) => { const r = db.rows[d.no]; if (!r) return fail('Tidak ada.'); if (d.jenis === 'foto' && r._foto && r._foto.b64) return ok({ b64: r._foto.b64, mime: r._foto.mime, name: 'foto' });
      if (d.jenis === 'foto' || d.jenis === 'bukti') return ok({ b64: svgFoto(d.jenis === 'foto' ? 'PAS FOTO' : 'BUKTI TRANSFER', d.jenis === 'foto' ? '#9ADCFF' : '#FFE08A'), mime: 'image/svg+xml', name: d.jenis + '.svg' });
      return ok({ b64: PDF, mime: 'application/pdf', name: d.jenis + '.pdf' }); },
    getLogs: (d) => ok(db.logs.filter((x) => !d.no || x.No_Pendaftaran === d.no)),
    setStatus: (d) => {
      const r = db.rows[d.no]; if (!r) return fail('Data tidak ditemukan.');
      if (d.field === 'Status_Berkas' && d.value === 'Kurang' && !d.note) return fail('Catatan wajib diisi bila berkas Kurang.');
      if (d.field === 'Status_Seleksi' && d.value === 'Diterima' && !(r.Status_Berkas === 'Lengkap' && r.Status_Bayar === 'Terkonfirmasi')) return fail('Diterima hanya bila berkas Lengkap dan bayar Terkonfirmasi.');
      r[d.field] = d.value; if (d.note) r.Catatan_Admin = d.note; log(d.field.toUpperCase(), d.no, d.value); simpan(); return ok({ no: d.no, field: d.field, value: d.value });
    },
    saveRombel: (d) => { db.rows[d.no].Rombel = d.rombel; log('ROMBEL', d.no, d.rombel); simpan(); return ok({ no: d.no, rombel: d.rombel }); },
    saveCatatan: (d) => { db.rows[d.no].Catatan_Admin = d.note; log('CATATAN', d.no, d.note); simpan(); return ok({ no: d.no, note: d.note }); },
    editData: (d) => { const er = {}; Object.keys(d.patch).forEach((k) => { if (/NIK|No_KK/.test(k) && d.patch[k] && !/^\d{16}$/.test(d.patch[k])) er[k] = 'Harus 16 digit angka.'; }); if (Object.keys(er).length) return fail('Periksa kembali isian.', { code: 'INVALID', errors: er }); Object.assign(db.rows[d.no], d.patch); log('EDIT_DATA', d.no, Object.keys(d.patch).join(', ')); simpan(); return ok({ row: db.rows[d.no] }); },
    resendEmail: (d) => { log('KIRIM_ULANG_EMAIL', d.no, 'berhasil'); return ok({ no: d.no }, { message: 'Email terkirim (demo)' }); },
    exportDapodik: (d) => {
      const rows = db.order.map((n) => db.rows[n]).filter((r) => d.scope === 'semua' || (d.scope === 'diterima' ? r.Status_Seleksi === 'Diterima' : (d.nos || []).includes(r.No_Pendaftaran)));
      const csv = ['No;Nama;Jenis Kelamin;NISN;NIK;Sekolah Asal;Rombel'].concat(rows.map((r, i) => [i + 1, r.Nama, r.Jenis_Kelamin, "'" + r.NISN, "'" + r.NIK, r.Sekolah_Asal, r.Rombel].join(';'))).join('\n');
      return ok({ b64: btoa(unescape(encodeURIComponent(csv))), name: 'DEMO_Dapodik.csv', count: rows.length });
    },
    saveSettings: (d) => { Object.keys(d.settings || {}).forEach((k) => { if (!k.startsWith('admin_')) db.settings[k] = String(d.settings[k]); }); log('PENGATURAN'); simpan(); return ok(boot()); },
    saveJadwal: (d) => { db.jadwal = d.jadwal.filter((j) => j.Kegiatan).map((j, i) => Object.assign({}, j, { Urutan: i + 1 })); simpan(); return ok(db.jadwal); },
    saveKonten: (d) => { db.konten = db.konten.filter((k) => k.Bagian !== d.bagian).concat(d.items.map((k, i) => ({ Bagian: d.bagian, Urutan: i + 1, Judul: k.Judul, Isi: k.Isi }))); simpan(); return ok(db.konten); },
    uploadAsset: (d) => { db.assets[d.jenis] = 'data:' + d.mime + ';base64,' + d.b64; simpan(); return ok({ jenis: d.jenis, url: db.assets[d.jenis] }); },
    resetAsset: (d) => { db.assets[d.jenis] = ''; simpan(); return ok({ jenis: d.jenis }); },
    changePassword: (d) => { if (d.old !== db.pass) return fail('Password lama salah.'); db.pass = d.new; db.settings.admin_password_default = '0'; if (d.username) db.settings.admin_username = d.username.toLowerCase(); simpan(); return ok({ token: 'demo-token', exp: Date.now() + 6 * 3600e3 }); },
    backupNow: () => { const b = { id: 'bk' + Date.now(), name: 'Backup DB PPDB ' + iso(new Date()) + ' (manual)', url: '#', created: new Date().toISOString() }; db.backups.unshift(b); simpan(); return ok(b, { message: 'Backup tersimpan' }); },
    listBackups: () => ok({ backups: db.backups, folderUrl: '#', triggers: { backup: !!db.trig, log: !!db.trig } }),
    installTriggers: () => { db.trig = true; simpan(); return ok({}); },
    importScan: (d) => d.source ? ok({ source: { name: 'PPDB Lama (demo)', id: 'x' }, dryRun: true, report: Object.fromEntries((d.sheets || ['Pendaftar']).map((s) => [s, { source: 12, inserted: s === 'Pendaftar' ? 3 : 0, updated: d.delta ? 2 : 0, skipped: 9 }])), warnings: ['Mode demo: tidak ada data yang benar-benar dibaca.'] }) : fail('Tempel URL atau ID spreadsheet sumber.'),
    importRun: (d) => ok({ source: { name: 'PPDB Lama (demo)', id: 'x' }, dryRun: false, report: Object.fromEntries((d.sheets || ['Pendaftar']).map((s) => [s, { source: 12, inserted: 0, updated: 0, skipped: 12 }])), warnings: ['Mode demo: tidak ada data yang ditulis.'] })
  };
  const ADMIN = /^(adminBoot|getDetail|getFile|getLogs|setStatus|saveRombel|saveCatatan|editData|resendEmail|exportDapodik|saveSettings|saveJadwal|saveKonten|uploadAsset|resetAsset|changePassword|backupNow|listBackups|installTriggers|importScan|importRun)$/;
  window.DemoAPI = async function (action, data, token) {
    await tunda(/^reg/.test(action) ? 350 : 120 + Math.random() * 200);
    if (ADMIN.test(action) && !butuhAdmin(token)) return fail('Sesi berakhir. Silakan login kembali.', { code: 'AUTH' });
    const h = H[action]; if (!h) return fail('Aksi tidak dikenal: ' + action);
    try { return h(data || {}); } catch (e) { return fail(e.message); }
  };
  window.DemoReset = () => { localStorage.removeItem(KEY); location.reload(); };
})();
