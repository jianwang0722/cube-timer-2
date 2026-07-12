/**
 * The 21 PLL algorithms (standard speedsolving set), expressed in outer
 * turns + rotations (M-slice sequences rewritten as x/L/R composites; a V
 * variant ending mid-rotation gets a closing y' — the final AUF absorbs the
 * residual U turn).
 *
 * Correctness is machine-enforced (pll.test.ts): net effect must fix
 * everything below the last layer, patterns must be unique, and the 21
 * AUF-orbits + the solved orbit must tile all 288 permutation states.
 */
export const PLL_ALGS: Record<string, string> = {
  Aa: "x R' U R' D2 R U' R' D2 R2 x'",
  Ab: "x R2 D2 R U R' D2 R U' R x'",
  E: "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
  F: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  Ga: "R2 U R' U R' U' R U' R2 U' D R' U R D'",
  Gb: "R' U' R U D' R2 U R' U R U' R U' R2 D",
  Gc: "R2 U' R U' R U R' U R2 U D' R U' R' D",
  Gd: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
  H: "x2 L2 R2 U x2 L2 R2 U2 x2 L2 R2 U x2 L2 R2",
  Ja: "L' U' L F L' U' L U L F' L2 U L",
  Jb: "R U R' F' R U R' U' R' F R2 U' R'",
  Na: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  Nb: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
  Ra: "R U' R' U' R U R D R' U' R D' R' U2 R'",
  Rb: "R2 F R U R U' R' F' R U2 R' U2 R",
  T: "R U R' U' R' F R2 U' R' U' R U R' F'",
  Ua: "R U' R U R U R U' R' U' R2",
  Ub: "R2 U R U R' U' R' U' R' U R'",
  V: "R' U R' U' y R' F' R2 U' R' U R' F R F y'",
  Y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  Z: "x L R' U x2 L2 R2 U x2 L2 R2 U x L R' U2 x2 L2 R2",
};
