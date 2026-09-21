/* ==========================================================================
 * SIM ASRAMA v6.0 — LAPISAN API & UTILITAS
 * --------------------------------------------------------------------------
 * • callApi()  : satu pintu ke backend GAS (fetch POST, text/plain)
 * • Cache      : window.APP.cache — hasil baca disimpan sementara di browser
 * • Optimistic : optimistic() — UI berubah 0 ms, rollback otomatis bila gagal
 * • Util       : format rupiah/tanggal, QR code, PDF kartu, ekspor .xlsx
 * ========================================================================== */

var APP = {
  token: null,
  user: null,
  ref: null,
  cache: {},
  pengaturan: {}
};

/* -------------------------------------------------------------------------
 * 1. PEMANGGILAN API
 * ---------------------------------------------------------------------- */

/**
 * @param {string} action  nama route, mis. 'residents.list'
 * @param {object} payload data yang dikirim
 * @param {object} opt     { diam:true } → tidak menampilkan notifikasi error
 * @returns {Promise<{ok:boolean,data:*,error:string}>}
 */
async function callApi(action, payload, opt) {
  opt = opt || {};
  var body = {
    action: action,
    apiKey: CONFIG.API_KEY,
    token: APP.token || '',
    payload: payload || {}
  };
  try {
    var res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      // WAJIB text/plain — application/json memicu CORS preflight yang diblokir GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });
    var teks = await res.text();
    var out;
    try {
      out = JSON.parse(teks);
    } catch (e) {
      throw new Error('Balasan server bukan JSON. Pastikan deployment memakai akses "Anyone" dan URL berakhiran /exec.');
    }
    if (!out.ok) {
      if (out.code === 401 && APP.token) { sesiBerakhir(); return out; }
      if (!opt.diam) toast(out.error || 'Permintaan gagal.', 'error');
    }
    return out;
  } catch (e) {
    if (!opt.diam) toast('Koneksi gagal: ' + e.message, 'error');
    return { ok: false, error: e.message };
  }
}

/** Pembacaan dengan cache browser (gas-instant-ux prinsip 2 — hindari RTT berulang) */
async function callCached(action, payload, ttl) {
  var kunci = action + ':' + JSON.stringify(payload || {});
  var simpan = APP.cache[kunci];
  var umur = ttl === undefined ? CONFIG.CACHE_TTL_MS : ttl;
  if (simpan && Date.now() - simpan.t < umur) return simpan.v;
  var res = await callApi(action, payload);
  if (res.ok) APP.cache[kunci] = { t: Date.now(), v: res };
  return res;
}

function bersihkanCache(prefix) {
  Object.keys(APP.cache).forEach(function (k) {
    if (!prefix || k.indexOf(prefix) === 0) delete APP.cache[k];
  });
}

/**
 * Optimistic UI (PRD §14 — respons ≤23 ms).
 * @param {Function} terapkan  ubah state lokal SEKARANG, kembalikan fungsi rollback
 * @param {string}   action    route server
 * @param {object}   payload
 */
async function optimistic(terapkan, action, payload, pesanSukses) {
  var rollback = terapkan();
  var res = await callApi(action, payload, { diam: true });
  if (!res.ok) {
    if (typeof rollback === 'function') rollback();
    toast(res.error || 'Perubahan dibatalkan — server menolak.', 'error');
  } else {
    bersihkanCache();
    if (pesanSukses !== false) toast(res.message || pesanSukses || 'Tersimpan.', 'success');
  }
  return res;
}

function sesiBerakhir() {
  APP.token = null; APP.user = null;
  try { sessionStorage.removeItem('asr_token'); sessionStorage.removeItem('asr_user'); } catch (e) {}
  if (window.__app && window.__app.keluarPaksa) window.__app.keluarPaksa();
}

function simpanSesi(token, user) {
  APP.token = token; APP.user = user;
  try {
    sessionStorage.setItem('asr_token', token);
    sessionStorage.setItem('asr_user', JSON.stringify(user));
  } catch (e) { /* mode privat — sesi hanya bertahan selama tab terbuka */ }
}

function muatSesi() {
  try {
    var t = sessionStorage.getItem('asr_token');
    var u = sessionStorage.getItem('asr_user');
    if (t && u) { APP.token = t; APP.user = JSON.parse(u); return true; }
  } catch (e) {}
  return false;
}

/* -------------------------------------------------------------------------
 * 2. NOTIFIKASI & DIALOG
 * ---------------------------------------------------------------------- */

function toast(pesan, tipe) {
  if (!window.Swal) { console.log('[' + (tipe || 'info') + '] ' + pesan); return; }
  Swal.fire({
    toast: true, position: 'top-end', timer: tipe === 'error' ? 5200 : 2800,
    timerProgressBar: true, showConfirmButton: false,
    icon: tipe || 'success', title: pesan,
    customClass: { popup: 'swal-asr' }
  });
}

