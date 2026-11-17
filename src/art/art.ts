// Arte desenhada por código (Canvas 2D) em alta resolução.
// Visão de cima (top-down, levemente inclinada) com personagens estilo "chibi".
// Quando comprarmos um pacote de arte profissional, basta trocar estas
// texturas por imagens com as mesmas chaves (keys).

import Phaser from 'phaser';
import { MAP, CASTLE } from '../battle/map';

/** Fator de resolução: texturas são desenhadas em 2x e exibidas com escala 0.5. */
export const R = 2;
export const WORLD_W = 1280;
export const WORLD_H = 720;

type Ctx = CanvasRenderingContext2D;
const OUT = '#2a1a10';

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * R), Math.ceil(h * R));
  if (!tex) return;
  const c = tex.getContext();
  c.save();
  c.scale(R, R);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  c.restore();
  tex.refresh();
}

// ---------- utilidades ----------
function hexToRgb(hex: string) {
  // aceita "#rrggbb" e também "rgb(r,g,b)" (resultado de outra chamada de shade)
  if (hex.startsWith('rgb')) {
    const [r, g, b] = hex.replace(/[^\d,]/g, '').split(',').map(Number);
    return { r, g, b };
  }
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function shade(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? x + (255 - x) * amt : x * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function vgrad(c: Ctx, y0: number, y1: number, top: string, bottom: string) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}
function hgrad(c: Ctx, x0: number, x1: number, a: string, b: string) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}
function rgrad(c: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}
function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
function circle(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function fillStroke(c: Ctx, fill: string | CanvasGradient, lw = 1.6) {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  c.stroke();
}
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
/** Brilho suave (reflexo) — dá aparência de volume. */
function gloss(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45) {
  c.save();
  c.fillStyle = `rgba(255,255,255,${a})`;
  ellipse(c, x, y, rx, ry);
  c.fill();
  c.restore();
}

// =====================================================================
// ARMAS
// =====================================================================
type Weapon = 'shortsword' | 'sword' | 'axe' | 'bigaxe' | 'spear' | 'lance' | 'hammer' | 'bow' | 'crossbow' | 'club' | 'none';

function drawWeapon(c: Ctx, w: Weapon, hx: number, hy: number) {
  const steel = (y0: number, y1: number) => vgrad(c, y0, y1, '#ffffff', '#8e9aa6');
  const wood = '#8a5a2e';
  c.save();
  c.translate(hx, hy);
  switch (w) {
    case 'shortsword':
    case 'sword': {
      const len = w === 'sword' ? 28 : 18;
      c.rotate(0.5);
      c.beginPath();
      c.moveTo(-2.2, -2);
      c.lineTo(-2.2, -len);
      c.lineTo(0, -len - 4);
      c.lineTo(2.2, -len);
      c.lineTo(2.2, -2);
      c.closePath();
      fillStroke(c, hgrad(c, -2, 2, '#ffffff', '#9aa6b2'), 1.2);
      c.strokeStyle = 'rgba(120,135,150,.8)';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(0, -len);
      c.stroke();
      rrect(c, -6.5, -3.5, 13, 3.4, 1.5);
      fillStroke(c, vgrad(c, -4, 0, '#ffe58a', '#c98a1c'), 1.1);
      rrect(c, -1.6, 0, 3.2, 6, 1);
      fillStroke(c, '#5b3a1e', 1.1);
      circle(c, 0, 7.5, 2);
      fillStroke(c, '#ffd36b', 1);
      break;
    }
    case 'axe':
    case 'bigaxe': {
      const big = w === 'bigaxe';
      const len = big ? 36 : 28;
      c.rotate(0.35);
      rrect(c, -1.9, -len, 3.8, len + 7, 1.5);
      fillStroke(c, vgrad(c, -len, 7, '#a06a38', '#6b4422'), 1.2);
      const hs = big ? 1.35 : 1;
      c.beginPath();
      c.moveTo(1, -len + 1);
      c.quadraticCurveTo(15 * hs, -len - 7 * hs, 17 * hs, -len + 8 * hs);
      c.quadraticCurveTo(12 * hs, -len + 13 * hs, 1, -len + 12 * hs);
      c.closePath();
      fillStroke(c, steel(-len - 6, -len + 14), 1.3);
      c.strokeStyle = 'rgba(255,255,255,.8)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(14 * hs, -len - 2 * hs);
      c.quadraticCurveTo(16.5 * hs, -len + 3 * hs, 15 * hs, -len + 8 * hs);
      c.stroke();
      if (big) {
        c.beginPath();
        c.moveTo(-1, -len + 2);
        c.quadraticCurveTo(-12, -len - 2, -14, -len + 9);
        c.quadraticCurveTo(-10, -len + 12, -1, -len + 12);
        c.closePath();
        fillStroke(c, steel(-len - 2, -len + 12), 1.3);
      }
      break;
    }
    case 'spear':
    case 'lance': {
      const len = w === 'lance' ? 58 : 50;
      c.rotate(w === 'lance' ? 1.25 : 0.95);
      rrect(c, -1.6, -len + 8, 3.2, len, 1.5);
      fillStroke(c, w === 'lance' ? hgrad(c, -2, 2, '#fff7e6', '#c9bfa6') : wood, 1.1);
      c.beginPath();
      c.moveTo(0, -len - 5);
      c.lineTo(4.2, -len + 9);
      c.lineTo(-4.2, -len + 9);
      c.closePath();
      fillStroke(c, steel(-len - 5, -len + 9), 1.1);
      if (w === 'lance') {
        c.beginPath();
        c.moveTo(-6, -12);
        c.lineTo(6, -12);
        c.lineTo(3.5, 2);
        c.lineTo(-3.5, 2);
        c.closePath();
        fillStroke(c, vgrad(c, -12, 2, '#e0605b', '#8e2424'), 1.1);
      } else {
        c.fillStyle = '#c23b3b';
        c.beginPath();
        c.moveTo(-1.6, -len + 10);
        c.lineTo(-7, -len + 16);
        c.lineTo(-1.6, -len + 18);
        c.fill();
      }
      break;
    }
    case 'hammer': {
      c.rotate(0.3);
      rrect(c, -2, -34, 4, 42, 1.5);
      fillStroke(c, vgrad(c, -34, 8, '#8a5a2e', '#4e3018'), 1.2);
      rrect(c, -11, -44, 22, 13, 3);
      fillStroke(c, vgrad(c, -44, -31, '#e8edf2', '#5d6873'), 1.4);
      rrect(c, -12, -39.5, 24, 3.2, 1);
      fillStroke(c, '#e0b04a', 1);
      gloss(c, -5, -41, 4, 1.4, 0.7);
      break;
    }
    case 'club': {
      c.rotate(0.4);
      c.beginPath();
      c.moveTo(-2, 6);
      c.lineTo(2, 6);
      c.lineTo(6, -24);
      c.quadraticCurveTo(0, -33, -6, -24);
      c.closePath();
      fillStroke(c, hgrad(c, -6, 6, '#9a6232', '#5a3618'), 1.3);
      c.fillStyle = '#e6dfcc';
      [[-3, -22], [3, -19], [-1, -14], [2, -26]].forEach(([x, y]) => {
        c.beginPath();
        c.moveTo(x - 1.5, y);
        c.lineTo(x + (x < 0 ? -3.5 : 3.5), y - 1.2);
        c.lineTo(x + 1.5, y);
        c.fill();
      });
      break;
    }
    case 'bow': {
      c.beginPath();
      c.arc(-6, -6, 17, -1.15, 1.15);
      c.lineWidth = 5;
      c.strokeStyle = OUT;
      c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = '#b5773c';
      c.stroke();
      c.beginPath();
      c.moveTo(-6 + 17 * Math.cos(-1.15), -6 + 17 * Math.sin(-1.15));
      c.lineTo(-6 + 17 * Math.cos(1.15), -6 + 17 * Math.sin(1.15));
      c.lineWidth = 0.9;
      c.strokeStyle = '#fff6e0';
      c.stroke();
      break;
    }
    case 'crossbow': {
      rrect(c, -10, -4, 24, 5, 1.5);
      fillStroke(c, '#7a4b25', 1.2);
      c.beginPath();
      c.moveTo(12, -14);
      c.quadraticCurveTo(18, -1.5, 12, 11);
      c.lineWidth = 4.4;
      c.strokeStyle = OUT;
      c.stroke();
      c.lineWidth = 2.6;
      c.strokeStyle = '#7d8a96';
      c.stroke();
      c.beginPath();
      c.moveTo(12, -14);
      c.lineTo(4, -1.5);
      c.lineTo(12, 11);
      c.lineWidth = 0.8;
      c.strokeStyle = '#fff6e0';
      c.stroke();
      break;
    }
    case 'none':
      break;
  }
  c.restore();
}

// =====================================================================
// PERSONAGENS (chibi: cabeça grande, corpo pequeno, olhos expressivos)
// =====================================================================
type Helmet = 'none' | 'cap' | 'nasal' | 'knight' | 'horned' | 'hood' | 'crown' | 'warcrown' | 'bandana' | 'hair' | 'braids' | 'haircrown';

interface HumanOpts {
  tunic: string;
  armor?: string;
  tabard?: string; // faixa central com emblema (cor do time)
  skin?: string;
  hair?: string;
  helmet: Helmet;
  helmetColor?: string;
  plume?: string;
  weapon: Weapon;
  shield?: 'round' | 'kite' | null;
  shieldColor?: string;
  emblem?: string;
  cape?: string;
  beard?: string;
  eyes?: string;
  angry?: boolean;
  mounted?: boolean;
  pants?: string;
  handless?: boolean;
  stride?: number; // -1, 0, 1: posição das pernas no passo
}

function drawHelmet(c: Ctx, h: Helmet, color: string, plume: string | undefined, hx: number, hy: number, k: number) {
  c.save();
  c.translate(hx, hy);
  c.scale(k, k);
  const r = 10;
  switch (h) {
    case 'cap':
      c.beginPath();
      c.arc(0, -1, r + 0.6, Math.PI * 1.0, Math.PI * 2.0);
      c.quadraticCurveTo(r + 4, 1, r + 2, 2);
      c.lineTo(-r, 1);
      c.closePath();
      fillStroke(c, rgrad(c, 0, -5, 12, shade(color, 0.3), shade(color, -0.25)), 1.3);
      break;
    case 'hair':
    case 'braids':
    case 'haircrown': {
      // cabelo de verdade (sem capacete): topo + franja; tranças opcionais
      c.beginPath();
      c.arc(0, -1, r + 1.2, Math.PI * 0.95, Math.PI * 2.05);
      c.quadraticCurveTo(r - 2, -3, r - 5, -6);
      c.quadraticCurveTo(2, -2, -3, -6);
      c.quadraticCurveTo(-r + 2, -1, -r - 1, 3);
      c.closePath();
      fillStroke(c, rgrad(c, 0, -6, 13, shade(color, 0.35), shade(color, -0.25)), 1.3);
      c.strokeStyle = shade(color, -0.35);
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(-4, -r);
      c.quadraticCurveTo(0, -6, 2, -3);
      c.moveTo(2, -r);
      c.quadraticCurveTo(5, -7, 6, -5);
      c.stroke();
      if (h === 'braids') {
        [[-r + 1, 2], [-r + 3, 7]].forEach(([bx, by]) => {
          rrect(c, bx - 2, by, 4, 14, 2);
          fillStroke(c, shade(color, -0.05), 1);
        });
      }
      if (h === 'haircrown') {
        c.beginPath();
        c.moveTo(-8, -r + 1);
        c.lineTo(-8, -r - 5);
        c.lineTo(-4, -r - 2);
        c.lineTo(0, -r - 7);
        c.lineTo(4, -r - 2);
        c.lineTo(8, -r - 5);
        c.lineTo(8, -r + 1);
        c.closePath();
        fillStroke(c, vgrad(c, -r - 7, -r + 1, '#fff3a6', '#c98a1c'), 1.1);
      }
      break;
    }
    case 'bandana':
      c.beginPath();
      c.arc(0, -1, r + 0.5, Math.PI * 1.05, Math.PI * 1.95);
      c.closePath();
      fillStroke(c, rgrad(c, 0, -5, 12, shade(color, 0.25), shade(color, -0.3)), 1.3);
      c.beginPath();
      c.moveTo(-r + 1, -2);
      c.quadraticCurveTo(-r - 6, 0, -r - 7, 6);
      c.quadraticCurveTo(-r - 3, 3, -r + 1, 1);
      fillStroke(c, shade(color, -0.15), 1.1);
      break;
    case 'nasal':
      c.beginPath();
      c.arc(0, -1, r + 1.2, Math.PI * 0.98, Math.PI * 2.02);
      c.closePath();
      fillStroke(c, rgrad(c, 0, -6, 12, '#ffffff', '#6f7b87'), 1.3);
      rrect(c, -r - 1, -2.5, 2 * r + 2, 2.6, 1);
      fillStroke(c, '#8a96a2', 0.9);
      rrect(c, 3.4, -2, 2.6, 7, 1);
      fillStroke(c, '#a9b4bf', 0.9);
      if (plume) {
        c.beginPath();
        c.moveTo(-1, -r - 1);
        c.quadraticCurveTo(-6, -r - 9, -14, -r - 3);
        c.quadraticCurveTo(-7, -r - 3, -2, -r + 1);
        fillStroke(c, plume, 1);
      }
      break;
    case 'knight':
      c.beginPath();
      c.arc(0, 0, r + 1.8, 0, Math.PI * 2);
      fillStroke(c, rgrad(c, 0, -2, 13, '#ffffff', '#64707c'), 1.4);
      // viseira em T com olhos aparecendo
      c.fillStyle = '#141a20';
      rrect(c, -1, -2.6, 12, 3.2, 1.4);
      c.fill();
      rrect(c, 4, -1, 3, 8, 1.2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)';
      ellipse(c, -4, -6, 4, 2);
      c.fill();
      // pluma
      c.beginPath();
      c.moveTo(-2, -r - 1);
      c.quadraticCurveTo(-8, -r - 13, -17, -r - 4);
      c.quadraticCurveTo(-10, -r - 4, -4, -r + 2);
      c.closePath();
      fillStroke(c, plume ?? color, 1.1);
      break;
    case 'horned':
      c.beginPath();
      c.arc(0, -1, r + 1.2, Math.PI * 0.98, Math.PI * 2.02);
      c.closePath();
      fillStroke(c, rgrad(c, 0, -6, 12, '#b7bec5', '#3e454b'), 1.3);
      rrect(c, -r - 1, -2.5, 2 * r + 2, 2.6, 1);
      fillStroke(c, '#5b4a3a', 0.9);
      [-1, 1].forEach((s) => {
        c.beginPath();
        c.moveTo(s * 7, -6);
        c.quadraticCurveTo(s * 17, -9, s * 15, -21);
        c.quadraticCurveTo(s * 11, -12, s * 3, -9);
        c.closePath();
        fillStroke(c, vgrad(c, -21, -6, '#fffaf0', '#cbbd99'), 1.1);
      });
      break;
    case 'hood':
      c.beginPath();
      c.arc(-1, 0, r + 3, Math.PI * 0.5, Math.PI * 2.1);
      c.quadraticCurveTo(8, 9, -3, 12);
      c.closePath();
      fillStroke(c, rgrad(c, -1, -4, 15, shade(color, 0.25), shade(color, -0.4)), 1.3);
      c.beginPath();
      c.moveTo(-r - 2, -2);
      c.quadraticCurveTo(-r - 8, 6, -r - 3, 12);
      c.lineTo(-r + 1, 6);
      fillStroke(c, shade(color, -0.2), 1.1);
      break;
    case 'crown':
    case 'warcrown': {
      if (h === 'warcrown') {
        c.beginPath();
        c.arc(0, 0, r + 1.8, 0, Math.PI * 2);
        fillStroke(c, rgrad(c, 0, -3, 13, '#6a7078', '#1c1f23'), 1.4);
        c.fillStyle = '#ff3a1a';
        rrect(c, 1, -2.5, 9, 2.8, 1.2);
        c.fill();
        c.fillStyle = 'rgba(255,90,40,.35)';
        ellipse(c, 5, -1, 7, 4);
        c.fill();
        [-1, 1].forEach((s) => {
          c.beginPath();
          c.moveTo(s * 6, -8);
          c.quadraticCurveTo(s * 19, -12, s * 17, -27);
          c.quadraticCurveTo(s * 11, -15, s * 2, -11);
          c.closePath();
          fillStroke(c, vgrad(c, -27, -8, '#4a4a4a', '#151515'), 1.2);
        });
      }
      c.beginPath();
      const y = -r + (h === 'warcrown' ? -2 : 1);
      c.moveTo(-9, y + 5);
      c.lineTo(-9, y - 4);
      c.lineTo(-5, y + 0.5);
      c.lineTo(0, y - 6);
      c.lineTo(5, y + 0.5);
      c.lineTo(9, y - 4);
      c.lineTo(9, y + 5);
      c.closePath();
      fillStroke(c, vgrad(c, y - 6, y + 5, '#fff3a6', '#c98a1c'), 1.2);
      c.fillStyle = '#e0303a';
      circle(c, 0, y + 1.5, 1.6);
      c.fill();
      break;
    }
    case 'none':
      break;
  }
  c.restore();
}

function drawHuman(c: Ctx, o: HumanOpts) {
  const skin = o.skin ?? '#f6cfa6';
  const cx = 28;
  const pants = o.pants ?? '#4a3b2c';
  // Proporções mais realistas (cabeça ~1/4 do corpo), rosto discreto.
  const hx = cx + 1;
  const hy = 20;
  const hr = 9.5;
  const boot = (x: number, y: number, w: number) => {
    rrect(c, x, y, w, 7, 3);
    fillStroke(c, vgrad(c, y, y + 7, '#7a5636', '#33210f'), 1.2);
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(x + 2, y + 1.2, w - 4, 1.2);
  };

  // capa (atrás de tudo)
  if (o.cape) {
    c.beginPath();
    c.moveTo(cx - 7, 32);
    c.quadraticCurveTo(cx - 18, 48, cx - 15, o.mounted ? 58 : 68);
    c.quadraticCurveTo(cx - 6, 72, cx + 3, o.mounted ? 58 : 66);
    c.lineTo(cx + 4, 34);
    c.closePath();
    fillStroke(c, vgrad(c, 32, 70, shade(o.cape, 0.15), shade(o.cape, -0.45)), 1.4);
    c.strokeStyle = 'rgba(0,0,0,.2)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 9, 40);
    c.quadraticCurveTo(cx - 13, 54, cx - 10, 66);
    c.stroke();
  }
  // braço de trás
  rrect(c, cx - 12.5, 33, 6, 15, 3);
  fillStroke(c, shade(o.tunic, -0.35), 1.2);
  // pernas e botas
  if (!o.mounted) {
    // cada perna gira no quadril conforme o passo (quadros de caminhada)
    const st = o.stride ?? 0;
    const leg = (hipX: number, ang: number, back: boolean) => {
      c.save();
      c.translate(hipX, 52);
      c.rotate(ang);
      c.translate(-hipX, -52);
      rrect(c, hipX - 3, 52, 6, 13, 2.5);
      fillStroke(c, back ? shade(pants, -0.25) : hgrad(c, hipX - 3, hipX + 3, shade(pants, 0.15), shade(pants, -0.15)), 1.2);
      boot(hipX - 4.5, 63, back ? 8.5 : 9.5);
      c.restore();
    };
    leg(cx - 4, -0.42 * st, true);
    leg(cx + 4, 0.42 * st, false);
  } else {
    rrect(c, cx - 1, 50, 7, 11, 3);
    fillStroke(c, pants, 1.2);
    boot(cx - 1, 59, 10);
  }
  // tronco
  rrect(c, cx - 9.5, 30, 19, 24, 6);
  fillStroke(c, hgrad(c, cx - 9.5, cx + 9.5, shade(o.tunic, 0.25), shade(o.tunic, -0.35)), 1.4);
  // dobras do tecido
  c.strokeStyle = 'rgba(0,0,0,.18)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx - 5, 46);
  c.lineTo(cx - 6, 53);
  c.moveTo(cx + 5, 46);
  c.lineTo(cx + 6, 53);
  c.stroke();
  if (o.armor) {
    // cota de malha (anéis) por baixo, aparecendo até o quadril
    c.save();
    rrect(c, cx - 9.5, 40, 19, 14, 4);
    c.clip();
    c.fillStyle = shade(o.armor, -0.35);
    c.fillRect(cx - 10, 40, 20, 14);
    c.strokeStyle = shade(o.armor, 0.25);
    c.lineWidth = 0.55;
    for (let yy = 41; yy < 54; yy += 1.8) {
      for (let xx = cx - 10 + ((yy * 10) % 2); xx < cx + 10; xx += 2) {
        c.beginPath();
        c.arc(xx, yy, 0.9, 0, Math.PI);
        c.stroke();
      }
    }
    c.restore();
    // peitoral
    rrect(c, cx - 8.5, 31, 17, 14, 5);
    fillStroke(c, vgrad(c, 31, 45, shade(o.armor, 0.55), shade(o.armor, -0.3)), 1.1);
    c.strokeStyle = 'rgba(40,50,60,.35)';
    c.lineWidth = 0.7;
    for (let yy = 34; yy < 44; yy += 2.5) {
      c.beginPath();
      c.moveTo(cx - 7, yy);
      c.lineTo(cx + 7, yy);
      c.stroke();
    }
    gloss(c, cx - 3, 34, 3.5, 1.4, 0.6);
    // ombreiras
    ellipse(c, cx - 8, 32.5, 4.5, 3.4);
    fillStroke(c, rgrad(c, cx - 8, 32, 5, shade(o.armor, 0.5), shade(o.armor, -0.3)), 1.1);
    ellipse(c, cx + 7, 32.5, 4.5, 3.4);
    fillStroke(c, rgrad(c, cx + 7, 32, 5, shade(o.armor, 0.6), shade(o.armor, -0.25)), 1.1);
    // rebites
    c.fillStyle = shade(o.armor, 0.7);
    [[cx - 9.5, 32], [cx - 6.5, 33.5], [cx + 5.5, 33.5], [cx + 8.5, 32], [cx - 6, 42.5], [cx + 6, 42.5]].forEach(([x, y]) => {
      circle(c, x, y, 0.7);
      c.fill();
    });
  }
  // bolsinha de couro no cinto
  rrect(c, cx + 4.5, 49, 4.5, 5, 1.2);
  fillStroke(c, vgrad(c, 49, 54, '#8a5a2e', '#4b2f1a'), 0.8);
  if (o.tabard) {
    c.beginPath();
    c.moveTo(cx - 4, 33);
    c.lineTo(cx + 4.5, 33);
    c.lineTo(cx + 5.5, 55);
    c.lineTo(cx + 0.5, 58);
    c.lineTo(cx - 4.5, 55);
    c.closePath();
    fillStroke(c, vgrad(c, 33, 58, shade(o.tabard, 0.2), shade(o.tabard, -0.3)), 1.1);
    if (o.emblem) {
      c.fillStyle = o.emblem;
      c.beginPath();
      c.moveTo(cx + 0.5, 38);
      c.lineTo(cx + 3.2, 42);
      c.lineTo(cx + 0.5, 46);
      c.lineTo(cx - 2.2, 42);
      c.closePath();
      c.fill();
    }
  }
  // cinto
  rrect(c, cx - 9.5, 48, 19, 3.6, 1.4);
  fillStroke(c, '#4b2f1a', 0.9);
  rrect(c, cx - 1.8, 48.2, 4, 3.2, 0.8);
  fillStroke(c, '#ffd36b', 0.8);

  // pescoço
  rrect(c, hx - 3, hy + 6, 6, 5, 2);
  fillStroke(c, shade(skin, -0.15), 1);
  // cabelo atrás
  if (o.hair && o.helmet !== 'knight' && o.helmet !== 'warcrown') {
    c.beginPath();
    c.arc(hx - 1.5, hy, hr + 1, Math.PI * 0.5, Math.PI * 1.55);
    c.closePath();
    fillStroke(c, o.hair, 1.2);
  }
  // sombra da cabeça no pescoço/peito
  c.fillStyle = 'rgba(0,0,0,.18)';
  ellipse(c, hx, hy + 10, 7, 2.6);
  c.fill();
  // cabeça
  circle(c, hx, hy, hr);
  fillStroke(c, rgrad(c, hx, hy, hr, shade(skin, 0.25), shade(skin, -0.2)), 1.5);
  // sombra do maxilar (dá forma ao rosto)
  c.save();
  circle(c, hx, hy, hr - 0.6);
  c.clip();
  const jaw = c.createLinearGradient(hx, hy + 2, hx, hy + hr);
  jaw.addColorStop(0, 'rgba(90,40,20,0)');
  jaw.addColorStop(1, 'rgba(90,40,20,.28)');
  c.fillStyle = jaw;
  c.fillRect(hx - hr, hy, hr * 2, hr);
  c.restore();
  ellipse(c, hx - 4, hy + 1.5, 1.8, 2.5);
  fillStroke(c, shade(skin, -0.08), 0.9);
  // rosto (olhos pequenos, nariz, boca)
  if (o.helmet !== 'knight' && o.helmet !== 'warcrown') {
    const ey = hy + 0.5;
    const eyeCol = o.eyes ?? '#1f150e';
    ([[hx + 5.8, 1.35], [hx + 1.8, 1.15]] as const).forEach(([ex, r]) => {
      circle(c, ex, ey, r);
      c.fillStyle = eyeCol;
      c.fill();
      circle(c, ex - 0.35, ey - 0.45, 0.45);
      c.fillStyle = '#ffffff';
      c.fill();
    });
    c.strokeStyle = o.hair ? shade(o.hair, -0.35) : '#3a2617';
    c.lineWidth = 1.2;
    c.beginPath();
    if (o.angry) {
      c.moveTo(hx + 0.2, ey - 3.6);
      c.lineTo(hx + 3.2, ey - 2.2);
      c.moveTo(hx + 4.5, ey - 2.2);
      c.lineTo(hx + 7.8, ey - 3.8);
    } else {
      c.moveTo(hx + 0.5, ey - 3);
      c.lineTo(hx + 3, ey - 3.3);
      c.moveTo(hx + 4.6, ey - 3.3);
      c.lineTo(hx + 7.4, ey - 3);
    }
    c.stroke();
    // nariz
    c.beginPath();
    c.moveTo(hx + 8.4, ey + 1);
    c.quadraticCurveTo(hx + 10.6, ey + 2.8, hx + 8.4, ey + 3.6);
    c.lineWidth = 1;
    c.strokeStyle = shade(skin, -0.35);
    c.stroke();
    // boca
    c.beginPath();
    c.moveTo(hx + 4.2, hy + 6);
    c.lineTo(hx + 7.4, hy + (o.angry ? 5.6 : 6.3));
    c.strokeStyle = '#6a3020';
    c.lineWidth = 0.9;
    c.stroke();
  }
  if (o.beard) {
    c.beginPath();
    c.moveTo(hx - 3, hy + 2.5);
    c.quadraticCurveTo(hx + 2, hy + 14, hx + 9.5, hy + 3.5);
    c.quadraticCurveTo(hx + 6, hy + 7, hx + 2.5, hy + 6.4);
    c.quadraticCurveTo(hx - 0.5, hy + 6.4, hx - 3, hy + 2.5);
    fillStroke(c, o.beard, 1.1);
  }
  drawHelmet(c, o.helmet, o.helmetColor ?? '#2f5d9e', o.plume, hx, hy, 0.98);

  // escudo
  if (o.shield) {
    const sc = o.shieldColor ?? '#2f5d9e';
    if (o.shield === 'round') {
      // escudo redondo de tábuas com aro de ferro e umbo (bossa) no meio
      circle(c, cx + 2, 42, 8.5);
      fillStroke(c, rgrad(c, cx + 2, 42, 9, shade(sc, 0.35), shade(sc, -0.4)), 1.5);
      c.save();
      circle(c, cx + 2, 42, 7.6);
      c.clip();
      c.strokeStyle = 'rgba(0,0,0,.28)';
      c.lineWidth = 0.6;
      for (let px = cx - 6; px < cx + 11; px += 3.2) {
        c.beginPath();
        c.moveTo(px, 33);
        c.lineTo(px, 51);
        c.stroke();
      }
      c.restore();
      circle(c, cx + 2, 42, 7.8);
      c.lineWidth = 1.6;
      c.strokeStyle = '#7d8792';
      c.stroke();
      circle(c, cx + 2, 42, 2.6);
      fillStroke(c, rgrad(c, cx + 2, 42, 3, '#ffffff', '#8a96a2'), 0.9);
    } else {
      c.beginPath();
      c.moveTo(cx - 6, 32);
      c.lineTo(cx + 10, 32);
      c.lineTo(cx + 10, 41);
      c.quadraticCurveTo(cx + 9, 50, cx + 2, 55);
      c.quadraticCurveTo(cx - 5, 50, cx - 6, 41);
      c.closePath();
      fillStroke(c, vgrad(c, 32, 55, shade(sc, 0.3), shade(sc, -0.4)), 1.5);
      if (o.emblem) {
        c.fillStyle = o.emblem;
        c.fillRect(cx + 0.7, 35, 2.6, 15);
        c.fillRect(cx - 3.3, 39.5, 10.5, 2.6);
      }
      gloss(c, cx - 2, 35, 3, 1.3, 0.5);
    }
  }
  // braço da frente + arma
  const handX = HAND.x;
  const handY = HAND.y;
  rrect(c, cx + 4, 33, 6, 15, 3);
  fillStroke(c, hgrad(c, cx + 4, cx + 10, shade(o.tunic, 0.1), shade(o.tunic, -0.2)), 1.2);
  drawWeapon(c, o.weapon, handX, handY);
  if (!o.handless) {
    circle(c, handX - 1, handY - 1, 3.2);
    fillStroke(c, skin, 1.1);
  }
}

function drawHorse(c: Ctx, body: string, mane: string, barding?: string, eyes?: string, gait = 0) {
  // cauda
  c.beginPath();
  c.moveTo(20, 54);
  c.quadraticCurveTo(4, 58, 9, 80 - gait * 3);
  c.quadraticCurveTo(15, 70, 17, 74);
  c.quadraticCurveTo(18, 64, 23, 60);
  c.closePath();
  fillStroke(c, vgrad(c, 54, 80, shade(mane, 0.2), shade(mane, -0.2)), 1.3);
  // patas: pares diagonais se movem juntos (trote)
  const leg = (x: number, ang: number, back: boolean) => {
    c.save();
    c.translate(x + 3.25, 64);
    c.rotate(ang);
    c.translate(-(x + 3.25), -64);
    rrect(c, x, 64, 6.5, 24, 3);
    fillStroke(c, back ? shade(body, -0.35) : vgrad(c, 64, 88, shade(body, 0.05), shade(body, -0.25)), 1.3);
    rrect(c, x - 0.5, 84, 7.5, 5, 2);
    fillStroke(c, '#2a1e16', 1);
    c.restore();
  };
  const a = 0.38 * gait;
  leg(27, a, true);
  leg(59, -a, true);
  leg(35, -a, false);
  leg(67, a, false);
  // corpo
  ellipse(c, 46, 60, 28, 14);
  fillStroke(c, rgrad(c, 46, 58, 30, shade(body, 0.3), shade(body, -0.3)), 1.7);
  gloss(c, 40, 52, 10, 3, 0.25);
  // pescoço + cabeça
  c.beginPath();
  c.moveTo(62, 54);
  c.quadraticCurveTo(70, 40, 74, 30);
  c.lineTo(85, 35);
  c.quadraticCurveTo(79, 50, 73, 63);
  c.closePath();
  fillStroke(c, vgrad(c, 30, 63, shade(body, 0.22), shade(body, -0.2)), 1.6);
  c.beginPath();
  c.ellipse(85, 38, 12, 7, 0.55, 0, Math.PI * 2);
  fillStroke(c, rgrad(c, 85, 37, 12, shade(body, 0.3), shade(body, -0.12)), 1.6);
  c.beginPath();
  c.moveTo(74, 27);
  c.lineTo(76, 18);
  c.lineTo(80.5, 27);
  fillStroke(c, body, 1.2);
  // olho grande e simpático
  circle(c, 81, 33, 2.4);
  c.fillStyle = eyes ?? '#1a1410';
  c.fill();
  circle(c, 80.3, 32.2, 0.8);
  c.fillStyle = '#ffffff';
  c.fill();
  c.fillStyle = 'rgba(0,0,0,.35)';
  circle(c, 92, 42, 1.2);
  c.fill();
  // crina
  c.beginPath();
  c.moveTo(74, 25);
  c.quadraticCurveTo(62, 33, 58, 51);
  c.lineTo(65, 48);
  c.quadraticCurveTo(69, 37, 77, 30);
  c.closePath();
  fillStroke(c, vgrad(c, 25, 51, shade(mane, 0.25), shade(mane, -0.2)), 1.2);
  // armadura do cavalo
  if (barding) {
    c.beginPath();
    c.moveTo(22, 52);
    c.quadraticCurveTo(46, 43, 71, 52);
    c.lineTo(71, 71);
    for (let x = 64; x >= 22; x -= 6) c.lineTo(x, x % 12 === 4 ? 66 : 72);
    c.closePath();
    fillStroke(c, vgrad(c, 45, 72, shade(barding, 0.3), shade(barding, -0.35)), 1.4);
    c.strokeStyle = '#ffd36b';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(24, 56);
    c.quadraticCurveTo(46, 48, 69, 56);
    c.stroke();
    c.beginPath();
    c.moveTo(74, 29);
    c.lineTo(92, 35);
    c.lineTo(88, 42);
    c.lineTo(73, 36);
    c.closePath();
    fillStroke(c, vgrad(c, 29, 42, '#e8edf2', '#8a96a2'), 1.1);
  }
  // sela
  rrect(c, 37, 46, 20, 7, 3);
  fillStroke(c, vgrad(c, 46, 53, '#8a4a28', '#4a2414'), 1.2);
}

export const HUMAN_W = 60;
export const HUMAN_H = 72;
export const HORSE_W = 100;
export const HORSE_H = 106;
const HORSE_DY = 14;
const RIDER_DX = 18;
const RIDER_DY = 5;
const HAND = { x: 39, y: 48 };

function mounted(c: Ctx, horse: () => void, rider: HumanOpts) {
  c.save();
  c.translate(0, HORSE_DY);
  horse();
  c.restore();
  c.save();
  c.translate(RIDER_DX, RIDER_DY);
  drawHuman(c, { ...rider, mounted: true });
  c.restore();
}

/**
 * "Rig" de animação: para unidades corpo-a-corpo geramos o corpo sem arma
 * e a arma (com a mão) numa textura separada, para ela girar no golpe.
 */
export interface RigInfo {
  weapon: Weapon;
  handX: number;
  handY: number;
  style: 'swing' | 'thrust';
}
export const RIGS: Record<string, RigInfo> = {};
const WEAPON_TEX = 140;
const NO_RIG: Weapon[] = ['bow', 'crossbow', 'none'];

function weaponTex(scene: Phaser.Scene, key: string, w: Weapon, skin: string) {
  make(scene, key, WEAPON_TEX, WEAPON_TEX, (c) => {
    const m = WEAPON_TEX / 2;
    drawWeapon(c, w, m, m);
    // mão com luva de couro (com dedos e brilho)
    circle(c, m - 1, m - 1, 3.4);
    fillStroke(c, rgrad(c, m - 1, m - 1, 4, shade(skin, 0.25), shade(skin, -0.25)), 1.1);
    c.strokeStyle = 'rgba(0,0,0,.3)';
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(m - 2.5, m - 2);
    c.lineTo(m + 1.5, m - 2);
    c.moveTo(m - 2.5, m);
    c.lineTo(m + 1.5, m);
    c.stroke();
  });
}

/**
 * Iluminação "de verdade" por cima do personagem já desenhado:
 * luz quente do alto/esquerda, sombra fria embaixo/direita e contorno de luz.
 * Só afeta os pixels do personagem (composição source-atop).
 */
function lightPass(c: Ctx, w: number, h: number) {
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, w * 0.9, h);
  g.addColorStop(0, 'rgba(255,236,200,.26)');
  g.addColorStop(0.45, 'rgba(255,236,200,0)');
  g.addColorStop(0.62, 'rgba(20,16,40,0)');
  g.addColorStop(1, 'rgba(20,16,40,.34)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // oclusão no pé (perto do chão fica mais escuro)
  const ao = c.createLinearGradient(0, h * 0.82, 0, h);
  ao.addColorStop(0, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(0,0,0,.25)');
  c.fillStyle = ao;
  c.fillRect(0, h * 0.82, w, h * 0.18);
  c.restore();
}

/** Quadros de caminhada: chave, chave_s1 (passo +), chave_s2 (passo −). */
export const WALK_SUFFIXES = ['', '_s1', '_s2'] as const;
const STRIDES = [0, 1, -1];

/** Gera a textura e os 2 quadros extras de caminhada (já com iluminação). */
function makeFrames(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx, stride: number) => void) {
  WALK_SUFFIXES.forEach((suf, i) =>
    make(scene, key + suf, w, h, (c) => {
      draw(c, STRIDES[i]);
      lightPass(c, w, h);
    }),
  );
}

function registerRig(scene: Phaser.Scene, key: string, o: HumanOpts, handX: number, handY: number, drawBody: (c: Ctx, stride: number) => void, w: number, h: number) {
  if (NO_RIG.includes(o.weapon)) return;
  makeFrames(scene, `${key}_body`, w, h, drawBody);
  // soldado com armadura usa luva de couro; os outros, mão nua
  weaponTex(scene, `${key}_w`, o.weapon, o.armor ? '#7a5636' : o.skin ?? '#f6cfa6');
  RIGS[key] = { weapon: o.weapon, handX, handY, style: o.weapon === 'spear' || o.weapon === 'lance' ? 'thrust' : 'swing' };
}

function humanTex(scene: Phaser.Scene, key: string, o: HumanOpts) {
  makeFrames(scene, key, HUMAN_W, HUMAN_H, (c, stride) => drawHuman(c, { ...o, stride }));
  const bodyOpts: HumanOpts = { ...o, weapon: 'none', handless: true };
  registerRig(scene, key, o, HAND.x - HUMAN_W / 2, HAND.y - HUMAN_H, (c, stride) => drawHuman(c, { ...bodyOpts, stride }), HUMAN_W, HUMAN_H);
}

function horseTex(scene: Phaser.Scene, key: string, horse: [string, string, string?, string?], rider: HumanOpts) {
  const drawH = (c: Ctx, gait: number) => drawHorse(c, horse[0], horse[1], horse[2], horse[3], gait);
  makeFrames(scene, key, HORSE_W, HORSE_H, (c, gait) => mounted(c, () => drawH(c, gait), rider));
  const bodyRider: HumanOpts = { ...rider, weapon: 'none', handless: true };
  registerRig(
    scene,
    key,
    rider,
    RIDER_DX + HAND.x - HORSE_W / 2,
    RIDER_DY + HAND.y - HORSE_H,
    (c, gait) => mounted(c, () => drawH(c, gait), bodyRider),
    HORSE_W,
    HORSE_H,
  );
}

function drawRam(c: Ctx) {
  // aríete visto de lado/de cima: telhado de madeira sobre rodas
  [[24, 66], [74, 66]].forEach(([x, y]) => {
    circle(c, x, y, 11);
    fillStroke(c, rgrad(c, x, y, 11, '#8a5a30', '#4a2c14'), 1.6);
    circle(c, x, y, 3);
    fillStroke(c, '#9aa3ab', 1);
  });
  rrect(c, 8, 50, 88, 8, 2);
  fillStroke(c, '#7a5230', 1.4);
  rrect(c, 8, 38, 96, 12, 6);
  fillStroke(c, vgrad(c, 38, 50, '#b8854a', '#5e3d1f'), 1.5);
  c.beginPath();
  c.moveTo(100, 34);
  c.lineTo(112, 38);
  c.lineTo(112, 50);
  c.lineTo(100, 54);
  c.closePath();
  fillStroke(c, vgrad(c, 34, 54, '#d0d6dc', '#4e5761'), 1.4);
  c.beginPath();
  c.moveTo(2, 50);
  c.lineTo(48, 8);
  c.lineTo(92, 50);
  c.closePath();
  fillStroke(c, vgrad(c, 8, 50, '#9c6a38', '#4e3018'), 1.6);
  c.strokeStyle = 'rgba(0,0,0,.28)';
  c.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    c.beginPath();
    c.moveTo(2 + i * 9, 50 - i * 8.4);
    c.lineTo(92 - i * 8.8, 50 - i * 8.4);
    c.stroke();
  }
  // peles penduradas
  c.fillStyle = '#7a3b2a';
  c.beginPath();
  c.moveTo(30, 34);
  c.lineTo(58, 30);
  c.lineTo(60, 44);
  c.lineTo(28, 46);
  c.closePath();
  c.fill();
  c.lineWidth = 1.2;
  c.strokeStyle = OUT;
  c.stroke();
}

