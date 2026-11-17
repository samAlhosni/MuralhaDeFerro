// Gera as 100 fases da carreira com dificuldade subindo aos poucos.
// A geração é determinística (mesma fase = mesmas ondas sempre).

import { ENEMIES } from './enemies';

export const TOTAL_LEVELS = 100;

export interface SpawnGroup {
  enemy: string;
  count: number;
  interval: number; // segundos entre cada inimigo do grupo
}

export interface WaveDef {
  groups: SpawnGroup[];
  /** Segundo da batalha em que esta onda começa (não espera a anterior acabar). */
  startAt: number;
  /** Quanto tempo leva para todos os inimigos desta onda saírem da fortaleza. */
  duration: number;
  /** Onda do chefe: ele vem no meio de uma formação de guardas. */
  boss?: { id: 'capitao' | 'senhor'; escort: string; escorts: number };
}

export interface LevelDef {
  number: number;
  waves: WaveDef[];
  hpMul: number;
  dmgMul: number;
  rewardMul: number;
  bossId: 'capitao' | 'senhor';
  completionBonus: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fase 0: tutorial "como jogar" — poucos inimigos fracos, sem chefe. */
function tutorialLevel(): LevelDef {
  return {
    number: 0,
    waves: [
      { groups: [{ enemy: 'saqueador', count: 3, interval: 1.8 }], startAt: 0, duration: 8 },
      { groups: [{ enemy: 'saqueador', count: 4, interval: 1.6 }], startAt: 26, duration: 10 },
    ],
    hpMul: 0.8,
    dmgMul: 0.8,
    rewardMul: 1,
    bossId: 'capitao',
    completionBonus: 60,
  };
}

export function getLevel(n: number): LevelDef {
  if (n === 0) return tutorialLevel();
  const rand = mulberry32(n * 7919 + 13);
  const waveCount = Math.min(3 + Math.floor((n - 1) / 15), 8);
  const available = ENEMIES.filter((e) => e.fromLevel <= n);
  const isBigBoss = n % 10 === 0;

  const waves: WaveDef[] = [];
  for (let w = 0; w < waveCount; w++) {
    let budget = 4 + n * 0.8 + w * 2;
    const counts = new Map<string, number>();
    let guard = 0;
    while (budget >= 1 && guard++ < 200) {
      // Inimigos mais novos aparecem com mais frequência nas ondas finais
      const pool = available.filter((e) => e.points <= budget);
      if (pool.length === 0) break;
      const weights = pool.map((e) => 1 + (w / waveCount) * e.points * 0.6);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rand() * total;
      let pick = pool[0];
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) { pick = pool[i]; break; }
      }
      counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
      budget -= pick.points;
    }
    const groups: SpawnGroup[] = [...counts.entries()].map(([enemy, count]) => ({
      enemy,
      count,
      interval: Math.max(0.5, 1.6 - n * 0.008),
    }));
    // Embaralha a ordem dos grupos
    groups.sort(() => rand() - 0.5);
    const duration = groups.reduce((t, g) => t + g.count * g.interval, 0) + groups.length * 1.5;
    waves.push({ groups, startAt: 0, duration });
  }

  // Cronograma: cada onda começa num horário próprio. Às vezes no meio da
  // onda anterior, às vezes logo no fim, às vezes com uma pausa.
  // Nas fases altas as ondas se cruzam com mais frequência.
  const pressure = (n - 1) / (TOTAL_LEVELS - 1); // 0 → 1
  for (let w = 1; w < waves.length; w++) {
    const prev = waves[w - 1];
    const factor = 0.45 + rand() * 0.9 - pressure * 0.3; // <1 = cruza com a anterior
    const extra = rand() * (9 - pressure * 6); // folga extra em segundos
    waves[w].startAt = Math.round((prev.startAt + prev.duration * Math.max(0.3, factor) + extra) * 10) / 10;
  }

  // Onda do chefe (depois das ondas normais): chefe cercado de guardas, em formação.
  const melee = available.filter((e) => !e.ranged && !e.siege);
  const escort = melee.reduce((best, e) => (e.points > best.points ? e : best), melee[0]);
  const escorts = Math.min(10, 4 + Math.floor(n / 15));
  const last = waves[waves.length - 1];
  waves.push({
    groups: [],
    startAt: Math.round((last.startAt + last.duration + 4 + rand() * 4) * 10) / 10,
    duration: 4,
    boss: { id: isBigBoss ? 'senhor' : 'capitao', escort: escort.id, escorts },
  });

  return {
    number: n,
    waves,
    hpMul: 1 + (n - 1) * 0.035,
    dmgMul: 1 + (n - 1) * 0.025,
    rewardMul: 1 + (n - 1) * 0.02,
    bossId: isBigBoss ? 'senhor' : 'capitao',
    completionBonus: Math.round(50 + n * 6),
  };
}
