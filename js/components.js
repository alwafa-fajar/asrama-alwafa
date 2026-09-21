/* ==========================================================================
 * SIM ASRAMA v6.0 — KOMPONEN BERSAMA (Vue 3, Options API)
 * Didaftarkan global di app.js: <sa-kpi>, <sa-badge>, <sa-modal>, dll.
 * ========================================================================== */

window.KOMPONEN = {

  /* KPI card — ikon, angka besar, label, tren (PRD §15.3) */
  'sa-kpi': {
    props: {
      label: String, nilai: [String, Number], satuan: String, ikon: { type: String, default: '📊' },
      warna: { type: String, default: '' }, catatan: String, tren: String, trenArah: String,
      persen: Number, persenWarna: String
    },
    template: `
      <div class="kpi">
        <div class="kpi-top">
          <div>
            <div class="kpi-label">{{ label }}</div>
            <div class="kpi-value">{{ nilai }}<small v-if="satuan">{{ satuan }}</small></div>
          </div>
          <div class="kpi-icon" :class="warna">{{ ikon }}</div>
        </div>
        <div v-if="persen !== undefined && persen !== null" class="progress">
          <div class="bar" :class="persenWarna" :style="{width: Math.min(100, persen) + '%'}"></div>
        </div>
        <div class="kpi-foot">
          <span v-if="catatan">{{ catatan }}</span>
          <span v-if="tren" class="trend" :class="trenArah || 'up'">{{ tren }}</span>
        </div>
      </div>`
  },

  /* Badge status otomatis berwarna sesuai teksnya */
  'sa-badge': {
    props: { teks: [String, Number], tipe: String },
    computed: { kelas: function () { return this.tipe || kelasStatus(this.teks); } },
    template: `<span class="badge" :class="kelas">{{ teks }}</span>`
  },

  /* Avatar foto / inisial */
  'sa-avatar': {
    props: { nama: String, foto: String, ukuran: String },
    template: `
      <span class="avatar" :class="ukuran">
        <img v-if="foto" :src="foto" :alt="nama" style="width:100%;height:100%;object-fit:cover">
        <template v-else>{{ ini }}</template>
      </span>`,
    computed: { ini: function () { return inisial(this.nama); } }
  },

  /* Modal dengan slot judul/isi/aksi */
  'sa-modal': {
    props: { judul: String, sub: String, ikon: { type: String, default: '📋' }, lebar: String },
    emits: ['tutup'],
    template: `
      <div class="overlay" @click.self="$emit('tutup')">
        <div class="modal" :class="lebar">
          <div class="modal-head">
            <div class="ic">{{ ikon }}</div>
            <div class="t" style="flex:1">
              <div class="card-title">{{ judul }}</div>
              <div class="card-sub" v-if="sub">{{ sub }}</div>
            </div>
            <button class="x" @click="$emit('tutup')" aria-label="Tutup">✕</button>
          </div>
          <div class="modal-body"><slot></slot></div>
          <div class="modal-foot" v-if="$slots.aksi"><slot name="aksi"></slot></div>
        </div>
      </div>`
  },

  /* Keadaan kosong */
  'sa-empty': {
    props: { judul: { type: String, default: 'Belum ada data' }, pesan: String, ikon: { type: String, default: '📭' } },
    template: `
      <div class="empty">
        <div class="ic">{{ ikon }}</div>
        <h4>{{ judul }}</h4>
        <p class="fs-sm" v-if="pesan">{{ pesan }}</p>
        <div class="mt-md"><slot></slot></div>
      </div>`
  },

  /* Pemuatan */
  'sa-loading': {
    props: { teks: { type: String, default: 'Memuat data…' } },
    template: `
      <div class="empty">
        <span class="spin dark"></span>
        <p class="fs-sm mt-sm">{{ teks }}</p>
      </div>`
  },

  /* Kepala halaman + breadcrumb */
  'sa-page': {
    props: { judul: String, sub: String, jalur: Array },
    template: `
      <div class="page-head">
        <div class="txt">
          <div class="breadcrumb" v-if="jalur && jalur.length">
            <template v-for="(j,i) in jalur" :key="i">
              <span v-if="i < jalur.length-1">{{ j }} › </span><b v-else>{{ j }}</b>
            </template>
          </div>
          <h1 class="page-title">{{ judul }}</h1>
          <p class="page-sub" v-if="sub">{{ sub }}</p>
        </div>
        <div class="page-actions"><slot name="aksi"></slot></div>
      </div>`
  },

  /* Baris ringkas label → nilai */
  'sa-kv': {
    props: { k: String, v: [String, Number] },
    template: `<div class="kv"><span>{{ k }}</span><b>{{ v }}</b></div>`
  },

  /* Bar progres dengan label persen */
  'sa-progress': {
    props: { nilai: Number, warna: String, label: String },
    template: `
      <div>
        <div class="flex justify-between fs-xs txt-2" v-if="label" style="margin-bottom:4px">
          <span>{{ label }}</span><b class="num">{{ (nilai||0).toFixed ? nilai.toFixed(1) : nilai }}%</b>
        </div>
        <div class="progress"><div class="bar" :class="warna" :style="{width: Math.min(100, nilai||0) + '%'}"></div></div>
      </div>`
  }
};