// =====================================================================
// CENÁRIO (visão de cima)
// =====================================================================
function tree(c: Ctx, x: number, y: number, s: number, hue: string, rnd: () => number) {
  c.fillStyle = 'rgba(20,40,10,.35)';
  ellipse(c, x + s * 0.35, y + s * 0.55, s * 1.05, s * 0.5);
  c.fill();
  rrect(c, x - s * 0.13, y, s * 0.26, s * 0.55, 2);
  fillStroke(c, '#6b4422', 1.2);
  const blobs = [[0, -0.45, 0.75], [-0.5, -0.1, 0.6], [0.5, -0.1, 0.62], [0, 0.05, 0.68]];
  for (const [bx, by, br] of blobs) {
    circle(c, x + bx * s, y + by * s, br * s);
    fillStroke(c, rgrad(c, x + bx * s, y + by * s, br * s, shade(hue, 0.3 + rnd() * 0.1), shade(hue, -0.3)), 1.3);
  }
  gloss(c, x - s * 0.2, y - s * 0.6, s * 0.28, s * 0.14, 0.25);
}

function bush(c: Ctx, x: number, y: number, s: number) {
  c.fillStyle = 'rgba(20,40,10,.3)';
  ellipse(c, x + 2, y + s * 0.4, s * 1.1, s * 0.4);
  c.fill();
  [[-0.5, 0, 0.6], [0.4, 0.05, 0.55], [0, -0.3, 0.6]].forEach(([bx, by, br]) => {
    circle(c, x + bx * s, y + by * s, br * s);
    fillStroke(c, rgrad(c, x + bx * s, y + by * s, br * s, '#8fd05f', '#3f7d2c'), 1.1);
  });
}

