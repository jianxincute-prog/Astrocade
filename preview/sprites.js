// 10x10 pixel sprites. Creatures: frames A,B (walk) and C (attack). Houses: frame A.
// '.' = transparent; every other char is looked up in the sprite's own palette.
const OUT = '#1c1420';
const SPRITES = {
  human: {
    pal: { o:OUT, h:'#6b4423', s:'#f1c27d', e:OUT, c:'#4aa3ff', d:'#2a6fc0', p:'#3b4a7a', b:'#3a2a20', w:'#dfe6f0' },
    A: ["...oooo...","..ohhhho..","..ohhhho..","..oseeso..","..osssso..","..occcco..",".osccccso.",".osddddso.","..opppo...","..ob.bo..."],
    B: ["...oooo...","..ohhhho..","..ohhhho..","..oseeso..","..osssso..","..occcco..",".osccccso.",".osddddso.","..opppo...","...obbo..."],
    C: ["...oooo..w","..ohhhho.w","..ohhhho.w","..oseeso.w","..osssso.w","..occcco.w",".osccccssb",".osddddso.","..opppo...","..ob.bo..."],
  },
  elf: {
    pal: { o:OUT, h:'#f3e7a0', s:'#f6d9b8', e:'#3b7a3b', c:'#c58cf0', d:'#8f5cc4', b:'#4a3a58', w:'#dfe6f0' },
    A: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccho.",".ohddddho.","..occcco..","..ob..bo.."],
    B: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccho.",".ohddddho.","..occcco..","...obbo..."],
    C: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccsww",".ohddddho.","..occcco..","..ob..bo.."],
  },
  dwarf: {
    pal: { o:OUT, g:'#a9b2c0', G:'#6f7886', s:'#f0b48a', e:OUT, r:'#c0642a', c:'#ff9a2e', p:'#5a3a22', b:'#3a2a20', x:'#8a5a34', W:'#dfe6f0' },
    A: ["...occo...","..oggggo..",".oGggggGo.",".osseesso.",".orrssrro.",".orrrrrro.",".orrrrrro.","osgrrrrgso",".opccccpo.","..obo.obo."],
    B: ["...occo...","..oggggo..",".oGggggGo.",".osseesso.",".orrssrro.",".orrrrrro.",".orrrrrro.","osgrrrrgso",".opccccpo.","...obbbo.."],
    C: ["...occo...","..oggggo..",".oGggggGWW",".osseesoWx",".orrssrrox",".orrrrrrox",".orrrrrrsx","osgrrrrgo.",".opccccpo.","..obo.obo."],
  },
  orc: {
    pal: { o:OUT, g:'#5fa84a', G:'#3f7a30', e:'#ffe14a', w:'#f4f1e6', c:'#ff3d3d', d:'#b02020', b:'#4a2a20', x:'#8a5a34', X:'#6a4424' },
    A: ["...oooo...","..oggggo..","..ogeego..","..oggggo..","..owGGwo..",".occcccco.","ogccddccgo","ogccccccgo",".odbbbbdo.",".obo..obo."],
    B: ["...oooo...","..oggggo..","..ogeego..","..oggggo..","..owGGwo..",".occcccco.","ogccddccgo","ogccccccgo",".odbbbbdo.","..obbbbo.."],
    C: ["...oooo.XX","..oggggoXX","..ogeego.x","..oggggo.x","..owGGwo.x",".occccccox","ogccddccgx","ogccccccgo",".odbbbbdo.",".obo..obo."],
  },
  sheep: {
    pal: { o:OUT, w:'#ffffff', v:'#d6dbe6', d:'#5a4a52', e:'#ffffff', b:'#3a2a30' },
    A: ["..........","..oo.oo...",".owwowwo.o","owwwwwwodo","owwvwwwdeo","owwwwwwddo","owwwwwwwoo",".owwwwwo..","..ob..bo..","..ob..bo.."],
    B: ["..........","..oo.oo...",".owwowwo.o","owwwwwwodo","owwvwwwdeo","owwwwwwddo","owwwwwwwoo",".owwwwwo..","...obbo...","...b..b..."],
  },
  wolf: {
    pal: { o:OUT, g:'#5b6070', l:'#9aa0b0', e:'#ff5050', n:'#1c1c24', d:'#3a3e4c', b:'#2a2d38', w:'#ffffff', r:'#c02030' },
    A: ["..........","........o.","o.....oggo","og...oggeo",".ogoggggno",".ogggggggo",".oggglllo.",".ogdgoodo.",".ob.bo.bo.",".oo.oo.oo."],
    B: ["..........","........o.",".o....oggo","og...oggeo",".ogoggggno",".ogggggggo",".oggglllo.","..ogdoodo.","..ob.bobo.","..oo.oooo."],
    C: ["..........",".......o.o","o.....oggo","og...oggeo",".ogoggggwo",".ogggggrro",".ogglllgwo",".ogdgoodo.",".ob.bo.bo.",".oo.oo.oo."],
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
  orc: { // hide tent, red stripe, skull
    pal: { o:OUT, R:'#9a6a44', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6' },
    A: ["....wo....","...oRRo...","..oRrRRo..",".oRRrRRRo.",".oRRwwRRo.","oRRRkkRRRo","oRrkkkkRro","oRRkkkkRRo","oRRkkkkRRo","oooooooooo"],
  },
};
function buildSprite(def, frame) {
  const rows = def[frame] || def.A;
  const c = document.createElement('canvas'); c.width = 10; c.height = 10;
  const x = c.getContext('2d');
  for (let y = 0; y < 10; y++) for (let i = 0; i < 10; i++) {
    const ch = rows[y][i]; if (ch === '.') continue;
    x.fillStyle = def.pal[ch] || '#f0f'; x.fillRect(i, y, 1, 1);
  }
  return c;
}
