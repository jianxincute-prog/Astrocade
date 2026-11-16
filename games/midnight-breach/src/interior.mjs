import { T } from './three-loader.mjs';

/**
 * Decorative detail for the house: wainscoting, windows with frames and curtains, lamps, rugs,
 * furniture details, kitchen, storage clutter, porch and plinth. Everything is a plain box or
 * cylinder, so world.mjs merges it into a handful of draw calls.
 * ctx = { group, box, M, glow, winMat }
 */
export function buildInterior(ctx) {
  const { group, box: b, M, glow, winMat } = ctx;
  const warm = glow(0xffc880);
  const screen = glow(0x6ac8ff);
  const pale = glow(0xfff2d0);
  const cyl = (r, h, x, z, color, y0 = 0, seg = 8) => {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg), M(color));
    m.position.set(x, y0 + h / 2, z);
    group.add(m);
  };
  const rail = 0xd8cfc0;
  // Wainscot band along a wall face (axis: 'x' = along X at z, 'z' = along Z at x).
  const band = (axis, fixed, from, to, color, h = 0.55) => {
    const len = to - from, mid = (from + to) / 2;
    if (axis === 'x') { b(len, h, 0.05, mid, fixed, color); b(len, 0.05, 0.07, mid, fixed, rail, { y0: h }); }
    else { b(0.05, h, len, fixed, mid, color); b(0.07, 0.05, len, fixed, mid, rail, { y0: h }); }
  };
  const windowFrame = (axis, fixed, at, w = 1.4, y0 = 0.55, h = 0.8) => {
    // pane (shared glow material changes colour with the mood) + light frame + sill
    if (axis === 'x') {
      b(w, h, 0.06, at, fixed, 0, { y0, mat: winMat });
      b(w + 0.16, 0.07, 0.1, at, fixed, rail, { y0: y0 - 0.07 });
      b(w + 0.16, 0.07, 0.1, at, fixed, rail, { y0: y0 + h });
      b(0.07, h, 0.1, at - w / 2 - 0.04, fixed, rail, { y0 });
      b(0.07, h, 0.1, at + w / 2 + 0.04, fixed, rail, { y0 });
      b(0.04, h, 0.08, at, fixed, rail, { y0 });
    } else {
      b(0.06, h, w, fixed, at, 0, { y0, mat: winMat });
      b(0.1, 0.07, w + 0.16, fixed, at, rail, { y0: y0 - 0.07 });
      b(0.1, 0.07, w + 0.16, fixed, at, rail, { y0: y0 + h });
      b(0.1, h, 0.07, fixed, at - w / 2 - 0.04, rail, { y0 });
      b(0.1, h, 0.07, fixed, at + w / 2 + 0.04, rail, { y0 });
      b(0.08, h, 0.04, fixed, at, rail, { y0 });
    }
  };
  const pendant = (x, z, y = 1.3) => {
    b(0.04, 0.4, 0.04, x, z, 0x2a2a30, { y0: y + 0.2 });
    b(0.5, 0.12, 0.5, x, z, 0x2a2a30, { y0: y + 0.42 });
    b(0.22, 0.2, 0.22, x, z, 0, { y0: y, mat: warm });
  };
  const rug = (x, z, w, d, base, trim) => {
    b(w, 0.02, d, x, z, trim, { y0: 0.005 });
    b(w - 0.2, 0.025, d - 0.2, x, z, base, { y0: 0.005 });
    b(w - 0.5, 0.03, 0.06, x, z, trim, { y0: 0.005 });
  };

  // ================= Wainscot, windows, pendant lamps =================
  // Kamar
  band('x', -5.82, -8, -2, 0x3e4468);
  band('z', -7.82, -6, 0, 0x3e4468);
  band('z', -2.17, -6, -3.9, 0x3e4468); band('z', -2.17, -2.1, 0, 0x3e4468);
  band('x', -0.17, -8, -5.9, 0x3e4468); band('x', -0.17, -4.1, -2, 0x3e4468);
  windowFrame('z', -7.87, -3, 1.3);
  b(0.12, 1.2, 0.3, -7.75, -4.3, 0x6a3a5a, { y0: 0.3 }); b(0.12, 1.2, 0.3, -7.75, -1.7, 0x6a3a5a, { y0: 0.3 });
  b(0.12, 1.2, 0.3, -5.9, -5.75, 0x6a3a5a, { y0: 0.3 }); b(0.12, 1.2, 0.3, -4.1, -5.75, 0x6a3a5a, { y0: 0.3 });
  windowFrame('x', -5.88, -5, 1.4);
  pendant(-4.6, -3.0);
  // Ruang tamu
  band('x', -5.82, -2, 4, 0x5a3a2e);
  band('z', 3.83, -6, -3.9, 0x5a3a2e); band('z', 3.83, -2.1, 0, 0x5a3a2e);
  band('x', -0.17, -2, 0.2, 0x5a3a2e); band('x', -0.17, 2.2, 4, 0x5a3a2e);
  band('z', -1.83, -6, -3.9, 0x5a3a2e); band('z', -1.83, -2.1, 0, 0x5a3a2e);
  windowFrame('x', -5.88, 1.0 + 0.0, 1.4); // behind the TV cabinet: dark window
  pendant(1.0, -3.0);
  // Dapur
  band('x', 5.82, -8, -2, 0xe8eef0, 0.9);
  band('z', -7.82, 0, 6, 0xe8eef0, 0.9);
  band('x', 0.17, -8, -5.9, 0xe8eef0, 0.9); band('x', 0.17, -4.1, -2, 0xe8eef0, 0.9);
  band('z', -2.17, 0, 2.2, 0xe8eef0, 0.9); band('z', -2.17, 4.0, 6, 0xe8eef0, 0.9);
  windowFrame('x', 5.88, -4.4, 1.4, 1.0, 0.6);
  pendant(-4.4, 3.6, 1.2);
  // Ruang makan
  band('x', 5.82, -2, 0.1, 0x5a3a2e); band('x', 5.82, 1.9, 8, 0x5a3a2e);
  band('z', 7.82, 0, 6, 0x5a3a2e);
  band('x', 0.17, -2, 0.2, 0x5a3a2e); band('x', 0.17, 2.2, 8, 0x5a3a2e);
  windowFrame('z', 7.87, 3.0, 1.5);
  windowFrame('x', 5.88, 5.2, 1.4);
  b(0.12, 1.2, 0.3, 7.7, 1.8, 0x3a5a5a, { y0: 0.3 }); b(0.12, 1.2, 0.3, 7.7, 4.2, 0x3a5a5a, { y0: 0.3 });
  pendant(3.4, 3.0);
  // Gudang
  band('x', -5.82, 4, 8, 0x3a3d4a, 0.4);
  windowFrame('z', 7.87, -5.0, 0.9, 0.7, 0.6);
  windowFrame('z', 7.87, -0.8, 0.9, 0.7, 0.6);
  b(0.04, 0.12, 0.5, 6.0, -3.0, 0x2a2a30, { y0: 1.5 });
  b(0.24, 0.24, 0.24, 6.0, -3.0, 0, { y0: 1.28, mat: pale });

  // ================= Kamar =================
  b(2.3, 0.9, 0.12, -6.7, -5.88, 0x4a3022);                                   // headboard
  b(2.1, 0.1, 1.7, -6.7, -4.1, 0x5a3a8a, { y0: 0.45 });                        // blanket
  b(2.1, 0.02, 0.2, -6.7, -3.9, 0xc8b0f0, { y0: 0.55 });
  b(0.9, 0.12, 0.5, -7.2, -5.5, 0xeae6f5, { y0: 0.45 }); b(0.9, 0.12, 0.5, -6.2, -5.5, 0xeae6f5, { y0: 0.45 });
  b(0.5, 0.5, 0.5, -5.3, -5.6, 0x6a4a32, { collide: true });                    // bedside table
  b(0.2, 0.3, 0.2, -5.3, -5.6, 0x3a2a20, { y0: 0.5 });
  b(0.22, 0.16, 0.22, -5.3, -5.6, 0, { y0: 0.78, mat: warm });
  b(0.5, 0.45, 0.5, -3.2, -2.0, 0x3a3a50, { collide: true });                   // chair
  b(0.5, 0.5, 0.08, -3.2, -2.25, 0x3a3a50, { y0: 0.45 });
  b(0.5, 0.03, 0.36, -2.7, -1.0, 0x2a2a32, { y0: 0.75 });                       // laptop
  b(0.5, 0.34, 0.03, -2.7, -1.18, 0, { y0: 0.78, mat: screen });
  b(0.12, 0.35, 0.12, -3.85, -1.2, 0x2a2a2a, { y0: 0.75 });                     // desk lamp
  b(0.2, 0.1, 0.2, -3.85, -1.2, 0, { y0: 1.08, mat: warm });
  b(0.4, 0.1, 0.3, -3.55, -0.75, 0x8a3a3a, { y0: 0.75 }); b(0.36, 0.08, 0.28, -3.55, -0.75, 0x3a5a8a, { y0: 0.85 });
  b(0.04, 1.4, 0.02, -6.99, -1.2, 0x2e2218, { y0: 0.05 });                      // wardrobe seam + handles
  b(0.05, 0.2, 0.05, -6.97, -1.38, 0xd4b060, { y0: 0.8 }); b(0.05, 0.2, 0.05, -6.97, -1.02, 0xd4b060, { y0: 0.8 });
  b(0.04, 0.9, 0.6, -7.82, -5.0, 0xa04a6a, { y0: 0.65 });                       // poster
  b(0.04, 0.5, 0.7, -2.18, -0.9, 0x4a6a8a, { y0: 0.7 });
  rug(-5.2, -2.6, 1.8, 1.4, 0x2c3a6a, 0xb8a060);

  // ================= Ruang tamu =================
  b(0.7, 0.22, 0.6, -0.3, -1.1, 0xa04a5a, { y0: 0.5 }); b(0.7, 0.22, 0.6, 1.1, -1.1, 0xa04a5a, { y0: 0.5 });
  b(0.35, 0.3, 0.3, 1.45, -0.95, 0xe0b050, { y0: 0.5 });
  b(1.0, 0.5, 1.0, 3.0, -1.3, 0x4a5a7a, { collide: true });                     // armchair
  b(1.0, 0.5, 0.2, 3.0, -0.85, 0x3e4c68, { y0: 0.5 });
  b(0.5, 0.5, 0.5, -1.45, -1.0, 0x6a4a32, { collide: true });                   // side table + lamp
  b(0.2, 0.3, 0.2, -1.45, -1.0, 0x2a2a2a, { y0: 0.5 }); b(0.26, 0.2, 0.26, -1.45, -1.0, 0, { y0: 0.8, mat: warm });
  b(1.0, 0.1, 0.15, 1.0, -5.45, 0x222226, { y0: 0.9 });                          // soundbar
  b(0.34, 1.5, 1.5, -1.65, -5.0, 0x6a4a2e, { collide: true });                  // bookshelf
  for (const [y, c] of [[0.35, 0xa04a4a], [0.7, 0x3a6a8a], [1.05, 0xc8a050], [1.3, 0x4a8a5a]]) b(0.3, 0.1, 1.3, -1.62, -5.0, c, { y0: y });
  b(0.4, 0.4, 0.4, -1.5, -0.45, 0x5a3e2a, { collide: true });                   // plant
  b(0.6, 0.6, 0.6, -1.5, -0.45, 0x2e7a46, { y0: 0.4 });
  rug(0.6, -3.2, 2.2, 1.6, 0x3a4a5a, 0xc0a070);
  b(0.5, 0.5, 0.06, 3.82, -5.0, 0xd8d0c0, { y0: 0.9 });                         // wall clock
  b(0.38, 0.38, 0.07, 3.82, -5.0, 0xf2eee0, { y0: 0.96 });

  // ================= Gudang =================
  b(0.8, 0.8, 0.8, 7.0, -0.7, 0x7a5a36, { collide: true }); b(0.7, 0.6, 0.7, 7.0, -0.7, 0x8a6a40, { y0: 0.8 });
  cyl(0.32, 0.9, 7.4, -5.3, 0x3a4a5a, 0, 8);
  cyl(0.32, 0.9, 6.7, -5.45, 0x5a3a3a, 0, 8);
  b(0.3, 0.3, 0.4, 7.55, -3.7, 0x9a7a4a, { y0: 0.7 }); b(0.35, 0.25, 0.4, 7.55, -2.7, 0x7a8a9a, { y0: 0.7 });
  b(0.3, 0.3, 0.4, 7.55, -1.9, 0x9a7a4a, { y0: 1.1 }); b(0.3, 0.3, 0.4, 7.55, -3.2, 0x6a5a3a, { y0: 1.1 });
  b(3.4, 0.02, 0.1, 5.8, -4.15, 0xd8b030, { y0: 0.01 });                         // floor marking
  b(0.9, 0.35, 0.5, 5.3, -1.9, 0x8a8a96, { y0: 0 });                              // tool chest
  b(0.04, 0.5, 0.8, 4.18, -5.2, 0x8a3a3a, { y0: 0.7 });                           // fuse box

  // ================= Dapur =================
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) b(1, 0.02, 1, -7.5 + i, 0.5 + j, 0xb4c4c8);
  b(0.95, 0.06, 4.2, -7.5, 3.6, 0x4a4a54, { y0: 0.9 });                           // counter top
  b(0.6, 0.04, 0.8, -7.5, 4.6, 0x8a9aa4, { y0: 0.96 }); b(0.05, 0.3, 0.05, -7.85, 4.6, 0xc0c8d0, { y0: 0.96 });
  b(0.8, 0.05, 0.8, -7.5, 2.6, 0x1a1a1e, { y0: 0.96 });                          // stove
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b(0.22, 0.02, 0.22, -7.5 + dx, 2.6 + dz, 0x3a3a42, { y0: 1.01 });
  cyl(0.15, 0.25, -7.5, 2.6, 0x8a8a92, 1.01, 8);                                  // pot
  b(0.4, 0.6, 3.0, -7.7, 3.8, 0x7a5a42, { y0: 1.05 });                            // wall cabinets
  b(0.05, 0.5, 0.05, -6.92, 1.05, 0xb0b0b8, { y0: 0.5 });                          // fridge handle
  b(0.06, 0.28, 0.28, -6.93, 0.9, 0xf2d15c, { y0: 0.9 });                          // sticker (clue)
  b(0.05, 0.16, 0.16, -6.93, 1.35, 0xd05a5a, { y0: 1.0 }); b(0.05, 0.14, 0.14, -6.93, 0.5, 0x5a8ad0, { y0: 1.0 });
  b(0.3, 0.02, 0.3, -4.6, 3.4, 0xf0f0f0, { y0: 0.75 }); b(0.3, 0.02, 0.3, -4.2, 3.85, 0xf0f0f0, { y0: 0.75 });
  b(0.4, 0.45, 0.4, -3.3, 3.6, 0x6a4a32, { collide: true });                      // second stool
  b(0.5, 0.05, 0.4, -3.0, 5.6, 0x8a5a3a, { y0: 0.4 });

  // ================= Ruang makan =================
  b(2.7, 0.04, 1.4, 3.4, 3.0, 0xc8d0b8, { y0: 0.75 });                            // tablecloth
  for (const [dx, dz] of [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]]) b(0.32, 0.02, 0.32, 3.4 + dx, 3.0 + dz, 0xf4f4f4, { y0: 0.79 });
  b(0.18, 0.4, 0.18, 3.4, 3.0, 0x5a8aa0, { y0: 0.79 }); b(0.32, 0.22, 0.32, 3.4, 3.0, 0xd05a7a, { y0: 1.15 });
  b(0.06, 0.14, 0.06, 2.5, 3.0, 0, { y0: 0.79, mat: warm });
  for (const [dx, dz] of [[-1.5, 0], [1.5, 0], [0, -1.0], [0, 1.0]]) {
    if (dx) b(0.08, 0.45, 0.45, 3.4 + dx + (dx < 0 ? -0.2 : 0.2), 3.0 + dz, 0x5a3e2a, { y0: 0.5 });
    else b(0.45, 0.45, 0.08, 3.4 + dx, 3.0 + dz + (dz < 0 ? -0.2 : 0.2), 0x5a3e2a, { y0: 0.5 });
  }
  b(0.4, 0.02, 0.15, 6.2, 5.2, 0x2a2a2a, { y0: 0.75 });                           // keyboard
  b(0.3, 0.3, 0.3, 7.3, 5.4, 0x4a4a52, { y0: 0.75 });                              // speaker
  b(0.9, 0.35, 0.35, -1.0, 5.55, 0x6a4a32, { collide: true });                     // shoe rack
  b(0.2, 0.1, 0.3, -1.2, 5.55, 0x2a2a2a, { y0: 0.35 }); b(0.2, 0.1, 0.3, -0.8, 5.55, 0xc05a5a, { y0: 0.35 });
  b(1.4, 0.02, 0.8, 1.0, 5.2, 0x3a3a3a, { y0: 0.005 });                            // doormat
  rug(3.4, 3.0, 3.4, 2.2, 0x6a3a3a, 0xc8a060);

  // ================= Exterior: plinth, corners, porch =================
  const plinth = 0x3a3a46;
  b(16.8, 0.25, 0.4, 0, -6.2, plinth); b(0.4, 0.25, 12.4, -8.2, 0, plinth); b(0.4, 0.25, 12.4, 8.2, 0, plinth);
  b(8.2, 0.25, 0.4, -3.95, 6.2, plinth); b(6.2, 0.25, 0.4, 4.95, 6.2, plinth);
  for (const [x, z] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) b(0.42, 1.85, 0.42, x, z, 0x4a4e72);
  b(3.4, 0.12, 1.8, 1.0, 6.95, 0x3a2e48, { y0: 1.95 });                             // porch roof
  b(3.6, 0.06, 2.0, 1.0, 6.95, 0x2a2238, { y0: 2.07 });
  b(0.14, 1.95, 0.14, -0.55, 7.7, 0x8a7a62, { collide: true }); b(0.14, 1.95, 0.14, 2.55, 7.7, 0x8a7a62, { collide: true });
  b(2.4, 0.14, 0.9, 1.0, 6.6, 0x6a6a72); b(2.8, 0.1, 0.5, 1.0, 7.2, 0x5a5a62);        // steps
  b(0.22, 0.22, 0.22, -0.45, 6.2, 0, { y0: 1.45, mat: warm });                        // porch lamp
  b(0.45, 0.5, 0.45, -1.1, 6.8, 0x5a3e2a, { collide: true }); b(0.55, 0.45, 0.55, -1.1, 6.8, 0x2e7a46, { y0: 0.5 });
  b(0.45, 0.5, 0.45, 3.1, 6.8, 0x5a3e2a, { collide: true }); b(0.55, 0.45, 0.55, 3.1, 6.8, 0x3a8a4a, { y0: 0.5 });
  for (let i = 0; i < 6; i++) b(0.8, 0.03, 0.5, 1.0 + (i % 2 ? 0.25 : -0.25), 8.2 + i * 0.85, 0x7a7a82); // stepping stones
  b(0.9, 0.7, 0.5, 8.5, -1.5, 0x9a9aa4, { collide: true });                           // AC unit outside
  b(0.7, 0.5, 0.06, 8.28, -1.5, 0x2a2a30, { y0: 0.1 });
}
