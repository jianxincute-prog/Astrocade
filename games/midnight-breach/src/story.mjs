// All names, messages, portraits and "scandals" in this found-phone story are fictional.
// Gossip files are embarrassing-but-harmless comedy; the main plot is a quiet, non-graphic mystery.
export const CONTACTS = [
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', label: 'Teman kampus', status: 'Terakhir terlihat: tidak diketahui' },
  { id: 'dimas', name: 'Dimas Arta', initials: 'DA', tint: 'blue', label: 'Teman band', status: 'Aktif kemarin' },
  { id: 'laras', name: 'Kak Laras', initials: 'KL', tint: 'gold', label: 'Kakak • keluarga', status: 'Aktif 2 jam lalu' },
  { id: 'hendra', name: 'Om Hendra', initials: 'OH', tint: 'blue', label: 'Om • keluarga', status: 'Mengetik…' },
  { id: 'wati', name: 'Bu Wati', initials: 'BW', tint: 'coral', label: 'Tetangga depan', status: 'Terakhir terlihat 23:39' },
  { id: 'darto', name: 'Pak Darto', initials: 'PD', tint: 'gold', label: 'Tetangga sebelah', status: 'Tidak aktif' },
  { id: 'nara', name: 'Nara Aster', initials: 'NA', tint: 'violet', label: 'Penyanyi • kontak bisnis', status: 'Terakhir terlihat 23:58' },
  { id: 'bima', name: 'Bima Satya', initials: 'BS', tint: 'violet', label: 'Aktor • kontak bisnis', status: 'Tidak aktif' },
  { id: 'jessa', name: 'Jessa Moon', initials: 'JM', tint: 'coral', label: 'Selebgram • kontak bisnis', status: 'Live 1 jam lalu' },
];

export const THREADS = [
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', preview: 'Nanti aku jelasin.', time: '23:41', messages: [
    ['them', 'Kamu masih simpan tiket yang kutitipkan?'], ['me', 'Yang dari stasiun lama?'], ['them', 'Iya. Jangan dibuang dulu ya.'], ['them', 'Nanti aku jelasin.'], ['them', 'Pesan ini belum terkirim.'],
  ] },
  { id: 'hendra', name: 'Om Hendra', initials: 'OH', tint: 'blue', preview: 'Foto gym Om jangan di-zoom ya', time: '23:12', messages: [
    ['them', 'Foto Om di grup keluarga keren kan? Hasil 6 bulan nge-gym 💪'], ['me', 'Itu barbelnya dari kardus ya Om?'], ['them', 'Jangan di-zoom.'], ['them', 'Tante belum tahu.'],
  ] },
  { id: 'wati', name: 'Bu Wati', initials: 'BW', tint: 'coral', preview: 'Nak, tadi kamu ke rumah Ibu lagi?', time: '21:05', messages: [
    ['them', 'Nak, tadi kamu ke rumah Ibu lagi?'], ['me', 'Maaf Bu?'], ['them', 'Kamu tanya soal seseorang bernama Rani. Ibu tidak kenal.'], ['them', 'Kamu bilang ini sudah ke-7 kalinya.'],
  ] },
  { id: 'unknown', name: 'Nomor tidak dikenal', initials: '?', tint: 'violet', preview: 'JAM 00:00 — JANGAN LIHAT KAMERA.', time: '23:47', messages: [
    ['them', 'AFTER menyimpan apa yang ingin kamu lupakan.'], ['them', 'Rani tidak hilang. Dia disimpan.'], ['them', 'Jam 00:00 — JANGAN LIHAT KAMERA.'],
  ] },
];

export const NOTES = [
  { title: 'Daftar belanja', date: 'Hari ini', body: 'Teh melati\nBaterai AA\nMartabak titipan Om Hendra (rahasia)' },
  { title: 'Gosip RT 04', date: 'Kemarin', body: 'Kenapa ada suara karaoke dari rumah Bu Wati jam 1 pagi?\nKenapa mangga di pohon kita habis lagi?' },
  { title: 'Catatan tanpa judul', date: '23:49', body: 'Rani tidak membalas sejak sore.\nAplikasi AFTER ada di ponselku, tapi aku tidak ingat memasangnya.' },
];

