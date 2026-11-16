// Loads Three.js r186 (ES module) from the approved jsDelivr CDN at run time.
// The URL is built in a variable so the Astrocade bundler leaves the dynamic import alone.
export const THREE_VERSION = '0.186.0';
export const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`;

export let T = null;

export async function loadThree() {
  if (T) return T;
  const url = THREE_URL;
  T = await import(/* @vite-ignore */ url);
  return T;
}
