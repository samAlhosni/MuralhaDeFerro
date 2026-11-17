import Phaser from 'phaser';
import { R, RIGS, PALISADE, TOWER, TOWER_TOP, BARRICADE, WALK_SUFFIXES, WALL_H, ensureTileTexture, type RigInfo } from '../art/art';
import { MAP, HP, TILE, cellCenter, type WallSegmentDef } from './map';
import type { PlayerUnitDef } from '../data/units';
import { Sound } from '../systems/audio';

export type Team = 'player' | 'enemy';

/** Qualquer coisa que pode ser atacada. */
export interface Target {
  x: number;
  y: number;
  aimY: number;
  alive: boolean;
  cavalry: boolean;
  kind: 'unit' | 'palisade' | 'barricade' | 'tower' | 'wall' | 'keep' | 'tile';
  /** Distância de um ponto até a borda deste alvo. */
  edgeDist(px: number, py: number): number;
  takeDamage(dmg: number): void;
  knock?(dx: number, dy: number, power: number): void;
}

export interface Stats {
  name: string;
  hp: number;
  damage: number;
  attackRate: number;
  range: number;
  speed: number;
  cavalry?: boolean;
  bonusVsCavalry?: number;
  splash?: number;
  ranged?: boolean;
  siege?: boolean;
  reward?: number;
  boss?: boolean;
}

/** O que as entidades precisam saber da batalha (implementado pela GameScene). */
export interface Battle {
  world: Phaser.Scene;
  playerUnits: Unit[];
  enemyUnits: Unit[];
  wallSegments: WallSegment[];
  keep: Keep;
  /** Obstáculo vivo que colide com um círculo (para os inimigos). */
  obstacleAt(x: number, y: number, r: number): Obstacle | null;
  /** O que bloqueia os NOSSOS soldados (muro de madeira e torre; barricada não). */
  playerObstacleAt(x: number, y: number, r: number): Obstacle | null;
  /** Caminho pela grade (A*) evitando muros, passando pelas portas. */
  findPath(fx: number, fy: number, tx: number, ty: number): { x: number; y: number }[];
  /** Linha reta livre de muros para os nossos soldados? */
  clearLine(fx: number, fy: number, tx: number, ty: number): boolean;
  /** Caminho dos inimigos: contorna muros se der; senão passa pelo mais fraco (quebrando). */
  findEnemyPath(fx: number, fy: number, tx: number, ty: number): { x: number; y: number }[];
  /** Obstáculo vivo mais próximo dentro de um alcance. */
  nearestObstacle(x: number, y: number, range: number): Obstacle | null;
  fireProjectile(fromX: number, fromY: number, target: Target, key: string, damage: number, arc: number, speed: number, team: Team, splash?: number, source?: Unit): void;
  hitFx(x: number, y: number, dmg: number, team: Team, heavy?: boolean): void;
  bigFx(x: number, y: number): void;
  onUnitDied(u: Unit): void;
  onObstacleDestroyed(o: Obstacle): void;
  onKeepDamaged(): void;
  damageArea(team: Team, x: number, y: number, radius: number, dmg: number, except?: Target): void;
}

const GRAVITY = 1100;
const PLAYER_AGGRO = 170; // soldado avança se o inimigo chegar a esta distância
const PLAYER_LEASH = 300; // não se afasta mais que isso do posto
const ENEMY_AGGRO = 85; // inimigo para e luta se um soldado estiver tão perto
const MARCH_END_X = MAP.zone.x0 - 60; // até aqui os inimigos vêm em formação

function drawBar(g: Phaser.GameObjects.Graphics, w: number, ratio: number, color: number, y: number) {
  g.clear();
  if (ratio >= 0.999) return;
  g.fillStyle(0x20160f, 0.9);
  g.fillRoundedRect(-w / 2 - 2, y - 2, w + 4, 8, 3);
  g.fillStyle(0x3a2a1c, 1);
  g.fillRoundedRect(-w / 2, y, w, 4, 2);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, y, Math.max(2, w * ratio), 4, 2);
}

function rectDist(px: number, py: number, cx: number, cy: number, hw: number, hh: number) {
  const dx = Math.max(Math.abs(px - cx) - hw, 0);
  const dy = Math.max(Math.abs(py - cy) - hh, 0);
  return Math.hypot(dx, dy);
}

// =====================================================================
// Unidade de combate (anda livre pelo mapa)
//
//   container (posição no chão)
//   ├─ ring   (círculo de seleção)
//   ├─ shadow
//   ├─ rig    (vira com scaleX, balança ao andar, cai ao morrer)
//   │   ├─ body
//   │   └─ weapon (gira no golpe com pivô na mão)
//   └─ bar
// =====================================================================
export class Unit implements Target {
  container: Phaser.GameObjects.Container;
  rig: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image | null = null;
  shadow: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  bar: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  alive = true;
  gone = false;
  kind = 'unit' as const;
  radius = 11;
  /** Posto que o soldado guarda (jogador). */
  post = { x: 0, y: 0 };
  /** Está cumprindo uma ordem de movimento. */
  ordered = false;

  private rigInfo: RigInfo | undefined;
  private weaponBase = { x: 0, y: 0 };
  private facing: 1 | -1;
  private vx = 0;
  private vy = 0;
  private lastHit = { x: 0, y: 0 };
  private attackTimer = 0;
  private attacking = false;
  private walkPhase = Math.random() * 10;
  private rangeJitter = Math.random() * 6;
  private barY: number;
  private blocker: Obstacle | null = null;
  private stuck = 0;
  /** Marcha em formação (inimigos): direção e velocidade iguais para todo o bloco. */
  march: { dx: number; dy: number; speed: number } | null = null;
  private walkFrames: string[] | null = null;
  private frame = 1;
  private corpse = { vx: 0, vy: 0, vz: 0, spin: 0, landed: 0, fading: false };