// The five main clues. Each is hinted by one AFTER file and discovered in the house.
export const CLUES = [
  { id: 'tiket', from: 'rani-file', place: 'Meja belajar · Kamar',
    teaser: 'Rani menitipkan sesuatu. Tiket itu mungkin masih di meja belajarmu.',
    title: 'Tiket sekali jalan',
    text: 'Di balik tiket kereta ada tulisan tanganmu sendiri: "Rani tidak menghilang. Aku yang menghapusnya."',
    note: { title: 'Tulisan di balik tiket', date: 'Tiket', body: 'Rani tidak menghilang.\nAku yang menghapusnya.\nJangan percaya jam di ponsel ini.' } },
  { id: 'ketukan', from: 'dimas-file', place: 'Lemari tua · Ruang tamu',
    teaser: 'Tiga ketukan di akhir lagu. Lemari tua di ruang tamu ikut berbunyi tiga kali.',
    title: 'Kaset di lemari tua',
    text: 'Di balik panel lemari ada kaset kecil. Suara Rani: "Kalau kamu mendengar ini, jangan pasang AFTER lagi."',
    note: { title: 'Kaset Rani', date: 'Lemari tua', body: '"Kalau kamu mendengar ini,\njangan pasang AFTER lagi."\nSuara itu suara Rani.' } },
  { id: 'resi', from: 'laras-file', place: 'Kulkas · Dapur',
    teaser: 'Kak Laras menyembunyikan struk di bawah meja dapur. Coba periksa kulkas.',
    title: 'Stiker di kulkas',
    text: 'Stiker kuning di pintu kulkas, tulisan tanganmu: "Percobaan ke-7. AFTER dipasang 23:47 dari ponselmu. Setiap malam sama."',
    note: { title: 'Stiker kulkas', date: 'Dapur', body: 'Percobaan ke-7.\nAFTER dipasang 23:47\ndari ponselmu sendiri.\nSetiap malam sama.' } },
  { id: 'surat', from: 'wati-file', place: 'Kotak surat · Halaman depan',
    teaser: 'Bu Wati sering melihat sesuatu dari jendelanya. Cek kotak surat di halaman.',
    title: 'Surat Bu Wati',
    text: 'Surat Bu Wati: "Nak, tiap tengah malam kamu menangis di teras dan bertanya soal Rani. Ibu tidak kenal siapa dia, tapi fotonya ada di pagar."',
    note: { title: 'Surat Bu Wati', date: 'Kotak surat', body: 'Tiap tengah malam kamu\nmenangis di teras dan\nbertanya soal Rani.\nBu Wati tidak mengenalnya.' } },
  { id: 'cctv', from: 'darto-file', place: 'Monitor CCTV · Ruang makan',
    teaser: 'CCTV Pak Darto merekam rumahmu saat subuh. Rekamannya ada di monitor ruang makan.',
    title: 'Rekaman CCTV 05:12',
    text: 'Rekaman subuh: kamu membuka pintu gudang, membawa koper kecil, lalu keluar dengan tangan kosong. Tidak ada tanda Rani pernah pulang.',
    note: { title: 'Rekaman 05:12', date: 'CCTV', body: 'Kamu masuk ke gudang\nmembawa koper kecil.\nKeluar dengan tangan kosong.\nSetiap subuh.' } },
];
export const CLUES_TO_OPEN_STORAGE = 4;

