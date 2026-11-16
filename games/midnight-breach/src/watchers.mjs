import { T } from './three-loader.mjs';

// One old photograph hangs in every corner of the house. It always shows the same pale figure
// at the far end of a dark hallway, and the figure's eyes follow the player. While the player is
// out of the room the figure creeps closer (up to a cap that grows with progress).
const PHOTO_W = 192, PHOTO_H = 256;
const PW = 0.62, PH = 0.83; // plane size in metres
// Head position (px) and radius per stage; the figure grows and moves closer.
const STAGES = [
  { hy: 128, r: 5 }, { hy: 112, r: 8 }, { hy: 98, r: 12 }, { hy: 82, r: 17 }, { hy: 70, r: 24 },
];
export const MAX_STAGE = STAGES.length - 1;

// rotY: 0 faces +z, PI faces -z, +PI/2 faces +x, -PI/2 faces -x.
export const FRAME_SPOTS = [
  { x: -3.3, z: -5.82, rotY: 0, room: 'Kamar' },
  { x: -2.19, z: -0.8, rotY: -Math.PI / 2, room: 'Kamar' },
  { x: 2.3, z: -5.82, rotY: 0, room: 'Ruang tamu' },
  { x: -1.81, z: -1.55, rotY: Math.PI / 2, room: 'Ruang tamu' },
  { x: 4.9, z: -5.82, rotY: 0, room: 'Gudang' },
  { x: 4.19, z: -0.6, rotY: Math.PI / 2, room: 'Gudang' },
  { x: -2.9, z: 0.2, rotY: 0, room: 'Dapur' },
  { x: -2.9, z: 5.82, rotY: Math.PI, room: 'Dapur' },
  { x: 7.81, z: 4.9, rotY: -Math.PI / 2, room: 'Ruang makan' },
  { x: 7.0, z: 5.82, rotY: Math.PI, room: 'Ruang makan' },
];

function drawPhoto(canvas, stage) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  // hallway: back wall, doorway, floor in perspective
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c2428'); bg.addColorStop(0.6, '#2a3438'); bg.addColorStop(1, '#10161a');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0a0e11'; g.fillRect(0, 0, 30, H); g.fillRect(W - 30, 0, 30, H);   // near walls
  g.fillStyle = '#323f43'; g.fillRect(58, 40, 76, 190);                              // doorway glow
  g.fillStyle = '#1a2226'; g.fillRect(64, 46, 64, 184);
  g.strokeStyle = '#46565a'; g.lineWidth = 3; g.strokeRect(58, 40, 76, 190);
  g.fillStyle = '#141b1e';                                                           // floor
  g.beginPath(); g.moveTo(0, 215); g.lineTo(W, 215); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.strokeStyle = 'rgba(120,140,145,.18)'; g.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(96 + i * 12, 215); g.lineTo(96 + i * 60, H); g.stroke(); }
  // flash glare
  const glare = g.createRadialGradient(96, 120, 6, 96, 120, 150);
  glare.addColorStop(0, 'rgba(220,235,240,.22)'); glare.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glare; g.fillRect(0, 0, W, H);

  // the figure
  const { hy, r } = STAGES[stage];
  const cx = W / 2;
  const shoulder = r * 4.2;
  g.fillStyle = '#06070a';
  g.beginPath();
  g.moveTo(cx - shoulder * 0.5, hy + r * 1.9);
  g.quadraticCurveTo(cx - shoulder * 0.62, hy + r * 2.2, cx - shoulder * 0.62, hy + r * 3.2);
  g.lineTo(cx - shoulder * 0.52, H + 10); g.lineTo(cx + shoulder * 0.52, H + 10);
  g.lineTo(cx + shoulder * 0.62, hy + r * 3.2);
  g.quadraticCurveTo(cx + shoulder * 0.62, hy + r * 2.2, cx + shoulder * 0.5, hy + r * 1.9);
  g.closePath(); g.fill();
  g.fillRect(cx - r * 0.45, hy + r * 0.7, r * 0.9, r * 1.4);                         // neck
  // face: pale oval, mostly in shadow
  const face = g.createRadialGradient(cx, hy - r * 0.2, r * 0.1, cx, hy, r * 1.2);
  face.addColorStop(0, stage >= 2 ? '#c9cfd0' : '#7f8a8c'); face.addColorStop(1, '#171b1e');
  g.fillStyle = face;
  g.beginPath(); g.ellipse(cx, hy, r * 0.82, r * 1.05, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#05060a';                                                           // hair + eye sockets
  g.beginPath(); g.ellipse(cx, hy - r * 0.55, r * 0.9, r * 0.6, 0, Math.PI, Math.PI * 2); g.fill();
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.36, hy - r * 0.08, r * 0.24, r * 0.17, 0, 0, Math.PI * 2); g.fill(); }
  if (stage >= 3) { g.fillStyle = '#05060a'; g.beginPath(); g.ellipse(cx, hy + r * 0.58, r * 0.28, r * 0.07, 0, 0, Math.PI * 2); g.fill(); }

  // aged-photo treatment
  for (let i = 0; i < 1100; i++) {
    g.fillStyle = `rgba(${200 + (i % 55)},${210 + (i % 40)},${210},${0.03 + (i % 7) * 0.012})`;
    g.fillRect((i * 97) % W, (i * 53) % H, 1 + (i % 3 === 0), 1);
  }
  g.strokeStyle = 'rgba(210,220,220,.14)'; g.lineWidth = 1;
  for (const [x1, y1, x2, y2] of [[20, 10, 34, 230], [150, 0, 140, 120], [90, 180, 110, 256]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.78)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(90,70,40,.12)'; g.fillRect(0, 0, W, H);                        // sepia wash
}

