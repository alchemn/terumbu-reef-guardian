// A small seeded random generator (splitmix32): the same seed gives the same reef,
// which is what makes the screenshot scenes repeatable frame for frame.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  };
}

/** Pick one entry of an array with the seeded stream. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** A value in [min, max) from the seeded stream. */
export function range(random, min, max) {
  return min + random() * (max - min);
}
