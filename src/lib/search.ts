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
 */

/** Is `needle` reachable from `word` within one edit? */
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
    if (dl === 0) {
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

/** Score one field for one token. 0 means no match. */
function fieldScore(field: string, token: string): number {
  if (!field) return 0;
  const at = field.indexOf(token);
  if (at === 0) return 3; // prefix of the field
  if (at > 0) {
    // Word-start matches beat matches buried mid-word.
    return field[at - 1] === " " || field[at - 1] === "-" || field[at - 1] === "/" ? 2.5 : 1.5;
  }
  // Only spend the fuzzy pass on tokens long enough for a typo to be plausible.
  if (token.length < 4) return 0;
  for (const word of field.split(/[\s/_-]+/)) {
    if (Math.abs(word.length - token.length) <= 1 && withinOneEdit(word, token)) return 1;
  }
  return 0;
}

export function scoreItem(item: Searchable, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  const title = item.title.toLowerCase();
  const category = item.category.toLowerCase();
  const description = item.description.toLowerCase();
  const rest = item.search;

  let total = 0;
  for (const token of tokens) {
    // Every token must land somewhere, so multi-word queries narrow rather
    // than widen the result set.
    const best = Math.max(
      fieldScore(title, token) * 4,
      fieldScore(category, token) * 2,
      fieldScore(description, token) * 1.2,
      fieldScore(rest, token),
    );
    if (best === 0) return 0;
    total += best;
  }

  // Nudge exact whole-query title hits to the top.
  if (tokens.length > 1 && title.includes(tokens.join(" "))) total += 6;
  return total;
}

export function tokenize(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/** Filter + rank in one pass. Falls back to the caller's sort when idle. */
export function searchItems<T extends Searchable>(items: T[], query: string): T[] | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = scoreItem(item, tokens);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.map((s) => s.item);
}
