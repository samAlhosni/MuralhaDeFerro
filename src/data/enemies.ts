// Inimigos (vêm da fortaleza do outro lado).

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  attackRate: number;
  range: number;
  speed: number;
  reward: number; // moedas ao derrotar
  points: number; // "custo" usado para montar as ondas
  fromLevel: number; // aparece a partir desta fase
  ranged?: boolean;
  cavalry?: boolean;
  siege?: boolean; // só ataca construções/castelo e passa pelas unidades
  splash?: number;
  scale?: number;
  boss?: boolean;
}

// Cavaleiros e arqueiros aparecem mais cedo para variar as ondas desde o começo.
export const ENEMIES: EnemyDef[] = [
  { id: 'saqueador', name: 'Saqueador', hp: 70, damage: 8, attackRate: 1.0, range: 8, speed: 45, reward: 6, points: 1, fromLevel: 1 },
  { id: 'guerreiro', name: 'Guerreiro', hp: 140, damage: 14, attackRate: 1.0, range: 10, speed: 42, reward: 10, points: 2, fromLevel: 3 },
  { id: 'arqueiroinim', name: 'Arqueiro Inimigo', hp: 70, damage: 10, attackRate: 1.6, range: 165, speed: 40, reward: 10, points: 2, fromLevel: 2, ranged: true },
  { id: 'cavnegro', name: 'Cavaleiro Negro', hp: 260, damage: 22, attackRate: 0.9, range: 12, speed: 95, reward: 20, points: 4, fromLevel: 9, cavalry: true },
  { id: 'bruto', name: 'Bruto', hp: 400, damage: 30, attackRate: 1.6, range: 12, speed: 30, reward: 22, points: 5, fromLevel: 12, scale: 1.25 },
  // armas de cerco (fases avançadas)
  { id: 'ariete', name: 'Aríete', hp: 500, damage: 60, attackRate: 2.4, range: 10, speed: 26, reward: 35, points: 6, fromLevel: 15, siege: true },
  { id: 'catapulta', name: 'Catapulta', hp: 320, damage: 45, attackRate: 4.0, range: 300, speed: 22, reward: 40, points: 7, fromLevel: 22, siege: true, ranged: true, splash: 36 },
];

/** Chefes têm nomes de heróis e guerreiros antigos famosos. */
const CAPTAIN_NAMES = [
  'Aquiles', 'Heitor', 'Leônidas', 'Ájax', 'Ulisses', 'Espártaco', 'Perseu', 'Teseu', 'Jasão',
  'Rômulo', 'Vercingetórix', 'Boudica', 'Ragnar', 'Siegfried', 'Beowulf', 'El Cid', 'Rolando', 'Artur',
];
const WARLORD_NAMES = [
  'Hércules, o Invencível', 'Alexandre, o Grande', 'Aníbal, o Conquistador', 'Átila, o Huno',
  'Júlio César', 'Gengis Khan', 'Saladino', 'Carlos Magno', 'Ricardo Coração de Leão', 'Xerxes, o Rei dos Reis',
];

export function bossName(level: number): string {
  if (level % 10 === 0) return WARLORD_NAMES[(level / 10 - 1) % WARLORD_NAMES.length];
  return CAPTAIN_NAMES[(level * 7) % CAPTAIN_NAMES.length];
}

// Chefes do mesmo tamanho dos outros soldados (só um pouco maiores).
export const BOSSES: Record<'capitao' | 'senhor', EnemyDef> = {
  capitao: {
    id: 'capitao', name: 'Capitão Invasor', hp: 600, damage: 30, attackRate: 1.2, range: 14, speed: 35,
    reward: 60, points: 0, fromLevel: 1, scale: 1.08, boss: true,
  },
  senhor: {
    id: 'senhor', name: 'Senhor da Guerra', hp: 2000, damage: 60, attackRate: 1.5, range: 18, speed: 30,
    reward: 200, points: 0, fromLevel: 10, scale: 1.12, splash: 50, boss: true,
  },
};

/**
 * Cada chefe tem uma aparência e arma diferente (loiro com espada, arqueiro,
 * lanceiro, martelo, cavaleiro...). A variante é escolhida pela fase.
 */
export interface BossLook {
  tex: string;
  ranged?: boolean;
  cavalry?: boolean;
}
export const BOSS_LOOKS: BossLook[] = [
  { tex: 'boss_0' }, // loiro com espada e escudo
  { tex: 'boss_1' }, // barbudo com machado grande
  { tex: 'boss_2', ranged: true }, // arqueira de tranças
  { tex: 'boss_3' }, // lanceiro com pluma vermelha
  { tex: 'boss_4' }, // cavaleiro de martelo e capa preta
  { tex: 'boss_5' }, // ruivo com espada curta e escudo
  { tex: 'boss_6', cavalry: true }, // cavaleiro montado com lança
  { tex: 'boss_7' }, // rei velho de barba branca e coroa
];

export function bossLook(level: number): BossLook {
  return BOSS_LOOKS[(level * 5 + Math.floor(level / 10)) % BOSS_LOOKS.length];
}

export function getEnemy(id: string): EnemyDef {
  if (id === 'capitao') return BOSSES.capitao;
  if (id === 'senhor') return BOSSES.senhor;
  const def = ENEMIES.find((e) => e.id === id);
  if (!def) throw new Error(`Inimigo desconhecido: ${id}`);
  return def;
}
