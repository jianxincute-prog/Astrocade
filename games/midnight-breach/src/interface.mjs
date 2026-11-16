import { ARCHIVE, ARCHIVE_FILTERS, CONTACTS, NOTES, THREADS, isMidnightOnly } from './story.mjs';
import { DEFAULT_APP_ORDER, clockAt, moveApp, normalizeAppOrder } from './logic.mjs';

const APPS = [
  { id: 'messages', label: 'Pesan', glyph: '✉', tone: 'messages' },
  { id: 'photos', label: 'Foto', glyph: '◈', tone: 'photos' },
  { id: 'contacts', label: 'Kontak', glyph: '◉', tone: 'contacts' },
  { id: 'notes', label: 'Catatan', glyph: '▤', tone: 'notes' },
  { id: 'phone', label: 'Telepon', glyph: '⌕', tone: 'phone' },
  { id: 'after', label: 'AFTER', glyph: 'A', tone: 'after' },
];
const NORMAL_PHOTOS = [
  { id: 'rain', title: 'Jendela hujan', scene: 'rain', time: 'Hari ini, 18:12' },
  { id: 'coffee', title: 'Kopi yang terlupa', scene: 'coffee', time: 'Hari ini, 15:33' },
  { id: 'room', title: 'Lampu kamar', scene: 'room', time: 'Kemarin, 23:10' },
];
// Scene key -> asset_map id. Every AFTER secret has its own evidence photo.
const SCENE_ASSETS = {
  rain: 'photo_rain', coffee: 'photo_coffee', room: 'photo_room',
  aib_rani: 'aib_rani', aib_dimas: 'aib_dimas', aib_laras: 'aib_laras', aib_hendra: 'aib_hendra',
  aib_wati: 'aib_wati', aib_darto: 'aib_darto', aib_nara: 'aib_nara', aib_bima: 'aib_bima', aib_jessa: 'aib_jessa',
  hall: 'entity_hallway', eye: 'entity_sky', corridor: 'entity_corridor',
};
const SCENE_FILE = { rain: 4812, coffee: 4790, room: 4733, hall: 7, eye: 8, corridor: 9 };
const FULL_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const byId = (list, id) => list.find(item => item.id === id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function durationFromConfig() {
  return Math.min(150, Math.max(45, Number(window.gameConfig?.settings?.midnightSeconds) || 80));
}
function safeLog(message) { try { window.lib?.log?.(message); } catch (_) {} }
function registerParameters() {
  if (!window.lib?.showGameParameters) return;
  try {
    window.lib.showGameParameters({
      name: 'Midnight Breach',
      params: {
        'Durasi menuju tengah malam': { key: 'settings.midnightSeconds', type: 'slider', min: 45, max: 150, step: 15 },
        'Intensitas glitch': { key: 'settings.glitchIntensity', type: 'slider', min: 1, max: 5, step: 1 },
        'Nama pemilik ponsel': { key: 'settings.ownerName', type: 'string' },
      },
    });
  } catch (_) { /* Settings are optional in hosts that do not render the creator panel. */ }
}

function assetUrl(id) {
  if (!id) return '';
  try { return window.lib?.getAsset?.(id)?.url || ''; } catch (_) { return ''; }
}
// Warm the browser cache so photos appear instantly when apps open.
function preloadPhotos() {
  const ids = [...Object.values(SCENE_ASSETS), ...CONTACTS.map(person => `portrait_${person.id}`)];
  for (const id of ids) {
    const url = assetUrl(id);
    if (url) { const img = new Image(); img.decoding = 'async'; img.src = url; }
  }
}
function sceneImage(scene, large = false, label = '') {
  const url = assetUrl(SCENE_ASSETS[scene]);
  const image = url ? `<img class="scene-photo" src="${esc(url)}" alt="" loading="eager" decoding="async">` : '';
  const fileNo = String(SCENE_FILE[scene] ?? (2000 + Object.keys(SCENE_ASSETS).indexOf(scene) * 37)).padStart(4, '0');
  const fullButton = large && url ? `<button class="photo-full-btn" data-action="photo-full" data-scene="${esc(scene)}" data-label="${esc(label)}" aria-label="Lihat foto penuh">${FULL_ICON}</button>` : '';
  return `<div class="scene-image scene-${esc(scene)}${large ? ' scene-large' : ''}${url ? ' has-photo' : ''}" role="img" aria-label="${esc(label)}">${image}<div class="scene-visual"><i class="shape shape-main"></i><i class="shape shape-extra"></i><i class="shape shape-third"></i></div><div class="scene-noise"></div><div class="scene-date">IMG_${fileNo}.HEIC</div>${fullButton}</div>`;
}
// Full-screen photo viewer: the photo uncropped (contain) over a dark backdrop.
function viewerMarkup(scene, label) {
  const url = assetUrl(SCENE_ASSETS[scene]);
  if (!url) return '';
  return `<div class="photo-viewer" data-action="viewer-close" role="dialog" aria-label="${esc(label || 'Foto')}"><div class="viewer-top"><span>${esc(label)}</span><button class="viewer-close" data-action="viewer-close" aria-label="Tutup">✕</button></div><img class="viewer-photo" src="${esc(url)}" alt="${esc(label)}" decoding="async"><div class="viewer-hint">Ketuk di mana saja untuk menutup</div></div>`;
}
function appIcon(app, editing = false) {
  const statusDot = app.id === 'after' ? '<i class="app-dot"></i>' : '';
  return `<button class="app-icon ${editing ? 'is-editing' : ''}" data-app="${app.id}" aria-label="Buka ${app.label}"><span class="app-glyph glyph-${app.tone}">${app.glyph}${statusDot}</span><span class="app-name">${app.label}</span></button>`;
}
function avatar(person) {
  const url = person.id === 'unknown' ? '' : assetUrl(`portrait_${person.id}`);
  return `<span class="avatar avatar-${esc(person.tint)}">${url ? `<img src="${esc(url)}" alt="" decoding="async">` : esc(person.initials)}</span>`;
}
function appHeader(title, subtitle = '') {
  return `<header class="app-header"><button class="back-button" data-action="back" aria-label="Kembali">‹</button><div class="app-header-titles"><strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div><span class="header-mark">•••</span></header>`;
}
function storyCard(item, locked = false) {
  return `<button class="archive-card ${isMidnightOnly(item) ? 'is-unknown' : ''} ${locked ? 'is-locked' : ''}" data-action="${locked ? 'archive-locked' : 'archive-open'}" data-id="${esc(item.id)}">
    <div class="archive-thumb">${sceneImage(item.scene, false, locked ? 'Berkas terkunci' : item.name)}${locked ? '<span class="thumb-lock">⌑</span>' : ''}</div>
    <div class="archive-copy"><div class="archive-kicker">${esc(item.category)} <span>${locked ? '00:00' : esc(item.time)}</span></div><strong>${locked ? 'Berkas terkunci' : esc(item.name)}</strong><small>${locked ? 'Terbuka tepat tengah malam' : esc(item.person)}</small></div><span class="row-chevron">${locked ? '⌑' : '›'}</span>
  </button>`;
}
function countdownText(seconds) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}<small>:</small>${String(s % 60).padStart(2, '0')}`;
}

export function mountGame(mode) {
  window.__midnightBreachCleanup?.();
  const root = document.getElementById('app');
  if (!root) return;
  const isEditor = mode === 'edit';
  registerParameters();
  preloadPhotos();
  const initialOrder = normalizeAppOrder(window.gameConfig?.appOrder ?? DEFAULT_APP_ORDER);
  const state = {
    app: null,
    detail: null,
    filter: 'SEMUA',
    eventOverlay: false,
    unlocked: false,
    appOrder: initialOrder,
    dialCode: '',
    toastTimer: null,
    drag: null,
    lastSecond: -1,
    full: null,
  };
  const startedAt = Date.now();
  const elapsed = () => Math.max(0, Date.now() - startedAt);
  const clock = () => clockAt(elapsed(), durationFromConfig());

  root.innerHTML = `<div class="phone-shell ${isEditor ? 'editor-mode' : ''}">
    <div class="screen">
      <div class="wallpaper"><div class="wallpaper-orb orb-a"></div><div class="wallpaper-orb orb-b"></div><div class="wallpaper-grain"></div></div>
      <div class="status-bar"><span class="status-time" id="status-time">11:48</span><span class="status-icons"><i class="signal-icon">▂▅▇</i><i class="wifi-icon">⌁</i><i class="battery"><b></b></i></span></div>
      <main class="main-view" id="main-view"></main>
      <div class="event-host" id="event-host"></div>
      <div class="viewer-host" id="viewer-host"></div>
      <button class="home-indicator" data-action="home" aria-label="Layar utama"><span></span></button>
    </div>
  </div>`;

  const render = () => {
    const main = root.querySelector('#main-view');
    if (!main) return;
    main.innerHTML = state.app ? appView() : homeView();
    const now = clock();
    const status = root.querySelector('#status-time');
    if (status) status.textContent = now.display;
    const eventHost = root.querySelector('#event-host');
    if (eventHost) eventHost.innerHTML = state.eventOverlay && !isEditor ? eventView() : '';
    const phone = root.querySelector('.phone-shell');
    if (phone) {
      phone.classList.toggle('midnight', state.unlocked && !isEditor);
      const intensity = Math.min(5, Math.max(1, Number(window.gameConfig?.settings?.glitchIntensity) || 3));
      phone.style.setProperty('--glitch-intensity', String(intensity));
    }
  };

  function homeView() {
    const apps = state.appOrder.map(id => APPS.find(app => app.id === id)).filter(Boolean);
    const owner = window.gameConfig?.settings?.ownerName || 'Pemilik perangkat';
    const secretCount = ARCHIVE.filter(item => !isMidnightOnly(item)).length;
    return `<section class="home-page">
      ${isEditor ? '<div class="edit-ribbon"><span class="edit-pip"></span> EDITOR <span>Tarik ikon untuk menyusun</span></div>' : ''}
      <div class="home-date" id="home-date">${clock().isMidnight ? 'SABTU, 15 JUNI <span>•</span> DINI HARI' : 'JUMAT, 14 JUNI <span>•</span> MALAM'}</div>
      <div class="home-clock" id="home-clock">${clock().display}</div>
      <div class="clock-subline"><span id="home-period">${clock().hour24 === 0 ? 'AM' : 'PM'}</span><i></i> <span>LANGIT CERAH, HENING</span></div>
      <button class="mystery-notice" data-action="open-app" data-id="after">
        <span class="notice-mark">✦</span><span class="notice-copy"><strong>AFTER: ${secretCount} rahasia ditemukan</strong><small>Teman · keluarga · tetangga · artis</small></span><span class="notice-time">23:47</span>
      </button>
      <div class="apps-grid ${isEditor ? 'edit-grid' : ''}">${apps.map(app => appIcon(app, isEditor)).join('')}</div>
      <div class="home-widget"><div class="widget-top"><span class="widget-label">${esc(owner)}</span><span class="widget-battery"><i></i> 87%</span></div><div class="widget-bottom"><span class="widget-signal"><i>◒</i> Tidak ada jaringan</span><span class="widget-lock">⌑ &nbsp;Perangkat terkunci</span></div></div>
      ${isEditor ? '<div class="editor-hint">Posisi ikon disimpan ke konfigurasi game.</div>' : '<div class="home-footnote">JAM BERJALAN LEBIH CEPAT</div>'}
    </section>`;
  }

  function appView() {
    if (state.app === 'messages') return messagesView();
    if (state.app === 'contacts') return contactsView();
    if (state.app === 'photos') return photosView();
    if (state.app === 'notes') return notesView();
    if (state.app === 'after') return afterView();
    if (state.app === 'phone') return phoneView();
    return homeView();
  }

  function messagesView() {
    if (state.detail) {
      const thread = byId(THREADS, state.detail);
      if (!thread) return '';
      return `<section class="app-screen messages-screen">${appHeader(thread.name, 'Pesan terenkripsi')}<div class="conversation-content"><div class="conversation-day">HARI INI</div>${thread.messages.map(([side, text]) => `<div class="message-row ${side}"><p>${esc(text)}</p></div>`).join('')}<div class="message-input"><span>iMessage</span><i>＋</i></div></div></section>`;
    }
    return `<section class="app-screen">${appHeader('Pesan', `${THREADS.length} percakapan`)}<div class="app-scroll thread-list">${THREADS.map(thread => `<button class="thread-row" data-action="thread-open" data-id="${thread.id}">${avatar(thread)}<span class="thread-copy"><strong>${esc(thread.name)}</strong><small>${esc(thread.preview)}</small></span><span class="thread-meta">${thread.time}<b>›</b></span></button>`).join('')}</div><div class="screen-tab"><span class="tab-selected">◉</span><span>Kontak</span><span>Filter</span></div></section>`;
  }

  function contactsView() {
    if (state.detail) {
      const person = byId(CONTACTS, state.detail);
      if (!person) return '';
      const index = CONTACTS.indexOf(person);
      const secret = ARCHIVE.find(item => item.id === `${person.id}-file`);
      return `<section class="app-screen">${appHeader('Kontak', person.label)}<div class="contact-detail">${avatar(person)}<h2>${esc(person.name)}</h2><span class="contact-status"><i></i>${esc(person.status)}</span><div class="contact-actions"><button data-action="contact-message" data-id="${person.id}"><b>✉</b>Pesan</button><button data-action="toast" data-message="Panggilan tidak tersedia"><b>⌕</b>Telepon</button></div><div class="contact-info"><span>INFORMASI</span><div><small>Nomor ponsel</small><strong>+62 812 ···· ${String(1903 + index * 731).slice(-4)}</strong></div><div><small>Catatan</small><strong>${person.label.includes('bisnis') ? 'Kontak bisnis' : 'Disimpan di perangkat ini'}</strong></div>${secret ? `<button class="contact-secret" data-action="secret-from-contact" data-id="${secret.id}"><small>AFTER</small><strong>1 rahasia ditemukan ›</strong></button>` : ''}</div></div></section>`;
    }
    return `<section class="app-screen">${appHeader('Kontak', `${CONTACTS.length} kontak`)}<div class="app-scroll contact-list"><div class="section-caption">TERBARU</div>${CONTACTS.map(person => `<button class="contact-row" data-action="contact-open" data-id="${person.id}">${avatar(person)}<span><strong>${esc(person.name)}</strong><small>${esc(person.label)}</small></span><i>›</i></button>`).join('')}</div></section>`;
  }

  function photosView() {
    if (state.detail) {
      const file = ARCHIVE.find(entry => entry.id === state.detail);
      const photo = file || NORMAL_PHOTOS.find(entry => entry.id === state.detail);
      if (!photo) return '';
      const heading = file?.name || photo.title;
      return `<section class="app-screen photos-screen">${appHeader('Foto', 'Koleksi pribadi')}<div class="photo-detail">${sceneImage(photo.scene, true, heading)}<div class="photo-detail-copy"><span class="tiny-kicker">${file ? esc(file.label) : esc(photo.time)}</span><h2>${esc(heading)}</h2><p>${file ? esc(file.description) : 'Disimpan di perangkat ini.'}</p>${file ? '<span class="file-warning">Berkas ini tidak tercatat dalam riwayat kamera.</span>' : ''}</div></div></section>`;
    }
    const photos = [...NORMAL_PHOTOS, ...(state.unlocked ? ARCHIVE.filter(isMidnightOnly).map(item => ({ ...item, title: item.name, file: true })) : [])];
    return `<section class="app-screen photos-screen">${appHeader('Foto', `${photos.length} foto`)}<div class="app-scroll photo-scroll"><div class="section-caption">${state.unlocked ? 'BARU SAJA' : 'HARI INI'}</div><div class="photo-grid">${photos.map(photo => `<button class="photo-tile" data-action="photo-open" data-id="${photo.id}">${sceneImage(photo.scene, false, photo.title)}<span>${esc(photo.title)}</span>${photo.file ? '<i class="photo-new-dot"></i>' : ''}</button>`).join('')}</div><div class="album-row"><span>⌑</span><span><strong>Baru-baru ini</strong><small>${photos.length} item</small></span><i>›</i></div></div><div class="screen-tab photo-tab"><span>◈</span><b>Foto</b><span>▧</span><span>⌕</span></div></section>`;
  }

  function notesView() {
    if (state.detail) {
      const note = NOTES[Number(state.detail)];
      if (!note) return '';
      return `<section class="app-screen notes-screen">${appHeader('Catatan', note.date)}<div class="note-detail"><span>${esc(note.date)}</span><h2>${esc(note.title)}</h2><p>${esc(note.body).replace(/\n/g, '<br>')}</p></div></section>`;
    }
    return `<section class="app-screen notes-screen">${appHeader('Catatan', `${NOTES.length} catatan`)}<div class="app-scroll notes-list">${NOTES.map((note, index) => `<button class="note-row" data-action="note-open" data-id="${index}"><span class="note-icon">▤</span><span><strong>${esc(note.title)}</strong><small>${esc(note.body.split('\n')[0])}</small><i>${esc(note.date)}</i></span><b>›</b></button>`).join('')}</div><div class="note-add">＋</div></section>`;
  }

  // AFTER opens any time: gossip files (friends, family, neighbours, fictional celebrities)
  // are readable before midnight; only the unknown-source files wait for 00:00.
  function afterView() {
    if (state.detail) {
      const entry = ARCHIVE.find(item => item.id === state.detail);
      if (!entry) return '';
      const unknown = isMidnightOnly(entry);
      return `<section class="app-screen archive-screen">${appHeader('AFTER', unknown ? 'Berkas terpulihkan' : 'Rahasia terungkap')}
        <div class="archive-detail app-scroll">${sceneImage(entry.scene, true, entry.name)}<div class="detail-meta"><span>${esc(entry.category)} <i>${esc(entry.time)}</i></span><h2>${esc(entry.name)}</h2><small>${esc(entry.person)}</small><p>${esc(entry.description)}</p><div class="metadata"><span>STATUS</span><strong>${esc(entry.label)}</strong><span>ASAL BERKAS</span><strong>${unknown ? 'Tidak ada di indeks perangkat' : 'Disalin diam-diam dari ponsel ' + esc(entry.person.split(' · ')[0])}</strong></div>${unknown ? '<div class="detail-footnote">Beberapa garis di foto ini tidak mungkin dibuat oleh lensa ponsel.</div>' : '<div class="detail-footnote">Semua tokoh dan kejadian dalam arsip ini fiktif.</div>'}</div></div></section>`;
    }
    const groups = state.filter === 'SEMUA' ? ARCHIVE : ARCHIVE.filter(item => item.category === state.filter);
    const open = ARCHIVE.filter(item => state.unlocked || !isMidnightOnly(item)).length;
    const banner = state.unlocked
      ? '<div class="archive-top"><div class="unlocked-badge"><i></i> ARSIP TERBUKA PENUH</div><span>00:00 — SUMBER: ?</span></div>'
      : `<div class="archive-top archive-top-pending"><div class="unlocked-badge"><i></i> ${open} RAHASIA TERBUKA</div><span class="mini-countdown">BERKAS ASING <b id="countdown">${countdownText(clock().secondsLeft)}</b></span></div>`;
    return `<section class="app-screen archive-screen unlocked-archive">${appHeader('AFTER', `${open} dari ${ARCHIVE.length} berkas`)}${banner}<div class="archive-filters">${ARCHIVE_FILTERS.map(filter => `<button class="filter-chip ${state.filter === filter ? 'selected' : ''}" data-action="filter" data-id="${filter}">${filter}</button>`).join('')}</div><div class="app-scroll archive-list">${groups.map(item => storyCard(item, !state.unlocked && isMidnightOnly(item))).join('')}${groups.length === 0 ? '<div class="empty-state">Tidak ada berkas di folder ini.</div>' : ''}<div class="archive-endmark">— AKHIR HASIL PEMINDAIAN —</div></div></section>`;
  }

  function phoneView() {
    return `<section class="app-screen dialer-screen">${appHeader('Telepon', 'Papan tombol')}<div class="dialer-display"><span>${state.dialCode ? esc(state.dialCode) : 'Masukkan nomor'}</span>${state.dialCode ? '<button data-action="dial-back">⌫</button>' : ''}</div><div class="dial-pad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit, index) => `<button data-action="dial" data-id="${digit}"><strong>${digit}</strong><small>${['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ','','+',''][index]}</small></button>`).join('')}</div><button class="dial-call" data-action="toast" data-message="Tidak ada layanan.">⌕</button></section>`;
  }

  function eventView() {
    const entry = ARCHIVE.find(item => item.id === 'breach-01');
    return `<div class="midnight-flash"><div class="event-card"><div class="event-topline"><span><i></i> BERKAS MASUK</span><span>00:00</span></div>${sceneImage(entry.scene, true, 'Siluet asing di balik kaca')}<div class="event-copy"><span class="tiny-kicker">SUMBER TIDAK DIKENAL</span><h2>${esc(entry.name)}</h2><p>Foto baru tersimpan. Kamera tidak sedang digunakan.</p></div><div class="event-actions"><button class="event-open" data-action="event-open">LIHAT BERKAS <span>↗</span></button><button class="event-close" data-action="event-close">ABAIKAN</button></div><div class="event-glitch">00:00&nbsp; 00:00&nbsp; 00:00&nbsp; 00:00</div></div></div>`;
  }

  // Only the viewer layer re-renders, so the page underneath keeps its scroll position.
  function renderViewer() {
    const host = root.querySelector('#viewer-host');
    if (host) host.innerHTML = state.full ? viewerMarkup(state.full.scene, state.full.label) : '';
  }
  function showToast(text) {
    let toast = root.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      root.querySelector('.screen')?.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast?.classList.remove('show'), 1900);
  }
  function goHome() {
    state.app = null;
    state.detail = null;
    state.eventOverlay = false;
    render();
  }
  function openApp(id) {
    state.app = id;
    state.detail = null;
    state.filter = 'SEMUA';
    render();
  }
  function handleClick(event) {
    const target = event.target.closest('[data-action], [data-app]');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-app')) {
      if (isEditor) { showToast('Tarik ikon untuk menyusun layar.'); return; }
      openApp(target.dataset.app);
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'photo-full') {
      event.stopPropagation();
      state.full = { scene: target.dataset.scene, label: target.dataset.label || '' };
      try { window.lib?.haptics?.play('tick'); } catch (_) {}
      renderViewer();
      return;
    }
    if (action === 'viewer-close') { state.full = null; renderViewer(); return; }
    if (action === 'home') goHome();
    else if (action === 'open-app') {
      if (isEditor) { showToast('Pindahkan ikon untuk mengatur layar.'); return; }
      openApp(id);
    }
    else if (action === 'back') {
      if (state.detail) { state.detail = null; render(); }
      else goHome();
    }
    else if (['thread-open', 'contact-open', 'photo-open', 'note-open', 'archive-open'].includes(action)) {
      state.detail = id;
      if (action === 'archive-open') { try { window.lib?.haptics?.play('tap'); } catch (_) {} }
      render();
    }
    else if (action === 'archive-locked') {
      try { window.lib?.haptics?.play('error'); } catch (_) {}
      showToast('Berkas ini hanya terbuka tepat pukul 00:00.');
    }
    else if (action === 'contact-message') {
      state.app = 'messages';
      state.detail = byId(THREADS, id) ? id : 'unknown';
      render();
    }
    else if (action === 'secret-from-contact') { state.app = 'after'; state.filter = 'SEMUA'; state.detail = id; render(); }
    else if (action === 'filter') { state.filter = id; render(); }
    else if (action === 'event-open') { state.eventOverlay = false; state.app = 'after'; state.detail = 'breach-01'; render(); }
    else if (action === 'event-close') { state.eventOverlay = false; render(); }
    else if (action === 'dial') { state.dialCode = (state.dialCode + id).slice(0, 16); render(); }
    else if (action === 'dial-back') { state.dialCode = state.dialCode.slice(0, -1); render(); }
    else if (action === 'toast') showToast(target.dataset.message || 'Tidak tersedia.');
  }

  root.onclick = handleClick;
  root.onpointerdown = event => {
    if (!isEditor) return;
    const icon = event.target.closest('.app-icon[data-app]');
    if (icon) state.drag = { id: icon.dataset.app, x: event.clientX, y: event.clientY, moved: false };
  };
  root.onpointermove = event => {
    if (!state.drag || !isEditor) return;
    if (Math.hypot(event.clientX - state.drag.x, event.clientY - state.drag.y) > 12) state.drag.moved = true;
  };
  root.onpointerup = event => {
    if (!state.drag || !isEditor) return;
    const drag = state.drag;
    state.drag = null;
    const drop = event.target.closest?.('.app-icon[data-app]');
    if (!drag.moved || !drop) return;
    const next = moveApp(state.appOrder, drag.id, drop.dataset.app);
    if (next.join('|') === state.appOrder.join('|')) return;
    state.appOrder = next;
    window.gameConfig ||= {};
    window.gameConfig.appOrder = [...next];
    showToast('Tata letak disimpan.');
    render();
  };
  root.onpointercancel = () => { state.drag = null; };
  const onKey = event => { if (event.key === 'Escape' && state.full) { state.full = null; renderViewer(); } };
  window.addEventListener('keydown', onKey);
  window.__midnightBreachCleanup = () => {
    window.removeEventListener('keydown', onKey);
    clearInterval(timerId);
    clearTimeout(state.toastTimer);
    root.onclick = root.onpointerdown = root.onpointermove = root.onpointerup = root.onpointercancel = null;
  };

  function tick() {
    if (isEditor) return;
    const now = clock();
    const currentSecond = Math.floor(Date.now() / 1000);
    if (currentSecond !== state.lastSecond) {
      state.lastSecond = currentSecond;
      const status = root.querySelector('#status-time');
      if (status) status.textContent = now.display;
      const homeClock = root.querySelector('#home-clock');
      if (homeClock) homeClock.textContent = now.display;
      const period = root.querySelector('#home-period');
      if (period) period.textContent = now.hour24 === 0 ? 'AM' : 'PM';
      const homeDate = root.querySelector('#home-date');
      if (homeDate) homeDate.innerHTML = now.isMidnight ? 'SABTU, 15 JUNI <span>•</span> DINI HARI' : 'JUMAT, 14 JUNI <span>•</span> MALAM';
      const countdown = root.querySelector('#countdown');
      if (countdown && !state.unlocked) countdown.innerHTML = countdownText(now.secondsLeft);
    }
    if (now.isMidnight && !state.unlocked) {
      state.unlocked = true;
      state.eventOverlay = true;
      try { window.lib?.haptics?.play('warning'); } catch (_) {}
      safeLog('Midnight Breach: unknown-source files unlocked at 00:00.');
      render();
    }
  }
  render();
  const timerId = isEditor ? null : setInterval(tick, 200);
  safeLog(`Midnight Breach started in ${isEditor ? 'editor' : 'play'} mode.`);
}
