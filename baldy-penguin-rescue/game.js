// Baldy's Penguin Rescue — Astrocade entry point.
// A kid-friendly 3D third-person winter adventure: Baldy (a cheerful bald man) explores a snowy valley,
// finds lost baby penguins that waddle behind him in a line, and leads them home to the igloo.
// Golden fish add stars and sled power; playful snow whirlies scatter the line unless you jump over them.
import { startGame, registerParameters } from './src/main.js';

let threeLoad;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (threeLoad) return threeLoad;
  threeLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const fail = message => { clearTimeout(timer); script.remove(); threeLoad = null; reject(new Error(message)); };
    const timer = setTimeout(() => fail('Loading took too long.'), 20000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => fail('Could not load Three.js.');
    document.head.appendChild(script);
  });
  return threeLoad;
}

let lastMode = 'play';
function setBoot(message, failed) {
  const boot = document.getElementById('boot'); if (!boot) return;
  boot.classList.toggle('failed', !!failed);
  document.getElementById('boot-msg').textContent = message;
  document.getElementById('boot-retry').hidden = !failed;
}
function hideBoot() {
  const boot = document.getElementById('boot'); if (!boot) return;
  boot.classList.add('hide'); setTimeout(() => boot.remove(), 500);
}
document.getElementById('boot-retry')?.addEventListener('click', () => run(lastMode));

function run(mode) {
  lastMode = mode = mode === 'edit' ? 'edit' : 'play';
  setBoot('', false);
  registerParameters(mode);
  loadThree()
    .then(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 30))))
    .then(() => { startGame(mode); requestAnimationFrame(() => requestAnimationFrame(hideBoot)); })
    .catch(error => {
      try { window.lib.log(`ERROR could not start: ${error.message}`); } catch (e) { console.error(error); }
      setBoot('Could not load the snowy valley.', true);
    });
}

window.run = run;
