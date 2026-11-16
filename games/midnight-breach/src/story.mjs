// All names, messages, portraits and "scandals" in this found-phone story are fictional.
// Secrets are embarrassing-but-harmless (comedy gossip), never real people.
export const CONTACTS = [
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', label: 'Teman kampus', status: 'Aktif 8 menit lalu' },
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
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', preview: 'Videonya JANGAN disebar ya 😭', time: '23:41', messages: [
    ['them', 'Kamu masih simpan video audisi itu?'], ['me', 'Yang kamu nyanyi dangdut sambil kepeleset?'], ['them', 'JANGAN disebar ya 😭'], ['them', 'Aku bilang ke semua orang aku lolos babak final.'],
  ] },
  { id: 'hendra', name: 'Om Hendra', initials: 'OH', tint: 'blue', preview: 'Foto gym Om jangan di-zoom ya', time: '23:12', messages: [
    ['them', 'Foto Om di grup keluarga keren kan? Hasil 6 bulan nge-gym 💪'], ['me', 'Itu barbelnya dari kardus ya Om?'], ['them', 'Jangan di-zoom.'], ['them', 'Tante belum tahu.'],
  ] },
  { id: 'wati', name: 'Bu Wati', initials: 'BW', tint: 'coral', preview: 'Tolong jangan berisik malam-malam ya', time: '21:05', messages: [
    ['them', 'Mas, tolong jangan berisik malam-malam ya. Ganggu tetangga.'], ['me', 'Baik Bu.'], ['them', 'Saya mau tidur cepat. Sangat cepat.'],
  ] },
  { id: 'unknown', name: 'Nomor tidak dikenal', initials: '?', tint: 'violet', preview: 'JAM 00:00 — JANGAN LIHAT KAMERA.', time: '23:47', messages: [
    ['them', 'Aplikasi AFTER tahu semua rahasia orang di kontakmu.'], ['them', 'Tapi jam 00:00 — JANGAN LIHAT KAMERA.'], ['them', 'Kalau dia muncul di galeri, jangan balas.'],
  ] },
];

export const NOTES = [
  { title: 'Daftar belanja', date: 'Hari ini', body: 'Teh melati\nBaterai AA\nMartabak titipan Om Hendra (rahasia)' },
  { title: 'Gosip RT 04', date: 'Kemarin', body: 'Kenapa ada suara karaoke dari rumah Bu Wati jam 1 pagi?\nKenapa mangga di pohon kita habis lagi?' },
  { title: 'Catatan tanpa judul', date: '23:49', body: 'Aplikasi AFTER tidak ada di daftar unduhan.\nIsinya rahasia semua orang yang kukenal.\nKenapa ada foto baru setiap kali layar mati?' },
];

