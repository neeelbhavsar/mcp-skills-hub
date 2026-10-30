/**
 * The minimum a record needs to be searchable. Keeping this structural rather
 * than tied to CardItem lets the ⌘K palette ship a slim index instead of the
 * full catalog objects.
 */
export interface Searchable {
  title: string;
  category: string;
  description: string;
  search: string;
}

/**
 * Small ranked matcher for the catalogs.
 *
 * The previous filter was `haystack.includes(query)`, which meant no ranking,
 * no out-of-order words ("server postgres" found nothing) and no tolerance for
 * a single typo. At ~700 items we can afford to score every row on every
 * keystroke, so this stays entirely client-side with no index to build.
 *
 * Typo tolerance is a fallback, not a peer of real matches: when it was mixed
 * in, "xmcp" was one edit from the word "mcp" and returned 220 unrelated
 * servers under the one it named.
 */

interface Match {
  score: number;
  /** True when at least one query word only matched through a typo. */
  fuzzy: boolean;
}

const NO_MATCH: Match = { score: 0, fuzzy: false };

/** Letters and digits in any script; everything else separates words. */
const WORD_CHAR = /[\p{L}\p{N}]/u;
const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

const isWordChar = (ch: string | undefined) => ch !== undefined && WORD_CHAR.test(ch);

/**
 * Is `needle` reachable from `word` within one edit? Swapping two neighbouring
 * letters counts as one, since "notoin" is the commonest way to mistype
 * "notion".
 */
function withinOneEdit(word: string, needle: string): boolean {
  const dl = word.length - needle.length;
  if (dl < -1 || dl > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < word.length && j < needle.length) {
    if (word[i] === needle[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    // Substitution advances both; insertion/deletion advances the longer side.
    if (dl === 0 && word[i] === needle[j + 1] && word[i + 1] === needle[j]) {
      i += 2;
      j += 2;
    } else if (dl === 0) {
      i++;
      j++;
    } else if (dl === 1) {
      i++;
    } else {
      j++;
    }
  }
  return edits + (word.length - i) + (needle.length - j) <= 1;
}

/**
 * Score one field for one token. 0 means no match.
 *
 * Every occurrence is considered, not just the first: "git" sits mid-word in
 * "digital" before it starts "github", and only checking the first hit ranked
 * that row as a weak mid-word match.
 */
function fieldScore(field: string, token: string): Match {
  if (!field) return NO_MATCH;
  if (field === token) return { score: 5, fuzzy: false };

  let best = 0;
  for (let at = field.indexOf(token); at !== -1; at = field.indexOf(token, at + 1)) {
    const startsWord = !isWordChar(field[at - 1]);
    const endsWord = !isWordChar(field[at + token.length]);
    // Whole word > word prefix > buried mid-word. Very short tokens only count
    // at a word start, otherwise "ai" matches every "email" and "detail".
    const score = startsWord ? (endsWord ? 4 : 3) : token.length >= 3 ? 1.5 : 0;
    if (score > best) best = score;
    if (best === 4) break;
  }
  if (best > 0) return { score: best, fuzzy: false };

  // One typo, only where a typo is plausible and the word is otherwise
  // recognisably the same: long enough, similar length, same first letter.
  if (token.length < 5) return NO_MATCH;
  for (const word of field.split(WORD_SPLIT)) {
    if (word.length >= 4 && word[0] === token[0] && withinOneEdit(word, token)) return { score: 1, fuzzy: true };
  }
  return NO_MATCH;
}

function matchItem(item: Searchable, tokens: string[], phrase: string): Match {
  const title = item.title.toLowerCase();
  const category = item.category.toLowerCase();
  const description = item.description.toLowerCase();
  const rest = item.search;

  const weighted: [string, number][] = [
    [title, 4],
    [category, 2],
    [description, 1.2],
    [rest, 1],
  ];

  let total = 0;
  let fuzzy = false;
  for (const token of tokens) {
    // Every token must land somewhere, so multi-word queries narrow rather
    // than widen the result set. An exact hit anywhere beats a typo anywhere.
    let exact = 0;
    let typo = 0;
    for (const [field, weight] of weighted) {
      const m = fieldScore(field, token);
      if (m.fuzzy) typo = Math.max(typo, m.score * weight);
      else exact = Math.max(exact, m.score * weight);
    }
    if (exact > 0) total += exact;
    else if (typo > 0) {
      total += typo;
      fuzzy = true;
    } else return NO_MATCH;
  }

  // Put the thing the visitor actually named first.
  if (title === phrase) total += 40;
  else if (fuzzy && phrase.length >= 5 && withinOneEdit(title, phrase)) total += 30;
  else if (title.startsWith(phrase)) total += 12;
  else if (tokens.length > 1 && title.includes(phrase)) total += 6;
  return { score: total, fuzzy };
}

export function tokenize(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/** Filter + rank in one pass. Falls back to the caller's sort when idle. */
export function searchItems<T extends Searchable>(items: T[], query: string): T[] | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  const phrase = tokens.join(" ");

  const exact: { item: T; score: number; at: number }[] = [];
  const fuzzy: { item: T; score: number; at: number }[] = [];
  items.forEach((item, at) => {
    const m = matchItem(item, tokens, phrase);
    if (m.score > 0) (m.fuzzy ? fuzzy : exact).push({ item, score: m.score, at });
  });

  // Typo matches only stand in when nothing matched as typed.
  const scored = exact.length ? exact : fuzzy;
  // Ties keep the caller's order (popularity in the catalogs, resources before
  // tools in ⌘K) rather than A–Z, which buried "Xquik" under every tool row.
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  return scored.map((s) => s.item);
}