  constructor(
    private battle: Battle,
    public team: Team,
    public stats: Stats,
    texKey: string,
    public scale: number,
    x: number,
    y: number,
    public defId: string,
  ) {
    const scene = battle.world;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.post = { x, y };
    this.rigInfo = RIGS[texKey];
    const bodyKey = this.rigInfo ? `${texKey}_body` : texKey;
    if (scene.textures.exists(bodyKey + WALK_SUFFIXES[1])) {
      // [passo+, parado, passo−, parado]
      this.walkFrames = [bodyKey + WALK_SUFFIXES[1], bodyKey, bodyKey + WALK_SUFFIXES[2], bodyKey];
    }
    this.container = scene.add.container(x, y);
    this.ring = scene.add.graphics();
    this.ring.lineStyle(2.5, 0xffe58a, 1);
    this.ring.strokeEllipse(0, 0, 40 * scale * (stats.cavalry ? 1.4 : 1), 16 * scale);
    this.ring.setVisible(false);
    this.shadow = scene.add.image(0, 0, 'shadow').setScale((scale * (stats.cavalry ? 1.9 : 1.15)) / R);
    this.rig = scene.add.container(0, 0);
    this.body = scene.add
      .image(0, 0, this.rigInfo ? `${texKey}_body` : texKey)
      .setOrigin(0.5, 1)
      .setScale(scale / R);
    this.rig.add(this.body);
    if (this.rigInfo) {
      this.weaponBase = { x: this.rigInfo.handX * scale, y: this.rigInfo.handY * scale };
      this.weapon = scene.add.image(this.weaponBase.x, this.weaponBase.y, `${texKey}_w`).setScale(scale / R);
      this.rig.add(this.weapon);
    }
    this.facing = team === 'player' ? -1 : 1; // jogador olha para a esquerda (inimigos vêm de lá)
    this.rig.scaleX = this.facing;
    this.bar = scene.add.graphics();
    this.barY = -this.body.displayHeight - 6;
    this.container.add([this.ring, this.shadow, this.rig, this.bar]);
    this.container.setDepth(y);
    if (stats.cavalry) this.radius = 17;
    if (stats.boss) this.radius = 11 * scale;
    if (stats.siege) this.radius = 22;
    this.rig.setAlpha(0);
    scene.tweens.add({ targets: this.rig, alpha: 1, duration: 250 });
  }

  get x() {
    return this.container.x;
  }
  get y() {
    return this.container.y;
  }
  get cavalry() {
    return !!this.stats.cavalry;
  }
  get aimY() {
    return this.container.y - this.body.displayHeight * 0.5;
  }
  get isAttacking() {
    return this.attacking;
  }

  edgeDist(px: number, py: number) {
    return Math.hypot(px - this.x, py - this.y) - this.radius;
  }

  setSelected(v: boolean) {
    this.ring.setVisible(v && this.alive);
  }

  /** Ordem do jogador: ir até um ponto e guardar ali. */
  orderMove(x: number, y: number) {
    this.post = { x, y };
    this.ordered = true;
  }

  private face(dx: number) {
    if (Math.abs(dx) < 0.5) return;
    const f = dx < 0 ? -1 : 1;
    if (f !== this.facing) {
      this.facing = f;
      this.rig.scaleX = f;
    }
  }

  private path: { x: number; y: number }[] | null = null;
  private pathGoal: { x: number; y: number } | null = null;
  private pathAge = 0;

  /**
   * Soldados do jogador procuram o caminho (A*) pela grade: contornam muros
   * e passam pelas portas e pelo portão do castelo.
   */
  private route(tx: number, ty: number) {
    if (this.team !== 'player') return { x: tx, y: ty };
    if (this.battle.clearLine(this.x, this.y, tx, ty)) {
      this.path = null;
      return { x: tx, y: ty };
    }
    const moved = !this.pathGoal || Math.hypot(this.pathGoal.x - tx, this.pathGoal.y - ty) > 24;
    if (!this.path || moved || this.pathAge > 1.2) {
      this.path = this.battle.findPath(this.x, this.y, tx, ty);
      this.pathGoal = { x: tx, y: ty };
      this.pathAge = 0;
    }
    while (this.path.length && Math.hypot(this.path[0].x - this.x, this.path[0].y - this.y) < 8) this.path.shift();
    return this.path[0] ?? { x: tx, y: ty };
  }

  private moveToward(tx0: number, ty0: number, dt: number, collide: boolean, speed = this.stats.speed): boolean {
    const { x: tx, y: ty } = this.route(tx0, ty0);
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return false;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    // inimigos batem em tudo; nossos soldados só no muro de madeira e na torre
    const hit = collide
      ? (px: number, py: number) => this.battle.obstacleAt(px, py, this.radius)
      : this.team === 'player'
        ? (px: number, py: number) => this.battle.playerObstacleAt(px, py, this.radius)
        : null;
    // se já está encostado/dentro (ex.: muro construído em cima), deixa sair
    const stuckInside = this.team === 'player' && hit !== null && !!hit(this.x, this.y);
    if (hit && !stuckInside) {
      const o = hit(nx, ny);
      if (o) {
        // tenta deslizar pela borda do obstáculo (só em y, depois só em x)
        const sy = this.y + Math.sign(dy || (this.y < o.y ? -1 : 1)) * step;
        if (!hit(this.x, sy)) {
          this.container.y = sy;
          if (!this.attacking) this.face(dx);
          return true;
        }
        const sx = this.x + Math.sign(dx || 1) * step;
        if (Math.abs(dx) > 0.5 && !hit(sx, this.y)) {
          this.container.x = sx;
          return true;
        }
        // nosso soldado travado: contorna pelo lado mais perto da ponta
        if (!collide) {
          const alt = this.y + (this.y < o.y ? -step : step);
          if (!hit(this.x, alt)) {
            this.container.y = alt;
            return true;
          }
          return false;
        }
        this.blocker = o;
        return false;
      }
    }
    this.container.x = nx;
    this.container.y = ny;
    if (!this.attacking) this.face(dx);
    return true;
  }

