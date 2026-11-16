// Story data in two languages (Indonesian / English). Same ids and structure in both,
// so game logic only ever refers to ids; text is looked up for the current language.
import { getLang } from './i18n.mjs';
import * as ID from './story-id.mjs';
import * as EN from './story-en.mjs';

export const CLUES_TO_OPEN_STORAGE = 5; // opens Rani's house
export const CLUES_TO_SHOW_ADDRESS = 3; // end of act 1
export const FILTER_IDS = ['all', 'friend', 'family', 'neighbor', 'celeb', 'unknown'];
export const isMidnightOnly = item => item.category === 'unknown';
export const STORIES = { id: ID, en: EN };
/** The story texts for a language (defaults to the current one). */
export const getStory = lang => STORIES[lang || getLang()] || STORIES.id;
