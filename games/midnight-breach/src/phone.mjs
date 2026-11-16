import { ARCHIVE, ARCHIVE_FILTERS, CLUES, CONTACTS, NOTES, THREADS, isMidnightOnly } from './story.mjs';

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
export const SCENE_ASSETS = {
  rain: 'photo_rain', coffee: 'photo_coffee', room: 'photo_room',
  aib_rani: 'aib_rani', aib_dimas: 'aib_dimas', aib_laras: 'aib_laras', aib_hendra: 'aib_hendra',
  aib_wati: 'aib_wati', aib_sari: 'aib_sari', aib_darto: 'aib_darto', aib_nara: 'aib_nara', aib_bima: 'aib_bima', aib_jessa: 'aib_jessa',
  hall: 'entity_hallway', eye: 'entity_sky', corridor: 'entity_corridor', watch: 'entity_watcher',
};
const SCENE_FILE = { rain: 4812, coffee: 4790, room: 4733, hall: 7, eye: 8, corridor: 9, watch: 10 };
const FULL_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const byId = (list, id) => list.find(item => item.id === id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function assetUrl(id) {
  if (!id) return '';
  try { return window.lib?.getAsset?.(id)?.url || ''; } catch (_) { return ''; }
}
export function preloadPhotos() {
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
function viewerMarkup(scene, label) {
  const url = assetUrl(SCENE_ASSETS[scene]);
  if (!url) return '';
  return `<div class="photo-viewer" data-action="viewer-close" role="dialog" aria-label="${esc(label || 'Foto')}"><div class="viewer-top"><span>${esc(label)}</span><button class="viewer-close" data-action="viewer-close" aria-label="Tutup">✕</button></div><img class="viewer-photo" src="${esc(url)}" alt="${esc(label)}" decoding="async"><div class="viewer-hint">Ketuk di mana saja untuk menutup</div></div>`;
}
function appIcon(app, api) {
  const dot = app.id === 'after' && api.hasNewAfter() ? '<i class="app-dot"></i>' : '';
  return `<button class="app-icon" data-app="${app.id}" aria-label="Buka ${app.label}"><span class="app-glyph glyph-${app.tone}">${app.glyph}${dot}</span><span class="app-name">${app.label}</span></button>`;
}
function avatar(person) {
  const url = person.id === 'unknown' ? '' : assetUrl(`portrait_${person.id}`);
  return `<span class="avatar avatar-${esc(person.tint)}">${url ? `<img src="${esc(url)}" alt="" decoding="async">` : esc(person.initials)}</span>`;
}
function appHeader(title, subtitle = '') {
  return `<header class="app-header"><button class="back-button" data-action="back" aria-label="Kembali">‹</button><div class="app-header-titles"><strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div><span class="header-mark">•••</span></header>`;
}
function countdownText(seconds) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}<small>:</small>${String(s % 60).padStart(2, '0')}`;
}

/**
 * Phone overlay. api = {
 *   getClock(): {display, isMidnight, secondsLeft, afterMidnightMinutes},
 *   isRead(id), markRead(id), isFound(clueId), foundClues(): clue[], ownerName(): string,
 *   hasNewAfter(): boolean, onClose(), haptic(name)
 * }
 */
export function createPhone(host, api) {
  const st = { open: false, app: null, detail: null, filter: 'SEMUA', event: false, full: null, dial: '', toastTimer: null };
  host.classList.add('phone-layer');
  host.innerHTML = `<div class="phone-shell"><div class="screen">
    <div class="wallpaper"><div class="wallpaper-orb orb-a"></div><div class="wallpaper-orb orb-b"></div><div class="wallpaper-grain"></div></div>
    <div class="status-bar"><span class="status-time" id="status-time">11:48</span><span class="status-icons"><i class="signal-icon">▂▅▇</i><i class="wifi-icon">⌁</i><i class="battery"><b></b></i></span></div>
    <main class="main-view" id="main-view"></main>
    <div class="event-host" id="event-host"></div>
    <div class="viewer-host" id="viewer-host"></div>
    <button class="phone-close" data-action="close-phone" aria-label="Tutup ponsel">✕</button>
    <button class="home-indicator" data-action="home" aria-label="Layar utama"><span></span></button>
  </div></div>`;
  host.hidden = true;
  const q = sel => host.querySelector(sel);

  function homeView() {
    const clock = api.getClock();
    const found = api.foundClues().length;
    return `<section class="home-page">
      <div class="home-date">${clock.isMidnight ? 'SABTU, 15 JUNI <span>•</span> DINI HARI' : 'JUMAT, 14 JUNI <span>•</span> MALAM'}</div>
      <div class="home-clock" id="home-clock">${clock.display}</div>
      <div class="clock-subline"><span id="home-period">${clock.isMidnight ? 'AM' : 'PM'}</span><i></i> <span>CATATAN ${found}/${CLUES.length}</span></div>
      <button class="mystery-notice" data-action="open-app" data-id="after">
        <span class="notice-mark">✦</span><span class="notice-copy"><strong>AFTER: ${ARCHIVE.filter(i => !isMidnightOnly(i)).length} rahasia ditemukan</strong><small>Baca berkasnya untuk mencari petunjuk</small></span><span class="notice-time">23:47</span>
      </button>
      <div class="apps-grid">${APPS.map(app => appIcon(app, api)).join('')}</div>
      <div class="home-widget"><div class="widget-top"><span class="widget-label">${esc(api.ownerName())}</span><span class="widget-battery"><i></i> 87%</span></div><div class="widget-bottom"><span class="widget-signal"><i>◒</i> Tidak ada jaringan</span><span class="widget-lock">⌑ &nbsp;Perangkat terkunci</span></div></div>
    </section>`;
  }
  function appView() {
    if (st.app === 'messages') return messagesView();
    if (st.app === 'contacts') return contactsView();
    if (st.app === 'photos') return photosView();
    if (st.app === 'notes') return notesView();
    if (st.app === 'after') return afterView();
    if (st.app === 'phone') return phoneView();
    return homeView();
  }
  function messagesView() {
    if (st.detail) {
      const thread = byId(THREADS, st.detail);
      if (!thread) return '';
      return `<section class="app-screen messages-screen">${appHeader(thread.name, 'Pesan terenkripsi')}<div class="conversation-content"><div class="conversation-day">HARI INI</div>${thread.messages.map(([side, text]) => `<div class="message-row ${side}"><p>${esc(text)}</p></div>`).join('')}<div class="message-input"><span>iMessage</span><i>＋</i></div></div></section>`;
    }
    return `<section class="app-screen">${appHeader('Pesan', `${THREADS.length} percakapan`)}<div class="app-scroll thread-list">${THREADS.map(thread => `<button class="thread-row" data-action="thread-open" data-id="${thread.id}">${avatar(thread)}<span class="thread-copy"><strong>${esc(thread.name)}</strong><small>${esc(thread.preview)}</small></span><span class="thread-meta">${thread.time}<b>›</b></span></button>`).join('')}</div><div class="screen-tab"><span class="tab-selected">◉</span><span>Kontak</span><span>Filter</span></div></section>`;
  }
  function contactsView() {
    if (st.detail) {
      const person = byId(CONTACTS, st.detail);
      if (!person) return '';
      const index = CONTACTS.indexOf(person);
      const secret = ARCHIVE.find(item => item.id === `${person.id}-file`);
      return `<section class="app-screen">${appHeader('Kontak', person.label)}<div class="contact-detail">${avatar(person)}<h2>${esc(person.name)}</h2><span class="contact-status"><i></i>${esc(person.status)}</span><div class="contact-actions"><button data-action="contact-message" data-id="${person.id}"><b>✉</b>Pesan</button><button data-action="toast" data-message="Panggilan tidak tersedia"><b>⌕</b>Telepon</button></div><div class="contact-info"><span>INFORMASI</span><div><small>Nomor ponsel</small><strong>+62 812 ···· ${String(1903 + index * 731).slice(-4)}</strong></div><div><small>Catatan</small><strong>${person.label.includes('bisnis') ? 'Kontak bisnis' : 'Disimpan di perangkat ini'}</strong></div>${secret ? `<button class="contact-secret" data-action="secret-from-contact" data-id="${secret.id}"><small>AFTER</small><strong>1 rahasia ditemukan ›</strong></button>` : ''}</div></div></section>`;
    }
    return `<section class="app-screen">${appHeader('Kontak', `${CONTACTS.length} kontak`)}<div class="app-scroll contact-list"><div class="section-caption">TERBARU</div>${CONTACTS.map(person => `<button class="contact-row" data-action="contact-open" data-id="${person.id}">${avatar(person)}<span><strong>${esc(person.name)}</strong><small>${esc(person.label)}</small></span><i>›</i></button>`).join('')}</div></section>`;
  }
  function photosView() {
    const unlocked = api.getClock().isMidnight;
    if (st.detail) {
      const file = ARCHIVE.find(entry => entry.id === st.detail);
      const photo = file || NORMAL_PHOTOS.find(entry => entry.id === st.detail);
      if (!photo) return '';
      const heading = file?.name || photo.title;
      return `<section class="app-screen photos-screen">${appHeader('Foto', 'Koleksi pribadi')}<div class="photo-detail">${sceneImage(photo.scene, true, heading)}<div class="photo-detail-copy"><span class="tiny-kicker">${file ? esc(file.label) : esc(photo.time)}</span><h2>${esc(heading)}</h2><p>${file ? esc(file.description) : 'Disimpan di perangkat ini.'}</p>${file ? '<span class="file-warning">Berkas ini tidak tercatat dalam riwayat kamera.</span>' : ''}</div></div></section>`;
    }
    const photos = [...NORMAL_PHOTOS, ...(unlocked ? ARCHIVE.filter(isMidnightOnly).map(item => ({ ...item, title: item.name, file: true })) : [])];
    return `<section class="app-screen photos-screen">${appHeader('Foto', `${photos.length} foto`)}<div class="app-scroll photo-scroll"><div class="section-caption">${unlocked ? 'BARU SAJA' : 'HARI INI'}</div><div class="photo-grid">${photos.map(photo => `<button class="photo-tile" data-action="photo-open" data-id="${photo.id}">${sceneImage(photo.scene, false, photo.title)}<span>${esc(photo.title)}</span>${photo.file ? '<i class="photo-new-dot"></i>' : ''}</button>`).join('')}</div><div class="album-row"><span>⌑</span><span><strong>Baru-baru ini</strong><small>${photos.length} item</small></span><i>›</i></div></div><div class="screen-tab photo-tab"><span>◈</span><b>Foto</b><span>▧</span><span>⌕</span></div></section>`;
  }
  function allNotes() { return [...api.foundClues().map(c => c.note).reverse(), ...NOTES]; }
  function notesView() {
    const notes = allNotes();
    if (st.detail !== null) {
      const note = notes[Number(st.detail)];
      if (!note) return '';
      return `<section class="app-screen notes-screen">${appHeader('Catatan', note.date)}<div class="note-detail"><span>${esc(note.date)}</span><h2>${esc(note.title)}</h2><p>${esc(note.body).replace(/\n/g, '<br>')}</p></div></section>`;
    }
    return `<section class="app-screen notes-screen">${appHeader('Catatan', `${notes.length} catatan`)}<div class="app-scroll notes-list">${notes.map((note, index) => `<button class="note-row" data-action="note-open" data-id="${index}"><span class="note-icon">▤</span><span><strong>${esc(note.title)}</strong><small>${esc(note.body.split('\n')[0])}</small><i>${esc(note.date)}</i></span><b>›</b></button>`).join('')}</div><div class="note-add">＋</div></section>`;
  }
  function storyCard(item, locked) {
    return `<button class="archive-card ${isMidnightOnly(item) ? 'is-unknown' : ''} ${locked ? 'is-locked' : ''}" data-action="${locked ? 'archive-locked' : 'archive-open'}" data-id="${esc(item.id)}">
      <div class="archive-thumb">${sceneImage(item.scene, false, locked ? 'Berkas terkunci' : item.name)}${locked ? '<span class="thumb-lock">⌑</span>' : ''}</div>
      <div class="archive-copy"><div class="archive-kicker">${esc(item.category)} <span>${locked ? '00:00' : esc(item.time)}</span></div><strong>${locked ? 'Berkas terkunci' : esc(item.name)}</strong><small>${locked ? 'Terbuka tepat tengah malam' : esc(item.person)}</small></div>${item.clue && !locked ? `<span class="clue-pip ${api.isFound(item.clue) ? 'done' : ''}">${api.isFound(item.clue) ? '✓' : '✦'}</span>` : ''}<span class="row-chevron">${locked ? '⌑' : '›'}</span>
    </button>`;
  }
  function afterView() {
    const clock = api.getClock();
    if (st.detail) {
      const entry = ARCHIVE.find(item => item.id === st.detail);
      if (!entry) return '';
      const unknown = isMidnightOnly(entry);
      const clue = entry.clue ? byId(CLUES, entry.clue) : null;
      const clueBox = clue ? `<div class="clue-box ${api.isFound(clue.id) ? 'done' : ''}"><span>PETUNJUK · ${esc(clue.place)}</span><p>${api.isFound(clue.id) ? esc(clue.text) : esc(clue.teaser)}</p></div>` : '';
      return `<section class="app-screen archive-screen">${appHeader('AFTER', unknown ? 'Berkas terpulihkan' : 'Rahasia terungkap')}
        <div class="archive-detail app-scroll">${sceneImage(entry.scene, true, entry.name)}<div class="detail-meta"><span>${esc(entry.category)} <i>${esc(entry.time)}</i></span><h2>${esc(entry.name)}</h2><small>${esc(entry.person)}</small><p>${esc(entry.description)}</p>${clueBox}<div class="metadata"><span>STATUS</span><strong>${esc(entry.label)}</strong><span>ASAL BERKAS</span><strong>${unknown ? 'Tidak ada di indeks perangkat' : 'Disalin dari ponsel ' + esc(entry.person.split(' · ')[0])}</strong></div>${unknown ? '<div class="detail-footnote">Beberapa garis di foto ini tidak mungkin dibuat oleh lensa ponsel.</div>' : '<div class="detail-footnote">Semua tokoh dan kejadian dalam arsip ini fiktif.</div>'}</div></div></section>`;
    }
    const groups = st.filter === 'SEMUA' ? ARCHIVE : ARCHIVE.filter(item => item.category === st.filter);
    const open = ARCHIVE.filter(item => clock.isMidnight || !isMidnightOnly(item)).length;
    const banner = clock.isMidnight
      ? '<div class="archive-top"><div class="unlocked-badge"><i></i> ARSIP TERBUKA PENUH</div><span>00:00 — SUMBER: ?</span></div>'
      : `<div class="archive-top archive-top-pending"><div class="unlocked-badge"><i></i> ${open} RAHASIA TERBUKA</div><span class="mini-countdown">BERKAS ASING <b id="countdown">${countdownText(clock.secondsLeft)}</b></span></div>`;
    return `<section class="app-screen archive-screen unlocked-archive">${appHeader('AFTER', `${open} dari ${ARCHIVE.length} berkas`)}${banner}<div class="archive-filters">${ARCHIVE_FILTERS.map(filter => `<button class="filter-chip ${st.filter === filter ? 'selected' : ''}" data-action="filter" data-id="${filter}">${filter}</button>`).join('')}</div><div class="app-scroll archive-list">${groups.map(item => storyCard(item, !clock.isMidnight && isMidnightOnly(item))).join('')}${groups.length === 0 ? '<div class="empty-state">Tidak ada berkas di folder ini.</div>' : ''}<div class="archive-endmark">— AKHIR HASIL PEMINDAIAN —</div></div></section>`;
  }
  function phoneView() {
    return `<section class="app-screen dialer-screen">${appHeader('Telepon', 'Papan tombol')}<div class="dialer-display"><span>${st.dial ? esc(st.dial) : 'Masukkan nomor'}</span>${st.dial ? '<button data-action="dial-back">⌫</button>' : ''}</div><div class="dial-pad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit, index) => `<button data-action="dial" data-id="${digit}"><strong>${digit}</strong><small>${['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ','','+',''][index]}</small></button>`).join('')}</div><button class="dial-call" data-action="toast" data-message="Tidak ada layanan.">⌕</button></section>`;
  }
  function eventView() {
    const entry = ARCHIVE.find(item => item.id === 'breach-01');
    return `<div class="midnight-flash"><div class="event-card"><div class="event-topline"><span><i></i> BERKAS MASUK</span><span>00:00</span></div>${sceneImage(entry.scene, true, 'Siluet asing di balik kaca')}<div class="event-copy"><span class="tiny-kicker">SUMBER TIDAK DIKENAL</span><h2>${esc(entry.name)}</h2><p>Foto baru tersimpan. Kamera tidak sedang digunakan.</p></div><div class="event-actions"><button class="event-open" data-action="event-open">LIHAT BERKAS <span>↗</span></button><button class="event-close" data-action="event-close">ABAIKAN</button></div><div class="event-glitch">00:00&nbsp; 00:00&nbsp; 00:00&nbsp; 00:00</div></div></div>`;
  }

  function render() {
    if (!st.open) return;
    const main = q('#main-view');
    main.innerHTML = st.app ? appView() : homeView();
    q('#status-time').textContent = api.getClock().display;
    q('#event-host').innerHTML = st.event ? eventView() : '';
    q('#viewer-host').innerHTML = st.full ? viewerMarkup(st.full.scene, st.full.label) : '';
    q('.phone-shell').classList.toggle('midnight', api.getClock().isMidnight);
  }
  function renderViewer() { q('#viewer-host').innerHTML = st.full ? viewerMarkup(st.full.scene, st.full.label) : ''; }
  function toast(text) {
    let el = q('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; q('.screen').appendChild(el); }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(st.toastTimer);
    st.toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }
  function openEntry(id) {
    st.detail = id;
    api.markRead(id);
  }

  host.addEventListener('click', event => {
    const target = event.target.closest('[data-action], [data-app]');
    if (!target || !host.contains(target)) return;
    if (target.hasAttribute('data-app')) { st.app = target.dataset.app; st.detail = null; st.filter = 'SEMUA'; render(); return; }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'photo-full') { event.stopPropagation(); st.full = { scene: target.dataset.scene, label: target.dataset.label || '' }; api.haptic('tick'); renderViewer(); return; }
    if (action === 'viewer-close') { st.full = null; renderViewer(); return; }
    if (action === 'close-phone') { api.onClose(); return; }
    if (action === 'home') { if (st.app || st.detail) { st.app = null; st.detail = null; render(); } else api.onClose(); return; }
    if (action === 'open-app') { st.app = id; st.detail = null; st.filter = 'SEMUA'; render(); return; }
    if (action === 'back') { if (st.detail !== null && st.detail !== undefined) st.detail = null; else st.app = null; render(); return; }
    if (action === 'archive-open') { openEntry(id); api.haptic('tap'); render(); return; }
    if (action === 'photo-open' && ARCHIVE.some(item => item.id === id)) { openEntry(id); render(); return; }
    if (['thread-open', 'contact-open', 'photo-open', 'note-open'].includes(action)) { st.detail = id; render(); return; }
    if (action === 'archive-locked') { api.haptic('error'); toast('Berkas ini hanya terbuka tepat pukul 00:00.'); return; }
    if (action === 'contact-message') { st.app = 'messages'; st.detail = byId(THREADS, id) ? id : 'unknown'; render(); return; }
    if (action === 'secret-from-contact') { st.app = 'after'; st.filter = 'SEMUA'; openEntry(id); render(); return; }
    if (action === 'filter') { st.filter = id; render(); return; }
    if (action === 'event-open') { st.event = false; st.app = 'after'; openEntry('breach-01'); render(); return; }
    if (action === 'event-close') { st.event = false; render(); return; }
    if (action === 'dial') { st.dial = (st.dial + id).slice(0, 16); render(); return; }
    if (action === 'dial-back') { st.dial = st.dial.slice(0, -1); render(); return; }
    if (action === 'toast') toast(target.dataset.message || 'Tidak tersedia.');
  });

  return {
    isOpen: () => st.open,
    open({ event = false, app = null, detail = null } = {}) {
      st.open = true; host.hidden = false; st.event = event; st.app = app; st.detail = detail; st.full = null;
      render();
    },
    close() { st.open = false; st.full = null; host.hidden = true; },
    refresh: render,
    closeViewer() { if (st.full) { st.full = null; renderViewer(); return true; } return false; },
    tick() {
      if (!st.open) return;
      const clock = api.getClock();
      q('#status-time').textContent = clock.display;
      const hc = q('#home-clock'); if (hc) hc.textContent = clock.display;
      const cd = q('#countdown'); if (cd && !clock.isMidnight) cd.innerHTML = countdownText(clock.secondsLeft);
    },
  };
}