function rock(c: Ctx, x: number, y: number, s: number) {
  c.beginPath();
  c.moveTo(x - s, y + s * 0.4);
  c.lineTo(x - s * 0.7, y - s * 0.4);
  c.lineTo(x, y - s * 0.6);
  c.lineTo(x + s * 0.8, y - s * 0.3);
  c.lineTo(x + s, y + s * 0.4);
  c.closePath();
  fillStroke(c, vgrad(c, y - s * 0.6, y + s * 0.4, '#c9c4b8', '#7d7a72'), 1.2);
}

/** Cores de cada era (o mapa muda a cada 5 fases). */
interface Theme {
  g0: string;
  g1: string;
  dark: string;
  light: string;
  tuftA: string;
  tuftB: string;
  tree: string;
  tree2: string;
  flowers: string[];
  road0: string;
  road1: string;
}
const THEMES: Theme[] = [
  // Primavera
  { g0: '#7cbf55', g1: '#5f9f42', dark: 'rgba(40,90,30,.22)', light: 'rgba(170,220,110,.2)', tuftA: 'rgba(60,120,40,.55)', tuftB: 'rgba(160,210,100,.5)', tree: '#3f8a3a', tree2: '#356f30', flowers: ['#ffffff', '#ffe066', '#ff8fa3', '#b48cff'], road0: '#8a6a3c', road1: '#c9a46b' },
  // Outono
  { g0: '#b5a24c', g1: '#8f7d33', dark: 'rgba(110,60,20,.22)', light: 'rgba(230,190,90,.2)', tuftA: 'rgba(120,90,30,.55)', tuftB: 'rgba(220,170,80,.5)', tree: '#c9652a', tree2: '#a8452a', flowers: ['#ffb347', '#e0603b', '#ffd36b'], road0: '#7a5a34', road1: '#b8925c' },
  // Deserto
  { g0: '#e0c78f', g1: '#c7a96b', dark: 'rgba(150,110,60,.2)', light: 'rgba(255,240,200,.25)', tuftA: 'rgba(150,130,70,.45)', tuftB: 'rgba(120,140,60,.45)', tree: '#7a9a3a', tree2: '#5f7f2f', flowers: ['#c9a46b', '#a8845a'], road0: '#a07c48', road1: '#d4b27a' },
  // Pântano
  { g0: '#5d7d4a', g1: '#3f5c35', dark: 'rgba(20,40,25,.3)', light: 'rgba(120,160,90,.18)', tuftA: 'rgba(30,60,30,.55)', tuftB: 'rgba(110,150,80,.45)', tree: '#2f5a33', tree2: '#264a2a', flowers: ['#d0e070', '#8fb0a0'], road0: '#4e3c24', road1: '#7a6440' },
  // Inverno
  { g0: '#e4edf2', g1: '#c6d6e0', dark: 'rgba(120,150,180,.2)', light: 'rgba(255,255,255,.35)', tuftA: 'rgba(140,170,190,.45)', tuftB: 'rgba(255,255,255,.6)', tree: '#2f6a50', tree2: '#285a44', flowers: ['#ffffff', '#cfe3f2'], road0: '#8a8478', road1: '#b9b1a2' },
];