  private nearestEnemyUnit(maxDist: number, from = { x: this.x, y: this.y }, leash?: { x: number; y: number; d: number }) {
    const list = this.team === 'player' ? this.battle.enemyUnits : this.battle.playerUnits;
    let best: Unit | null = null;
    let bestD = maxDist;
    for (const e of list) {
      if (!e.alive) continue;
      if (this.team === 'enemy' && this.stats.siege) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y) - e.radius;
      if (d >= bestD) continue;
      if (leash && Math.hypot(e.x - leash.x, e.y - leash.y) > leash.d) continue;
      bestD = d;
      best = e;
    }
    return best;
  }

  /** Tenta atacar; se estiver longe, anda até o alvo. Retorna true se andou. */
  private engage(target: Target, dt: number, collide: boolean): boolean {
    const gap = target.edgeDist(this.x, this.y) - this.radius;
    const reach = this.stats.range + this.rangeJitter * (this.stats.ranged ? 4 : 1);
    if (gap <= reach) {
      if (!this.attacking) this.face(target.x - this.x);
      if (this.attackTimer <= 0 && !this.attacking) {
        this.attack(target);
        this.attackTimer = this.stats.attackRate * (0.9 + Math.random() * 0.2);
      }
      return false;
    }
    if (this.attacking) return false;
    return this.moveToward(target.x, target.y, dt, collide);
  }

  private ePath: { x: number; y: number }[] | null = null;
  private ePathAge = 99;

  /** Próximo ponto da rota do inimigo até o castelo interior (A* com custo de quebrar muros). */
  private enemyWaypoint() {
    this.ePathAge += 1 / 60;
    if (!this.ePath || !this.ePath.length || this.ePathAge > 1.5 || this.stuck > 0.6) {
      this.ePath = this.battle.findEnemyPath(this.x, this.y, MAP.keep.x, MAP.keep.y);
      this.ePathAge = 0;
    }
    while (this.ePath.length > 1 && Math.hypot(this.ePath[0].x - this.x, this.ePath[0].y - this.y) < 10) this.ePath.shift();
    return this.ePath[0] ?? this.enemyGoal();
  }

  /** Pedaço caído da muralha mais perto (abertura), se houver. */
  private nearestGap(): WallSegment | null {
    let best: WallSegment | null = null;
    for (const s of this.battle.wallSegments) {
      if (s.alive) continue;
      if (!best || Math.abs(s.cy - this.y) < Math.abs(best.cy - this.y)) best = s;
    }
    return best;
  }

  /** Para onde o inimigo vai: portão → abertura na muralha → castelo interior. */
  private enemyGoal() {
    const wx = MAP.wallX;
    if (this.x < wx - MAP.wallHalf - 4) {
      const gap = this.nearestGap();
      if (gap) {
        // 1) chega na frente da abertura  2) alinha com ela  3) atravessa reto
        const front = wx - MAP.wallHalf - this.radius - 14;
        if (this.x < front - 6) return { x: front, y: gap.cy };
        if (Math.abs(this.y - gap.cy) > 4) return { x: this.x, y: gap.cy };
        return { x: wx + 50, y: gap.cy };
      }
      return { x: wx, y: MAP.gate.y };
    }
    return { x: MAP.keep.x, y: MAP.keep.y };
  }

  update(dt: number) {
    if (!this.alive) return;

    // empurrão físico
    if (Math.abs(this.vx) + Math.abs(this.vy) > 2) {
      // empurrão não pode jogar ninguém para dentro de um muro
      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;
      if (this.blockedAt(nx, ny)) {
        this.vx = 0;
        this.vy = 0;
      } else {
        this.container.x = nx;
        this.container.y = ny;
      }
      const f = Math.exp(-9 * dt);
      this.vx *= f;
      this.vy *= f;
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    const b = MAP.bounds;
    this.container.x = Phaser.Math.Clamp(this.container.x, b.x0, b.x1);
    this.container.y = Phaser.Math.Clamp(this.container.y, b.y0, b.y1);
    this.container.setDepth(this.container.y);

    this.attackTimer -= dt;
    this.pathAge += dt;
    this.provokeT -= dt;
    this.updateRegen(dt);
    // Atordoado só por um empurrão forte. Chefe e armas de cerco nunca ficam
    // atordoados (antes, vários soldados batendo travavam o chefe sem atacar).
    const stunned = !this.stats.boss && !this.stats.siege && Math.abs(this.vx) + Math.abs(this.vy) > 110;
    let moving = false;

    if (!stunned) {
      if (this.team === 'player') moving = this.updatePlayer(dt);
      else moving = this.updateEnemy(dt);
    }

    // animação procedural
    if (moving) {
      this.walkPhase += dt * (this.stats.cavalry ? 14 : 10);
      this.rig.y = -Math.abs(Math.sin(this.walkPhase)) * (this.stats.cavalry ? 4 : 2.5);
      if (!this.attacking) this.rig.angle = Math.sin(this.walkPhase) * (this.stats.cavalry ? 2 : 3);
      if (this.weapon && !this.attacking) this.weapon.angle = Math.sin(this.walkPhase * 0.5) * 8;
      // pernas: troca o quadro conforme o passo
      this.setFrame(Math.floor(this.walkPhase / (Math.PI / 2)) % 4);
    } else if (!this.attacking) {
      this.rig.y *= 0.8;
      this.rig.angle *= 0.8;
      if (this.weapon) this.weapon.angle *= 0.85;
      this.setFrame(1);
    }
  }

  private setFrame(i: number) {
    if (!this.walkFrames || i === this.frame) return;
    this.frame = i;
    this.body.setTexture(this.walkFrames[i]);
  }

  private updatePlayer(dt: number): boolean {
    // atacado por um arqueiro (ou catapulta) de longe: vai sozinho se defender
    if (!this.ordered && this.provoker && this.provoker.alive && this.provokeT > 0) {
      this.fought = true;
      return this.engage(this.provoker, dt, false);
    }
    if (this.ordered) {
      const d = Math.hypot(this.post.x - this.x, this.post.y - this.y);
      if (d < 5) {
        this.ordered = false;
        return false;
      }
      return this.moveToward(this.post.x, this.post.y, dt, false);
    }
    // arqueiros no chão enxergam mais longe (atiram do posto)
    const aggro = this.stats.ranged ? Math.max(PLAYER_AGGRO, this.stats.range + 10) : PLAYER_AGGRO;
    const target = this.nearestEnemyUnit(aggro, { x: this.x, y: this.y }, { ...this.post, d: PLAYER_LEASH });
    if (target) {
      this.fought = true;
      return this.engage(target, dt, false);
    }
    // depois de avançar para lutar, o soldado FICA onde parou (não volta ao posto antigo)
    if (this.fought && !this.attacking) {
      this.fought = false;
      this.post = { x: this.x, y: this.y };
    }
    const d = Math.hypot(this.post.x - this.x, this.post.y - this.y);
    if (d > 5 && !this.attacking) return this.moveToward(this.post.x, this.post.y, dt, false);
    if (!this.attacking) this.face(-1);
    return false;
  }

  private fought = false;
  private provoker: Unit | null = null;
  private provokeT = 0;

  /** Levou flechada de longe: lembra quem atirou para ir atrás dele. */
  provoke(src: Unit) {
    if (this.team !== 'player' || !this.alive || this.stats.ranged) return;
    if (this.provoker && this.provoker.alive && this.provokeT > 0) return;
    this.provoker = src;
    this.provokeT = 8;
  }

  // ---- cura do hospital: fica "grudada" no soldado mesmo se ele andar ----
  private regen = { pct: 0, time: 0, tick: 0 };
  private aura: Phaser.GameObjects.Graphics | null = null;

  addRegen(pct: number, duration: number) {
    if (!this.alive) return;
    this.regen = { pct, time: duration, tick: 0 };
    if (!this.aura) {
      this.aura = this.battle.world.add.graphics();
      this.aura.lineStyle(2.5, 0x6fdc4a, 0.9);
      this.aura.strokeEllipse(0, 0, 36 * this.scale * (this.stats.cavalry ? 1.4 : 1), 14 * this.scale);
      this.aura.fillStyle(0x6fdc4a, 0.18);
      this.aura.fillEllipse(0, 0, 36 * this.scale * (this.stats.cavalry ? 1.4 : 1), 14 * this.scale);
      this.container.addAt(this.aura, 0);
    }
  }

  private updateRegen(dt: number) {
    if (this.regen.time <= 0) return;
    this.regen.time -= dt;
    this.regen.tick -= dt;
    if (this.regen.tick <= 0) {
      this.regen.tick = 1;
      const healed = this.heal(this.maxHp * this.regen.pct);
      if (healed > 0) {
        const t = this.battle.world.add
          .text(this.x, this.aimY - 12, `+${Math.round(healed)}`, { fontFamily: 'Nunito', fontSize: '15px', fontStyle: '900', color: '#8ff06a', stroke: '#20160f', strokeThickness: 3 })
          .setOrigin(0.5)
          .setDepth(1750);
        this.battle.world.tweens.add({ targets: t, y: t.y - 28, alpha: 0, duration: 700, onComplete: () => t.destroy() });
      }
    }
    if (this.regen.time <= 0 && this.aura) {
      this.aura.destroy();
      this.aura = null;
    }
  }

  private updateEnemy(dt: number): boolean {
    // Se a muralha tem uma abertura, a prioridade é entrar no castelo:
    // só termina a luta se já estiver colado num soldado.
    const gapOpen = this.battle.wallSegments.some((s) => !s.alive) || this.x > MAP.wallX;
    // 1) soldados por perto
    const aggro = gapOpen
      ? this.radius + this.stats.range + 16
      : this.stats.ranged ? this.stats.range + 20 : ENEMY_AGGRO;
    // catapulta: para de longe e joga pedras em muros, torres e no castelo
    if (this.stats.siege && this.stats.ranged) {
      const o = this.battle.nearestObstacle(this.x, this.y, this.stats.range);
      if (o) return this.engage(o, dt, true);
    }
    const foe = this.nearestEnemyUnit(aggro);
    if (foe) {
      this.march = null; // quebrou a formação para lutar
      return this.engage(foe, dt, true);
    }
    // marcha em fileira até chegar perto das defesas
    if (this.march && this.x < MARCH_END_X && !this.blocker) {
      const m = this.march;
      if (this.moveToward(this.x + m.dx * 60, this.y + m.dy * 60, dt, true, m.speed)) return true;
    }
    this.march = null;
    // 2) arqueiros atiram em construções ao alcance (se não houver abertura)
    if (this.stats.ranged && !this.stats.siege && !gapOpen) {
      const o = this.battle.nearestObstacle(this.x, this.y, this.stats.range);
      if (o && o.x > this.x - 40) return this.engage(o, dt, true);
    }
    // 3) obstáculo que bloqueou o caminho
    // (com abertura, para de bater na muralha e vai para a brecha)
    if (this.blocker && this.blocker.alive && !(gapOpen && this.blocker.kind === 'wall' && this.stuck < 1.5)) {
      return this.engage(this.blocker, dt, true);
    }
    this.blocker = null;
    // 4) segue para o castelo pela rota mais esperta (contorna barreiras,
    //    ou escolhe o muro mais fraco para quebrar)
    const goal = this.enemyWaypoint();
    const moved = this.moveToward(goal.x, goal.y, dt, true);
    if (moved) {
      this.stuck = 0;
      return true;
    }
    // não conseguiu andar: em vez de ficar parado, ataca o que está na frente
    this.stuck += dt;
    const b = this.blocker as Obstacle | null; // moveToward pode ter definido
    if (b && b.alive) return this.engage(b, dt, true);
    return false;
  }

  private attack(target: Target) {
    const scene = this.battle.world;
    const dir = this.facing;
    this.attacking = true;
    const windup = Math.min(220, this.stats.attackRate * 1000 * 0.3);
    const strike = 80;
    const recover = 170;

    if (this.weapon && this.rigInfo?.style === 'swing') {
      scene.tweens.chain({
        targets: this.weapon,
        tweens: [
          { angle: -65, duration: windup, ease: 'Quad.out' },
          { angle: 85, duration: strike, ease: 'Quad.in' },
          { angle: 0, duration: recover, ease: 'Quad.out' },
        ],
      });
      scene.tweens.chain({
        targets: this.rig,
        tweens: [
          { angle: -6 * dir, duration: windup, ease: 'Quad.out' },
          { angle: 10 * dir, duration: strike, ease: 'Quad.in' },
          { angle: 0, duration: recover, ease: 'Quad.out' },
        ],
      });
    } else if (this.weapon && this.rigInfo?.style === 'thrust') {
      const bx = this.weaponBase.x;
      scene.tweens.chain({
        targets: this.weapon,
        tweens: [
          { x: bx - 8, duration: windup, ease: 'Quad.out' },
          { x: bx + 18, duration: strike, ease: 'Back.in' },
          { x: bx, duration: recover, ease: 'Quad.out' },
        ],
      });
      scene.tweens.chain({
        targets: this.rig,
        tweens: [
          { x: -4 * dir, duration: windup },
          { x: 6 * dir, duration: strike },
          { x: 0, duration: recover },
        ],
      });
    } else {
      scene.tweens.chain({
        targets: this.rig,
        tweens: [
          { x: -5 * dir, angle: -4 * dir, duration: windup, ease: 'Quad.out' },
          { x: 10 * dir, angle: 8 * dir, duration: strike, ease: 'Quad.in' },
          { x: 0, angle: 0, duration: recover, ease: 'Quad.out' },
        ],
      });
    }
    scene.time.delayedCall(windup + strike, () => this.hit(target));
    scene.time.delayedCall(windup + strike + recover, () => {
      this.attacking = false;
    });
  }

  private hit(target: Target) {
    if (!this.alive || !target.alive) return;
    if (this.stats.ranged && this.stats.siege) {
      // catapulta: pedra em arco alto com dano em área
      Sound.play('launch');
      this.battle.fireProjectile(this.x + this.facing * 20, this.y - 60, target, 'stone', this.stats.damage, 140, 320, this.team, this.stats.splash, this);
      return;
    }
    if (this.stats.ranged) {
      Sound.play('whoosh', 0.7);
      this.battle.fireProjectile(this.x + this.facing * 12, this.aimY, target, 'arrow', this.stats.damage, 30, 520, this.team, 0, this);
      return;
    }
    let dmg = this.stats.damage;
    if (target.cavalry && this.stats.bonusVsCavalry) dmg *= this.stats.bonusVsCavalry;
    const heavy = dmg >= 30 || !!this.stats.splash || !!this.stats.boss;
    // som do golpe: metal com metal, porrada ou madeira/pedra
    const w = this.rigInfo?.weapon;
    if (target.kind !== 'unit') Sound.play('crack', 0.8);
    else if (w === 'club' || w === 'hammer' || !w) Sound.play('thud', 0.8);
    else Sound.play('clang', 0.7);
    target.takeDamage(dmg);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    target.knock?.(dx, dy, Math.min(320, 50 + dmg * 3));
    this.battle.hitFx(target.x - this.facing * 6, target.aimY, dmg, this.team, heavy);
    if (this.stats.splash) this.battle.damageArea(this.team, target.x, target.y, this.stats.splash, dmg * 0.6, target);
  }

  knock(dx: number, dy: number, power: number) {
    if (!this.alive) return;
    const d = Math.hypot(dx, dy) || 1;
    const resist = this.stats.boss ? 0.12 : this.stats.siege ? 0.08 : this.stats.cavalry ? 0.45 : 1;
    this.vx += (dx / d) * power * resist;
    this.vy += (dy / d) * power * resist * 0.6;
    // limita a velocidade acumulada (vários golpes seguidos não viram "patinação")
    const sp = Math.hypot(this.vx, this.vy);
    const max = this.stats.boss ? 40 : 220;
    if (sp > max) {
      this.vx *= max / sp;
      this.vy *= max / sp;
    }
    this.lastHit = { x: dx / d, y: dy / d };
    if (!this.attacking) {
      this.battle.world.tweens.add({ targets: this.rig, angle: 8 * Math.sign(dx || 1) * this.facing, duration: 70, yoyo: true });
    }
  }

  /** Define a vida (usado ao trazer o soldado da fase anterior). */
  setHp(hp: number) {
    this.hp = Phaser.Math.Clamp(hp, 1, this.maxHp);
    drawBar(this.bar, this.stats.boss ? 56 : 30, this.hp / this.maxHp, this.team === 'player' ? 0x6fdc4a : 0xe0503b, this.barY);
  }

  /** Cura (hospital). Retorna quanto curou de fato. */
  heal(amount: number): number {
    if (!this.alive || this.hp >= this.maxHp) return 0;
    const before = this.hp;
    this.setHp(this.hp + amount);
    return this.hp - before;
  }

  takeDamage(dmg: number) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.body.setTintFill(0xffffff);
    this.battle.world.time.delayedCall(60, () => this.body.active && this.body.clearTint());
    drawBar(this.bar, this.stats.boss ? 56 : 30, Math.max(0, this.hp / this.maxHp), this.team === 'player' ? 0x6fdc4a : 0xe0503b, this.barY);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.bar.clear();
    this.ring.setVisible(false);
    this.battle.world.tweens.killTweensOf([this.rig, this.weapon].filter(Boolean) as object[]);
    const hx = this.lastHit.x || -this.facing;
    const hy = this.lastHit.y;
    const heavyBody = this.stats.boss || this.stats.siege ? 0.35 : this.stats.cavalry ? 0.6 : 1;
    const sp = Phaser.Math.Between(60, 150) * heavyBody;
    this.corpse.vx = hx * sp + this.vx * 0.4;
    this.corpse.vy = hy * sp * 0.5 + this.vy * 0.3;
    this.corpse.vz = -Phaser.Math.Between(180, 320) * heavyBody;
    this.corpse.spin = Math.sign(hx || 1) * this.facing * Phaser.Math.Between(250, 480) * heavyBody;
    this.battle.onUnitDied(this);
  }

  /** Física do corpo caindo. Retorna true quando terminou. */
  updateCorpse(dt: number): boolean {
    if (this.gone) return true;
    const c = this.corpse;
    if (c.fading) return false;
    c.vz += GRAVITY * dt;
    this.rig.y += c.vz * dt;
    this.container.x += c.vx * dt;
    this.container.y += c.vy * dt;
    this.rig.angle += c.spin * dt;
    if (this.weapon) this.weapon.angle += c.spin * 0.6 * dt;
    if (this.rig.y >= 0) {
      this.rig.y = 0;
      if (c.vz > 160) {
        c.vz *= -0.3;
        c.vx *= 0.5;
        c.vy *= 0.5;
        c.spin *= 0.4;
      } else {
        c.vz = 0;
        const f = Math.exp(-10 * dt);
        c.vx *= f;
        c.vy *= f;
        c.spin = 0;
        const targetAngle = this.rig.angle >= 0 ? 90 : -90;
        this.rig.angle += (targetAngle - this.rig.angle) * Math.min(1, dt * 12);
        c.landed += dt;
      }
    }
    this.container.setDepth(this.container.y - 5);
    this.shadow.setAlpha(1 - Math.min(0.8, -this.rig.y / 120));
    if (c.landed > 1.1 && !c.fading) {
      c.fading = true;
      this.battle.world.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          this.container.destroy();
          this.gone = true;
        },
      });
    }
    return false;
  }

  nudge(dx: number, dy: number) {
    if (!this.alive) return;
    if (this.blockedAt(this.x + dx, this.y + dy)) return;
    this.container.x += dx;
    this.container.y += dy;
  }

  /** Esta posição cai dentro de algo que bloqueia esta unidade? */
  private blockedAt(x: number, y: number) {
    return this.team === 'player'
      ? !!this.battle.playerObstacleAt(x, y, this.radius)
      : !!this.battle.obstacleAt(x, y, this.radius * 0.8);
  }
}

