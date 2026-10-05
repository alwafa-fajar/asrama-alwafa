/* ==========================================================================
 * SIM ASRAMA v7.0 — supabase-baca.js   (DIBUAT OTOMATIS — JANGAN DIEDIT MANUAL)
 * --------------------------------------------------------------------------
 * BACA LANGSUNG dari Supabase (PostgreSQL) tanpa lewat Apps Script → menu
 * terbuka jauh lebih cepat. Aturan:
 *  • Hanya MEMBACA. Semua penyimpanan tetap lewat Apps Script (GAS_URL).
 *  • Kunci yang dipakai = anon/publishable key (aman di browser). Baris yang
 *    boleh dibaca dibatasi RLS di database berdasarkan token sesi app yang
 *    dikirim di header "x-app-token" & diverifikasi HMAC oleh database.
 *  • Logika setiap aksi adalah SALINAN PERSIS fungsi Apps Script (dibuat
 *    otomatis dari berkas .gs) → hasilnya identik dengan versi server.
 *  • Bila apa pun gagal (Supabase belum diisi, token ditolak, jaringan),
 *    aplikasi otomatis kembali membaca lewat Apps Script. Tampilan tidak berubah.
 * Diagnosa di console browser: SBB.status()
 * ========================================================================== */
(function (w) {
  'use strict';
  var C = w.CONFIG || {};
  var SBB = { aktif: false, mati: false, alasan: '', bisa: function () { return false; } };
  w.SBB = SBB;
  var urlDasar = String(C.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  var kunciAnon = String(C.SUPABASE_ANON_KEY || '').trim();
  if (!urlDasar || !kunciAnon || /GANTI|xxxx/i.test(urlDasar + kunciAnon)) { SBB.alasan = 'SUPABASE_URL / SUPABASE_ANON_KEY belum diisi di js/config.js'; return; }
  if (!w.fetch) { SBB.alasan = 'browser tanpa fetch'; return; }
  SBB.aktif = true;
  var REST = urlDasar + '/rest/v1/';
  var HAL = 1000;

  /* ---------------- runtime mini Apps Script (hanya yang dipakai fungsi baca) ---------------- */
  var CONFIG = {"SESSION_HOURS":12,"CACHE_TTL":300,"CACHE_MAX_KB":1800,"MAX_UPLOAD_MB":1,"MAX_UPLOAD_KB":1024,"THUMB_PX":320,"MIGRASI_CHUNK":4000,"IMPORT_BATCH":200,"TIMEZONE":"Asia/Jakarta"};
  var SB_COLS = {"Users":["UserID","Username","Email","NamaLengkap","Role","PasswordHash","Status","PenghuniID","JenisKelamin","SandiAwal","NoHP","CreatedBy","CreatedAt","GoogleSub","FotoGoogle","LastLogin"],"MasterData":["MasterID","Tipe","Kode","Nilai","Induk","Poin","Urutan","Status"],"Pendaftar":["PendaftarID","UserID","NIM","NamaLengkap","Email","NoHP","JenisKelamin","ProgramKelas","Prodi","Angkatan","BeratBadan","Alamat","NamaWali","NoHPWali","PaketID","BayarAwal","BulanDibayar","FotoID","SuratID","BuktiID","Status","Catatan","TanggalDaftar","VerifiedBy","VerifiedAt","FotoThumbID","StatusWA","CekWAAt"],"Penghuni":["PenghuniID","PendaftarID","UserID","NIM","NamaLengkap","Email","NoHP","JenisKelamin","ProgramKelas","Prodi","Angkatan","BeratBadan","KamarID","PaketID","Skor","Status","TanggalMasuk","TanggalKeluar","FotoID","EligibleKartu","KartuApprovedBy","KartuApprovedAt","NamaWali","NoHPWali","FotoThumbID","StatusWA","CekWAAt"],"Gedung":["GedungID","NamaGedung","Tipe","JumlahLantai","Musyrif","NoHPMusyrif","Status"],"Kamar":["KamarID","GedungID","NomorKamar","Lantai","Kapasitas","Fasilitas","Status","Catatan"],"Penempatan":["PenempatanID","PenghuniID","KamarID","NomorBed","TanggalMasuk","TanggalKeluar","Status","DitempatkanOleh"],"Paket":["PaketID","NamaPaket","Harga","Deskripsi","Status","IncludeMakan"],"Tagihan":["TagihanID","PenghuniID","PaketID","Periode","Jumlah","JumlahAsal","Status","TanggalTerbit","JatuhTempo","TanggalLunas","DiterbitkanOleh","Keterangan"],"Pembayaran":["PembayaranID","TagihanID","PenghuniID","Jumlah","Metode","NoReferensi","BuktiID","Status","TanggalBayar","VerifiedBy","VerifiedAt","Catatan"],"Aduan":["AduanID","PenghuniID","NamaPelapor","Kategori","Judul","Deskripsi","Prioritas","LampiranID","Status","TanggalBuat","TanggalSelesai","PetugasID"],"AduanBalasan":["BalasanID","AduanID","UserID","NamaPengirim","Pesan","Tanggal"],"Teguran":["TeguranID","PenghuniID","KodePelanggaran","JenisPelanggaran","Poin","Deskripsi","Lokasi","TanggalKejadian","Sanksi","TindakLanjut","BuktiID","NomorSurat","JenisSP","Status","DiterbitkanOleh","TanggalTerbit","SkorSebelum","SkorSesudah","NotifWali"],"SkorLog":["SkorLogID","PenghuniID","SkorLama","SkorBaru","Perubahan","Alasan","RefID","Tanggal","OlehUserID"],"Dokumen":["DokumenID","Judul","Kategori","DriveFileID","UkuranKB","Deskripsi","Status","DiunggahOleh","Tanggal"],"Pengumuman":["PengumumanID","Judul","Isi","Target","Status","TanggalKirim","DibuatOleh"],"Notifikasi":["NotifID","UserID","Judul","Pesan","Tipe","Link","Dibaca","Tanggal"],"AuditLog":["AuditID","UserID","NamaUser","Role","Aksi","Target","Detail","Tanggal"],"Pengaturan":["Kunci","Nilai","Keterangan"],"ImportLog":["ImportID","Tabel","Tanggal","TotalBaris","BarisSukses","BarisGagal","RingkasanError","DilakukanOleh"],"BackupLog":["BackupID","Tanggal","Label","FileID","LinkDrive","UkuranMB","DibuatOleh"],"AntrianNotif":["AntrianID","Kanal","Tujuan","NamaPenerima","Subjek","Pesan","Event","RefID","BlastID","Status","Percobaan","Respon","DibuatPada","DikirimPada"],"BlastWA":["BlastID","Judul","Pesan","Sasaran","Total","Terkirim","Gagal","UkuranBatch","JedaDetik","Status","DibuatOleh","Tanggal","SelesaiPada"],"MigrasiLog":["MigrasiID","Sumber","NamaSumber","Sheet","Mode","BarisSumber","Ditambah","Diperbarui","Dilewati","Peringatan","Tanggal","DilakukanOleh"],"CRM_Kontak":["KontakID","Nama","Email","NoWA","Segmen","Sumber","RefID","Tag","StatusWA","CekWAAt","EmailValid","OptOut","Catatan","JumlahPesan","TerakhirDihubungi","Info","DibuatPada","DiperbaruiPada"],"CRM_Interaksi":["InteraksiID","KontakID","Kanal","Arah","Ringkasan","RefID","Oleh","Tanggal"],"ReminderLog":["ReminderID","Kunci","Jenis","Periode","PenghuniID","TagihanID","Nama","Jumlah","JatuhTempo","Mode","Kanal","Status","Oleh","Tanggal"],"DE_Template":["TemplateID","Nama","Jenis","DocID","Skema","Status","TtdNama","TtdJabatan","TtdGambarID","Kota","DibuatOleh","DibuatPada","DiperbaruiPada"],"DE_Dokumen":["DokumenID","TemplateID","Jenis","Nomor","RefID","PenghuniID","Judul","Data","DocID","PdfID","KodeVerifikasi","Hash","Status","DibuatOleh","DibuatPada"],"LogMakan":["LogID","PenghuniID","NamaLengkap","Tanggal","WaktuMakan","Timestamp","ScannedBy","Status","Catatan"]};
  var SB_TAIL = {"AuditLog":"Tanggal","Notifikasi":"Tanggal","AntrianNotif":"DibuatPada","LogMakan":"Timestamp","SkorLog":"Tanggal","ImportLog":"Tanggal","CRM_Interaksi":"Tanggal","ReminderLog":"Tanggal"};
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var BULAN_P = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var _fmtCache = {};
  function bagianWaktu(d, tz) {
    var f = _fmtCache[tz] || (_fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    var o = {};
    f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  }
  /** Pengganti Utilities.formatDate (pola SimpleDateFormat, zona waktu sesuai argumen) */
  var Utilities = {
    formatDate: function (d, tz, pola) {
      var b = bagianWaktu(d, tz || CONFIG.TIMEZONE || 'Asia/Jakarta'), m = parseInt(b.month, 10);
      return String(pola).replace(/'([^']*)'|yyyy|yy|MMMM|MMM|MM|dd|HH|mm|ss/g, function (t, lit) {
        if (lit !== undefined) return lit;
        return t === 'yyyy' ? b.year : t === 'yy' ? b.year.slice(-2) : t === 'MMMM' ? BULAN_P[m - 1] : t === 'MMM' ? BULAN[m - 1] :
               t === 'MM' ? b.month : t === 'dd' ? b.day : t === 'HH' ? b.hour : t === 'mm' ? b.minute : b.second;
      });
    }
  };

  /* ---------------- DB tiruan: membaca tabel yang SUDAH dimuat dari Supabase ---------------- */
  var DATA = {};
  function sbCocok_(r, f) {
    return Object.keys(f || {}).every(function (c) {
      var v = f[c], x = String(r[c] === undefined ? '' : r[c]);
      if (v instanceof Array) return v.map(String).indexOf(x) > -1;
      if (v && typeof v === 'object') return Object.keys(v).every(function (op) {
        var y = String(v[op]);
        return op === 'gte' ? x >= y : op === 'lte' ? x <= y : op === 'gt' ? x > y : op === 'lt' ? x < y : op === 'neq' ? x !== y : true;
      });
      return x === String(v);
    });
  }
  var DB = {
    all: function (n) { if (!DATA[n]) throw new Error('SBB: tabel ' + n + ' belum dimuat'); return DATA[n]; },
    filter: function (n, fn) { return this.all(n).filter(fn); },
    find: function (n, kol, nilai) {
      var s = String(nilai === null || nilai === undefined ? '' : nilai), rows = this.all(n);
      for (var i = 0; i < rows.length; i++) if (String(rows[i][kol]) === s) return rows[i];
      return null;
    },
    query: function (n, f, opt) { var h = this.all(n).filter(function (r) { return sbCocok_(r, f); }); return opt && opt.maks ? h.slice(0, opt.maks) : h; },
    tail: function (n, k, f) { var h = this.all(n).filter(function (r) { return sbCocok_(r, f); }); return h.slice(-(k || 100)); },
    headers: function (n) { return (SB_COLS[n] || SB_COLS[nyata(n).tabel]).slice(); }
  };

  /* ================= FUNGSI APPS SCRIPT (salinan otomatis) ================= */
  // ← CRM.gs
  const CRM_PER_HALAMAN = 50;

  // ← Config.gs
  const ROLES = {
    SA : 'Super Admin',
    PMB: 'Admin PMB',
    KEU: 'Admin Keuangan',
    PA : 'Admin Asrama Putra',
    PI : 'Admin Asrama Putri',
    PTG: 'Petugas Makan',
    PIM: 'Pimpinan',
    PNG: 'Penghuni',
    PDF: 'Pendaftar'
  };

  // ← Config.gs
  const STAFF_ROLES = ['SA','PMB','KEU','PA','PI','PTG','PIM'];

  // ← Config.gs
  const GENDER_SCOPE_ROLE = { PA: 'L', PI: 'P' };

  // ← Config.gs
  const WAKTU_MAKAN      = ['Pagi','Siang','Malam'];

  // ← DocEngine.gs
  const DE_KUNCI_SP = [
    ['NOMOR', 'Nomor surat (otomatis dari teguran)'], ['TANGGAL', 'Tanggal terbit, mis. 21 September 2026'],
    ['JENIS_SP', 'SP-1 / SP-2 / SP-3 (kosong bila belum mencapai ambang)'], ['JUDUL', 'Judul surat'],
    ['TINDAKAN', 'Tindakan sesuai ambang SP'], ['NAMA', 'Nama mahasiswa'], ['NIM', 'NIM'],
    ['PRODI', 'Program studi'], ['ANGKATAN', 'Angkatan'], ['KAMAR', 'Nomor kamar'], ['GEDUNG', 'Nama gedung'],
    ['JENIS_PELANGGARAN', 'Jenis pelanggaran'], ['KODE_PELANGGARAN', 'Kode pelanggaran'], ['POIN', 'Poin pengurangan'],
    ['SKOR_SEBELUM', 'Skor sebelum'], ['SKOR_SESUDAH', 'Skor sesudah'], ['DESKRIPSI', 'Kronologi / deskripsi'],
    ['LOKASI', 'Lokasi kejadian'], ['TANGGAL_KEJADIAN', 'Tanggal kejadian'], ['SANKSI', 'Sanksi'],
    ['TINDAK_LANJUT', 'Tindak lanjut'], ['NAMA_WALI', 'Nama wali'], ['INSTITUSI', 'Nama institusi'],
    ['TAHUN_AKADEMIK', 'Tahun akademik'], ['KOTA', 'Kota penerbitan'], ['TTD_NAMA', 'Nama penanda tangan'],
    ['TTD_JABATAN', 'Jabatan penanda tangan'], ['KODE_VERIFIKASI', 'Kode verifikasi'],
    ['URL_VERIFIKASI', 'Tautan verifikasi'], ['TTD', 'Gambar tanda tangan (spesimen / kosong)'], ['QR', 'Gambar QR verifikasi']
  ];

  // ← Kode.gs
  const KOLOM_HP   = { NoHP: 1, NoHPWali: 1, NoHPMusyrif: 1, NoWA: 1 };

  // ← Layanan.gs
  const CRUD_TABLES = { Gedung: 'GedungID', Kamar: 'KamarID', Paket: 'PaketID' };

  // ← CRM.gs
  function crmInfo_(k) { try { return JSON.parse(k.Info || '{}') || {}; } catch (e) { return {}; } }

  // ← CRM.gs
  function crmTerlihat_(u) {
    const g = scopeGender_(u);
    return DB.all('CRM_Kontak').filter(function (k) {
      if (String(k.Tag || '').indexOf('merged→') > -1) return false;
      if (g) { const jk = crmInfo_(k).JK; if (jk && jk !== g) return false; }
      return true;
    });
  }

  // ← CRM.gs
  function crmPetaGanda_(rows) {
    const wa = {}, em = {};
    rows.forEach(function (k) {
      if (k.NoWA) wa[k.NoWA] = (wa[k.NoWA] || 0) + 1;
      if (k.Email) em[k.Email] = (em[k.Email] || 0) + 1;
    });
    return { wa: wa, em: em };
  }

  // ← CRM.gs
  function crmGanda_(k, peta) { return !!((k.NoWA && peta.wa[k.NoWA] > 1) || (k.Email && peta.em[k.Email] > 1)); }

  // ← CRM.gs
  function svcCrmList(p, u) {
    let rows = crmTerlihat_(u);
    const peta = crmPetaGanda_(rows);
    const facetSegmen = {}, facetSumber = {};
    rows.forEach(function (k) { facetSegmen[k.Segmen] = (facetSegmen[k.Segmen] || 0) + 1; });
  
    if (p.segmen)  rows = rows.filter(function (k) { return k.Segmen === p.segmen; });
    if (p.sumber)  rows = rows.filter(function (k) { return k.Sumber === p.sumber; });
    if (p.status)  rows = rows.filter(function (k) { return crmInfo_(k).Status === p.status; });
    if (p.tag)     rows = rows.filter(function (k) { return (',' + k.Tag + ',').indexOf(',' + p.tag + ',') > -1; });
    if (p.statusWA === 'belum') rows = rows.filter(function (k) { return k.NoWA && !k.StatusWA; });
    else if (p.statusWA) rows = rows.filter(function (k) { return k.StatusWA === p.statusWA; });
    if (p.emailValid) rows = rows.filter(function (k) { return k.EmailValid === p.emailValid; });
    if (p.optOut)  rows = rows.filter(function (k) { return k.OptOut === p.optOut; });
    if (p.duplikat) rows = rows.filter(function (k) { return crmGanda_(k, peta); });
    if (p.tanpaKanal) rows = rows.filter(function (k) { return !hpValid_(k.NoWA) && k.EmailValid !== 'YA'; });
    if (p.cari) {
      const q = String(p.cari).toLowerCase().trim(), qhp = hp08_(q);
      rows = rows.filter(function (k) {
        return String(k.Nama).toLowerCase().indexOf(q) > -1 || String(k.Email).indexOf(q) > -1 ||
               (qhp.length >= 4 && String(k.NoWA).indexOf(qhp) > -1) || String(k.NoWA).indexOf(q) > -1;
      });
    }
    rows.forEach(function (k) { facetSumber[k.Sumber] = (facetSumber[k.Sumber] || 0) + 1; });
  
    const urut = p.urut || 'nama';
    rows = rows.slice().sort(function (a, b) {
      if (urut === 'terakhir') return String(b.TerakhirDihubungi).localeCompare(String(a.TerakhirDihubungi));
      if (urut === 'baru') return String(b.DibuatPada).localeCompare(String(a.DibuatPada));
      return String(a.Nama).localeCompare(String(b.Nama));
    });
  
    const per = Math.min(200, toNumber_(p.per) || CRM_PER_HALAMAN);
    const total = rows.length, halaman = Math.max(1, toNumber_(p.halaman) || 1);
    const isi = rows.slice((halaman - 1) * per, halaman * per).map(function (k) {
      const info = crmInfo_(k);
      return {
        KontakID: k.KontakID, Nama: k.Nama, Email: k.Email, NoWA: k.NoWA, Segmen: k.Segmen, Sumber: k.Sumber,
        RefID: k.RefID, Tag: k.Tag, StatusWA: k.StatusWA, EmailValid: k.EmailValid, OptOut: k.OptOut,
        JumlahPesan: toNumber_(k.JumlahPesan), TerakhirDihubungi: k.TerakhirDihubungi,
        Status: info.Status || '', NIM: info.NIM || '', JK: info.JK || '',
        HpValid: hpValid_(k.NoWA), Ganda: crmGanda_(k, peta)
      };
    });
    return ok_({ rows: isi, total: total, halaman: halaman, per: per, jumlahHalaman: Math.max(1, Math.ceil(total / per)),
                 facet: { segmen: facetSegmen, sumber: facetSumber } });
  }

  // ← DocEngine.gs
  function svcDocTemplates(p, u) {
    return ok_({
      rows: DB.all('DE_Template').map(function (t) {
        let skema = [];
        try { skema = JSON.parse(t.Skema || '[]'); } catch (e) {}
        return Object.assign({}, t, { skema: skema, adaTtd: !!t.TtdGambarID,
                                      urlDoc: t.DocID ? 'https://docs.google.com/document/d/' + t.DocID + '/edit' : '' });
      }),
      kunci: DE_KUNCI_SP.map(function (k) { return { kunci: k[0], ket: k[1] }; })
    });
  }

  // ← DocEngine.gs
  function deRingkas_(d) {
    return { DokumenID: d.DokumenID, Jenis: d.Jenis, Nomor: d.Nomor, RefID: d.RefID, PenghuniID: d.PenghuniID,
             Judul: d.Judul, KodeVerifikasi: d.KodeVerifikasi, Status: d.Status, DibuatPada: d.DibuatPada,
             namaBerkas: (d.Judul || 'Surat').replace(/\s+/g, '_') + '_' + d.RefID + '.pdf' };
  }

  // ← DocEngine.gs
  function svcDocList(p, u) {
    const g = scopeGender_(u);
    const peng = {};
    DB.all('Penghuni').forEach(function (r) { peng[r.PenghuniID] = r; });
    let rows = DB.all('DE_Dokumen').filter(function (d) { return !g || (peng[d.PenghuniID] || {}).JenisKelamin === g; });
    if (p.refId) rows = rows.filter(function (d) { return d.RefID === p.refId; });
    return ok_(rows.slice(-500).reverse().map(function (d) {
      return Object.assign(deRingkas_(d), { NamaLengkap: (peng[d.PenghuniID] || {}).NamaLengkap || '' });
    }));
  }

  // ← Kode.gs
  function ok_(data, message)  { return { ok: true,  data: data === undefined ? null : data, message: message || '' }; }

  // ← Kode.gs
  function err_(msg, code)     { return { ok: false, error: msg, code: code || 400 }; }

  // ← Kode.gs
  function hp08_(v) {
    let s = String(v === null || v === undefined ? '' : v).trim().replace(/\.0+$/, '').replace(/[^0-9+]/g, '');
    if (!s) return '';
    s = s.replace(/^\+/, '');
    if (s.indexOf('62') === 0) s = '0' + s.substring(2);
    else if (s.indexOf('8') === 0) s = '0' + s;
    return s;
  }

  // ← Kode.gs
  function hp62_(v) {
    const s = hp08_(v);
    if (!s) return '';
    return s.indexOf('0') === 0 ? '62' + s.substring(1) : s;
  }

  // ← Kode.gs
  function hpValid_(v) { return /^08\d{8,12}$/.test(hp08_(v)); }

  // ← Kode.gs
  function today_()    { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'); }

  // ← Kode.gs
  function periodeNow_() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM'); }

  // ← Kode.gs
  function jamNow_()   { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'HH:mm'); }

  // ← Kode.gs
  function setting_(kunci, fallback) {
    const row = DB.find('Pengaturan', 'Kunci', kunci);
    return row && row.Nilai !== '' ? String(row.Nilai) : (fallback === undefined ? '' : fallback);
  }

  // ← Kode.gs
  function scopeGender_(user) {
    return GENDER_SCOPE_ROLE[user.Role] || null;
  }

  // ← Kode.gs
  function applyGenderScope_(rows, user, field) {
    const g = scopeGender_(user);
    if (!g) return rows;
    const f = field || 'JenisKelamin';
    return rows.filter(function (r) { return String(r[f]) === g; });
  }

  // ← Kode.gs
  function fileUrl_(fileId) {
    return fileId ? ('https://drive.google.com/file/d/' + fileId + '/view') : '';
  }

  // ← Kode.gs
  function thumbUrl_(fileId, lebar) {
    return fileId ? ('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + (lebar || CONFIG.THUMB_PX)) : '';
  }

  // ← Kode.gs
  function fotoUrl_(row, lebar) {
    if (!row) return '';
    return thumbUrl_(row.FotoThumbID || row.FotoID, lebar || 160);
  }

  // ← Kode.gs
  function toNumber_(v) {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  // ← Kode.gs
  function isTrue_(v) {
    return v === true || String(v).toUpperCase() === 'TRUE' || String(v).toUpperCase() === 'YA' || v === 1 || v === '1';
  }

  // ← Layanan.gs
  function svcDashboardAdmin(u) {
    const penghuni = applyGenderScope_(DB.all('Penghuni'), u);
    const kamar    = DB.all('Kamar');
    const gedung   = DB.all('Gedung');
    const tagihan  = DB.all('Tagihan');
    const pendaftar= DB.all('Pendaftar');
  
    const aktif      = penghuni.filter(function (r) { return r.Status === 'Aktif'; });
    const kapasitas  = kamar.reduce(function (s, k) { return s + toNumber_(k.Kapasitas); }, 0);
    const periode    = periodeNow_();
    const tgBulanIni = tagihan.filter(function (t) { return String(t.Periode) === periode; });
    const lunas      = tgBulanIni.filter(function (t) { return t.Status === 'Lunas' || t.Status === 'Gratis'; });
    const tunggakan  = tgBulanIni.filter(function (t) { return t.Status === 'Belum Bayar' || t.Status === 'Terlambat'; });
    const realisasi  = lunas.reduce(function (s, t) { return s + toNumber_(t.Jumlah); }, 0);
  
    // Okupansi per gedung (radar) — PRD §15.3 KPI Card
    const kamarPerGedung = {};
    kamar.forEach(function (k) {
      if (!kamarPerGedung[k.GedungID]) kamarPerGedung[k.GedungID] = { kapasitas: 0, terisi: 0 };
      kamarPerGedung[k.GedungID].kapasitas += toNumber_(k.Kapasitas);
    });
    aktif.forEach(function (p) {
      const k = kamar.filter(function (x) { return x.KamarID === p.KamarID; })[0];
      if (k && kamarPerGedung[k.GedungID]) kamarPerGedung[k.GedungID].terisi++;
    });
    const radar = gedung.map(function (g) {
      const s = kamarPerGedung[g.GedungID] || { kapasitas: 0, terisi: 0 };
      return {
        GedungID: g.GedungID, NamaGedung: g.NamaGedung, Tipe: g.Tipe,
        kapasitas: s.kapasitas, terisi: s.terisi,
        persen: s.kapasitas ? Math.round(s.terisi / s.kapasitas * 1000) / 10 : 0
      };
    });
  
    // Tren 6 bulan terakhir
    const tren = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const per = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM');
      const masuk = penghuni.filter(function (p) {
        return String(p.TanggalMasuk || '').substring(0, 7) <= per &&
               (!p.TanggalKeluar || String(p.TanggalKeluar).substring(0, 7) > per);
      }).length;
      tren.push({
        periode: per,
        label: Utilities.formatDate(d, CONFIG.TIMEZONE, 'MMM yy'),
        okupansi: masuk,
        skorDisiplin: rataSkor_(penghuni)
      });
    }
  
    const kpiMakan = svcMealKPI({}, u);
  
    return ok_({
      kpi: {
        totalPenghuni: aktif.length,
        kapasitas: kapasitas,
        persenOkupansi: kapasitas ? Math.round(aktif.length / kapasitas * 1000) / 10 : 0,
        penghuniBaruSemesterIni: penghuni.filter(function (p) {
          return String(p.TanggalMasuk || '').substring(0, 4) === today_().substring(0, 4);
        }).length,
        pendaftarTotal: pendaftar.length,
        pendaftarMenunggu: pendaftar.filter(function (r) { return r.Status === 'Baru'; }).length,
        realisasiTagihan: realisasi,
        targetTagihan: tgBulanIni.reduce(function (s, t) { return s + toNumber_(t.Jumlah); }, 0),
        persenLunas: tgBulanIni.length ? Math.round(lunas.length / tgBulanIni.length * 1000) / 10 : 0,
        jumlahTunggakan: tunggakan.length,
        skorDisiplinRata: rataSkor_(aktif),
        konsumsiHariIni: kpiMakan.ok ? kpiMakan.data.totalHariIni : 0,
        makanPagi: kpiMakan.ok ? kpiMakan.data.pagi : 0,
        makanSiang: kpiMakan.ok ? kpiMakan.data.siang : 0,
        makanMalam: kpiMakan.ok ? kpiMakan.data.malam : 0
      },
      radar: radar,
      tren: tren,
      pendaftarMenunggu: pendaftar.filter(function (r) { return r.Status === 'Baru'; })
        .slice(0, 5).map(function (r) {
          return { PendaftarID: r.PendaftarID, NamaLengkap: r.NamaLengkap, NIM: r.NIM,
                   Prodi: r.Prodi, JenisKelamin: r.JenisKelamin, TanggalDaftar: r.TanggalDaftar,
                   FotoID: r.FotoID, FotoURL: fotoUrl_(r), Status: r.Status };
        }),
      pembayaranMenunggu: DB.all('Pembayaran')
        .filter(function (b) { return b.Status === 'Menunggu'; })
        .slice(0, 5).map(function (b) {
          const png = DB.find('Penghuni', 'PenghuniID', b.PenghuniID) || {};
          const kmr = DB.find('Kamar', 'KamarID', png.KamarID) || {};
          return { PembayaranID: b.PembayaranID, TagihanID: b.TagihanID, Nama: png.NamaLengkap || '-',
                   Kamar: kmr.NomorKamar || '-', Jumlah: b.Jumlah, Metode: b.Metode,
                   BuktiID: b.BuktiID, TanggalBayar: b.TanggalBayar };
        }),
      sesiMakan: sesiMakanSekarang_()
    });
  }

  // ← Layanan.gs
  function rataSkor_(rows) {
    if (!rows.length) return 100;
    const t = rows.reduce(function (s, r) { return s + toNumber_(r.Skor || 100); }, 0);
    return Math.round(t / rows.length * 10) / 10;
  }

  // ← Layanan.gs
  function svcDashboardResident(u) {
    const png = DB.find('Penghuni', 'UserID', u.UserID);
    if (!png) return err_('Data penghuni tidak ditemukan.', 404);
    const kamar  = DB.find('Kamar', 'KamarID', png.KamarID) || {};
    const gedung = DB.find('Gedung', 'GedungID', kamar.GedungID) || {};
    const paket  = DB.find('Paket', 'PaketID', png.PaketID) || {};
    const tagihan= DB.filter('Tagihan', function (t) { return t.PenghuniID === png.PenghuniID; })
                     .sort(function (a, b) { return String(b.Periode).localeCompare(String(a.Periode)); });
    const aduan  = DB.filter('Aduan', function (a) { return a.PenghuniID === png.PenghuniID && a.Status !== 'Selesai'; });
    const pj     = pjAsrama_(png.JenisKelamin);
  
    return ok_({
      penghuni: png,
      kamar: { NomorKamar: kamar.NomorKamar || '-', Lantai: kamar.Lantai || '-', Fasilitas: kamar.Fasilitas || '' },
      gedung: { NamaGedung: gedung.NamaGedung || '-', Musyrif: gedung.Musyrif || '', NoHPMusyrif: gedung.NoHPMusyrif || '' },
      paket: paket,
      skor: toNumber_(png.Skor || 100),
      tagihanTerdekat: tagihan.filter(function (t) { return t.Status !== 'Lunas' && t.Status !== 'Gratis'; })[0] || null,
      riwayatTagihan: tagihan.slice(0, 6),
      aduanAktif: aduan.length,
      pjAsrama: pj,
      kartuAktif: isTrue_(png.EligibleKartu) && png.Status === 'Aktif'
    });
  }

  // ← Layanan.gs
  function pjAsrama_(jk) {
    const tipe = jk === 'P' ? 'PJ_PUTRI' : 'PJ_PUTRA';
    return DB.filter('MasterData', function (m) { return m.Tipe === tipe && m.Status !== 'Nonaktif'; })
      .map(function (m) {
        const parts = String(m.Nilai).split('|');
        return { nama: parts[0] || '', hp: parts[1] || '', wa: 'https://wa.me/' + String(parts[1] || '').replace(/[^0-9]/g, '') };
      });
  }

  // ← Layanan.gs
  function svcRegMine(u) {
    const rows = DB.filter('Pendaftar', function (r) { return r.UserID === u.UserID || r.Email === u.Email; });
    return ok_(rows);
  }

  // ← Layanan.gs
  function svcRegList(p, u) {
    let rows = applyGenderScope_(DB.all('Pendaftar'), u);
    if (p.status) rows = rows.filter(function (r) { return r.Status === p.status; });
    if (p.cari) {
      const q = String(p.cari).toLowerCase();
      rows = rows.filter(function (r) {
        return String(r.NamaLengkap).toLowerCase().indexOf(q) > -1 || String(r.NIM).indexOf(q) > -1;
      });
    }
    rows = rows.map(function (r) {
      return Object.assign({}, r, {
        FotoURL: fotoUrl_(r), SuratThumb: thumbUrl_(r.SuratID, 480), BuktiThumb: thumbUrl_(r.BuktiID, 480)
      });
    });
    return ok_(rows.sort(function (a, b) { return String(b.TanggalDaftar).localeCompare(String(a.TanggalDaftar)); }));
  }

  // ← Layanan.gs
  function petaAkunPenghuni_(rows) {
    const byId = {}, byPng = {}, byNama = {}, byEmail = {};
    DB.all('Users').forEach(function (us) {
      byId[us.UserID] = us;
      if (us.Role !== 'PNG' && us.Role !== 'PDF') return;
      if (us.PenghuniID) byPng[us.PenghuniID] = us;
      if (us.Username !== '') byNama[String(us.Username).toLowerCase()] = us;
      if (us.Email) byEmail[String(us.Email).toLowerCase()] = us;
    });
    const bebas = function (us, pid) { return us && (!us.PenghuniID || us.PenghuniID === pid); };
    const out = {};
    rows.forEach(function (r) {
      let us = r.UserID ? byId[r.UserID] : null;
      if (us && us.Role !== 'PNG' && us.Role !== 'PDF') us = null;
      if (!us) us = byPng[r.PenghuniID] || null;
      if (!us && r.NIM !== '' && r.NIM !== undefined) { const c = byNama[String(r.NIM).toLowerCase()]; if (bebas(c, r.PenghuniID)) us = c; }
      if (!us && r.Email) { const c = byEmail[String(r.Email).toLowerCase()]; if (bebas(c, r.PenghuniID)) us = c; }
      if (us) out[r.PenghuniID] = { user: us, tertaut: r.UserID === us.UserID && us.PenghuniID === r.PenghuniID };
    });
    return out;
  }

  // ← Layanan.gs
  function svcResidentList(p, u) {
    let rows = applyGenderScope_(DB.all('Penghuni'), u);
    const kamar  = DB.all('Kamar');
    const gedung = DB.all('Gedung');
    const paket  = DB.all('Paket');
  
    if (p.status)        rows = rows.filter(function (r) { return r.Status === p.status; });
    if (p.jenisKelamin)  rows = rows.filter(function (r) { return r.JenisKelamin === p.jenisKelamin; });
    if (p.programKelas)  rows = rows.filter(function (r) { return r.ProgramKelas === p.programKelas; });
    if (p.prodi)         rows = rows.filter(function (r) { return r.Prodi === p.prodi; });
    if (p.angkatan)      rows = rows.filter(function (r) { return String(r.Angkatan) === String(p.angkatan); });
    if (p.paketId)       rows = rows.filter(function (r) { return r.PaketID === p.paketId; });
    if (p.gedungId) {
      const idsKamar = kamar.filter(function (k) { return k.GedungID === p.gedungId; })
                            .map(function (k) { return k.KamarID; });
      rows = rows.filter(function (r) { return idsKamar.indexOf(r.KamarID) > -1; });
    }
    if (p.hanyaKartu)    rows = rows.filter(function (r) { return isTrue_(r.EligibleKartu); });
    if (p.cari) {
      const q = String(p.cari).toLowerCase();
      rows = rows.filter(function (r) {
        return String(r.NamaLengkap).toLowerCase().indexOf(q) > -1 ||
               String(r.NIM).indexOf(q) > -1 || String(r.Email).toLowerCase().indexOf(q) > -1;
      });
    }
  
    // v6.2: join pakai peta (O(n)) — bukan filter berulang (O(n×m))
    const peta = function (arr, key) { const m = {}; arr.forEach(function (x) { m[x[key]] = x; }); return m; };
    const mKamar = peta(kamar, 'KamarID'), mGedung = peta(gedung, 'GedungID'), mPaket = peta(paket, 'PaketID');
    // v6.2: kolom akun (username, sandi awal, status, login terakhir) — HANYA untuk Super Admin
    const mAkun = u.Role === 'SA' ? petaAkunPenghuni_(rows) : null;
    const hasil = rows.map(function (r) {
      const k = mKamar[r.KamarID] || {};
      const g = mGedung[k.GedungID] || {};
      const pk= mPaket[r.PaketID] || {};
      const o = Object.assign({}, r, {
        NomorKamar: k.NomorKamar || '', NamaGedung: g.NamaGedung || '', Lantai: k.Lantai || '',
        NamaPaket: pk.NamaPaket || '', IncludeMakan: isTrue_(pk.IncludeMakan), FotoURL: fotoUrl_(r),
        AdaFoto: !!(r.FotoThumbID || r.FotoID)
      });
      if (mAkun) {
        const a = mAkun[r.PenghuniID], us = a ? a.user : {};
        o.Akun = { UserID: us.UserID || '', Username: us.Username === undefined ? '' : String(us.Username), SandiAwal: us.SandiAwal || '',
                   Status: us.Status || '', LastLogin: us.LastLogin || '', Tertaut: !!(a && a.tertaut) };
      }
      return o;
    });
  
    return ok_({
      rows: hasil,
      ringkasan: {
        total: hasil.length,
        aktif: hasil.filter(function (r) { return r.Status === 'Aktif'; }).length,
        belumBerkamar: hasil.filter(function (r) { return !r.KamarID && r.Status === 'Aktif'; }).length,
        eligibleKartu: hasil.filter(function (r) { return isTrue_(r.EligibleKartu); }).length,
        rataSkor: rataSkor_(hasil),
        perluPembinaan: hasil.filter(function (r) { return toNumber_(r.Skor) < 75; }).length,
        tanpaFoto: hasil.filter(function (r) { return !r.AdaFoto && r.Status === 'Aktif'; }).length,
        tanpaAkun: mAkun ? hasil.filter(function (r) { return !r.Akun.UserID && r.Status === 'Aktif'; }).length : null,
        perluTaut: mAkun ? hasil.filter(function (r) { return r.Akun.UserID && !r.Akun.Tertaut; }).length : null
      }
    });
  }

  // ← Layanan.gs
  function svcCrudList(p, u) {
    const t = p.tabel;
    if (!CRUD_TABLES[t]) return err_('Tabel tidak diizinkan.');
    let rows = DB.all(t);
    if (t === 'Gedung') {
      const g = scopeGender_(u);
      if (g) rows = rows.filter(function (r) { return r.Tipe === (g === 'L' ? 'Putra' : 'Putri'); });
      const kamar = DB.all('Kamar');
      const penghuni = DB.all('Penghuni').filter(function (x) { return x.Status === 'Aktif'; });
      rows = rows.map(function (r) {
        const km = kamar.filter(function (k) { return k.GedungID === r.GedungID; });
        const kapasitas = km.reduce(function (s, k) { return s + toNumber_(k.Kapasitas); }, 0);
        const ids = km.map(function (k) { return k.KamarID; });
        const terisi = penghuni.filter(function (x) { return ids.indexOf(x.KamarID) > -1; }).length;
        return Object.assign({}, r, { jumlahKamar: km.length, kapasitas: kapasitas, terisi: terisi,
          persen: kapasitas ? Math.round(terisi / kapasitas * 1000) / 10 : 0 });
      });
    }
    if (t === 'Kamar' && p.gedungId) rows = rows.filter(function (r) { return r.GedungID === p.gedungId; });
    return ok_(rows);
  }

  // ← Layanan.gs
  function svcRoomBoard(p, u) {
    const g        = scopeGender_(u);
    let gedung     = DB.all('Gedung');
    if (g) gedung  = gedung.filter(function (r) { return r.Tipe === (g === 'L' ? 'Putra' : 'Putri'); });
    const idsGedung= gedung.map(function (r) { return r.GedungID; });
    const kamar    = DB.all('Kamar').filter(function (k) { return idsGedung.indexOf(k.GedungID) > -1; });
    const penghuni = DB.all('Penghuni').filter(function (r) { return r.Status === 'Aktif'; });
    const paket    = DB.all('Paket');
  
    const isiKamar = {};
    penghuni.forEach(function (r) {
      if (!r.KamarID) return;
      if (!isiKamar[r.KamarID]) isiKamar[r.KamarID] = [];
      const pk = paket.filter(function (x) { return x.PaketID === r.PaketID; })[0] || {};
      isiKamar[r.KamarID].push({
        PenghuniID: r.PenghuniID, NamaLengkap: r.NamaLengkap, NIM: r.NIM, Skor: toNumber_(r.Skor),
        NoHP: r.NoHP, NamaPaket: pk.NamaPaket || '', FotoURL: fotoUrl_(r)
      });
    });
  
    const kamarOut = kamar.map(function (k) {
      const isi = isiKamar[k.KamarID] || [];
      const kap = toNumber_(k.Kapasitas);
      return Object.assign({}, k, {
        terisi: isi.length, sisa: Math.max(0, kap - isi.length), penghuni: isi,
        statusIsi: k.Status === 'Perbaikan' ? 'Perbaikan' : (isi.length >= kap ? 'Penuh' : 'Tersedia')
      });
    });
  
    // Antrean penghuni belum berkamar (FR-5.1)
    let antrean = penghuni.filter(function (r) { return !r.KamarID; });
    if (g) antrean = antrean.filter(function (r) { return r.JenisKelamin === g; });
    antrean = antrean.map(function (r) {
      const pk = paket.filter(function (x) { return x.PaketID === r.PaketID; })[0] || {};
      return { PenghuniID: r.PenghuniID, NamaLengkap: r.NamaLengkap, NIM: r.NIM,
               JenisKelamin: r.JenisKelamin, ProgramKelas: r.ProgramKelas, Prodi: r.Prodi,
               Angkatan: r.Angkatan, BeratBadan: r.BeratBadan, NamaPaket: pk.NamaPaket || '',
               PaketID: r.PaketID, NoHP: r.NoHP, FotoURL: fotoUrl_(r) };
    });
  
    return ok_({ gedung: gedung, kamar: kamarOut, antrean: antrean, paket: paket });
  }

  // ← Layanan.gs
  function svcRoomList(p, u) { return svcCrudList({ tabel: 'Kamar', gedungId: p.gedungId }, u); }

  // ← Layanan.gs
  function svcRoomOccupants(p, u) {
    const kamar = DB.find('Kamar', 'KamarID', p.kamarId);
    if (!kamar) return err_('Kamar tidak ditemukan.', 404);
    const isi = DB.filter('Penghuni', function (r) { return r.KamarID === p.kamarId && r.Status === 'Aktif'; });
    const paket = DB.all('Paket');
    return ok_({
      kamar: kamar,
      gedung: DB.find('Gedung', 'GedungID', kamar.GedungID) || {},
      penghuni: isi.map(function (r) {
        const pk = paket.filter(function (x) { return x.PaketID === r.PaketID; })[0] || {};
        return Object.assign({}, r, { NamaPaket: pk.NamaPaket || '', FotoURL: fotoUrl_(r),
          wa: 'https://wa.me/' + hp62_(r.NoHP) });
      })
    });
  }

  // ← Layanan.gs
  function svcBillingList(p, u) {
    const penghuni = DB.all('Penghuni');
    const kamar    = DB.all('Kamar');
    const paket    = DB.all('Paket');
    let rows = DB.all('Tagihan');
  
    const g = scopeGender_(u);
    if (g) {
      const ids = penghuni.filter(function (r) { return r.JenisKelamin === g; }).map(function (r) { return r.PenghuniID; });
      rows = rows.filter(function (t) { return ids.indexOf(t.PenghuniID) > -1; });
    }
    if (p.periode) rows = rows.filter(function (t) { return String(t.Periode) === p.periode; });
    if (p.status)  rows = rows.filter(function (t) { return t.Status === p.status; });
  
    let hasil = rows.map(function (t) {
      const png = penghuni.filter(function (r) { return r.PenghuniID === t.PenghuniID; })[0] || {};
      const km  = kamar.filter(function (r) { return r.KamarID === png.KamarID; })[0] || {};
      const pk  = paket.filter(function (r) { return r.PaketID === t.PaketID; })[0] || {};
      return Object.assign({}, t, {
        NamaLengkap: png.NamaLengkap || '-', NIM: png.NIM || '', JenisKelamin: png.JenisKelamin || '',
        ProgramKelas: png.ProgramKelas || '', NomorKamar: km.NomorKamar || '-', NamaPaket: pk.NamaPaket || '-'
      });
    });
    if (p.cari) {
      const q = String(p.cari).toLowerCase();
      hasil = hasil.filter(function (t) {
        return String(t.NamaLengkap).toLowerCase().indexOf(q) > -1 ||
               String(t.NIM).indexOf(q) > -1 || String(t.TagihanID).toLowerCase().indexOf(q) > -1;
      });
    }
    if (p.jenisKelamin) hasil = hasil.filter(function (t) { return t.JenisKelamin === p.jenisKelamin; });
  
    const total = hasil.reduce(function (s, t) { return s + toNumber_(t.Jumlah); }, 0);
    const terkumpul = hasil.filter(function (t) { return t.Status === 'Lunas'; })
                           .reduce(function (s, t) { return s + toNumber_(t.Jumlah); }, 0);
    return ok_({
      rows: hasil.sort(function (a, b) { return String(b.TanggalTerbit).localeCompare(String(a.TanggalTerbit)); }),
      ringkasan: {
        totalTagihan: total, terkumpul: terkumpul, tunggakan: total - terkumpul,
        jumlahLunas: hasil.filter(function (t) { return t.Status === 'Lunas'; }).length,
        jumlahGratis: hasil.filter(function (t) { return t.Status === 'Gratis'; }).length,
        jumlahBelum: hasil.filter(function (t) { return t.Status === 'Belum Bayar' || t.Status === 'Terlambat'; }).length,
        menungguVerifikasi: DB.filter('Pembayaran', function (b) { return b.Status === 'Menunggu'; }).length
      }
    });
  }

  // ← Layanan.gs
  function svcBillingMine(u) {
    const png = DB.find('Penghuni', 'UserID', u.UserID);
    if (!png) return err_('Data penghuni tidak ditemukan.', 404);
    const tagihan = DB.filter('Tagihan', function (t) { return t.PenghuniID === png.PenghuniID; })
      .sort(function (a, b) { return String(b.Periode).localeCompare(String(a.Periode)); });
    const bayar = DB.filter('Pembayaran', function (b) { return b.PenghuniID === png.PenghuniID; });
    return ok_({
      tagihan: tagihan.map(function (t) {
        return Object.assign({}, t, {
          pembayaran: bayar.filter(function (b) { return b.TagihanID === t.TagihanID; })
        });
      }),
      rekening: setting_('REKENING_BANK', ''),
      totalTunggakan: tagihan.filter(function (t) { return t.Status === 'Belum Bayar' || t.Status === 'Terlambat'; })
        .reduce(function (s, t) { return s + toNumber_(t.Jumlah); }, 0)
    });
  }

  // ← Layanan.gs
  function svcBillingEligible(p, u) {
    const periode = p.periode || periodeNow_();
    const tagihan = DB.filter('Tagihan', function (t) { return String(t.Periode) === periode; });
    const sudah   = tagihan.map(function (t) { return t.PenghuniID; });
    const paket   = DB.all('Paket');
    const kamar   = DB.all('Kamar');
    const rows = DB.all('Penghuni').filter(function (r) {
      return r.Status === 'Aktif' && sudah.indexOf(r.PenghuniID) === -1;
    }).map(function (r) {
      const pk = paket.filter(function (x) { return x.PaketID === r.PaketID; })[0] || {};
      const km = kamar.filter(function (x) { return x.KamarID === r.KamarID; })[0] || {};
      return { PenghuniID: r.PenghuniID, NamaLengkap: r.NamaLengkap, NIM: r.NIM,
               JenisKelamin: r.JenisKelamin, NomorKamar: km.NomorKamar || '-',
               PaketID: r.PaketID, NamaPaket: pk.NamaPaket || '-', Harga: toNumber_(pk.Harga) };
    });
    return ok_({ periode: periode, rows: rows,
                 estimasi: rows.reduce(function (s, r) { return s + r.Harga; }, 0) });
  }

  // ← Layanan.gs
  function svcBillingPending(p, u) {
    const penghuni = DB.all('Penghuni');
    const rows = DB.filter('Pembayaran', function (b) { return b.Status === 'Menunggu'; }).map(function (b) {
      const png = penghuni.filter(function (r) { return r.PenghuniID === b.PenghuniID; })[0] || {};
      const tgh = DB.find('Tagihan', 'TagihanID', b.TagihanID) || {};
      return Object.assign({}, b, {
        NamaLengkap: png.NamaLengkap || '-', NIM: png.NIM || '', Periode: tgh.Periode || '',
        NominalTagihan: tgh.Jumlah || 0, BuktiURL: fileUrl_(b.BuktiID), BuktiThumb: thumbUrl_(b.BuktiID, 480)
      });
    });
    return ok_(rows);
  }

  // ← Layanan.gs
  function svcHelpdeskMine(u) {
    const png = DB.find('Penghuni', 'UserID', u.UserID);
    if (!png) return err_('Data penghuni tidak ditemukan.', 404);
    const rows = DB.filter('Aduan', function (a) { return a.PenghuniID === png.PenghuniID; });
    const balasan = DB.all('AduanBalasan');
    return ok_({
      rows: rows.map(function (a) {
        return Object.assign({}, a, {
          balasan: balasan.filter(function (b) { return b.AduanID === a.AduanID; })
        });
      }),
      pjAsrama: pjAsrama_(png.JenisKelamin) // FR-7.4, FR-7.5, BR-19
    });
  }

  // ← Layanan.gs
  function svcHelpdeskList(p, u) {
    let rows = DB.all('Aduan');
    const penghuni = DB.all('Penghuni');
    const g = scopeGender_(u);
    if (g) {
      const ids = penghuni.filter(function (r) { return r.JenisKelamin === g; }).map(function (r) { return r.PenghuniID; });
      rows = rows.filter(function (a) { return ids.indexOf(a.PenghuniID) > -1; });
    }
    if (p.status) rows = rows.filter(function (a) { return a.Status === p.status; });
    const balasan = DB.all('AduanBalasan');
    return ok_(rows.map(function (a) {
      const png = penghuni.filter(function (r) { return r.PenghuniID === a.PenghuniID; })[0] || {};
      const km  = DB.find('Kamar', 'KamarID', png.KamarID) || {};
      return Object.assign({}, a, {
        NomorKamar: km.NomorKamar || '-', NoHP: png.NoHP || '', LampiranURL: fileUrl_(a.LampiranID),
        LampiranThumb: thumbUrl_(a.LampiranID, 480),
        balasan: balasan.filter(function (b) { return b.AduanID === a.AduanID; })
      });
    }).sort(function (a, b) { return String(b.TanggalBuat).localeCompare(String(a.TanggalBuat)); }));
  }

  // ← Layanan.gs
  function svcDiscList(p, u) {
    let rows = DB.all('Teguran');
    const penghuni = DB.all('Penghuni');
    const g = scopeGender_(u);
    if (g) {
      const ids = penghuni.filter(function (r) { return r.JenisKelamin === g; }).map(function (r) { return r.PenghuniID; });
      rows = rows.filter(function (t) { return ids.indexOf(t.PenghuniID) > -1; });
    }
    if (p.kode)  rows = rows.filter(function (t) { return t.KodePelanggaran === p.kode; });
    if (p.dari)  rows = rows.filter(function (t) { return String(t.TanggalKejadian) >= p.dari; });
    if (p.sampai)rows = rows.filter(function (t) { return String(t.TanggalKejadian) <= p.sampai; });
  
    return ok_(rows.map(function (t) {
      const png = penghuni.filter(function (r) { return r.PenghuniID === t.PenghuniID; })[0] || {};
      const km  = DB.find('Kamar', 'KamarID', png.KamarID) || {};
      return Object.assign({}, t, {
        NamaLengkap: png.NamaLengkap || '-', NIM: png.NIM || '', JenisKelamin: png.JenisKelamin || '',
        NomorKamar: km.NomorKamar || '-', SkorSaatIni: toNumber_(png.Skor), BuktiURL: fileUrl_(t.BuktiID), BuktiThumb: thumbUrl_(t.BuktiID, 480)
      });
    }).sort(function (a, b) { return String(b.TanggalTerbit).localeCompare(String(a.TanggalTerbit)); }));
  }

  // ← Layanan.gs
  function svcDiscMine(u) {
    const png = DB.find('Penghuni', 'UserID', u.UserID);
    if (!png) return err_('Data penghuni tidak ditemukan.', 404);
    return ok_({
      skor: toNumber_(png.Skor || 100),
      teguran: DB.filter('Teguran', function (t) { return t.PenghuniID === png.PenghuniID; }),
      riwayatSkor: DB.filter('SkorLog', function (s) { return s.PenghuniID === png.PenghuniID; })
    });
  }

  // ← Layanan.gs
  function svcDiscHistory(p, u) {
    return ok_(DB.filter('SkorLog', function (s) { return s.PenghuniID === p.penghuniId; })
      .sort(function (a, b) { return String(b.Tanggal).localeCompare(String(a.Tanggal)); }));
  }

  // ← Layanan.gs
  function svcDiscRekap(p, u) {
    const penghuni = applyGenderScope_(DB.all('Penghuni').filter(function (r) { return r.Status === 'Aktif'; }), u);
    const ids = penghuni.map(function (r) { return r.PenghuniID; });
    let teguran = DB.all('Teguran').filter(function (t) { return ids.indexOf(t.PenghuniID) > -1; });
    if (p.dari)   teguran = teguran.filter(function (t) { return String(t.TanggalKejadian) >= p.dari; });
    if (p.sampai) teguran = teguran.filter(function (t) { return String(t.TanggalKejadian) <= p.sampai; });
  
    const master = DB.filter('MasterData', function (m) { return m.Tipe === 'PELANGGARAN'; });
    const kategori = master.map(function (m) {
      const kas = teguran.filter(function (t) { return t.KodePelanggaran === m.Kode; });
      return {
        kode: m.Kode, nama: m.Nilai, tingkat: m.Induk, poin: toNumber_(m.Poin),
        frekuensi: kas.length,
        putra: kas.filter(function (t) {
          const png = penghuni.filter(function (r) { return r.PenghuniID === t.PenghuniID; })[0];
          return png && png.JenisKelamin === 'L';
        }).length,
        putri: kas.filter(function (t) {
          const png = penghuni.filter(function (r) { return r.PenghuniID === t.PenghuniID; })[0];
          return png && png.JenisKelamin === 'P';
        }).length,
        selesai: kas.filter(function (t) { return t.Status === 'Selesai'; }).length
      };
    });
  
    const distribusi = {
      sempurna: penghuni.filter(function (r) { return toNumber_(r.Skor) === 100; }).length,
      prima:    penghuni.filter(function (r) { return toNumber_(r.Skor) >= 90 && toNumber_(r.Skor) < 100; }).length,
      cukup:    penghuni.filter(function (r) { return toNumber_(r.Skor) >= 75 && toNumber_(r.Skor) < 90; }).length,
      peringatan:penghuni.filter(function (r) { return toNumber_(r.Skor) < 75; }).length
    };
  
    return ok_({
      kpi: {
        rataSkor: rataSkor_(penghuni), totalKasus: teguran.length,
        dalamPembinaan: distribusi.peringatan,
        rataPenalti: teguran.length ? Math.round(teguran.reduce(function (s, t) { return s + toNumber_(t.Poin); }, 0) / teguran.length * 10) / 10 : 0,
        sp1: teguran.filter(function (t) { return t.JenisSP === 'SP-1'; }).length,
        sp2: teguran.filter(function (t) { return t.JenisSP === 'SP-2'; }).length,
        sp3: teguran.filter(function (t) { return t.JenisSP === 'SP-3'; }).length
      },
      kategori: kategori,
      distribusi: distribusi,
      perluTindakan: penghuni.filter(function (r) { return toNumber_(r.Skor) < 75; })
        .sort(function (a, b) { return toNumber_(a.Skor) - toNumber_(b.Skor); })
        .slice(0, 10)
        .map(function (r) {
          return { PenghuniID: r.PenghuniID, NamaLengkap: r.NamaLengkap, NIM: r.NIM,
                   Skor: toNumber_(r.Skor), JenisKelamin: r.JenisKelamin,
                   NoHPWali: r.NoHPWali, NamaWali: r.NamaWali };
        }),
      logTerbaru: DB.all('Teguran').slice(-8).reverse()
    });
  }

  // ← Layanan2.gs
  function svcArchiveList(p, u) {
    const dok = DB.all('Dokumen').filter(function (d) { return d.Status !== 'Dihapus'; })
      .map(function (d) { return Object.assign({}, d, { URL: fileUrl_(d.DriveFileID), Thumb: thumbUrl_(d.DriveFileID, 400) }); });
    const pgm = DB.all('Pengumuman').filter(function (g) {
      if (u && u.Role === 'PNG') return g.Target === 'SEMUA' || g.Target === 'PNG';
      return true;
    }).sort(function (a, b) { return String(b.TanggalKirim).localeCompare(String(a.TanggalKirim)); });
    return ok_({ dokumen: dok, pengumuman: pgm });
  }

  // ← Layanan2.gs
  function svcNotifList(u) {
    // v7.0: query terarah ke notifikasi milik user (3.000 terbaru) — tidak memindai seluruh tabel
    const rows = DB.tail('Notifikasi', 3000, { UserID: u.UserID }).filter(function (n) { return n.UserID === u.UserID; })
      .sort(function (a, b) { return String(b.Tanggal).localeCompare(String(a.Tanggal)); }).slice(0, 50);
    return ok_({ rows: rows, belumDibaca: rows.filter(function (n) { return !isTrue_(n.Dibaca); }).length });
  }

  // ← Layanan2.gs
  function svcSettingsList(u) {
    let rows = DB.all('Pengaturan');
    if (u.Role !== 'SA') {
      rows = rows.filter(function (r) { return String(r.Kunci).indexOf('SECRET') === -1 && r.Kunci !== 'NOTIF_MATRIKS'; });
    }
    return ok_(rows);
  }

  // ← Layanan2.gs
  function svcUserList(p, u) {
    return ok_(DB.all('Users').map(function (x) {
      const o = Object.assign({}, x);
      delete o.PasswordHash; // jangan pernah kirim hash ke frontend
      o.GoogleTertaut = !!x.GoogleSub; delete o.GoogleSub;
      o.WajibGoogle = STAFF_ROLES.indexOf(x.Role) > -1;
      o.RoleNama = ROLES[x.Role] || x.Role;
      if (u.Role !== 'SA' && u.Role !== 'PMB') delete o.SandiAwal; // BR-12
      return o;
    }));
  }

  // ← Layanan2.gs
  function svcMasterList(p) {
    let rows = DB.all('MasterData');
    if (p.tipe)  rows = rows.filter(function (m) { return m.Tipe === p.tipe; });
    if (p.induk) rows = rows.filter(function (m) { return m.Induk === p.induk; }); // FR-1.3 prodi tersaring
    return ok_(rows);
  }

  // ← Layanan2.gs
  function svcMasterListAll() {
    const rows = DB.all('MasterData');
    const out = {};
    rows.forEach(function (m) { (out[m.Tipe] = out[m.Tipe] || []).push(m); });
    return ok_(out);
  }

  // ← Layanan2.gs
  function svcMetaRef() {
    const master = DB.all('MasterData').filter(function (m) { return m.Status !== 'Nonaktif'; });
    const byTipe = {};
    master.forEach(function (m) { (byTipe[m.Tipe] = byTipe[m.Tipe] || []).push(m); });
    return ok_({
      programKelas: byTipe.PROGRAM_KELAS || [],
      prodi: byTipe.PRODI || [],
      angkatan: byTipe.ANGKATAN || [],
      pelanggaran: byTipe.PELANGGARAN || [],
      kategoriAduan: byTipe.KATEGORI_ADUAN || [],
      paket: DB.all('Paket').filter(function (x) { return x.Status === 'Aktif'; }),
      gedung: DB.all('Gedung'),
      pendaftaranDibuka: setting_('PENDAFTARAN_DIBUKA', 'YA') === 'YA',
      institusi: setting_('NAMA_INSTITUSI', 'STIS Al Wafa Bogor'),
      tahunAkademik: setting_('TAHUN_AKADEMIK', ''),
      semester: setting_('SEMESTER_AKTIF', ''),
      batasGelombang: setting_('BATAS_GELOMBANG', ''),
      rekening: setting_('REKENING_BANK', ''),
      logo: setting_('LOGO_URL', '')
    });
  }

  // ← Layanan2.gs
  function svcBrandingGet() {
    return ok_({ logo: setting_('LOGO_URL', ''), institusi: setting_('NAMA_INSTITUSI', ''),
                 aplikasi: setting_('NAMA_APLIKASI', '') });
  }

  // ← Layanan2.gs
  function jadwalMakan_() {
    return [
      { sesi: 'Pagi',  mulai: setting_('JAM_MAKAN_PAGI_MULAI', '05:30'),  selesai: setting_('JAM_MAKAN_PAGI_SELESAI', '07:30') },
      { sesi: 'Siang', mulai: setting_('JAM_MAKAN_SIANG_MULAI', '11:30'), selesai: setting_('JAM_MAKAN_SIANG_SELESAI', '13:30') },
      { sesi: 'Malam', mulai: setting_('JAM_MAKAN_MALAM_MULAI', '17:00'), selesai: setting_('JAM_MAKAN_MALAM_SELESAI', '19:30') }
    ];
  }

  // ← Layanan2.gs
  function sesiMakanSekarang_() {
    const jam = jamNow_();
    const jadwal = jadwalMakan_();
    for (let i = 0; i < jadwal.length; i++) {
      if (jam >= jadwal[i].mulai && jam <= jadwal[i].selesai) {
        return { sesi: jadwal[i].sesi, dalamJam: true, mulai: jadwal[i].mulai, selesai: jadwal[i].selesai, jamSekarang: jam };
      }
    }
    // Di luar jam makan → tentukan sesi terdekat untuk keperluan override
    let terdekat = jadwal[0];
    for (let i = 0; i < jadwal.length; i++) if (jam > jadwal[i].selesai) terdekat = jadwal[i];
    return { sesi: terdekat.sesi, dalamJam: false, mulai: terdekat.mulai, selesai: terdekat.selesai, jamSekarang: jam };
  }

  // ← Layanan2.gs
  function svcMealList(p, u) {
    const bulan = p.bulan || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM');
    const parts = bulan.split('-');
    const nama = 'LogMakan_' + parts[0] + '_' + parts[1];
    let logs = [];
    try { logs = DB.all(nama); } catch (e) { logs = []; }
    if (p.tanggal)    logs = logs.filter(function (l) { return String(l.Tanggal) === p.tanggal; });
    if (p.waktuMakan) logs = logs.filter(function (l) { return l.WaktuMakan === p.waktuMakan; });
    if (p.penghuniId) logs = logs.filter(function (l) { return l.PenghuniID === p.penghuniId; });
    const g = scopeGender_(u);
    if (g) {
      const ids = DB.all('Penghuni').filter(function (r) { return r.JenisKelamin === g; })
                    .map(function (r) { return r.PenghuniID; });
      logs = logs.filter(function (l) { return ids.indexOf(l.PenghuniID) > -1; });
    }
    return ok_({ bulan: bulan, rows: logs.slice(-500).reverse(), total: logs.length });
  }

  // ← Layanan2.gs
  function svcMealKPI(p, u) {
    const now = new Date();
    const nama = 'LogMakan_' + now.getFullYear() + '_' + ('0' + (now.getMonth() + 1)).slice(-2);
    let logs = [];
    try { logs = DB.all(nama); } catch (e) { logs = []; }
    const tgl = today_();
    const hariIni = logs.filter(function (l) { return String(l.Tanggal) === tgl; });
    const berhak = DB.all('Penghuni').filter(function (r) {
      return r.Status === 'Aktif' && isTrue_(r.EligibleKartu);
    }).length;
  
    const hitung = function (sesi) { return hariIni.filter(function (l) { return l.WaktuMakan === sesi; }).length; };
    const sesiNow = sesiMakanSekarang_();
  
    // Rekap bulan berjalan per sesi (untuk laporan presensi konsumsi)
    const perSesi = WAKTU_MAKAN.map(function (s) {
      const rows = logs.filter(function (l) { return l.WaktuMakan === s; });
      const hari = {};
      rows.forEach(function (l) { hari[l.Tanggal] = (hari[l.Tanggal] || 0) + 1; });
      const jml = Object.keys(hari).length || 1;
      const jadwal = jadwalMakan_().filter(function (j) { return j.sesi === s; })[0] || {};
      return {
        sesi: s, mulai: jadwal.mulai, selesai: jadwal.selesai, target: berhak,
        rataTap: Math.round(rows.length / jml), total: rows.length,
        persen: berhak ? Math.round(rows.length / jml / berhak * 1000) / 10 : 0
      };
    });
  
    return ok_({
      totalHariIni: hariIni.length, pagi: hitung('Pagi'), siang: hitung('Siang'), malam: hitung('Malam'),
      santriBerhak: berhak, sesiAktif: sesiNow,
      sudahTapSesiIni: hariIni.filter(function (l) { return l.WaktuMakan === sesiNow.sesi; }).length,
      sisaKuota: Math.max(0, berhak - hariIni.filter(function (l) { return l.WaktuMakan === sesiNow.sesi; }).length),
      perSesi: perSesi,
      totalBulanIni: logs.length,
      ditolakHariIni: 0,
      riwayat: logs.slice(-20).reverse()
    });
  }

  // ← Layanan2.gs
  function svcReportCatalog(u) {
    return ok_([
      { kode: 'penghuni',   nama: 'Daftar Penghuni Aktif',       ikon: 'users' },
      { kode: 'penempatan', nama: 'Rekap Okupansi Kamar',        ikon: 'building' },
      { kode: 'tagihan',    nama: 'Rekap Tagihan & Pembayaran',  ikon: 'wallet' },
      { kode: 'teguran',    nama: 'Rekap Kedisiplinan',          ikon: 'shield' },
      { kode: 'makan',      nama: 'Log Konsumsi Katering',       ikon: 'utensils' },
      { kode: 'pendaftaran',nama: 'Rekap Pendaftaran',           ikon: 'clipboard' }
    ]);
  }

  // ← Layanan2.gs
  function svcImportHistory(u) {
    const users = DB.all('Users');
    return ok_(DB.all('ImportLog').map(function (r) {
      const usr = users.filter(function (x) { return x.UserID === r.DilakukanOleh; })[0] || {};
      return Object.assign({}, r, { NamaOperator: usr.NamaLengkap || r.DilakukanOleh });
    }).sort(function (a, b) { return String(b.Tanggal).localeCompare(String(a.Tanggal)); }));
  }

  // ← Migrasi.gs
  function svcMigrasiHistory(u) {
    return ok_(DB.all('MigrasiLog').slice(-200).reverse());
  }

  // ← Supabase.gs
  function sbIn_(cols, r) {
    const o = {};
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      let v = r[c];
      if (v === null || v === undefined) v = '';
      else if (KOLOM_HP[c]) v = hp08_(v);
      else if (c === 'Periode' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) v = v.substring(0, 7);
      o[c] = v;
    }
    return o;
  }
  /* ========================================================================= */

  var AKSI = {
    "archive.list": {
      peran: ["SA","PMB","KEU","PA","PI","PTG","PIM","PNG","PDF"],
      fn: function (p, u) { return svcArchiveList(p, u); },
      tabel: function (p, u) { return ["Dokumen", "Pengumuman"]; }
    },
    "billing.eligible": {
      peran: ["SA","KEU"],
      fn: function (p, u) { return svcBillingEligible(p, u); },
      tabel: function (p, u) { return ["Tagihan", "Paket", "Kamar", "Penghuni"]; }
    },
    "billing.list": {
      peran: ["SA","KEU","PIM"],
      fn: function (p, u) { return svcBillingList(p, u); },
      tabel: function (p, u) { return ["Penghuni", "Kamar", "Paket", "Tagihan", "Pembayaran"]; }
    },
    "billing.mine": {
      peran: ["PNG"],
      fn: function (p, u) { return svcBillingMine(u); },
      tabel: function (p, u) { return ["Penghuni", "Tagihan", "Pembayaran", "Pengaturan"]; }
    },
    "billing.pending": {
      peran: ["SA","KEU","PIM"],
      fn: function (p, u) { return svcBillingPending(p, u); },
      tabel: function (p, u) { return ["Penghuni", "Pembayaran", "Tagihan"]; }
    },
    "branding.get": {
      peran: ["SA","PMB","KEU","PA","PI","PTG","PIM","PNG","PDF"],
      fn: function (p, u) { return svcBrandingGet(); },
      tabel: function (p, u) { return ["Pengaturan"]; }
    },
    "crm.list": {
      peran: ["SA","PMB","KEU","PA","PI","PIM"],
      fn: function (p, u) { return svcCrmList(p, u); },
      tabel: function (p, u) { return ["CRM_Kontak"]; }
    },
    "crud.list": {
      peran: ["SA","PMB","KEU","PA","PI","PIM"],
      fn: function (p, u) { return svcCrudList(p, u); },
      tabel: function (p, u) { return p.tabel === 'Gedung' ? ['Gedung', 'Kamar', 'Penghuni'] : (CRUD_TABLES[p.tabel] ? [p.tabel] : []); },
      kecuali: function (role, p) { var k = {"PA":{"tabel":"Gedung"},"PI":{"tabel":"Gedung"}}[role]; return !!k && Object.keys(k).every(function (x) { return p[x] === k[x]; }); }
    },
    "dashboard.admin": {
      peran: ["SA","PIM"],
      fn: function (p, u) { return svcDashboardAdmin(u); },
      tabel: function (p, u) { return ["Penghuni", "Kamar", "Gedung", "Tagihan", "Pendaftar", "Pembayaran", "Pengaturan", 'LogMakan_' + new Date().getFullYear() + '_' + ('0' + (new Date().getMonth() + 1)).slice(-2)]; }
    },
    "dashboard.resident": {
      peran: ["PNG"],
      fn: function (p, u) { return svcDashboardResident(u); },
      tabel: function (p, u) { return ["Penghuni", "Kamar", "Gedung", "Paket", "Tagihan", "Aduan", "MasterData"]; }
    },
    "discipline.history": {
      peran: ["SA","PA","PI","PIM"],
      fn: function (p, u) { return svcDiscHistory(p, u); },
      tabel: function (p, u) { return ["SkorLog"]; }
    },
    "discipline.list": {
      peran: ["SA","PA","PI","PIM"],
      fn: function (p, u) { return svcDiscList(p, u); },
      tabel: function (p, u) { return ["Teguran", "Penghuni", "Kamar"]; }
    },
    "discipline.mine": {
      peran: ["PNG"],
      fn: function (p, u) { return svcDiscMine(u); },
      tabel: function (p, u) { return ["Penghuni", "Teguran", "SkorLog"]; }
    },
    "discipline.rekap": {
      peran: ["SA","PA","PI","PIM"],
      fn: function (p, u) { return svcDiscRekap(p, u); },
      tabel: function (p, u) { return ["Penghuni", "Teguran", "MasterData"]; }
    },
    "doc.list": {
      peran: ["SA","PA","PI","PIM"],
      fn: function (p, u) { return svcDocList(p, u); },
      tabel: function (p, u) { return ["Penghuni", "DE_Dokumen"]; }
    },
    "doc.templates": {
      peran: ["SA","PA","PI","PIM"],
      fn: function (p, u) { return svcDocTemplates(p, u); },
      tabel: function (p, u) { return ["DE_Template"]; }
    },
    "helpdesk.list": {
      peran: ["SA","PA","PI","PMB"],
      fn: function (p, u) { return svcHelpdeskList(p, u); },
      tabel: function (p, u) { return ["Aduan", "Penghuni", "AduanBalasan", "Kamar"]; }
    },
    "helpdesk.mine": {
      peran: ["PNG"],
      fn: function (p, u) { return svcHelpdeskMine(u); },
      tabel: function (p, u) { return ["Penghuni", "Aduan", "AduanBalasan", "MasterData"]; }
    },
    "import.history": {
      peran: ["SA"],
      fn: function (p, u) { return svcImportHistory(u); },
      tabel: function (p, u) { return ["ImportLog"].concat(u && (u.Role === 'SA' || u.Role === 'PMB') ? ['Users'] : []); }
    },
    "master.list": {
      peran: ["SA","PMB","KEU","PA","PI","PTG","PIM","PNG","PDF"],
      fn: function (p, u) { return svcMasterList(p); },
      tabel: function (p, u) { return ["MasterData"]; }
    },
    "master.listAll": {
      peran: ["SA","PMB","PA","PI","KEU"],
      fn: function (p, u) { return svcMasterListAll(); },
      tabel: function (p, u) { return ["MasterData"]; }
    },
    "meal.dashboardKPI": {
      peran: ["SA","PIM"],
      fn: function (p, u) { return svcMealKPI(p, u); },
      tabel: function (p, u) { return ["Penghuni", "Pengaturan", 'LogMakan_' + new Date().getFullYear() + '_' + ('0' + (new Date().getMonth() + 1)).slice(-2)]; }
    },
    "meal.list": {
      peran: ["SA","PA","PI","PIM","PTG"],
      fn: function (p, u) { return svcMealList(p, u); },
      tabel: function (p, u) { return ['Penghuni', 'LogMakan_' + String(p.bulan || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM')).split('-').slice(0, 2).join('_')]; }
    },
    "meta.ref": {
      peran: ["SA","PMB","KEU","PA","PI","PTG","PIM","PNG","PDF"],
      fn: function (p, u) { return svcMetaRef(); },
      tabel: function (p, u) { return ["MasterData", "Paket", "Gedung", "Pengaturan"]; }
    },
    "migrasi.history": {
      peran: ["SA"],
      fn: function (p, u) { return svcMigrasiHistory(u); },
      tabel: function (p, u) { return ["MigrasiLog"]; }
    },
    "notify.list": {
      peran: ["SA","PMB","KEU","PA","PI","PTG","PIM","PNG","PDF"],
      fn: function (p, u) { return svcNotifList(u); },
      tabel: function (p, u) { return ["Notifikasi"]; }
    },
    "registration.list": {
      peran: ["SA","PMB","PA","PI","PIM"],
      fn: function (p, u) { return svcRegList(p, u); },
      tabel: function (p, u) { return ["Pendaftar"]; }
    },
    "registration.mine": {
      peran: ["PDF","PNG"],
      fn: function (p, u) { return svcRegMine(u); },
      tabel: function (p, u) { return ["Pendaftar"]; }
    },
    "reports.catalog": {
      peran: ["SA","KEU","PA","PI","PIM","PMB"],
      fn: function (p, u) { return svcReportCatalog(u); },
      tabel: function (p, u) { return []; }
    },
    "residents.list": {
      peran: ["SA","PMB","KEU","PA","PI","PIM"],
      fn: function (p, u) { return svcResidentList(p, u); },
      tabel: function (p, u) { return ["Penghuni", "Kamar", "Gedung", "Paket"].concat(u && (u.Role === 'SA' || u.Role === 'PMB') ? ['Users'] : []); }
    },
    "rooms.board": {
      peran: ["SA","PIM","PMB"],
      fn: function (p, u) { return svcRoomBoard(p, u); },
      tabel: function (p, u) { return ["Gedung", "Kamar", "Penghuni", "Paket"]; }
    },
    "rooms.list": {
      peran: ["SA","PA","PI","PIM","PMB"],
      fn: function (p, u) { return svcRoomList(p, u); },
      tabel: function (p, u) { return ['Kamar']; }
    },
    "rooms.occupants": {
      peran: ["SA","PIM","PMB"],
      fn: function (p, u) { return svcRoomOccupants(p, u); },
      tabel: function (p, u) { return ["Kamar", "Penghuni", "Paket", "Gedung"]; }
    },
    "settings.list": {
      peran: ["SA","PA","PI","PTG","PMB","KEU","PIM","PNG"],
      fn: function (p, u) { return svcSettingsList(u); },
      tabel: function (p, u) { return ["Pengaturan"]; }
    },
    "users.list": {
      peran: ["SA","PMB"],
      fn: function (p, u) { return svcUserList(p, u); },
      tabel: function (p, u) { return [].concat(u && (u.Role === 'SA' || u.Role === 'PMB') ? ['Users'] : []); }
    }
  };

  /* ---------------- pemuatan tabel dari Supabase (RLS) ---------------- */
  function nyata(name) {
    var m = /^LogMakan_(\d{4})_(\d{2})$/.exec(String(name));
    if (!m) return { tabel: name, filter: '' };
    var th = parseInt(m[1], 10), bl = parseInt(m[2], 10);
    var akhir = bl === 12 ? (th + 1) + '-01-01' : th + '-' + ('0' + (bl + 1)).slice(-2) + '-01';
    return { tabel: 'LogMakan', filter: '&Tanggal=gte.' + m[1] + '-' + m[2] + '-01&Tanggal=lt.' + akhir };
  }
  function urutan(t) { return (SB_TAIL[t] ? SB_TAIL[t] + '.asc,' : '') + '_n.asc'; }
  function kepala(token, extra) {
    var h = { apikey: kunciAnon, 'x-app-token': token, Accept: 'application/json' };
    if (!/^sb_/.test(kunciAnon)) h.Authorization = 'Bearer ' + kunciAnon;
    Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  function ambil(url, opt) {
    return fetch(url, opt).then(function (res) {
      if (res.status === 401 || res.status === 403) { SBB.mati = true; SBB.alasan = 'Supabase menolak kunci (HTTP ' + res.status + ') — periksa SUPABASE_ANON_KEY'; }
      if (!res.ok) return res.text().then(function (t) { throw new Error('Supabase HTTP ' + res.status + ': ' + String(t).slice(0, 160)); });
      return res;
    });
  }
  function muatTabel(name, token) {
    var v = nyata(name), cols = SB_COLS[v.tabel];
    if (!cols) return Promise.reject(new Error('Tabel tidak dikenal: ' + name));
    if (v.tabel === 'Users') {
      return ambil(REST + 'rpc/baca_users', { method: 'POST', headers: kepala(token, { 'Content-Type': 'application/json' }), body: '{}' })
        .then(function (r) { return r.json(); })
        .then(function (rows) { return (rows || []).map(function (r) { return sbIn_(cols, r); }); });
    }
    var dasar = REST + encodeURIComponent(v.tabel) + '?select=*' + v.filter + '&order=' + urutan(v.tabel);
    return ambil(dasar + '&limit=' + HAL + '&offset=0', { headers: kepala(token, { Prefer: 'count=exact' }) }).then(function (res) {
      var total = Number(String(res.headers.get('Content-Range') || '').split('/')[1]);
      return res.json().then(function (rows) {
        if (!isFinite(total) && rows.length) return lanjutBerurutan(dasar, token, rows, rows.length);   // header jumlah tak terbaca → halaman demi halaman
        if (!(total > rows.length) || !rows.length) return rows;
        var hal = rows.length, tugas = [];
        for (var off = hal; off < total; off += hal) {
          tugas.push(ambil(dasar + '&limit=' + hal + '&offset=' + off, { headers: kepala(token) }).then(function (r) { return r.json(); }));
        }
        return Promise.all(tugas).then(function (bag) { bag.forEach(function (b) { rows = rows.concat(b); }); return rows; });
      });
    }).then(function (rows) { return rows.map(function (r) { return sbIn_(cols, r); }); });
  }
  function lanjutBerurutan(dasar, token, rows, hal) {
    return ambil(dasar + '&limit=' + hal + '&offset=' + rows.length, { headers: kepala(token) }).then(function (r) { return r.json(); })
      .then(function (b) { rows = rows.concat(b); return b.length === hal ? lanjutBerurutan(dasar, token, rows, hal) : rows; });
  }
  // tabel yang baru dimuat dipakai bersama beberapa aksi sekaligus (prefetch menu) selama 4 detik
  var SIMPAN = {};
  function epochKini() { return (w.TURBO && w.TURBO.epoch) || 0; }
  function muatSemua(nama, token) {
    var kini = Date.now(), ep = epochKini();
    return Promise.all(nama.map(function (n) {
      var c = SIMPAN[n];
      if (c && c.token === token && c.ep === ep && kini - c.t < 4000) return c.janji;
      var janji = muatTabel(n, token);
      SIMPAN[n] = { token: token, ep: ep, t: kini, janji: janji };
      janji.catch(function () { delete SIMPAN[n]; });
      return janji;
    })).then(function (hasil) {
      var d = {};
      nama.forEach(function (n, i) { d[n] = hasil[i]; });
      return d;
    });
  }

  /* ---------------- sesi: token app & verifikasi database ---------------- */
  function isiToken(token) {
    var b = String(token || '').split('.');
    if (b.length !== 3 || b[0] !== 'h1') return null;
    try {
      var s = b[1].replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var biner = atob(s), byte = new Uint8Array(biner.length);
      for (var i = 0; i < biner.length; i++) byte[i] = biner.charCodeAt(i);
      var p = JSON.parse(new TextDecoder('utf-8').decode(byte));
      if (!p || !p.u || !p.x || p.x < Date.now()) return null;
      return p.u;
    } catch (e) { return null; }
  }
  var SESI = {};   // token → { u, siap: Promise<boolean> }
  function sesi(token) {
    if (SESI[token]) return SESI[token];
    var u = isiToken(token);
    var s = { u: u, ok: null };
    s.siap = !u ? Promise.resolve(false) :
      ambil(REST + 'rpc/app_whoami', { method: 'POST', headers: kepala(token, { 'Content-Type': 'application/json' }), body: '{}' })
        .then(function (r) { return r.json(); })
        .then(function (x) {
          s.ok = !!(x && x.ok && x.Role === u.Role && x.UserID === u.UserID);
          if (!s.ok) SBB.alasan = 'Token ditolak database: ' + ((x && x.alasan) || 'peran berbeda') +
            (x && x.alasan === 'RAHASIA_BELUM_SINKRON' ? ' — jalankan setupSupabase() di Apps Script' : '');
          return s.ok;
        })
        .catch(function (e) { s.ok = false; SBB.alasan = 'Supabase tidak terjangkau: ' + e.message; return false; });
    SESI[token] = s;
    return s;
  }

  /* ---------------- API publik ---------------- */
  function tokenKini() { return (w.APP && w.APP.token) || ''; }
  SBB.bisa = function (action, payload) {
    if (!SBB.aktif || SBB.mati) return false;
    var a = AKSI[action], tok = tokenKini();
    if (!a || !tok) return false;
    var s = sesi(tok);
    if (!s.u || s.ok === false || a.peran.indexOf(s.u.Role) === -1) return false;
    if (a.kecuali && a.kecuali(s.u.Role, payload || {})) return false;
    return true;
  };
  /** Jalankan aksi baca langsung. Promise ditolak bila harus kembali lewat Apps Script. */
  SBB.baca = function (action, payload) {
    var tok = tokenKini(), s = sesi(tok), a = AKSI[action];
    var p = Object.assign({}, payload || {});
    delete p._segar;
    return s.siap.then(function (ok) {
      if (!ok) throw new Error(SBB.alasan || 'sesi Supabase belum siap');
      return muatSemua(a.tabel(p, s.u), tok);
    }).then(function (d) {
      DATA = d;
      try { return a.fn(p, s.u); }
      finally { DATA = {}; }
    });
  };
  SBB.reset = function () { SESI = {}; SIMPAN = {}; SBB.mati = false; };
  SBB.status = function () {
    var tok = tokenKini(), s = tok ? sesi(tok) : null;
    return { aktif: SBB.aktif, mati: SBB.mati, alasan: SBB.alasan, url: urlDasar,
             peran: s && s.u ? s.u.Role : '-', tokenDiterima: s ? s.ok : null, aksiLangsung: Object.keys(AKSI).length };
  };
  SBB._aksi = AKSI;
})(typeof window !== 'undefined' ? window : globalThis);