/** Gera o fundo da era (só quando precisa, para economizar memória). */
export function ensureBackground(scene: Phaser.Scene, theme: number): string {
  const key = theme === 0 ? 'bg' : `bg_${theme}`;
  make(scene, key, WORLD_W, WORLD_H, (c) => drawBackground(c, THEMES[theme % THEMES.length]));
  return key;
}

function drawBackground(c: Ctx, th: Theme) {
  const rnd = seeded(11);
  // chão base
  c.fillStyle = vgrad(c, 0, WORLD_H, th.g0, th.g1);
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // manchas de cor (dá textura)
  for (let i = 0; i < 90; i++) {
    const x = rnd() * WORLD_W;
    const y = rnd() * WORLD_H;
    const r = 30 + rnd() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.5;
    g.addColorStop(0, dark ? th.dark : th.light);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // tufos de grama
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * WORLD_W;
    const y = rnd() * WORLD_H;
    c.strokeStyle = rnd() < 0.5 ? th.tuftA : th.tuftB;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y - 5);
    c.moveTo(x, y);
    c.lineTo(x + 1.5, y - 6);
    c.stroke();
  }
  // terra pisada na frente do castelo
  const field = c.createRadialGradient(MAP.gate.x - 120, MAP.gate.y, 20, MAP.gate.x - 120, MAP.gate.y, 300);
  field.addColorStop(0, 'rgba(160,125,75,.45)');
  field.addColorStop(1, 'rgba(160,125,75,0)');
  c.fillStyle = field;
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // estradas: das bordas até o portão
  const roads = MAP.lanes.map((ly) => ({ x0: -40, y0: ly }));
  for (const pass of [0, 1, 2]) {
    for (const r of roads) {
      c.beginPath();
      c.moveTo(r.x0, r.y0);
      const mx = (r.x0 + MAP.gate.x) / 2;
      c.quadraticCurveTo(mx, (r.y0 * 2 + MAP.gate.y) / 3, MAP.gate.x - 10, MAP.gate.y);
      c.lineCap = 'round';
      if (pass === 0) {
        c.strokeStyle = th.road0;
        c.lineWidth = 52;
      } else if (pass === 1) {
        c.strokeStyle = th.road1;
        c.lineWidth = 44;
      } else {
        c.strokeStyle = 'rgba(230,200,150,.45)';
        c.lineWidth = 16;
      }
      c.stroke();
    }
  }
  // pedrinhas na estrada
  for (let i = 0; i < 260; i++) {
    const t = rnd();
    const r = roads[Math.floor(rnd() * roads.length)];
    const mx = (r.x0 + MAP.gate.x) / 2;
    const my = (r.y0 * 2 + MAP.gate.y) / 3;
    const x = (1 - t) * (1 - t) * r.x0 + 2 * (1 - t) * t * mx + t * t * MAP.gate.x;
    const y = (1 - t) * (1 - t) * r.y0 + 2 * (1 - t) * t * my + t * t * MAP.gate.y + (rnd() - 0.5) * 34;
    c.fillStyle = 'rgba(110,80,45,.4)';
    ellipse(c, x, y, 1.5 + rnd() * 2.5, 1 + rnd() * 1.4);
    c.fill();
  }
  // flores
  const flowerCols = th.flowers;
  for (let i = 0; i < 160; i++) {
    const x = rnd() * WORLD_W;
    const y = 90 + rnd() * (WORLD_H - 100);
    c.fillStyle = flowerCols[Math.floor(rnd() * flowerCols.length)];
    circle(c, x, y, 1.6);
    c.fill();
  }
  // pedras e arbustos (longe das estradas)
  for (let i = 0; i < 18; i++) rock(c, rnd() * 1000, rnd() < 0.5 ? 110 + rnd() * 30 : 630 + rnd() * 40, 5 + rnd() * 6);
  for (let i = 0; i < 14; i++) bush(c, rnd() * 1000, rnd() < 0.5 ? 120 + rnd() * 20 : 640 + rnd() * 30, 9 + rnd() * 5);
  // árvores nas bordas (em cima e embaixo)
  for (let x = -10; x < 1300; x += 38 + rnd() * 14) tree(c, x, 52 + rnd() * 26, 20 + rnd() * 8, th.tree, rnd);
  for (let x = -10; x < 1300; x += 38 + rnd() * 14) tree(c, x, 684 + rnd() * 20, 20 + rnd() * 8, th.tree, rnd);
  // árvores em volta do castelo (castelo menor deixa espaço)
  [[1150, 150], [1215, 135], [1260, 175], [1130, 615], [1200, 640], [1255, 605]].forEach(([x, y]) =>
    tree(c, x, y, 20 + rnd() * 6, th.tree, rnd),
  );
  // floresta à esquerda entre as estradas (de onde vêm os inimigos)
  [[40, 290], [95, 300], [60, 470], [120, 482], [20, 380]].forEach(([x, y]) => tree(c, x, y, 18 + rnd() * 6, th.tree2, rnd));
}