// category drives AFTER's filter chips. scene is the photo key in SCENE_ASSETS.
export const ARCHIVE = [
  { id: 'rani-file', category: 'TEMAN', name: 'Audisi yang "lolos final"', person: 'Rani Putri · teman kampus', time: '23:41', scene: 'aib_rani', label: 'VIDEO • 00:47', clue: 'tiket',
    description: 'Rani mengaku lolos final audisi penyanyi. Rekaman aslinya: ia tergelincir di panggung saat nada tinggi, lalu juri menekan tombol merah tiga kali. Hari ini ia hilang tanpa kabar.' },
  { id: 'dimas-file', category: 'TEMAN', name: 'Demo track 4', person: 'Dimas Arta · teman band', time: '22:16', scene: 'aib_dimas', label: 'AUDIO • 03:13', clue: 'ketukan',
    description: 'Gitaris "paling sangar" di band ini ternyata menulis lagu cinta mellow untuk kucingnya, Mochi. Di akhir lagu terdengar tiga ketukan yang tidak ada di partitur.' },
  { id: 'laras-file', category: 'KELUARGA', name: 'Masakan rumahan 40 ribu followers', person: 'Kak Laras · kakak', time: '19:20', scene: 'aib_laras', label: 'FOTO • DAPUR', clue: 'resi',
    description: 'Akun resep Kak Laras viral karena "masak sendiri setiap hari". Di bawah meja dapur: tumpukan kantong pesan-antar yang belum sempat disembunyikan.' },
  { id: 'hendra-file', category: 'KELUARGA', name: 'Enam bulan nge-gym', person: 'Om Hendra · om', time: '23:12', scene: 'aib_hendra', label: 'FOTO • TIDAK DIEDIT',
    description: 'Foto "hasil gym" di grup keluarga diambil di ruang tamu. Barbelnya dari kardus dicat hitam, dan martabak manis menunggu di meja sebelahnya.' },
  { id: 'wati-file', category: 'TETANGGA', name: 'Konser tengah malam', person: 'Bu Wati · tetangga depan', time: '01:04', scene: 'aib_wati', label: 'VIDEO • JENDELA', clue: 'surat',
    description: 'Tetangga yang paling sering menegur soal berisik ternyata karaoke rock tiap malam Sabtu, lengkap dengan lampu disko. Dari jendelanya ia juga melihat seluruh halaman rumahmu.' },
  { id: 'darto-file', category: 'TETANGGA', name: 'Misteri mangga hilang', person: 'Pak Darto · tetangga sebelah', time: '05:12', scene: 'aib_darto', label: 'CCTV • SUBUH', clue: 'cctv',
    description: 'Selama tiga bulan mangga di halaman selalu habis. CCTV subuh merekam Pak Darto naik tangga lipat, sarung diikat di kepala, sambil membawa ember. Kameranya juga menyorot rumahmu.' },
  { id: 'nara-file', category: 'ARTIS', name: 'Skandal lip-sync', person: 'Nara Aster · penyanyi', time: '23:58', scene: 'aib_nara', label: 'BACKSTAGE • EKSKLUSIF',
    description: 'Konser "100% live" Nara. Kamera belakang panggung menangkap kru menekan tombol play, sementara mikrofon Nara ternyata tidak tersambung kabel.' },
  { id: 'bima-file', category: 'ARTIS', name: 'Jagoan takut cicak', person: 'Bima Satya · aktor laga', time: '23:59', scene: 'aib_bima', label: 'FOTO • LOKASI SYUTING',
    description: 'Aktor laga yang "melakukan semua adegan bahaya sendiri" berdiri di atas kursi sambil menjerit karena seekor cicak. Pemeran pengganti tertawa di belakangnya.' },
  { id: 'jessa-file', category: 'ARTIS', name: 'Liburan "Bali" di parkiran', person: 'Jessa Moon · selebgram', time: '22:40', scene: 'aib_jessa', label: 'FOTO • DI BALIK LAYAR',
    description: 'Foto liburan pantai mewah Jessa ternyata dipotret di atap parkiran mal: kain hijau, kipas angin, pasir dalam baskom, dan pohon kelapa plastik.' },
  { id: 'breach-01', category: 'TIDAK DIKENAL', name: 'Siluet di balik kaca', person: 'Sumber tidak dikenal', time: '00:00', scene: 'hall', label: 'SUMBER: TIDAK DITEMUKAN',
    description: 'Pantulan di jendela berada lebih dekat daripada ruangan di belakang kamera. Bentuknya terlalu tinggi untuk menjadi manusia. Atau itu bayanganmu sendiri, yang sudah lupa.' },
  { id: 'breach-02', category: 'TIDAK DIKENAL', name: 'Langit dengan mata', person: 'Sumber tidak dikenal', time: '00:01', scene: 'eye', label: 'ORIENTASI: TIDAK MUNGKIN',
    description: 'Awan terbuka menjadi bentuk yang menyerupai mata. Metadata menunjukkan kamera menghadap ke langit-langit.' },
  { id: 'breach-03', category: 'TIDAK DIKENAL', name: 'Lorong tanpa sudut', person: 'Sumber tidak dikenal', time: '00:03', scene: 'corridor', label: 'LOKASI: KOSONG',
    description: 'Semua garis perspektif berakhir pada tempat yang sama. Tidak ada bangunan di alamat yang tersimpan.' },
];

