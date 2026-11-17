import Phaser from 'phaser';
import { R, WORLD_W, WORLD_H, CASTLE_TEX, PALISADE, TOWER, KEEP_TEX, HOUSE, ensureBackground } from '../art/art';
import { MAP, HOUSE_CAPACITY, CASTLE, TILE, cellOf, cellCenter } from '../battle/map';
import { NavGrid } from '../battle/grid';
import { Campaign, eraOf, type Snapshot } from '../systems/campaign';
import { PLAYER_UNITS, SELL_REFUND, type PlayerUnitDef } from '../data/units';
import { getEnemy, bossName, bossLook } from '../data/enemies';
import { Sound } from '../systems/audio';
import { getLevel, TOTAL_LEVELS, type LevelDef } from '../data/levels';
import { Save, MIN_BATTLE_COINS } from '../systems/save';
import { Ads } from '../systems/ads';
import {
  Unit,
  Palisade,
  Barricade,
  WallTile,
  DefenseTower,
  WallSegment,
  Keep,
  Archer,
  Obstacle,
  type Battle,
  type Target,
  type Team,
  type Stats,
} from '../battle/entities';
import { text, button, roundButton, type RoundButton, drawPanel, img, toast, coinCounter, modal, TITLE_FONT, tr } from '../ui/ui';

const CARD_W = 90;
const CARD_H = 86;

type Weather = 'sol' | 'chuva' | 'neve';
const WEATHER_LABEL: Record<Weather, string> = { sol: 'Dia de sol', chuva: 'Dia de chuva', neve: 'Dia de neve' };
const BAR_TOP = 630;
const UNIT_SCALE = 0.8;

// ---------- poderes especiais ----------
const HEAL_UNLOCK = 3; // hospital a partir da fase 3
const ARROWS_UNLOCK = 15; // chuva de flechas a partir da fase 15
const HEAL_CD = 22; // segundos de espera
const ARROWS_CD = 30;
const HEAL_RADIUS = 70;
const ARROWS_RADIUS = 110;

/** Área dentro dos muros do castelo onde também dá para posicionar soldados. */
const COURTYARD = { x0: CASTLE.x + 30, x1: CASTLE.x + CASTLE.w - 26, y0: CASTLE.y + 58, y1: CASTLE.y + CASTLE.h - 50 };

/** Frases de desafio do chefe. */
const TAUNTS = [
  'Vou acabar com você!',
  'Está de brincadeira comigo?',
  'Acha que esse muro vai te proteger de mim?',
  'Seu castelo vai cair hoje!',
  'Isso é tudo que você tem?',
  'Corram, covardes!',
  'Ninguém me derrota!',
  'Suas flechas fazem cócegas!',
  'Entregue o castelo e talvez eu poupe você!',
  'Hoje o seu reino acaba!',
];

type Mode = { type: 'none' } | { type: 'place'; def: PlayerUnitDef };

interface Card {
  def: PlayerUnitDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  cost: Phaser.GameObjects.Text;
  locked: boolean;
}

export class GameScene extends Phaser.Scene implements Battle {
  playerUnits: Unit[] = [];
  enemyUnits: Unit[] = [];
  wallSegments: WallSegment[] = [];
  keep!: Keep;
  private palisades: Palisade[] = [];
  private barricades: Barricade[] = [];
  /** Peças de muro/porta construídas na grade (chave "gx,gy"). */
  private tiles = new Map<string, WallTile>();
  private nav!: NavGrid;
  /** Grade dos inimigos: muros têm custo (podem ser quebrados). */
  private navEnemy!: NavGrid;
  private navEnemyAge = 0;
  /** Ferramenta de construção de muros ativa (ou borracha). */
  private buildTool: PlayerUnitDef | 'erase' | null = null;
  private buildLayer: Phaser.GameObjects.Container | null = null;
  private lastPaint = '';
  private towers: DefenseTower[] = [];
  private restoring = false;
  // ---- Fase 0: tutorial ----
  private tutorial = false;
  private tutStep = -1;
  private tutLayer: Phaser.GameObjects.Container | null = null;
  private tutArrow: Phaser.GameObjects.Graphics | null = null;
  private tutBase = 0;
  private tutStart = 0;
  private repairBtn: ReturnType<typeof button> | null = null;
  private healCd = 0;
  private arrowsCd = 0;
  private abilityMode: 'heal' | 'arrows' | null = null;
  private aimGfx: Phaser.GameObjects.Graphics | null = null;
  private abilityBtns: { kind: 'heal' | 'arrows'; btn: RoundButton }[] = [];
  private weather: Weather = 'sol';

  private level!: LevelDef;
  private state: 'prep' | 'battle' | 'end' = 'prep';
  private battleTime = 0;
  private waveStarts: number[] = [];
  private wavesStarted = 0;
  private spawnQueue: { enemy: string; at: number; wave: number; lane: number; dy: number; speed: number }[] = [];
  private houseLevel = 0;
  private houseImg: Phaser.GameObjects.Image | null = null;
  private houseLvlText: Phaser.GameObjects.Text | null = null;
  private capText!: Phaser.GameObjects.Text;
  private keepImg!: Phaser.GameObjects.Image;
  /** Unidades dadas de graça no início (vender não devolve moedas). */
  private freebies = new Set<object>();
  private corpses: Unit[] = [];
  private selected: Unit[] = [];
  private coinsEarned = 0;
  private victoryBonus = 0;
  private speed = 1;
  private paused = false;
  private mode: Mode = { type: 'none' };

