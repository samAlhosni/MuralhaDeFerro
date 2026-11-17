// Salvamento local do progresso (só no aparelho, sem login e sem nuvem).
// Se o jogador trocar de celular, começa do zero.

import { TOTAL_LEVELS } from '../data/levels';
import type { Snapshot } from './campaign';

export interface Profile {
  nickname: string;
  createdAt: string; // data/hora de criação (ISO)
  lastLogin: string;
  device: string; // modelo/sistema do aparelho
  askedNickname: boolean;
}

export interface SaveData {
  version: 1;
  coins: number;
  maxUnlocked: number; // maior fase liberada = nível do jogador
  stars: number[]; // estrelas por fase (0-3)
  daily: { lastClaim: string | null; streak: number };
  battlesSinceAd: number;
  removeAds: boolean; // comprou "sem anúncios"
  sound: boolean; // efeitos sonoros ligados
  music: boolean; // música ligada
  tutorialDone: boolean; // já fez a Fase 0 (como jogar)
  freeVideos: { day: string | null; count: number }; // vídeos de moedas grátis hoje
  campaign: { carry: Snapshot | null; retry: Snapshot | null }; // progresso dentro da era
  profile: Profile;
}

const KEY = 'mdf_save_v1';
export const STARTING_COINS = 200;
export const MIN_BATTLE_COINS = 150;

function detectDevice(): string {
  const ua = navigator.userAgent;
  const android = ua.match(/Android\s([\d.]+);\s?([^;)]+)/);
  if (android) return `Android ${android[1]} - ${android[2].trim()}`;
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Windows/.test(ua)) return 'Windows (navegador)';
  if (/Mac/.test(ua)) return 'Mac (navegador)';
  return 'Desconhecido';
}

function fresh(): SaveData {
  const now = new Date().toISOString();
  return {
    version: 1,
    coins: STARTING_COINS,
    maxUnlocked: 1,
    stars: new Array(TOTAL_LEVELS).fill(0),
    daily: { lastClaim: null, streak: 0 },
    battlesSinceAd: 0,
    removeAds: false,
    sound: true,
    music: true,
    tutorialDone: false,
    freeVideos: { day: null, count: 0 },
    campaign: { carry: null, retry: null },
    profile: {
      nickname: 'Comandante',
      createdAt: now,
      lastLogin: now,
      device: detectDevice(),
      askedNickname: false,
    },
  };
}

let data: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData;
      const base = fresh();
      const merged: SaveData = {
        ...base,
        ...parsed,
        daily: { ...base.daily, ...parsed.daily },
        freeVideos: { ...base.freeVideos, ...parsed.freeVideos },
        campaign: { ...base.campaign, ...parsed.campaign },
        profile: { ...base.profile, ...parsed.profile },
      };
      if (!Array.isArray(merged.stars) || merged.stars.length !== TOTAL_LEVELS) {
        const s = new Array(TOTAL_LEVELS).fill(0);
        (merged.stars ?? []).forEach((v, i) => { if (i < TOTAL_LEVELS) s[i] = v; });
        merged.stars = s;
      }
      merged.profile.lastLogin = new Date().toISOString();
      merged.profile.device = detectDevice();
      return merged;
    }
  } catch {
    // armazenamento indisponível ou corrompido: começa do zero
  }
  return fresh();
}

export const Save = {
  get(): SaveData {
    return data;
  },
  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // ignora (modo privado etc.)
    }
  },
  addCoins(amount: number) {
    data.coins = Math.max(0, Math.round(data.coins + amount));
    this.persist();
  },
  spend(amount: number): boolean {
    if (data.coins < amount) return false;
    data.coins -= amount;
    this.persist();
    return true;
  },
  playerLevel(): number {
    return data.maxUnlocked;
  },
  completeLevel(n: number, stars: number) {
    data.stars[n - 1] = Math.max(data.stars[n - 1] ?? 0, stars);
    if (n >= data.maxUnlocked && n < TOTAL_LEVELS) data.maxUnlocked = n + 1;
    this.persist();
  },
  reset() {
    data = fresh();
    this.persist();
  },
};
