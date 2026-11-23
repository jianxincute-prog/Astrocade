# Bang Bulat Naik Gunung

Game 3D bergaya **HD-2D** (ala Octopath Traveler): sprite pixel-art 2D sebagai billboard di dunia 3D voxel.
3 peta acak lewat gacha (carousel berputar kiri ke kanan): Lereng Hijau (batu jatuh, papan ambruk), Puncak Salju (lantai licin, angin, es jatuh), Gunung Api (geyser lava, platform ambruk).
Meme platformer: Bang Bulat berlari & melompat melewati padang rumput, platform melayang, lereng gunung, sampai puncak.
Jatuh dari tinggi atau kena batu = **ragdoll** kocak (kepala, badan, tangan, kaki terpisah & lemas), lalu bangun lagi.

## Kontrol
- Sentuh: tombol ◀ ▶ (lari) dan ⬆ (lompat, tahan = lebih tinggi). PC: A/D atau panah, Spasi/W lompat, Esc/P jeda.

## Struktur kode
- `index.html` kerangka, CSS UI, layar loading, lapisan efek (tilt-shift/glow/vignette via CSS).
- `game.js` semua logika: muat three.js dari CDN, tekstur pixel prosedural (canvas), level (`buildLevel`), geometri voxel
  yang digabung (`addBox`/`geoToMesh`), karakter dari 6 bagian sprite (`part`), fisika pemain (AABB), ragdoll (`startRagdoll`,
  `stepRagdoll`), batu jatuh (`updateRocks`), koin (instanced), checkpoint bendera, UI berlapis, audio WebAudio prosedural,
  tier kualitas Auto/Low/Med/High, simpan progres & leaderboard lewat `lib`.
- `game_config.json` angka yang bisa disetel (`lib.showGameParameters`), teks UI, deklarasi leaderboard (skor tertinggi dulu).

## Aturan skor
`skor = tinggi maksimum x 10 + koin x 25 (+ bonus waktu di puncak)`. Skor dikirim saat sampai puncak atau keluar run.

## Visual HD-2D
Sprite pixel nearest-filter, tekstur voxel 16x16, lapisan gunung paralaks, awan, kelopak beterbangan, rumput/pohon
bergoyang (shader `aSway`), tilt-shift (blur CSS atas/bawah), bloom palsu (glow + soft-light), vignette. Tier Low mematikan
blur/glow/rumput/kelopak dan membatasi pixel ratio.
