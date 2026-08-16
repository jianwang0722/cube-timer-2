/**
 * The 21 PLL algorithms (standard speedsolving set), in standard notation —
 * including the M-slice H and Z perms and the x-conjugated A perms, which is
 * how these are actually printed. `cube.ts` defines wide and slice moves
 * natively. The V perm ends mid-rotation with a closing y'; the final AUF
 * absorbs the residual U turn.
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
  H: "M2 U M2 U2 M2 U M2",
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
  Z: "M' U M2 U M2 U M' U2 M2",
};
