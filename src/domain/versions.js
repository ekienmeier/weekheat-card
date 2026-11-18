// Release numbers: the one a blueprint is marked with, and comparing two of them.

/**
 * The Weekheat release marked in a blueprint's description ("… Weekheat 0.12.0"), or null.
 * @param {string | undefined} description
 * @returns {string | null}
 */
export function blueprintVersion(description) {
  const marks = [...String(description || '').matchAll(/\bWeekheat (\d+\.\d+\.\d+)\b/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}

/**
 * Is release `a` older than release `b`? No release at all is older than any.
 * @param {string | null} a e.g. "0.9.0"
 * @param {string} b e.g. "0.12.0"
 * @returns {boolean}
 */
export function olderVersion(a, b) {
  if (!a) return true;
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const i = partsA.findIndex((part, index) => part !== partsB[index]);
  return i >= 0 && i < 3 && partsA[i] < partsB[i];
}
