// Smoke test Playwright untuk Mall Crawler.
//   GAME_HTML  (default ../game_code.html)
//   THREE_JS   (default node_modules/three/build/three.min.js, wajib three r128)
// Menjalankan game dengan `lib` palsu, meng-inject hook __dbg, lalu memeriksa invarian utama.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME = process.env.GAME_HTML || path.join(__dirname, '..', 'game_code.html');
const THREE = process.env.THREE_JS || path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.min.js');
const DBG_FILE = path.join(__dirname, '.game_dbg.html');

const HOOK = 'window.__dbg={state,playerGroup,stores,monsters,colliders,baseColliders,scene,renderer,camera,camState,openStore,resetGame,update,inputs,spawnMonster,segmentBlocked,openedInteriors,audio,lightPool,claimBasecamp,storeSupplies,eatAtBase,npcs,buildSlot,craftWeapon,attackWithWeapon,npcHurt,setPaused,isPaused:()=>paused};\n';
const ANCHOR = '      rafId = requestAnimationFrame(gameLoop);\n    }\n  </script>';

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  if (!ok) failures++;
};

(async () => {
  const html = fs.readFileSync(GAME, 'utf8');
  if (html.split(ANCHOR).length !== 2) throw new Error('anchor hook tidak ditemukan; sesuaikan ANCHOR di tests/smoke.js');
  fs.writeFileSync(DBG_FILE, html.replace(ANCHOR, HOOK + ANCHOR));

  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(THREE), contentType: 'application/javascript' }));
  await page.route(/fonts\.googleapis|cloudfront\.net/, r => r.abort());
  await page.addInitScript(() => {
    window.lib = {
      showGameParameters() {}, getAsset: () => null,
      addPlayerScoreToLeaderboard: async () => ({ rank: 1 }), saveUserGameState: async () => ({}), getUserGameState: async () => null
    };
  });
  await page.goto('file://' + DBG_FILE);
  await page.evaluate(() => run('play'));
  await page.waitForFunction(() => window.__dbg, null, { timeout: 90000 });

  // 1. boot + start
  check('layar judul tampil', await page.evaluate(() => document.getElementById('title-overlay').classList.contains('active')));
  await page.click('#btn-start');
  await page.click('#btn-diff-go');
  check('game mulai & audio dibuat setelah gestur', await page.evaluate(() => __dbg.state.started && !!__dbg.audio.ctx));

  // 2. draw call di beberapa posisi
  const calls = await page.evaluate(() => {
    const d = __dbg, out = [];
    for (const [x, z] of [[0, 12], [0, -60], [68, 0], [-136, -136], [0, 100]]) {
      d.playerGroup.position.set(x, 0, z);
      for (let i = 0; i < 8; i++) d.update(0.05);
      d.renderer.info.reset && d.renderer.info.reset();
      d.renderer.render(d.scene, d.camera);
      out.push(d.renderer.info.render.calls);
    }
    return out;
  });
  check('draw call < 150', Math.max(...calls) < 150, 'maks ' + Math.max(...calls));

  // 3. program shader stabil setelah membuka semua tipe ruangan
  const progs = await page.evaluate(() => {
    const d = __dbg;
    ['monster', 'trap', 'empty', 'supplies'].forEach(t => {
      const s = d.stores.find(x => x.outcome === t && !x.isOpen);
      d.openStore(s);
      d.playerGroup.position.set(s.interiorCenterX, 0, s.interiorCenterZ);
      d.state.hunger = 1; d.state.isInvulnerable = true; d.state.invulnTimer = 1e9; d.state.blackoutNext = 1e9;
      d.update(0.05);
    });
    return d.renderer.info.programs.length;
  });
  check('program shader <= 16', progs <= 16, String(progs));

  // 4. monster tidak menembus dinding saat mengejar lewat lorong
  const wall = await page.evaluate(() => {
    const d = __dbg;
    d.monsters.forEach(m => d.scene.remove(m.group)); d.monsters.length = 0;
    d.stores.forEach(s => { s.isOpen = false; });
    const s = d.stores.find(x => x.outcome === 'monster');
    d.playerGroup.position.set(-136, 0, -136);
    d.openStore(s);
    const m = d.monsters[0];
    let bad = 0;
    for (let i = 0; i < 1200; i++) {
      d.state.hunger = 1; d.state.isInvulnerable = true; d.state.invulnTimer = 1e9;
      d.update(0.05);
      if (d.colliders.some(c => m.x > c.minX && m.x < c.maxX && m.z > c.minZ && m.z < c.maxZ)) bad++;
    }
    return bad;
  });
  check('monster tidak di dalam dinding', wall === 0, wall + ' frame');

  // 5. restart bersih
  const base = await page.evaluate(() => __dbg.baseColliders.length);
  await page.evaluate(() => __dbg.resetGame());
  const after = await page.evaluate(() => ({ c: __dbg.colliders.length, open: __dbg.stores.some(s => s.isOpen || s.interiorGroup), mons: __dbg.monsters.length, hp: __dbg.state.health }));
  check('restart mengembalikan collider & state', after.c === base && !after.open && after.mons === 0 && after.hp === 3);

  // 5b. hanya 1 basecamp + makan/minum dari persediaan basecamp
  const base1 = await page.evaluate(() => {
    const d = __dbg;
    d.state.blackoutNext = 1e9;
    const [A, B] = d.stores.filter(x => x.outcome === 'empty');
    d.openStore(A); d.openStore(B);
    d.claimBasecamp(A); d.claimBasecamp(B);
    d.state.inventory = ['roti', 'air'];
    d.storeSupplies(A);
    d.state.hunger = 0.3;
    d.eatAtBase(A);
    return { claimed: d.state.claimedBasesCount, bClaimed: B.isClaimed, stock: d.state.baseFood + d.state.baseDrink, hunger: d.state.hunger > 0.6 };
  });
  check('hanya 1 basecamp yang bisa diklaim', base1.claimed === 1 && !base1.bClaimed);
  check('makan dari persediaan basecamp', base1.stock === 1 && base1.hunger);
  await page.evaluate(() => __dbg.resetGame());

  // 5c. crafting, senjata, komputer
  const craft = await page.evaluate(() => {
    const d = __dbg;
    const A = d.stores.filter(x => x.outcome === 'empty' && !x.npcOwner)[0];
    d.openStore(A); d.claimBasecamp(A);
    const out = { slots: Object.keys(A.slots || {}).length };
    d.state.inventory = ['papan', 'papan', 'papan', 'papan', 'paku', 'paku', 'paku'];
    d.buildSlot(A, 'craft'); out.table = A.slots.craft.built;
    d.craftWeapon(); out.weapon = d.state.weaponDur;
    d.state.inventory = ['mobo', 'cpu', 'ram'];
    d.buildSlot(A, 'comp'); out.compEarly = A.slots.comp.built;
    d.state.inventory = ['mobo', 'cpu', 'ram', 'layar', 'psu'];
    d.buildSlot(A, 'comp'); out.comp = A.slots.comp.built && d.state.hasComputer;
    return out;
  });
  check('2 slot basecamp', craft.slots === 2);
  check('meja crafting + senjata papan paku', craft.table && craft.weapon === 12);
  check('komputer butuh 5 komponen', !craft.compEarly && craft.comp);
  await page.evaluate(() => __dbg.resetGame());

  // 5d. NPC mengklaim basecamp dan membangun komputer dalam simulasi
  const npc = await page.evaluate(() => {
    const d = __dbg;
    d.state.started = true;
    d.playerGroup.position.set(0, 0, 12);
    let t = 0;
    for (; t < 900 && !d.npcs.some(n => n.online); t += 0.05) {
      d.state.hunger = 1; d.state.isInvulnerable = true; d.state.invulnTimer = 1e9; d.state.blackoutNext = 1e9;
      d.update(0.05);
    }
    return { bases: d.npcs.filter(n => n.base).length, online: d.npcs.filter(n => n.online).length, sec: Math.round(t) };
  });
  check('NPC punya basecamp & komputer online', npc.bases === 2 && npc.online >= 1, `${npc.sec} dtk`);
  const npcLife = await page.evaluate(() => {
    const d = __dbg;
    const n = d.npcs.find(x => x.base);
    d.npcHurt(n, 99, 'hunter');
    const diedHidden = n.dead && !n.group.visible;
    for (let t = 0; t < 16 && n.dead; t += 0.05) { d.state.hunger = 1; d.state.isInvulnerable = true; d.update(0.05); }
    const b = n.base.bounds;
    return { diedHidden, alive: !n.dead && n.hp > 0, inBase: n.x >= b.minX && n.x <= b.maxX && n.z >= b.minZ && n.z <= b.maxZ };
  });
  check('NPC bisa mati lalu respawn di basecamp-nya', npcLife.diedHidden && npcLife.alive && npcLife.inBase);
  await page.evaluate(() => __dbg.resetGame());

  // 5e. ruangan tertutup lagi setelah 20 dtk & isinya berganti jenis
  const cycle = await page.evaluate(() => {
    const d = __dbg;
    d.state.started = true;
    d.npcs.forEach(n => { n.mode = 'rest'; n.timer = 1e9; });
    d.playerGroup.position.set(0, 0, 12);
    const st = d.stores.find(s => s.outcome === 'supplies' && Math.hypot(s.doorX, s.doorZ) > 60);
    const before = st.outcome;
    d.openStore(st);
    const run = sec => { for (let t = 0; t < sec; t += 0.05) { d.state.hunger = 1; d.state.isInvulnerable = true; d.state.invulnTimer = 1e9; d.state.blackoutNext = 1e9; d.update(0.05); } };
    run(18);
    const stillOpen = st.isOpen;
    run(6);
    return { stillOpen, closed: !st.isOpen && !st.interiorGroup, changed: st.outcome !== before && st.outcome !== 'empty' };
  });
  check('ruangan masih terbuka di 18 dtk', cycle.stillOpen);
  check('ruangan tertutup & berganti jenis setelah 20 dtk', cycle.closed && cycle.changed);
  await page.evaluate(() => __dbg.resetGame());

  // 6. jeda membekukan waktu
  await page.evaluate(() => { __dbg.state.started = true; __dbg.setPaused(true); });
  const t0 = await page.evaluate(() => __dbg.state.gameTime);
  await page.evaluate(() => { for (let i = 0; i < 20; i++) __dbg.update(0.05); });
  check('jeda membekukan gameTime', t0 === await page.evaluate(() => __dbg.state.gameTime));
  await page.evaluate(() => __dbg.setPaused(false));

  // 7. run() ulang tidak menggandakan canvas/listener
  await page.evaluate(() => run('play'));
  await page.waitForFunction(() => window.__dbg && window.__dbg.state && !window.__dbg.state.started);
  await page.evaluate(() => run('play'));
  await page.waitForTimeout(500);
  check('satu canvas setelah run() berulang', await page.evaluate(() => document.querySelectorAll('canvas#game-canvas').length) === 1);
  await page.click('#btn-start');
  await page.click('#btn-diff-go');
  await page.click('#btn-mute');
  check('satu klik mute = satu toggle', await page.evaluate(() => __dbg.audio.isMuted === true));

  check('tidak ada error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
  fs.unlinkSync(DBG_FILE);
  console.log(failures ? `\n${failures} pemeriksaan GAGAL` : '\nSemua pemeriksaan lolos');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
