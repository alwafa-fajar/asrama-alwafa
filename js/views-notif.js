/* ==========================================================================
 * SIM ASRAMA v6.2 — WHATSAPP (FONNTE) & NOTIFIKASI
 * --------------------------------------------------------------------------
 * Tab 1  Blast WA     : pilih sasaran (penghuni/wali/tunggakan/pendaftar/CRM/
 *                       AKUN mahasiswa/manual) → deteksi nomor WA → tulis pesan →
 *                       kirim per batch 10 / 20 / 50 dengan jeda anti-banned
 * Tab 2  Reminder     : (SA, KEU) pengingat tagihan H-3 & H-0 otomatis / manual
 * Tab 3  Antrean      : pantau pesan otomatis (WA & email) + ulangi yang gagal
 * Tab 4  Konfigurasi  : (SA) token Fonnte, saklar WA/Email, matriks event per
 *                       grup (saklar WA & Email tiap jenis notifikasi), template
 * ========================================================================== */

var PESAN_AKUN_BAWAAN = 'Assalamu\'alaikum {nama},\n\nBerikut akun SIM Asrama Anda:\n🌐 {link}\n👤 Username: *{username}*\n🔑 Sandi: *{sandi}*\n\n' +
  'Cara mengaktifkan akun:\n1. Buka tautan di atas, pilih *Mahasiswa*\n2. Masuk dengan username & sandi di atas\n3. Ganti sandi di menu Profil\n' +
  '4. Unggah foto profil (wajib untuk Kartu Makan)\n\n— {institusi}';

window.VIEWS = window.VIEWS || {};

