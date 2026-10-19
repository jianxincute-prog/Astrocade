# Steal the Neighbor's Wife: analisis dan rumusan masalah

Sumber: `game_code.html` (646 baris, 194 KB, Three.js r128), `game_config.json`, `asset_map.json`.
Status Astrocade: publik, review `approved`, 3.126 plays.

Analisis ini dari membaca kode saja. Game belum dijalankan, jadi poin yang bertanda **[uji]** masih berupa dugaan.

## 1. Ringkasan game

Stealth 3D orang ketiga di rumah tetangga. Pemain masuk, lalu mencari satu atau lebih "istri", merekrutnya dengan mendekat (jarak < 1,9), dan membawa mereka ke Vespa di pintu keluar. Aset audio ada 13 (tidak ada aset gambar); semua model dibuat prosedural.

| Aspek | Isi |
|---|---|
| Kontrol | Joystick virtual, geser untuk kamera, tombol RUN dan HIDE. Keyboard WASD/Shift/E. |
| Deteksi | Kerucut pandang. Alur: `walk/look` → `sus` (tanda tanya) → `chase` → `search`. Furnitur menghalangi pandangan. |
| Penjaga | Suami (level 1+), anjing (3+), anak (5+), anak perempuan dengan sapu (8+), nenek (12+). |
| Level | 4 tata letak berulang. Kunci dan kamar terkunci mulai level 3. Istri 2 mulai level 6, 3 mulai level 11. Jebakan bebek dan sabun mulai level 11. |
| Skor | `100×level + max(0, 50−waktu)×4`, bonus perfect `250×streak`. Bintang yang sama masuk ke shop. |
| Meta | Shop: Vespa (gratis), Sidecar 1.200 (kapasitas 2), Trike 2.800 (kapasitas 3), 3 skin pemain, Silver Bob 3.000. Leaderboard top 10, personal best, tutorial. |
| Nyawa | 3 nyawa per run. Habis berarti kembali ke level 1. |

Yang sudah bagus: loop-nya jelas (cari, rekrut, kabur), tiap jenis penjaga punya animasi tertangkap sendiri, ada empat preset grafis, dan data shop dinormalisasi dengan hati-hati.

## 2. Temuan

### A. Progres terkunci di balik shop (desain, prioritas tinggi)
- Istri jadi 2 di level 6, sedangkan Vespa hanya muat 1 (`atScooter` ... `wives.length > capacity`). Pemain tidak bisa lanjut tanpa membeli Sidecar (1.200).
- Level 11 butuh Trike (2.800).
- Bintang dari level 1-5 kira-kira 100-500 + bonus waktu per level, jadi 1.200 hampir tidak pernah terkumpul dalam satu run.
- Kalau nyawa habis di level 5, run kembali ke level 1. Pemain bisa macet di level 5-6 tanpa petunjuk alasannya.
- Hanya ada satu toast "Need a 2-wife ride. Open SHOP".

### B. Penjaga manusia tidak punya fase kejar (kesulitan)
- `goChase`: untuk `husband` dan `girl`, begitu alert penuh, langsung `caught()` tanpa kejar-kejaran. Hanya anjing, anak, dan nenek yang benar-benar mengejar.
- Akibatnya RUN tidak berguna melawan suami. Satu-satunya pertahanan adalah tidak terlihat atau bersembunyi.
- Penjaga bergerak `guardSpeed × (1 + 0,08×(level−1))`. Di level 12 sekitar ×1,9, hampir menyamai kecepatan jalan pemain (6). Tidak ada batas atas level.

### C. Persembunyian terlalu kuat (keseimbangan)
- `hidden` membuat pemain tidak masuk `guardTarget` dan tidak bisa ditangkap, tanpa cooldown.
- Penjaga yang sedang mengejar tidak memeriksa lemari. Pemain bisa keluar masuk lemari untuk melewati penjaga. Batas 5 detik tidak mencegah ini.
- Level 2+ ada 3 lemari per sisi (6 total), jadi hampir selalu ada lemari dekat.