  private cloudShadows: Phaser.GameObjects.Image[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private cards: Card[] = [];
  private cardsLayer!: Phaser.GameObjects.Container;
  private prepLayer!: Phaser.GameObjects.Container;
  private battleLayer!: Phaser.GameObjects.Container;
  private zoneGfx!: Phaser.GameObjects.Graphics;
  private coinsUI!: ReturnType<typeof coinCounter>;
  private castleBar!: Phaser.GameObjects.Graphics;
  private castleHpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private callBtn: ReturnType<typeof button> | null = null;
  private markers: Phaser.GameObjects.Container | null = null;
  private popup: Phaser.GameObjects.Container | null = null;
  private orderMarker: Phaser.GameObjects.Graphics | null = null;
  private speedBtn!: RoundButton;
  private lastShake = 0;
  private lastWaveLabel = '';
  private lastCallLabel = '';

  constructor() {
    super('Game');
  }

  get world(): Phaser.Scene {
    return this;
  }

  init(data: { level: number }) {
    this.level = getLevel(Phaser.Math.Clamp(data.level ?? 1, 0, TOTAL_LEVELS));
    this.tutorial = this.level.number === 0;
    this.tutStep = -1;
    this.tutLayer = null;
    this.playerUnits = [];
    this.enemyUnits = [];
    this.wallSegments = [];
    this.palisades = [];
    this.barricades = [];
    this.tiles = new Map();
    this.buildTool = null;
    this.buildLayer = null;
    this.lastPaint = '';
    this.towers = [];
    this.state = 'prep';
    this.battleTime = 0;
    this.waveStarts = this.level.waves.map((w) => w.startAt);
    this.wavesStarted = 0;
    this.spawnQueue = [];
    this.corpses = [];
    this.selected = [];
    this.coinsEarned = 0;
    this.victoryBonus = 0;
    this.speed = 1;
    this.paused = false;
    this.mode = { type: 'none' };
    this.cards = [];
    this.houseLevel = 0;
    this.houseImg = null;
    this.houseLvlText = null;
    this.freebies = new Set();
    this.restoring = false;
    this.repairBtn = null;
    this.healCd = 0;
    this.arrowsCd = 0;
    this.abilityMode = null;
    this.aimGfx = null;
    this.abilityBtns = [];
    this.cloudShadows = [];
    this.callBtn = null;
    this.markers = null;
    this.popup = null;
    this.orderMarker = null;
    this.lastWaveLabel = '';
    this.lastCallLabel = '';
  }

  create() {
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;

    // ---------- mapa ----------
    // o mapa muda a cada era (5 fases)
    const era = eraOf(this.level.number);
    this.add.image(0, 0, ensureBackground(this, era.theme)).setOrigin(0).setScale(1 / R).setDepth(0);
    this.add.image(CASTLE_TEX.x, CASTLE_TEX.y, 'castle').setOrigin(0).setScale(1 / R).setDepth(10);
    this.wallSegments = MAP.wallSegments.map((def) => new WallSegment(this, def, this.level.dmgMul));
    for (const y of [MAP.wallSegments[0].y0, MAP.wallSegments[MAP.wallSegments.length - 1].y1]) {
      this.add.image(MAP.wallX, y + 8, 'ctower').setOrigin(0.5, 76 / 90).setScale(1 / R).setDepth(y + 20);
    }
    this.keepImg = this.add
      .image(MAP.keep.x, MAP.keep.y - 16, 'keep')
      .setOrigin(KEEP_TEX.ax / KEEP_TEX.w, KEEP_TEX.ay / KEEP_TEX.h)
      .setScale(1 / R)
      .setDepth(MAP.keep.y + 12);
    this.keep = new Keep(this, this.keepImg, this.level.dmgMul);

    // grade de navegação: o que bloqueia os nossos soldados
    // grade dos inimigos: cada obstáculo custa conforme a vida (mais forte = mais caro de quebrar)
    this.navEnemy = new NavGrid((mark) => {
      const cost = (hp: number) => Math.min(200, Math.round(6 + hp / 3));
      for (const t of this.tiles.values()) if (t.alive) mark(t.x - TILE / 2, t.y - TILE / 2, t.x + TILE / 2, t.y + TILE / 2, cost(t.hp));
      for (const s of this.wallSegments) if (s.alive) mark(MAP.wallX - MAP.wallHalf, s.def.y0, MAP.wallX + MAP.wallHalf, s.def.y1, cost(s.hp));
      for (const p of this.palisades) if (p.alive) mark(p.x - PALISADE.halfW, p.y - PALISADE.halfH, p.x + PALISADE.halfW, p.y + PALISADE.halfH, cost(p.hp));
      for (const b of this.barricades) if (b.alive) mark(b.x - 12, b.y - 14, b.x + 12, b.y + 14, cost(b.hp));
      for (const t of this.towers) if (t.alive) mark(t.x - 18, t.y - 12, t.x + 18, t.y + 12, cost(t.hp));
      const C = CASTLE;
      mark(C.x + 26, C.y + 6, C.x + C.w, C.y + 46);
      mark(C.x + 26, C.y + C.h - 44, C.x + C.w, C.y + C.h);
      mark(C.x + C.w - 20, C.y, C.x + C.w, C.y + C.h);
    });
    this.nav = new NavGrid((mark) => {
      for (const t of this.tiles.values()) if (t.alive && !t.door) mark(t.x - TILE / 2, t.y - TILE / 2, t.x + TILE / 2, t.y + TILE / 2);
      for (const s of this.wallSegments) {
        if (s.alive && !s.def.gate) mark(MAP.wallX - MAP.wallHalf, s.def.y0, MAP.wallX + MAP.wallHalf, s.def.y1);
      }
      for (const p of this.palisades) if (p.alive) mark(p.x - PALISADE.halfW, p.y - PALISADE.halfH, p.x + PALISADE.halfW, p.y + PALISADE.halfH);
      for (const t of this.towers) if (t.alive) mark(t.x - 18, t.y - 12, t.x + 18, t.y + 12);
      for (const b of this.barricades) if (b.alive) mark(b.x - 12, b.y - 14, b.x + 12, b.y + 14);
      // muros fixos de cima, de baixo e da direita do castelo + castelo interior
      const C = CASTLE;
      mark(C.x + 26, C.y + 6, C.x + C.w, C.y + 46);
      mark(C.x + 26, C.y + C.h - 44, C.x + C.w, C.y + C.h);
      mark(C.x + C.w - 20, C.y, C.x + C.w, C.y + C.h);
      mark(MAP.keep.x - MAP.keep.r, MAP.keep.y - MAP.keep.r * 0.7, MAP.keep.x + MAP.keep.r, MAP.keep.y + MAP.keep.r * 0.7);
    });

    for (let i = 0; i < 3; i++) {
      const c = img(this, Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(100, 650), 'cloudshadow', Phaser.Math.FloatBetween(1.2, 2));
      c.setDepth(1800).setData('speed', Phaser.Math.FloatBetween(8, 16));
      this.cloudShadows.push(c);
    }

    // ---------- partículas ----------
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 320,
      speed: { min: 60, max: 200 },
      scale: { start: 0.55, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(1700);
    this.dust = this.add.particles(0, 0, 'dust', {
      lifespan: 700,
      speed: { min: 30, max: 140 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    }).setDepth(1650);

    this.buildTopBar();
    this.buildPrepUI();
    this.buildBattleUI();

    // Dentro da mesma era, o que sobrou da fase anterior vem junto.
    // No começo de cada era: 1 casa, 1 arqueiro na muralha e 1 soldado (grátis).
    const snap = this.tutorial ? null : Campaign.load(this.level.number);
    if (snap) {
      this.restoring = true;
      this.restore(snap);
      this.restoring = false;
    } else {
      this.upgradeHouse(true);
      const gratisArcher = PLAYER_UNITS.find((u) => u.id === 'arqueiro')!;
      const a = this.createArcher(gratisArcher, this.wallSegments[1], 0);
      this.freebies.add(a);
      const gratisSoldier = PLAYER_UNITS.find((u) => u.id === 'recruta')!;
      const s = this.spawnPlayerUnit(gratisSoldier, MAP.wallX - 55, MAP.gate.y);
      this.freebies.add(s);
      if (this.tutorial) this.upgradeHouse(true); // tutorial: casa com mais vagas
    }
    this.refreshCapacity();
    this.drawCastleBar();
    this.refreshRepair();

    // ajuda do rei para não travar o jogador sem moedas (no tutorial, um pouco mais)
    const data = Save.get();
    const minCoins = this.tutorial ? 300 : MIN_BATTLE_COINS;
    if (data.coins < minCoins) {
      const gift = minCoins - data.coins;
      Save.addCoins(gift);
      this.time.delayedCall(600, () => toast(this, `O Rei enviou reforços: +${gift} moedas`, '#ffe58a', 150));
    }
    this.refreshCoins();

    // toque no chão: posicionar, ou mandar soldados selecionados
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.paused || this.state === 'end' || this.buildTool) return;
      this.onGroundTap(p.worldX, p.worldY);
    });

    this.setupWeather();
    Sound.music('menu');
    this.events.once('shutdown', () => {
      Sound.setRain(false);
      // saiu durante a preparação: guarda o que já foi comprado/posicionado
      if (this.state === 'prep' && !this.tutorial) Campaign.saveRetry(this.snapshot(this.level.number));
    });

    // mira dos poderes acompanha o dedo/mouse
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.aimGfx) this.aimGfx.setPosition(p.worldX, p.worldY);
      // construindo muros: arrastar o dedo vai desenhando
      if (this.buildTool && p.isDown) this.paintAt(p.worldX, p.worldY);
    });
    // construindo muros: o toque pinta mesmo em cima de soldado/construção
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.buildTool || this.paused) return;
      this.lastPaint = '';
      this.paintAt(p.worldX, p.worldY);
    });

    if (this.level.number === 0) this.banner('Fase 0: Como jogar');
    else this.banner(`Fase ${this.level.number}`, `${era.name}  •  ${tr(WEATHER_LABEL[this.weather])}`);
    this.announcePowers();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // =================================================================
  // Fase 0: tutorial passo a passo (balão + seta apontando onde tocar)
  // =================================================================
  private cardPos(id: string) {
    const c = this.cards.find((k) => k.def.id === id);
    return c ? { x: c.container.x, y: c.container.y - 40 } : null;
  }

  private tutorialSteps(): { text: string; done?: () => boolean; target?: () => { x: number; y: number } | null; tap?: boolean; auto?: number }[] {
    return [
      { text: 'Bem-vindo, comandante! Este é o seu castelo. Os inimigos vêm pela esquerda, pelas estradas.', tap: true, target: () => ({ x: MAP.keep.x, y: MAP.keep.y - 70 }) },
      { text: 'Toque na carta RECRUTA aqui embaixo.', done: () => this.mode.type === 'place' && this.mode.def.id === 'recruta', target: () => this.cardPos('recruta') },
      { text: 'Agora toque na área VERDE para colocar o soldado.', done: () => this.soldierCount() > this.tutBase, target: () => ({ x: 900, y: 330 }) },
      { text: 'Muito bem! Agora toque na carta MUROS para construir.', done: () => this.buildTool !== null, target: () => this.cardPos('muros') },
      { text: 'Arraste o dedo na área verde para desenhar um muro.', done: () => this.tiles.size >= 3, target: () => ({ x: 830, y: 300 }) },
      { text: 'Ótimo! Toque em PRONTO para terminar de construir.', done: () => this.buildTool === null, target: () => ({ x: 1150, y: 630 }) },
      { text: 'Toque na carta ARQUEIRO e depois num círculo em cima do muro.', done: () => this.soldierCount() > this.tutBase + 1, target: () => this.cardPos('arqueiro') },
      { text: 'A CASA abriga seus soldados. Melhore a casa para ter mais vagas.', tap: true, target: () => this.cardPos('casa') },
      { text: 'Tudo pronto! Toque em INICIAR ATAQUE.', done: () => this.state === 'battle', target: () => ({ x: WORLD_W / 2, y: 60 }) },
      { text: 'Na batalha: toque num soldado e depois no mapa para mandar ele ir lá.', auto: 7000, target: () => ({ x: 48, y: 620 }) },
      { text: 'Derrote todos os inimigos para vencer!', auto: 5000 },
    ];
  }

  private updateTutorial() {
    if (this.state === 'end') return;
    if (this.tutStep < 0) {
      this.tutBase = this.soldierCount();
      this.showTutStep(0);
      return;
    }
    const step = this.tutorialSteps()[this.tutStep];
    if (!step) return;
    const elapsed = this.time.now - this.tutStart;
    if ((step.done && step.done()) || (step.auto && elapsed > step.auto)) {
      this.showTutStep(this.tutStep + 1);
      return;
    }
    // seta acompanha o alvo
    const t = step.target?.();
    if (this.tutArrow) {
      this.tutArrow.setVisible(!!t);
      if (t) this.tutArrow.setX(t.x);
      if (t) this.tutArrow.setData('baseY', t.y);
    }
  }

  private showTutStep(i: number) {
    this.tutLayer?.destroy();
    this.tutLayer = null;
    this.tutArrow = null;
    this.tutStep = i;
    this.tutStart = this.time.now;
    const step = this.tutorialSteps()[i];
    if (!step) return;
    const layer = this.add.container(0, 0).setDepth(3500);
    // balão com a explicação
    const box = this.add.container(WORLD_W / 2, 196);
    const msg = text(this, 0, -8, step.text, 21, '#2a1a10', { strokeThickness: 0, wordWrap: { width: 600 } });
    const h = Math.max(70, msg.height + (step.tap ? 78 : 34));
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-330, -h / 2 + 5, 660, h, 20);
    g.fillStyle(0xfff7e6, 0.97);
    g.lineStyle(4, 0xc99a4a, 1);
    g.fillRoundedRect(-330, -h / 2, 660, h, 20);
    g.strokeRoundedRect(-330, -h / 2, 660, h, 20);
    msg.setY(step.tap ? -h / 2 + 12 + msg.height / 2 : 0);
    box.add([g, msg]);
    if (step.tap) {
      const ok = button(this, 0, h / 2 - 32, 280, 44, 'Toque para continuar', 'green', () => this.showTutStep(i + 1), 18);
      box.add(ok);
    }
    const skip = button(this, 250, -h / 2 - 4, 150, 32, 'Pular tutorial', 'gray', () => {
      this.tutStep = 999;
      this.tutLayer?.destroy();
      this.tutLayer = null;
    }, 13);
    box.add(skip);
    box.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    layer.add(box);
    // seta pulando em cima do que tocar
    const arrow = this.add.graphics();
    arrow.fillStyle(0xffe58a, 1);
    arrow.lineStyle(3, 0x2a1a10, 1);
    arrow.beginPath();
    arrow.moveTo(-16, -28);
    arrow.lineTo(16, -28);
    arrow.lineTo(16, -12);
    arrow.lineTo(28, -12);
    arrow.lineTo(0, 14);
    arrow.lineTo(-28, -12);
    arrow.lineTo(-16, -12);
    arrow.closePath();
    arrow.fillPath();
    arrow.strokePath();
    const t = step.target?.();
    arrow.setPosition(t?.x ?? -100, (t?.y ?? 0) - 26);
    arrow.setVisible(!!t);
    arrow.setData('baseY', t?.y ?? 0);
    this.tweens.add({
      targets: arrow,
      duration: 450,
      yoyo: true,
      repeat: -1,
      props: { y: { getEnd: () => (arrow.getData('baseY') as number) - 10, getStart: () => (arrow.getData('baseY') as number) - 30 } },
    });
    layer.add(arrow);
    this.tutArrow = arrow;
    this.tutLayer = layer;
  }

  private healPct() {
    return 5 + 2 * Math.floor((this.level.number - HEAL_UNLOCK) / 5);
  }

  private arrowsDamage() {
    // 2x o ataque de um soldado, subindo conforme a fase
    return Math.round(2 * 10 * (1 + (this.level.number - ARROWS_UNLOCK) * 0.06));
  }

  /** Avisa poderes novos (fase 3: hospital, fase 15: chuva de flechas, +2% de cura a cada 5 fases). */
  private announcePowers() {
    const n = this.level.number;
    let msg: [string, string] | null = null;
    if (n === HEAL_UNLOCK) msg = ['Novo poder: Hospital!', `Cura ${this.healPct()}% da vida dos soldados na roda`];
    else if (n === ARROWS_UNLOCK) msg = ['Novo poder: Chuva de Flechas!', 'Escolha onde as flechas vão cair'];
    else if (n > HEAL_UNLOCK && (n - HEAL_UNLOCK) % 5 === 0) msg = ['Hospital melhorou!', `Agora cura ${this.healPct()}% (+2%)`];
    if (msg) {
      const [t, s] = msg;
      this.time.delayedCall(2000, () => this.banner(t, s));
    }
  }

  // =================================================================
  // Progresso dentro da era (salvar / trazer de volta)
  // =================================================================
  private snapshot(level: number): Snapshot {
    const structures: Snapshot['structures'] = [];
    const palIndex = new Map<Obstacle, number>();
    for (const p of this.palisades) {
      if (!p.alive) continue;
      palIndex.set(p, structures.length);
      structures.push({ id: 'muro', x: p.x, y: p.y, hp: p.hp });
    }
    for (const b of this.barricades) if (b.alive) structures.push({ id: 'barricada', x: b.x, y: b.y, hp: b.hp });
    for (const t of this.towers) if (t.alive) structures.push({ id: 'torre', x: t.x, y: t.y, hp: t.hp });
    for (const t of this.tiles.values()) {
      if (!t.alive) continue;
      palIndex.set(t, structures.length);
      structures.push({ id: t.def.id, x: t.x, y: t.y, hp: t.hp });
    }
    const archers: Snapshot['archers'] = [];
    this.wallSegments.forEach((s, i) => {
      if (!s.alive) return;
      s.archers.forEach((a, k) => {
        if (a && a.alive) archers.push({ id: a.def.id, host: 'wall', hostIndex: i, spot: k, free: this.freebies.has(a) });
      });
    });
    for (const p of [...this.palisades, ...this.tiles.values()]) {
      if (!p.alive) continue;
      p.archers.forEach((a, k) => {
        if (a && a.alive) archers.push({ id: a.def.id, host: 'palisade', hostIndex: palIndex.get(p)!, spot: k, free: this.freebies.has(a) });
      });
    }
    return {
      level,
      houses: [],
      houseLevel: this.houseLevel,
      units: this.playerUnits
        .filter((u) => u.alive)
        .map((u) => ({ id: u.defId, x: u.post.x, y: u.post.y, hp: Math.round(u.hp), free: this.freebies.has(u) })),
      structures,
      archers,
      walls: this.wallSegments.map((s) => (s.alive ? Math.round(s.hp) : 0)),
      keep: Math.round(this.keep.hp),
    };
  }

  private restore(s: Snapshot) {
    const lvl = Math.max(1, s.houseLevel ?? s.houses.length);
    for (let i = 0; i < lvl; i++) this.upgradeHouse(true);
    s.walls.forEach((hp, i) => this.wallSegments[i]?.setHp(hp));
    this.keep.hp = Math.min(this.keep.maxHp, Math.max(1, s.keep));
    const created: Obstacle[] = [];
    const tileIds = ['mmadeira', 'mpedra', 'pmadeira', 'ppedra'];
    for (const st of s.structures) {
      const def = PLAYER_UNITS.find((u) => u.id === st.id);
      if (!def) continue;
      let o: Obstacle;
      if (tileIds.includes(def.id)) {
        const { gx, gy } = cellOf(st.x, st.y);
        o = this.createTile(def, gx, gy);
      } else {
        o = this.createStructure(def, st.x, st.y);
      }
      o.setHp(st.hp);
      created.push(o);
    }
    for (const a of s.archers) {
      const host = a.host === 'wall' ? this.wallSegments[a.hostIndex] : created[a.hostIndex];
      if (!host || !host.alive || host.archers[a.spot]) continue;
      const ar = this.createArcher(PLAYER_UNITS.find((u) => u.id === a.id)!, host, a.spot);
      if (a.free) this.freebies.add(ar);
    }
    for (const u of s.units) {
      const def = PLAYER_UNITS.find((d) => d.id === u.id)!;
      let { x, y } = u;
      if (!this.inZone(x, y) && !this.inCourtyard(x, y)) {
        x = Phaser.Math.Clamp(x, MAP.zone.x0, MAP.zone.x1);
        y = Phaser.Math.Clamp(y, MAP.zone.y0, MAP.zone.y1);
      }
      const unit = this.spawnPlayerUnit(def, x, y);
      unit.setHp(u.hp);
      if (u.free) this.freebies.add(unit);
    }
  }

  // ---------- reparo antes da fase ----------
  private repairCost() {
    let missing = 0;
    for (const s of this.wallSegments) missing += s.alive ? s.maxHp - s.hp : s.maxHp + 30;
    missing += this.keep.maxHp - this.keep.hp;
    for (const o of [...this.palisades, ...this.barricades, ...this.towers, ...this.tiles.values()]) if (o.alive) missing += o.maxHp - o.hp;
    return Math.ceil(missing * 0.5);
  }

  private refreshRepair() {
    this.repairBtn?.destroy();
    this.repairBtn = null;
    if (this.state !== 'prep') return;
    const cost = this.repairCost();
    if (cost <= 0) return;
    const btn = button(this, 960, 98, 210, 50, `Reparar  ${cost}`, 'gold', () => this.repairAll(), 19);
    btn.setDepth(1960);
    this.tweens.add({ targets: btn, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });
    this.repairBtn = btn;
  }

  private repairAll() {
    const cost = this.repairCost();
    if (!Save.spend(cost)) {
      toast(this, 'Moedas insuficientes para reparar', '#ff7a6a', 150);
      return;
    }
    for (const s of this.wallSegments) s.repair();
    this.invalidateNav();
    this.keep.hp = this.keep.maxHp;
    for (const o of [...this.palisades, ...this.barricades, ...this.towers, ...this.tiles.values()]) if (o.alive) o.setHp(o.maxHp);
    this.drawCastleBar();
    this.dust.explode(20, MAP.wallX, MAP.gate.y);
    Sound.play('place');
    toast(this, 'Tudo reparado!', '#8ff06a', 150);
    this.refreshCoins();
    this.refreshRepair();
  }

  /** Clima aleatório: sol, chuva (com raios) ou neve. */
  private setupWeather() {
    const r = Math.random();
    this.weather = r < 0.45 ? 'sol' : r < 0.75 ? 'chuva' : 'neve';
    if (this.weather === 'sol') {
      this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xfff0c0, 0.06).setDepth(1790);
      return;
    }
    this.cloudShadows.forEach((c) => c.setAlpha(1.4));
    if (this.weather === 'chuva') {
      this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x1a2a3a, 0.28).setDepth(1790);
      this.add.particles(0, 0, 'raindrop', {
        x: { min: -100, max: WORLD_W + 200 },
        y: -20,
        lifespan: 750,
        speedY: { min: 950, max: 1150 },
        speedX: { min: -200, max: -160 },
        scale: { min: 0.8 / R, max: 1.3 / R },
        alpha: { start: 0.8, end: 0.4 },
        quantity: 5,
        frequency: 16,
      }).setDepth(1860);
      Sound.setRain(true);
      // raios de vez em quando
      const flash = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xffffff, 0).setDepth(1870);
      const strike = () => {
        if (!this.scene.isActive()) return;
        flash.setAlpha(0.55);
        this.tweens.add({ targets: flash, alpha: 0, duration: 380, ease: 'Quad.out' });
        this.time.delayedCall(250, () => Sound.play('thunder', 0.8));
        this.time.delayedCall(Phaser.Math.Between(7000, 15000), strike);
      };
      this.time.delayedCall(Phaser.Math.Between(3000, 7000), strike);
    } else {
      // neve: chão esbranquiçado + flocos caindo
      this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xeaf4ff, 0.32).setDepth(4);
      this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xbfd8f0, 0.12).setDepth(1790);
      this.add.particles(0, 0, 'snowflake', {
        x: { min: -50, max: WORLD_W + 50 },
        y: -10,
        lifespan: 9000,
        speedY: { min: 40, max: 90 },
        speedX: { min: -30, max: 20 },
        accelerationX: { min: -8, max: 8 },
        scale: { min: 0.5 / R, max: 1.3 / R },
        alpha: { min: 0.6, max: 1 },
        quantity: 2,
        frequency: 70,
      }).setDepth(1860);
    }
  }

  // =================================================================
  // Interface
  // =================================================================
  private buildTopBar() {
    const g = this.add.graphics().setDepth(2000);
    drawPanel(g, 16, 12, 300, 46, 0x3a2a1c, 0x24180f, 14);
    text(this, 66, 35, 'Castelo', 18, '#fbeed3').setDepth(2001);
    this.castleBar = this.add.graphics().setDepth(2001);
    this.castleHpText = text(this, 218, 35, '', 15).setDepth(2002);
    this.drawCastleBar();

    const wg = this.add.graphics().setDepth(2000);
    drawPanel(wg, WORLD_W / 2 - 200, 12, 400, 46, 0x3a2a1c, 0x24180f, 14);
    this.waveText = text(this, WORLD_W / 2, 35, '', 20, '#ffe58a').setDepth(2001);
    this.updateWaveText();

    this.coinsUI = coinCounter(this, 920, 35, Save.get().coins);
    this.coinsUI.container.setDepth(2000);
    // soldados / capacidade das casas
    const cg = this.add.graphics().setDepth(2000);
    drawPanel(cg, 16, 66, 200, 34, 0x3a2a1c, 0x24180f, 12);
    this.add.image(38, 82, 'house').setScale(0.55 / R).setDepth(2001);
    this.capText = text(this, 128, 83, '', 16, '#fbeed3').setDepth(2001);
    // botões redondos: música, velocidade e pausa
    // mudo: desliga TUDO (música, chuva, efeitos)
    const allOn = () => Sound.musicOn || Sound.enabled;
    const music = roundButton(this, 1092, 36, 22, { icon: allOn() ? 'icon_music' : 'icon_music_off' }, 'brown', () => {
      const v = !allOn();
      Sound.setMusicOn(v);
      Sound.setEnabled(v);
      music.setIcon(v ? 'icon_music' : 'icon_music_off');
    });
    music.setDepth(2000);
    this.speedBtn = roundButton(this, 1160, 36, 22, { icon: 'icon_speed' }, 'blue', () => this.toggleSpeed());
    this.speedBtn.sub.setText('x1');
    this.speedBtn.sub.setY(32);
    this.speedBtn.setDepth(2000);
    roundButton(this, 1228, 36, 22, { icon: 'icon_pause' }, 'brown', () => this.openPause()).setDepth(2000);
  }

  private drawCastleBar() {
    const g = this.castleBar;
    const ratio = this.keep.hp / this.keep.maxHp;
    g.clear();
    g.fillStyle(0x1a120b, 1);
    g.fillRoundedRect(120, 26, 190, 18, 8);
    const color = ratio > 0.5 ? 0x6fdc4a : ratio > 0.25 ? 0xf2c14e : 0xe0503b;
    g.fillStyle(color, 1);
    g.fillRoundedRect(122, 28, Math.max(4, 186 * ratio), 14, 6);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(122, 28, Math.max(4, 186 * ratio), 5, 3);
    this.castleHpText.setText(`${Math.ceil(this.keep.hp)}`);
  }

  private buildPrepUI() {
    this.prepLayer = this.add.container(0, 0).setDepth(1950);
    // área onde pode posicionar
    const z = MAP.zone;
    // acima do chão do castelo (profundidade 10) e abaixo de soldados/muros
    this.zoneGfx = this.add.graphics().setDepth(12);
    // nossa área inteira em verde claro (frente da muralha + dentro do castelo)
    this.zoneGfx.fillStyle(0x7dff6a, 0.16);
    this.zoneGfx.fillRoundedRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, 18);
    this.zoneGfx.lineStyle(2.5, 0x9dff8a, 0.75);
    this.zoneGfx.strokeRoundedRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, 18);
    const cy = COURTYARD;
    this.zoneGfx.fillStyle(0x7dff6a, 0.16);
    this.zoneGfx.fillRoundedRect(cy.x0, cy.y0, cy.x1 - cy.x0, cy.y1 - cy.y0, 10);
    this.zoneGfx.strokeRoundedRect(cy.x0, cy.y0, cy.x1 - cy.x0, cy.y1 - cy.y0, 10);

    const start = button(this, WORLD_W / 2, 98, 300, 58, 'INICIAR ATAQUE', 'red', () => this.startBattle(), 26);
    this.tweens.add({ targets: start, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const hint = text(this, WORLD_W / 2, 604, 'Posicione e construa na área verde (também dentro do castelo)', 18, '#fbeed3');
    this.prepLayer.add([start, hint]);
    this.buildCards();
  }

  private buildBattleUI() {
    this.battleLayer = this.add.container(0, 0).setDepth(1950).setVisible(false);
    // "selecionar todos": botão redondo com os rostos dos soldados
    const all = roundButton(this, 48, 668, 30, { icon: 'icon_group', iconScale: 1.05 }, 'blue', () => this.selectAll());
    this.battleLayer.add(all);
    // poderes especiais: "H" vermelho sem fundo (hospital) e ícone de flechas
    if (this.level.number >= HEAL_UNLOCK) {
      const h = roundButton(this, 1160, 664, 30, { letter: 'H', letterColor: '#e0303a' }, 'red', () => this.selectAbility('heal'), true);
      this.battleLayer.add(h);
      this.abilityBtns.push({ kind: 'heal', btn: h });
    }
    if (this.level.number >= ARROWS_UNLOCK) {
      const a = roundButton(this, 1232, 664, 30, { icon: 'icon_arrows', iconScale: 1.1 }, 'red', () => this.selectAbility('arrows'));
      this.battleLayer.add(a);
      this.abilityBtns.push({ kind: 'arrows', btn: a });
    }
  }

  // =================================================================
  // Poderes: hospital (cura na roda) e chuva de flechas
  // =================================================================
  private selectAbility(kind: 'heal' | 'arrows') {
    if (this.state !== 'battle') return;
    const cd = kind === 'heal' ? this.healCd : this.arrowsCd;
    if (cd > 0) {
      toast(this, `Aguarde ${Math.ceil(cd)}s`, '#ffd36b', 150);
      return;
    }
    if (this.abilityMode === kind) return this.cancelAbility();
    this.clearSelection();
    this.abilityMode = kind;
    this.aimGfx?.destroy();
    const r = kind === 'heal' ? HEAL_RADIUS : ARROWS_RADIUS;
    const g = this.add.graphics().setDepth(1880);
    const col = kind === 'heal' ? 0x6fdc4a : 0xe0503b;
    g.fillStyle(col, 0.18);
    g.fillEllipse(0, 0, r * 2, r * 1.3);
    g.lineStyle(3, col, 0.9);
    g.strokeEllipse(0, 0, r * 2, r * 1.3);
    const p = this.input.activePointer;
    g.setPosition(p.worldX, p.worldY);
    this.aimGfx = g;
    toast(this, kind === 'heal' ? 'Toque onde quer o hospital' : 'Toque onde as flechas vão cair', '#ffffff', 150);
  }

  private cancelAbility() {
    this.abilityMode = null;
    this.aimGfx?.destroy();
    this.aimGfx = null;
  }

  private castAbility(x: number, y: number) {
    const kind = this.abilityMode;
    this.cancelAbility();
    if (kind === 'heal') this.castHeal(x, y);
    else if (kind === 'arrows') this.castArrows(x, y);
  }

  /** Hospital: por 5 segundos, cura % da vida de quem está dentro da roda. */
  private castHeal(x: number, y: number) {
    this.healCd = HEAL_CD;
    const pct = this.healPct() / 100;
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0x6fdc4a, 0.22);
    g.fillEllipse(x, y, HEAL_RADIUS * 2, HEAL_RADIUS * 1.3);
    g.lineStyle(3, 0x8ff06a, 0.9);
    g.strokeEllipse(x, y, HEAL_RADIUS * 2, HEAL_RADIUS * 1.3);
    const cross = text(this, x, y - 4, '✚', 30, '#8ff06a').setDepth(7).setAlpha(0.8);
    this.tweens.add({ targets: cross, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    Sound.play('coin', 0.8);
    // todo soldado/arqueiro dentro da roda recebe a cura, e ela vai JUNTO com
    // ele por 5 segundos (mesmo se ele andar para fora da roda)
    let count = 0;
    for (const u of this.playerUnits) {
      if (!u.alive) continue;
      const dx = (u.x - x) / HEAL_RADIUS;
      const dy = (u.y - y) / (HEAL_RADIUS * 0.65);
      if (dx * dx + dy * dy > 1) continue;
      u.addRegen(pct, 5);
      count++;
    }
    if (count === 0) toast(this, 'Ninguém dentro da roda', '#ffd36b', 150);
    this.tweens.add({ targets: [g, cross], alpha: 0, delay: 600, duration: 500, onComplete: () => { g.destroy(); cross.destroy(); } });
  }

  /** Chuva de flechas: várias rajadas caindo do céu na roda escolhida. */
  private castArrows(x: number, y: number) {
    this.arrowsCd = ARROWS_CD;
    const dmg = this.arrowsDamage();
    const mark = this.add.graphics().setDepth(6);
    mark.lineStyle(3, 0xe0503b, 0.8);
    mark.strokeEllipse(x, y, ARROWS_RADIUS * 2, ARROWS_RADIUS * 1.3);
    for (let v = 0; v < 4; v++) {
      this.time.delayedCall(v * 450, () => {
        Sound.play('whoosh', 1);
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random());
          const tx = x + Math.cos(a) * ARROWS_RADIUS * rr;
          const ty = y + Math.sin(a) * ARROWS_RADIUS * 0.65 * rr;
          const arrow = this.add.image(tx - 60, ty - 420, 'arrow').setScale(1 / R).setDepth(1600).setRotation(Math.atan2(420, 60));
          this.tweens.add({
            targets: arrow,
            x: tx,
            y: ty,
            duration: 380 + Math.random() * 120,
            ease: 'Quad.in',
            onComplete: () => {
              arrow.destroy();
              if (Math.random() < 0.4) this.stuckArrow(tx, ty, 'arrow', 1);
            },
          });
        }
        this.time.delayedCall(420, () => {
          for (const e of this.enemyUnits) {
            if (!e.alive) continue;
            const dx = (e.x - x) / ARROWS_RADIUS;
            const dy = (e.y - y) / (ARROWS_RADIUS * 0.65);
            if (dx * dx + dy * dy > 1) continue;
            e.takeDamage(dmg);
            this.hitFx(e.x, e.aimY, dmg, 'player');
          }
        });
      });
    }
    this.time.delayedCall(2200, () => this.tweens.add({ targets: mark, alpha: 0, duration: 300, onComplete: () => mark.destroy() }));
  }

  private updateAbilities(dt: number) {
    this.healCd = Math.max(0, this.healCd - dt);
    this.arrowsCd = Math.max(0, this.arrowsCd - dt);
    for (const a of this.abilityBtns) {
      const cd = a.kind === 'heal' ? this.healCd : this.arrowsCd;
      const total = a.kind === 'heal' ? HEAL_CD : ARROWS_CD;
      a.btn.setCooldown(cd / total);
      const label = cd > 0 ? `${Math.ceil(cd)}s` : '';
      if (a.btn.sub.text !== label) a.btn.sub.setText(label);
    }
  }

  private updateWaveText() {
    const total = this.level.waves.length;
    const shown = Math.max(1, Math.min(this.wavesStarted, total));
    let label = `${tr(`Fase ${this.level.number}`)}  •  ${tr(`Onda ${shown}/${total}`)}`;
    if (this.state === 'battle' && this.wavesStarted < total) {
      label += `  •  ${tr(`próxima ${Math.max(0, Math.ceil(this.waveStarts[this.wavesStarted] - this.battleTime))}s`)}`;
    } else if (this.state === 'battle') {
      label += `  •  ${tr('última!')}`;
    }
    if (label !== this.lastWaveLabel) {
      this.waveText.setText(label);
      this.lastWaveLabel = label;
    }
    this.updateCallButton();
  }

  private updateCallButton() {
    const hasNext = this.state === 'battle' && this.wavesStarted < this.level.waves.length;
    if (!hasNext) {
      this.callBtn?.destroy();
      this.callBtn = null;
      return;
    }
    const bonus = this.callBonus(this.waveStarts[this.wavesStarted] - this.battleTime);
    if (!this.callBtn) {
      this.callBtn = button(this, WORLD_W / 2, 86, 250, 40, '', 'red', () => this.callNextWave(), 17);
      this.callBtn.setDepth(2000);
      this.lastCallLabel = '';
    }
    const label = tr(`Chamar onda agora +${bonus}`);
    if (label !== this.lastCallLabel) {
      this.callBtn.label.setText(label);
      this.lastCallLabel = label;
    }
  }

  private callBonus(secondsLeft: number) {
    return Math.max(1, Math.round(secondsLeft * 1.5));
  }

  private callNextWave() {
    const next = this.wavesStarted;
    if (this.state !== 'battle' || next >= this.level.waves.length) return;
    const delta = this.waveStarts[next] - this.battleTime;
    if (delta <= 0.2) return;
    for (let i = next; i < this.waveStarts.length; i++) this.waveStarts[i] -= delta;
    for (const s of this.spawnQueue) if (s.wave >= next) s.at -= delta;
    this.spawnQueue.sort((a, b) => a.at - b.at);
    const bonus = this.callBonus(delta);
    Save.addCoins(bonus);
    this.coinsEarned += bonus;
    this.refreshCoins();
    this.coinsUI.pulse();
    toast(this, `Coragem! +${bonus} moedas`, '#ffe58a', 150);
  }

  private buildCards() {
    this.cardsLayer = this.add.container(0, 0).setDepth(1950);
    const bar = this.add.graphics();
    bar.fillStyle(0x20160f, 1);
    bar.fillRect(0, BAR_TOP - 4, WORLD_W, WORLD_H - BAR_TOP + 4);
    bar.fillStyle(0x4a3524, 1);
    bar.fillRect(0, BAR_TOP, WORLD_W, WORLD_H - BAR_TOP);
    bar.fillStyle(0x5c4330, 1);
    bar.fillRect(0, BAR_TOP, WORLD_W, 6);
    this.cardsLayer.add(bar);

    const order = ['recruta', 'espadachim', 'machadeiro', 'lanceiro', 'cavleve', 'cavpesado', 'campeao', 'arqueiro', 'besteiro', 'casa', 'barricada', 'muros', 'torre'];
    const defs = order.map((id) => PLAYER_UNITS.find((u) => u.id === id)!);
    const gap = 5;
    const totalW = defs.length * CARD_W + (defs.length - 1) * gap;
    let x = (WORLD_W - totalW) / 2 + CARD_W / 2;
    const y = BAR_TOP + (WORLD_H - BAR_TOP) / 2 + 2;
    const level = Save.playerLevel();

    for (const def of defs) {
      const c = this.add.container(x, y);
      const bg = this.add.graphics();
      const locked = level < def.unlockLevel;
      const key = def.kind === 'structure' ? ({ muro: 'palisade', barricada: 'barricade', casa: 'house', muros: 'icon_walls' } as Record<string, string>)[def.id] ?? 'tower' : `u_${def.id}`;
      const fit = def.kind === 'structure' ? ({ muro: 0.42, barricada: 0.85, casa: 0.9, muros: 0.85 } as Record<string, number>)[def.id] ?? 0.4 : def.cavalry ? 0.48 : 0.62;
      const icon = img(this, 0, 4, key, fit).setOrigin(0.5, 0.62);
      const name = text(this, 0, -CARD_H / 2 + 11, def.name, 12, '#fbeed3');
      const cost = text(this, 6, CARD_H / 2 - 13, locked ? `Nv ${def.unlockLevel}` : String(def.cost), 16, '#ffe58a');
      const parts: Phaser.GameObjects.GameObject[] = [bg, icon, name, cost];
      if (!locked) {
        parts.push(img(this, -22, CARD_H / 2 - 13, 'coin', 0.75));
      } else {
        icon.setTint(0x2a2a2a).setAlpha(0.7);
        cost.setColor('#c9c2b0');
        cost.setX(0);
        parts.push(img(this, 0, -2, 'lock', 1.3));
      }
      c.add(parts);
      c.setSize(CARD_W, CARD_H);
      c.setInteractive({ useHandCursor: true });
      const card: Card = { def, container: c, bg, icon, cost, locked };
      c.on('pointerdown', () => {
        this.tweens.add({ targets: c, scale: 0.92, duration: 60, yoyo: true });
        this.onCardClick(card);
      });
      this.cards.push(card);
      this.cardsLayer.add(c);
      x += CARD_W + gap;
    }
    this.refreshCards();
  }

  private refreshCards() {
    const coins = Save.get().coins;
    for (const card of this.cards) {
      const selected = this.mode.type === 'place' && this.mode.def.id === card.def.id;
      const price = card.def.id === 'casa' ? this.houseCost() : card.def.cost;
      if (card.def.id === 'casa' && !card.locked) card.cost.setText(String(price));
      const affordable = coins >= price;
      card.bg.clear();
      if (selected) {
        card.bg.fillStyle(0xffe58a, 1);
        card.bg.fillRoundedRect(-CARD_W / 2 - 4, -CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 14);
      }
      const top = card.locked ? 0x3a3a3a : affordable ? 0x7a5a3c : 0x5a4636;
      const bottom = card.locked ? 0x262626 : affordable ? 0x4a3524 : 0x3a2c22;
      drawPanel(card.bg, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, top, bottom, 12);
      if (!card.locked) {
        card.cost.setColor(affordable ? '#ffe58a' : '#ff7a6a');
        card.icon.setAlpha(affordable ? 1 : 0.55);
      }
    }
  }

  private refreshCoins() {
    this.coinsUI.set(Save.get().coins);
    this.refreshCards();
  }

  private toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.time.timeScale = this.speed;
    this.tweens.timeScale = this.speed;
    this.speedBtn.sub.setText(`x${this.speed}`);
  }

  private banner(title: string, subtitle = '') {
    const c = this.add.container(WORLD_W / 2, 250).setDepth(3000);
    const g = this.add.graphics();
    drawPanel(g, -260, -50, 520, subtitle ? 100 : 76, 0xc23b3b, 0x7e1f1f, 18, 0x20160f);
    const t = text(this, 0, subtitle ? -16 : -12, title, 40, '#ffe58a', { fontFamily: TITLE_FONT });
    c.add([g, t]);
    if (subtitle) c.add(text(this, 0, 26, subtitle, 20, '#fbeed3'));
    c.setScale(0.3).setAlpha(0);
    this.tweens.add({
      targets: c,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({ targets: c, alpha: 0, y: 220, delay: 1200, duration: 300, onComplete: () => c.destroy() });
      },
    });
  }

  // =================================================================
  // Preparação: posicionar unidades e construções
  // =================================================================
  private onCardClick(card: Card) {
    this.closePopup();
    this.clearSelection();
    const def = card.def;
    if (card.locked) {
      toast(this, `Libera no nível ${def.unlockLevel}`, '#ffd36b', 150);
      return;
    }
    if (this.state !== 'prep') return;
    if (this.mode.type === 'place' && this.mode.def.id === def.id) {
      this.setMode({ type: 'none' });
      return;
    }
    if (def.id === 'muros') {
      this.openBuildBar();
      return;
    }
    if (def.id === 'casa') {
      this.setMode({ type: 'none' });
      const cost = this.houseCost();
      if (!Save.spend(cost)) {
        toast(this, 'Moedas insuficientes', '#ff7a6a', 150);
        this.coinsUI.pulse();
        return;
      }
      this.upgradeHouse(false);
      this.refreshCoins();
      return;
    }
    if (Save.get().coins < def.cost) {
      toast(this, 'Moedas insuficientes', '#ff7a6a', 150);
      this.coinsUI.pulse();
      return;
    }
    if ((def.kind === 'melee' || def.kind === 'archer') && !this.hasRoom()) {
      this.warnNoRoom();
      return;
    }
    this.setMode({ type: 'place', def });
    if (def.kind === 'archer') toast(this, 'Toque num círculo do muro ou no chão', '#ffffff', 150);
  }

  // ---------- casa (uma só; cada melhoria = +3 soldados) ----------
  private houseCost() {
    // sobe pouco a cada melhoria e para em 90
    return Math.min(90, 50 + 10 * (this.houseLevel - 1));
  }

  private houseScale() {
    return (1 + 0.07 * (this.houseLevel - 1)) / R;
  }

  /** Cria a casa (nível 1) ou melhora a mesma casa: ela brilha e cresce um pouco. */
  private upgradeHouse(instant: boolean) {
    const p = MAP.houseSlots[0];
    this.houseLevel++;
    if (!this.houseImg) {
      this.houseImg = this.add.image(p.x, p.y + 18, 'house').setOrigin(0.5, 40 / HOUSE.h).setDepth(p.y + 18);
      this.houseLvlText = text(this, p.x + 20, p.y - 18, '', 13, '#ffe58a').setDepth(p.y + 19);
    }
    const h = this.houseImg;
    this.houseLvlText?.setText(this.houseLevel > 1 ? tr(`Nv ${this.houseLevel}`) : '');
    if (instant) {
      h.setScale(this.houseScale());
    } else {
      // brilho + cresce um pouquinho
      h.setTintFill(0xfff3c0);
      this.time.delayedCall(140, () => h.clearTint());
      this.tweens.add({ targets: h, scale: this.houseScale() * 1.25, duration: 160, yoyo: true, onComplete: () => h.setScale(this.houseScale()) });
      this.sparks.explode(18, p.x, p.y);
      Sound.play('coin');
      toast(this, `Casa melhorada! Agora cabem ${this.capacity()} soldados`, '#8ff06a', 150);
    }
    this.refreshCapacity();
    this.refreshCards();
  }

  private capacity() {
    return this.houseLevel * HOUSE_CAPACITY;
  }

  private soldierCount() {
    let n = this.playerUnits.filter((u) => u.alive).length;
    for (const h of this.archerHosts()) n += h.archers.filter((a) => a && a.alive).length;
    return n;
  }

  private hasRoom() {
    return this.soldierCount() < this.capacity();
  }

  private warnNoRoom() {
    toast(this, `Casa cheia! Melhore a casa (+${HOUSE_CAPACITY} soldados)`, '#ffd36b', 150);
    this.tweens.add({ targets: this.capText, scale: 1.3, duration: 120, yoyo: true, repeat: 1 });
  }

  private refreshCapacity() {
    if (!this.capText) return;
    const n = this.soldierCount();
    const cap = this.capacity();
    this.capText.setText(tr(`Soldados ${n}/${cap}`));
    this.capText.setColor(n >= cap ? '#ff9a7a' : '#fbeed3');
  }

  private setMode(mode: Mode) {
    this.mode = mode;
    this.markers?.destroy();
    this.markers = null;
    if (mode.type === 'place' && mode.def.kind === 'archer') {
      const c = this.add.container(0, 0).setDepth(1900);
      for (const s of this.freeArcherSpots()) {
        const m = this.add.container(s.x, s.y - 16);
        const g = this.add.graphics();
        g.fillStyle(0xffe58a, 0.3);
        g.fillCircle(0, 0, 15);
        g.lineStyle(2.5, 0xffe58a, 1);
        g.strokeCircle(0, 0, 15);
        m.add([g, text(this, 0, -1, '+', 24, '#ffe58a')]);
        m.setSize(36, 36);
        m.setInteractive({ useHandCursor: true });
        m.on('pointerdown', () => this.placeArcher(mode.def, s.host, s.index));
        this.tweens.add({ targets: m, scale: 1.15, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        c.add(m);
      }
      this.markers = c;
    }
    this.zoneGfx.setAlpha(mode.type === 'place' && mode.def.kind !== 'archer' ? 1.6 : 1);
    this.refreshCards();
  }

  private inZone(x: number, y: number) {
    const z = MAP.zone;
    return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
  }

  /** Dentro dos muros do castelo (fora do castelo interior). */
  private inCourtyard(x: number, y: number) {
    const c = COURTYARD;
    if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) return false;
    return Math.hypot(x - MAP.keep.x, (y - MAP.keep.y) * 1.3) > MAP.keep.r + 14;
  }

  private onGroundTap(x: number, y: number) {
    this.closePopup();
    // 0) mirando um poder
    if (this.abilityMode) {
      this.castAbility(x, y);
      return;
    }
    // 1) posicionando algo comprado
    if (this.mode.type === 'place') {
      const def = this.mode.def;
      // soldados e arqueiros: área clara ou dentro do castelo
      // (arqueiro também pode ficar no chão, não só em cima do muro)
      const isUnit = def.kind === 'melee' || def.kind === 'archer';
      // toda a nossa área: na frente da muralha e dentro dos muros do castelo
      const ok = this.inZone(x, y) || this.inCourtyard(x, y);
      if (!ok) {
        toast(this, isUnit ? 'Posicione na área clara, dentro do castelo ou num círculo do muro' : 'Construções só na área clara', '#ffd36b', 150);
        return;
      }
      if (isUnit) this.placeUnit(def, x, y);
      else this.placeStructure(def, x, y);
      return;
    }
    // 2) ordem para soldados selecionados
    if (this.selected.length) {
      this.orderSelected(x, y);
    }
  }

  private placeUnit(def: PlayerUnitDef, x: number, y: number) {
    if (!this.hasRoom()) {
      this.setMode({ type: 'none' });
      return this.warnNoRoom();
    }
    if (!Save.spend(def.cost)) return this.setMode({ type: 'none' });
    const u = this.spawnPlayerUnit(def, x, y);
    this.dust.explode(6, x, y);
    Sound.play('place');
    this.tweens.add({ targets: u.rig, y: { from: -24, to: 0 }, duration: 260, ease: 'Bounce.out' });
    this.refreshCapacity();
    this.afterPurchase(def);
    if (!this.hasRoom()) this.setMode({ type: 'none' });
  }

  private placeStructure(def: PlayerUnitDef, x: number, y: number) {
    const small = def.id === 'barricada';
    const minDist = small ? 22 : def.id === 'muro' ? 30 : 50;
    for (const o of this.obstacles()) {
      if (o.kind === 'keep' || o.kind === 'wall') continue;
      const extra = small || o.kind === 'barricade' || (def.id === 'muro' && o.kind === 'palisade') ? 0 : 20;
      if (Math.hypot(o.x - x, o.y - y) < minDist + extra) {
        toast(this, 'Muito perto de outra construção', '#ffd36b', 150);
        return;
      }
    }
    if (!Save.spend(def.cost)) return this.setMode({ type: 'none' });
    Sound.play('place');
    this.createStructure(def, x, y);
    this.dust.explode(14, x, y + 10);
    this.afterPurchase(def);
  }

  /** Cria muro / barricada / torre (sem cobrar). */
  private createStructure(def: PlayerUnitDef, x: number, y: number): Obstacle {
    const small = def.id === 'barricada';
    let o: Obstacle;
    if (small) {
      const b = new Barricade(this, def, x, y, this.level.dmgMul);
      this.barricades.push(b);
      o = b;
    } else if (def.id === 'muro') {
      const p = new Palisade(this, def, x, y, this.level.dmgMul);
      this.palisades.push(p);
      o = p;
    } else {
      const t = new DefenseTower(this, def, x, y);
      this.towers.push(t);
      o = t;
    }
    const image = (o as Palisade | DefenseTower | Barricade).image;
    image.setInteractive({ useHandCursor: true });
    image.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // posicionando algo / mirando um poder: o toque vale como toque no chão
      if (this.buildTool) return;
      if (this.mode.type === 'place' || this.abilityMode) return this.onGroundTap(ptr.worldX, ptr.worldY);
      if (this.state !== 'prep' || !o.alive) return;
      const archersValue = o.archers.reduce((sum, a) => sum + (a && !this.freebies.has(a) ? Math.floor(a.def.cost * SELL_REFUND) : 0), 0);
      const value = Math.floor(def.cost * SELL_REFUND * (o.hp / o.maxHp)) + archersValue;
      const above = small ? 50 : def.id === 'muro' ? PALISADE.halfH + 40 : TOWER.baseY + 10;
      this.openSellPopup(o.x, o.y - above, def.name, value, () => {
        o.archers.forEach((a) => a?.remove());
        o.archers = o.archers.map(() => null);
        o.destroy(false);
        this.refreshCapacity();
        this.refreshRepair();
      });
    });
    return o;
  }

  private afterPurchase(def: PlayerUnitDef) {
    this.refreshCoins();
    // continua no modo de posicionar enquanto houver moedas
    if (Save.get().coins < def.cost) this.setMode({ type: 'none' });
    else this.setMode(this.mode);
  }

  private freeArcherSpots() {
    const spots: { x: number; y: number; host: Obstacle; index: number }[] = [];
    const hosts: Obstacle[] = this.archerHosts();
    for (const h of hosts) {
      if (!h.alive) continue;
      h.archerSpots().forEach((p, i) => {
        if (!h.archers[i]) spots.push({ x: p.x, y: p.y, host: h, index: i });
      });
    }
    return spots;
  }

  private placeArcher(def: PlayerUnitDef, host: Obstacle, index: number) {
    if (host.archers[index] || !host.alive) return;
    if (!this.hasRoom()) {
      this.setMode({ type: 'none' });
      return this.warnNoRoom();
    }
    if (!Save.spend(def.cost)) return;
    this.createArcher(def, host, index);
    Sound.play('place');
    this.refreshCoins();
    this.refreshCapacity();
    if (Save.get().coins < def.cost || !this.hasRoom()) this.setMode({ type: 'none' });
    else this.setMode(this.mode);
  }

  private createArcher(def: PlayerUnitDef, host: Obstacle, index: number) {
    const p = host.archerSpots()[index];
    const a = new Archer(this, def, p.x, p.y, host, index);
    host.archers[index] = a;
    a.image.setInteractive({ useHandCursor: true });
    a.image.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.buildTool) return;
      if (this.mode.type === 'place' || this.abilityMode) return this.onGroundTap(ptr.worldX, ptr.worldY);
      if (this.state !== 'prep') return;
      const refund = this.freebies.has(a) ? 0 : Math.floor(def.cost * SELL_REFUND);
      this.openSellPopup(a.x, a.y - 60, def.name, refund, () => {
        host.archers[index] = null;
        a.remove();
        this.refreshCapacity();
      });
    });
    return a;
  }

  private spawnPlayerUnit(def: PlayerUnitDef, x: number, y: number) {
    const archer = def.kind === 'archer';
    const stats: Stats = {
      name: def.name,
      // arqueiro no chão: pouca vida, anda devagar, atira de longe
      hp: archer ? 60 : def.hp,
      damage: def.damage,
      attackRate: def.attackRate,
      range: archer ? def.range * 0.85 : def.range,
      speed: archer ? 45 : def.speed,
      cavalry: def.cavalry,
      bonusVsCavalry: def.bonusVsCavalry,
      splash: def.splash,
      ranged: archer,
    };
    const u = new Unit(this, 'player', stats, `u_${def.id}`, UNIT_SCALE, x, y, def.id);
    const hit = def.cavalry ? new Phaser.Geom.Rectangle(-26, -62, 52, 66) : new Phaser.Geom.Rectangle(-18, -52, 36, 56);
    u.container.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    u.container.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onUnitTap(u, def, ptr));
    this.playerUnits.push(u);
    return u;
  }

  private onUnitTap(u: Unit, def: PlayerUnitDef, ptr: Phaser.Input.Pointer) {
    if (!u.alive || this.state === 'end' || this.paused || this.buildTool) return;
    if (this.mode.type === 'place' || this.abilityMode) {
      // posicionando / mirando: o toque em cima de um soldado vale como toque no chão
      this.onGroundTap(ptr.worldX, ptr.worldY);
      return;
    }
    this.closePopup();
    if (this.selected.includes(u)) {
      this.clearSelection();
      return;
    }
    this.clearSelection();
    this.selected = [u];
    u.setSelected(true);
    if (this.state === 'prep') {
      const refund = this.freebies.has(u) ? 0 : Math.floor(def.cost * SELL_REFUND);
      this.openSellPopup(u.x, u.y - 70, def.name, refund, () => {
        this.playerUnits = this.playerUnits.filter((p) => p !== u);
        this.clearSelection();
        u.container.destroy();
        u.alive = false;
        u.gone = true;
        this.refreshCapacity();
      }, 'Toque no mapa para mover');
    }
  }

  private selectAll() {
    this.closePopup();
    this.clearSelection();
    this.selected = this.playerUnits.filter((u) => u.alive);
    this.selected.forEach((u) => u.setSelected(true));
    if (this.selected.length) toast(this, `${this.selected.length} soldados selecionados`, '#bfe3ff', 150);
  }

  private clearSelection() {
    this.selected.forEach((u) => u.setSelected(false));
    this.selected = [];
  }

  private orderSelected(x: number, y: number) {
    const b = MAP.bounds;
    const list = this.selected.filter((u) => u.alive);
    const cols = Math.ceil(Math.sqrt(list.length));
    list.forEach((u, i) => {
      // formação em grade em volta do ponto
      const ox = list.length > 1 ? ((i % cols) - (cols - 1) / 2) * 30 : 0;
      const oy = list.length > 1 ? (Math.floor(i / cols) - (Math.ceil(list.length / cols) - 1) / 2) * 26 : 0;
      let tx = Phaser.Math.Clamp(x + ox, b.x0 + 40, b.x1 - 10);
      let ty = Phaser.Math.Clamp(y + oy, b.y0 + 10, b.y1 - 10);
      if (this.state === 'prep') {
        if (!this.inCourtyard(tx, ty)) {
          const z = MAP.zone;
          tx = Phaser.Math.Clamp(tx, z.x0, z.x1);
          ty = Phaser.Math.Clamp(ty, z.y0, z.y1);
        }
        u.container.setPosition(tx, ty);
        u.post = { x: tx, y: ty };
      } else {
        u.orderMove(tx, ty);
      }
    });
    this.showOrderMarker(x, y);
    this.clearSelection();
  }

  private showOrderMarker(x: number, y: number) {
    this.orderMarker?.destroy();
    const g = this.add.graphics().setDepth(1600);
    g.lineStyle(3, 0xffe58a, 1);
    g.strokeEllipse(0, 0, 40, 16);
    g.setPosition(x, y);
    this.orderMarker = g;
    this.tweens.add({ targets: g, scale: 0.3, alpha: 0, duration: 600, onComplete: () => g.destroy() });
  }

  private openSellPopup(x: number, y: number, title: string, value: number, onSell: () => void, subtitle?: string) {
    this.closePopup();
    const h = subtitle ? 120 : 104;
    const c = this.add.container(Phaser.Math.Clamp(x, 110, WORLD_W - 110), Phaser.Math.Clamp(y, 140, 540)).setDepth(2600);
    const g = this.add.graphics();
    drawPanel(g, -95, -58, 190, h, 0x4a3524, 0x2a1d12, 14, 0xc99a4a);
    const t = text(this, 0, -36, title, 18, '#fbeed3');
    const b = button(this, 0, 10, 160, 46, `Vender +${value}`, 'gold', () => {
      Save.addCoins(value);
      onSell();
      this.refreshCoins();
      this.closePopup();
    }, 18);
    c.add([g, t, b]);
    if (subtitle) c.add(text(this, 0, 46, subtitle, 13, '#c9c2b0'));
    c.setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.out' });
    this.popup = c;
  }

  private closePopup() {
    this.popup?.destroy();
    this.popup = null;
  }

  // =================================================================
  // Batalha
  // =================================================================
  private startBattle() {
    this.closeBuildBar();
    this.setMode({ type: 'none' });
    this.closePopup();
    this.clearSelection();
    // guarda o estado montado na preparação (para "Tentar de novo")
    if (!this.tutorial) Campaign.saveRetry(this.snapshot(this.level.number));
    this.repairBtn?.destroy();
    this.repairBtn = null;
    this.state = 'battle';
    this.battleTime = 0;
    this.prepLayer.setVisible(false);
    this.cardsLayer.setVisible(false);
    this.zoneGfx.setVisible(false);
    this.battleLayer.setVisible(true);
    Sound.music('battle');
    this.spawnQueue = [];
    // Inimigos entram em FILEIRAS organizadas: cada grupo vira um bloco
    // de linhas (3 lado a lado), todas marchando na mesma velocidade.
    const ROW_GAP = 34; // distância entre fileiras (px)
    const COL_GAP = 26; // distância lado a lado (px)
    const rowOffsets = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * COL_GAP);
    this.level.waves.forEach((wave, w) => {
      let t = this.waveStarts[w] + 0.4;
      if (wave.boss) {
        // onda do chefe: guardas na frente, chefe no meio cercado, guardas atrás
        const escortDef = getEnemy(wave.boss.escort);
        const bossDef = getEnemy(wave.boss.id);
        const speed = Math.min(escortDef.speed, bossDef.speed);
        const lane = MAP.lanes[1];
        let left = wave.boss.escorts;
        const rows: string[][] = [];
        const front = Math.min(3, left);
        rows.push(Array(front).fill(escortDef.id));
        left -= front;
        const flank = Math.min(2, left);
        left -= flank;
        rows.push(flank === 2 ? [escortDef.id, bossDef.id, escortDef.id] : flank === 1 ? [escortDef.id, bossDef.id] : [bossDef.id]);
        while (left > 0) {
          const k = Math.min(3, left);
          rows.push(Array(k).fill(escortDef.id));
          left -= k;
        }
        rows.forEach((row, r) => {
          const offs = rowOffsets(row.length).map((o) => o * (row.includes(bossDef.id) ? 1.5 : 1));
          row.forEach((id, i) => this.spawnQueue.push({ enemy: id, at: t, wave: w, lane, dy: offs[i], speed }));
          t += (ROW_GAP * (r === 0 || row.includes(bossDef.id) ? 1.5 : 1)) / speed;
        });
        return;
      }
      for (const g of wave.groups) {
        const def = getEnemy(g.enemy);
        const perRow = def.siege ? 1 : def.cavalry ? 2 : 3;
        const lane = Phaser.Utils.Array.GetRandom(MAP.lanes);
        let left = g.count;
        while (left > 0) {
          const k = Math.min(perRow, left);
          rowOffsets(k).forEach((dy) => this.spawnQueue.push({ enemy: g.enemy, at: t, wave: w, lane, dy, speed: def.speed }));
          left -= k;
          t += (ROW_GAP * (def.siege ? 2.5 : def.cavalry ? 1.6 : 1)) / def.speed;
        }
        t += 2;
      }
    });
    this.spawnQueue.sort((a, b) => a.at - b.at);
  }

  private announceWave(w: number) {
    const wave = this.level.waves[w];
    if (wave.boss) {
      this.banner('ONDA DO CHEFE!', `${bossName(this.level.number)} vem com sua guarda`);
      return;
    }
    this.banner(`Onda ${w + 1}`, w === this.level.waves.length - 2 ? 'Depois desta vem o chefe!' : '');
  }

  private spawnEnemy(id: string, lane: number, dy: number, marchSpeed: number) {
    const def = getEnemy(id);
    const stats: Stats = {
      name: def.name,
      hp: Math.round(def.hp * this.level.hpMul),
      damage: def.damage * this.level.dmgMul,
      attackRate: def.attackRate,
      range: def.range,
      speed: def.speed,
      cavalry: def.cavalry,
      splash: def.splash,
      ranged: def.ranged,
      siege: def.siege,
      reward: Math.round(def.reward * this.level.rewardMul),
      boss: def.boss,
    };
    const y = lane + dy;
    const scale = UNIT_SCALE * (def.scale ?? 1);
    let tex = `e_${id}`;
    if (def.boss) {
      // cada chefe tem visual e arma próprios (loiro, arqueira, lanceiro, cavaleiro...)
      stats.name = bossName(this.level.number);
      const look = bossLook(this.level.number);
      tex = look.tex;
      if (look.ranged) {
        stats.ranged = true;
        stats.range = 175;
        stats.splash = undefined;
      }
      if (look.cavalry) {
        stats.cavalry = true;
        stats.speed = Math.max(stats.speed, 45);
      }
    }
    const u = new Unit(this, 'enemy', stats, tex, scale, -30, y, id);
    // marcha em formação: todos do bloco andam paralelos, na mesma velocidade
    const gx = MAP.wallX - 120;
    const gy = MAP.gate.y;
    const d = Math.hypot(gx + 30, gy - lane);
    u.march = { dx: (gx + 30) / d, dy: (gy - lane) / d, speed: marchSpeed };
    this.enemyUnits.push(u);
    if (def.boss) {
      // nome do herói em cima do chefe
      const label = text(this, 0, -u.body.displayHeight - 22, stats.name, 14, '#ffd36b');
      u.container.add(label);
      this.cameras.main.shake(400, 0.008);
      Sound.play('horn');
      this.banner('O CHEFE CHEGOU!', stats.name);
      this.time.delayedCall(1800, () => this.taunt(u));
    }
  }

  /** Balão de fala do chefe com frases de desafio (repete de tempos em tempos). */
  private taunt(boss: Unit) {
    if (!boss.alive || this.state !== 'battle') return;
    const line = tr(Phaser.Utils.Array.GetRandom(TAUNTS));
    const y = -boss.body.displayHeight - 48;
    const t = text(this, 0, y, line, 15, '#2a1a10', { strokeThickness: 0, wordWrap: { width: 190 } });
    const w = Math.max(90, t.width + 22);
    const h = t.height + 14;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.95);
    g.lineStyle(2, 0x2a1a10, 1);
    g.fillRoundedRect(-w / 2, y - h / 2, w, h, 10);
    g.strokeRoundedRect(-w / 2, y - h / 2, w, h, 10);
    g.fillTriangle(-8, y + h / 2 - 1, 8, y + h / 2 - 1, 0, y + h / 2 + 10);
    const bubble = this.add.container(0, 0, [g, t]);
    bubble.setScale(0.3);
    boss.container.add(bubble);
    this.tweens.add({ targets: bubble, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: bubble, alpha: 0, delay: 2600, duration: 300, onComplete: () => bubble.destroy() });
    this.time.delayedCall(Phaser.Math.Between(6500, 9500), () => this.taunt(boss));
  }

  private obstacles(): Obstacle[] {
    const list: Obstacle[] = [];
    for (const b of this.barricades) if (b.alive) list.push(b);
    for (const t of this.tiles.values()) if (t.alive) list.push(t);
    for (const p of this.palisades) if (p.alive) list.push(p);
    for (const t of this.towers) if (t.alive) list.push(t);
    for (const s of this.wallSegments) if (s.alive) list.push(s);
    if (this.keep.alive) list.push(this.keep);
    return list;
  }

  obstacleAt(x: number, y: number, r: number): Obstacle | null {
    for (const o of this.obstacles()) if (o.blocks(x, y, r)) return o;
    return null;
  }

  /** Nossos soldados passam pela barricada e pelas portas, mas não pelos muros nem pela torre. */
  playerObstacleAt(x: number, y: number, r: number): Obstacle | null {
    // nossos soldados também não atravessam muros nem barricadas (só passam pelas portas)
    for (const p of this.palisades) if (p.alive && p.blocks(x, y, r * 0.9)) return p;
    for (const t of this.towers) if (t.alive && t.blocks(x, y, r * 0.9)) return t;
    for (const b of this.barricades) if (b.alive && b.blocks(x, y, r * 0.9)) return b;
    for (const t of this.tiles.values()) if (t.alive && !t.door && t.blocks(x, y, r * 0.85)) return t;
    for (const s of this.wallSegments) if (s.alive && !s.def.gate && s.blocks(x, y, r * 0.85)) return s;
    return null;
  }

  findPath(fx: number, fy: number, tx: number, ty: number) {
    return this.nav.findPath(fx, fy, tx, ty);
  }

  findEnemyPath(fx: number, fy: number, tx: number, ty: number) {
    return this.navEnemy.findPath(fx, fy, tx, ty);
  }

  private invalidateNav() {
    this.nav?.invalidate();
    this.navEnemy?.invalidate();
  }

  clearLine(fx: number, fy: number, tx: number, ty: number) {
    return this.nav.clearLine(fx, fy, tx, ty);
  }

  /** Onde dá para pôr arqueiro em cima: muralha, muro de madeira antigo e peças de muro. */
  private archerHosts(): Obstacle[] {
    const list: Obstacle[] = [...this.wallSegments, ...this.palisades];
    for (const t of this.tiles.values()) if (t.alive && !t.door) list.push(t);
    return list;
  }

  nearestObstacle(x: number, y: number, range: number): Obstacle | null {
    let best: Obstacle | null = null;
    let bestD = range;
    for (const o of this.obstacles()) {
      const d = o.edgeDist(x, y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  fireProjectile(fromX: number, fromY: number, target: Target, key: string, damage: number, arc: number, speed: number, team: Team, splash = 0, source?: Unit) {
    // soldado nosso atingido por inimigo que atira de longe: vai se defender sozinho
    const provoke = () => {
      if (team === 'enemy' && source && target instanceof Unit && target.alive) target.provoke(source);
    };
    const proj = this.add.image(fromX, fromY, key).setScale(1 / R).setDepth(1600);
    if (team === 'enemy' && key !== 'stone') proj.setTint(0xffb0a0);
    let tx = target.x;
    let ty = target.aimY;
    let groundY = target.y;
    const dist = Math.hypot(tx - fromX, ty - fromY);
    const state = { t: 0 };
    let px = fromX;
    let py = fromY;
    this.tweens.add({
      targets: state,
      t: 1,
      duration: Math.max(150, (dist / speed) * 1000),
      onUpdate: () => {
        if (target.alive) {
          tx = target.x;
          ty = target.aimY;
          groundY = target.y;
        }
        const t = state.t;
        const x = fromX + (tx - fromX) * t;
        const y = fromY + (ty - fromY) * t - arc * 4 * t * (1 - t);
        proj.setPosition(x, y);
        proj.setRotation(splash ? proj.rotation + 0.15 : Math.atan2(y - py, x - px));
        px = x;
        py = y;
      },
      onComplete: () => {
        proj.destroy();
        if (splash) {
          // pedra de catapulta: explode no chão e acerta tudo em volta
          Sound.play('boom', 0.8);
          this.bigFx(tx, groundY);
          this.cameras.main.shake(120, 0.004);
          if (target.alive) target.takeDamage(damage);
          this.damageArea(team, tx, groundY, splash, damage * 0.5, target);
          return;
        }
        if (!target.alive) {
          this.stuckArrow(tx, groundY, key, px < tx ? 1 : -1);
          return;
        }
        target.takeDamage(damage);
        target.knock?.(tx - fromX, ty - fromY, 25 + damage);
        provoke();
        this.hitFx(tx, ty, damage, team);
      },
    });
  }

  private stuckArrow(x: number, y: number, key: string, dir: number) {
    const a = this.add.image(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-4, 8), key).setScale(1 / R).setDepth(y - 1);
    a.setOrigin(0.9, 0.5);
    a.setRotation(dir > 0 ? 0.9 : Math.PI - 0.9);
    this.tweens.add({ targets: a, alpha: 0, delay: 2500, duration: 600, onComplete: () => a.destroy() });
  }

  hitFx(x: number, y: number, dmg: number, team: Team, heavy = false) {
    this.sparks.explode(heavy ? 9 : 4, x, y);
    if (heavy) {
      this.dust.explode(4, x, y + 20);
      if (this.time.now - this.lastShake > 250) {
        this.cameras.main.shake(70, 0.0025);
        this.lastShake = this.time.now;
      }
    }
    if (team !== 'player') return;
    const t = text(this, x + Phaser.Math.Between(-8, 8), y - 10, String(Math.round(dmg)), 15, '#fff3c4').setDepth(1750);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 650, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  bigFx(x: number, y: number) {
    this.dust.explode(22, x, y);
    this.sparks.explode(8, x, y);
  }

  onUnitDied(u: Unit) {
    this.dust.explode(5, u.x, u.y);
    this.corpses.push(u);
    this.selected = this.selected.filter((s) => s !== u);
    if (u.team !== 'enemy') return;
    const reward = u.stats.reward ?? 0;
    this.coinsEarned += reward;
    Save.addCoins(reward);
    this.flyCoin(u.x, u.aimY, reward);
    if (u.stats.boss) {
      this.bigFx(u.x, u.y - 20);
      this.cameras.main.shake(300, 0.01);
    }
  }

  private flyCoin(x: number, y: number, amount: number) {
    const coin = img(this, x, y, 'coin', 1).setDepth(2100);
    const label = text(this, x, y - 22, `+${amount}`, 18, '#ffe58a').setDepth(2100);
    this.tweens.add({ targets: label, y: y - 55, alpha: 0, duration: 800, onComplete: () => label.destroy() });
    this.tweens.add({
      targets: coin,
      x: this.coinsUI.container.x + 8,
      y: this.coinsUI.container.y,
      duration: 650,
      ease: 'Cubic.in',
      onComplete: () => {
        coin.destroy();
        Sound.play('coin', 0.6);
        this.coinsUI.pulse();
        this.refreshCoins();
      },
    });
  }

  onObstacleDestroyed(o: Obstacle) {
    if (o instanceof WallSegment && !this.restoring && this.state === 'battle') {
      toast(this, 'A muralha caiu! Defenda o castelo!', '#ff7a6a', 150);
    }
    if (o instanceof WallTile) {
      this.tiles.delete(`${o.gx},${o.gy}`);
      this.refreshTileLooks(o.gx, o.gy);
    }
    this.invalidateNav();
    if (this.mode.type === 'place') this.setMode(this.mode);
  }

  // =================================================================
  // Construção de muros e portas na grade (arrastar o dedo para desenhar)
  // =================================================================
  private openBuildBar() {
    this.closePopup();
    this.clearSelection();
    this.setMode({ type: 'none' });
    this.cardsLayer.setVisible(false);
    this.buildLayer?.destroy();
    const layer = this.add.container(0, 0).setDepth(1960);
    const bar = this.add.graphics();
    bar.fillStyle(0x20160f, 1);
    bar.fillRect(0, BAR_TOP - 4, WORLD_W, WORLD_H - BAR_TOP + 4);
    bar.fillStyle(0x4a3524, 1);
    bar.fillRect(0, BAR_TOP, WORLD_W, WORLD_H - BAR_TOP);
    layer.add(bar);
    layer.add(text(this, 150, 676, 'Escolha e arraste\no dedo no mapa', 17, '#fbeed3'));
    const ids = ['mmadeira', 'mpedra', 'pmadeira', 'ppedra'];
    const btns: { id: string; btn: RoundButton }[] = [];
    const select = (tool: PlayerUnitDef | 'erase') => {
      this.buildTool = tool;
      for (const b of btns) b.btn.setScale(b.id === (tool === 'erase' ? 'erase' : tool.id) ? 1.15 : 1);
      toast(this, tool === 'erase' ? 'Arraste para apagar (devolve metade)' : tr(`${tool.name}: ${tool.cost} moedas cada`).replace(tool.name, tr(tool.name)), '#ffffff', 150);
    };
    ids.forEach((id, i) => {
      const def = PLAYER_UNITS.find((u) => u.id === id)!;
      const x = 360 + i * 130;
      const btn = roundButton(this, x, 668, 30, { icon: `tile_${id}`, iconScale: 1.1 }, 'brown', () => select(def));
      btn.sub.setText(`${def.cost}`).setColor('#ffe58a');
      btn.sub.setY(38);
      layer.add(btn);
      btns.push({ id, btn });
    });
    const eraser = roundButton(this, 900, 668, 30, { icon: 'icon_eraser', iconScale: 1.2 }, 'gray', () => select('erase'));
    eraser.sub.setText('apagar').setY(38);
    layer.add(eraser);
    btns.push({ id: 'erase', btn: eraser });
    const done = button(this, 1150, 672, 170, 54, 'Pronto ✓', 'green', () => this.closeBuildBar(), 22);
    layer.add(done);
    this.buildLayer = layer;
    select(PLAYER_UNITS.find((u) => u.id === 'mmadeira')!);
  }

  private closeBuildBar() {
    this.buildTool = null;
    this.buildLayer?.destroy();
    this.buildLayer = null;
    if (this.state === 'prep') this.cardsLayer.setVisible(true);
  }

  /** Pinta (ou apaga) uma peça no quadrado da grade embaixo do dedo. */
  private paintAt(x: number, y: number) {
    const tool = this.buildTool;
    if (!tool || this.state !== 'prep' || y > BAR_TOP - 6) return;
    const { gx, gy } = cellOf(x, y);
    const key = `${gx},${gy}`;
    if (key === this.lastPaint) return;
    this.lastPaint = key;
    const existing = this.tiles.get(key);
    if (tool === 'erase') {
      if (!existing) return;
      Save.addCoins(Math.floor(existing.def.cost * SELL_REFUND));
      existing.remove();
      this.tiles.delete(key);
      this.refreshTileLooks(gx, gy);
      this.invalidateNav();
      this.dust.explode(5, existing.x, existing.y);
      this.refreshCoins();
      this.refreshCapacity();
      return;
    }
    const c = cellCenter(gx, gy);
    if (existing) return;
    if (!this.inZone(c.x, c.y) && !this.inCourtyard(c.x, c.y)) return;
    // não em cima de torre, barricada ou soldado parado
    for (const o of [...this.towers, ...this.barricades, ...this.palisades]) {
      if (o.alive && o.edgeDist(c.x, c.y) < TILE / 2) return;
    }
    if (!Save.spend(tool.cost)) {
      toast(this, 'Moedas insuficientes', '#ff7a6a', 150);
      this.coinsUI.pulse();
      return;
    }
    this.createTile(tool, gx, gy);
    Sound.play('place', 0.6);
    this.refreshCoins();
  }

  private createTile(def: PlayerUnitDef, gx: number, gy: number): WallTile {
    const t = new WallTile(this, def, gx, gy, this.level.dmgMul);
    this.tiles.set(`${gx},${gy}`, t);
    this.invalidateNav();
    // soldado em cima do lugar do muro: empurra para o lado
    for (const u of this.playerUnits) {
      if (!t.door && u.alive && t.edgeDist(u.x, u.y) < 6) {
        u.container.y += u.y < t.y ? -TILE : TILE;
        u.post = { x: u.x, y: u.y };
      }
    }
    this.refreshTileLooks(gx, gy);
    return t;
  }

  /** As peças vizinhas se juntam: recalcula o visual da peça e das 4 ao redor. */
  private refreshTileLooks(gx: number, gy: number) {
    const at = (x: number, y: number) => {
      const t = this.tiles.get(`${x},${y}`);
      return t && t.alive ? t : null;
    };
    for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const t = at(gx + dx, gy + dy);
      if (!t) continue;
      const mask = (at(t.gx, t.gy - 1) ? 1 : 0) | (at(t.gx + 1, t.gy) ? 2 : 0) | (at(t.gx, t.gy + 1) ? 4 : 0) | (at(t.gx - 1, t.gy) ? 8 : 0);
      t.setLook(mask);
      // arqueiro em cima acompanha a nova altura
      t.archers.forEach((a, i) => {
        if (!a) return;
        const p = t.archerSpots()[i];
        a.image.setPosition(p.x, p.y);
      });
    }
  }

  onKeepDamaged() {
    this.drawCastleBar();
    if (this.time.now - this.lastShake > 400) {
      this.cameras.main.shake(120, 0.004);
      this.lastShake = this.time.now;
    }
    if (!this.keep.alive && this.state !== 'end') this.defeat();
  }

  damageArea(team: Team, x: number, y: number, radius: number, dmg: number, except?: Target) {
    const list = team === 'player' ? this.enemyUnits : this.playerUnits;
    for (const u of list) {
      if (u === except || !u.alive) continue;
      if (Math.hypot(u.x - x, u.y - y) <= radius + u.radius) {
        u.takeDamage(dmg);
        u.knock(u.x - x, u.y - y, 120 + dmg * 2);
      }
    }
    if (team === 'enemy') {
      for (const o of this.obstacles()) {
        if (o !== except && o.edgeDist(x, y) <= radius) o.takeDamage(dmg);
      }
    }
  }

  // =================================================================
  // Loop
  // =================================================================
  update(_time: number, deltaMs: number) {
    const rawDt = Math.min(deltaMs / 1000, 0.05);
    for (const c of this.cloudShadows) {
      c.x += c.getData('speed') * rawDt;
      if (c.x > WORLD_W + 200) c.x = -200;
    }
    if (this.paused) return;
    const dt = rawDt * this.speed;

    this.corpses = this.corpses.filter((c) => !c.updateCorpse(dt));
    if (this.state === 'end') return;

    if (this.state === 'battle') {
      this.battleTime += dt;
      while (this.wavesStarted < this.waveStarts.length && this.waveStarts[this.wavesStarted] <= this.battleTime) {
        this.announceWave(this.wavesStarted);
        this.wavesStarted++;
      }
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.battleTime) {
        const s = this.spawnQueue.shift()!;
        this.spawnEnemy(s.enemy, s.lane, s.dy, s.speed);
      }
      this.updateWaveText();
    }

    for (const u of this.playerUnits) u.update(dt);
    for (const u of this.enemyUnits) u.update(dt);
    this.separate(dt);
    for (const t of this.towers) t.update(dt);
    if (this.state === 'battle') this.updateAbilities(dt);
    // os custos dos muros mudam com o dano: atualiza a grade dos inimigos de vez em quando
    this.navEnemyAge += dt;
    if (this.navEnemyAge > 2) {
      this.navEnemyAge = 0;
      this.navEnemy.invalidate();
    }
    if (this.tutorial) this.updateTutorial();
    for (const h of this.archerHosts()) for (const a of h.archers) a?.update(dt);

    // portão abre sozinho quando um soldado nosso chega perto
    const near = this.playerUnits.some(
      (u) => u.alive && Math.abs(u.x - MAP.wallX) < 46 && Math.abs(u.y - MAP.gate.y) < MAP.gateHalf + 10,
    );
    for (const s of this.wallSegments) if (s.def.gate) s.setOpen(near);
    // portas construídas: abrem quando um soldado nosso chega perto
    for (const t of this.tiles.values()) {
      if (!t.door || !t.alive) continue;
      t.setOpen(this.playerUnits.some((u) => u.alive && Math.abs(u.x - t.x) < 30 && Math.abs(u.y - t.y) < 30));
    }
    if (this.state === 'battle') this.refreshCapacity();

    this.playerUnits = this.playerUnits.filter((u) => u.alive);
    this.enemyUnits = this.enemyUnits.filter((u) => u.alive);
    this.palisades = this.palisades.filter((p) => p.alive);
    this.barricades = this.barricades.filter((b) => b.alive);
    this.towers = this.towers.filter((t) => t.alive);

    if (
      this.state === 'battle' &&
      this.wavesStarted >= this.waveStarts.length &&
      this.spawnQueue.length === 0 &&
      this.enemyUnits.length === 0
    ) {
      this.victory();
    }
  }

  /** Física simples de separação: ninguém fica dentro do outro. */
  private separate(dt: number) {
    const all = [...this.playerUnits, ...this.enemyUnits];
    const k = Math.min(1, dt * 10);
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.4;
        const min = (a.radius + b.radius) * (a.team === b.team ? 0.9 : 0.75);
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const push = (min - d) * 0.5 * k;
        const nx = d === 0.01 ? Math.random() - 0.5 : dx / d;
        const ny = d === 0.01 ? Math.random() - 0.5 : dy / d;
        const wa = a.stats.boss || a.stats.siege ? 0.2 : 1;
        const wb = b.stats.boss || b.stats.siege ? 0.2 : 1;
        a.nudge(-nx * push * wa, -ny * push * wa * 0.7);
        b.nudge(nx * push * wb, ny * push * wb * 0.7);
      }
    }
  }

  // =================================================================
  // Fim de partida
  // =================================================================
  private endBattle() {
    this.state = 'end';
    this.closePopup();
    this.clearSelection();
    this.setMode({ type: 'none' });
    this.battleLayer.setVisible(false);
    this.callBtn?.destroy();
    this.callBtn = null;
    this.cancelAbility();
    this.speed = 1;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    Sound.music(null);
  }

  private victory() {
    this.endBattle();
    Sound.play('victory');
    const ratio = this.keep.hp / this.keep.maxHp;
    const wallsUp = this.wallSegments.filter((s) => s.alive).length;
    const stars = ratio >= 0.95 && wallsUp === this.wallSegments.length ? 3 : ratio >= 0.5 ? 2 : 1;
    const bonus = this.level.completionBonus;
    Save.addCoins(bonus);
    this.coinsEarned += bonus;
    this.victoryBonus = bonus;
    let unlocked: PlayerUnitDef[] = [];
    if (this.tutorial) {
      // Fase 0 concluída: não conta estrelas nem leva nada para a Fase 1
      Save.get().tutorialDone = true;
      Save.persist();
      this.tutLayer?.destroy();
      this.time.delayedCall(300, () => toast(this, 'Tutorial completo! Agora vá para a Fase 1.', '#8ff06a', 150));
    } else {
      const before = Save.playerLevel();
      Save.completeLevel(this.level.number, stars);
      const after = Save.playerLevel();
      unlocked = PLAYER_UNITS.filter((u) => u.unlockLevel > before && u.unlockLevel <= after);
      // quem sobreviveu (soldados, casas, muros) vai junto para a próxima fase da era
      if (this.level.number < TOTAL_LEVELS) Campaign.saveCarry(this.snapshot(this.level.number + 1));
    }
    this.refreshCoins();
    for (const u of this.playerUnits) {
      this.tweens.add({ targets: u.rig, y: -14, duration: 200, yoyo: true, repeat: 3, delay: Math.random() * 200 });
    }
    this.time.delayedCall(700, () => this.showResult(true, stars, unlocked));
  }

  private defeat() {
    this.endBattle();
    Sound.play('crumble');
    this.time.delayedCall(500, () => Sound.play('defeat'));
    this.cameras.main.shake(500, 0.012);
    // castelo interior desaba e vira ruína
    this.bigFx(MAP.keep.x, MAP.keep.y);
    this.time.delayedCall(150, () => this.bigFx(MAP.keep.x - 15, MAP.keep.y - 20));
    this.time.delayedCall(300, () => this.bigFx(MAP.keep.x + 15, MAP.keep.y - 10));
    this.tweens.add({
      targets: this.keepImg,
      x: this.keepImg.x + 3,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.keepImg.setTexture('keep_ruin');
        this.dust.explode(30, MAP.keep.x, MAP.keep.y);
      },
    });
    this.time.delayedCall(900, () => this.showResult(false, 0, []));
  }

  private showResult(won: boolean, stars: number, unlocked: PlayerUnitDef[]) {
    const h = unlocked.length ? 430 : 360;
    const m = modal(this, 560, h, won ? 'VITÓRIA!' : 'DERROTA');
    const top = -h / 2;
    let y = top + 70;
    if (won) {
      for (let i = 0; i < 3; i++) {
        const s = img(this, (i - 1) * 80, y + (i === 1 ? -8 : 6), i < stars ? 'star' : 'star_empty', i === 1 ? 2.4 : 2);
        s.setScale(0);
        m.box.add(s);
        this.tweens.add({ targets: s, scale: (i === 1 ? 2.4 : 2) / R, duration: 300, delay: 250 + i * 220, ease: 'Back.out' });
      }
      y += 70;
    } else {
      m.box.add(text(this, 0, y, 'O castelo caiu...', 24, '#fbeed3'));
      y += 50;
    }

    const battleCoins = this.coinsEarned - this.victoryBonus;
    if (won) {
      m.box.add(text(this, 0, y - 6, `Batalha: ${battleCoins}   +   Bônus de vitória: ${this.victoryBonus}`, 17, '#c9c2b0'));
      y += 22;
    } else {
      m.box.add(text(this, 0, y - 6, 'Suas moedas ficam guardadas mesmo na derrota', 17, '#c9c2b0'));
      y += 22;
    }
    m.box.add(text(this, -40, y, 'Moedas ganhas:', 22, '#fbeed3'));
    m.box.add(img(this, 80, y, 'coin', 1.2));
    const amount = text(this, 130, y, String(this.coinsEarned), 26, '#ffe58a');
    m.box.add(amount);
    y += 40;

    if (unlocked.length) {
      m.box.add(text(this, 0, y, tr(`Nova unidade liberada: ${unlocked.map((u) => u.name).join(', ')}!`).replace(unlocked.map((u) => u.name).join(', '), unlocked.map((u) => tr(u.name)).join(', ')), 20, '#8ff06a'));
      y += 50;
    }

    let watched = false;
    const doubleBtn = button(this, 0, y + 10, 340, 58, 'Assistir vídeo: 2x moedas', 'gold', async () => {
      if (watched || this.coinsEarned <= 0) return;
      const ok = await Ads.showRewarded();
      if (!ok) return;
      watched = true;
      Save.addCoins(this.coinsEarned);
      this.coinsEarned *= 2;
      amount.setText(String(this.coinsEarned));
      this.tweens.add({ targets: amount, scale: 1.4, duration: 150, yoyo: true });
      doubleBtn.setEnabled(false);
      doubleBtn.label.setText(tr('Moedas dobradas!'));
      this.refreshCoins();
    }, 20);
    if (this.coinsEarned <= 0) doubleBtn.setEnabled(false);
    m.box.add(doubleBtn);
    y += 84;

    const leave = async (next: { scene: string; data?: object }) => {
      if (!this.tutorial) await Ads.afterBattle(watched); // sem anúncio no tutorial
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next.scene, next.data));
    };
    const nextLabel = won ? (this.tutorial ? 'Fase 1' : this.level.number < TOTAL_LEVELS ? 'Próxima fase' : 'Fim!') : 'Tentar de novo';
    const nextLevel = won ? Math.min(this.level.number + 1, TOTAL_LEVELS) : this.level.number;
    m.box.add(button(this, -120, y, 200, 56, 'Mapa', 'brown', () => leave({ scene: 'Career' }), 22));
    m.box.add(button(this, 120, y, 200, 56, nextLabel, 'green', () => leave({ scene: 'Game', data: { level: nextLevel } }), 22));
  }

  private openPause() {
    if (this.state === 'end' || this.paused) return;
    this.paused = true;
    // pausa só as animações que já existem (a janela de pausa precisa animar)
    const frozen = this.tweens.getTweens().filter((t) => t.isPlaying());
    frozen.forEach((t) => t.pause());
    this.time.paused = true;
    const m = modal(this, 420, 470, 'PAUSA');
    const resume = () => {
      this.paused = false;
      frozen.forEach((t) => t.resume());
      this.time.paused = false;
    };
    m.box.add(button(this, 0, -140, 280, 56, 'Continuar', 'green', () => { m.root.destroy(); resume(); }));
    m.box.add(button(this, 0, -74, 280, 56, 'Reiniciar fase', 'blue', () => {
      resume();
      this.scene.restart({ level: this.level.number });
    }));
    m.box.add(button(this, 0, -8, 280, 56, 'Sair para o mapa', 'red', () => {
      resume();
      Sound.music(null);
      this.scene.start('Career');
    }));
    const musicBtn = button(this, -72, 70, 136, 52, Sound.musicOn ? 'Música ✓' : 'Música ✗', 'brown', () => {
      Sound.setMusicOn(!Sound.musicOn);
      musicBtn.label.setText(tr(Sound.musicOn ? 'Música ✓' : 'Música ✗'));
    }, 19);
    const soundBtn = button(this, 72, 70, 136, 52, Sound.enabled ? 'Efeitos ✓' : 'Efeitos ✗', 'brown', () => {
      Sound.setEnabled(!Sound.enabled);
      soundBtn.label.setText(tr(Sound.enabled ? 'Efeitos ✓' : 'Efeitos ✗'));
    }, 19);
    m.box.add([musicBtn, soundBtn]);
  }
}
