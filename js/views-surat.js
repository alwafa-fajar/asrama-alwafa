/* ==========================================================================
 * SIM ASRAMA v6.2 — DOC ENGINE SURAT (SP / BAP) + VERIFIKASI PUBLIK
 * --------------------------------------------------------------------------
 * template-surat : arsip surat terbit (unduh PDF, batalkan) + kelola template
 *                  Google Docs berplaceholder {{KUNCI}} (Super Admin)
 * verifikasi     : halaman publik dari QR surat → cek keaslian dokumen
 * ========================================================================== */

window.VIEWS = window.VIEWS || {};

/** Unduh PDF dari base64 (dipakai juga oleh menu SP & Kedisiplinan) */
function unduhPdfBase64(b64, nama) {
  try {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    var a = document.createElement('a');
    a.href = url; a.download = nama || 'surat.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  } catch (e) { toast('PDF gagal diunduh: ' + e.message, 'error'); }
}

/** Terbitkan / unduh PDF surat untuk satu teguran (Doc Engine) */
async function cetakSuratTeguran(teguranId, opsi) {
  opsi = opsi || {};
  toast('Menyiapkan PDF surat… (±5–10 detik pertama kali)', 'info');
  var res = await callApi('doc.generate', { teguranId: teguranId, templateId: opsi.templateId || '', ulang: !!opsi.ulang }, { timeout: 120000 });
  if (!res.ok) return res;
  if (res.data.base64) unduhPdfBase64(res.data.base64, res.data.dokumen.namaBerkas);
  toast(res.message, 'success');
  return res;
}

window.VIEWS['template-surat'] = {
  props: ['user'],
  emits: ['pindah'],
  data: function () {
    return { tab: 'arsip', dok: [], memuat: true, cari: '', tpl: null, memuatTpl: false,
             form: null, scan: null, proses: false, prosesTtd: '' };
  },
  computed: {
    isSA: function () { return this.user.Role === 'SA'; },
    dokTersaring: function () {
      var q = this.cari.toLowerCase();
      return this.dok.filter(function (d) {
        return !q || String(d.NamaLengkap).toLowerCase().indexOf(q) > -1 || String(d.Nomor).toLowerCase().indexOf(q) > -1 ||
               String(d.KodeVerifikasi).toLowerCase().indexOf(q) > -1;
      });
    }
  },
  mounted: function () { this.muat(); },
  methods: {
    muat: async function () {
      this.memuat = !APP._latar && !this.dok.length;
      var res = await callApi('doc.list', {});
      this.memuat = false;
      if (res.ok) this.dok = res.data;
      if (this.tab === 'template') this.muatTpl();
    },
    muatTpl: async function () {
      this.memuatTpl = !this.tpl;
      var res = await callApi('doc.templates', {});
      this.memuatTpl = false;
      if (res.ok) this.tpl = res.data;
    },
    pilihTab: function (t) { this.tab = t; if (t === 'template' && !this.tpl) this.muatTpl(); },
    unduh: async function (d) {
      var res = await callApi('doc.pdf', { dokumenId: d.DokumenID }, { timeout: 60000 });
      if (res.ok) unduhPdfBase64(res.data.base64, res.data.dokumen.namaBerkas);
    },
    batal: async function (d) {
      var alasan = await tanya('Batalkan ' + d.Nomor + '?', 'Alasan pembatalan (tampil di halaman verifikasi sebagai BATAL)');
      if (!alasan) return;
      var res = await callApi('doc.batal', { dokumenId: d.DokumenID, alasan: alasan });
      if (res.ok) { d.Status = 'BATAL'; toast(res.message, 'success'); }
    },
    salinLink: function (d) {
      var url = (APP.pengaturan.APP_URL || location.href.split('#')[0]).replace(/[#?].*$/, '').replace(/\/+$/, '') + '/#verifikasi=' + d.KodeVerifikasi;
      try { navigator.clipboard.writeText(url); toast('Tautan verifikasi disalin.', 'success'); } catch (e) { toast(url, 'info'); }
    },
    /* ---- template ---- */
    buatContoh: async function () {
      var ya = await konfirmasi('Buat template SP contoh?', 'Google Docs baru dibuat di Drive (folder Surat_Terbit). Anda bisa mengedit kop & isinya di Google Docs.', 'Buat');
      if (!ya) return;
      this.proses = true;
      var res = await callApi('doc.templateContoh', {}, { timeout: 120000 });
      this.proses = false;
      if (res.ok) {
        toast(res.message, 'success'); this.tpl = null; this.muatTpl();
        if (res.data.urlDoc) window.open(res.data.urlDoc, '_blank', 'noopener');
      }
    },
    baru: function () { this.form = { Nama: '', Jenis: 'SP', doc: '', TtdNama: '', TtdJabatan: 'Kepala Pengasuhan Asrama', Kota: 'Bogor', Status: 'Aktif' }; this.scan = null; },
    sunting: function (t) { this.form = Object.assign({ doc: t.DocID }, t); this.scan = null; },
    pindai: async function () {
      this.proses = true;
      var res = await callApi('doc.templateScan', { doc: this.form.doc }, { timeout: 60000 });
      this.proses = false;
      if (res.ok) { this.scan = res.data; if (!this.form.Nama) this.form.Nama = res.data.nama; }
    },
    simpan: async function () {
      this.proses = true;
      var t = Object.assign({}, this.form, { DocID: this.form.doc });
      var res = await callApi('doc.templateSave', { template: t }, { timeout: 60000 });
      this.proses = false;
      if (res.ok) { toast(res.message, 'success'); this.form = null; this.tpl = null; this.muatTpl(); }
    },
    unggahTtd: async function (t, ev) {
      var f = ev.target.files[0];
      if (!f) return;
      if (!/^image\/(png|jpe?g|gif)$/.test(f.type)) { toast('Gunakan PNG (latar transparan) atau JPG.', 'warning'); return; }
      if (f.size > batasUnggahKB() * 1024) { toast('Maksimal ' + labelBatasUnggah() + '.', 'warning'); return; }
      this.prosesTtd = t.TemplateID;
      var self = this;
      var fr = new FileReader();
      fr.onload = async function () {
        var res = await callApi('doc.ttdUpload', { templateId: t.TemplateID, berkas: { base64: String(fr.result).split(',')[1], mime: f.type, nama: f.name } });
        self.prosesTtd = '';
        if (res.ok) { toast(res.message, 'success'); t.adaTtd = true; }
      };
      fr.readAsDataURL(f);
    },
    hapusTtd: async function (t) {
      var res = await callApi('doc.ttdUpload', { templateId: t.TemplateID, hapus: true });
      if (res.ok) { toast(res.message, 'success'); t.adaTtd = false; }
    }
  },
  template: `
  <div>
    <sa-page judul="Template &amp; Arsip Surat (SP / BAP)"
             sub="Surat peringatan dicetak dari template Google Docs: nomor otomatis, PDF tersimpan di Drive, QR verifikasi keaslian."
             :jalur="['Pengasuhan &amp; Kedisiplinan','Template & Arsip Surat']">
      <template #aksi><button class="btn secondary" @click="$emit('pindah','sp-bap')">⚖️ Terbitkan SP Baru</button></template>
    </sa-page>

    <div class="tabs">
      <button class="tab" :class="{active: tab==='arsip'}" @click="pilihTab('arsip')">🗂 Arsip Surat Terbit</button>
      <button class="tab" v-if="isSA" :class="{active: tab==='template'}" @click="pilihTab('template')">📄 Template Google Docs</button>
    </div>

    <template v-if="tab==='arsip'">
      <div class="card">
        <div class="filters">
          <input class="input flex-1" v-model="cari" placeholder="🔍 Cari nama, nomor surat, atau kode verifikasi…">
          <button class="btn sm secondary" @click="segarkan(muat)">↻ Segarkan</button>
        </div>
        <sa-loading v-if="memuat"></sa-loading>
        <div class="table-wrap" v-else-if="dokTersaring.length">
          <table class="tbl">
            <thead><tr><th>Surat</th><th>Mahasiswa</th><th>Kode Verifikasi</th><th>Terbit</th><th>Status</th><th></th></tr></thead>
            <tbody><tr v-for="d in dokTersaring" :key="d.DokumenID">
              <td><b class="fs-sm">{{ d.Judul }}</b><div class="mono fs-xs txt-3">{{ d.Nomor }}</div></td>
              <td class="fs-sm">{{ d.NamaLengkap }}<div class="fs-xs txt-3">{{ d.RefID }}</div></td>
              <td class="mono fs-sm">{{ d.KodeVerifikasi }} <button class="icon-btn" title="Salin tautan verifikasi" @click="salinLink(d)">🔗</button></td>
              <td class="fs-xs">{{ tanggal(d.DibuatPada,'jam') }}</td>
              <td><span class="badge" :class="d.Status === 'TERBIT' ? 'ok' : (d.Status === 'BATAL' ? 'danger' : 'warn')">{{ d.Status }}</span></td>
              <td><div class="flex gap-sm"><button class="btn xs" @click="unduh(d)">⬇ PDF</button>
                <button class="btn xs ghost" v-if="isSA && d.Status === 'TERBIT'" @click="batal(d)">Batalkan</button></div></td>
            </tr></tbody>
          </table>
        </div>
        <sa-empty v-else judul="Belum ada surat terbit" pesan="Terbitkan SP dari menu Penerbitan SP & BAP, lalu klik “Cetak PDF Surat”." ikon="🗂"></sa-empty>
      </div>
    </template>

    <template v-if="tab==='template'">
      <sa-loading v-if="memuatTpl"></sa-loading>
      <template v-else-if="tpl">
        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">Template Aktif</div>
            <div class="card-sub">Template aktif pertama dipakai otomatis saat mencetak SP. Edit kop &amp; isi langsung di Google Docs.</div></div>
            <div class="btn-row"><button class="btn sm secondary" :disabled="proses" @click="buatContoh"><span v-if="proses" class="spin dark"></span>✨ Buat Template Contoh</button>
              <button class="btn sm" @click="baru">＋ Tambah dari Google Docs</button></div></div>
          <div class="table-wrap" v-if="tpl.rows.length">
            <table class="tbl"><thead><tr><th>Template</th><th>Penanda tangan</th><th>Spesimen TTD</th><th>Status</th><th></th></tr></thead>
              <tbody><tr v-for="t in tpl.rows" :key="t.TemplateID">
                <td><b class="fs-sm">{{ t.Nama }}</b><div class="fs-xs txt-3">{{ t.Jenis }} · {{ t.skema.length }} placeholder · <a :href="t.urlDoc" target="_blank" rel="noopener">buka Google Docs ↗</a></div></td>
                <td class="fs-sm">{{ t.TtdNama || '—' }}<div class="fs-xs txt-3">{{ t.TtdJabatan }} · {{ t.Kota }}</div></td>
                <td class="fs-sm">
                  <span v-if="t.adaTtd" class="badge ok plain">✓ gambar TTD</span><span v-else class="badge plain">ruang TTD basah</span>
                  <div class="flex gap-sm mt-sm">
                    <label class="btn xs secondary" style="cursor:pointer"><span v-if="prosesTtd === t.TemplateID" class="spin dark"></span>⬆ Unggah<input type="file" class="hide" accept="image/png,image/jpeg,image/gif" @change="unggahTtd(t, $event)"></label>
                    <button v-if="t.adaTtd" class="btn xs ghost" @click="hapusTtd(t)">Hapus</button></div></td>
                <td><span class="badge" :class="t.Status === 'Aktif' ? 'ok' : ''">{{ t.Status }}</span></td>
                <td><button class="btn xs secondary" @click="sunting(t)">Ubah</button></td>
              </tr></tbody></table>
          </div>
          <sa-empty v-else judul="Belum ada template" pesan="Klik “Buat Template Contoh” untuk mulai dalam 10 detik." ikon="📄"></sa-empty>
        </div>
        <div class="card">
          <div class="card-head"><div class="t"><div class="card-title">Daftar Placeholder</div>
            <div class="card-sub">Tulis di Google Docs persis seperti ini. Modifier opsional: <code>{{ '{' + '{NAMA|upper}' + '}' }}</code>, <code>|title</code>, <code>|tgl</code>.</div></div></div>
          <div class="grid grid-3 gap-sm">
            <div v-for="k in tpl.kunci" :key="k.kunci" class="fs-sm"><code>{{ '{' + '{' + k.kunci + '}' + '}' }}</code> <span class="txt-3">{{ k.ket }}</span></div>
          </div>
        </div>
      </template>
    </template>

    <sa-modal v-if="form" :judul="form.TemplateID ? 'Ubah Template' : 'Tambah Template dari Google Docs'" ikon="📄" @tutup="form = null">
      <div class="field"><label class="label">URL / ID Google Docs <span class="req">*</span></label>
        <div class="flex gap-sm"><input class="input flex-1" v-model.trim="form.doc" placeholder="https://docs.google.com/document/d/…/edit">
          <button class="btn sm secondary" :disabled="proses || !form.doc" @click="pindai">🔍 Pindai</button></div>
        <div class="hint">Dokumen harus bisa diedit oleh akun Google pemilik Apps Script.</div></div>
      <div class="info-box mb-md" v-if="scan" style="display:block">
        <b>{{ scan.nama }}</b> — {{ scan.kunci.length }} placeholder ditemukan:
        <div class="fs-xs mt-sm"><code v-for="k in scan.kunci" :key="k.kunci" style="margin-right:6px">{{ k.kunci }}</code></div>
        <div class="fs-xs mt-sm" style="color:#B45309" v-if="scan.tidakDikenal.length">Tidak dikenal (akan kosong): {{ scan.tidakDikenal.join(', ') }}</div>
      </div>
      <div class="grid grid-2 gap-md">
        <div class="field"><label class="label">Nama template <span class="req">*</span></label><input class="input" v-model="form.Nama"></div>
        <div class="field"><label class="label">Jenis</label><select class="select" v-model="form.Jenis"><option>SP</option><option>BAP</option></select></div>
        <div class="field"><label class="label">Nama penanda tangan</label><input class="input" v-model="form.TtdNama"></div>
        <div class="field"><label class="label">Jabatan</label><input class="input" v-model="form.TtdJabatan"></div>
        <div class="field"><label class="label">Kota</label><input class="input" v-model="form.Kota"></div>
        <div class="field"><label class="label">Status</label><select class="select" v-model="form.Status"><option>Aktif</option><option>Nonaktif</option></select></div>
      </div>
      <template #aksi>
        <button class="btn secondary" @click="form = null">Batal</button>
        <button class="btn" :disabled="proses" @click="simpan"><span v-if="proses" class="spin"></span>Simpan Template</button>
      </template>
    </sa-modal>
  </div>`
};

/* =========================================================================
 * VERIFIKASI SURAT — publik (dibuka dari QR pada surat)
 * ======================================================================= */
window.VIEWS['verifikasi'] = {
  props: ['kode'],
  emits: ['tutup', 'pindah'],
  data: function () { return { input: '', hasil: null, memuat: false }; },
  mounted: function () { this.input = this.kode || ''; if (this.input) this.cek(); },
  methods: {
    cek: async function () {
      if (!this.input) return;
      this.memuat = true; this.hasil = null;
      var res = await callApi('doc.verify', { kode: this.input }, { diam: true });
      this.memuat = false;
      this.hasil = res;
    }
  },
  template: `
  <div class="cekdok-wrap">
    <div class="cekdok-card">
      <div class="fs-xs txt-3 mb-sm">{{ CONFIG.NAMA_INSTITUSI }} · Verifikasi Dokumen</div>
      <template v-if="memuat"><div class="spin dark" style="margin:30px auto"></div><p class="txt-2">Memeriksa keaslian dokumen…</p></template>
      <template v-else-if="hasil && hasil.ok && hasil.data.ditemukan">
        <div class="cekdok-ikon">{{ hasil.data.sah ? '✅' : '⛔' }}</div>
        <h2 style="margin:4px 0 6px">{{ hasil.data.sah ? 'Dokumen SAH' : 'Dokumen ' + hasil.data.status }}</h2>
        <p class="txt-2 fs-sm">{{ hasil.message }}</p>
        <div style="text-align:left" class="mt-md">
          <sa-kv k="Jenis" :v="hasil.data.judul"></sa-kv>
          <sa-kv k="Nomor" :v="hasil.data.nomor"></sa-kv>
          <sa-kv k="Atas nama" :v="hasil.data.nama"></sa-kv>
          <sa-kv k="NIM" :v="hasil.data.nim || '-'"></sa-kv>
          <sa-kv k="Tanggal" :v="hasil.data.tanggal"></sa-kv>
          <sa-kv k="Penerbit" :v="hasil.data.institusi"></sa-kv>
          <sa-kv k="Penanda tangan" :v="(hasil.data.penandatangan || '-') + (hasil.data.jabatan ? ' · ' + hasil.data.jabatan : '')"></sa-kv>
          <sa-kv k="Sidik dokumen" :v="hasil.data.hash"></sa-kv>
        </div>
      </template>
      <template v-else-if="hasil">
        <div class="cekdok-ikon">❌</div>
        <h2 style="margin:4px 0 6px">Tidak Terdaftar</h2>
        <p class="txt-2 fs-sm">{{ (hasil.data && hasil.message) || hasil.error || 'Kode verifikasi tidak ditemukan.' }}</p>
      </template>
      <template v-else><div class="cekdok-ikon">🔎</div><h2 style="margin:4px 0 6px">Cek Keaslian Surat</h2></template>
      <form class="flex gap-sm mt-lg" @submit.prevent="cek">
        <input class="input flex-1" v-model.trim="input" placeholder="Kode verifikasi (10 karakter)" style="text-transform:uppercase">
        <button class="btn">Cek</button>
      </form>
      <button class="btn ghost sm mt-md" @click="$emit('tutup')">← Kembali ke aplikasi</button>
    </div>
  </div>`
};