function konfirmasi(judul, teks, tombol, bahaya) {
  return Swal.fire({
    title: judul, text: teks, icon: bahaya ? 'warning' : 'question',
    showCancelButton: true, confirmButtonText: tombol || 'Ya, lanjutkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: bahaya ? '#DC2626' : '#2563EB', cancelButtonColor: '#94A3B8'
  }).then(function (r) { return r.isConfirmed; });
}

function tanya(judul, label, nilaiAwal, tipe) {
  return Swal.fire({
    title: judul, input: tipe || 'text', inputLabel: label, inputValue: nilaiAwal || '',
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal',
    confirmButtonColor: '#2563EB',
    inputValidator: function (v) { return !v ? 'Wajib diisi' : undefined; }
  }).then(function (r) { return r.isConfirmed ? r.value : null; });
}

/* -------------------------------------------------------------------------
 * 3. FORMAT
 * ---------------------------------------------------------------------- */

function rupiah(n, pendek) {
  n = Number(n) || 0;
  if (pendek) {
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' Jt';
    if (n >= 1e3) return 'Rp ' + Math.round(n / 1e3) + ' rb';
  }
  return 'Rp ' + n.toLocaleString('id-ID');
}

function angka(n) { return (Number(n) || 0).toLocaleString('id-ID'); }

var BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var HARI_ID = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function tanggal(s, gaya) {
  if (!s) return '-';
  var d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(s);
  var tgl = d.getDate(), bln = BULAN_ID[d.getMonth()], thn = d.getFullYear();
  var jam = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  if (gaya === 'pendek') return tgl + ' ' + bln.substring(0, 3) + ' ' + thn;
  if (gaya === 'jam') return tgl + ' ' + bln.substring(0, 3) + ' ' + thn + ', ' + jam + ' WIB';
  if (gaya === 'hari') return HARI_ID[d.getDay()] + ', ' + tgl + ' ' + bln + ' ' + thn;
  if (gaya === 'waktu') return jam + ' WIB';
  return tgl + ' ' + bln + ' ' + thn;
}

function periodeLabel(p) {
  if (!p) return '-';
  var x = String(p).split('-');
  return (BULAN_ID[Number(x[1]) - 1] || x[1]) + ' ' + x[0];
}

function inisial(nama) {
  return String(nama || '?').trim().split(/\s+/).slice(0, 2)
    .map(function (w) { return w[0]; }).join('').toUpperCase();
}

function kelasStatus(s) {
  s = String(s || '');
  if (/Lunas|Aktif|Selesai|Terverifikasi|Diterima|Tersedia|BERHASIL|Valid|Prima/i.test(s)) return 'ok';
  if (/Menunggu|Baru|Revisi|Pending|Diproses|Perbaikan|Override|Terlambat/i.test(s)) return 'warn';
  if (/Tunggakan|Ditolak|Belum|Nonaktif|Keluar|Penuh|GAGAL|DITOLAK|Kritis/i.test(s)) return 'danger';
  if (/Gratis|Info|Alumni/i.test(s)) return 'info';
  return '';
}

function potong(s, n) {
  s = String(s || '');
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

function debounce(fn, ms) {
  var t;
  return function () {
    var args = arguments, self = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(self, args); }, ms || CONFIG.DEBOUNCE_MS);
  };
}

function waLink(nomor, pesan) {
  var n = String(nomor || '').replace(/[^0-9]/g, '');
  if (n.indexOf('0') === 0) n = '62' + n.substring(1);
  return 'https://wa.me/' + n + (pesan ? '?text=' + encodeURIComponent(pesan) : '');
}

/* -------------------------------------------------------------------------
 * 4. BERKAS: unggah (base64) & ekspor .xlsx
 * ---------------------------------------------------------------------- */

function bacaBerkas(file) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function () {
      resolve({ nama: file.name, mime: file.type, ukuran: file.size,
                base64: String(fr.result).split(',')[1] });
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function bacaExcel(file) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function (e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }));
      } catch (err) { reject(err); }
    };
    fr.onerror = reject;
    fr.readAsArrayBuffer(file);
  });
}

function unduhExcel(rows, namaFile, namaSheet) {
  if (!rows || !rows.length) { toast('Tidak ada data untuk diekspor.', 'warning'); return; }
  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (namaSheet || 'Data').substring(0, 30));
  XLSX.writeFile(wb, (namaFile || 'ekspor') + '.xlsx');
  toast(rows.length + ' baris diekspor ke Excel.', 'success');
}

/* -------------------------------------------------------------------------
 * 5. QR CODE — pembuat gambar kartu asrama makan
 *    (menggantikan barcode 1D pada PRD v5 agar mudah dipindai kamera HP)
 * ---------------------------------------------------------------------- */