export const ARCHIVE_FILTERS = ['SEMUA', 'TEMAN', 'KELUARGA', 'TETANGGA', 'ARTIS', 'TIDAK DIKENAL'];
export const isMidnightOnly = item => item.category === 'TIDAK DIKENAL';

// Final confrontation with Rani, then a choice. All text is short and tappable.
export const FINALE = [
  { who: 'Rani', text: 'Kamu sudah tujuh kali sampai di sini.' },
  { who: 'Rani', text: 'AFTER bukan aplikasi pencarian. Itu aplikasi yang menyimpan apa yang ingin kamu lupakan.' },
  { who: 'Rani', text: 'Malam itu kita bertengkar. Kamu memintaku pergi, lalu menyesal, lalu memasang AFTER untuk menghapus penyesalannya.' },
  { who: 'Rani', text: 'AFTER menghapus penyesalannya, dan aku ikut terhapus. Tiga ketukan itu aku. Siluet di kaca itu bayanganmu, yang sudah lupa.' },
  { who: 'Rani', text: 'Sekarang pilih. Hapus AFTER, dan aku kembali, tapi kamu lupa semuanya lagi. Atau simpan, dan kamu ingat, tapi aku tetap di sini.' },
];
export const ENDINGS = {
  delete: { title: 'AFTER dihapus', text: 'Rani muncul di pintu, membawa tiket yang sama. Kamu tidak ingat kenapa matamu basah. Di ponselmu hanya ada satu catatan kecil: "Jangan pasang AFTER lagi."' },
  keep: { title: 'AFTER disimpan', text: 'Kamu ingat semuanya. Rani tersenyum dari balik kaca, dan kamu berjanji mencari cara lain. Tengah malam berikutnya, AFTER menerima satu berkas baru: namamu.' },
};

// Neighbours you can talk to outside. Lines change once a related clue has been found.
export const NPC = {
  wati: {
    label: 'Bu Wati',
    lines: [
      { who: 'Bu Wati', text: 'Nak, malam-malam begini masih di luar? Kemarin kamu bertanya soal seseorang bernama Rani. Ibu tidak kenal.' },
      { who: 'Bu Wati', text: 'Kamu bilang itu sudah ke-7 kalinya. Ibu khawatir sama kamu.' },
    ],
    afterClue: 'surat',
    afterLines: [
      { who: 'Bu Wati', text: 'Suratnya sudah kamu baca, Nak? Jangan menangis sendirian di teras lagi ya.' },
    ],
  },
  darto: {
    label: 'Pak Darto',
    lines: [
      { who: 'Pak Darto', text: 'Mangga saya hilang lagi. Bukan kamu kan, Nak?' },
      { who: 'Pak Darto', text: 'Oh iya, kamera saya menyorot rumahmu juga. Rekamannya saya salin ke monitor di ruang makanmu.' },
    ],
    afterClue: 'cctv',
    afterLines: [
      { who: 'Pak Darto', text: 'Sudah lihat rekamannya? Maaf, Bapak tidak tahu untuk apa koper kecil itu kamu bawa ke gudang.' },
    ],
  },
};
