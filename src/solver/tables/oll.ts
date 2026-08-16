/**
 * The 57 OLL algorithms (standard speedsolving set), in standard notation:
 * outer turns, wide moves, M-slice, and the occasional rotation where the
 * printed alg genuinely uses one (OLL 18's y-conjugate). `cube.ts` defines
 * wide and slice moves natively, so nothing needs rewriting here.
 *
 * Correctness is machine-enforced (oll.test.ts): every alg must net-preserve
 * the cube outside the U layer, and the 57 alg-inverse patterns plus the
 * solved pattern must tile all 216 last-layer orientation patterns exactly.
 * A transcription slip can therefore mislabel a case number at worst — it
 * cannot produce a wrong solution.
 */
export const OLL_ALGS: Record<number, string> = {
  1: "R U2 R2 F R F' U2 R' F R F'",
  2: "F R U R' U' F' f R U R' U' f'",
  3: "f R U R' U' f' U' F R U R' U' F'",
  4: "f R U R' U' f' U F R U R' U' F'",
  5: "r' U2 R U R' U r",
  6: "r U2 R' U' R U' r'",
  7: "r U R' U R U2 r'",
  8: "r' U' R U' R' U2 r",
  9: "R U R' U' R' F R2 U R' U' F'",
  10: "R U R' U R' F R F' R U2 R'",
  11: "r U R' U R' F R F' R U2 r'",
  12: "F R U R' U' F' U F R U R' U' F'",
  13: "F U R U' R2 F' R U R U' R'",
  14: "R' F R U R' F' R F U' F'",
  15: "r' U' r R' U' R U r' U r",
  16: "r U r' R U R' U' r U' r'",
  17: "R U R' U R' F R F' U2 R' F R F'",
  18: "F R U R' U y' R' U2 R' F R F' y",
  19: "M U R U R' U' M' R' F R F'",
  20: "r U R' U' M2 U R U' R' U' M'",
  21: "R U2 R' U' R U R' U' R U' R'",
  22: "R U2 R2 U' R2 U' R2 U2 R",
  23: "R2 D' R U2 R' D R U2 R",
  24: "r U R' U' r' F R F'",
  25: "F' r U R' U' r' F R",
  26: "R U2 R' U' R U' R'",
  27: "R U R' U R U2 R'",
  28: "r U R' U' L' l U R U' R'",
  29: "R U R' U' R U' R' F' U' F R U R'",
  30: "F U R U2 R' U' R U2 R' U' F'",
  31: "R' U' F U R U' R' F' R",
  32: "R U B' U' R' U R B R'",
  33: "R U R' U' R' F R F'",
  34: "R U R2 U' R' F R U R U' F'",
  35: "R U2 R2 F R F' R U2 R'",
  36: "L' U' L U' L' U L U L F' L' F",
  37: "F R' F' R U R U' R'",
  38: "R U R' U R U' R' U' R' F R F'",
  39: "L F' L' U' L U F U' L'",
  40: "R' F R U R' U' F' U R",
  41: "R U R' U R U2 R' F R U R' U' F'",
  42: "R' U' R U' R' U2 R F R U R' U' F'",
  43: "F' U' L' U L F",
  44: "F U R U' R' F'",
  45: "F R U R' U' F'",
  46: "R' U' R' F R F' U R",
  47: "F' L' U' L U L' U' L U F",
  48: "F R U R' U' R U R' U' F'",
  49: "r U' r2 U r2 U r2 U' r",
  50: "r' U r2 U' r2 U' r2 U r'",
  51: "F U R U' R' U R U' R' F'",
  52: "R U R' U R U' B U' B' R'",
  53: "r' U' R U' R' U R U' R' U2 r",
  54: "r U R' U R U' R' U R U2 r'",
  55: "R U2 R2 U' R U' R' U2 F R F'",
  56: "r U r' U R U' R' U R U' R' r U' r'",
  57: "R U R' U' M' U R U' r'",
};
