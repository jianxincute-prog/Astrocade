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
  human: {
    pal: { o:'#1c1424', Y:'#f6d878', y:'#e6bc50', t:'#b88a2c', w:'#ecdcbc', W:'#c8b490', k:'#7a5230', g:'#8ecbff', G:'#cfeaff', d:'#4a2e1a', S:'#9a96a0', s:'#7a767e', b:'#8a8690', f:'#3f8cff' },
    A: ["......offf....", "......oo......", ".....oYYo.oooo", "....oYYYtooSSo", "...oYYyyttoSSo", "..oYYyyyttttoo", ".oYYyyyyttttto", "oYYyyyyyttttto", "otttttttttttto", ".okwwwwwWWWko.", ".okwgGwwggWko.", ".okwggwwggWko.", ".okwwwddWWWko.", ".okwwwddWWWko.", ".obbbbddbbbbo."],
    meta: {"smoke": [11.5, 2], "glow": [{"x": 4, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}, {"x": 8, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}]},
  },
  elf: {
    pal: { o:'#1c2418', L:'#4fae52', l:'#8fe08a', D:'#2d7a3a', p:'#d8a0ff', P:'#f0d0ff', t:'#8a5a34', T:'#5e3a20', B:'#b07a48', k:'#2a1a14', y:'#ffe9a0', Y:'#fff6d0' },
    A: ["....oooooo....", "..ooLlllDDoo..", ".oLlpLllDDDDo.", "oLlLLlLpDDDDDo", "oLpLLLLLDDDDDo", "oDLLLDDLDDDDDo", ".oDDDDDDDDDDo.", "..ooDDoDDoDo..", "..oBBBBBttto..", "..otyYttyyTo..", "..otyYttyyTo..", "..otttkkkkTTTT", "..otttkkkkTTTo", ".oTtBtkkkkTtTo", "ooTTooooooTToo"],
    meta: {"smoke": null, "glow": [{"x": 4, "y": 9, "w": 2, "h": 2, "c": "255,240,160", "always": 0}, {"x": 8, "y": 9, "w": 2, "h": 2, "c": "255,240,160", "always": 0}]},
  },
  dwarf: {
    pal: { o:'#1c1424', S:'#9ea6b2', s:'#c0c8d4', m:'#7a828e', R:'#5a5f78', r:'#7a80a0', Q:'#444860', d:'#4a2e1a', c:'#ff9a2e', C:'#ffc860' },
    A: ["....oSSSmo....", "...ooSSSmoo...", "..oRRRrrQQQo..", ".oRRrrRRRRQQQo", "oRRrRRQQQQRQQo", "oQQQQQQQQQQQQo", ".oSssSSsmmSmo.", ".oSSmSSSmmmmo.", ".oSsSddddmSmo.", ".oSmSdcCdmmmo.", ".oSSSddddmmmo.", ".oooooooooooo."],
    meta: {"smoke": [6.5, 0], "glow": [{"x": 6, "y": 9, "w": 2, "h": 1, "c": "255,150,40", "always": 1}]},
  },
  orc: {
    pal: { o:'#1c1214', H:'#a8744a', h:'#c89868', D:'#7a4c2c', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6', W:'#c8c0a8', t:'#8a5a34', T:'#5e3a20' },
    A: [".....w..w.....", "......ww......", "......oo......", ".....ohHo.....", "....ohhHDo....", "...orhrrHro...", "t.ohhhwwDDDo.T", "tohhhhwWDDDDDT", "thhhhHkkDDDDDT", "thhhHkkkkDDDDT", "thhhkkkkkkDDDT", "thhhkkkkkkDDDT", "toooooooooooot"],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 9, "w": 2, "h": 3, "c": "255,122,42", "always": 1}]},
  },
  werewolf: {
    pal: { o:'#1c1424', a:'#e6d9a8', R:'#4a4258', r:'#6b6379', Q:'#352f44', w:'#8a6a46', W:'#6e5236', t:'#5e4630', k:'#241a14', m:'#5ef0ff', M:'#c8fbff', f:'#a89080', F:'#7a6a5c' },
    A: ["....a.aa.a....", ".....aRRa.....", "....oRrrRo....", "...oRrrrRRo...", "..oRrrrrRRRo..", ".oRrrrrrRRRRQo", "oRrrrrrrRRRRQo", "oQQQQQQQQQQQQo", ".owwwwwwWWWWo.", ".owfFwmmWFFWo.", ".owfFwmMWFFWo.", ".owfFwkkWFFWo.", ".owwwwkkWWWWo.", ".ottttkktttto."],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 9, "w": 2, "h": 2, "c": "94,240,255", "always": 1}]},
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