/**
 * @param {string} teks    nilai QR, mis. SIM-PNG0001-a3f9c2b1
 * @param {number} sel     ukuran 1 modul (px)
 * @returns {string} data URL PNG
 */
function qrDataURL(teks, sel) {
  var qr = qrcode(0, 'M');          // tipe auto, koreksi galat M
  qr.addData(String(teks || ''));
  qr.make();
  return qr.createDataURL(sel || 6, 2);
}

function qrImgTag(teks, ukuranPx) {
  return '<img src="' + qrDataURL(teks, 6) + '" width="' + (ukuranPx || 78) +
         '" height="' + (ukuranPx || 78) + '" alt="QR Code kartu makan">';
}

/* -------------------------------------------------------------------------
 * 6. KARTU ASRAMA MAKAN — PDF (jsPDF, ukuran ID-1 85,6 × 54 mm)
 * ---------------------------------------------------------------------- */

async function buatPdfKartu(data) {
  var jsPDFmod = window.jspdf.jsPDF;
  var doc = new jsPDFmod({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] });

  // Header gradien (disimulasikan 2 lapis persegi)
  doc.setFillColor(0, 21, 47);  doc.rect(0, 0, 85.6, 12, 'F');
  doc.setFillColor(37, 99, 235); doc.rect(58, 0, 27.6, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text(String(data.institusi || CONFIG.NAMA_INSTITUSI).toUpperCase(), 5, 5.2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.4);
  doc.text('KARTU ASRAMA MAKAN · ' + (data.tahunAkademik || ''), 5, 9);

  // Badan kartu
  doc.setFillColor(255, 255, 255); doc.rect(0, 12, 85.6, 33, 'F');

  // Foto / placeholder inisial (FR-10.9)
  try {
    if (data.FotoURL) {
      var img = await urlKeDataURL(data.FotoURL);
      if (img) doc.addImage(img, 'JPEG', 5, 15.5, 14, 17, undefined, 'FAST');
      else throw new Error('foto gagal');
    } else { throw new Error('tanpa foto'); }
  } catch (e) {
    doc.setFillColor(219, 234, 254); doc.rect(5, 15.5, 14, 17, 'F');
    doc.setTextColor(15, 42, 74); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(inisial(data.NamaLengkap), 12, 25, { align: 'center' });
  }

  // Data santri
  doc.setTextColor(16, 24, 40); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
  doc.text(potong(data.NamaLengkap, 26), 22, 19);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6);
  doc.setTextColor(74, 85, 104);
  var baris = [
    'NIM       : ' + (data.NIM || '-'),
    'Prodi     : ' + potong(data.Prodi, 30),
    'Angkatan  : ' + (data.Angkatan || '-'),
    'Paket     : ' + potong(data.NamaPaket, 30),
    'Kamar     : ' + potong(data.Kamar, 30)
  ];
  baris.forEach(function (t, i) { doc.text(t, 22, 23.5 + i * 3.4); });

  // QR CODE
  try {
    doc.addImage(qrDataURL(data.qrValue, 8), 'PNG', 64, 15, 17, 17);
  } catch (e) { /* abaikan bila gagal */ }
  doc.setFontSize(3.8); doc.setTextColor(120, 130, 145);
  doc.text(String(data.qrValue || ''), 72.5, 34, { align: 'center' });

  // Footer
  doc.setFillColor(248, 250, 252); doc.rect(0, 45, 85.6, 9, 'F');
  doc.setDrawColor(226, 232, 240); doc.line(0, 45, 85.6, 45);
  doc.setFontSize(4.6); doc.setTextColor(74, 85, 104);
  doc.text('Kartu ini milik institusi · wajib dibawa saat mengambil jatah makan 3x/hari', 5, 48.6);
  doc.text('Berlaku s.d. akhir T.A. ' + (data.tahunAkademik || ''), 5, 51.6);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
  doc.text(String(data.PenghuniID || ''), 80.6, 51.6, { align: 'right' });

  return doc;
}

function urlKeDataURL(url) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { resolve(null); }
    };
    img.onerror = function () { resolve(null); };
    img.src = url;
  });
}

/* -------------------------------------------------------------------------
 * 7. GRAFIK (Chart.js) — pembungkus ringkas dengan palet design system
 * ---------------------------------------------------------------------- */

var PALET = ['#2563EB', '#0F2A4A', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
var _charts = {};

function gambarChart(idCanvas, konfig) {
  var el = document.getElementById(idCanvas);
  if (!el || !window.Chart) return;
  if (_charts[idCanvas]) { _charts[idCanvas].destroy(); }
  Chart.defaults.font.family = "'Inter',system-ui,sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text-2') || '#4A5568';
  _charts[idCanvas] = new Chart(el, konfig);
  return _charts[idCanvas];
}

function opsiDasar(extra) {
  return Object.assign({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.18)' }, border: { display: false } },
      x: { grid: { display: false }, border: { display: false } }
    }
  }, extra || {});
}