// category drives AFTER's filter chips. scene is the photo key in SCENE_ASSETS.
export const ARCHIVE = [
  { id: 'rani-file', category: 'TEMAN', name: 'Audisi yang "lolos final"', person: 'Rani Putri · teman kampus', time: '23:41', scene: 'aib_rani', label: 'VIDEO • 00:47',
    description: 'Rani mengaku lolos final audisi penyanyi. Rekaman aslinya: ia tergelincir di panggung saat nada tinggi, lalu juri menekan tombol merah tiga kali.' },
  { id: 'dimas-file', category: 'TEMAN', name: 'Demo track 4', person: 'Dimas Arta · teman band', time: '22:16', scene: 'aib_dimas', label: 'AUDIO • 03:13',
    description: 'Gitaris "paling sangar" di band ini ternyata menulis lagu cinta mellow untuk kucingnya, Mochi. Liriknya: "Mochi, jangan pergi ke rumah tetangga lagi."' },
  { id: 'laras-file', category: 'KELUARGA', name: 'Masakan rumahan 40 ribu followers', person: 'Kak Laras · kakak', time: '19:20', scene: 'aib_laras', label: 'FOTO • DAPUR',
    description: 'Akun resep Kak Laras viral karena "masak sendiri setiap hari". Di bawah meja dapur: tumpukan kantong pesan-antar yang belum sempat disembunyikan.' },
  { id: 'hendra-file', category: 'KELUARGA', name: 'Enam bulan nge-gym', person: 'Om Hendra · om', time: '23:12', scene: 'aib_hendra', label: 'FOTO • TIDAK DIEDIT',
    description: 'Foto "hasil gym" di grup keluarga diambil di ruang tamu. Barbelnya dari kardus dicat hitam, dan martabak manis menunggu di meja sebelahnya.' },
  { id: 'wati-file', category: 'TETANGGA', name: 'Konser tengah malam', person: 'Bu Wati · tetangga depan', time: '01:04', scene: 'aib_wati', label: 'VIDEO • JENDELA',
    description: 'Tetangga yang paling sering menegur soal berisik ternyata karaoke rock tiap malam Sabtu, lengkap dengan lampu disko dan mikrofon berlampu.' },
  { id: 'darto-file', category: 'TETANGGA', name: 'Misteri mangga hilang', person: 'Pak Darto · tetangga sebelah', time: '05:12', scene: 'aib_darto', label: 'CCTV • SUBUH',
    description: 'Selama tiga bulan mangga di halaman selalu habis. CCTV subuh merekam Pak Darto naik tangga lipat, sarung diikat di kepala, sambil membawa ember.' },
  { id: 'nara-file', category: 'ARTIS', name: 'Skandal lip-sync', person: 'Nara Aster · penyanyi', time: '23:58', scene: 'aib_nara', label: 'BACKSTAGE • EKSKLUSIF',
    description: 'Konser "100% live" Nara. Kamera belakang panggung menangkap kru menekan tombol play, sementara mikrofon Nara ternyata tidak tersambung kabel.' },
  { id: 'bima-file', category: 'ARTIS', name: 'Jagoan takut cicak', person: 'Bima Satya · aktor laga', time: '23:59', scene: 'aib_bima', label: 'FOTO • LOKASI SYUTING',
    description: 'Aktor laga yang "melakukan semua adegan bahaya sendiri" berdiri di atas kursi sambil menjerit karena seekor cicak. Pemeran pengganti tertawa di belakangnya.' },
  { id: 'jessa-file', category: 'ARTIS', name: 'Liburan "Bali" di parkiran', person: 'Jessa Moon · selebgram', time: '22:40', scene: 'aib_jessa', label: 'FOTO • DI BALIK LAYAR',
    description: 'Foto liburan pantai mewah Jessa ternyata dipotret di atap parkiran mal: kain hijau, kipas angin, pasir dalam baskom, dan pohon kelapa plastik.' },
  { id: 'breach-01', category: 'TIDAK DIKENAL', name: 'Siluet di balik kaca', person: 'Sumber tidak dikenal', time: '00:00', scene: 'hall', label: 'SUMBER: TIDAK DITEMUKAN',
    description: 'Pantulan di jendela berada lebih dekat daripada ruangan di belakang kamera. Bentuknya terlalu tinggi untuk menjadi manusia.' },
  { id: 'breach-02', category: 'TIDAK DIKENAL', name: 'Langit dengan mata', person: 'Sumber tidak dikenal', time: '00:01', scene: 'eye', label: 'ORIENTASI: TIDAK MUNGKIN',
    description: 'Awan terbuka menjadi bentuk yang menyerupai mata. Metadata menunjukkan kamera menghadap ke langit-langit.' },
  { id: 'breach-03', category: 'TIDAK DIKENAL', name: 'Lorong tanpa sudut', person: 'Sumber tidak dikenal', time: '00:03', scene: 'corridor', label: 'LOKASI: KOSONG',
    description: 'Semua garis perspektif berakhir pada tempat yang sama. Tidak ada bangunan di alamat yang tersimpan.' },
];

export const ARCHIVE_FILTERS = ['SEMUA', 'TEMAN', 'KELUARGA', 'TETANGGA', 'ARTIS', 'TIDAK DIKENAL'];
export const isMidnightOnly = item => item.category === 'TIDAK DIKENAL';
