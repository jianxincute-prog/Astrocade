// Tiny i18n layer: Indonesian ('id') and English ('en'). Game logic uses ids; text goes through t().
export const LANGS = ['id', 'en'];
let current = 'id';

export function detectLang() {
  try { return String(navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en'; } catch (_) { return 'en'; }
}
export const getLang = () => current;
export function setLang(l) {
  current = LANGS.includes(l) ? l : 'en';
  try { document.documentElement.lang = current; } catch (_) { /* no DOM in tests */ }
  return current;
}

const D = {
  id: {
    'lang.title': 'Pilih bahasa', 'lang.sub': 'Bisa diganti kapan saja di Pengaturan',
    'load.three': 'Memuat Three.js r186…', 'load.world': 'Memuat dunia 3D…', 'load.fail': 'Gagal memuat mesin 3D.', 'load.retry': 'COBA LAGI',
    'load.house': 'Membangun rumah…', 'load.phone': 'Menyiapkan ponsel…', 'load.ready': 'Siap',
    'param.duration': 'Durasi menuju tengah malam (detik)', 'param.glitch': 'Intensitas glitch', 'param.owner': 'Nama pemilik ponsel',
    'owner.default': 'Pemilik perangkat',
    'hud.phone': 'Buka ponsel', 'hud.sound': 'Suara', 'hud.keys': 'WASD / panah: jalan · E: periksa · P: ponsel',
    'act.inspect': 'Periksa', 'act.open': 'Buka pintu', 'act.close': 'Tutup pintu',
    'goal.rani': 'Temui Rani di rumah lamanya', 'goal.house': 'Pergi ke rumah Rani (ujung barat)', 'goal.find': 'Cari: {place}',
    'goal.openAfter': 'Buka ponsel › AFTER', 'goal.explore': 'Jelajahi komplek: baca AFTER lagi', 'goal.readMore': 'Baca berkas AFTER lain',
    'toast.newClue': 'Petunjuk baru: {place}', 'toast.address': 'Alamatnya: Blok C-7, ujung barat komplek.', 'toast.knocks': 'Dari ujung barat komplek terdengar tiga ketukan…',
    'toast.doorBlocked': 'Ada yang menghalangi pintu.', 'toast.watch1': 'Foto di dinding itu… matanya mengikutimu.', 'toast.watch2': 'Mereka semua menatapmu.',
    'dlg.next': 'Lanjut ›', 'dlg.photo': 'Foto', 'dlg.photoLabel': 'Foto di dinding',
    'dlg.nothing': 'Tidak ada yang aneh di sini. Mungkin ada petunjuk di AFTER.',
    'dlg.locked': 'Terkunci. Rumah ini sudah lama kosong, dan aku belum cukup tahu. ({n}/{m} catatan)',
    'dlg.unlocked': 'Tiga ketukan dari dalam. Pintunya terbuka sendiri.', 'dlg.talkRani': 'Bicara pada Rani',
    'intro.1': 'Rani tidak membalas sejak sore. Ada aplikasi baru di ponselku: AFTER.', 'intro.2': 'Pintu-pintu di rumah ini bisa dibuka dan ditutup. Foto-foto di dinding itu… sejak kapan ada di sana?',
    'end.delete': 'HAPUS AFTER', 'end.keep': 'SIMPAN AFTER', 'end.kicker': 'AKHIR {n}/2', 'end.time': 'WAKTU', 'end.best': 'TERBAIK', 'end.again': 'MAIN LAGI', 'end.menu': 'MENU',
    'menu.best': 'Terbaik {t}', 'menu.resume': 'LANJUT', 'menu.new': 'MAIN BARU', 'menu.play': 'MAIN', 'menu.settings': 'Pengaturan', 'menu.help': 'Bantuan',
    'panel.close': 'TUTUP', 'set.quality': 'Kualitas grafis', 'set.autoNow': 'Auto saat ini: {q}', 'set.sound': 'Suara', 'set.on': 'Nyala', 'set.off': 'Mati', 'set.language': 'Bahasa',
    'help.title': 'Cara main',
    'help.1': 'Jelajahi rumah, lalu komplek. Buka ponsel › AFTER dan baca berkasnya: tiap rahasia teman, keluarga, dan tetangga membuka satu petunjuk. Temukan {n} catatan untuk membuka rumah Rani di ujung barat.',
    'help.2': 'Sentuh: geser joystick, ketuk tombol periksa. PC: WASD / panah, E atau Spasi, P untuk ponsel.',
    // rooms / zones
    'room.Kamar': 'Kamar', 'room.Ruang tamu': 'Ruang tamu', 'room.Gudang': 'Gudang', 'room.Dapur': 'Dapur', 'room.Ruang makan': 'Ruang makan', 'room.Rumah Rani': 'Rumah Rani',
    'room.Jalan raya': 'Jalan raya', 'room.Jalan komplek': 'Jalan komplek', 'room.Halaman': 'Halaman', 'room.Komplek': 'Komplek',
    // interaction spots
    'spot.tiket': 'Meja belajar', 'spot.ketukan': 'Lemari tua', 'spot.resi': 'Kulkas', 'spot.surat': 'Kotak surat', 'spot.cctv': 'Monitor CCTV', 'spot.ronda': 'Buku ronda', 'spot.warung': 'Struk warung', 'spot.ranidoor': 'Pintu rumah Rani',
    'door.kamar': 'Pintu kamar', 'door.dapur': 'Pintu dapur', 'door.tamu': 'Pintu ruang tamu', 'door.makan': 'Pintu ruang makan', 'door.depan': 'Pintu depan', 'door.gudang': 'Pintu gudang', 'door.rani': 'Pintu rumah Rani',
    // phone
    'app.messages': 'Pesan', 'app.photos': 'Foto', 'app.contacts': 'Kontak', 'app.notes': 'Catatan', 'app.phone': 'Telepon', 'app.after': 'AFTER', 'app.open': 'Buka {name}',
    'ph.rain': 'Jendela hujan', 'ph.coffee': 'Kopi yang terlupa', 'ph.room': 'Lampu kamar',
    'ph.todayAt': 'Hari ini, {t}', 'ph.yesterdayAt': 'Kemarin, {t}',
    'ph.viewFull': 'Lihat foto penuh', 'ph.photo': 'Foto', 'ph.close': 'Tutup', 'ph.tapClose': 'Ketuk di mana saja untuk menutup',
    'ph.back': 'Kembali', 'ph.closePhone': 'Tutup ponsel', 'ph.home': 'Layar utama',
    'ph.dateLate': 'SABTU, 15 JUNI <span>•</span> DINI HARI', 'ph.dateNight': 'JUMAT, 14 JUNI <span>•</span> MALAM',
    'ph.notesCount': 'CATATAN {n}/{m}', 'ph.afterFound': 'AFTER: {n} rahasia ditemukan', 'ph.afterHint': 'Baca berkasnya untuk mencari petunjuk',
    'ph.noNet': 'Tidak ada jaringan', 'ph.locked': 'Perangkat terkunci',
    'ph.encrypted': 'Pesan terenkripsi', 'ph.today': 'HARI INI', 'ph.convs': '{n} percakapan', 'ph.tabContacts': 'Kontak', 'ph.tabFilter': 'Filter',
    'ph.contactsCount': '{n} kontak', 'ph.newest': 'TERBARU', 'ph.info': 'INFORMASI', 'ph.number': 'Nomor ponsel', 'ph.note': 'Catatan',
    'ph.noteBiz': 'Kontak bisnis', 'ph.noteLocal': 'Disimpan di perangkat ini', 'ph.secretFound': '1 rahasia ditemukan ›', 'ph.callNA': 'Panggilan tidak tersedia', 'ph.callBtn': 'Telepon', 'ph.msgBtn': 'Pesan',
    'ph.personal': 'Koleksi pribadi', 'ph.savedLocal': 'Disimpan di perangkat ini.', 'ph.notInCamera': 'Berkas ini tidak tercatat dalam riwayat kamera.', 'ph.photosCount': '{n} foto',
    'ph.justNow': 'BARU SAJA', 'ph.recents': 'Baru-baru ini', 'ph.items': '{n} item',
    'ph.notesTitle': 'Catatan', 'ph.notesN': '{n} catatan',
    'ph.lockedFile': 'Berkas terkunci', 'ph.opensMidnight': 'Terbuka tepat tengah malam', 'ph.lockedToast': 'Berkas ini hanya terbuka tepat pukul 00:00.',
    'ph.clue': 'PETUNJUK · {place}', 'ph.restored': 'Berkas terpulihkan', 'ph.revealed': 'Rahasia terungkap',
    'ph.status': 'STATUS', 'ph.origin': 'ASAL BERKAS', 'ph.noIndex': 'Tidak ada di indeks perangkat', 'ph.copiedFrom': 'Disalin dari ponsel {name}',
    'ph.lensNote': 'Beberapa garis di foto ini tidak mungkin dibuat oleh lensa ponsel.', 'ph.fictional': 'Semua tokoh dan kejadian dalam arsip ini fiktif.',
    'ph.fullOpen': 'ARSIP TERBUKA PENUH', 'ph.secretsOpen': '{n} RAHASIA TERBUKA', 'ph.strange': 'BERKAS ASING', 'ph.filesOf': '{n} dari {m} berkas',
    'ph.emptyFolder': 'Tidak ada berkas di folder ini.', 'ph.endScan': '— AKHIR HASIL PEMINDAIAN —',
    'ph.phoneTitle': 'Telepon', 'ph.keypad': 'Papan tombol', 'ph.enterNumber': 'Masukkan nomor', 'ph.noService': 'Tidak ada layanan.',
    'ph.incoming': 'BERKAS MASUK', 'ph.strangeSilhouette': 'Siluet asing di balik kaca', 'ph.unknownSource': 'SUMBER TIDAK DIKENAL', 'ph.newSaved': 'Foto baru tersimpan. Kamera tidak sedang digunakan.',
    'ph.viewFile': 'LIHAT BERKAS', 'ph.ignore': 'ABAIKAN', 'ph.na': 'Tidak tersedia.',
  },
  en: {
    'lang.title': 'Choose language', 'lang.sub': 'You can change it anytime in Settings',
    'load.three': 'Loading Three.js r186…', 'load.world': 'Loading the 3D world…', 'load.fail': 'Failed to load the 3D engine.', 'load.retry': 'TRY AGAIN',
    'load.house': 'Building the house…', 'load.phone': 'Setting up the phone…', 'load.ready': 'Ready',
    'param.duration': 'Time until midnight (seconds)', 'param.glitch': 'Glitch intensity', 'param.owner': 'Phone owner name',
    'owner.default': 'Device owner',
    'hud.phone': 'Open phone', 'hud.sound': 'Sound', 'hud.keys': 'WASD / arrows: move · E: inspect · P: phone',
    'act.inspect': 'Inspect', 'act.open': 'Open door', 'act.close': 'Close door',
    'goal.rani': "Meet Rani at her old house", 'goal.house': "Go to Rani's house (west end)", 'goal.find': 'Find: {place}',
    'goal.openAfter': 'Open phone › AFTER', 'goal.explore': 'Explore the complex: read AFTER again', 'goal.readMore': 'Read another AFTER file',
    'toast.newClue': 'New lead: {place}', 'toast.address': 'The address: Block C-7, west end of the complex.', 'toast.knocks': 'Three knocks echo from the west end of the complex…',
    'toast.doorBlocked': 'Something is blocking the door.', 'toast.watch1': 'That photo on the wall… its eyes follow you.', 'toast.watch2': 'They are all staring at you.',
    'dlg.next': 'Next ›', 'dlg.photo': 'Photo', 'dlg.photoLabel': 'Photo on the wall',
    'dlg.nothing': 'Nothing unusual here. Maybe there is a hint in AFTER.',
    'dlg.locked': "Locked. This house has been empty for a long time, and I don't know enough yet. ({n}/{m} notes)",
    'dlg.unlocked': 'Three knocks from inside. The door opens by itself.', 'dlg.talkRani': 'Talk to Rani',
    'intro.1': "Rani hasn't replied since the afternoon. There's a new app on my phone: AFTER.", 'intro.2': "The doors in this house open and close. And those photos on the walls… since when have they been there?",
    'end.delete': 'DELETE AFTER', 'end.keep': 'KEEP AFTER', 'end.kicker': 'ENDING {n}/2', 'end.time': 'TIME', 'end.best': 'BEST', 'end.again': 'PLAY AGAIN', 'end.menu': 'MENU',
    'menu.best': 'Best {t}', 'menu.resume': 'CONTINUE', 'menu.new': 'NEW GAME', 'menu.play': 'PLAY', 'menu.settings': 'Settings', 'menu.help': 'Help',
    'panel.close': 'CLOSE', 'set.quality': 'Graphics quality', 'set.autoNow': 'Auto is currently: {q}', 'set.sound': 'Sound', 'set.on': 'On', 'set.off': 'Off', 'set.language': 'Language',
    'help.title': 'How to play',
    'help.1': "Explore the house, then the complex. Open the phone › AFTER and read its files: each secret about a friend, family member or neighbor unlocks one lead. Find {n} notes to open Rani's house at the west end.",
    'help.2': 'Touch: drag the joystick, tap the inspect button. PC: WASD / arrows, E or Space, P for the phone.',
    'room.Kamar': 'Bedroom', 'room.Ruang tamu': 'Living room', 'room.Gudang': 'Storeroom', 'room.Dapur': 'Kitchen', 'room.Ruang makan': 'Dining room', 'room.Rumah Rani': "Rani's house",
    'room.Jalan raya': 'Main road', 'room.Jalan komplek': 'Complex street', 'room.Halaman': 'Yard', 'room.Komplek': 'Complex',
    'spot.tiket': 'Study desk', 'spot.ketukan': 'Old cabinet', 'spot.resi': 'Fridge', 'spot.surat': 'Mailbox', 'spot.cctv': 'CCTV monitor', 'spot.ronda': 'Watch logbook', 'spot.warung': 'Shop receipt', 'spot.ranidoor': "Rani's front door",
    'door.kamar': 'Bedroom door', 'door.dapur': 'Kitchen door', 'door.tamu': 'Living room door', 'door.makan': 'Dining room door', 'door.depan': 'Front door', 'door.gudang': 'Storeroom door', 'door.rani': "Rani's front door",
    'app.messages': 'Messages', 'app.photos': 'Photos', 'app.contacts': 'Contacts', 'app.notes': 'Notes', 'app.phone': 'Phone', 'app.after': 'AFTER', 'app.open': 'Open {name}',
    'ph.rain': 'Rainy window', 'ph.coffee': 'Forgotten coffee', 'ph.room': 'Bedroom light',
    'ph.todayAt': 'Today, {t}', 'ph.yesterdayAt': 'Yesterday, {t}',
    'ph.viewFull': 'View full photo', 'ph.photo': 'Photo', 'ph.close': 'Close', 'ph.tapClose': 'Tap anywhere to close',
    'ph.back': 'Back', 'ph.closePhone': 'Close phone', 'ph.home': 'Home screen',
    'ph.dateLate': 'SATURDAY, JUNE 15 <span>•</span> EARLY MORNING', 'ph.dateNight': 'FRIDAY, JUNE 14 <span>•</span> NIGHT',
    'ph.notesCount': 'NOTES {n}/{m}', 'ph.afterFound': 'AFTER: {n} secrets found', 'ph.afterHint': 'Read the files to find leads',
    'ph.noNet': 'No network', 'ph.locked': 'Device locked',
    'ph.encrypted': 'Encrypted messages', 'ph.today': 'TODAY', 'ph.convs': '{n} conversations', 'ph.tabContacts': 'Contacts', 'ph.tabFilter': 'Filter',
    'ph.contactsCount': '{n} contacts', 'ph.newest': 'RECENT', 'ph.info': 'INFORMATION', 'ph.number': 'Phone number', 'ph.note': 'Notes',
    'ph.noteBiz': 'Business contact', 'ph.noteLocal': 'Saved on this device', 'ph.secretFound': '1 secret found ›', 'ph.callNA': 'Calls unavailable', 'ph.callBtn': 'Call', 'ph.msgBtn': 'Message',
    'ph.personal': 'Personal collection', 'ph.savedLocal': 'Saved on this device.', 'ph.notInCamera': 'This file is not in the camera history.', 'ph.photosCount': '{n} photos',
    'ph.justNow': 'JUST NOW', 'ph.recents': 'Recents', 'ph.items': '{n} items',
    'ph.notesTitle': 'Notes', 'ph.notesN': '{n} notes',
    'ph.lockedFile': 'Locked file', 'ph.opensMidnight': 'Opens at exactly midnight', 'ph.lockedToast': 'This file only opens at exactly 00:00.',
    'ph.clue': 'LEAD · {place}', 'ph.restored': 'File recovered', 'ph.revealed': 'Secret revealed',
    'ph.status': 'STATUS', 'ph.origin': 'FILE ORIGIN', 'ph.noIndex': 'Not in the device index', 'ph.copiedFrom': "Copied from {name}'s phone",
    'ph.lensNote': 'Some lines in this photo could not have been made by a phone lens.', 'ph.fictional': 'All people and events in this archive are fictional.',
    'ph.fullOpen': 'ARCHIVE FULLY OPEN', 'ph.secretsOpen': '{n} SECRETS OPEN', 'ph.strange': 'STRANGE FILE', 'ph.filesOf': '{n} of {m} files',
    'ph.emptyFolder': 'No files in this folder.', 'ph.endScan': '— END OF SCAN RESULTS —',
    'ph.phoneTitle': 'Phone', 'ph.keypad': 'Keypad', 'ph.enterNumber': 'Enter a number', 'ph.noService': 'No service.',
    'ph.incoming': 'INCOMING FILE', 'ph.strangeSilhouette': 'Strange silhouette behind the glass', 'ph.unknownSource': 'UNKNOWN SOURCE', 'ph.newSaved': 'A new photo was saved. The camera is not in use.',
    'ph.viewFile': 'VIEW FILE', 'ph.ignore': 'IGNORE', 'ph.na': 'Not available.',
  },
};

/** Translate a key for the current language; `{name}` placeholders are filled from vars. */
export function t(key, vars) {
  let s = (D[current] && D[current][key]) ?? D.id[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
export const roomName = id => t('room.' + id);
export const hasKey = (key, lang) => !!(D[lang] && key in D[lang]);
export const allKeys = () => Object.keys(D.id);