// =====================================================================
// Obstáculos (muros, torres, muralha, castelo interior)
// =====================================================================
export abstract class Obstacle implements Target {
  alive = true;
  cavalry = false;
  abstract kind: 'palisade' | 'barricade' | 'tower' | 'wall' | 'keep' | 'tile';
  hp: number;
  bar: Phaser.GameObjects.Graphics;
  archers: (Archer | null)[] = [];

  constructor(
    protected battle: Battle,
    public x: number,
    public y: number,
    public maxHp: number,
    barX: number,
    barY: number,
    protected barW = 50,
  ) {
    this.hp = maxHp;
    this.bar = battle.world.add.graphics().setDepth(1500);
    this.bar.setPosition(barX, barY);
  }

  get aimY() {
    return this.y - 20;
  }

  abstract edgeDist(px: number, py: number): number;
  abstract blocks(px: number, py: number, r: number): boolean;
  protected abstract visual(): Phaser.GameObjects.Image | null;

  archerSpots(): { x: number; y: number }[] {
    return [];
  }

  takeDamage(dmg: number) {
    if (!this.alive) return;
    this.hp -= dmg;
    const img = this.visual();
    if (img) {
      img.setTintFill(0xffe0c0);
      this.battle.world.time.delayedCall(60, () => img.active && img.clearTint());
      const ox = img.x;
      this.battle.world.tweens.add({ targets: img, x: ox + 2, duration: 40, yoyo: true, repeat: 1, onComplete: () => img.setX(ox) });
    }
    drawBar(this.bar, this.barW, Math.max(0, this.hp / this.maxHp), 0x6fdc4a, 0);
    if (this.hp <= 0) this.destroy(true);
  }

