// NPCs: a few lightweight characters with simple routines (skate loop, walk route, stand and chat),
// short context-aware dialogue and a friendship tier. Far-away NPCs are hidden and not animated.
import { createCharacter } from './character.js';
import { angleDiff, clamp, lerp, approach } from './util.js';
import { ringPt } from './layout.js';

export const TALK_RANGE = 4.2;
const ACTIVE_RANGE = 95;

export const NPC_DEFS = [
  {
    id: 'mika', name: 'Coach Mika', role: 'Skating coach', kind: 'male',
    variant: { skin: 0xc58a64, jacket: 0xe8833a, scarf: 0xf2f2f2, pants: 0x2a2f3d, boot: 0x1c1c22, bootAccent: 0x2aa5c9, glove: 0x3a3f4f, cuff: 0x2a2f3d, hair: { color: 0x1d1612, style: 'short' }, eye: { iris: 0x6a4524 }, brow: { color: 0x1d1612 } },
    behavior: { type: 'skater', speed: 5.4, path: [[40, 2], [50, -14], [38, -30], [16, -26], [10, -6], [22, 10]] },
    intro: ['Hey, new face! I am Coach Mika. I run the lake sessions here.', 'Rule number one: falling is part of learning. Everybody wipes out at first!'],
    greet: [['Back for more ice time? Good. Let us get you gliding.', 'Ready to train? The ice is in great shape today.'], ['Hey! Your strokes are looking smoother already.', 'Nice to see you again. Want a tip?'], ['There you are, champ! The best ice is yours today.', 'My favourite student! Show me what you have got.']],
    chat: ['Push, push, glide. Then breathe. Easy.', 'The secret to speed? Relaxed knees and long strokes.', 'Do not stare at your skates. Look where you want to go.', 'Practice a little every day. The lake will wait for you.'],
    tip(ctx) {
      const s = ctx.skills, order = ['balance', 'control', 'speed', 'braking'].concat(ctx.spinUnlocked ? ['tricks'] : []);
      const weakest = order.reduce((a, k) => (s[k] < s[a] ? k : a), order[0]);
      return {
        balance: 'Tip: when you wobble, ease off the push. Balance grows when you skate steady and recover.',
        control: 'Tip: take wide, smooth turns at speed. Control grows from carving, not from sharp cuts.',
        speed: 'Tip: speed comes with distance. Long smooth strokes, then glide. Do not rush.',
        braking: 'Tip: brake early and gently. Practise stopping from a good speed to build your braking.',
        tricks: 'Tip: spin only when you feel steady, with a bit of speed. Land it and it counts.',
      }[weakest];
    },
  },
  {
    id: 'rin', name: 'Rin', role: 'Young skater', kind: 'female',
    variant: { skin: 0xf3cfb6, jacket: 0x7a5cd6, scarf: 0xffd36b, pants: 0x2b2f45, boot: 0xfff4f8, bootAccent: 0xff8fb1, laces: 0xff8fb1, glove: 0xffd36b, cuff: 0x5a3fb0, glasses: false, hair: { color: 0xe0a84a, style: 'bob' }, hat: { color: 0xff8fb1 }, eye: { iris: 0x4d9a5e }, brow: { color: 0xb07a2a } },
    behavior: { type: 'skater', speed: 3.8, path: [[-28, 14], [-42, 24], [-52, 8], [-42, -8], [-30, 0]] },
    intro: ['Oh! Hi! I am Rin. I am trying to land my first spin before the ice melts!', 'Want to practise together? Do not race me. Okay, maybe race me.'],
    greet: [['Hi again! Watch this... okay, watch the next one.', 'Oh hey! I almost landed it, I swear.'], ['You are getting good! Keep up with me if you can!', 'Hey you! My ankles say hi.'], ['My practice buddy! Let us make today count!', 'Best friend alert! Ready for round two?']],
    chat: ['I saw a fox on the north shore this morning. A real one!', 'If you fall, laugh first. Then get up. That is my trick.', 'I love the lamps at night. The whole lake glows.', 'Coach Mika says I lean too far. I say it looks cool.'],
  },
  {
    id: 'hana', name: 'Hana', role: 'Skate shop', kind: 'female',
    variant: { skin: 0xe9bf9e, jacket: 0x3aa38a, scarf: 0xf6e7d0, pants: 0x3a3340, boot: 0x6a4a3a, bootAccent: 0xe9c27a, glove: 0xf6e7d0, cuff: 0x2a7a68, glasses: true, hair: { color: 0x1a1a22, style: 'bob' }, eye: { iris: 0x4a3322 }, brow: { color: 0x1a1a22 } },
    behavior: { type: 'idle', start: [-19, 119.5], face: [0, 108] },
    intro: ['Welcome to Blade & Edge! I am Hana.', 'Step inside for blades with real grip and glide. We are open from 08:00 to 19:00!'],
    greet: [['Welcome back! Looking for sharper blades?', 'Hello! Come in and try on some skates.'], ['Oh, it is you! I kept a nice pair of boots in your size.', 'Good to see a familiar face!'], ['My favourite customer! You get the first look, always.', 'Hello, friend! The best blades are yours.']],
    chat: ['A sharp blade is a happy blade.', 'Better blades give you more grip and glide. Worth saving up for.', 'Wool scarves are half the sport, honestly.', 'Warm Threads next door does great scarves, too.'],
  },
  {
    id: 'ollie', name: 'Ollie', role: 'Cafe barista', kind: 'male',
    variant: { skin: 0xf0c6aa, jacket: 0x8a5a3a, scarf: 0xd94f4f, pants: 0x2f2f38, boot: 0x3a2a22, bootAccent: 0xd94f4f, glove: 0x8a5a3a, cuff: 0x5a3a24, hair: { color: 0x7a4a24, style: 'short' }, eye: { iris: 0x5f8aa8 }, brow: { color: 0x5a3418 } },
    behavior: { type: 'idle', start: [4, 122], face: [0, 108] },
    intro: ['Cocoa Corner! I am Ollie.', 'A hot drink keeps you steady on the ice. We open at 07:00 and close at 22:00!'],
    greet: [['Hey! Fancy a hot cocoa?', 'Hello again! Smells like cinnamon, right?'], ['Oh, hi! I am practising a new cocoa recipe for you.', 'Back again? I like that.'], ['My favourite regular! Table by the window is yours.', 'Hey, friend! Marshmallows on me today.']],
    chat: ['Marshmallows are a skating tool. Fight me.', 'The lake froze in three days. I timed it with soup.', 'I put cinnamon in everything. It is a lifestyle.', 'Best seat in town: the bench by the fountain.'],
  },
  {
    id: 'baker', name: 'Mr. Baker', role: 'Neighbour', kind: 'male',
    variant: { skin: 0xdcaa86, jacket: 0x4a5568, scarf: 0x9a6a3e, pants: 0x30323c, boot: 0x2a2a30, bootAccent: 0x9a6a3e, glove: 0x4a5568, cuff: 0x2d3748, hair: { color: 0xc9c9d0, style: 'short' }, hat: { color: 0x2d3748 }, eye: { iris: 0x7a6a3a }, brow: { color: 0x9a9aa2 } },
    behavior: { type: 'walker', speed: 1.5, pingpong: true, path: [[0, 100], [0, 87], ringPt(75), ringPt(60), ringPt(45), ringPt(30), ringPt(15), ringPt(0), [105, 12]] },
    intro: ['Morning! Walter Baker, but everyone says Mr. Baker.', 'I walk this path every day. Best view of the lake in town.'],
    greet: [['Morning again! Lovely cold today.', 'Ah, hello there. Out for a stroll?'], ['Good to see you! You skate better every day.', 'Hello, young one. Mind the ice by the dock.'], ['Ah, my favourite neighbour! Walk with me a while.', 'Hello, friend! Still the best view in town.']],
    chat: ['I used to skate here before my knees retired.', 'The bakery on the plaza? The cinnamon buns are legendary.', 'Winter is just summer taking a long nap.', 'Watch the old oak by the park. It has seen every winter.'],
  },
];

