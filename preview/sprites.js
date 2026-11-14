// 10x10 pixel sprites. Creatures: frames A,B (walk) and C (attack). Houses: frame A.
// '.' = transparent; every other char is looked up in the sprite's own palette.
const OUT = '#1c1420';
const SPRITES = {
  human: {
    pal: { o:'#1c1424', h:'#5b3a22', H:'#8c5c32', s:'#f2c48c', S:'#d49a68', e:'#1c1424', c:'#3f8cff', C:'#86bcff', d:'#2457b8', v:'#1f3f8a', g:'#f0c850', p:'#4a4262', P:'#6a6088', b:'#3a2518', w:'#e8eef8' },
    A: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", ".ohhssSShho.", ".ohsesSeSho.", "..osssSSSo..", "...osSSSo...", "ovCcccccccvo", "ocCcccccccco", "ocCcccccccco", "osggggggggSo", "..oppPpppo..", "..oppo.oppo.", "..obbo.obbo."],
    B: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", ".ohhssSShho.", ".ohsesSeSho.", "..osssSSSo..", "...osSSSo...", "ovCcccccccvo", "ocCcccccccco", "ocCcccccccco", "osggggggggSo", "..oppPpppo..", ".oppo...oppo", ".obbo...obbo"],
    C: ["...oooooo..w", "..ohHHhhho.w", ".ohHhhhhhhow", ".ohhssSShhow", ".ohsesSeShow", "..osssSSSo.w", "...osSSSo..w", "ovCcccccccvw", "ocCcccccccsg", "ocCcccccccso", "osggggggggSo", "..oppPpppo..", "..oppo.oppo.", "..obbo.obbo."],
  },
  elf: {
    pal: { o:'#1c1424', h:'#f3e7a0', H:'#fff6d0', i:'#d4c070', s:'#f8dcc0', S:'#e0b898', e:'#2a8a4a', c:'#c58cf0', C:'#e8c8ff', d:'#8350b8', g:'#40b060', G:'#7be090', p:'#4a3e66', b:'#3a2c50', w:'#e8eef8' },
    A: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccco.", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", "..opo.opo...", "..obo.obo..."],
    B: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccco.", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", ".opo...opo..", ".obo...obo.."],
    C: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccsww", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", "..opo.opo...", "..obo.obo..."],
  },
  dwarf: {
    pal: { o:'#1c1424', g:'#a9b2c0', u:'#6f7886', G:'#e0e6ee', s:'#f0b48a', S:'#c88a64', e:'#1c1424', N:'#e08a6a', r:'#c8662a', R:'#8a4018', c:'#ff9a2e', C:'#ffc060', p:'#5a3a22', b:'#3a2a20', W:'#e0e6ee', x:'#8a5a34', X:'#6a4424' },
    A: ["...occcco...", "..oGgguugo..", ".oGggguuugo.", ".ossesSeSSo.", ".orrsNNSrro.", ".orrrrrrrro.", ".orrrRRrrro.", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", "..obo..obo..", ".obbo..obbo."],
    B: ["...occcco...", "..oGgguugo..", ".oGggguuugo.", ".ossesSeSSo.", ".orrsNNSrro.", ".orrrrrrrro.", ".orrrRRrrro.", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", ".obo....obo.", "obbo....obbo"],
    C: ["...occcco...", "..oGgguugo..", ".oGggguuugWW", ".ossesSeSSWx", ".orrsNNSrrox", ".orrrrrrrrox", ".orrrRRrrrsx", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", "..obo..obo..", ".obbo..obbo."],
  },
  orc: {
    pal: { o:'#14180f', g:'#6cae4a', G:'#9ad46a', u:'#3f7a30', e:'#ffe14a', w:'#f4f1e6', d:'#3a1418', c:'#ff3d3d', m:'#2a2018', C:'#ff7a6a', s:'#c0c4d0', k:'#8a5a30', b:'#4a2a20', x:'#8a5a34', X:'#6a4424' },
    A: ["....ommmmo....", "...ogmmmmuo...", "..ogGgguuguo..", ".oguegguueuuo.", ".oggguguuuuuo.", ".ogwggdduuwuo.", "..ogggguuuuo..", "occGggguuugcco", "oggGgkgukuguuo", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", ".ogggo..ogggo.", ".obbbo..obbbo."],
    B: ["....ommmmo....", "...ogmmmmuo...", "..ogGgguuguo..", ".oguegguueuuo.", ".oggguguuuuuo.", ".ogwggdduuwuo.", "..ogggguuuuo..", "occGggguuugcco", "oggGgkgukuguuo", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", "ogggo....ogggo", "obbbo....obbbo"],
    C: ["....ommmmo..XX", "...ogmmmmuo.XX", "..ogGgguuguo.x", ".oguegguueuuox", ".oggguguuuuuox", ".ogwggdduuwuox", "..ogggguuuuo.x", "occGggguuugccx", "oggGgkgukuguux", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", ".ogggo..ogggo.", ".obbbo..obbbo."],
  },
  werewolf: { // 14x16 elite sprite
    pal: { o:OUT, f:'#6f6a85', F:'#a8a3c2', d:'#403b58', m:'#8e8aa8', s:'#cfcbe0', n:'#0e0a12', e:'#ffb800', E:'#fff2a0', w:'#f6f2e8', r:'#b02a40', c:'#5ef0ff', C:'#2aa5b8', p:'#2f2a3c', P:'#4a4460', b:'#1b1722' },
    A: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..",".ofeEffffEefo.",".oFffssssffFo.","..ofssnnssfo..","...ofwrrwfo...",".oFFoddddoFFo.","oFFfmdmmdmfFFo","oFfommccmmofFo","oFfodmccmdofFo","oFfocCCCCcofFo","bw.oppPPppo.wb","..obpPooPpbo..",".obbbw..wbbbo."],
    B: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..",".ofeEffffEefo.",".oFffssssffFo.","..ofssnnssfo..","...ofwrrwfo...",".oFFoddddoFFo.","oFFfmdmmdmfFFo","oFfommccmmofFo","oFfodmccmdofFo","oFfocCCCCcofFo","bw.oppPPppo.wb","..obpPo..oPpbo",".obbbw...wbbo."],
    C: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..","wofeEffffEefow","wwFffssssffFww","oFofssnnssfoFo","oFfofwrrwfofFo","oFFFoddddoFFFo","...fmdmmdmf...","...ommccmmo...","...odmccmdo...","...ocCCCCco...","...oppPPppo...","..obpPooPpbo..",".obbbw..wbbbo."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwwo.oo", "owwwwvwwoddo", "owwvwwwwddeo", "owwwwwwwoddo", ".owwvwwwooo.", "..ovvvvvo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwwo.oo", "owwwwvwwoddo", "owwvwwwwddeo", "owwwwwwwoddo", ".owwvwwwooo.", "..ovvvvvo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', V:'#aab4cc', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', V:'#aab4cc', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  wolf: {
    pal: { o:'#1c1424', g:'#6a7088', l:'#aab0c4', e:'#ff5050', n:'#14141c', d:'#3a3e4c', b:'#2a2d38', w:'#ffffff', r:'#c02030' },
    A: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggno", ".ogggggggggo..", ".ogggllllggo..", ".ogdgolloodo..", ".ob.bo..bo.b..", ".oo.oo..oo.oo.", ".............."],
    B: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggno", ".ogggggggggo..", ".ogggllllggo..", ".ogdgoooodo...", "..ob.bo.bo.b..", "..oo.oo.oo.oo.", ".............."],
    C: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggwo", ".ogggggggggrro", ".ogggllllggwo.", ".ogdgolloodo..", ".ob.bo..bo.b..", ".oo.oo..oo.oo.", ".............."],
  },
};
// Houses (owner race). One frame, drawn bottom-anchored.
const HOUSES = {
  human: { // thatched hut, blue banner
    pal: { o:OUT, y:'#e0b84a', Y:'#b8902c', w:'#d8b98a', k:'#4a3020', f:'#4aa3ff' },
    A: ["....oo....","...oyyo...","..oyYyyo.f",".oyyyYyyo.","oyYyyyyYyo",".owwwwwwo.",".owkkwfwo.",".owkkwwwo.",".owkkwwwo.",".oooooooo."],
  },
  elf: { // tree house, lilac blossoms
    pal: { o:OUT, g:'#3f9a4a', G:'#2a7038', p:'#c58cf0', t:'#8a5a34', k:'#3a2418' },
    A: ["..oooooo..",".ogggGgggo","oggGggpggo","ogggggggGo",".oGgggpgo.","...otto...","..otkkto..","..otkkto..",".ottkktto.",".oooooooo."],
  },
  dwarf: { // stone house, orange door, chimney
    pal: { o:OUT, S:'#9ea6b2', s:'#b9c0ca', R:'#5a5f6e', d:'#ff9a2e' },
    A: ["......oo..",".oooooSSo.","oRRRRRRRRo","oRRRRRRRRo",".oSSsSSsSo",".oSsSSsSSo",".oSdddSsSo",".oSdddSSSo",".oSdddSsSo",".oooooooo."],
  },
  werewolf: { // dark timber lodge with a glowing cyan moon window
    pal: { o:OUT, T:'#6b5a52', t:'#8a7a70', w:'#8a6a46', k:'#2a1a14', m:'#5ef0ff' },
    A: ["....oo....","...oTTo...","..oTtTTo..",".oTTtTTTo.","oTtTTTtTTo",".owwwwwwo.",".owkkwmwo.",".owkkwwwo.",".owkkwwwo.",".oooooooo."],
  },
  orc: { // hide tent, red stripe, skull
    pal: { o:OUT, R:'#9a6a44', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6' },
    A: ["....wo....","...oRRo...","..oRrRRo..",".oRRrRRRo.",".oRRwwRRo.","oRRRkkRRRo","oRrkkkkRro","oRRkkkkRRo","oRRkkkkRRo","oooooooooo"],
  },
};
function buildSprite(def, frame) {
  const rows = def[frame] || def.A;
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) for (let i = 0; i < rows[0].length; i++) {
    const ch = rows[y][i]; if (ch === '.') continue;
    x.fillStyle = def.pal[ch] || '#f0f'; x.fillRect(i, y, 1, 1);
  }
  return c;
}
