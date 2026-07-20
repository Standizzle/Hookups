// Maps consent terms onto the Parental Levels 1-5 taxonomy — the highest
// level implied by the requested terms is what gets checked against a
// minor's permittedLevel.
export function computeRequestedLevel(terms) {
  if (terms.sexualIntimacy) return 5;
  if (terms.touchingUnderClothing) return 4;
  if (terms.touchingAboveClothing) return 3;
  if (terms.kissingAffection) return 2;
  if (terms.holdingHandsHugging) return 1;
  return 0;
}

export const LEVEL_LABELS = {
  1: 'Holding hands & hugging',
  2: 'Kissing & affection',
  3: 'Touching above clothing',
  4: 'Touching under clothing',
  5: 'Sexual intimacy',
};
