import { FILTER_IDS, getStory, isMidnightOnly } from './story.mjs';
import { getLang, t } from './i18n.mjs';

const APPS = [
  { id: 'messages', key: 'messages', glyph: '✉', tone: 'messages' },
  { id: 'photos', key: 'photos', glyph: '◈', tone: 'photos' },
  { id: 'contacts', key: 'contacts', glyph: '◉', tone: 'contacts' },
  { id: 'notes', key: 'notes', glyph: '▤', tone: 'notes' },
  { id: 'phone', key: 'phone', glyph: '⌕', tone: 'phone' },
  { id: 'after', key: 'after', glyph: 'A', tone: 'after' },
];
const normalPhotos = () => [
  { id: 'rain', title: t('ph.rain'), scene: 'rain', time: t('ph.todayAt', { t: '18:12' }) },
  { id: 'coffee', title: t('ph.coffee'), scene: 'coffee', time: t('ph.todayAt', { t: '15:33' }) },
  { id: 'room', title: t('ph.room'), scene: 'room', time: t('ph.yesterdayAt', { t: '23:10' }) },
];
const S = () => getStory();
const catName = c => S().CATEGORY_NAMES[c] || c;
const lang = () => getLang();
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
  const ids = [...Object.values(SCENE_ASSETS), ...S().CONTACTS.map(person => `portrait_${person.id}`)];
  for (const id of ids) {
    const url = assetUrl(id);
    if (url) { const img = new Image(); img.decoding = 'async'; img.src = url; }
  }
}
function sceneImage(scene, large = false, label = '') {
  const url = assetUrl(SCENE_ASSETS[scene]);
  const image = url ? `<img class="scene-photo" src="${esc(url)}" alt="" loading="eager" decoding="async">` : '';
  const fileNo = String(SCENE_FILE[scene] ?? (2000 + Object.keys(SCENE_ASSETS).indexOf(scene) * 37)).padStart(4, '0');
  const fullButton = large && url ? `<button class="photo-full-btn" data-action="photo-full" data-scene="${esc(scene)}" data-label="${esc(label)}" aria-label="${esc(t('ph.viewFull'))}">${FULL_ICON}</button>` : '';
  return `<div class="scene-image scene-${esc(scene)}${large ? ' scene-large' : ''}${url ? ' has-photo' : ''}" role="img" aria-label="${esc(label)}">${image}<div class="scene-visual"><i class="shape shape-main"></i><i class="shape shape-extra"></i><i class="shape shape-third"></i></div><div class="scene-noise"></div><div class="scene-date">IMG_${fileNo}.HEIC</div>${fullButton}</div>`;
}
function viewerMarkup(scene, label) {
  const url = assetUrl(SCENE_ASSETS[scene]);
  if (!url) return '';
  return `<div class="photo-viewer" data-action="viewer-close" role="dialog" aria-label="${esc(label || t('ph.photo'))}"><div class="viewer-top"><span>${esc(label)}</span><button class="viewer-close" data-action="viewer-close" aria-label="${esc(t('ph.close'))}">✕</button></div><img class="viewer-photo" src="${esc(url)}" alt="${esc(label)}" decoding="async"><div class="viewer-hint">${esc(t('ph.tapClose'))}</div></div>`;
}
function appIcon(app, api) {
  const dot = app.id === 'after' && api.hasNewAfter() ? '<i class="app-dot"></i>' : '';
  return `<button class="app-icon" data-app="${app.id}" aria-label="${esc(t('app.open', { name: t('app.' + app.key) }))}"><span class="app-glyph glyph-${app.tone}">${app.glyph}${dot}</span><span class="app-name">${esc(t('app.' + app.key))}</span></button>`;
}
function avatar(person) {
  const url = person.id === 'unknown' ? '' : assetUrl(`portrait_${person.id}`);
  return `<span class="avatar avatar-${esc(person.tint)}">${url ? `<img src="${esc(url)}" alt="" decoding="async">` : esc(person.initials)}</span>`;
}
function appHeader(title, subtitle = '') {
  return `<header class="app-header"><button class="back-button" data-action="back" aria-label="${esc(t('ph.back'))}">‹</button><div class="app-header-titles"><strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div><span class="header-mark">•••</span></header>`;
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
  const st = { open: false, app: null, detail: null, filter: 'all', event: false, full: null, dial: '', toastTimer: null };
  host.classList.add('phone-layer');
  host.innerHTML = `<div class="phone-shell"><div class="screen">
    <div class="wallpaper"><div class="wallpaper-orb orb-a"></div><div class="wallpaper-orb orb-b"></div><div class="wallpaper-grain"></div></div>
    <div class="status-bar"><span class="status-time" id="status-time">11:48</span><span class="status-icons"><i class="signal-icon">▂▅▇</i><i class="wifi-icon">⌁</i><i class="battery"><b></b></i></span></div>
    <main class="main-view" id="main-view"></main>
    <div class="event-host" id="event-host"></div>
    <div class="viewer-host" id="viewer-host"></div>
    <button class="phone-close" data-action="close-phone" aria-label="${t('ph.closePhone')}">✕</button>
    <button class="home-indicator" data-action="home" aria-label="${t('ph.home')}"><span></span></button>
  </div></div>`;
  host.hidden = true;
  const q = sel => host.querySelector(sel);

  function homeView() {
    const clock = api.getClock();
    const found = api.foundClues().length;
    return `<section class="home-page">
      <div class="home-date">${clock.isMidnight ? t('ph.dateLate') : t('ph.dateNight')}</div>
      <div class="home-clock" id="home-clock">${clock.display}</div>
      <div class="clock-subline"><span id="home-period">${clock.isMidnight ? 'AM' : 'PM'}</span><i></i> <span>${t('ph.notesCount', { n: found, m: S().CLUES.length })}</span></div>
      <button class="mystery-notice" data-action="open-app" data-id="after">
        <span class="notice-mark">✦</span><span class="notice-copy"><strong>${esc(t('ph.afterFound', { n: S().ARCHIVE.filter(i => !isMidnightOnly(i)).length }))}</strong><small>${esc(t('ph.afterHint'))}</small></span><span class="notice-time">23:47</span>
      </button>
      <div class="apps-grid">${APPS.map(app => appIcon(app, api)).join('')}</div>
      <div class="home-widget"><div class="widget-top"><span class="widget-label">${esc(api.ownerName())}</span><span class="widget-battery"><i></i> 87%</span></div><div class="widget-bottom"><span class="widget-signal"><i>◒</i> ${esc(t('ph.noNet'))}</span><span class="widget-lock">⌑ &nbsp;${esc(t('ph.locked'))}</span></div></div>
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
      const thread = byId(S().THREADS, st.detail);
      if (!thread) return '';
      return `<section class="app-screen messages-screen">${appHeader(thread.name, t('ph.encrypted'))}<div class="conversation-content"><div class="conversation-day">${esc(t('ph.today'))}</div>${thread.messages.map(([side, text]) => `<div class="message-row ${side}"><p>${esc(text)}</p></div>`).join('')}<div class="message-input"><span>iMessage</span><i>＋</i></div></div></section>`;
    }
    return `<section class="app-screen">${appHeader(t('app.messages'), t('ph.convs', { n: S().THREADS.length }))}<div class="app-scroll thread-list">${S().THREADS.map(thread => `<button class="thread-row" data-action="thread-open" data-id="${thread.id}">${avatar(thread)}<span class="thread-copy"><strong>${esc(thread.name)}</strong><small>${esc(thread.preview)}</small></span><span class="thread-meta">${thread.time}<b>›</b></span></button>`).join('')}</div><div class="screen-tab"><span class="tab-selected">◉</span><span>${esc(t('ph.tabContacts'))}</span><span>${esc(t('ph.tabFilter'))}</span></div></section>`;
  }
  function contactsView() {
    if (st.detail) {
      const person = byId(S().CONTACTS, st.detail);
      if (!person) return '';
      const index = S().CONTACTS.indexOf(person);
      const secret = S().ARCHIVE.find(item => item.id === `${person.id}-file`);
      return `<section class="app-screen">${appHeader(t('app.contacts'), person.label)}<div class="contact-detail">${avatar(person)}<h2>${esc(person.name)}</h2><span class="contact-status"><i></i>${esc(person.status)}</span><div class="contact-actions"><button data-action="contact-message" data-id="${person.id}"><b>✉</b>${esc(t('ph.msgBtn'))}</button><button data-action="toast" data-message="${esc(t('ph.callNA'))}"><b>⌕</b>${esc(t('ph.callBtn'))}</button></div><div class="contact-info"><span>${esc(t('ph.info'))}</span><div><small>${esc(t('ph.number'))}</small><strong>+62 812 ···· ${String(1903 + index * 731).slice(-4)}</strong></div><div><small>${esc(t('ph.note'))}</small><strong>${esc(person.business ? t('ph.noteBiz') : t('ph.noteLocal'))}</strong></div>${secret ? `<button class="contact-secret" data-action="secret-from-contact" data-id="${secret.id}"><small>AFTER</small><strong>${esc(t('ph.secretFound'))}</strong></button>` : ''}</div></div></section>`;
    }
    return `<section class="app-screen">${appHeader(t('app.contacts'), t('ph.contactsCount', { n: S().CONTACTS.length }))}<div class="app-scroll contact-list"><div class="section-caption">${esc(t('ph.newest'))}</div>${S().CONTACTS.map(person => `<button class="contact-row" data-action="contact-open" data-id="${person.id}">${avatar(person)}<span><strong>${esc(person.name)}</strong><small>${esc(person.label)}</small></span><i>›</i></button>`).join('')}</div></section>`;
  }
  function photosView() {
    const unlocked = api.getClock().isMidnight;
    if (st.detail) {
      const file = S().ARCHIVE.find(entry => entry.id === st.detail);
      const photo = file || normalPhotos().find(entry => entry.id === st.detail);
      if (!photo) return '';
      const heading = file?.name || photo.title;
      return `<section class="app-screen photos-screen">${appHeader(t('app.photos'), t('ph.personal'))}<div class="photo-detail">${sceneImage(photo.scene, true, heading)}<div class="photo-detail-copy"><span class="tiny-kicker">${file ? esc(file.label) : esc(photo.time)}</span><h2>${esc(heading)}</h2><p>${file ? esc(file.description) : esc(t('ph.savedLocal'))}</p>${file ? `<span class="file-warning">${esc(t('ph.notInCamera'))}</span>` : ''}</div></div></section>`;
    }
    const photos = [...normalPhotos(), ...(unlocked ? S().ARCHIVE.filter(isMidnightOnly).map(item => ({ ...item, title: item.name, file: true })) : [])];
    return `<section class="app-screen photos-screen">${appHeader(t('app.photos'), t('ph.photosCount', { n: photos.length }))}<div class="app-scroll photo-scroll"><div class="section-caption">${esc(unlocked ? t('ph.justNow') : t('ph.today'))}</div><div class="photo-grid">${photos.map(photo => `<button class="photo-tile" data-action="photo-open" data-id="${photo.id}">${sceneImage(photo.scene, false, photo.title)}<span>${esc(photo.title)}</span>${photo.file ? '<i class="photo-new-dot"></i>' : ''}</button>`).join('')}</div><div class="album-row"><span>⌑</span><span><strong>${esc(t('ph.recents'))}</strong><small>${esc(t('ph.items', { n: photos.length }))}</small></span><i>›</i></div></div><div class="screen-tab photo-tab"><span>◈</span><b>${esc(t('app.photos'))}</b><span>▧</span><span>⌕</span></div></section>`;
  }
  function allNotes() { return [...api.foundClues().map(c => c.note).reverse(), ...S().NOTES]; }
  function notesView() {
    const notes = allNotes();
    if (st.detail !== null) {
      const note = notes[Number(st.detail)];
      if (!note) return '';
      return `<section class="app-screen notes-screen">${appHeader(t('ph.notesTitle'), note.date)}<div class="note-detail"><span>${esc(note.date)}</span><h2>${esc(note.title)}</h2><p>${esc(note.body).replace(/\n/g, '<br>')}</p></div></section>`;
    }
    return `<section class="app-screen notes-screen">${appHeader(t('ph.notesTitle'), t('ph.notesN', { n: notes.length }))}<div class="app-scroll notes-list">${notes.map((note, index) => `<button class="note-row" data-action="note-open" data-id="${index}"><span class="note-icon">▤</span><span><strong>${esc(note.title)}</strong><small>${esc(note.body.split('\n')[0])}</small><i>${esc(note.date)}</i></span><b>›</b></button>`).join('')}</div><div class="note-add">＋</div></section>`;
  }
  function storyCard(item, locked) {
    return `<button class="archive-card ${isMidnightOnly(item) ? 'is-unknown' : ''} ${locked ? 'is-locked' : ''}" data-action="${locked ? 'archive-locked' : 'archive-open'}" data-id="${esc(item.id)}">
      <div class="archive-thumb">${sceneImage(item.scene, false, locked ? t('ph.lockedFile') : item.name)}${locked ? '<span class="thumb-lock">⌑</span>' : ''}</div>
      <div class="archive-copy"><div class="archive-kicker">${esc(catName(item.category))} <span>${locked ? '00:00' : esc(item.time)}</span></div><strong>${esc(locked ? t('ph.lockedFile') : item.name)}</strong><small>${esc(locked ? t('ph.opensMidnight') : item.person)}</small></div>${item.clue && !locked ? `<span class="clue-pip ${api.isFound(item.clue) ? 'done' : ''}">${api.isFound(item.clue) ? '✓' : '✦'}</span>` : ''}<span class="row-chevron">${locked ? '⌑' : '›'}</span>
    </button>`;
  }
  function afterView() {
    const clock = api.getClock();
    if (st.detail) {
      const entry = S().ARCHIVE.find(item => item.id === st.detail);
      if (!entry) return '';
      const unknown = isMidnightOnly(entry);
      const clue = entry.clue ? byId(S().CLUES, entry.clue) : null;
      const clueBox = clue ? `<div class="clue-box ${api.isFound(clue.id) ? 'done' : ''}"><span>${esc(t('ph.clue', { place: clue.place }))}</span><p>${api.isFound(clue.id) ? esc(clue.text) : esc(clue.teaser)}</p></div>` : '';
      return `<section class="app-screen archive-screen">${appHeader('AFTER', unknown ? t('ph.restored') : t('ph.revealed'))}
        <div class="archive-detail app-scroll">${sceneImage(entry.scene, true, entry.name)}<div class="detail-meta"><span>${esc(catName(entry.category))} <i>${esc(entry.time)}</i></span><h2>${esc(entry.name)}</h2><small>${esc(entry.person)}</small><p>${esc(entry.description)}</p>${clueBox}<div class="metadata"><span>${esc(t('ph.status'))}</span><strong>${esc(entry.label)}</strong><span>${esc(t('ph.origin'))}</span><strong>${esc(unknown ? t('ph.noIndex') : t('ph.copiedFrom', { name: entry.person.split(' · ')[0] }))}</strong></div><div class="detail-footnote">${esc(unknown ? t('ph.lensNote') : t('ph.fictional'))}</div></div></div></section>`;
    }
    const groups = st.filter === 'all' ? S().ARCHIVE : S().ARCHIVE.filter(item => item.category === st.filter);
    const open = S().ARCHIVE.filter(item => clock.isMidnight || !isMidnightOnly(item)).length;
    const banner = clock.isMidnight
      ? `<div class="archive-top"><div class="unlocked-badge"><i></i> ${esc(t('ph.fullOpen'))}</div><span>00:00 — ${lang() === 'en' ? 'SOURCE' : 'SUMBER'}: ?</span></div>`
      : `<div class="archive-top archive-top-pending"><div class="unlocked-badge"><i></i> ${esc(t('ph.secretsOpen', { n: open }))}</div><span class="mini-countdown">${esc(t('ph.strange'))} <b id="countdown">${countdownText(clock.secondsLeft)}</b></span></div>`;
    return `<section class="app-screen archive-screen unlocked-archive">${appHeader('AFTER', t('ph.filesOf', { n: open, m: S().ARCHIVE.length }))}${banner}<div class="archive-filters">${FILTER_IDS.map(filter => `<button class="filter-chip ${st.filter === filter ? 'selected' : ''}" data-action="filter" data-id="${filter}">${esc(catName(filter))}</button>`).join('')}</div><div class="app-scroll archive-list">${groups.map(item => storyCard(item, !clock.isMidnight && isMidnightOnly(item))).join('')}${groups.length === 0 ? `<div class="empty-state">${esc(t('ph.emptyFolder'))}</div>` : ''}<div class="archive-endmark">${esc(t('ph.endScan'))}</div></div></section>`;
  }
  function phoneView() {
    return `<section class="app-screen dialer-screen">${appHeader(t('app.phone'), t('ph.keypad'))}<div class="dialer-display"><span>${st.dial ? esc(st.dial) : esc(t('ph.enterNumber'))}</span>${st.dial ? '<button data-action="dial-back">⌫</button>' : ''}</div><div class="dial-pad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit, index) => `<button data-action="dial" data-id="${digit}"><strong>${digit}</strong><small>${['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ','','+',''][index]}</small></button>`).join('')}</div><button class="dial-call" data-action="toast" data-message="${esc(t('ph.noService'))}">⌕</button></section>`;
  }
  function eventView() {
    const entry = S().ARCHIVE.find(item => item.id === 'breach-01');
    return `<div class="midnight-flash"><div class="event-card"><div class="event-topline"><span><i></i> ${esc(t('ph.incoming'))}</span><span>00:00</span></div>${sceneImage(entry.scene, true, entry.name)}<div class="event-copy"><span class="tiny-kicker">${esc(t('ph.unknownSource'))}</span><h2>${esc(entry.name)}</h2><p>${esc(t('ph.newSaved'))}</p></div><div class="event-actions"><button class="event-open" data-action="event-open">${esc(t('ph.viewFile'))} <span>↗</span></button><button class="event-close" data-action="event-close">${esc(t('ph.ignore'))}</button></div><div class="event-glitch">00:00&nbsp; 00:00&nbsp; 00:00&nbsp; 00:00</div></div></div>`;
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
    if (target.hasAttribute('data-app')) { st.app = target.dataset.app; st.detail = null; st.filter = 'all'; render(); return; }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'photo-full') { event.stopPropagation(); st.full = { scene: target.dataset.scene, label: target.dataset.label || '' }; api.haptic('tick'); renderViewer(); return; }
    if (action === 'viewer-close') { st.full = null; renderViewer(); return; }
    if (action === 'close-phone') { api.onClose(); return; }
    if (action === 'home') { if (st.app || st.detail) { st.app = null; st.detail = null; render(); } else api.onClose(); return; }
    if (action === 'open-app') { st.app = id; st.detail = null; st.filter = 'all'; render(); return; }
    if (action === 'back') { if (st.detail !== null && st.detail !== undefined) st.detail = null; else st.app = null; render(); return; }
    if (action === 'archive-open') { openEntry(id); api.haptic('tap'); render(); return; }
    if (action === 'photo-open' && S().ARCHIVE.some(item => item.id === id)) { openEntry(id); render(); return; }
    if (['thread-open', 'contact-open', 'photo-open', 'note-open'].includes(action)) { st.detail = id; render(); return; }
    if (action === 'archive-locked') { api.haptic('error'); toast(t('ph.lockedToast')); return; }
    if (action === 'contact-message') { st.app = 'messages'; st.detail = byId(S().THREADS, id) ? id : 'unknown'; render(); return; }
    if (action === 'secret-from-contact') { st.app = 'after'; st.filter = 'all'; openEntry(id); render(); return; }
    if (action === 'filter') { st.filter = id; render(); return; }
    if (action === 'event-open') { st.event = false; st.app = 'after'; openEntry('breach-01'); render(); return; }
    if (action === 'event-close') { st.event = false; render(); return; }
    if (action === 'dial') { st.dial = (st.dial + id).slice(0, 16); render(); return; }
    if (action === 'dial-back') { st.dial = st.dial.slice(0, -1); render(); return; }
    if (action === 'toast') toast(target.dataset.message || t('ph.na'));
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
