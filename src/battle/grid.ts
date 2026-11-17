// Grade de navegação (A*).
// - Nossos soldados: muro = intransponível (passam só por portas/portão).
// - Inimigos: muro = "caro" (custa quebrar). Eles contornam se houver
//   passagem livre e só atacam o muro quando não há outro jeito.

import { TILE, GRID_W, GRID_H, cellOf, cellCenter } from './map';

type Pt = { x: number; y: number };

/** 0 = livre; 1..254 = custo extra para passar; 255 = bloqueado. */
export const BLOCKED = 255;

export class NavGrid {
  private grid = new Uint8Array(GRID_W * GRID_H);
  private dirty = true;

  /** `collect` marca retângulos com um custo (255 = bloqueado). */
  constructor(private collect: (mark: (x0: number, y0: number, x1: number, y1: number, cost?: number) => void) => void) {}

  invalidate() {
    this.dirty = true;
  }

  private ensure() {
    if (!this.dirty) return;
    this.grid.fill(0);
    this.collect((x0, y0, x1, y1, cost = BLOCKED) => {
      const gx0 = Math.max(0, Math.floor(x0 / TILE));
      const gy0 = Math.max(0, Math.floor(y0 / TILE));
      const gx1 = Math.min(GRID_W - 1, Math.floor((x1 - 0.01) / TILE));
      const gy1 = Math.min(GRID_H - 1, Math.floor((y1 - 0.01) / TILE));
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const i = gy * GRID_W + gx;
          this.grid[i] = Math.max(this.grid[i], cost);
        }
      }
    });
    this.dirty = false;
  }

  private cost(gx: number, gy: number) {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return BLOCKED;
    return this.grid[gy * GRID_W + gx];
  }

  blocked(gx: number, gy: number) {
    return this.cost(gx, gy) === BLOCKED;
  }

  /** Linha reta sem nenhum obstáculo (nem caro)? */
  clearLine(fx: number, fy: number, tx: number, ty: number) {
    this.ensure();
    const start = cellOf(fx, fy);
    const d = Math.hypot(tx - fx, ty - fy);
    const steps = Math.ceil(d / 8);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const c = cellOf(fx + (tx - fx) * t, fy + (ty - fy) * t);
      if ((c.gx !== start.gx || c.gy !== start.gy) && this.cost(c.gx, c.gy) > 0) return false;
    }
    return true;
  }

  findPath(fx: number, fy: number, tx: number, ty: number): Pt[] {
    this.ensure();
    const s = cellOf(fx, fy);
    let g = cellOf(tx, ty);
    let exactGoal = true;
    if (this.blocked(g.gx, g.gy)) {
      exactGoal = false;
      g = this.nearestFree(g, s) ?? g;
    }
    const N = GRID_W * GRID_H;
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const startI = s.gy * GRID_W + s.gx;
    const goalI = g.gy * GRID_W + g.gx;
    gScore[startI] = 0;
    const heap = new MinHeap();
    const h = (i: number) => {
      const dx = Math.abs((i % GRID_W) - g.gx);
      const dy = Math.abs(Math.floor(i / GRID_W) - g.gy);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    heap.push(startI, h(startI));
    let found = false;
    // se não der para chegar, vai até o ponto alcançável mais perto do destino
    let bestI = startI;
    let bestH = h(startI);
    let iter = 0;
    while (heap.size && iter++ < 6000) {
      const cur = heap.pop();
      if (cur === goalI) {
        found = true;
        break;
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const hc = h(cur);
      if (hc < bestH) {
        bestH = hc;
        bestI = cur;
      }
      const cx = cur % GRID_W;
      const cy = Math.floor(cur / GRID_W);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          const c = this.cost(nx, ny);
          if (c === BLOCKED && !(nx === g.gx && ny === g.gy)) continue;
          // não corta quina de obstáculo na diagonal
          if (dx && dy && (this.cost(cx + dx, cy) > 0 || this.cost(cx, cy + dy) > 0)) continue;
          const ni = ny * GRID_W + nx;
          const step = (dx && dy ? 1.414 : 1) + (c === BLOCKED ? 0 : c);
          const total = gScore[cur] + step;
          if (total < gScore[ni]) {
            gScore[ni] = total;
            came[ni] = cur;
            heap.push(ni, total + h(ni));
          }
        }
      }
    }
    const endI = found ? goalI : bestI;
    if (endI === startI) return [{ x: tx, y: ty }];
    const cells: Pt[] = [];
    for (let i = endI; i !== startI && i >= 0; i = came[i]) cells.push(cellCenter(i % GRID_W, Math.floor(i / GRID_W)));
    cells.reverse();
    if (found && exactGoal && cells.length) cells[cells.length - 1] = { x: tx, y: ty };
    // suaviza: pula pontos quando a linha reta está totalmente livre
    const out: Pt[] = [];
    let from: Pt = { x: fx, y: fy };
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.clearLine(from.x, from.y, cells[j].x, cells[j].y)) j--;
      out.push(cells[j]);
      from = cells[j];
      i = j + 1;
    }
    return out;
  }

  private nearestFree(g: { gx: number; gy: number }, s: { gx: number; gy: number }) {
    let best: { gx: number; gy: number } | null = null;
    let bestD = Infinity;
    for (let r = 1; r <= 6 && !best; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = g.gx + dx;
          const cy = g.gy + dy;
          if (this.blocked(cx, cy)) continue;
          const dd = Math.hypot(cx - s.gx, cy - s.gy) * 0.1 + Math.hypot(dx, dy);
          if (dd < bestD) {
            bestD = dd;
            best = { gx: cx, gy: cy };
          }
        }
      }
    }
    return best;
  }
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, p: number) {
    this.items.push(item);
    this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastI = this.items.pop()!;
    const lastP = this.prio.pop()!;
    if (this.items.length) {
      this.items[0] = lastI;
      this.prio[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