export function createWatchers({ group }) {
  const textures = STAGES.map((_, stage) => {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_W; canvas.height = PHOTO_H;
    drawPhoto(canvas, stage);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  });
  const frameMat = new T.MeshLambertMaterial({ color: 0x3a2618, flatShading: true });
  const matMat = new T.MeshLambertMaterial({ color: 0xd8d0bc, flatShading: true });
  const eyeWhiteMat = new T.MeshBasicMaterial({ color: 0xe9f2ff });
  const pupilMat = new T.MeshBasicMaterial({ color: 0x050608 });
  const eyeGeo = new T.CircleGeometry(1, 10);
  const planeGeo = new T.PlaneGeometry(PW, PH);
  const photoMats = textures.map(map => new T.MeshLambertMaterial({ map, emissive: 0x1a1d20, emissiveMap: map }));

  const frames = FRAME_SPOTS.map((spot, i) => {
    const root = new T.Group();
    root.position.set(spot.x, 1.12, spot.z);
    root.rotation.y = spot.rotY;
    const border = new T.Mesh(new T.BoxGeometry(PW + 0.2, PH + 0.2, 0.07), frameMat);
    const mat = new T.Mesh(new T.BoxGeometry(PW + 0.07, PH + 0.07, 0.075), matMat);
    const photo = new T.Mesh(planeGeo, photoMats[0]);
    photo.position.z = 0.042;
    root.add(border, mat, photo);
    const eyes = [-1, 1].map(() => {
      const white = new T.Mesh(eyeGeo, eyeWhiteMat);
      const pupil = new T.Mesh(eyeGeo, pupilMat);
      white.position.z = 0.05; pupil.position.z = 0.052;
      root.add(white, pupil);
      return { white, pupil };
    });
    group.add(root);
    const frame = { i, spot, root, photo, eyes, stage: 0, creep: 6 + (i % 5) * 2.2, seen: false };
    placeEyes(frame);
    return frame;
  });

  function placeEyes(frame) {
    const { hy, r } = STAGES[frame.stage];
    const toX = u => (u / PHOTO_W - 0.5) * PW;
    const toY = v => (0.5 - v / PHOTO_H) * PH;
    const px = PW / PHOTO_W; // metres per pixel
    frame.eyes.forEach((eye, k) => {
      const s = k === 0 ? -1 : 1;
      const ex = toX(PHOTO_W / 2 + s * r * 0.36), ey = toY(hy - r * 0.08);
      const rw = Math.max(0.012, r * 0.2 * px), rh = rw * 0.78;
      eye.white.position.x = ex; eye.white.position.y = ey;
      eye.white.scale.set(rw, rh, 1);
      eye.pupil.userData.base = { x: ex, y: ey, rw, rh };
      eye.pupil.scale.set(rw * 0.55, rw * 0.55, 1);
      eye.pupil.position.x = ex; eye.pupil.position.y = ey;
    });
  }
  function setStage(frame, stage) {
    frame.stage = Math.max(0, Math.min(MAX_STAGE, stage));
    frame.photo.material = photoMats[frame.stage];
    placeEyes(frame);
  }

  return {
    frames,
    /**
     * dt, player position, current room name, stage cap, and whether it is after midnight.
     * Returns { fear, newlyNoticed } where fear is a weighted count of photos that can see the player.
     */
    update(dt, px, pz, room, cap, late, time) {
      let fear = 0, noticed = null;
      for (const f of frames) {
        const sp = f.spot;
        const dx = px - sp.x, dz = pz - sp.z;
        const cos = Math.cos(sp.rotY), sin = Math.sin(sp.rotY);
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos; // player in frame-local coords
        const dist = Math.hypot(dx, dz);
        const sameRoom = sp.room === room;
        // creep closer while nobody is looking
        if (!sameRoom && f.stage < cap) {
          f.creep -= dt;
          if (f.creep <= 0) { setStage(f, f.stage + 1); f.creep = 7 + ((f.i * 3) % 6); }
        }
        // eyes follow the player
        const look = lz > 0.05 ? Math.max(-1, Math.min(1, lx / Math.max(0.6, lz))) : 0;
        const lookY = Math.max(-1, Math.min(1, (0.2 - 1.1) / Math.max(0.8, dist)));
        for (const eye of f.eyes) {
          const b = eye.pupil.userData.base;
          eye.pupil.position.x = b.x + look * b.rw * 0.42;
          eye.pupil.position.y = b.y + lookY * b.rh * 0.35 * 2;
          const pulse = f.stage >= 3 ? 1 + 0.12 * Math.sin(time * 5 + f.i) : 1;
          eye.white.scale.set(b.rw * pulse, b.rh * pulse, 1);
        }
        eyeWhiteColor(late);
        if (sameRoom && lz > 0.2 && dist < 9) {
          fear += (f.stage + 1) / 5;
          if (!f.seen && f.stage >= 1 && dist < 4.5) { f.seen = true; noticed = f; }
        }
      }
      return { fear, newlyNoticed: noticed };
    },
    setStage,
    reset() { for (const f of frames) { setStage(f, 0); f.creep = 6 + (f.i % 5) * 2.2; f.seen = false; } },
    stageSummary: () => frames.map(f => f.stage),
  };

  function eyeWhiteColor(late) {
    eyeWhiteMat.color.setHex(late ? 0xffd0d0 : 0xe9f2ff);
  }
}
