// Midnight Breach is a found-phone mystery toy. Browse familiar apps, read the AFTER
// gossip archive, then watch unknown-source files unlock when the phone clock hits midnight.
import { mountGame } from './src/interface.mjs';

function run(mode) {
  mountGame(mode);
}

// Publishing bundles the entry into an IIFE, so expose the boot function explicitly.
window.run = run;