  destroy(byEnemy: boolean) {
    if (!this.alive) return;
    this.alive = false;
    this.bar.destroy();
    this.archers.forEach((a) => a?.die());
    this.archers = this.archers.map(() => null);
    if (byEnemy) {
      this.battle.bigFx(this.x, this.y);
      this.battle.world.cameras.main.shake(200, 0.006);
      Sound.play(this.kind === 'barricade' ? 'crack' : 'crumble', this.kind === 'barricade' ? 1 : 0.9);
    }
    this.onDestroyed();
    this.battle.onObstacleDestroyed(this);
  }

  protected abstract onDestroyed(): void;

  /** Define a vida (trazer da fase anterior / reparar). */
  setHp(hp: number) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, hp);
    if (this.hp <= 0) {
      this.destroy(false);
      return;
    }
    drawBar(this.bar, this.barW, this.hp / this.maxHp, 0x6fdc4a, 0);
  }
}

/** Muro de madeira construído pelo jogador. */
export class Palisade extends Obstacle {
  kind = 'palisade' as const;
  image: Phaser.GameObjects.Image;

  constructor(battle: Battle, public def: PlayerUnitDef, x: number, y: number, hpMul = 1) {
    super(battle, x, y, Math.round(def.hp * hpMul), x, y - PALISADE.halfH - 22, 40);
    this.archers = [null, null, null];
    this.image = battle.world.add.image(x, y + PALISADE.offsetY, 'palisade').setScale(1 / R).setDepth(y + PALISADE.halfH - 10);
    this.image.setScale(1 / R, 0);
    battle.world.tweens.add({ targets: this.image, scaleY: 1 / R, duration: 300, ease: 'Back.out' });
  }