### D. Dugaan: pandangan tembus dinding tipis **[uji]**
- `canSee` mengambil sampel garis pandang di `t=2/15 … 14/15` dengan langkah `d/15` (sampai ~0,57 pada jarak 8,5), lalu cek `inSolid(…,0)`.
- Partisi kamar tidur setebal 0,24, jadi bisa terlewat. Dua sampel pertama (`t<0,13`) juga dilewati.
- Dampak yang mungkin: penjaga melihat tembus partisi kamar tidur, atau sebaliknya pemain "tidak terlihat" lewat celah acak. Gejalanya tidak konsisten.

### E. Config dan kode tidak sinkron
- `DEF` di kode: `guardSpeed 2.3`, `alertTime 0.9`. `game_config.json`: `3` dan `1.1`. Yang aktif adalah config, tapi komentar dan nilai asal membingungkan.
- Efek bersihnya: penjaga lebih cepat (+30%), tapi waktu curiga lebih lama (+22%). Belum jelas apakah ini disengaja.

### F. Alur tangkap dan retry
- Animasi tertangkap 3,2-5,6 detik tidak bisa dilewati. Setelah 3 kali tertangkap, total bisa sekitar 12-17 detik hanya menonton.
- `resetAttempt()` tidak mereset `levelTime`, jadi bonus waktu hilang karena percobaan gagal. Itu wajar, tapi tidak dijelaskan ke pemain.
- Tidak ada cara mendapat nyawa tambahan dan tidak ada checkpoint antar level.

### G. UI dan kontrol
- Tombol kanan ditumpuk dengan posisi tetap: MUTE (top 190), FACE (286), SHOP (390), HIDE (bottom 178), RUN (bottom 44). Di layar pendek atau landscape bisa bertabrakan dan menutupi area main **[uji]**.
- Tutorial hanya muncul di level 1; kunci, sabun, dan bebek muncul belakangan tanpa penjelasan selain toast.

### H. Teknis dan performa
- Satu file 194 KB dengan CSS dan logika dalam satu baris panjang. Sulit di-maintain dan di-diff.
- Three.js r128 diambil dari cdnjs saat load. Kalau CDN gagal, layar loading tidak punya fallback atau pesan error **[uji]**.
- Pencarian jalur penjaga memakai `freePt` acak (hingga 300 percobaan). Pada level dengan banyak furnitur bisa menghasilkan waypoint yang buruk; ada `stuckT` sebagai penyelamat.
- Penyimpanan: `commitPersistentMutation` dipanggil tanpa `await` pada `awardShopStars`. Saat gagal, bintang hanya hidup di sesi (ada log, tidak ada peringatan ke pemain).

## 3. Rumusan masalah

1. Bagaimana menghilangkan dinding progres di level 6 dan 11 yang bergantung pada pembelian shop, tanpa merusak ekonomi shop?
2. Bagaimana membuat penjaga manusia (suami, anak perempuan) punya fase kejar yang adil, supaya RUN dan rute kabur bermakna?
3. Bagaimana menyeimbangkan persembunyian: cooldown, dicek penjaga yang mengejar, atau batas pemakaian per level?
4. Apakah garis pandang tembus dinding tipis benar-benar terjadi, dan bagaimana memperbaikinya (langkah sampel ≤ 0,12, atau raycast terhadap kotak)?
5. Bagaimana menyatukan nilai `DEF` dan `game_config.json` dan menetapkan kurva kesulitan yang terukur, termasuk batas atas kecepatan penjaga?
6. Bagaimana mengurangi rasa frustrasi setelah tertangkap: animasi bisa dilewati, nyawa tambahan, atau checkpoint tiap beberapa level?
7. Bagaimana merapikan tata letak tombol mobile dan memperluas tutorial ke mekanik yang muncul belakangan (kunci, sabun, bebek)?
8. Bagaimana menambah ketahanan: pesan jelas bila CDN atau penyimpanan gagal?

## 4. Usulan urutan perbaikan