// ---------- castelo (visão de cima, 3/4) ----------
export const CASTLE_TEX = CASTLE;
/** Posição (no desenho do castelo) da frente do castelo interior. */
/**
 * Textura do castelo interior: desenhado em escala 0.5.
 * (ax, ay) = ponto da frente do castelo; fica em (keep.x, keep.y - 16) no mundo.
 */
export const KEEP_TEX = { w: 96, h: 156, ax: 48, ay: 104, scale: 0.5 };

/** Um bloco de pedra com volume: luz em cima/esquerda, sombra embaixo/direita. */
function stoneBlockShaded(c: Ctx, x: number, y: number, w: number, h: number, base: string, r = 1.4) {
  const g = c.createLinearGradient(x, y, x + w * 0.35, y + h);
  g.addColorStop(0, shade(base, 0.1));
  g.addColorStop(0.6, base);
  g.addColorStop(1, shade(base, -0.1));
  rrect(c, x, y, w, h, r);
  c.fillStyle = g;
  c.fill();
  c.fillStyle = 'rgba(255,250,235,.22)';
  c.fillRect(x + 1, y + 0.4, w - 2, 0.8);
  c.fillStyle = 'rgba(60,45,30,.14)';
  c.fillRect(x + 1, y + h - 0.9, w - 2, 0.9);
}

/** Musgo e rachaduras aleatórias (deixa a pedra com cara de velha e real). */
function weathering(c: Ctx, x: number, y: number, w: number, h: number, rnd: () => number, mossBottom = true) {
  const n = Math.max(1, Math.round((w * h) / 1400));
  for (let i = 0; i < n; i++) {
    const mx = x + rnd() * w;
    const my = mossBottom ? y + h - rnd() * Math.min(h, 14) : y + rnd() * h;
    const mr = 2 + rnd() * 5;
    const g = c.createRadialGradient(mx, my, 0, mx, my, mr);
    g.addColorStop(0, 'rgba(78,112,48,.45)');
    g.addColorStop(1, 'rgba(78,112,48,0)');
    c.fillStyle = g;
    c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  }
  c.strokeStyle = 'rgba(60,45,30,.22)';
  c.lineWidth = 0.5;
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let px = x + rnd() * w;
    let py = y + rnd() * h;
    c.beginPath();
    c.moveTo(px, py);
    for (let k = 0; k < 3; k++) {
      px += (rnd() - 0.5) * 5;
      py += 1.5 + rnd() * 3;
      c.lineTo(px, py);
    }
    c.stroke();
  }
}

/** Piso de pedra visto de cima (passarela, topo de muro, pátio). */
function stoneTop(c: Ctx, x: number, y: number, w: number, h: number, seed: number, outline = true) {
  const rnd = seeded(seed);
  c.save();
  rrect(c, x, y, w, h, 2);
  c.clip();
  c.fillStyle = '#a89c86';
  c.fillRect(x, y, w, h);
  const rowH = 7.5;
  for (let by = y, row = 0; by < y + h; by += rowH, row++) {
    let bx = x - (row % 2 ? 2 + rnd() * 4 : 6 + rnd() * 4);
    while (bx < x + w) {
      const bw = 8 + rnd() * 7;
      stoneBlockShaded(c, bx + 0.5, by + 0.5, bw - 1, rowH - 1, shade('#d8ceb8', (rnd() - 0.5) * 0.12), 1.6);
      bx += bw;
    }
  }
  weathering(c, x, y, w, h, rnd, false);
  // luz da esquerda/cima
  const lg = c.createLinearGradient(x, y, x + w, y + h);
  lg.addColorStop(0, 'rgba(255,245,220,.12)');
  lg.addColorStop(1, 'rgba(0,0,0,.12)');
  c.fillStyle = lg;
  c.fillRect(x, y, w, h);
  c.restore();
  if (!outline) return;
  rrect(c, x, y, w, h, 2);
  c.lineWidth = 1.4;
  c.strokeStyle = OUT;
  c.stroke();
}

/** Parede de pedra vista de frente: blocos irregulares, rejunte, musgo embaixo. */
function stoneFace(c: Ctx, x: number, y: number, w: number, h: number, seed: number, outline = true) {
  const rnd = seeded(seed);
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = '#857a66';
  c.fillRect(x, y, w, h);
  const rowH = 7;
  for (let by = y, row = 0; by < y + h; by += rowH, row++) {
    let bx = x - (row % 2 ? rnd() * 6 : 4 + rnd() * 6);
    while (bx < x + w) {
      const bw = 9 + rnd() * 9;
      stoneBlockShaded(c, bx + 0.6, by + 0.6, bw - 1.2, rowH - 1.2, shade('#bcae94', (rnd() - 0.5) * 0.14));
      bx += bw;
    }
  }
  weathering(c, x, y, w, h, rnd, true);
  // sombra na base (oclusão) e luz no topo
  const ao = c.createLinearGradient(0, y, 0, y + h);
  ao.addColorStop(0, 'rgba(255,240,210,.12)');
  ao.addColorStop(0.6, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(40,28,15,.22)');
  c.fillStyle = ao;
  c.fillRect(x, y, w, h);
  c.restore();
  if (!outline) return;
  c.beginPath();
  c.rect(x, y, w, h);
  c.lineWidth = 1.4;
  c.strokeStyle = OUT;
  c.stroke();
}

/** Ameia com volume (topo claro + frente escura). */
function merlon3d(c: Ctx, x: number, y: number, w: number, h: number) {
  rrect(c, x, y + h * 0.3, w, h * 0.7, 1);
  c.fillStyle = vgrad(c, y + h * 0.3, y + h, '#a99d87', '#6f6655');
  c.fill();
  c.lineWidth = 1;
  c.strokeStyle = OUT;
  c.stroke();
  rrect(c, x, y, w, h * 0.42, 1);
  c.fillStyle = vgrad(c, y, y + h * 0.42, '#f2ebdc', '#cfc5b0');
  c.fill();
  c.stroke();
}

function roundTower(c: Ctx, cx: number, base: number, r: number, height: number, roof: string | null) {
  c.fillStyle = 'rgba(0,0,0,.28)';
  ellipse(c, cx + 6, base + 3, r + 4, r * 0.45);
  c.fill();
  const top = base - height;
  const rnd = seeded(Math.round(cx * 7 + base));
  // corpo cilíndrico com blocos de pedra que acompanham a curva
  c.save();
  c.beginPath();
  c.moveTo(cx - r, top);
  c.lineTo(cx - r, base);
  c.ellipse(cx, base, r, r * 0.42, 0, Math.PI, 0, true);
  c.lineTo(cx + r, top);
  c.closePath();
  c.clip();
  c.fillStyle = '#857a66';
  c.fillRect(cx - r - 2, top - 2, r * 2 + 4, height + r);
  const rowH = 7;
  for (let y = top, row = 0; y < base + r * 0.42; y += rowH, row++) {
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI - ((k + (row % 2) * 0.5) / n) * Math.PI;
      const a1 = Math.PI - ((k + 1 + (row % 2) * 0.5) / n) * Math.PI;
      const x0 = cx + Math.cos(a0) * r;
      const x1 = cx + Math.cos(a1) * r;
      if (x1 - x0 < 1) continue;
      const lit = 0.3 - ((x0 + x1) / 2 - (cx - r)) / (2 * r) * 0.6; // luz da esquerda
      const yy = y + Math.sin((a0 + a1) / 2) * r * 0.42;
      stoneBlockShaded(c, x0 + 0.5, yy + 0.5, x1 - x0 - 1, rowH - 1, shade('#c4b79e', lit * 0.6 + (rnd() - 0.5) * 0.08));
    }
  }
  const sh = c.createLinearGradient(cx - r, 0, cx + r, 0);
  sh.addColorStop(0, 'rgba(255,240,210,.16)');
  sh.addColorStop(0.45, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(40,28,15,.28)');
  c.fillStyle = sh;
  c.fillRect(cx - r, top, r * 2, height + r);
  weathering(c, cx - r, top, r * 2, height, rnd, true);
  c.restore();
  c.beginPath();
  c.moveTo(cx - r, top);
  c.lineTo(cx - r, base);
  c.ellipse(cx, base, r, r * 0.42, 0, Math.PI, 0, true);
  c.lineTo(cx + r, top);
  c.lineWidth = 1.5;
  c.strokeStyle = OUT;
  c.stroke();
  // seteira
  rrect(c, cx - 2, top + height * 0.35, 4, Math.min(12, height * 0.25), 2);
  c.fillStyle = '#1e160f';
  c.fill();
  // topo (piso) com ameias 3D em volta
  ellipse(c, cx, top, r + 3, (r + 3) * 0.42);
  fillStroke(c, vgrad(c, top - r * 0.4, top + r * 0.4, '#d9d0bd', '#a39883'), 1.4);
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (i / 9) * Math.PI; // metade de trás
    const mx = cx + Math.cos(a) * (r + 1);
    const my = top + Math.sin(a) * (r + 1) * 0.42;
    if (i % 2 === 0) merlon3d(c, mx - 3, my - 7, 6, 8);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 9) * Math.PI; // metade da frente (desenhada por cima)
    const mx = cx + Math.cos(a) * (r + 1);
    const my = top + Math.sin(a) * (r + 1) * 0.42;
    if (i % 2 === 0) merlon3d(c, mx - 3, my - 7, 6, 8);
  }
  if (roof) {
    // telhado cônico de telhas com fileiras e brilho
    const peak = top - r * 2.1;
    c.save();
    c.beginPath();
    c.moveTo(cx, peak);
    c.lineTo(cx + r + 3, top - 2);
    c.ellipse(cx, top - 2, r + 3, (r + 3) * 0.4, 0, 0, Math.PI);
    c.closePath();
    c.clip();
    c.fillStyle = hgrad(c, cx - r, cx + r, shade(roof, 0.35), shade(roof, -0.4));
    c.fillRect(cx - r - 4, peak, r * 2 + 8, r * 2.6);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      const yy = peak + (top - 2 - peak) * t;
      const rr = (r + 3) * t;
      c.strokeStyle = 'rgba(0,0,0,.28)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.ellipse(cx, yy, rr, rr * 0.4, 0, 0, Math.PI);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.18)';
      c.beginPath();
      c.ellipse(cx, yy - 1, rr, rr * 0.4, 0, Math.PI * 0.55, Math.PI * 0.95);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.beginPath();
    c.moveTo(cx - 1, peak + 2);
    c.lineTo(cx - r * 0.55, top - 4);
    c.lineTo(cx - r * 0.35, top - 3);
    c.closePath();
    c.fill();
    c.restore();
    c.beginPath();
    c.moveTo(cx, peak);
    c.lineTo(cx + r + 3, top - 2);
    c.ellipse(cx, top - 2, r + 3, (r + 3) * 0.4, 0, 0, Math.PI);
    c.closePath();
    c.lineWidth = 1.5;
    c.strokeStyle = OUT;
    c.stroke();
    circle(c, cx, peak, 1.8);
    fillStroke(c, '#ffd36b', 0.8);
    flag(c, cx, peak, roof);
  }
}

function flag(c: Ctx, x: number, y: number, color: string) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - 18);
  c.lineWidth = 1.8;
  c.strokeStyle = '#3a2a1c';
  c.stroke();
  c.beginPath();
  c.moveTo(x, y - 18);
  c.quadraticCurveTo(x + 8, y - 21, x + 16, y - 16);
  c.lineTo(x + 13, y - 12.5);
  c.lineTo(x + 16, y - 9);
  c.quadraticCurveTo(x + 8, y - 12, x, y - 10);
  c.closePath();
  fillStroke(c, vgrad(c, y - 21, y - 9, shade(color, 0.3), shade(color, -0.2)), 1.1);
}