  protected visual() {
    return this.image;
  }

  edgeDist(px: number, py: number) {
    return rectDist(px, py, this.x, this.y, PALISADE.halfW, PALISADE.halfH);
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  archerSpots() {
    return [
      // 3 lugares bem espaçados ao longo do muro (não ficam colados)
      { x: this.x + 2, y: this.y - 30 },
      { x: this.x + 2, y: this.y + 6 },
      { x: this.x + 2, y: this.y + 42 },
    ];
  }

  protected onDestroyed() {
    this.battle.world.tweens.add({
      targets: this.image,
      scaleY: 0,
      alpha: 0.2,
      duration: 380,
      ease: 'Quad.in',
      onComplete: () => this.image.destroy(),
    });
  }
}

/**
 * Pedaço de muro (madeira ou pedra) ou porta, construído na grade pelo jogador.
 * Muro bloqueia todo mundo. Porta bloqueia só os inimigos (abre para os nossos).
 */
export class WallTile extends Obstacle {
  kind = 'tile' as const;
  image: Phaser.GameObjects.Image;
  readonly door: boolean;
  private open = false;
  private mask = 0;

  constructor(battle: Battle, public def: PlayerUnitDef, public gx: number, public gy: number, hpMul = 1) {
    const c = cellCenter(gx, gy);
    super(battle, c.x, c.y, Math.round(def.hp * hpMul), c.x, gy * TILE - WALL_H - 10, 24);
    this.door = def.id === 'pmadeira' || def.id === 'ppedra';
    this.archers = this.door ? [] : [null];
    this.image = battle.world.add
      .image(c.x, gy * TILE - WALL_H - 2, ensureTileTexture(battle.world, def.id, 0))
      .setOrigin(0.5, 0)
      .setScale(1 / R)
      .setDepth(gy * TILE + TILE);
    this.image.setScale(1 / R, 0);
    battle.world.tweens.add({ targets: this.image, scaleY: 1 / R, duration: 200, ease: 'Back.out' });
  }

