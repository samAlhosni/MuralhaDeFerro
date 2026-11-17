// Recompensa diária: cada dia seguido que o jogador entra ganha mais moedas.
// Se pular um dia, a sequência volta para o dia 1.

import { Save } from './save';

export const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export const Daily = {
  /** Retorna o índice (0-6) do dia a receber hoje, ou null se já recebeu. */
  pendingDay(): number | null {
    const s = Save.get().daily;
    const today = dayKey(new Date());
    if (s.lastClaim === today) return null;
    if (s.lastClaim && daysBetween(s.lastClaim, today) === 1) {
      return s.streak % DAILY_REWARDS.length;
    }
    return 0;
  },
  /** Dia atual da sequência para exibição (0-6). */
  currentStreakIndex(): number {
    const p = this.pendingDay();
    if (p !== null) return p;
    return (Save.get().daily.streak - 1 + DAILY_REWARDS.length) % DAILY_REWARDS.length;
  },
  claim(multiplier = 1): number {
    const idx = this.pendingDay();
    if (idx === null) return 0;
    const amount = DAILY_REWARDS[idx] * multiplier;
    const data = Save.get();
    data.daily.lastClaim = dayKey(new Date());
    data.daily.streak = idx + 1;
    Save.addCoins(amount);
    return amount;
  },
};