function drawCastle(c: Ctx, part: 'base' | 'keep') {
  const W = CASTLE_TEX.w;
  const H = CASTLE_TEX.h;
  if (part === 'base') {
  // pátio de pedra
  c.save();
  c.beginPath();
  c.rect(20, 30, W - 30, H - 50);
  c.clip();
  c.fillStyle = '#a89c86';
  c.fillRect(20, 30, W, H);
  const rnd = seeded(77);
  for (let y = 30; y < H; y += 9) {
    for (let x = 20 + ((y / 9) % 2) * 6; x < W; x += 12) {
      c.fillStyle = shade('#b8ad97', (rnd() - 0.5) * 0.2);
      rrect(c, x, y, 10.5, 7.5, 3);
      c.fill();
    }
  }
  c.restore();
  // muralhas de cima e de baixo (vemos a face da frente)
  stoneTop(c, 26, 14, W - 26, 16, 3);
  stoneFace(c, 26, 30, W - 26, 18, 5);
  for (let x = 32; x < W - 10; x += 14) {
    merlon3d(c, x, 5, 8, 11);
  }
  stoneTop(c, 26, H - 42, W - 26, 16, 7);
  stoneFace(c, 26, H - 26, W - 26, 22, 9);
  for (let x = 32; x < W - 10; x += 14) {
    merlon3d(c, x, H - 51, 8, 11);
  }
  // muralha da direita
  stoneTop(c, W - 20, 14, 20, H - 40, 13);
  // torres dos cantos da direita
  roundTower(c, W - 10, 40, 17, 34, '#2f5d9e');
  roundTower(c, W - 10, H - 14, 17, 34, '#2f5d9e');
  return;
  }

  // ---- castelo interior (textura separada, pequeno) ----
  const kx = 135;
  const ky = 268;
  c.save();
  c.translate(KEEP_TEX.ax, KEEP_TEX.ay);
  c.scale(KEEP_TEX.scale, KEEP_TEX.scale);
  c.translate(-kx, -ky);
  c.fillStyle = 'rgba(0,0,0,.3)';
  ellipse(c, kx + 10, ky + 72, 80, 18);
  c.fill();
  stoneFace(c, kx - 62, ky - 6, 124, 76, 21);
  // porta
  c.beginPath();
  c.moveTo(kx - 15, ky + 70);
  c.lineTo(kx - 15, ky + 44);
  c.arc(kx, ky + 44, 15, Math.PI, 0);
  c.lineTo(kx + 15, ky + 70);
  c.closePath();
  fillStroke(c, vgrad(c, ky + 29, ky + 70, '#7a4b25', '#3b2414'), 1.6);
  // janelas com luz
  [[kx - 42, ky + 18], [kx + 30, ky + 18]].forEach(([x, y]) => {
    rrect(c, x, y, 12, 18, 6);
    fillStroke(c, '#2a1d14', 1.2);
    c.fillStyle = 'rgba(255,200,90,.75)';
    rrect(c, x + 2.5, y + 6, 7, 10, 3);
    c.fill();
  });
  // estandartes
  [[kx - 26, ky + 4], [kx + 18, ky + 4]].forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 9, y);
    c.lineTo(x + 9, y + 26);
    c.lineTo(x + 4.5, y + 21);
    c.lineTo(x, y + 26);
    c.closePath();
    fillStroke(c, vgrad(c, y, y + 26, '#4a84d6', '#22487f'), 1.1);
    c.fillStyle = '#ffd36b';
    circle(c, x + 4.5, y + 9, 2.2);
    c.fill();
  });
  // telhado
  c.beginPath();
  c.moveTo(kx - 72, ky - 4);
  c.lineTo(kx + 72, ky - 4);
  c.lineTo(kx + 44, ky - 82);
  c.lineTo(kx - 44, ky - 82);
  c.closePath();
  fillStroke(c, vgrad(c, ky - 82, ky - 4, '#e0605b', '#8e2a26'), 1.8);
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(70,10,10,.35)';
  c.lineWidth = 1.2;
  for (let y = ky - 76; y < ky; y += 8) {
    c.beginPath();
    c.moveTo(kx - 80, y);
    c.lineTo(kx + 80, y);
    c.stroke();
  }
  for (let x = kx - 80; x < kx + 80; x += 9) {
    c.beginPath();
    c.moveTo(x, ky - 82);
    c.lineTo(x + (x - kx) * 0.3, ky);
    c.stroke();
  }
  c.restore();
  rrect(c, kx - 46, ky - 86, 92, 6, 2);
  fillStroke(c, '#7a2420', 1.3);
  // torre do castelo interior
  roundTower(c, kx, ky - 88, 22, 58, '#2f5d9e');
  c.restore();
}