  /** Atualiza o visual conforme os vizinhos (as peças se juntam). */
  setLook(mask: number) {
    this.mask = mask;
    if (this.alive) this.image.setTexture(ensureTileTexture(this.battle.world, this.def.id, mask, this.open));
  }

  get aimY() {
    return this.y - WALL_H;
  }

  protected visual() {
    return this.image;
  }

  edgeDist(px: number, py: number) {
    return rectDist(px, py, this.x, this.y, TILE / 2, TILE / 2);
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  archerSpots() {
    // em cima da passarela do muro
    return this.door ? [] : [{ x: this.x, y: this.y - WALL_H + 4 }];
  }

  /** Porta: abre quando um soldado nosso chega perto. */
  setOpen(v: boolean) {
    if (!this.door || !this.alive || v === this.open) return;
    this.open = v;
    this.image.setTexture(ensureTileTexture(this.battle.world, this.def.id, this.mask, v));
  }

  protected onDestroyed() {
    this.battle.world.tweens.add({
      targets: this.image,
      scaleY: 0.2 / R,
      y: this.image.y + 20,
      alpha: 0,
      duration: 320,
      ease: 'Quad.in',
      onComplete: () => this.image.destroy(),
    });
  }

  /** Removido pela borracha (sem efeito de destruição). */
  remove() {
    this.archers.forEach((a) => a?.remove());
    this.archers = this.archers.map(() => null);
    this.alive = false;
    this.bar.destroy();
    this.image.destroy();
  }
}

/** Barricada barata de estacas: cai com 2 golpes, mas obriga o inimigo a parar. */
export class Barricade extends Obstacle {
  kind = 'barricade' as const;
  image: Phaser.GameObjects.Image;

  constructor(battle: Battle, public def: PlayerUnitDef, x: number, y: number, hpMul = 1) {
    super(battle, x, y, Math.round(def.hp * hpMul), x, y - 34, 30);
    this.image = battle.world.add.image(x, y - 6, 'barricade').setScale(1 / R).setDepth(y + 10);
    this.image.setScale(0);
    battle.world.tweens.add({ targets: this.image, scale: 1 / R, duration: 260, ease: 'Back.out' });
  }

  protected visual() {
    return this.image;
  }

  edgeDist(px: number, py: number) {
    return rectDist(px, py, this.x, this.y, BARRICADE.halfW, BARRICADE.halfH);
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  protected onDestroyed() {
    // estacas voam para os lados
    this.battle.world.tweens.add({
      targets: this.image,
      angle: Phaser.Math.Between(-60, 60),
      y: this.image.y + 8,
      alpha: 0,
      duration: 450,
      ease: 'Quad.out',
      onComplete: () => this.image.destroy(),
    });
  }
}

/** Torre de defesa construída pelo jogador: uma balista no topo mira e atira sozinha. */
export class DefenseTower extends Obstacle {
  kind = 'tower' as const;
  image: Phaser.GameObjects.Image;
  ballista: Phaser.GameObjects.Image;
  private timer = 0.5;
  private aim = Math.PI; // começa mirando para a esquerda

  constructor(battle: Battle, public def: PlayerUnitDef, x: number, y: number) {
    super(battle, x, y, def.hp, x, y - TOWER.baseY - 6, 50);
    this.image = battle.world.add.image(x, y, 'tower').setOrigin(0.5, TOWER.baseY / TOWER.h).setScale(1 / R).setDepth(y);
    this.image.setScale(1 / R, 0);
    battle.world.tweens.add({ targets: this.image, scaleY: 1 / R, duration: 300, ease: 'Back.out' });
    this.ballista = battle.world.add
      .image(x, y - (TOWER.baseY - TOWER_TOP) - 2, 'ballista')
      .setOrigin(18 / 56, 0.5)
      .setScale(1 / R)
      .setDepth(y + 1);
    this.setAim(this.aim);
  }

  private setAim(a: number) {
    this.aim = a;
    this.ballista.setRotation(a);
    // evita a balista ficar de cabeça para baixo quando mira para a esquerda
    this.ballista.setFlipY(Math.cos(a) < 0);
  }

  protected onDestroyed() {
    this.ballista.destroy();
    this.battle.world.tweens.add({
      targets: this.image,
      scaleY: 0,
      alpha: 0.2,
      duration: 420,
      ease: 'Quad.in',
      onComplete: () => this.image.destroy(),
    });
  }

  protected visual() {
    return this.image;
  }

  edgeDist(px: number, py: number) {
    return Math.hypot(px - this.x, (py - this.y) * 1.6) - TOWER.radius;
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  update(dt: number) {
    if (!this.alive) return;
    this.timer -= dt;
    let best: Unit | null = null;
    let bestD = this.def.range;
    for (const e of this.battle.enemyUnits) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return;
    // gira a balista suavemente na direção do alvo
    const want = Math.atan2(best.aimY - this.ballista.y, best.x - this.ballista.x);
    const diff = Phaser.Math.Angle.Wrap(want - this.aim);
    this.setAim(this.aim + diff * Math.min(1, dt * 8));
    if (this.timer > 0 || Math.abs(diff) > 0.25) return;
    this.timer = this.def.attackRate;
    Sound.play('launch', 0.8);
    // coice do disparo
    const bx = this.ballista.x;
    const by = this.ballista.y;
    this.battle.world.tweens.add({
      targets: this.ballista,
      x: bx - Math.cos(this.aim) * 4,
      y: by - Math.sin(this.aim) * 4,
      duration: 70,
      yoyo: true,
      onComplete: () => this.ballista.setPosition(bx, by),
    });
    const fx = bx + Math.cos(this.aim) * 26;
    const fy = by + Math.sin(this.aim) * 26;
    this.battle.fireProjectile(fx, fy, best, 'bigbolt', this.def.damage, 12, 820, 'player');
  }
}

/** Trecho da muralha do castelo. Quando cai, vira entulho e abre caminho. */
export class WallSegment extends Obstacle {
  kind = 'wall' as const;
  image: Phaser.GameObjects.Image;

