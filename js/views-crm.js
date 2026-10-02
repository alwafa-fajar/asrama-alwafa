/* ==========================================================================
 * SIM ASRAMA v6.2 — CRM KONTAK (Nama · Email · WhatsApp)
 * --------------------------------------------------------------------------
 * Satu layar memantau kontak pendaftar, mahasiswa, wali, dan staf:
 * kualitas data, status WhatsApp, opt-out, riwayat dihubungi, tag & segmen —
 * lalu langsung dipakai untuk blast. Daftar & KPI tampil seketika dari cache.
 * ========================================================================== */

window.VIEWS = window.VIEWS || {};

window.VIEWS['crm'] = {
  props: ['user'],
  emits: ['pindah'],
  data: function () {
    return {
      st: null, data: null, memuat: true,
      f: { cari: '', segmen: '', sumber: '', statusWA: '', emailValid: '', optOut: '', duplikat: false, tanpaKanal: false, tag: '', urut: 'nama', halaman: 1, per: 50 },
      dipilih: {}, detail: null, memuatDetail: false, catatan: { kanal: 'Telepon', ringkasan: '' },
      sinkron: false, aksi: false, dup: null, impor: false, imporRows: [], prosesImpor: false, cekWA: false
    };
  },
  computed: {
    bolehKelola: function () { return ['SA','PMB','PA','PI'].indexOf(this.user.Role) > -1; },
    bolehEkspor: function () { return ['SA','PIM'].indexOf(this.user.Role) > -1; },
    jumlahPilih: function () { var d = this.dipilih; return Object.keys(d).filter(function (k) { return d[k]; }).length; },
    idPilih: function () { var d = this.dipilih; return Object.keys(d).filter(function (k) { return d[k]; }); },
    semuaDipilih: function () {
      var d = this.dipilih;
      return this.data && this.data.rows.length && this.data.rows.every(function (r) { return d[r.KontakID]; });
    }
  },
  mounted: function () { this.muat(); },
  created: function () { this.cariTunda = debounce(this.muatDaftar, 350); },
  watch: { 'f.cari': function () { this.f.halaman = 1; this.cariTunda(); } },
  methods: {
    muat: async function () {
      this.memuat = !APP._latar && !this.data;
      var hasil = await Promise.all([callApi('crm.stats', {}), callApi('crm.list', this.f)]);
      this.memuat = false;
      if (hasil[0].ok) this.st = hasil[0].data;
      if (hasil[1].ok) this.data = hasil[1].data;
    },
    muatDaftar: async function () {
      var res = await callApi('crm.list', this.f);
      if (res.ok) this.data = res.data;
    },
    saring: function (patch) {
      this.f = Object.assign({}, this.f, { segmen: '', sumber: '', statusWA: '', emailValid: '', optOut: '', duplikat: false, tanpaKanal: false, tag: '' }, patch, { halaman: 1 });
      this.dipilih = {};
      this.muatDaftar();
    },
    ubahF: function () { this.f.halaman = 1; this.dipilih = {}; this.muatDaftar(); },
    keHal: function (h) { if (h < 1 || h > this.data.jumlahHalaman) return; this.f.halaman = h; this.muatDaftar(); },
    pilihSemua: function () {
      var nilai = !this.semuaDipilih, d = Object.assign({}, this.dipilih);
      this.data.rows.forEach(function (r) { d[r.KontakID] = nilai; });
      this.dipilih = d;
    },
    sinkronkan: async function () {
      this.sinkron = true;
      var res = await callApi('crm.sync', {});
      this.sinkron = false;
      if (res.ok) { toast(res.message, 'success'); this.muat(); }
    },
    waKelas: function (s) { return s === 'Terdaftar' ? 'ya' : (s === 'Tidak Terdaftar' ? 'tidak' : 'belum'); },
    waLabel: function (s) { return s === 'Terdaftar' ? '✓ WA' : (s === 'Tidak Terdaftar' ? '✕ bukan WA' : '? belum dicek'); },
    sumberLabel: function (s) { return { pendaftar: 'Pendaftar', penghuni: 'Mahasiswa', wali: 'Wali', staf: 'Staf', manual: 'Impor' }[s] || s; },

    /* ---- aksi massal ---- */
    massal: async function (aksi) {
      var ids = this.idPilih, nilai = '';
      if (!ids.length) return;
      if (aksi === 'tag' || aksi === 'untag') {
        nilai = await tanya(aksi === 'tag' ? 'Beri tag' : 'Hapus tag', 'Nama tag (mis. alumni-2025, prioritas)');
        if (!nilai) return;
      }
      if (aksi === 'optout' && !(await konfirmasi('Opt-out ' + ids.length + ' kontak?', 'Kontak ini tidak akan menerima blast. Notifikasi transaksional (tagihan dsb) tetap terkirim.', 'Ya, opt-out', true))) return;
      this.aksi = true;
      var res = await callApi('crm.bulk', { ids: ids, aksi: aksi, nilai: nilai });
      this.aksi = false;
      if (res.ok) { toast(res.message, 'success'); this.dipilih = {}; this.muat(); }
    },
    deteksiWA: async function () {
      var ids = this.idPilih.slice();
      if (!ids.length) return;
      this.cekWA = true;
      for (var i = 0; i < ids.length; i += 50) {
        var res = await callApi('crm.bulk', { ids: ids.slice(i, i + 50), aksi: 'deteksiWA' });
        if (!res.ok) break;
      }
      this.cekWA = false;
      toast('Deteksi WhatsApp selesai.', 'success');
      this.muat();
    },
    blastTerpilih: function () {
      APP.presetBlast = 'crm'; APP.presetKontak = this.idPilih.slice();
      this.$emit('pindah', 'notifikasi-wa');
    },
    ekspor: async function () {
      var res = await callApi('crm.export', Object.assign({}, this.f, { halaman: 1 }));
      if (res.ok) unduhExcel(res.data.rows, res.data.nama, 'Kontak');
    },

    /* ---- detail ---- */
    buka: async function (r) {
      this.detail = { kontak: r, timeline: [], asal: null, muat: true };
      this.catatan = { kanal: 'Telepon', ringkasan: '' };
      var res = await callApi('crm.detail', { kontakId: r.KontakID });
      if (res.ok) this.detail = Object.assign({ muat: false }, res.data);
      else this.detail = null;
    },
    simpanKontak: async function () {
      var k = this.detail.kontak;
      var res = await callApi('crm.save', { kontak: { KontakID: k.KontakID, Nama: k.Nama, Email: k.Email, NoWA: k.NoWA, Tag: k.Tag, Catatan: k.Catatan, OptOut: k.OptOut } });
      if (res.ok) { toast(res.message, 'success'); this.muatDaftar(); }
    },
    catatInteraksi: async function () {
      if (!this.catatan.ringkasan) { toast('Isi ringkasan.', 'warning'); return; }
      var res = await callApi('crm.interaksi', { kontakId: this.detail.kontak.KontakID, kanal: this.catatan.kanal, ringkasan: this.catatan.ringkasan });
      if (res.ok) { toast(res.message, 'success'); this.buka(this.detail.kontak); }
    },
    salin: function (t) { try { navigator.clipboard.writeText(t); toast('Disalin.', 'success'); } catch (e) { toast(t, 'info'); } },

    /* ---- duplikat ---- */
    periksaDuplikat: async function () {
      var res = await callApi('crm.duplikat', {});
      if (res.ok) this.dup = res.data;
    },
    gabung: async function (g) {
      var utama = g.kontak.filter(function (k) { return k.Sumber === 'penghuni'; })[0] || g.kontak[0];
      var ya = await konfirmasi('Gabungkan ' + g.kontak.length + ' kontak?', 'Kontak utama: ' + utama.Nama + ' (' + this.sumberLabel(utama.Sumber) + '). Tag, catatan & jumlah pesan disatukan.', 'Gabungkan');
      if (!ya) return;
      var res = await callApi('crm.merge', { utama: utama.KontakID, gabung: g.kontak.map(function (k) { return k.KontakID; }) });
      if (res.ok) { toast(res.message, 'success'); this.periksaDuplikat(); this.muat(); }
    },

    /* ---- impor ---- */
    unduhTemplate: function () {
      unduhExcel([{ nama: 'Contoh Nama', email: 'contoh@gmail.com', wa: '081234567890', segmen: 'Umum', tag: 'seminar-2026' }], 'Template_Import_Kontak', 'Kontak');
    },
    pilihImpor: async function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      try {
        var rows = await bacaExcel(f);
        this.imporRows = rows.map(function (r) {
          var low = {}; Object.keys(r).forEach(function (k) { low[String(k).toLowerCase().trim()] = r[k]; });
          return { nama: low.nama || low.name || '', email: low.email || '', wa: low.wa || low.whatsapp || low.hp || low.nowa || '', segmen: low.segmen || 'Umum', tag: low.tag || '' };
        });
      } catch (e) { toast('Berkas tidak bisa dibaca: ' + e.message, 'error'); }
    },
    kirimImpor: async function () {
      this.prosesImpor = true;
      var res = await callApi('crm.import', { rows: this.imporRows });
      this.prosesImpor = false;
      if (res.ok) { toast(res.message, 'success'); this.impor = false; this.imporRows = []; this.muat(); }
    }
  },
  template: `
  <div>
    <sa-page judul="CRM Kontak — Nama · Email · WhatsApp"
             sub="Pantau kualitas & status kontak pendaftar, mahasiswa, wali, dan staf. Langsung pakai untuk blast WhatsApp."
             :jalur="['Pendukung','CRM Kontak']">
      <template #aksi>
        <span class="fs-xs txt-3" v-if="st && st.syncTerakhir">Sinkron: {{ st.syncTerakhir }}</span>
        <button class="btn secondary" v-if="bolehKelola" :disabled="sinkron" @click="sinkronkan"><span v-if="sinkron" class="spin dark"></span>↻ Sinkron Sekarang</button>
        <button class="btn secondary" v-if="bolehKelola" @click="periksaDuplikat">⧉ Periksa Duplikat</button>
        <button class="btn secondary" v-if="['SA','PMB'].indexOf(user.Role) > -1" @click="impor = true">⬆ Import</button>
        <button class="btn" v-if="bolehEkspor" @click="ekspor">⬇ Ekspor</button>
      </template>
    </sa-page>

    <sa-loading v-if="memuat"></sa-loading>
    <template v-else>
      <div class="grid grid-6 mb-md" v-if="st" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        <div class="kpi klik" @click="saring({})"><div class="kpi-label">Total Kontak</div><div class="kpi-value">{{ angka(st.total) }}</div>
          <div class="kpi-foot"><span>{{ st.baru7 }} baru 7 hari</span></div></div>
        <div class="kpi klik" @click="saring({statusWA:'Terdaftar'})"><div class="kpi-label">WA Terverifikasi</div><div class="kpi-value txt-ok">{{ angka(st.terdaftarWA) }}</div>
          <div class="kpi-foot"><span>{{ angka(st.hpValid) }} nomor valid</span></div></div>
        <div class="kpi klik" @click="saring({emailValid:'YA'})"><div class="kpi-label">Email Valid</div><div class="kpi-value">{{ angka(st.emailValid) }}</div>
          <div class="kpi-foot"><span>{{ st.dihubungi30 }} dihubungi 30 hari</span></div></div>
        <div class="kpi klik" @click="saring({statusWA:'belum'})"><div class="kpi-label">Belum Dicek WA</div><div class="kpi-value txt-warn">{{ angka(st.belumCekWA) }}</div>
          <div class="kpi-foot"><span>{{ st.tidakTerdaftarWA }} bukan WA</span></div></div>
        <div class="kpi klik" @click="saring({optOut:'YA'})"><div class="kpi-label">Opt-out</div><div class="kpi-value">{{ angka(st.optOut) }}</div>
          <div class="kpi-foot"><span>tidak menerima blast</span></div></div>
        <div class="kpi klik" @click="saring({duplikat:true})"><div class="kpi-label">Duplikat</div><div class="kpi-value txt-danger">{{ angka(st.duplikat) }}</div>
          <div class="kpi-foot"><span>{{ st.tanpaKanal }} tanpa WA/email</span></div></div>
      </div>

      <div class="card">
        <div class="chip-row mb-md" v-if="data">
          <button class="chip" :class="{active: !f.segmen}" @click="saring({})">Semua</button>
          <button class="chip" v-for="(n, s) in data.facet.segmen" :key="s" :class="{active: f.segmen === s}" @click="saring({segmen: s})">{{ s }} · {{ angka(n) }}</button>
        </div>
        <div class="filters">
          <input class="input flex-1" v-model="f.cari" placeholder="🔍 Cari nama, email, atau nomor WA…" style="min-width:220px">
          <select class="select" v-model="f.statusWA" @change="ubahF"><option value="">Status WA: semua</option><option>Terdaftar</option>
            <option>Tidak Terdaftar</option><option value="belum">Belum dicek</option></select>
          <select class="select" v-model="f.emailValid" @change="ubahF"><option value="">Email: semua</option><option value="YA">Valid</option><option value="TIDAK">Tidak valid</option></select>
          <select class="select" v-model="f.optOut" @change="ubahF"><option value="">Opt-out: semua</option><option value="YA">Opt-out</option><option value="TIDAK">Menerima</option></select>
          <input class="input" v-model.trim="f.tag" @change="ubahF" placeholder="Tag" style="width:130px">
          <select class="select" v-model="f.urut" @change="ubahF"><option value="nama">Urut: nama</option><option value="terakhir">Terakhir dihubungi</option><option value="baru">Terbaru</option></select>
          <label class="check"><input type="checkbox" v-model="f.duplikat" @change="ubahF"> Duplikat</label>
          <label class="check"><input type="checkbox" v-model="f.tanpaKanal" @change="ubahF"> Tanpa WA/email</label>
        </div>

        <div class="info-box mb-md" v-if="jumlahPilih" style="align-items:center;flex-wrap:wrap">
          <b>{{ jumlahPilih }} dipilih</b>
          <div class="btn-row" style="margin-left:auto">
            <button class="btn sm secondary" v-if="bolehKelola" :disabled="cekWA" @click="deteksiWA"><span v-if="cekWA" class="spin dark"></span>📱 Deteksi WA</button>
            <button class="btn sm secondary" v-if="bolehKelola" :disabled="aksi" @click="massal('tag')">🏷 Beri Tag</button>
            <button class="btn sm secondary" v-if="bolehKelola" :disabled="aksi" @click="massal('untag')">Hapus Tag</button>
            <button class="btn sm" @click="blastTerpilih">📣 Blast ke Terpilih</button>
            <button class="btn sm secondary" v-if="bolehKelola" :disabled="aksi" @click="massal('optout')">⛔ Opt-out</button>
            <button class="btn sm ghost" v-if="bolehKelola" :disabled="aksi" @click="massal('optin')">✓ Opt-in</button>
            <button class="btn sm ghost" @click="dipilih = {}">Batal</button>
          </div>
        </div>

        <div class="table-wrap" v-if="data && data.rows.length">
          <table class="tbl">
            <thead><tr><th style="width:30px"><input type="checkbox" :checked="semuaDipilih" @change="pilihSemua"></th>
              <th>Kontak</th><th>Email</th><th>WhatsApp</th><th>Tag</th><th>Terakhir dihubungi</th><th>Pesan</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.KontakID" :class="{'crm-row-warn': r.Ganda || (!r.HpValid && r.EmailValid !== 'YA') || r.EmailValid === 'TIDAK'}">
                <td><input type="checkbox" v-model="dipilih[r.KontakID]"></td>
                <td><div class="person"><sa-avatar :nama="r.Nama" ukuran="sm"></sa-avatar>
                  <div class="nm"><b>{{ r.Nama || '—' }}</b><span><span class="badge plain info">{{ r.Segmen }}</span>
                    <span class="fs-xs txt-3">{{ r.NIM || r.RefID }}{{ r.Status ? ' · ' + r.Status : '' }}</span>
                    <span v-if="r.Ganda" class="badge warn plain">duplikat</span><span v-if="r.OptOut === 'YA'" class="badge danger plain">opt-out</span></span></div></div></td>
                <td class="fs-sm">{{ r.Email || '—' }} <span v-if="r.Email">{{ r.EmailValid === 'YA' ? '✓' : '⚠️' }}</span></td>
                <td class="fs-sm"><span class="mono">{{ r.NoWA || '—' }}</span>
                  <div v-if="r.NoWA"><span class="wa-badge" :class="waKelas(r.StatusWA)">{{ waLabel(r.StatusWA) }}</span>
                    <a :href="waLink(r.NoWA)" target="_blank" rel="noopener" class="fs-xs">chat ↗</a></div></td>
                <td class="fs-xs">{{ r.Tag || '—' }}</td>
                <td class="fs-xs">{{ r.TerakhirDihubungi ? tanggal(r.TerakhirDihubungi,'jam') : '—' }}</td>
                <td class="num fs-sm">{{ r.JumlahPesan }}</td>
                <td><button class="btn xs secondary" @click="buka(r)">Detail</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <sa-empty v-else judul="Belum ada kontak" pesan="Klik “Sinkron Sekarang” untuk mengambil kontak dari data pendaftar, mahasiswa, wali, dan staf." ikon="📇"></sa-empty>
        <div class="tbl-foot" v-if="data && data.total">
          <span>{{ angka(data.total) }} kontak · halaman {{ data.halaman }} / {{ data.jumlahHalaman }}</span>
          <div class="pager">
            <button :disabled="data.halaman <= 1" @click="keHal(data.halaman - 1)">‹</button>
            <button class="active">{{ data.halaman }}</button>
            <button :disabled="data.halaman >= data.jumlahHalaman" @click="keHal(data.halaman + 1)">›</button>
          </div>
        </div>
      </div>
    </template>

    <!-- DRAWER DETAIL -->
    <template v-if="detail">
      <div class="drawer-back" @click="detail = null"></div>
      <aside class="drawer">
        <div class="drawer-head">
          <sa-avatar :nama="detail.kontak.Nama"></sa-avatar>
          <div class="flex-1"><b>{{ detail.kontak.Nama }}</b><div class="fs-xs txt-3">{{ detail.kontak.Segmen }} · {{ sumberLabel(detail.kontak.Sumber) }} {{ detail.kontak.RefID }}</div></div>
          <button class="btn xs ghost" @click="detail = null">✕</button>
        </div>
        <div class="drawer-body">
          <sa-loading v-if="detail.muat"></sa-loading>
          <template v-else>
            <div class="btn-row mb-md">
              <a class="btn sm" v-if="detail.kontak.wa" :href="detail.kontak.wa" target="_blank" rel="noopener">💬 WhatsApp</a>
              <a class="btn sm secondary" v-if="detail.kontak.Email" :href="'mailto:' + detail.kontak.Email">✉️ Email</a>
              <button class="btn sm ghost" v-if="detail.kontak.NoWA" @click="salin(detail.kontak.NoWA)">⧉ Salin nomor</button>
            </div>
            <div class="info-box mb-md" v-if="detail.asal"><span>🔗</span><div class="fs-sm">Data asli: <b>{{ detail.asal.tabel }}</b> {{ detail.asal.id }} · {{ detail.asal.status }}.
              Perubahan nama/email/nomor di sini ikut memperbarui data asli.</div></div>
            <div class="field"><label class="label">Nama</label><input class="input" v-model="detail.kontak.Nama" :disabled="!bolehKelola"></div>
            <div class="grid grid-2 gap-md">
              <div class="field"><label class="label">Email</label><input class="input" type="email" v-model.trim="detail.kontak.Email" :disabled="!bolehKelola"></div>
              <div class="field"><label class="label">WhatsApp</label><input class="input" inputmode="tel" v-model.trim="detail.kontak.NoWA" :disabled="!bolehKelola">
                <div class="hint"><span class="wa-badge" :class="waKelas(detail.kontak.StatusWA)">{{ waLabel(detail.kontak.StatusWA) }}</span></div></div>
            </div>
            <div class="field"><label class="label">Tag (pisahkan koma)</label><input class="input" v-model="detail.kontak.Tag" :disabled="!bolehKelola"></div>
            <div class="field"><label class="label">Catatan</label><textarea class="input" rows="2" v-model="detail.kontak.Catatan" :disabled="!bolehKelola"></textarea></div>
            <label class="switch mb-md"><input type="checkbox" :checked="detail.kontak.OptOut === 'YA'" :disabled="!bolehKelola"
                   @change="detail.kontak.OptOut = $event.target.checked ? 'YA' : 'TIDAK'"><span class="trk"></span>
              Opt-out blast {{ detail.kontak.OptOut === 'YA' ? '(tidak menerima blast)' : '' }}</label>
            <button class="btn sm" v-if="bolehKelola" @click="simpanKontak">💾 Simpan Kontak</button>

            <div class="label mt-lg">Catat Interaksi</div>
            <div class="flex gap-sm">
              <select class="select" v-model="catatan.kanal" style="width:auto"><option>Telepon</option><option>WA Manual</option>
                <option>Email Manual</option><option>Kunjungan</option><option>Catatan</option></select>
              <input class="input flex-1" v-model="catatan.ringkasan" placeholder="Ringkasan follow-up…">
              <button class="btn sm secondary" @click="catatInteraksi">Catat</button>
            </div>

            <div class="label mt-lg">Timeline ({{ detail.timeline.length }})</div>
            <div class="timeline" v-if="detail.timeline.length">
              <div class="tl-item" v-for="(t, i) in detail.timeline" :key="i" :class="t.status === 'Gagal' ? 'danger' : 'ok'">
                <div class="tl-time">{{ tanggal(t.waktu,'jam') }} · {{ t.kanal }}{{ t.status ? ' · ' + t.status : '' }}</div>
                <div class="tl-title fs-sm">{{ t.ringkasan }}</div>
                <div class="tl-desc" v-if="t.oleh">oleh {{ t.oleh }}</div>
              </div>
            </div>
            <p v-else class="fs-sm txt-3">Belum ada interaksi tercatat.</p>
          </template>
        </div>
      </aside>
    </template>

    <!-- MODAL DUPLIKAT -->
    <sa-modal v-if="dup" judul="Kontak Duplikat" :sub="dup.jumlah + ' grup nomor/email yang sama'" ikon="⧉" lebar="wide" @tutup="dup = null">
      <div v-for="g in dup.grup" :key="g.jenis + g.kunci" class="reminder-step">
        <span>{{ g.jenis === 'WhatsApp' ? '💬' : '✉️' }}</span>
        <div class="flex-1"><b class="mono">{{ g.kunci }}</b>
          <div class="fs-sm txt-2"><span v-for="k in g.kontak" :key="k.KontakID">• {{ k.Nama }} <small>({{ sumberLabel(k.Sumber) }} {{ k.RefID }})</small> </span></div></div>
        <button class="btn xs" v-if="['SA','PMB'].indexOf(user.Role) > -1" @click="gabung(g)">Gabungkan</button>
      </div>
      <sa-empty v-if="!dup.grup.length" judul="Tidak ada duplikat" ikon="✅"></sa-empty>
      <p class="fs-xs txt-3 mt-sm">Wajar bila pendaftar yang sudah jadi mahasiswa muncul 2× (Pendaftar &amp; Mahasiswa). Gabungkan agar tidak menerima blast ganda.</p>
      <template #aksi><button class="btn secondary" @click="dup = null">Tutup</button></template>
    </sa-modal>

    <!-- MODAL IMPOR -->
    <sa-modal v-if="impor" judul="Import Kontak" sub="Kontak di luar aplikasi (calon mahasiswa, peserta seminar, mitra)." ikon="⬆" @tutup="impor = false">
      <div class="btn-row mb-md">
        <button class="btn sm secondary" @click="unduhTemplate">⬇ Unduh template .xlsx</button>
        <label class="btn sm" style="cursor:pointer">📂 Pilih .xlsx / .csv<input type="file" class="hide" accept=".xlsx,.xls,.csv" @change="pilihImpor"></label>
      </div>
      <p class="fs-sm" v-if="imporRows.length"><b>{{ imporRows.length }}</b> baris terbaca. Contoh: {{ imporRows[0].nama }} · {{ imporRows[0].wa }} · {{ imporRows[0].email }}</p>
      <p class="fs-xs txt-3">Kolom: nama, email, wa, segmen, tag. Nomor yang sudah ada dilewati otomatis.</p>
      <template #aksi>
        <button class="btn secondary" @click="impor = false">Batal</button>
        <button class="btn" :disabled="!imporRows.length || prosesImpor" @click="kirimImpor"><span v-if="prosesImpor" class="spin"></span>Import {{ imporRows.length }} Kontak</button>
      </template>
    </sa-modal>
  </div>`
};