/** Castelo interior destruído: entulho, pedras e fumaça. */
function drawKeepRuin(c: Ctx) {
  const ax = KEEP_TEX.ax;
  const ay = KEEP_TEX.ay;
  c.fillStyle = 'rgba(30,20,15,.45)';
  ellipse(c, ax, ay + 22, 40, 12);
  c.fill();
  // restos das paredes
  stoneFace(c, ax - 30, ay - 4, 14, 26, 41);
  stoneFace(c, ax + 14, ay + 2, 12, 20, 43);
  // monte de pedras
  const rnd = seeded(91);
  for (let i = 0; i < 26; i++) {
    rock(c, ax - 30 + rnd() * 60, ay + 2 + rnd() * 24, 3 + rnd() * 5);
  }
  // vigas quebradas do telhado
  c.save();
  c.translate(ax - 4, ay + 6);
  c.rotate(-0.5);
  rrect(c, -18, -2, 36, 4, 1.5);
  fillStroke(c, '#5e3a1c', 1);
  c.restore();
  c.save();
  c.translate(ax + 8, ay + 12);
  c.rotate(0.7);
  rrect(c, -14, -2, 28, 4, 1.5);
  fillStroke(c, '#8e2a26', 1);
  c.restore();
  // fumaça
  [[ax - 6, ay - 22, 14], [ax + 6, ay - 40, 18], [ax - 2, ay - 64, 22]].forEach(([x, y, r], i) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(60,55,50,${0.55 - i * 0.12})`);
    g.addColorStop(1, 'rgba(60,55,50,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  });
}

/** Casa de soldados (cada uma abriga 3). */
export const HOUSE = { w: 44, h: 46 };

function drawHouse(c: Ctx) {
  c.fillStyle = 'rgba(0,0,0,.28)';
  ellipse(c, 24, 40, 20, 5);
  c.fill();
  // paredes de enxaimel
  rrect(c, 6, 20, 32, 20, 2);
  fillStroke(c, vgrad(c, 20, 40, '#f0e2c4', '#c9b48a'), 1.4);
  c.strokeStyle = '#5e3a1c';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(6, 27);
  c.lineTo(38, 27);
  c.moveTo(14, 20);
  c.lineTo(14, 40);
  c.moveTo(30, 20);
  c.lineTo(30, 40);
  c.stroke();
  // porta e janela
  rrect(c, 18.5, 29, 7, 11, 3);
  fillStroke(c, '#6b4422', 1);
  rrect(c, 8.5, 29.5, 4, 4, 0.8);
  fillStroke(c, '#ffd36b', 0.8);
  rrect(c, 31.5, 29.5, 4, 4, 0.8);
  fillStroke(c, '#ffd36b', 0.8);
  // telhado de palha
  c.beginPath();
  c.moveTo(2, 22);
  c.lineTo(12, 4);
  c.lineTo(32, 4);
  c.lineTo(42, 22);
  c.closePath();
  fillStroke(c, vgrad(c, 4, 22, '#d9a851', '#8e6326'), 1.5);
  c.strokeStyle = 'rgba(90,60,20,.45)';
  c.lineWidth = 0.9;
  for (let y = 8; y < 22; y += 3.5) {
    c.beginPath();
    c.moveTo(4, y + 2);
    c.lineTo(40, y + 2);
    c.stroke();
  }
  // chaminé
  rrect(c, 28, 0, 5, 8, 1);
  fillStroke(c, '#9a8f80', 1);
}

/** Pedaço do portão aberto (portas viradas para dentro). */
function drawGateOpen(c: Ctx, len: number) {
  const x = 4;
  const w = 30;
  c.fillStyle = '#7a6a52';
  c.fillRect(x, 0, w, len);
  // chão de terra passando pelo portão
  c.fillStyle = vgrad(c, 0, len, '#b89466', '#a07c48');
  c.fillRect(x + 2, 0, w - 4, len);
  // portas abertas encostadas nas laterais
  rrect(c, x + w - 8, 2, 8, len - 4, 2);
  fillStroke(c, hgrad(c, x + w - 8, x + w, '#a06a38', '#5e3d1f'), 1.3);
  c.strokeStyle = OUT;
  c.lineWidth = 1.6;
  c.strokeRect(x, 0, w, len);
}

function drawCornerTower(c: Ctx) {
  roundTower(c, 26, 76, 19, 40, '#2f5d9e');
}

/** Trecho da muralha esquerda (vertical, visto de cima). */
function drawWallSegment(c: Ctx, len: number, gate: boolean) {
  const w = 30;
  const x = 4;
  stoneTop(c, x, 0, w, len, len);
  // ameias dos dois lados
  for (let y = 4; y < len - 4; y += 13) {
    merlon3d(c, x - 3, y - 2, 7, 10);
    merlon3d(c, x + w - 4, y - 2, 7, 10);
  }
  if (gate) {
    const g0 = len / 2 - 32;
    rrect(c, x - 2, g0, w + 4, 64, 3);
    fillStroke(c, hgrad(c, x, x + w, '#a06a38', '#5e3d1f'), 1.6);
    c.strokeStyle = 'rgba(0,0,0,.35)';
    c.lineWidth = 1;
    for (let y = g0 + 7; y < g0 + 64; y += 7) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w, y);
      c.stroke();
    }
    c.fillStyle = '#4a4f55';
    c.fillRect(x - 2, g0 + 14, w + 4, 3);
    c.fillRect(x - 2, g0 + 46, w + 4, 3);
  }
  // face da ponta (dá altura)
  stoneFace(c, x, len, w, 12, len + 3);
}

function drawRubble(c: Ctx, len: number) {
  const rnd = seeded(len * 3);
  c.fillStyle = 'rgba(0,0,0,.2)';
  ellipse(c, 21, len / 2, 20, len / 2);
  c.fill();
  for (let i = 0; i < len / 4; i++) {
    const x = 6 + rnd() * 30;
    const y = 4 + rnd() * (len - 8);
    rock(c, x, y, 3 + rnd() * 5);
  }
}

/** Paliçada de madeira (muro que o jogador constrói). */
export const PALISADE = { w: 52, h: 124, halfW: 14, halfH: 50, offsetY: -10 };

function drawPalisade(c: Ctx) {
  c.fillStyle = 'rgba(0,0,0,.25)';
  ellipse(c, 32, 70, 15, 56);
  c.fill();
  // estacas pontudas viradas para os inimigos (esquerda)
  for (let i = 0; i < 5; i++) {
    const by = 22 + i * 22;
    c.beginPath();
    c.moveTo(26, by + 3);
    c.lineTo(1, by - 7);
    c.lineTo(26, by - 2);
    c.closePath();
    fillStroke(c, vgrad(c, by - 7, by + 3, '#d9a86c', '#7a4b25'), 1.2);
    c.fillStyle = '#efe2c4';
    c.beginPath();
    c.moveTo(1, by - 7);
    c.lineTo(7, by - 5.6);
    c.lineTo(6.5, by - 3.6);
    c.closePath();
    c.fill();
  }
  for (let i = 0; i < 9; i++) {
    const by = 30 + i * 11;
    const x = 16 + (i % 2) * 9;
    c.beginPath();
    c.moveTo(x, by);
    c.lineTo(x, by - 22);
    c.lineTo(x + 7, by - 30);
    c.lineTo(x + 14, by - 22);
    c.lineTo(x + 14, by);
    c.closePath();
    fillStroke(c, hgrad(c, x, x + 14, '#c8935a', '#6e4320'), 1.4);
    c.strokeStyle = 'rgba(60,30,10,.45)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x + 4, by - 20);
    c.lineTo(x + 4, by - 3);
    c.stroke();
    ellipse(c, x + 7, by, 7, 2.5);
    fillStroke(c, '#d9a86c', 1);
  }
  // amarras de corda
  c.strokeStyle = '#e6d3a3';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(19, 18);
  c.lineTo(38, 118);
  c.stroke();
}

// ---------- muro "de verdade" (meio 3D): passarela em cima + ameias + face da frente ----------
// As peças se juntam: as ameias e a face da frente só aparecem nas bordas sem vizinho.
// mask: 1 = vizinho em cima (N), 2 = direita (E), 4 = embaixo (S), 8 = esquerda (W)
export const WALL_H = 18; // altura do muro (px)
const N_ = 1;
const E_ = 2;
const S_ = 4;
const W_ = 8;

function drawWallTile(c: Ctx, wood: boolean, door: boolean, open: boolean, mask: number) {
  const T = 30;
  const H = WALL_H;
  const has = (b: number) => (mask & b) !== 0;
  // sombra no chão
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.fillRect(has(W_) ? 0 : 2, H + 4, T - (has(W_) ? 0 : 2) - (has(E_) ? 0 : -3), T);

  // ---- face da frente (só se não houver muro embaixo) ----
  if (!has(S_)) {
    if (wood) {
      for (let x = 0; x < T; x += 6) {
        c.fillStyle = hgrad(c, x, x + 6, '#b07a44', '#5e3a1c');
        c.fillRect(x, T, 6, H);
        c.fillStyle = 'rgba(0,0,0,.25)';
        c.fillRect(x + 5.2, T, 0.8, H);
      }
      c.fillStyle = '#e6d3a3';
      c.fillRect(0, T + H * 0.45, T, 1.6);
    } else {
      stoneFace(c, 0, T, T, H, 31 + mask, false);
    }
    if (door) {
      // abertura do portão na face da frente
      c.beginPath();
      c.moveTo(7, T + H);
      c.lineTo(7, T + 7);
      c.quadraticCurveTo(15, T - 1, 23, T + 7);
      c.lineTo(23, T + H);
      c.closePath();
      if (open) {
        c.fillStyle = '#2a1d14';
        c.fill();
      } else {
        c.fillStyle = hgrad(c, 7, 23, wood ? '#c08850' : '#a06a38', '#5e3d1f');
        c.fill();
        c.fillStyle = '#4a4f55';
        c.fillRect(7, T + 9, 16, 1.6);
        c.fillRect(7, T + 14, 16, 1.6);
      }
      c.lineWidth = 1.2;
      c.strokeStyle = OUT;
      c.stroke();
    }
    c.lineWidth = 1.4;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(0, T + H);
    c.lineTo(T, T + H);
    if (!has(W_)) {
      c.moveTo(0, T);
      c.lineTo(0, T + H);
    }
    if (!has(E_)) {
      c.moveTo(T, T);
      c.lineTo(T, T + H);
    }
    c.stroke();
  }

  // ---- passarela (topo, onde os arqueiros ficam) ----
  if (wood) {
    for (let y = 0; y < T; y += 5) {
      c.fillStyle = (y / 5) % 2 ? '#b98a55' : '#a87a48';
      c.fillRect(0, y, T, 5);
      c.fillStyle = 'rgba(60,30,10,.35)';
      c.fillRect(0, y + 4.4, T, 0.6);
    }
  } else {
    stoneTop(c, 0, 0, T, T, 17 + mask, false);
  }
  if (door) {
    // alçapão/passagem no meio do topo
    rrect(c, 8, 7, 14, 16, 2);
    c.fillStyle = open ? '#2a1d14' : hgrad(c, 8, 22, '#a06a38', '#5e3d1f');
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = OUT;
    c.stroke();
  }

  // ---- ameias / estacas nas bordas sem vizinho ----
  const merlon = (x: number, y: number, w: number, h: number) => {
    if (wood) {
      c.beginPath();
      c.moveTo(x, y + h);
      c.lineTo(x, y + 3);
      c.lineTo(x + w / 2, y - 1);
      c.lineTo(x + w, y + 3);
      c.lineTo(x + w, y + h);
      c.closePath();
      c.fillStyle = hgrad(c, x, x + w, '#d29a5e', '#7a4b25');
    } else {
      merlon3d(c, x, y - 2, w, h + 2);
      return;
    }
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = OUT;
    c.stroke();
  };
  if (!has(N_)) for (let x = 1; x < T; x += 10) merlon(x, -2, 7, 8);
  if (!has(W_)) for (let y = 3; y < T - 2; y += 10) merlon(-1, y, 6, 7);
  if (!has(E_)) for (let y = 3; y < T - 2; y += 10) merlon(T - 5, y, 6, 7);
  if (!has(S_)) for (let x = 1; x < T; x += 10) merlon(x, T - 6, 7, 8);

  // contorno só nas bordas externas
  c.lineWidth = 1.4;
  c.strokeStyle = OUT;
  c.beginPath();
  if (!has(N_)) {
    c.moveTo(0, 0);
    c.lineTo(T, 0);
  }
  if (!has(W_)) {
    c.moveTo(0, 0);
    c.lineTo(0, T);
  }
  if (!has(E_)) {
    c.moveTo(T, 0);
    c.lineTo(T, T);
  }
  c.stroke();
}

/** Textura do pedaço de muro conforme os vizinhos (gerada só quando precisa). */
export function ensureTileTexture(scene: Phaser.Scene, id: string, mask: number, open = false): string {
  const key = `tile_${id}_${mask}${open ? '_o' : ''}`;
  const wood = id === 'mmadeira' || id === 'pmadeira';
  const door = id === 'pmadeira' || id === 'ppedra';
  make(scene, key, 30, 30 + WALL_H + 2, (c) => {
    c.translate(0, 2);
    drawWallTile(c, wood, door, open, mask);
  });
  return key;
}

/** Torre de defesa que o jogador constrói. */
export const TOWER = { w: 70, h: 130, baseY: 118, radius: 22 };

/** Altura (no desenho da torre) onde fica a balista. */
export const TOWER_TOP = TOWER.baseY - 62;

function drawTower(c: Ctx) {
  // torre aberta em cima (a balista fica numa textura separada que gira)
  roundTower(c, 35, TOWER.baseY, 24, 62, null);
  rrect(c, 29, 82, 12, 18, 6);
  fillStroke(c, '#22170f', 1.3);
  // piso de madeira da plataforma
  ellipse(c, 35, TOWER_TOP, 22, 9);
  fillStroke(c, vgrad(c, TOWER_TOP - 9, TOWER_TOP + 9, '#b98a55', '#7a5230'), 1.2);
}

/** Balista (lança-flechas gigante) vista de cima, apontando para a direita. */
function drawBallista(c: Ctx) {
  // base giratória
  circle(c, 18, 20, 9);
  fillStroke(c, rgrad(c, 18, 20, 9, '#8a5a30', '#4a2c14'), 1.3);
  // trilho
  rrect(c, 4, 16.5, 40, 7, 2.5);
  fillStroke(c, hgrad(c, 4, 44, '#c08850', '#6e4320'), 1.3);
  // arco
  c.beginPath();
  c.moveTo(34, 2);
  c.quadraticCurveTo(44, 20, 34, 38);
  c.lineWidth = 5;
  c.strokeStyle = OUT;
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = '#9a6a3a';
  c.stroke();
  // corda
  c.beginPath();
  c.moveTo(34, 2);
  c.lineTo(14, 20);
  c.lineTo(34, 38);
  c.lineWidth = 1;
  c.strokeStyle = '#f2e6c8';
  c.stroke();
  // flecha carregada
  rrect(c, 12, 19, 38, 2.4, 1);
  fillStroke(c, '#5a3a1e', 0.8);
  c.beginPath();
  c.moveTo(54, 20.2);
  c.lineTo(48, 16.5);
  c.lineTo(48, 24);
  c.closePath();
  fillStroke(c, '#d9e0e6', 0.8);
  // manivela
  circle(c, 8, 20, 3);
  fillStroke(c, '#9aa3ab', 1);
}

/** Barricada barata (estacas cruzadas). */
export const BARRICADE = { w: 46, h: 44, halfW: 12, halfH: 15 };

function drawBarricade(c: Ctx) {
  c.fillStyle = 'rgba(0,0,0,.25)';
  ellipse(c, 25, 36, 18, 6);
  c.fill();
  // estacas cruzadas em X
  [[-1, 6], [1, 6], [-1, 22], [1, 22]].forEach(([s, y]) => {
    c.save();
    c.translate(23, y + 10);
    c.rotate(s * 0.7);
    rrect(c, -2.5, -16, 5, 30, 2);
    fillStroke(c, hgrad(c, -2.5, 2.5, '#d29a5e', '#6e4320'), 1.1);
    c.beginPath();
    c.moveTo(-2.5, -16);
    c.lineTo(0, -21);
    c.lineTo(2.5, -16);
    c.closePath();
    fillStroke(c, '#efe2c4', 0.9);
    c.restore();
  });
  // tronco central
  rrect(c, 4, 20, 38, 7, 3.5);
  fillStroke(c, vgrad(c, 20, 27, '#a87444', '#5e3a1c'), 1.3);
  ellipse(c, 5, 23.5, 2.5, 3.5);
  fillStroke(c, '#d9a86c', 0.9);
}

/** Catapulta inimiga (vista de lado, virada para a direita). */
function drawCatapult(c: Ctx) {
  [[26, 70], [80, 70]].forEach(([x, y]) => {
    circle(c, x, y, 11);
    fillStroke(c, rgrad(c, x, y, 11, '#8a5a30', '#4a2c14'), 1.6);
    circle(c, x, y, 3);
    fillStroke(c, '#9aa3ab', 1);
  });
  rrect(c, 10, 54, 88, 9, 2);
  fillStroke(c, hgrad(c, 10, 98, '#a87444', '#5e3a1c'), 1.4);
  // torres de apoio
  c.beginPath();
  c.moveTo(46, 56);
  c.lineTo(58, 26);
  c.lineTo(70, 56);
  c.lineWidth = 5;
  c.strokeStyle = OUT;
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = '#8a5a30';
  c.stroke();
  // braço lançador (inclinado para trás) com concha
  c.save();
  c.translate(58, 30);
  c.rotate(-0.95);
  rrect(c, -3, -46, 6, 56, 3);
  fillStroke(c, hgrad(c, -3, 3, '#c08850', '#6e4320'), 1.3);
  ellipse(c, 0, -48, 9, 6);
  fillStroke(c, '#5e3a1c', 1.3);
  circle(c, 0, -51, 5.5);
  fillStroke(c, rgrad(c, 0, -51, 6, '#c9c4b8', '#6d6a62'), 1.1);
  c.restore();
  // contrapeso
  rrect(c, 60, 34, 14, 12, 2);
  fillStroke(c, vgrad(c, 34, 46, '#6d7378', '#33373a'), 1.3);
  // corda
  c.strokeStyle = '#e6d3a3';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(20, 56);
  c.lineTo(38, 16);
  c.stroke();
}

// ---------- efeitos e UI ----------
function drawArrow(c: Ctx, bolt = false) {
  c.strokeStyle = bolt ? '#4a3a2a' : '#7a5230';
  c.lineWidth = bolt ? 2.6 : 1.8;
  c.beginPath();
  c.moveTo(2, 4);
  c.lineTo(bolt ? 18 : 24, 4);
  c.stroke();
  c.fillStyle = '#d9e0e6';
  c.beginPath();
  const tip = bolt ? 22 : 28;
  c.moveTo(tip, 4);
  c.lineTo(tip - 6, 1);
  c.lineTo(tip - 6, 7);
  c.closePath();
  c.fill();
  c.fillStyle = bolt ? '#3a2a1c' : '#ffffff';
  c.beginPath();
  c.moveTo(1, 1);
  c.lineTo(6, 4);
  c.lineTo(1, 7);
  c.closePath();
  c.fill();
}

/** Ícone "selecionar todos": três rostos de soldados juntos. */
function drawGroupIcon(c: Ctx) {
  const face = (x: number, y: number, s: number, helm: string) => {
    circle(c, x, y, 8 * s);
    fillStroke(c, rgrad(c, x, y, 8 * s, '#ffe0c0', '#d9a77c'), 1.3);
    c.beginPath();
    c.arc(x, y - 1 * s, 8.6 * s, Math.PI * 1.0, Math.PI * 2.0);
    c.closePath();
    fillStroke(c, rgrad(c, x, y - 4 * s, 9 * s, '#ffffff', helm), 1.2);
    c.fillStyle = '#2a1a10';
    circle(c, x + 2.5 * s, y + 1.5 * s, 1.1 * s);
    c.fill();
    circle(c, x - 1.5 * s, y + 1.5 * s, 1 * s);
    c.fill();
  };
  face(12, 22, 0.95, '#7d8a96');
  face(36, 22, 0.95, '#7d8a96');
  face(24, 18, 1.2, '#2f5d9e');
}

/** Ícone da chuva de flechas. */
function drawArrowsIcon(c: Ctx) {
  [[10, 4], [20, 0], [30, 5]].forEach(([x, y]) => {
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI / 2 + 0.25);
    c.scale(1.1, 1.1);
    drawArrow(c);
    c.restore();
  });
}

function drawCoin(c: Ctx) {
  circle(c, 12, 12, 10.5);
  fillStroke(c, vgrad(c, 1, 23, '#ffe58a', '#d18f16'), 1.6);
  circle(c, 12, 12, 7);
  c.lineWidth = 1.4;
  c.strokeStyle = 'rgba(140,80,0,.55)';
  c.stroke();
  gloss(c, 8.5, 8, 2.5, 1.6, 0.6);
}

function drawStar(c: Ctx, filled: boolean) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 6 : 14;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
  }
  c.closePath();
  fillStroke(c, filled ? vgrad(c, 2, 30, '#fff1a6', '#e5a21a') : 'rgba(40,30,20,.55)', 1.8);
}

function drawLock(c: Ctx) {
  c.beginPath();
  c.arc(12, 11, 6, Math.PI, 0);
  c.lineWidth = 3.4;
  c.strokeStyle = OUT;
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = '#c9d1d9';
  c.stroke();
  rrect(c, 4, 11, 16, 12, 2.5);
  fillStroke(c, vgrad(c, 11, 23, '#ffd36b', '#b57a12'), 1.4);
  c.fillStyle = OUT;
  c.fillRect(11, 15, 2, 4);
}

function softCircle(c: Ctx, color: string) {
  const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 16, 16);
}

/** Gera todas as texturas do jogo. */
export function buildTextures(scene: Phaser.Scene) {
  const blue = '#2f5d9e';
  const gold = '#ffd36b';
  const red = '#b8332e';

  // --- Jogador (azul e dourado) ---
  humanTex(scene, 'u_recruta', { tunic: '#3b6eb5', helmet: 'cap', helmetColor: '#8a5a2e', hair: '#7a4b25', weapon: 'shortsword', shield: 'round', shieldColor: '#9a6a3a' });
  humanTex(scene, 'u_espadachim', { tunic: blue, armor: '#9aa6b2', tabard: blue, emblem: gold, helmet: 'nasal', plume: '#3f72bd', weapon: 'sword', shield: 'kite', shieldColor: blue });
  humanTex(scene, 'u_machadeiro', { tunic: '#3b6eb5', helmet: 'nasal', weapon: 'bigaxe', beard: '#c46a2a', hair: '#c46a2a', pants: '#3a2c20' });
  humanTex(scene, 'u_lanceiro', { tunic: blue, armor: '#9aa6b2', tabard: '#3f72bd', emblem: gold, helmet: 'nasal', weapon: 'spear', shield: 'round', shieldColor: blue });
  horseTex(scene, 'u_cavleve', ['#b07440', '#3a2414'], { tunic: blue, tabard: '#3f72bd', emblem: gold, helmet: 'nasal', plume: gold, hair: '#5a3a1e', weapon: 'sword' });
  horseTex(scene, 'u_cavpesado', ['#f0ebe0', '#a39886', blue], { tunic: blue, armor: '#b8c2cc', helmet: 'knight', plume: gold, weapon: 'lance', shield: 'kite', shieldColor: blue, emblem: gold });
  humanTex(scene, 'u_campeao', { tunic: '#22487f', armor: '#d5dce3', tabard: blue, emblem: gold, helmet: 'knight', plume: '#e0303a', weapon: 'hammer', cape: '#c23b3b' });
  humanTex(scene, 'u_arqueiro', { tunic: '#3f7a3a', helmet: 'hood', helmetColor: '#2f6a2c', hair: '#7a4b25', weapon: 'bow' });
  humanTex(scene, 'u_besteiro', { tunic: blue, armor: '#9aa6b2', helmet: 'nasal', weapon: 'crossbow' });

  // --- Inimigos (vermelho, marrom e preto, cara de bravo) ---
  const eskin = '#e0ae86';
  humanTex(scene, 'e_saqueador', { tunic: '#8a4a2e', helmet: 'bandana', helmetColor: '#a3302d', weapon: 'club', skin: eskin, pants: '#3b2a20', angry: true, beard: '#4a2c18' });
  humanTex(scene, 'e_guerreiro', { tunic: red, armor: '#7d8792', helmet: 'horned', weapon: 'axe', shield: 'round', shieldColor: '#6a2a20', skin: eskin, angry: true, beard: '#8a4a20' });
  humanTex(scene, 'e_arqueiroinim', { tunic: '#7a2b2b', helmet: 'hood', helmetColor: '#3a1c1c', weapon: 'bow', skin: eskin, angry: true });
  humanTex(scene, 'e_bruto', { tunic: '#5a2a20', helmet: 'horned', weapon: 'club', beard: '#3a1f12', skin: '#d0946a', pants: '#2a1c14', angry: true });
  horseTex(scene, 'e_cavnegro', ['#2e2829', '#0f0d0d', '#6a1d1d', '#ff3a2a'], { tunic: '#2a2228', armor: '#4a5058', helmet: 'knight', plume: '#c23b3b', weapon: 'sword', angry: true });
  make(scene, 'e_ariete', 116, 80, drawRam);
  humanTex(scene, 'e_capitao', { tunic: red, armor: '#8a949e', helmet: 'horned', weapon: 'bigaxe', cape: '#6e1414', beard: '#5a2a12', skin: eskin, angry: true });
  humanTex(scene, 'e_senhor', { tunic: '#2a2228', armor: '#4a5058', helmet: 'warcrown', weapon: 'hammer', cape: '#5a1f6e', angry: true });

  // --- Chefes: cada um com aparência e arma diferentes (mesmo tamanho dos soldados) ---
  humanTex(scene, 'boss_0', { tunic: '#8e1f1f', armor: '#c9d1d9', helmet: 'hair', helmetColor: '#f2d36b', weapon: 'sword', shield: 'kite', shieldColor: '#6e1414', emblem: '#ffd36b', cape: '#b8332e', skin: eskin, angry: true });
  humanTex(scene, 'boss_1', { tunic: '#5a2a20', armor: '#7d8792', helmet: 'horned', weapon: 'bigaxe', beard: '#4a2412', cape: '#4a3a2a', skin: '#d0946a', angry: true });
  humanTex(scene, 'boss_2', { tunic: '#6e2b2b', helmet: 'braids', helmetColor: '#e8c060', weapon: 'bow', cape: '#3a1c1c', skin: eskin, angry: true });
  humanTex(scene, 'boss_3', { tunic: '#7a1f2a', armor: '#9aa3ab', helmet: 'nasal', plume: '#e0303a', weapon: 'spear', shield: 'round', shieldColor: '#8e1f1f', skin: eskin, angry: true, beard: '#2a1a10' });
  humanTex(scene, 'boss_4', { tunic: '#2a2228', armor: '#5a6068', helmet: 'knight', plume: '#1a1a1a', weapon: 'hammer', cape: '#111111', angry: true });
  humanTex(scene, 'boss_5', { tunic: '#a3302d', helmet: 'hair', helmetColor: '#c4521e', weapon: 'shortsword', shield: 'round', shieldColor: '#5a2a20', beard: '#c4521e', skin: eskin, angry: true });
  horseTex(scene, 'boss_6', ['#3a2a22', '#120c0a', '#8e1f1f', '#ff3a2a'], { tunic: '#6e1414', armor: '#8a949e', helmet: 'knight', plume: '#e0303a', weapon: 'lance', shield: 'kite', shieldColor: '#6e1414', emblem: '#1a1a1a', angry: true });
  humanTex(scene, 'boss_7', { tunic: '#4a1f5e', armor: '#c9a54a', helmet: 'haircrown', helmetColor: '#e8e8e8', weapon: 'sword', beard: '#f0f0f0', cape: '#5a1f6e', skin: '#e0b090', angry: true });

  // --- Ícones dos botões redondos ---
  make(scene, 'icon_group', 48, 40, drawGroupIcon);
  make(scene, 'icon_arrows', 40, 40, drawArrowsIcon);
  const white = (c: Ctx) => {
    c.fillStyle = '#ffffff';
    c.strokeStyle = OUT;
    c.lineWidth = 2;
  };
  make(scene, 'icon_pause', 28, 28, (c) => {
    white(c);
    rrect(c, 6, 5, 6, 18, 2);
    c.fill();
    c.stroke();
    rrect(c, 16, 5, 6, 18, 2);
    c.fill();
    c.stroke();
  });
  make(scene, 'icon_speed', 30, 28, (c) => {
    white(c);
    [3, 14].forEach((x) => {
      c.beginPath();
      c.moveTo(x, 5);
      c.lineTo(x + 12, 14);
      c.lineTo(x, 23);
      c.closePath();
      c.fill();
      c.stroke();
    });
  });
  const note = (c: Ctx, off: boolean) => {
    white(c);
    circle(c, 9, 21, 4.5);
    c.fill();
    c.stroke();
    circle(c, 21, 18, 4.5);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(13, 21);
    c.lineTo(13, 6);
    c.lineTo(25, 3);
    c.lineTo(25, 18);
    c.lineWidth = 2.6;
    c.strokeStyle = '#ffffff';
    c.stroke();
    if (off) {
      c.beginPath();
      c.moveTo(3, 3);
      c.lineTo(27, 27);
      c.lineWidth = 4;
      c.strokeStyle = '#e0503b';
      c.stroke();
    }
  };
  make(scene, 'icon_music', 30, 30, (c) => note(c, false));
  make(scene, 'icon_music_off', 30, 30, (c) => note(c, true));

  // --- Cenário e construções ---
  ensureBackground(scene, 0);
  make(scene, 'castle', CASTLE_TEX.w, CASTLE_TEX.h, (c) => drawCastle(c, 'base'));
  make(scene, 'keep', KEEP_TEX.w, KEEP_TEX.h, (c) => drawCastle(c, 'keep'));
  make(scene, 'keep_ruin', KEEP_TEX.w, KEEP_TEX.h, drawKeepRuin);
  make(scene, 'house', HOUSE.w, HOUSE.h, drawHouse);
  make(scene, 'ctower', 52, 90, drawCornerTower);
  for (const seg of MAP.wallSegments) {
    const len = seg.y1 - seg.y0;
    make(scene, `cwall_${seg.id}`, 38, len + 14, (c) => drawWallSegment(c, len, seg.gate));
    if (seg.gate) make(scene, `cgate_open_${seg.id}`, 38, len + 14, (c) => drawGateOpen(c, len));
    make(scene, `rubble_${seg.id}`, 42, len, (c) => drawRubble(c, len));
  }
  make(scene, 'palisade', PALISADE.w, PALISADE.h, drawPalisade);
  make(scene, 'tower', TOWER.w, TOWER.h, drawTower);
  make(scene, 'ballista', 56, 40, drawBallista);
  make(scene, 'barricade', BARRICADE.w, BARRICADE.h, drawBarricade);
  // ícones dos botões de construção (peça sozinha)
  for (const id of ['mmadeira', 'mpedra', 'pmadeira', 'ppedra']) {
    make(scene, `tile_${id}`, 30, 50, (c) => {
      c.translate(0, 2);
      drawWallTile(c, id.endsWith('madeira'), id.startsWith('p'), false, 0);
    });
  }
  // ícone da carta "Muros": dois pedaços de pedra juntos com uma porta
  make(scene, 'icon_walls', 90, 52, (c) => {
    c.translate(0, 2);
    drawWallTile(c, false, false, false, E_);
    c.translate(30, 0);
    drawWallTile(c, false, true, false, E_ | W_);
    c.translate(30, 0);
    drawWallTile(c, false, false, false, W_);
  });
  make(scene, 'icon_eraser', 32, 32, (c) => {
    c.save();
    c.translate(16, 16);
    c.rotate(-0.6);
    rrect(c, -11, -6, 22, 12, 3);
    fillStroke(c, '#f2b8c6', 1.6);
    rrect(c, 2, -6, 9, 12, 2);
    fillStroke(c, '#6aa0d8', 1.2);
    c.restore();
  });
  make(scene, 'e_catapulta', 110, 84, drawCatapult);
  make(scene, 'stone', 16, 16, (c) => rock(c, 8, 9, 6));
  make(scene, 'bigbolt', 44, 10, (c) => {
    rrect(c, 2, 4, 34, 2.6, 1);
    fillStroke(c, '#5a3a1e', 0.8);
    c.beginPath();
    c.moveTo(42, 5.3);
    c.lineTo(34, 1);
    c.lineTo(34, 9.6);
    c.closePath();
    fillStroke(c, '#d9e0e6', 0.9);
    c.fillStyle = '#c23b3b';
    c.beginPath();
    c.moveTo(2, 1);
    c.lineTo(9, 5.3);
    c.lineTo(2, 9.6);
    c.fill();
  });
  // clima
  make(scene, 'raindrop', 4, 16, (c) => {
    c.strokeStyle = 'rgba(200,225,255,.75)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(3, 1);
    c.lineTo(1, 15);
    c.stroke();
  });
  make(scene, 'snowflake', 10, 10, (c) => {
    const g = c.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 10, 10);
  });
  make(scene, 'cloudshadow', 220, 120, (c) => {
    const g = c.createRadialGradient(110, 60, 10, 110, 60, 110);
    g.addColorStop(0, 'rgba(10,30,10,.16)');
    g.addColorStop(1, 'rgba(10,30,10,0)');
    c.fillStyle = g;
    c.save();
    c.scale(1, 0.55);
    circle(c, 110, 110, 110);
    c.restore();
    c.fill();
  });

  // --- Efeitos / UI ---
  make(scene, 'arrow', 30, 8, (c) => drawArrow(c));
  make(scene, 'bolt', 24, 8, (c) => drawArrow(c, true));
  make(scene, 'coin', 24, 24, drawCoin);
  make(scene, 'star', 32, 32, (c) => drawStar(c, true));
  make(scene, 'star_empty', 32, 32, (c) => drawStar(c, false));
  make(scene, 'lock', 24, 26, drawLock);
  make(scene, 'spark', 16, 16, (c) => softCircle(c, 'rgba(255,240,180,1)'));
  make(scene, 'dust', 16, 16, (c) => softCircle(c, 'rgba(200,170,120,.9)'));
  make(scene, 'shadow', 40, 14, (c) => {
    const g = c.createRadialGradient(20, 7, 0, 20, 7, 20);
    g.addColorStop(0, 'rgba(0,0,0,.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.save();
    c.scale(1, 0.35);
    circle(c, 20, 20, 20);
    c.restore();
    c.fill();
  });
}
