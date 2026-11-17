// Progresso que passa de uma fase para a outra dentro da mesma ERA.
// A cada 5 fases muda a era (e o mapa): aí começa de novo com 1 casa e 1 soldado.

import { Save } from './save';
import { tr } from '../i18n';

export const LEVELS_PER_ERA = 5;

export interface Snapshot {
  level: number; // fase em que este estado deve ser usado
  houses: number[]; // (antigo) lugares com casa construída
  houseLevel?: number; // nível da casa (cada nível = 3 soldados)
  units: { id: string; x: number; y: number; hp: number; free?: boolean }[];
  structures: { id: string; x: number; y: number; hp: number }[];
  archers: { id: string; host: 'wall' | 'palisade'; hostIndex: number; spot: number; free?: boolean }[];
  walls: number[]; // vida de cada pedaço da muralha (0 = caído)
  keep: number;
}

export interface Era {
  index: number;
  theme: number;
  name: string;
}

const ERA_NAMES = ['Primavera', 'Outono', 'Deserto', 'Pântano', 'Inverno'];

export function eraOf(level: number): Era {
  // fase 0 (tutorial) usa a primeira era
  const index = Math.floor((Math.max(1, level) - 1) / LEVELS_PER_ERA);
  const theme = index % ERA_NAMES.length;
  return { index, theme, name: `${tr(`Era ${index + 1}`)}: ${tr(ERA_NAMES[theme])}` };
}

export function isEraStart(level: number) {
  return (level - 1) % LEVELS_PER_ERA === 0;
}

export const Campaign = {
  /** Estado para começar esta fase (ou null = começar do zero da era). */
  load(level: number): Snapshot | null {
    const c = Save.get().campaign;
    if (c.retry && c.retry.level === level) return c.retry;
    if (c.carry && c.carry.level === level) return c.carry;
    return null;
  },
  /** Guarda o estado para tentar de novo esta fase (início da batalha / saiu no meio). */
  saveRetry(s: Snapshot) {
    Save.get().campaign.retry = s;
    Save.persist();
  },
  /** Venceu: leva o que sobrou para a próxima fase se ainda for a mesma era. */
  saveCarry(s: Snapshot) {
    const c = Save.get().campaign;
    c.retry = null;
    c.carry = eraOf(s.level).index === eraOf(s.level - 1).index ? s : null;
    Save.persist();
  },
};
