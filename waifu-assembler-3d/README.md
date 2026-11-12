# Waifu Assembler 3D

Jelajahi aula restorasi 120 × 120 yang terang, temukan 60 segmen patung yang tersebar di 12 zona, lalu susun kembali dua belas figur (Office, Nurse, CEO, Student, Idol, Janitor, Rin, Aoi, Mei, Yuki, Kana, Sakura) di galeri patung berkubah di utara aula. Blueprint holografik memperlihatkan figur utuh dengan segmen yang sedang dibawa disorot merah.

## Bermain
- Gerak: joystick sentuh atau WASD / panah; geser layar atau seret mouse untuk melihat.
- Dekati komponen di atas plinth marmer, tekan **COLLECT** (atau E), bawa ke plinth bernama set yang sama di galeri, tekan **ASSEMBLE**.
- Kamera orang pertama berada di ketinggian mata 3.2 (patung ±5 unit di atas plinth), jadi wajah patung terlihat sejajar dada–wajah pengunjung.
- Selesaikan lima bagian pada setiap podium untuk memulihkan seluruh figur.

## Editor
Mode **Edit** menghentikan gameplay; plinth di galeri bisa dipilih dan diseret (ditulis ke `gameConfig.podiumPositions`). Patung otomatis menghadap lorong tengah dan ceruk berwarna di dinding ikut berpindah.

## Visual (Babylon.js 9.35)
- Tema museum siang hari (tanpa neon): lantai travertin, dinding plester hangat dengan wainscot kayu dan list kuningan, jendela taman lengkung, langit-langit berkoffer dengan skylight, pohon zaitun, bangku, medali lantai 12 sinar.
- Galeri patung 40 × 92: kubah dengan skylight memanjang, lantai marmer, karpet di lorong tengah, enam plinth di tiap sisi, ceruk pastel warna khas tiap karakter, jendela apse di ujung.
- Scene right-handed, PBR, cahaya hemisfer + matahari + fill, bayangan PCF yang digambar ulang hanya saat isi galeri berubah, probe refleksi siang untuk emas/rambut/sepatu.
- Performa ponsel: geometri tiap bagian patung dipahat sekali (fragmen = clone yang berbagi geometri), tekstur wajah in-game 1024×512, fragmen/patung jauh tidak digambar, label hanya untuk objek dekat.
- Post-processing: bloom lembut, FXAA, tone mapping ACES, vignette hangat. Kelopak sakura + percikan bintang saat mengambil/memasang bagian.
- Patung: wajah anime bertekstur dengan iris berkilau, ekspresi dan blush khas; rambut, aksesori, dan seragam berbeda tiap set. Office memegang clipboard, Nurse melambai, CEO berpose presentasi, Student membawa tas, Idol memegang mikrofon, Janitor memegang pel, Rin memegang buku, Aoi mengepalkan tangan, Mei membawa nampan teh, Yuki memunculkan kristal salju, Kana ber-selfie, Sakura memegang sapu kuil; bagian belum terpasang tampil sebagai hologram.

## Sistem karakter (Character Studio)
- 12 preset wajah (`faces.mjs`): 6 patung + Rin, Aoi, Mei, Yuki, Kana, Sakura — tiap preset punya bentuk rahang/dagu/hidung/bibir, mata, riasan, rambut (potongan, poni, gaya ikat) dan aksesori sendiri.
- 10 ekspresi: neutral, smiling, happy, shy, angry, sad, surprised, wink, crying, smug.
- Bibir per karakter (`LIP_STYLE`): lebar, tebal bibir atas/bawah, bentuk cupid's bow, warna lipstik, lip liner, dan finish (matte, satin, gloss, gradient, frost, bare, beni). Finish juga mengatur kilap 3D lewat peta roughness wajah.
- Ekspresi dibentuk dalam 3D pada mesh kepala: kelopak atas/bawah berupa cangkang mesh yang menutup bola mata 3D, bulu mata 3D mengikuti tepi kelopak, rongga mulut 3D (gigi, lidah) di balik bukaan bibir, air mata 3D; alis, blush dan riasan dilukis pada material kulit kepala yang sama. Tidak ada sprite/plane wajah.
- Tombol **STUDIO** membuka scene studio terpisah (lampu key/fill/rim + beauty light, refleksi studio, bloom/ACES); seret untuk memutar kepala, panah untuk ganti karakter, chip untuk ganti ekspresi. Patung di game memakai ekspresi khas masing-masing.

## Struktur kode
- `game.js` — entry Astrocade (`window.run`), memuat Babylon.js dari CDN.
- `logic.mjs` — aturan murni (pecahan, pengambilan, pemasangan, save).
- `renderer.js` — scene, kamera, cahaya, pipeline, input, HUD, editor.
- `statues.js` — model patung, wajah anime bertekstur, rambut, seragam, dan hologram.
- `faces.mjs` — data preset wajah, ekspresi, ekspresi default, bentuk wajah dan gaya bibir (diuji di Node).
- `poses.mjs` — 12 pose khas berbasis sendi (bahu → siku → pergelangan, arah tangan, telapak, lekuk jari) beserta propertinya.
- `world.js` — aula restorasi, galeri patung, plinth patung, plinth fragmen, label, partikel.
- `ui.js` — markup HUD, CSS, blueprint SVG.
- `tests/logic.test.mjs` — `node --test tests/logic.test.mjs`.
