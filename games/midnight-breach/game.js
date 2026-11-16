// Midnight Breach 3D: a low-poly (Three.js r186) found-phone mystery.
// Explore the player's house, read the AFTER app, follow its clues and find Rani.
import { mountGame } from './src/main.mjs';

function run(mode) {
  mountGame(mode);
}

// Publishing bundles the entry into an IIFE, so expose the boot function explicitly.
window.run = run;
