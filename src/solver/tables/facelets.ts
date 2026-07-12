/**
 * Facelet conventions (docs/solver-architecture.md): face order U R F D L B,
 * facelet index = face * 9 + position, positions 0-8 in reading order per
 * face (Kociemba layout). Facelet values are color ids = solved face ids.
 */
export const FACE = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 } as const;
export type Face = (typeof FACE)[keyof typeof FACE];

export const CENTER_OF = (face: Face): number => face * 9 + 4;

/**
 * Corner slots with their three facelet positions, listed clockwise starting
 * from the U/D sticker (standard Kociemba cornerFacelet order).
 */
export const CORNER_FACELETS: Record<string, readonly [number, number, number]> = {
  URF: [8, 9, 20],
  UFL: [6, 18, 38],
  ULB: [0, 36, 47],
  UBR: [2, 45, 11],
  DFR: [29, 26, 15],
  DLF: [27, 44, 24],
  DBL: [33, 53, 42],
  DRB: [35, 17, 51],
};

/**
 * Edge slots with their two facelet positions; the first is the "primary"
 * sticker (U/D sticker for U/D-layer edges, F/B sticker for E-layer edges).
 */
export const EDGE_FACELETS: Record<string, readonly [number, number]> = {
  UR: [5, 10],
  UF: [7, 19],
  UL: [3, 37],
  UB: [1, 46],
  DR: [32, 16],
  DF: [28, 25],
  DL: [30, 43],
  DB: [34, 52],
  FR: [23, 12],
  FL: [21, 39],
  BL: [50, 41],
  BR: [48, 14],
};
