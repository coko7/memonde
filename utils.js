/* ── Matching engine ── */

/**
 * Normalizes a string for case-insensitive and accent-insensitive matching.
 *
 * Transformations:
 * - Converts to lowercase.
 * - Removes diacritical marks (e.g. "é" → "e").
 * - Replaces apostrophes, periods, and hyphens with spaces.
 * - Removes all remaining non-alphanumeric characters.
 * - Collapses consecutive whitespace into a single space.
 * - Trims leading and trailing whitespace.
 *
 * Example:
 *   "Jean-Luc O'Connor, Jr." -> "jean luc o connor jr"
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[''.\-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes the Levenshtein edit distance between two strings.
 *
 * The distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to transform
 * one string into the other.
 *
 * Uses a dynamic programming algorithm with O(m × n) time complexity
 * and O(n) memory usage, where m and n are the lengths of the input
 * strings.
 *
 * Examples:
 *   levenshtein("kitten", "sitting") === 3
 *   levenshtein("book", "back") === 2
 *   levenshtein("foo", "foo") === 0
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    const curr = [i];

    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }

    prev = curr;
  }

  return prev[n];
}


function buildIndexes(lang) {
  const exactIndex = new Map(); // normName → iso2
  const fuzzyList = [];         // [{iso2, n}]

  for (const country of window.COUNTRIES) {
    const name = country.name[lang];
    const canonicalName = normalize(name);
    exactIndex.set(canonicalName, country.iso2);
    fuzzyList.push({
      iso2: country.iso2,
      name: canonicalName,
      display: name
    });

    const aliases = country.aliases[lang] || [];
    for (const alias of aliases) {
      const canonicalAlias = normalize(alias);
      if (!exactIndex.has(canonicalAlias)) {
        exactIndex.set(canonicalAlias, country.iso2);
      }

      fuzzyList.push({
        iso2: country.iso2,
        name: canonicalAlias,
        display: name
      });
    }
  }

  return { exactIndex, fuzzyList };
}

function matchInput(raw, lang, indexes, guessed) {
  if (!raw.trim()) return null;

  const normalizedInput = normalize(raw);
  const { exactIndex, fuzzyList } = indexes;

  // 1. Test for Exact match
  if (exactIndex.has(normalizedInput)) {
    const iso2 = exactIndex.get(normalizedInput);
    return {
      iso2,
      type: guessed.has(iso2) ? "duplicate" : "correct"
    };
  }

  // 2. Test via Fuzzy match
  const threshold = normalizedInput.length <= 6 ? 1 : 2;
  const candidates = fuzzyList.filter(item => levenshtein(normalizedInput, item.name) <= threshold);

  // Deduplicate by iso2
  const seen = new Map();
  for (const candidate of candidates) {
    if (!seen.has(candidate.iso2)) {
      seen.set(candidate.iso2, candidate);
    }
  }

  const unique = [...seen.values()];

  if (unique.length === 0) {
    return { iso2: null, type: "nomatch" };
  }

  if (unique.length === 1) {
    const candidate = unique[0];

    // Guard: reject if input is also close to another member of the same confusable family
    const danger = fuzzyList.some(item =>
      item.iso2 !== candidate.iso2 &&
      levenshtein(normalizedInput, item.name) <= threshold &&
      inSameFamily(candidate.display, item.display)
    );

    if (danger) {
      return { iso2: null, type: "nomatch" };
    }

    return {
      iso2: candidate.iso2,
      type: guessed.has(candidate.iso2) ? "duplicate" : "correct"
    };
  }

  // Multiple candidates → reject
  return { iso2: null, type: "nomatch" };
}