| Prioritas | Perbaikan | Usaha |
|---|---|---|
| 1 | Masalah 1: pecahkan wall kapasitas (turunkan harga, naikkan hadiah, atau beri Sidecar gratis di level 6 sebagai hadiah) | Kecil |
| 2 | Masalah 4: perbaiki `canSee` dan tes di level dengan kamar tidur | Kecil |
| 3 | Masalah 2 dan 3: fase kejar suami dan aturan hide | Sedang |
| 4 | Masalah 5 dan 6: kurva kesulitan, skip animasi, nyawa | Sedang |
| 5 | Masalah 7 dan 8: UI mobile, tutorial, fallback | Sedang |

Rekomendasi: kerjakan 1 dan 2 dulu. Keduanya kecil dan paling memengaruhi retensi, karena pemain macet di level 6 dan tertangkap tanpa bisa lari.

## 5. Perbaikan yang sudah diterapkan (masalah 1-4)

1. **Dinding kapasitas:** harga Sidecar 1.200 → 600 dan Trike 2.800 → 1.500. Kapasitas dihitung dari kendaraan terbesar yang dimiliki, bukan yang dipilih. Kalau bintang belum cukup untuk membeli kendaraan yang diperlukan, tetangga meminjamkan satu untuk level itu (dicatat di layar clear). Kalau bintang cukup, pemain tetap harus membeli.
2. **Kejar:** suami dan anak perempuan sekarang mengejar (kecepatan kejar 1,7× dan 1,48× kecepatan patroli), tidak lagi langsung menangkap. Skala kecepatan per level dibatasi di level 11 supaya RUN tetap bisa lolos.
3. **Persembunyian:** cooldown 3 detik setelah keluar lemari. Penjaga yang sedang mengejar saat pemain masuk lemari akan menuju lemari itu dan menangkap pemain jika sempat sampai dalam 1,9 satuan.
4. **Garis pandang:** diganti uji tabrakan sinar-kotak yang tepat (`rayDist`). Kerucut pandang visual memakai fungsi yang sama.

Diuji di Chromium headless (Three.js r128 lokal, `lib` di-stub): tidak ada error halaman; pandangan tembus dinding setebal 0,24 kini terblokir; suami menangkap pemain yang diam dalam 0,7 detik dan tidak menangkap pemain yang berlari; lemari memicu penangkapan saat dikejar; cooldown dan logika kapasitas sesuai.

## 6. Daily House, misi, dan papan skor harian

- **Daily House:** satu rumah per hari (level 3-11 dipilih dari tanggal UTC), tata letak, penjaga, istri, kunci, dan jebakan sama untuk semua pemain lewat RNG berbenih. Tiga nyawa, percobaan tak terbatas. Skor: `1000 + 100×level + bonus waktu (90 dtk) + 500 jika perfect + 100×nyawa`. Bonus bintang shop hanya untuk clear pertama hari itu. Kapasitas kendaraan tidak menghalangi di mode ini.
- **Misi:** 3 misi harian dan 2 mingguan, dipilih dari kumpulan berbenih tanggal (reset UTC; mingguan mulai Senin). Progres dan klaim disimpan di profil pemain (`missions`). Hadiah berupa bintang shop. Titik merah di tombol MISSIONS saat ada yang bisa diklaim.
- **Papan skor:** platform hanya mencatat 10 besar dan satu entri per pemain, jadi dipakai satu papan mingguan: skor dikodekan `(minggu+1)×1e6 + skor_mingguan`, sehingga minggu baru otomatis menggeser minggu lama (papan "reset" sendiri, Senin UTC). Skor mingguan = skor Daily House terbaik tiap hari minggu ini (dijumlah) + free run terbaik minggu ini. Angkanya di bawah 2^31. Dua tab: **Daily** (milikmu sendiri: skor tiap hari Senin-Minggu, free run terbaik, total) dan **Best of the Best** (10 besar minggu ini, plus peringkatmu atau selisih untuk masuk 10 besar). Entri lama (angka biasa di bawah 1e6) tidak lagi tampil.
- Catatan: tidak ada rekor global sepanjang masa dan tidak ada papan global per hari. Skor harian hanya masuk lewat total mingguan. Hari dan minggu dihitung dari jam perangkat pemain.
