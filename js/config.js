/* ==========================================================================
 * SIM ASRAMA v7.0 — KONFIGURASI (database: Supabase)
 * --------------------------------------------------------------------------
 * HANYA FILE INI yang perlu Anda ubah setelah backend Apps Script di-deploy.
 * ========================================================================== */

var CONFIG = {

  /* 1) URL Web App Apps Script — harus berakhiran /exec
   *    Dapatkan dari: Apps Script → Deploy → New deployment → Web app
   *    (Execute as: Me · Who has access: Anyone)                         */
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxUB3PXMs6w3T5GVJaW23xGqcnzc3q8WsHTDTabjK1ExTfzoIRQf6uW-DlEo7K8qYHg/exec',

  /* 2) API Key — tampil di Execution log saat Anda menjalankan setup()
   *    Contoh: 'ASR-7F3A9C21B4E85D06A1C3F972'                            */
  API_KEY: 'ASR-350E27F8C620430AA97A9892',

  /* 3) Google OAuth 2.0 Client ID — untuk tombol "Masuk dengan Google" (staf)
   *    Buat di: console.cloud.google.com → APIs & Services → Credentials →
   *    Create credentials → OAuth client ID → Web application
   *    Authorized JavaScript origins: https://USERNAME.github.io
   *    Contoh: '1234567890-abcdefg.apps.googleusercontent.com'
   *    Boleh dikosongkan bila sudah diisi di menu Pengaturan Sistem
   *    (GOOGLE_CLIENT_ID) — aplikasi akan mengambilnya dari server.          */
  GOOGLE_CLIENT_ID: '474065808371-97o3bm7thk4bu0li9h1gn9u5kclr6kt5.apps.googleusercontent.com',

  /* 3b) SUPABASE — database v7.0 (baca langsung dari browser = jauh lebih cepat)
   *     Ambil dari: Supabase → Project Settings → Data API (Project URL) dan
   *     Project Settings → API Keys → anon / publishable key.
   *     ⚠️ HANYA anon/publishable key. JANGAN PERNAH menaruh service_role /
   *        secret key di sini (kunci itu hanya untuk Apps Script).
   *     Boleh dikosongkan: aplikasi tetap jalan, semua data dibaca lewat Apps Script. */
  SUPABASE_URL: 'https://ilegzifyhlksctkwybgd.supabase.co',        // contoh: 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZWd6aWZ5aGxrc2N0a3d5YmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzYwMzEsImV4cCI6MjEwNjc1MjAzMX0.l5tcqzQX80391jy2HF8SQQG4M0e3g_mz8CjlKOmiI54',   // contoh: 'eyJhbGciOi…' atau 'sb_publishable_…'

  /* 4) Identitas tampilan (boleh diubah sesuai institusi)                */
  NAMA_INSTITUSI: 'STIS AL WAFA BOGOR',
  NAMA_APLIKASI : 'SIM ASRAMA v7.0',

  /* 5) Perilaku aplikasi                                                 */
  DEBOUNCE_MS      : 350,   // jeda pencarian (PRD §14)
  CACHE_TTL_MS     : 120000,// umur cache data di browser (2 menit)
  TURBO_SEGAR_MS   : 30000, // v6.2: data dianggap "segar" 30 dtk — lewat dari itu tetap tampil instan lalu disegarkan di latar
  SCAN_COOLDOWN_MS : 2500,  // jeda scanner QR sebelum membaca kartu berikutnya
  IMPORT_MAX_MB    : 5,     // batas ukuran file .xlsx impor
  BULK_CARD_BATCH  : 10     // jumlah kartu QR per batch saat ekspor ZIP
};
