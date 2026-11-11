// Romance data: who can be romanced, gift tastes, date spots and the lines for each moment. Pure data (no rendering).
import { DOCKS, dockPose } from './layout.js';

export const ROMANCEABLE = ['rin', 'mika', 'hana', 'ollie'];
export const NEED_FRIEND = 6;      // close friend before romance opens
export const NEED_CONFESS = 6;     // romance points needed to confess
export const NEED_PROMISE = 12;    // romance points needed for the promise
export const MAX_ROMANCE = 15;
export const STAGE_LABEL = ['Friend', 'Crush', 'Dating', 'Partner'];

const dk = dockPose(DOCKS[0]);
export const SPOTS = {
  hill: { name: 'Hilltop Viewpoint', x: 116, z: 116 },
  dock: { name: 'Scenic Dock', x: dk.x0 + dk.dx * dk.len * 0.8, z: dk.z0 + dk.dz * dk.len * 0.8 },
  overlook: { name: 'Creek Overlook', x: 139, z: -130 },
  gazebo: { name: 'Park Gazebo', x: 118, z: 19 },
};
export const DATE_SPOT = { rin: 'dock', mika: 'hill', hana: 'overlook', ollie: 'gazebo' };
export const DATE_HOURS = [16, 23];

// likes / dislikes among the gift items (see shops.js); anything else is "fine"
export const TASTE = {
  rin: { likes: ['gf_choc', 'gf_skate'], hates: ['gf_book'] },
  mika: { likes: ['gf_skate', 'gf_mug'], hates: ['gf_choc'] },
  hana: { likes: ['gf_flower', 'gf_book'], hates: ['gf_mug'] },
  ollie: { likes: ['gf_choc', 'gf_mug'], hates: ['gf_flower'] },
  baker: { likes: ['gf_mug', 'gf_book'], hates: [] },
};

export const LINES = {
  rin: {
    gift: { liked: ['Ahh, for me?! You remembered! I love it!', 'This is perfect. Thank you!'], ok: ['Oh, thank you! That is sweet of you.'], hate: ['Um... thanks? I will find a place for it.'] },
    date: ['The lake looks like glass from here. I wanted to show you.', 'Skating with you makes everything feel lighter. Silly, right?'],
    accept: ['I... I feel the same. I was waiting for you to say it first!', 'Then it is official. You and me, on the ice, always.'],
    decline: ['I really like you, and that is why I want to be sure. A little more time?'],
    promise: ['A promise charm... I will never take it off. Never.'],
    flirt: ['You are my favourite person to fall over with.', 'Race you after this? Winner picks dessert.'],
  },
  mika: {
    gift: { liked: ['Now that is a thoughtful gift. Thank you, truly.'], ok: ['Appreciated. Thank you.'], hate: ['Hm. Not quite my thing, but the thought counts.'] },
    date: ['I come up here when I need to think. I am glad you came along.', 'You work harder than anyone I coach. It is... admirable. And more.'],
    accept: ['I have been a coach for years and never felt this nervous. Yes. Yes, I feel the same.'],
    decline: ['You mean a lot to me. Let me be a better friend first, then we will see.'],
    promise: ['A promise. Then I promise to be at the boards for every fall you ever take.'],
    flirt: ['Stay balanced. Though, honestly, you already are.', 'Take my hand for the next turn. Coach is allowed.'],
  },
  hana: {
    gift: { liked: ['Oh! You have such good taste. I will treasure it.'], ok: ['How kind. Thank you!'], hate: ['That is... unexpected. Thank you, anyway.'] },
    date: ['The creek is frozen all the way down. It sounds like music, if you listen.', 'I spend all day with boots. Evenings with you are my favourite fitting.'],
    accept: ['Yes. A thousand times yes. I have wanted to say that for weeks.'],
    decline: ['I adore you, truly. Can we take it slow? I want to do this properly.'],
    promise: ['This charm is the nicest thing anyone has given me. It fits. Of course it fits.'],
    flirt: ['I saved the best pair of boots for you. And the best seat, next to me.'],
  },
  ollie: {
    gift: { liked: ['No way, my favourite! You are the best, you know that?'], ok: ['Aw, thanks! That made my day.'], hate: ['Ha, uh, thanks. I will... put that somewhere.'] },
    date: ['Best seat in town: right here, with you. Do not tell the fountain.', 'I put cinnamon in everything, but you are sweeter than any of it.'],
    accept: ['Wait, really? Yes! I mean, yes. Calmly. Yes.'],
    decline: ['You are amazing, and I mean that. Can I earn it a bit more first?'],
    promise: ['A charm? I am going to cry into the cocoa. Thank you. Forever.'],
    flirt: ['Marshmallows on me, always, for my favourite person.'],
  },
  baker: {
    gift: { liked: ['Well, bless me! This is lovely. Thank you, young one.'], ok: ['That is kind of you.'], hate: ['Thank you, thank you.'] },
  },
};

export const dateWindow = (h) => h >= DATE_HOURS[0] && h < DATE_HOURS[1];