export const friendTier = (p) => (p < 2 ? 0 : p < 6 ? 1 : 2);
export const friendLabel = (p) => (p < 1 ? 'New face' : p < 3 ? 'Acquaintance' : p < 6 ? 'Friend' : 'Close friend');
export const friendHearts = (p) => (p < 1 ? 0 : p < 3 ? 1 : p < 6 ? 2 : 3);

export function createNpcs(scene, heightAt = () => 0) {
  const list = NPC_DEFS.map((def) => {
    const ch = createCharacter(def.kind, { variant: def.variant, lite: true });
    scene.add(ch.root);
    const b = def.behavior, start = b.type === 'idle' ? b.start : b.path[0], nx = b.type === 'idle' ? b.face : b.path[1];
    const s = {
      x: start[0], z: start[1], y: 0, h: Math.atan2(nx[0] - start[0], nx[1] - start[1]), vx: 0, speed: 0, mode: b.type === 'skater' ? 'skate' : 'walk', state: 'ok',
      strokeT: 0, strokeLeg: 0, stroking: false, strideAmp: 0, stride: Math.random() * 6, b: 0, steer: 0, brake: 0, fallAmt: 0, fallDir: -1, spin: null, spinAng: 0,
    };
    return { def, id: def.id, name: def.name, role: def.role, ch, s, wi: 1, dir: 1, pause: 0, talks: 0, active: true, clock: Math.random() * 10 };
  });

  function turnTo(s, target, rate, dt) {
    const diff = angleDiff(target, s.h), dh = clamp(diff, -rate * dt, rate * dt);
    s.h += dh; return diff;
  }
  function skate(n, dt) {
    const s = n.s, b = n.def.behavior, wp = b.path[n.wi], dx = wp[0] - s.x, dz = wp[1] - s.z;
    if (Math.hypot(dx, dz) < 4.5) n.wi = (n.wi + 1) % b.path.length;
    const diff = turnTo(s, Math.atan2(dx, dz), 1.5, dt);
    s.steer = -clamp(diff * 1.5, -1, 1);
    const target = b.speed * (Math.abs(diff) > 0.9 ? 0.6 : 1);
    if (!s.stroking && s.speed < target * 0.96) { s.stroking = true; s.strokeT = 0; }
    if (s.stroking) {
      s.strokeT += dt / lerp(0.8, 1.25, clamp(s.speed / 10, 0, 1));
      if (s.strokeT < 0.5 && s.speed < target) s.speed += 7 * 1.9 * Math.sin(Math.PI * s.strokeT / 0.5) * (1 - clamp(s.speed / 10, 0, 1) * 0.7) * dt;
      if (s.strokeT >= 1) { s.strokeT = 0; s.strokeLeg ^= 1; if (s.speed >= target * 0.96) s.stroking = false; }
    }
    s.speed *= Math.exp(-0.1 * dt);
    s.strideAmp = approach(s.strideAmp, s.stroking ? 1 : 0, 4 * dt);
  }
  function walk(n, dt) {
    const s = n.s, b = n.def.behavior;
    if (n.pause > 0) { n.pause -= dt; s.speed = approach(s.speed, 0, 4 * dt); }
    else {
      const wp = b.path[n.wi], dx = wp[0] - s.x, dz = wp[1] - s.z;
      if (Math.hypot(dx, dz) < 1.2) {
        n.pause = 2 + Math.random() * 3;
        if (b.pingpong) { if (n.wi + n.dir < 0 || n.wi + n.dir >= b.path.length) n.dir *= -1; n.wi += n.dir; } else n.wi = (n.wi + 1) % b.path.length;
      } else { const diff = turnTo(s, Math.atan2(dx, dz), 2.5, dt); s.speed = approach(s.speed, Math.abs(diff) > 0.8 ? 0.4 : b.speed, 3 * dt); }
    }
    s.stride += s.speed * 2.3 * dt;
  }
  function idle(n, dt, px, pz) {
    const s = n.s, b = n.def.behavior, near = Math.hypot(px - s.x, pz - s.z) < 9;
    const tx = near ? px : b.face[0], tz = near ? pz : b.face[1];
    turnTo(s, Math.atan2(tx - s.x, tz - s.z), 2, dt); s.speed = 0;
  }

  return {
    list,
    update(dt, px, pz, talkId) {
      for (const n of list) {
        const s = n.s, d = Math.hypot(px - s.x, pz - s.z);
        n.active = d < ACTIVE_RANGE; n.ch.root.visible = n.active;
        if (!n.active) continue;
        n.clock += dt;
        if (n.id === talkId) { turnTo(s, Math.atan2(px - s.x, pz - s.z), 3, dt); s.speed = approach(s.speed, 0, 5 * dt); s.stroking = false; s.strideAmp = approach(s.strideAmp, 0, 4 * dt); s.steer = 0; }
        else if (n.def.behavior.type === 'skater') skate(n, dt);
        else if (n.def.behavior.type === 'walker') walk(n, dt);
        else idle(n, dt, px, pz);
        s.x += Math.sin(s.h) * s.speed * dt; s.z += Math.cos(s.h) * s.speed * dt;
        s.y = s.mode === 'skate' ? 0 : heightAt(s.x, s.z);
        n.ch.pose(s, n.clock); n.ch.place(s);
      }
    },
    nearest(px, pz, maxD = TALK_RANGE) {
      let best = null, bd = maxD;
      for (const n of list) { if (!n.active) continue; const d = Math.hypot(px - n.s.x, pz - n.s.z); if (d < bd) { bd = d; best = n; } }
      return best;
    },
    // ctx: { points, met, skills, spinUnlocked }
    dialogue(n, ctx) {
      const def = n.def, t = friendTier(ctx.points), pick = (arr) => arr[n.talks % arr.length];
      const lines = ctx.met ? [pick(def.greet[t])] : def.intro.slice();
      lines.push(def.tip ? def.tip(ctx) : pick(def.chat));
      n.talks++;
      return lines;
    },
    dispose() { list.forEach((n) => { scene.remove(n.ch.root); n.ch.dispose(); }); },
  };
}
