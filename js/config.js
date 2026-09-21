/* ==========================================================================
 * SIM ASRAMA v6.0 — KONFIGURASI
 * --------------------------------------------------------------------------
 * HANYA FILE INI yang perlu Anda ubah setelah backend Apps Script di-deploy.
 * ========================================================================== */

var CONFIG = {

  /* 1) URL Web App Apps Script — harus berakhiran /exec
   *    Dapatkan dari: Apps Script → Deploy → New deployment → Web app
   *    (Execute as: Me · Who has access: Anyone)                         */
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxBwKD5Xd__10qwlr09kC7RDdGeGstIAumt8fnI4KlU6x1PxhR43fmw6QSJJDfGGn2X/exec',

  /* 2) API Key — tampil di Execution log saat Anda menjalankan setup()
   *    Contoh: 'ASR-7F3A9C21B4E85D06A1C3F972'                            */
  API_KEY: 'ASR-DABC76585EA746A19531A783',

  /* 3) Identitas tampilan (boleh diubah sesuai institusi)                */
  NAMA_INSTITUSI: 'STIS AL WAFA BOGOR',
  NAMA_APLIKASI : 'SIM ASRAMA v6.0',

  /* 4) Perilaku aplikasi                                                 */
  DEBOUNCE_MS      : 350,   // jeda pencarian (PRD §14)
  CACHE_TTL_MS     : 120000,// umur cache data di browser (2 menit)
  SCAN_COOLDOWN_MS : 2500,  // jeda scanner QR sebelum membaca kartu berikutnya
  IMPORT_MAX_MB    : 5,     // batas ukuran file .xlsx impor
  BULK_CARD_BATCH  : 10     // jumlah kartu QR per batch saat ekspor ZIP
};