window.VIEWS['notifikasi-wa'] = {
  props: ['user'],
  emits: ['pindah'],
  data: function () {
    return {
      tab: 'blast',
      cfg: null, memuatCfg: false, simpanCfg: false, tokenBaru: '', tesNomor: '', tesEmail: '', perangkat: null,
      editEvent: '',
      // --- blast ---
      ref: null,
      aud: { sumber: 'penghuni', status: '', jenisKelamin: '', gedungId: '', angkatan: '', nomorManual: '', akun: '', segmen: '', tag: '', kontakIds: [] },
      akunOpsi: { kirimWA: true, kirimEmail: false, resetKosong: false },
      // --- reminder ---
      rem: null, remPrev: null, remTanggal: '', memuatRem: false, remJenis: 'H3', kirimRem: false, simpanRem: false,
      penerima: [], ringkas: null, memuatAud: false, hanyaWA: false, dipilih: {},
      cekWA: { jalan: false, selesai: 0, total: 0 },
      judul: '', pesan: 'Assalamu\'alaikum {nama},\n\n', ukuranBatch: 20, jeda: '5',
      blastAktif: null, kirimBatch: false, otomatis: false, hitungMundur: 0,
      riwayat: [],
      // --- antrean ---
      antrean: [], ringkasAntrean: null, filterAntrean: { status: '', kanal: '' }, memuatAntrean: false
    };
  },
  computed: {
    isSA: function () { return this.user.Role === 'SA'; },
    bisaAntrean: function () { return ['SA', 'PMB'].indexOf(this.user.Role) > -1; },
    bisaReminder: function () { return ['SA', 'KEU'].indexOf(this.user.Role) > -1; },
    modeAkun: function () { return this.aud.sumber === 'akun'; },
    variabel: function () {
      return this.modeAkun ? ['{nama}','{username}','{sandi}','{link}','{nim}','{kamar}','{institusi}']
                           : ['{nama}','{nim}','{kamar}','{mahasiswa}','{tunggakan}','{institusi}','{link}'];
    },
    matriksGrup: function () {
      if (!this.cfg) return [];
      var g = {}, urut = [];
      Object.keys(this.cfg.matriks).forEach(function (k) {
        var m = this.cfg.matriks[k], n = m.grup || 'Lainnya';
        if (!g[n]) { g[n] = []; urut.push(n); }
        g[n].push({ k: k, m: m });
      }, this);
      return urut.map(function (n) { return { grup: n, items: g[n] }; });
    },
    remData: function () { return this.remPrev ? this.remPrev[this.remJenis] : null; },
    tampilPenerima: function () {
      var self = this;
      return this.penerima.filter(function (x) {
        if (!x.valid || x.ganda) return true;             // tetap tampil (ditandai) agar admin tahu
        return !self.hanyaWA || x.statusWA === 'Terdaftar';
      });
    },
    siapKirim: function () {
      var self = this;
      if (this.modeAkun) {
        return this.penerima.filter(function (x) {
          if (!x.punyaAkun || (!x.punyaSandi && !self.akunOpsi.resetKosong)) return false;
          if (self.dipilih[x.id] === false) return false;
          var waOk = self.akunOpsi.kirimWA && x.valid && !x.ganda && (!self.hanyaWA || x.statusWA === 'Terdaftar');
          var emOk = self.akunOpsi.kirimEmail && /@/.test(x.email || '');
          return waOk || emOk;
        });
      }
      return this.penerima.filter(function (x) {
        return x.valid && !x.ganda && !x.optOut && self.dipilih[x.hp] !== false && (!self.hanyaWA || x.statusWA === 'Terdaftar');
      });
    },
    jumlahBatch: function () { return Math.ceil(this.siapKirim.length / this.ukuranBatch); },
    rataJeda: function () {
      var p = String(this.jeda).split('-').map(Number);
      return p.length > 1 ? (p[0] + p[1]) / 2 : (p[0] || 5);
    },
    estimasiMenit: function () {
      return Math.max(1, Math.round(this.siapKirim.length * this.rataJeda / 60));
    },
    pratinjau: function () {
      var x = this.siapKirim[0] || { nama: 'Ahmad Fauzan', nim: '2026001', kamar: 'A.101', mahasiswa: 'Ahmad Fauzan', santri: 'Ahmad Fauzan', tunggakan: 'Rp 400.000', username: 'ahmad.f', sandi: '••••••' };
      var v = Object.assign({ institusi: CONFIG.NAMA_INSTITUSI, link: APP.pengaturan.APP_URL || location.href.split('#')[0] }, x);
      return String(this.pesan || '').replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : ''; });
    },
    persenBlast: function () {
      var b = this.blastAktif;
      if (!b) return 0;
      return b.Total ? Math.round((Number(b.Terkirim) + Number(b.Gagal)) / Number(b.Total) * 100) : 0;
    }
  },
  mounted: function () {
    var self = this;
    callCached('meta.ref', {}, 600000).then(function (r) { if (r.ok) self.ref = r.data; });
    if (this.isSA) this.muatCfg();
    else this.ukuranBatch = Number(APP.pengaturan.WA_BATCH_DEFAULT) || 20;
    this.muatRiwayat();
    // v6.2: datang dari menu Penghuni ("Blast Akses Akun") atau CRM ("Blast ke terpilih")
    if (APP.presetBlast === 'akun' && this.isSA) { this.aud.sumber = 'akun'; this.pesan = PESAN_AKUN_BAWAAN; this.muatPenerima(); }
    else if (APP.presetBlast === 'crm' && APP.presetKontak) { this.aud.sumber = 'crm'; this.aud.kontakIds = APP.presetKontak; this.muatPenerima(); }
    APP.presetBlast = ''; APP.presetKontak = null;
  },
  watch: {
    'aud.sumber': function (s, lama) {
      if (s === 'akun' && (!this.pesan || this.pesan.length < 40)) this.pesan = (this.cfg && this.cfg.matriks.AKUN_AKSES && this.cfg.matriks.AKUN_AKSES.pesan) || PESAN_AKUN_BAWAAN;
      if (lama === 'akun' && s !== 'akun' && this.pesan.indexOf('{sandi}') > -1) this.pesan = 'Assalamu\'alaikum {nama},\n\n';
      if (s !== 'crm') this.aud.kontakIds = [];
      this.penerima = []; this.ringkas = null; this.dipilih = {};
    }
  },
  beforeUnmount: function () { this.hentikanOtomatis(); },
  methods: {
    /* ---------------- KONFIGURASI ---------------- */
    muatCfg: async function () {
      this.memuatCfg = true;
      var res = await callApi('notif.config', {});
      this.memuatCfg = false;
      if (res.ok) {
        this.cfg = res.data;
        this.ukuranBatch = res.data.batchDefault; this.jeda = res.data.jeda;
      }
    },
    simpanKonfigurasi: async function () {
      var c = this.cfg, matriks = {};
      Object.keys(c.matriks).forEach(function (k) {
        var m = c.matriks[k];
        matriks[k] = { wa: m.wa, email: m.email, pesan: m.pesan, subjek: m.subjek };
      });
      this.simpanCfg = true;
      var res = await callApi('notif.configSave', {
        waAktif: c.waAktif, emailAktif: c.emailAktif, token: this.tokenBaru || '',
        batchDefault: c.batchDefault, jeda: c.jeda, deteksiOtomatis: c.deteksiOtomatis,
        namaPengirim: c.namaPengirim, appUrl: c.appUrl, matriks: matriks
      });
      this.simpanCfg = false;
      if (res.ok) { this.cfg = res.data; this.tokenBaru = ''; toast('Konfigurasi notifikasi disimpan.', 'success'); }
    },
    hapusToken: async function () {
      var ya = await konfirmasi('Hapus token Fonnte?', 'Semua pengiriman WhatsApp akan berhenti.', 'Ya, hapus', true);
      if (!ya) return;
      var res = await callApi('notif.configSave', { token: '__HAPUS__', waAktif: false });
      if (res.ok) { this.cfg = res.data; toast('Token dihapus.', 'success'); }
    },
    cekPerangkat: async function () {
      this.perangkat = null;
      var res = await callApi('wa.device', {});
      if (res.ok) this.perangkat = res.data;
    },
    tesWA: async function () {
      if (!this.tesNomor) { toast('Isi nomor tujuan tes.', 'warning'); return; }
      var res = await callApi('wa.test', { nomor: this.tesNomor });
      if (res.ok) toast(res.message, 'success');
    },
    tesMail: async function () {
      var res = await callApi('email.test', { email: this.tesEmail || this.user.Email });
      if (res.ok) toast(res.message, 'success');
    },
    kembalikanTemplate: function (m) { m.pesan = m.pesanDefault; m.subjek = m.subjekDefault; },

    /* ---------------- BLAST ---------------- */
    muatPenerima: async function () {
      this.memuatAud = true;
      var res = await callApi('wa.audience', this.aud);
      this.memuatAud = false;
      if (res.ok) { this.penerima = res.data.rows; this.ringkas = res.data.ringkas; this.dipilih = {}; }
    },
    deteksiWA: async function () {
      var sasaran = this.penerima.filter(function (x) { return x.valid && !x.ganda; });
      if (!sasaran.length) { toast('Muat penerima terlebih dahulu.', 'warning'); return; }
      var self = this;
      this.cekWA = { jalan: true, selesai: 0, total: sasaran.length };
      var peta = await deteksiNomorWA(sasaran.map(function (x) { return x.hp; }), function (n) { self.cekWA.selesai = n; });
      this.penerima.forEach(function (x) { if (peta[x.hp] !== undefined && peta[x.hp] !== '') x.statusWA = peta[x.hp]; });
      this.cekWA.jalan = false;
    },
    togglePilih: function (x) { var k = this.modeAkun ? x.id : x.hp; this.dipilih[k] = this.dipilih[k] === false; },
    terpilih: function (x) {
      if (this.modeAkun) return x.punyaAkun && (x.punyaSandi || this.akunOpsi.resetKosong) && this.dipilih[x.id] !== false;
      return x.valid && !x.ganda && !x.optOut && this.dipilih[x.hp] !== false;
    },
    sisip: function (v) {
      var el = this.$refs.pesan;
      if (!el) { this.pesan += v; return; }
      var a = el.selectionStart, b = el.selectionEnd;
      this.pesan = this.pesan.substring(0, a) + v + this.pesan.substring(b);
      this.$nextTick(function () { el.focus(); el.selectionStart = el.selectionEnd = a + v.length; });
    },
    mulaiBlastAkun: async function () {
      if (this.pesan.indexOf('{username}') === -1 || this.pesan.indexOf('{sandi}') === -1) { toast('Pesan wajib memuat {username} dan {sandi}.', 'warning'); return; }
      var reset = this.siapKirim.filter(function (x) { return !x.punyaSandi; }).length;
      var ya = await konfirmasi('Kirim akses akun ke ' + this.siapKirim.length + ' mahasiswa?',
        'Setiap mahasiswa menerima username & sandinya sendiri' + (this.akunOpsi.kirimWA ? ' via WhatsApp (batch ' + this.ukuranBatch + ')' : '') +
        (this.akunOpsi.kirimEmail ? ' + Email' : '') + '.' + (reset ? ' ' + reset + ' akun yang sandinya sudah diganti akan DIBUATKAN SANDI BARU.' : ''), 'Ya, kirim');
      if (!ya) return;
      var res = await callApi('wa.blastCreate', {
        jenis: 'akun', judul: this.judul || ('Akses akun mahasiswa ' + new Date().toLocaleDateString('id-ID')),
        pesan: this.pesan, ukuranBatch: this.ukuranBatch, jeda: this.jeda,
        penghuniIds: this.siapKirim.map(function (x) { return x.id; }),
        kirimWA: this.akunOpsi.kirimWA, kirimEmail: this.akunOpsi.kirimEmail, resetKosong: this.akunOpsi.resetKosong
      });
      if (!res.ok) return;
      Swal.fire({ icon: 'success', title: 'Blast akun dibuat', html: res.message +
        (res.data.catatan && res.data.catatan.length ? '<div style="text-align:left;font-size:12px;max-height:160px;overflow:auto;margin-top:10px">' + res.data.catatan.join('<br>') + '</div>' : ''),
        confirmButtonColor: '#2563EB' });
      if (res.data.blastId) {
        this.blastAktif = { BlastID: res.data.blastId, Total: res.data.total, Terkirim: 0, Gagal: 0, Status: 'Berjalan',
                            UkuranBatch: this.ukuranBatch, JedaDetik: this.jeda, Judul: 'Akses akun mahasiswa' };
        this.otomatis = true;
        this.batchBerikut();
      }
      this.muatRiwayat();
    },
    mulaiBlast: async function () {
      if (!this.siapKirim.length) { toast('Belum ada penerima yang valid.', 'warning'); return; }
      if (String(this.pesan).trim().length < 5) { toast('Tulis isi pesan terlebih dahulu.', 'warning'); return; }
      if (this.modeAkun) return this.mulaiBlastAkun();
      var ya = await konfirmasi('Mulai blast WhatsApp?',
        this.siapKirim.length + ' penerima · ' + this.jumlahBatch + ' batch × ' + this.ukuranBatch +
        ' · jeda ' + this.jeda + ' detik/pesan (±' + this.estimasiMenit + ' menit).', 'Ya, mulai kirim');
      if (!ya) return;
      var s = this.aud.sumber;
      var res = await callApi('wa.blastCreate', {
        judul: this.judul || ('Blast ' + s + ' ' + new Date().toLocaleDateString('id-ID')),
        pesan: this.pesan, ukuranBatch: this.ukuranBatch, jeda: this.jeda,
        sasaran: s + (this.aud.status ? ' · ' + this.aud.status : '') + (this.hanyaWA ? ' · hanya WA' : ''),
        penerima: this.siapKirim.map(function (x) {
          return { id: x.id, nama: x.nama, hp: x.hp, nim: x.nim, kamar: x.kamar, santri: x.mahasiswa || x.santri || x.nama, mahasiswa: x.mahasiswa || x.santri || x.nama, tunggakan: x.tunggakan || '' };
        })
      });
      if (!res.ok) return;
      toast(res.message, 'success');
      this.blastAktif = { BlastID: res.data.blastId, Total: res.data.total, Terkirim: 0, Gagal: 0, Status: 'Berjalan',
                          UkuranBatch: this.ukuranBatch, JedaDetik: this.jeda };
      this.otomatis = true;
      this.batchBerikut();
    },
    batchBerikut: async function () {
      if (!this.blastAktif || this.kirimBatch) return;
      this.hentikanTimer();
      this.kirimBatch = true;
      var res = await callApi('wa.blastProcess', { blastId: this.blastAktif.BlastID }, { timeout: 120000 });
      this.kirimBatch = false;
      if (!res.ok) { this.otomatis = false; return; }
      this.blastAktif = res.data.blast;
      if (res.data.selesai) {
        this.otomatis = false;
        toast('Blast selesai: ' + res.data.blast.Terkirim + ' terkirim, ' + res.data.blast.Gagal + ' gagal.', 'success');
        this.muatRiwayat();
        return;
      }
      if (this.otomatis) {
        // Tunggu kira-kira selama Fonnte mengirim batch ini (ukuran × jeda), minimal 30 detik
        this.jadwalkan(Math.max(30, Math.round(Number(this.blastAktif.UkuranBatch) * this.rataJedaDari(this.blastAktif.JedaDetik))));
      }
    },
    rataJedaDari: function (j) { var p = String(j || '5').split('-').map(Number); return p.length > 1 ? (p[0] + p[1]) / 2 : (p[0] || 5); },
    jadwalkan: function (detik) {
      var self = this;
      this.hitungMundur = detik;
      this._timer = setInterval(function () {
        self.hitungMundur--;
        if (self.hitungMundur <= 0) { self.hentikanTimer(); self.batchBerikut(); }
      }, 1000);
    },
    hentikanTimer: function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } this.hitungMundur = 0; },
    hentikanOtomatis: function () { this.otomatis = false; this.hentikanTimer(); },
    stopBlast: async function (b) {
      var ya = await konfirmasi('Hentikan blast ' + b.BlastID + '?', 'Pesan yang belum terkirim akan dibatalkan.', 'Ya, hentikan', true);
      if (!ya) return;
      var res = await callApi('wa.blastStop', { blastId: b.BlastID });
      if (res.ok) {
        toast(res.message, 'success');
        if (this.blastAktif && this.blastAktif.BlastID === b.BlastID) { this.hentikanOtomatis(); this.blastAktif = null; }
        this.muatRiwayat();
      }
    },
    lanjutkan: function (b) {
      this.blastAktif = b; this.otomatis = true; this.tab = 'blast';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.batchBerikut();
    },
    muatRiwayat: async function () {
      var res = await callApi('wa.blastList', {}, { diam: true });
      if (res.ok) this.riwayat = res.data;
    },

    /* ---------------- ANTREAN ---------------- */
    muatAntrean: async function () {
      this.memuatAntrean = true;
      var res = await callApi('notif.queue', this.filterAntrean);
      this.memuatAntrean = false;
      if (res.ok) { this.antrean = res.data.rows; this.ringkasAntrean = res.data.ringkas; }
    },
    prosesSekarang: async function () {
      var res = await callApi('notif.processNow', {});
      if (res.ok) { toast(res.message, 'success'); this.muatAntrean(); }
    },
    ulangiGagal: async function () {
      var res = await callApi('notif.retry', {});
      if (res.ok) { toast(res.message, 'success'); this.muatAntrean(); }
    },
    pilihTab: function (t) {
      this.tab = t;
      if (t === 'antrean' && !this.antrean.length) this.muatAntrean();
      if (t === 'config' && !this.cfg) this.muatCfg();
      if (t === 'reminder' && !this.rem) this.muatReminder();
    },
    setSemua: function (kanal, nilai) {
      var c = this.cfg; if (!c) return;
      Object.keys(c.matriks).forEach(function (k) { c.matriks[k][kanal] = nilai; });
    },

    /* ---------------- REMINDER TAGIHAN H-3 / H-0 ---------------- */
    muatReminder: async function () {
      if (!this.remTanggal) {
        var d = new Date(); this.remTanggal = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      }
      this.memuatRem = true;
      var hasil = await Promise.all([callApi('reminder.status', {}), callApi('reminder.preview', { tanggal: this.remTanggal })]);
      this.memuatRem = false;
      if (hasil[0].ok) this.rem = hasil[0].data;
      if (hasil[1].ok) this.remPrev = hasil[1].data;
    },
    muatPratinjauRem: async function () {
      var res = await callApi('reminder.preview', { tanggal: this.remTanggal });
      if (res.ok) this.remPrev = res.data;
    },
    simpanReminder: async function () {
      this.simpanRem = true;
      var r = this.rem;
      var res = await callApi('reminder.save', { otomatis: r.otomatis, jam: r.jam, h3: r.h3, h0: r.h0, prakiraan: r.prakiraan });
      this.simpanRem = false;
      if (res.ok) { this.rem = res.data; toast('Pengaturan reminder disimpan.', 'success'); this.muatPratinjauRem(); }
    },
    kirimReminder: async function (jenis, ulang) {
      var d = this.remPrev ? this.remPrev[jenis] : null;
      var n = d ? d.kirim.length : 0;
      if (!n && !ulang) { toast('Tidak ada penerima — semua lunas / sudah diingatkan.', 'info'); return; }
      var ya = await konfirmasi('Kirim pengingat ' + (jenis === 'H3' ? 'H-3' : 'H-0') + ' sekarang?',
        (ulang ? 'Termasuk yang sudah diingatkan sebelumnya. ' : '') + n + ' mahasiswa · jatuh tempo ' + (d ? d.jatuhTempo : '') +
        '. Yang sudah LUNAS / menunggu verifikasi tidak dikirimi.', 'Ya, kirim');
      if (!ya) return;
      this.kirimRem = true;
      var res = await callApi('reminder.run', { jenis: jenis, tanggal: this.remTanggal, ulang: !!ulang });
      this.kirimRem = false;
      if (res.ok) { toast(res.message, res.data.peringatan ? 'warning' : 'success'); this.muatReminder(); }
    },
    waKelas: function (s) { return s === 'Terdaftar' ? 'ya' : (s === 'Tidak Terdaftar' ? 'tidak' : 'belum'); },
    waLabel: function (s) { return s === 'Terdaftar' ? '✓ WA' : (s === 'Tidak Terdaftar' ? '✕ bukan WA' : '? belum dicek'); }
  },
  template: `
  <div>
    <sa-page judul="WhatsApp &amp; Notifikasi"
             sub="Blast WhatsApp per batch via Fonnte, deteksi nomor WA, dan saklar notifikasi otomatis WA / Email."
             :jalur="['Pendukung','WhatsApp & Notifikasi']">
    </sa-page>

    <div class="tabs">
      <button class="tab" :class="{active: tab==='blast'}" @click="pilihTab('blast')">📣 Blast WhatsApp</button>
      <button class="tab" v-if="bisaReminder" :class="{active: tab==='reminder'}" @click="pilihTab('reminder')">⏰ Reminder Tagihan</button>
      <button class="tab" v-if="bisaAntrean" :class="{active: tab==='antrean'}" @click="pilihTab('antrean')">📬 Antrean &amp; Riwayat</button>
      <button class="tab" v-if="isSA" :class="{active: tab==='config'}" @click="pilihTab('config')">⚙️ Konfigurasi</button>
    </div>

    <!-- ===================================================== BLAST ===== -->
    <template v-if="tab==='blast'">

      <!-- Progres blast berjalan -->
      <div class="card" v-if="blastAktif" style="border-color:var(--blue)">
        <div class="card-head"><div class="t">
          <div class="card-title">🚀 {{ blastAktif.Judul || blastAktif.BlastID }} <sa-badge :teks="blastAktif.Status"></sa-badge></div>
          <div class="card-sub">Batch {{ blastAktif.UkuranBatch }} nomor · jeda {{ blastAktif.JedaDetik }} detik/pesan ·
            server tetap mengirim 1 batch/menit walau halaman ini ditutup.</div>
        </div></div>
        <div class="progress lg mb-sm"><div class="bar ok" :style="{width: persenBlast + '%'}"></div></div>
        <div class="flex justify-between fs-sm mb-md">
          <span><b>{{ blastAktif.Terkirim }}</b> terkirim · <b class="txt-danger">{{ blastAktif.Gagal }}</b> gagal ·
            {{ Math.max(0, blastAktif.Total - blastAktif.Terkirim - blastAktif.Gagal) }} sisa dari {{ blastAktif.Total }}</span>
          <b>{{ persenBlast }}%</b>
        </div>
        <div class="btn-row" v-if="blastAktif.Status === 'Berjalan'">
          <button class="btn" :disabled="kirimBatch" @click="batchBerikut">
            <span v-if="kirimBatch" class="spin"></span>{{ kirimBatch ? 'Mengirim batch…' : '▶ Kirim Batch Berikutnya Sekarang' }}</button>
          <label class="switch"><input type="checkbox" v-model="otomatis" @change="!otomatis && hentikanTimer()"><span class="trk"></span>
            Otomatis <span v-if="hitungMundur" class="txt-2 fw6">· batch berikut dalam {{ hitungMundur }} dtk</span></label>
          <button class="btn danger secondary" @click="stopBlast(blastAktif)">⏹ Hentikan</button>
        </div>
        <button v-else class="btn secondary" @click="blastAktif = null">Tutup</button>
      </div>

      <div class="grid grid-2 gap-md">
        <!-- LANGKAH 1: SASARAN -->
        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">1. Pilih Sasaran</div>
            <div class="card-sub">Nomor diperiksa format &amp; duplikatnya otomatis.</div></div></div>
          <div class="grid grid-2 gap-md">
            <div class="field"><label class="label">Sumber</label>
              <select class="select" v-model="aud.sumber">
                <option value="penghuni">Penghuni</option>
                <option value="wali">Wali / Orang Tua Penghuni</option>
                <option value="tunggakan">Penghuni dengan Tunggakan</option>
                <option value="pendaftar">Pendaftar (calon mahasiswa)</option>
                <option value="crm">CRM Kontak (semua segmen)</option>
                <option value="akun" v-if="isSA">🔐 Akses &amp; aktivasi akun mahasiswa</option>
                <option value="manual">Nomor manual</option>
              </select></div>
            <div class="field" v-if="aud.sumber === 'crm'"><label class="label">Segmen CRM</label>
              <select class="select" v-model="aud.segmen"><option value="">Semua</option><option>Pendaftar</option><option>Mahasiswa</option>
                <option>Wali</option><option>Staf</option><option>Umum</option></select></div>
            <div class="field" v-if="aud.sumber === 'crm'"><label class="label">Tag (opsional)</label>
              <input class="input" v-model.trim="aud.tag" placeholder="mis. alumni-2025"></div>
            <div class="field" v-if="aud.sumber === 'akun'"><label class="label">Akun</label>
              <select class="select" v-model="aud.akun"><option value="">Semua mahasiswa</option>
                <option value="belumLogin">Belum pernah login</option><option value="sandiAwal">Masih memakai sandi awal</option></select></div>
            <div class="field" v-if="aud.sumber === 'pendaftar'"><label class="label">Status Pendaftar</label>
              <select class="select" v-model="aud.status"><option value="">Semua</option><option>Baru</option>
                <option>Perlu Revisi</option><option>Diterima</option><option>Ditolak</option></select></div>
            <div class="field" v-else-if="aud.sumber !== 'manual' && aud.sumber !== 'crm'"><label class="label">Status Penghuni</label>
              <select class="select" v-model="aud.status"><option value="">Aktif</option><option>Alumni</option><option>Keluar</option></select></div>
            <template v-if="aud.sumber !== 'manual' && aud.sumber !== 'crm'">
              <div class="field"><label class="label">Jenis Kelamin</label>
                <select class="select" v-model="aud.jenisKelamin"><option value="">Semua</option><option value="L">Putra</option><option value="P">Putri</option></select></div>
              <div class="field" v-if="aud.sumber !== 'pendaftar'"><label class="label">Gedung</label>
                <select class="select" v-model="aud.gedungId"><option value="">Semua gedung</option>
                  <option v-for="g in (ref ? ref.gedung : [])" :key="g.GedungID" :value="g.GedungID">{{ g.NamaGedung }}</option></select></div>
              <div class="field" v-if="aud.sumber !== 'pendaftar'"><label class="label">Angkatan</label>
                <select class="select" v-model="aud.angkatan"><option value="">Semua</option>
                  <option v-for="a in (ref ? ref.angkatan : [])" :key="a.MasterID" :value="a.Nilai">{{ a.Nilai }}</option></select></div>
            </template>
          </div>
          <div class="field" v-if="aud.sumber === 'manual'"><label class="label">Daftar nomor (satu per baris, opsional: <code>0812…|Nama</code>)</label>
            <textarea class="input" rows="5" v-model="aud.nomorManual" placeholder="081234567890|Ahmad&#10;085712345678|Fatimah"></textarea></div>
          <div class="btn-row">
            <button class="btn secondary" :disabled="memuatAud" @click="muatPenerima"><span v-if="memuatAud" class="spin dark"></span>👥 Muat Penerima</button>
            <button class="btn secondary" :disabled="cekWA.jalan || !penerima.length" @click="deteksiWA">
              <span v-if="cekWA.jalan" class="spin dark"></span>📱 {{ cekWA.jalan ? ('Mengecek ' + cekWA.selesai + '/' + cekWA.total) : 'Deteksi Nomor WA' }}</button>
          </div>
          <div v-if="ringkas" class="flex gap-sm flex-wrap mt-md fs-xs">
            <span class="chip">{{ ringkas.total }} total</span>
            <span class="chip">{{ ringkas.valid }} valid</span>
            <span class="chip" v-if="ringkas.tidakValid">⚠️ {{ ringkas.tidakValid }} nomor tidak valid</span>
            <span class="chip" v-if="ringkas.ganda">⧉ {{ ringkas.ganda }} ganda</span>
            <span class="chip" v-if="ringkas.optOut">⛔ {{ ringkas.optOut }} opt-out (tidak dikirimi)</span>
            <span class="chip" v-if="modeAkun && ringkas.tanpaSandi">🔁 {{ ringkas.tanpaSandi }} sudah ganti sandi</span>
            <span class="chip" v-if="modeAkun && ringkas.tanpaAkun">∅ {{ ringkas.tanpaAkun }} tanpa akun</span>
          </div>
          <div v-if="modeAkun" class="info-box mt-md" style="display:block">
            <b>🔐 Blast akses akun</b> — username &amp; sandi tiap mahasiswa diisi otomatis oleh server (tidak terlihat di layar ini).
            <label class="check mt-sm"><input type="checkbox" v-model="akunOpsi.kirimWA"> Kirim via WhatsApp (per batch)</label>
            <label class="check"><input type="checkbox" v-model="akunOpsi.kirimEmail"> Kirim juga via Email</label>
            <label class="check"><input type="checkbox" v-model="akunOpsi.resetKosong"> Buatkan sandi baru untuk yang sudah mengganti sandi
              <span class="txt-3 fs-xs">(sandi lama mereka tidak berlaku lagi)</span></label>
          </div>
          <label class="check mt-sm" v-if="penerima.length"><input type="checkbox" v-model="hanyaWA"> Kirim hanya ke nomor yang <b>terdeteksi WhatsApp</b></label>

          <div class="table-wrap mt-md" v-if="penerima.length" style="max-height:340px;overflow:auto">
            <table class="tbl">
              <thead><tr><th style="width:30px"></th><th>Nama</th><th>Nomor</th><th>WhatsApp</th></tr></thead>
              <tbody>
                <tr v-for="x in tampilPenerima" :key="x.hp + x.id" :style="(!terpilih(x) && !(modeAkun && x.punyaAkun)) ? 'opacity:.5' : ''">
                  <td><input type="checkbox" :disabled="modeAkun ? !x.punyaAkun : (!x.valid || x.ganda || x.optOut)" :checked="terpilih(x)" @change="togglePilih(x)"></td>
                  <td><b class="fs-sm">{{ x.nama || '—' }}</b><div class="fs-xs txt-3">{{ x.kamar || x.status || x.segmen || x.nim }} <span v-if="x.tunggakan">· {{ x.tunggakan }}</span>
                    <span v-if="x.optOut" class="txt-danger">· opt-out</span>
                    <span v-if="modeAkun">· 👤 {{ x.username || 'tanpa akun' }} <span v-if="x.punyaAkun && !x.punyaSandi" class="txt-danger">· sandi sudah diganti</span>
                      <span v-if="x.lastLogin">· login {{ tanggal(x.lastLogin,'pendek') }}</span></span></div></td>
                  <td class="mono fs-sm">{{ x.hp || '—' }}<div class="fs-xs txt-danger" v-if="!x.valid">format salah</div><div class="fs-xs txt-3" v-else-if="x.ganda">ganda</div></td>
                  <td><span class="wa-badge" :class="waKelas(x.statusWA)">{{ waLabel(x.statusWA) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- LANGKAH 2 & 3: PESAN + BATCH -->
        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">2. Tulis Pesan</div>
            <div class="card-sub">Klik variabel untuk menyisipkan — tiap penerima dapat pesan personal.</div></div></div>
          <div class="field"><label class="label">Judul (catatan internal)</label>
            <input class="input" v-model.trim="judul" placeholder="mis. Pengingat tagihan Oktober"></div>
          <div class="flex gap-sm flex-wrap mb-sm">
            <button class="btn xs secondary" v-for="v in variabel" :key="v" @click="sisip(v)">{{ v }}</button>
          </div>
          <div class="field"><textarea ref="pesan" class="input" rows="7" v-model="pesan"
            placeholder="Assalamu'alaikum {nama}, …"></textarea>
            <div class="hint">Format WA: *tebal*, _miring_. {{ pesan.length }} karakter.</div></div>
          <div class="label">Pratinjau (penerima pertama)</div>
          <div class="wa-preview mb-md">{{ pratinjau }}</div>

          <div class="card-title mt-md mb-sm">3. Ukuran Batch &amp; Jeda</div>
          <div class="flex items-center gap-md flex-wrap">
            <div class="seg-batch">
              <button v-for="b in [10,20,50]" :key="b" :class="{on: ukuranBatch === b}" @click="ukuranBatch = b">{{ b }}</button>
            </div>
            <div class="field mb-0" style="width:150px"><input class="input" v-model.trim="jeda" placeholder="5 atau 3-8">
              <div class="hint">jeda antarpesan (detik)</div></div>
          </div>
          <div class="info-box mt-md">
            <span>📊</span><div><b>{{ siapKirim.length }}</b> penerima → <b>{{ jumlahBatch }}</b> batch × {{ ukuranBatch }} ·
              estimasi ±{{ estimasiMenit }} menit. Jeda acak (mis. <code>3-8</code>) lebih aman dari pemblokiran WhatsApp.</div>
          </div>
          <button class="btn lg block mt-md" :disabled="!siapKirim.length || !!(blastAktif && blastAktif.Status === 'Berjalan')" @click="mulaiBlast">
            🚀 {{ modeAkun ? 'Kirim Akses Akun' : 'Mulai Blast' }} ({{ siapKirim.length }} {{ modeAkun ? 'mahasiswa' : 'nomor' }})</button>
        </div>
      </div>

      <!-- RIWAYAT BLAST -->
      <div class="card">
        <div class="card-head"><div class="t"><div class="card-title">Riwayat Blast</div></div>
          <button class="btn sm secondary" @click="segarkan(muatRiwayat)">↻</button></div>
        <div class="table-wrap" v-if="riwayat.length">
          <table class="tbl">
            <thead><tr><th>Blast</th><th>Sasaran</th><th>Batch</th><th>Progres</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <tr v-for="b in riwayat" :key="b.BlastID">
                <td><b class="fs-sm">{{ b.Judul }}</b><div class="mono fs-xs txt-3">{{ b.BlastID }} · {{ tanggal(b.Tanggal,'jam') }} · {{ b.NamaPembuat }}</div></td>
                <td class="fs-sm">{{ b.Sasaran || '-' }}</td>
                <td class="fs-sm">{{ b.UkuranBatch }} · {{ b.JedaDetik }}s</td>
                <td style="min-width:150px"><div class="progress"><div class="bar ok" :style="{width: b.persen + '%'}"></div></div>
                  <div class="fs-xs txt-2 mt-sm">{{ b.Terkirim }}/{{ b.Total }} <span v-if="Number(b.Gagal)" class="txt-danger">· {{ b.Gagal }} gagal</span></div></td>
                <td><sa-badge :teks="b.Status"></sa-badge></td>
                <td><div class="flex gap-sm" v-if="b.Status === 'Berjalan'">
                  <button class="btn xs" @click="lanjutkan(b)">▶ Pantau</button>
                  <button class="btn xs ghost" @click="stopBlast(b)">⏹</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <sa-empty v-else judul="Belum ada blast" pesan="Blast yang dibuat akan tampil di sini." ikon="📣"></sa-empty>
      </div>
    </template>

    <!-- ===================================================== REMINDER ===== -->
    <template v-if="tab==='reminder'">
      <sa-loading v-if="memuatRem && !rem"></sa-loading>
      <template v-else-if="rem">
        <div class="grid grid-2 gap-md">
          <div class="card">
            <div class="card-head"><div class="t"><div class="card-title">⏰ Pengingat Tagihan Otomatis</div>
              <div class="card-sub">Dikirim tiap hari pada jam yang ditentukan oleh trigger server — halaman ini boleh ditutup.</div></div></div>
            <label class="switch mb-md"><input type="checkbox" v-model="rem.otomatis"><span class="trk"></span>
              Mode <b>{{ rem.otomatis ? 'OTOMATIS' : 'MANUAL' }}</b></label>
            <div class="grid grid-2 gap-md">
              <div class="field"><label class="label">Jam kirim harian</label>
                <input class="input" type="time" v-model="rem.jam" :disabled="!rem.otomatis"></div>
              <div class="field"><label class="label">Jatuh tempo tagihan</label>
                <input class="input" :value="'Tanggal ' + rem.jatuhTempoTanggal + ' tiap bulan'" readonly>
                <div class="hint">Ubah di Pengaturan Sistem → JATUH_TEMPO_TANGGAL</div></div>
            </div>
            <label class="check"><input type="checkbox" v-model="rem.h3"> <b>H-3</b> — 3 hari sebelum jatuh tempo</label>
            <label class="check"><input type="checkbox" v-model="rem.h0"> <b>H-0</b> — pada hari jatuh tempo</label>
            <label class="check"><input type="checkbox" v-model="rem.prakiraan"> Bila tagihan bulan itu belum diterbitkan, tetap ingatkan berdasarkan harga paket</label>
            <div class="info-box mt-md"><span>✅</span><div>Yang berstatus <b>Lunas</b>, <b>Gratis</b>, atau <b>Menunggu Verifikasi</b> TIDAK dikirimi.
              Setiap mahasiswa hanya diingatkan <b>sekali</b> per jenis per periode (anti dobel).</div></div>
            <div class="btn-row mt-md" style="justify-content:flex-end">
              <button class="btn" :disabled="simpanRem" @click="simpanReminder"><span v-if="simpanRem" class="spin"></span>💾 Simpan</button></div>
          </div>
          <div class="card">
            <div class="card-head"><div class="t"><div class="card-title">📡 Kanal Pengiriman</div>
              <div class="card-sub">Saklar per kanal diatur di Matriks Notifikasi (tab Konfigurasi).</div></div></div>
            <div class="reminder-step">
              <span>{{ rem.kanal.waUtama ? '🟢' : '⚪' }}</span><div><b>WhatsApp utama</b> {{ rem.kanal.waUtama ? 'aktif' : 'nonaktif' }}
                <div class="fs-xs txt-3">H-3: {{ rem.kanal.H3.wa ? 'WA ✓' : 'WA ✕' }} · H-0: {{ rem.kanal.H0.wa ? 'WA ✓' : 'WA ✕' }}</div></div></div>
            <div class="reminder-step">
              <span>{{ rem.kanal.emailUtama ? '🟢' : '⚪' }}</span><div><b>Email utama</b> {{ rem.kanal.emailUtama ? 'aktif' : 'nonaktif' }}
                <div class="fs-xs txt-3">H-3: {{ rem.kanal.H3.email ? 'Email ✓' : 'Email ✕' }} · H-0: {{ rem.kanal.H0.email ? 'Email ✓' : 'Email ✕' }}</div></div></div>
            <div class="reminder-step">
              <span>{{ rem.triggerAktif ? '⏱' : '⚠️' }}</span><div><b>Trigger server</b> {{ rem.triggerAktif ? 'aktif (tiap 1 menit)' : 'belum aktif — simpan pengaturan ini' }}
                <div class="fs-xs txt-3" v-if="rem.terakhir">Kiriman otomatis terakhir: {{ tanggal(rem.terakhir.waktu,'jam') }}
                  <span v-for="h in rem.terakhir.hasil" :key="h.jenis"> · {{ h.jenis }}: {{ h.penerima }} mahasiswa</span></div>
                <div class="fs-xs txt-3" v-else>Belum pernah berjalan otomatis.</div></div></div>
            <button class="btn sm secondary mt-sm" v-if="isSA" @click="pilihTab('config')">⚙️ Buka Matriks Notifikasi</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">👀 Pratinjau &amp; Kirim Manual</div>
            <div class="card-sub">Siapa yang akan diingatkan pada tanggal acuan — kirim sekarang tanpa menunggu jadwal.</div></div>
            <input class="input" type="date" v-model="remTanggal" @change="muatPratinjauRem" style="width:auto"></div>
          <div class="seg mb-md">
            <button :class="{on: remJenis==='H3'}" @click="remJenis='H3'">H-3 ({{ remPrev ? remPrev.H3.kirim.length : 0 }})</button>
            <button :class="{on: remJenis==='H0'}" @click="remJenis='H0'">H-0 ({{ remPrev ? remPrev.H0.kirim.length : 0 }})</button>
          </div>
          <template v-if="remData">
            <div class="flex gap-sm flex-wrap mb-md fs-sm">
              <span class="chip">Jatuh tempo {{ tanggal(remData.jatuhTempo) }}</span>
              <span class="chip">Periode {{ periodeLabel(remData.periode) }}</span>
              <span class="chip">{{ remData.kirim.length }} akan diingatkan · {{ rupiah(remData.total) }}</span>
              <span class="chip">{{ remData.lewati.length }} dilewati</span>
              <span class="chip" v-if="remData.prakiraan">ℹ️ sebagian tagihan belum terbit — memakai harga paket</span>
            </div>
            <div class="btn-row mb-md">
              <button class="btn" :disabled="kirimRem || !remData.kirim.length" @click="kirimReminder(remJenis)">
                <span v-if="kirimRem" class="spin"></span>📨 Kirim {{ remJenis === 'H3' ? 'H-3' : 'H-0' }} Sekarang ({{ remData.kirim.length }})</button>
              <button class="btn secondary" :disabled="kirimRem" @click="kirimReminder(remJenis, true)" title="Kirim juga ke yang sudah diingatkan">↺ Kirim Ulang (termasuk yang sudah)</button>
            </div>
            <div class="table-wrap" v-if="remData.kirim.length || remData.lewati.length" style="max-height:380px;overflow:auto">
              <table class="tbl">
                <thead><tr><th>Mahasiswa</th><th>Periode</th><th>Jumlah</th><th>Status Tagihan</th><th>Keterangan</th></tr></thead>
                <tbody>
                  <tr v-for="x in remData.kirim" :key="'k' + x.kunci">
                    <td><b class="fs-sm">{{ x.Nama }}</b><div class="mono fs-xs txt-3">{{ x.NIM || x.PenghuniID }} · {{ x.NoHP || x.Email }}</div></td>
                    <td class="fs-sm">{{ periodeLabel(x.Periode) }}</td><td class="num fs-sm">{{ rupiah(x.Jumlah) }}</td>
                    <td><sa-badge :teks="x.StatusTagihan"></sa-badge></td><td class="fs-xs"><span class="badge ok plain">akan dikirim</span></td>
                  </tr>
                  <tr v-for="x in remData.lewati" :key="'l' + x.kunci" style="opacity:.6">
                    <td><b class="fs-sm">{{ x.Nama }}</b><div class="mono fs-xs txt-3">{{ x.NIM || x.PenghuniID }}</div></td>
                    <td class="fs-sm">{{ periodeLabel(x.Periode) }}</td><td class="num fs-sm">{{ rupiah(x.Jumlah) }}</td>
                    <td><sa-badge :teks="x.StatusTagihan"></sa-badge></td><td class="fs-xs">⏭ {{ x.alasan }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <sa-empty v-else judul="Tidak ada tagihan jatuh tempo" :pesan="'Tidak ada tagihan dengan jatuh tempo ' + tanggal(remData.jatuhTempo) + '.'" ikon="📅"></sa-empty>
          </template>
        </div>

        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">🧾 Log Pengingat</div></div>
            <button class="btn sm secondary" @click="segarkan(muatReminder)">↻</button></div>
          <div class="table-wrap" v-if="rem.log.length" style="max-height:320px;overflow:auto">
            <table class="tbl">
              <thead><tr><th>Waktu</th><th>Jenis</th><th>Mahasiswa</th><th>Periode</th><th>Mode</th><th>Kanal</th><th>Status</th></tr></thead>
              <tbody><tr v-for="l in rem.log" :key="l.ReminderID">
                <td class="fs-xs">{{ tanggal(l.Tanggal,'jam') }}</td><td><span class="badge plain info">{{ l.Jenis === 'H3' ? 'H-3' : 'H-0' }}</span></td>
                <td class="fs-sm">{{ l.Nama }}</td><td class="fs-sm">{{ periodeLabel(l.Periode) }}</td>
                <td class="fs-xs">{{ l.Mode }} · {{ l.Oleh }}</td><td class="fs-xs">{{ l.Kanal }}</td><td><sa-badge :teks="l.Status"></sa-badge></td>
              </tr></tbody>
            </table>
          </div>
          <sa-empty v-else judul="Belum ada pengingat terkirim" ikon="⏰"></sa-empty>
        </div>
      </template>
    </template>

    <!-- ===================================================== ANTREAN ===== -->
    <template v-if="tab==='antrean'">
      <div class="grid grid-4 mb-md" v-if="ringkasAntrean">
        <sa-kpi label="Menunggu Kirim" :nilai="ringkasAntrean.antri" ikon="⏳" warna="warn"></sa-kpi>
        <sa-kpi label="Terkirim" :nilai="ringkasAntrean.terkirim" ikon="✅" warna="ok"></sa-kpi>
        <sa-kpi label="Gagal" :nilai="ringkasAntrean.gagal" ikon="⚠️" warna="danger"></sa-kpi>
        <sa-kpi label="Dibatalkan" :nilai="ringkasAntrean.batal" ikon="⏹"></sa-kpi>
      </div>
      <div class="card">
        <div class="filters">
          <select class="select" v-model="filterAntrean.status" @change="muatAntrean"><option value="">Semua status</option>
            <option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select>
          <select class="select" v-model="filterAntrean.kanal" @change="muatAntrean"><option value="">WA &amp; Email</option>
            <option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select>
          <button class="btn sm secondary" @click="muatAntrean">↻ Segarkan</button>
          <button class="btn sm" @click="prosesSekarang">▶ Proses Antrean Sekarang</button>
          <button class="btn sm secondary" v-if="isSA" @click="ulangiGagal">↺ Ulangi yang Gagal</button>
        </div>
        <sa-loading v-if="memuatAntrean"></sa-loading>
        <div class="table-wrap" v-else-if="antrean.length">
          <table class="tbl">
            <thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Pesan</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="q in antrean" :key="q.AntrianID">
                <td class="fs-xs">{{ tanggal(q.DibuatPada,'jam') }}</td>
                <td><span class="badge plain" :class="q.Kanal === 'WA' ? 'ok' : 'info'">{{ q.Kanal === 'WA' ? '💬 WA' : '✉️ Email' }}</span></td>
                <td class="fs-sm"><b>{{ q.NamaPenerima || '-' }}</b><div class="mono fs-xs txt-3">{{ q.Tujuan }}</div></td>
                <td class="fs-xs">{{ q.Event }}<div class="txt-3" v-if="q.BlastID">{{ q.BlastID }}</div></td>
                <td class="fs-xs" style="max-width:320px">{{ potong(q.Pesan, 110) }}</td>
                <td><sa-badge :teks="q.Status"></sa-badge><div class="fs-xs txt-3" v-if="q.Status !== 'Terkirim' && q.Respon">{{ potong(q.Respon, 60) }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <sa-empty v-else judul="Antrean kosong" pesan="Pesan otomatis & blast akan tercatat di sini." ikon="📬"></sa-empty>
      </div>
    </template>

    <!-- ===================================================== KONFIGURASI ===== -->
    <template v-if="tab==='config'">
      <sa-loading v-if="memuatCfg || !cfg"></sa-loading>
      <template v-else>
        <div class="grid grid-2 gap-md">
          <div class="card">
            <div class="card-head"><div class="t"><div class="card-title">💬 WhatsApp Gateway — Fonnte</div>
              <div class="card-sub">Token dari dashboard <a href="https://md.fonnte.com" target="_blank" rel="noopener">fonnte.com</a> → Device → Token.</div></div></div>
            <label class="switch mb-md"><input type="checkbox" v-model="cfg.waAktif"><span class="trk"></span>
              Notifikasi WhatsApp {{ cfg.waAktif ? 'AKTIF' : 'NONAKTIF' }}</label>
            <div class="field"><label class="label">Token Fonnte</label>
              <input class="input" type="password" v-model.trim="tokenBaru" autocomplete="off"
                     :placeholder="cfg.tokenTerpasang ? ('Tersimpan: ' + cfg.tokenMasked + ' — isi untuk mengganti') : 'Tempel token perangkat Fonnte'">
              <div class="hint">Disimpan di Script Properties server — tidak tertulis di spreadsheet.</div></div>
            <div class="btn-row">
              <button class="btn sm secondary" :disabled="!cfg.tokenTerpasang" @click="cekPerangkat">📡 Cek Perangkat</button>
              <button class="btn sm ghost" v-if="cfg.tokenTerpasang" @click="hapusToken">Hapus token</button>
            </div>
            <div class="info-box mt-sm" v-if="perangkat"><span>{{ perangkat.status === 'connect' ? '🟢' : '🔴' }}</span><div>
              <b>{{ perangkat.nomor }}</b> · {{ perangkat.status }} · paket {{ perangkat.paket || '-' }} · kuota {{ perangkat.kuota || '-' }}
              <span v-if="perangkat.kedaluwarsa"> · s.d. {{ perangkat.kedaluwarsa }}</span></div></div>
            <div class="flex gap-sm mt-md">
              <input class="input" v-model.trim="tesNomor" placeholder="08xx untuk tes" inputmode="tel">
              <button class="btn sm secondary" :disabled="!cfg.tokenTerpasang" @click="tesWA">Kirim Tes WA</button>
            </div>
            <hr style="border:0;border-top:1px solid var(--border);margin:18px 0">
            <div class="grid grid-2 gap-md">
              <div class="field"><label class="label">Batch blast bawaan</label>
                <div class="seg-batch"><button v-for="b in [10,20,50]" :key="b" :class="{on: cfg.batchDefault === b}" @click="cfg.batchDefault = b">{{ b }}</button></div></div>
              <div class="field"><label class="label">Jeda antarpesan (detik)</label>
                <input class="input" v-model.trim="cfg.jeda" placeholder="5 atau 3-8"></div>
            </div>
            <label class="switch"><input type="checkbox" v-model="cfg.deteksiOtomatis"><span class="trk"></span>
              Deteksi otomatis nomor pendaftar baru (terdaftar WA / tidak)</label>
          </div>

          <div class="card">
            <div class="card-head"><div class="t"><div class="card-title">✉️ Email (Gmail akun pemilik script)</div>
              <div class="card-sub">Sisa kuota hari ini: <b>{{ cfg.emailQuota === null ? '-' : cfg.emailQuota }}</b> email
                (akun Gmail biasa ±100/hari, Google Workspace ±1.500/hari).</div></div></div>
            <label class="switch mb-md"><input type="checkbox" v-model="cfg.emailAktif"><span class="trk"></span>
              Notifikasi Email {{ cfg.emailAktif ? 'AKTIF' : 'NONAKTIF' }}</label>
            <div class="field"><label class="label">Nama pengirim</label><input class="input" v-model="cfg.namaPengirim"></div>
            <div class="flex gap-sm">
              <input class="input" v-model.trim="tesEmail" :placeholder="user.Email || 'email tujuan tes'">
              <button class="btn sm secondary" @click="tesMail">Kirim Tes Email</button>
            </div>
            <hr style="border:0;border-top:1px solid var(--border);margin:18px 0">
            <div class="field"><label class="label">URL aplikasi (untuk {link} di pesan)</label>
              <input class="input" v-model.trim="cfg.appUrl" placeholder="https://username.github.io/sim-asrama/"></div>
            <div class="info-box" :class="cfg.triggerAktif ? '' : 'warn'"><span>{{ cfg.triggerAktif ? '⏱' : '⚠️' }}</span><div>
              <template v-if="cfg.triggerAktif">Trigger antrean aktif — pesan dikirim otomatis tiap 1 menit.
                Antrean: {{ cfg.antrian.antri }} menunggu, {{ cfg.antrian.gagal }} gagal.</template>
              <template v-else>Trigger antrean belum aktif. Simpan konfigurasi ini, atau jalankan <code>pasangTrigger()</code> di editor Apps Script.</template>
            </div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">Matriks Notifikasi Otomatis</div>
            <div class="card-sub">Saklar WhatsApp &amp; Email untuk SETIAP jenis notifikasi. Saklar utama (atas) mematikan seluruh kanal sekaligus.
              Blast manual tetap bisa dipakai walau saklar notifikasi otomatis WA mati.</div></div></div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Kejadian</th><th class="text-center">WhatsApp</th><th class="text-center">Email</th><th>Template</th></tr></thead>
              <tbody>
                <tr><td></td>
                  <td class="text-center fs-xs"><a href="#" @click.prevent="setSemua('wa', true)">semua on</a> · <a href="#" @click.prevent="setSemua('wa', false)">off</a></td>
                  <td class="text-center fs-xs"><a href="#" @click.prevent="setSemua('email', true)">semua on</a> · <a href="#" @click.prevent="setSemua('email', false)">off</a></td>
                  <td></td></tr>
                <template v-for="g in matriksGrup" :key="g.grup">
                <tr><td colspan="4" class="notif-grup">{{ g.grup }}</td></tr>
                <template v-for="it in g.items" :key="it.k">
                  <tr>
                    <td><b class="fs-sm">{{ it.m.label }}</b><div class="mono fs-xs txt-3">{{ it.k }}</div></td>
                    <td class="text-center"><label class="switch"><input type="checkbox" v-model="it.m.wa" :disabled="!cfg.waAktif"><span class="trk"></span></label></td>
                    <td class="text-center"><label class="switch"><input type="checkbox" v-model="it.m.email" :disabled="!cfg.emailAktif"><span class="trk"></span></label></td>
                    <td><button class="btn xs secondary" @click="editEvent = editEvent === it.k ? '' : it.k">{{ editEvent === it.k ? 'Tutup' : '✎ Ubah' }}</button></td>
                  </tr>
                  <tr v-if="editEvent === it.k">
                    <td colspan="4">
                      <div class="grid grid-2 gap-md">
                        <div>
                          <div class="field"><label class="label">Subjek email</label><input class="input" v-model="it.m.subjek"></div>
                          <div class="field"><label class="label">Isi pesan</label><textarea class="input" rows="6" v-model="it.m.pesan"></textarea>
                            <div class="hint">Variabel: {nama} {nim} {kamar} {periode} {jumlah} {jatuhTempo} {rekening} {username} {sandi} {kode} {status} {catatan} {poin} {skor} {institusi} {link}</div></div>
                          <button class="btn xs ghost" @click="kembalikanTemplate(it.m)">↺ Kembalikan bawaan</button>
                        </div>
                        <div><div class="label">Pratinjau</div><div class="wa-preview">{{ it.m.pesan }}</div></div>
                      </div>
                    </td>
                  </tr>
                </template>
                </template>
              </tbody>
            </table>
          </div>
          <div class="btn-row mt-md" style="justify-content:flex-end">
            <button class="btn" :disabled="simpanCfg" @click="simpanKonfigurasi"><span v-if="simpanCfg" class="spin"></span>💾 Simpan Konfigurasi</button>
          </div>
        </div>
      </template>
    </template>
  </div>`
};
