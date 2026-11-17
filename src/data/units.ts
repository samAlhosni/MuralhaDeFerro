// Definições das unidades do jogador.
// Cada unidade tem força própria (sem sistema de evolução).
// `unlockLevel` = nível do jogador necessário para liberar a unidade.
// `range` = distância de ataque entre as bordas dos corpos (em pixels).

export type UnitKind = 'melee' | 'archer' | 'structure';

export interface PlayerUnitDef {
  id: string;
  name: string;
  kind: UnitKind;
  cost: number;
  unlockLevel: number;
  hp: number;
  damage: number;
  attackRate: number; // segundos entre ataques
  range: number;
  speed: number; // pixels por segundo (0 = parado)
  cavalry?: boolean;
  bonusVsCavalry?: number; // multiplicador de dano contra cavalaria
  splash?: number; // raio de dano em área
  description: string;
}

export const PLAYER_UNITS: PlayerUnitDef[] = [
  // ---------- Infantaria ----------
  {
    id: 'recruta', name: 'Recruta', kind: 'melee', cost: 25, unlockLevel: 1,
    hp: 110, damage: 10, attackRate: 0.9, range: 8, speed: 55,
    description: 'Espada curta e escudo. Barato e resistente.',
  },
  {
    id: 'espadachim', name: 'Espadachim', kind: 'melee', cost: 45, unlockLevel: 3,
    hp: 160, damage: 18, attackRate: 0.9, range: 10, speed: 60,
    description: 'Espada longa. Equilibrado.',
  },
  {
    id: 'machadeiro', name: 'Machadeiro', kind: 'melee', cost: 70, unlockLevel: 6,
    hp: 170, damage: 34, attackRate: 1.3, range: 10, speed: 55,
    description: 'Machado pesado. Muito dano, pouca defesa.',
  },
  {
    id: 'lanceiro', name: 'Lanceiro', kind: 'melee', cost: 80, unlockLevel: 10,
    hp: 200, damage: 22, attackRate: 1.0, range: 28, speed: 55, bonusVsCavalry: 2.5,
    description: 'Lança longa. Forte contra cavalaria.',
  },
  {
    id: 'cavleve', name: 'Cavaleiro Leve', kind: 'melee', cost: 110, unlockLevel: 15,
    hp: 260, damage: 26, attackRate: 0.8, range: 12, speed: 115, cavalry: true,
    description: 'Cavalo veloz. Chega rápido na batalha.',
  },
  {
    id: 'cavpesado', name: 'Cavaleiro Pesado', kind: 'melee', cost: 180, unlockLevel: 30,
    hp: 480, damage: 40, attackRate: 1.0, range: 16, speed: 85, cavalry: true,
    description: 'Cavalo com armadura. Muita vida e força.',
  },
  {
    id: 'campeao', name: 'Campeão', kind: 'melee', cost: 260, unlockLevel: 45,
    hp: 700, damage: 70, attackRate: 1.2, range: 14, speed: 50, splash: 50,
    description: 'Martelo de guerra. Acerta vários inimigos de uma vez.',
  },
  // ---------- Atiradores (ficam em cima do muro ou da muralha do castelo) ----------
  {
    id: 'arqueiro', name: 'Arqueiro', kind: 'archer', cost: 40, unlockLevel: 1,
    hp: 1, damage: 14, attackRate: 1.0, range: 190, speed: 0,
    description: 'Alcance médio, ataque rápido. Fica em cima do muro.',
  },
  {
    id: 'besteiro', name: 'Besteiro', kind: 'archer', cost: 75, unlockLevel: 20,
    hp: 1, damage: 38, attackRate: 2.2, range: 260, speed: 0,
    description: 'Alcance longo, ataque lento e forte.',
  },
  // ---------- Construções ----------
  {
    id: 'casa', name: 'Casa', kind: 'structure', cost: 50, unlockLevel: 1,
    hp: 1, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Casa dentro do castelo. Cada casa abriga 3 soldados.',
  },
  {
    id: 'barricada', name: 'Barricada', kind: 'structure', cost: 10, unlockLevel: 1,
    hp: 16, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Estacas de madeira baratas. Seguram o inimigo por 2 golpes.',
  },
  {
    id: 'muro', name: 'Muro', kind: 'structure', cost: 40, unlockLevel: 1,
    hp: 56, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Muro de madeira. Segura os inimigos por pouco tempo. Leva 3 arqueiros.',
  },
  // ---------- Peças de muro (construídas na grade, onde o jogador quiser) ----------
  {
    id: 'muros', name: 'Muros', kind: 'structure', cost: 10, unlockLevel: 1,
    hp: 1, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Abre a construção de muros e portas.',
  },
  {
    id: 'mmadeira', name: 'Muro de madeira', kind: 'structure', cost: 10, unlockLevel: 1,
    hp: 30, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Pedaço de muro de madeira. Leva 1 arqueiro.',
  },
  {
    id: 'mpedra', name: 'Muro de pedra', kind: 'structure', cost: 25, unlockLevel: 1,
    hp: 70, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Pedaço de muro de pedra, bem mais forte. Leva 1 arqueiro.',
  },
  {
    id: 'pmadeira', name: 'Porta de madeira', kind: 'structure', cost: 45, unlockLevel: 1,
    hp: 40, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Abre só para os nossos soldados.',
  },
  {
    id: 'ppedra', name: 'Porta de pedra', kind: 'structure', cost: 70, unlockLevel: 1,
    hp: 80, damage: 0, attackRate: 0, range: 0, speed: 0,
    description: 'Porta forte. Abre só para os nossos soldados.',
  },
  {
    id: 'torre', name: 'Torre', kind: 'structure', cost: 150, unlockLevel: 8,
    hp: 400, damage: 34, attackRate: 1.6, range: 280, speed: 0,
    description: 'Torre com balista: dispara flechas gigantes sozinha.',
  },
];

export const SELL_REFUND = 0.5;

export function getPlayerUnit(id: string): PlayerUnitDef {
  const def = PLAYER_UNITS.find((u) => u.id === id);
  if (!def) throw new Error(`Unidade desconhecida: ${id}`);
  return def;
}