  constructor(battle: Battle, public def: WallSegmentDef, hpMul = 1) {
    const cy = (def.y0 + def.y1) / 2;
    super(battle, MAP.wallX, cy, Math.round((def.gate ? HP.gatePiece : HP.wallPiece) * hpMul), MAP.wallX - 26, cy, def.y1 - def.y0 - 14);
    this.bar.setAngle(-90);
    this.archers = [null];
    this.image = battle.world.add.image(MAP.wallX, def.y0, `cwall_${def.id}`).setOrigin(0.5, 0).setScale(1 / R).setDepth(def.y1);
  }

  private open = false;

  /** Portão: abre quando um soldado nosso chega perto (inimigo nunca passa). */
  setOpen(v: boolean) {
    if (!this.def.gate || !this.alive || v === this.open) return;
    this.open = v;
    this.image.setTexture(v ? `cgate_open_${this.def.id}` : `cwall_${this.def.id}`);
    Sound.play('crack', 0.35);
  }

  get cy() {
    return this.y;
  }

  get aimY() {
    return this.y;
  }

  protected visual() {
    return this.alive ? this.image : null;
  }

  edgeDist(px: number, py: number) {
    return rectDist(px, py, MAP.wallX, this.cy, MAP.wallHalf, (this.def.y1 - this.def.y0) / 2);
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  archerSpots() {
    return [{ x: MAP.wallX + 2, y: this.cy + 8 }];
  }

  private rubble: Phaser.GameObjects.Image | null = null;

  /** Reparar: reconstrói o pedaço caído ou recupera a vida toda. */
  repair() {
    const scene = this.battle.world;
    if (!this.alive) {
      this.alive = true;
      this.rubble?.destroy();
      this.rubble = null;
      this.image = scene.add.image(MAP.wallX, this.def.y0, `cwall_${this.def.id}`).setOrigin(0.5, 0).setScale(1 / R).setDepth(this.def.y1);
      this.bar = scene.add.graphics().setDepth(1500).setPosition(MAP.wallX - 26, this.cy).setAngle(-90);
      this.archers = [null];
      this.open = false;
      this.image.setScale(1 / R, 0);
      scene.tweens.add({ targets: this.image, scaleY: 1 / R, duration: 300, ease: 'Back.out' });
    }
    this.hp = this.maxHp;
    drawBar(this.bar, this.barW, 1, 0x6fdc4a, 0);
  }

  protected onDestroyed() {
    const rub = this.battle.world.add.image(MAP.wallX, this.def.y0, `rubble_${this.def.id}`).setOrigin(0.5, 0).setScale(1 / R).setDepth(5);
    this.rubble = rub;
    rub.setAlpha(0);
    this.battle.world.tweens.add({ targets: rub, alpha: 1, duration: 300 });
    this.battle.world.tweens.add({
      targets: this.image,
      alpha: 0,
      scaleY: 0.3 / R,
      y: this.def.y0 + (this.def.y1 - this.def.y0) * 0.35,
      duration: 450,
      ease: 'Quad.in',
      onComplete: () => this.image.destroy(),
    });
    this.battle.bigFx(MAP.wallX, this.cy);
  }
}

/** Castelo interior: se cair, a fase está perdida. */
export class Keep extends Obstacle {
  kind = 'keep' as const;

  constructor(battle: Battle, private castleImage: Phaser.GameObjects.Image, hpMul = 1) {
    super(battle, MAP.keep.x, MAP.keep.y, Math.round(HP.keep * hpMul), -1000, -1000);
    this.bar.setVisible(false);
  }

  get aimY() {
    return this.y - 30;
  }

  protected visual() {
    return null;
  }

  edgeDist(px: number, py: number) {
    return Math.hypot(px - this.x, py - this.y) - MAP.keep.r;
  }

  blocks(px: number, py: number, r: number) {
    return this.edgeDist(px, py) < r;
  }

  takeDamage(dmg: number) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.castleImage.setTintFill(0xffd0c0);
    this.battle.world.time.delayedCall(50, () => this.castleImage.clearTint());
    if (this.hp <= 0) this.alive = false;
    this.battle.onKeepDamaged();
  }

  protected onDestroyed() {}
}

// =====================================================================
// Atirador (arqueiro/besteiro) em cima de um muro ou da muralha
// =====================================================================
export class Archer {
  image: Phaser.GameObjects.Image;
  alive = true;
  private timer = Math.random() * 0.5;

  constructor(
    private battle: Battle,
    public def: PlayerUnitDef,
    public x: number,
    public y: number,
    public host: Obstacle,
    public spot: number,
  ) {
    const scene = battle.world;
    this.image = scene.add.image(x, y, `u_${def.id}`).setOrigin(0.5, 1).setScale(0.62 / R).setFlipX(true);
    this.image.setDepth(y + 200);
    this.image.setAlpha(0);
    scene.tweens.add({ targets: this.image, alpha: 1, y: { from: y - 20, to: y }, duration: 250, ease: 'Bounce.out' });
  }

  update(dt: number) {
    if (!this.alive) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    let best: Unit | null = null;
    let bestD = this.def.range;
    for (const e of this.battle.enemyUnits) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return;
    this.timer = this.def.attackRate;
    this.image.setFlipX(best.x < this.x);
    const scene = this.battle.world;
    scene.tweens.add({ targets: this.image, scaleX: 0.58 / R, duration: 90, yoyo: true });
    Sound.play('whoosh', 0.6);
    const isBolt = this.def.id === 'besteiro';
    this.battle.fireProjectile(this.x, this.y - 26, best, isBolt ? 'bolt' : 'arrow', this.def.damage, isBolt ? 25 : 60, isBolt ? 800 : 560, 'player');
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.battle.world.tweens.add({
      targets: this.image,
      y: this.y + 30,
      angle: -90,
      alpha: 0,
      duration: 600,
      ease: 'Quad.in',
      onComplete: () => this.image.destroy(),
    });
  }

  remove() {
    this.alive = false;
    this.image.destroy();
  }
}
