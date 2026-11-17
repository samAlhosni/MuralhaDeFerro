// Layout do mapa de batalha (visão de cima). Coordenadas do mundo 1280x720.
// O castelo (pequeno) fica à direita. Os inimigos entram pela borda esquerda.

export interface WallSegmentDef {
  id: string;
  y0: number;
  y1: number;
  gate: boolean;
}

// ---------------------------------------------------------------------
// RESISTÊNCIA (fácil de ajustar). Valores-base para a fase 1: com o dano de
// um saqueador (8), cada pedaço de muralha cai com ~8 golpes.
// Nas fases altas o dano dos inimigos cresce, então a vida também é
// multiplicada pelo mesmo fator para manter "uns 8 golpes".
// ---------------------------------------------------------------------
export const HP = {
  wallPiece: 64, // pedaço de muralha de pedra
  gatePiece: 56, // pedaço do portão (madeira)
  keep: 120, // castelo interior: caiu, perdeu
};

/** Área da imagem do castelo (canto superior esquerdo + tamanho). */
export const CASTLE = { x: 1090, y: 205, w: 190, h: 360 };

const WALL_X = CASTLE.x + 18;
const WALL_TOP = CASTLE.y + 26;
const WALL_BOTTOM = CASTLE.y + CASTLE.h - 30;
const PIECES = 6;
const PIECE_LEN = (WALL_BOTTOM - WALL_TOP) / PIECES;

export const MAP = {
  /** Linhas (y) onde as estradas começam na borda esquerda. */
  lanes: [205, 385, 560],
  /** Portão do castelo (meio da muralha esquerda). */
  gate: { x: WALL_X, y: (WALL_TOP + WALL_BOTTOM) / 2 },
  /** Centro x da muralha esquerda e meia-espessura. */
  wallX: WALL_X,
  wallHalf: 15,
  wallTop: WALL_TOP,
  wallBottom: WALL_BOTTOM,
  /** A muralha é feita de pedaços pequenos: só o pedaço atingido cai. */
  wallSegments: Array.from({ length: PIECES }, (_, i) => ({
    id: String(i),
    y0: Math.round(WALL_TOP + i * PIECE_LEN),
    y1: Math.round(WALL_TOP + (i + 1) * PIECE_LEN),
    gate: i === 2 || i === 3,
  })) as WallSegmentDef[],
  /** Castelo interior (pequeno, no meio do pátio). */
  keep: { x: CASTLE.x + 112, y: CASTLE.y + 176, r: 30 },
  /** Metade da altura da passagem do portão. */
  gateHalf: 0,
  /** Lugares para casas dentro do castelo (cada casa abriga 3 soldados). */
  houseSlots: [
    { x: CASTLE.x + 50, y: CASTLE.y + 84 },
    { x: CASTLE.x + 100, y: CASTLE.y + 84 },
    { x: CASTLE.x + 150, y: CASTLE.y + 84 },
    { x: CASTLE.x + 50, y: CASTLE.y + 312 },
    { x: CASTLE.x + 100, y: CASTLE.y + 312 },
    { x: CASTLE.x + 150, y: CASTLE.y + 312 },
  ],
  /** Área onde o jogador pode posicionar unidades e construções (na frente da muralha). */
  zone: { x0: 690, x1: 1080, y0: 150, y1: 600 },
  /** Limites por onde as unidades podem andar. */
  bounds: { x0: -60, x1: 1262, y0: 92, y1: 700 },
};

// passagem do portão = os dois pedaços de madeira do meio
{
  const gates = MAP.wallSegments.filter((s) => s.gate);
  MAP.gateHalf = (gates[gates.length - 1].y1 - gates[0].y0) / 2;
}

/** Soldados que cabem em cada casa. */
export const HOUSE_CAPACITY = 3;

/** Tamanho de cada quadrado da grade de construção de muros (px). */
export const TILE = 30;
export const GRID_W = Math.ceil(1280 / TILE);
export const GRID_H = Math.ceil(720 / TILE);
export const cellOf = (x: number, y: number) => ({ gx: Math.floor(x / TILE), gy: Math.floor(y / TILE) });
export const cellCenter = (gx: number, gy: number) => ({ x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 });
