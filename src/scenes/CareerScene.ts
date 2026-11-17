import Phaser from 'phaser';
import { R, WORLD_W, WORLD_H } from '../art/art';
import { Save } from '../systems/save';
import { TOTAL_LEVELS } from '../data/levels';
import { Sound } from '../systems/audio';
import { text, button, img, toast, coinCounter, drawPanel, TITLE_FONT, setTr } from '../ui/ui';

const PER_PAGE = 20;
const COLS = 5;

export class CareerScene extends Phaser.Scene {
  private page = 0;
  private grid: Phaser.GameObjects.Container | null = null;
  private pageText!: Phaser.GameObjects.Text;

  constructor() {
    super('Career');
  }

  create() {
    this.add.image(0, 0, 'bg').setOrigin(0).setScale(1 / R);
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0e1620, 0.45);

    text(this, WORLD_W / 2, 50, 'CARREIRA', 46, '#ffe58a', { fontFamily: TITLE_FONT });
    button(this, 90, 50, 130, 52, 'Voltar', 'brown', () => this.go('Menu'), 20);
    coinCounter(this, WORLD_W - 170, 50, Save.get().coins);
    // Fase 0: tutorial "como jogar" (sempre disponível)
    button(this, 270, 50, 160, 46, 'TUTORIAL', 'green', () => this.go('Game', { level: 0 }), 18);
    button(this, WORLD_W - 330, 50, 120, 46, 'Loja', 'gold', () => this.go('Shop', { back: 'Career' }), 20);

    const max = Save.playerLevel();
    this.page = Math.floor((max - 1) / PER_PAGE);

    button(this, 70, WORLD_H / 2 + 20, 70, 90, '<', 'blue', () => this.turn(-1), 40);
    button(this, WORLD_W - 70, WORLD_H / 2 + 20, 70, 90, '>', 'blue', () => this.turn(1), 40);
    this.pageText = text(this, WORLD_W / 2, WORLD_H - 34, '', 20, '#fbeed3');

    this.drawPage();
    Sound.music('menu');
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  private turn(d: number) {
    const pages = Math.ceil(TOTAL_LEVELS / PER_PAGE);
    const next = Phaser.Math.Clamp(this.page + d, 0, pages - 1);
    if (next === this.page) return;
    this.page = next;
    this.drawPage(d);
  }

  private drawPage(dir = 0) {
    this.grid?.destroy();
    const c = this.add.container(0, 0);
    const max = Save.playerLevel();
    const stars = Save.get().stars;
    const cellW = 170;
    const cellH = 118;
    const gapX = 26;
    const gapY = 20;
    const totalW = COLS * cellW + (COLS - 1) * gapX;
    const x0 = (WORLD_W - totalW) / 2 + cellW / 2;
    const y0 = 160;

    for (let i = 0; i < PER_PAGE; i++) {
      const n = this.page * PER_PAGE + i + 1;
      if (n > TOTAL_LEVELS) break;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = x0 + col * (cellW + gapX);
      const y = y0 + row * (cellH + gapY);
      const locked = n > max;
      const boss = n % 10 === 0;
      const isCurrent = n === max;
      const cell = this.add.container(x, y);
      const g = this.add.graphics();
      if (isCurrent) {
        g.fillStyle(0xffe58a, 1);
        g.fillRoundedRect(-cellW / 2 - 5, -cellH / 2 - 5, cellW + 10, cellH + 10, 18);
      }
      const top = locked ? 0x3a3a3a : boss ? 0xb23a3a : 0x7a5a3c;
      const bottom = locked ? 0x262626 : boss ? 0x6e1d1d : 0x4a3524;
      drawPanel(g, -cellW / 2, -cellH / 2, cellW, cellH, top, bottom, 16);
      cell.add(g);
      cell.add(text(this, 0, -22, String(n), 36, locked ? '#9a9a9a' : '#ffffff'));
      if (boss) cell.add(text(this, 0, -cellH / 2 + 12, 'CHEFE', 13, '#ffd36b'));
      if (locked) {
        cell.add(img(this, 0, 28, 'lock', 1.4));
      } else {
        for (let s = 0; s < 3; s++) {
          cell.add(img(this, (s - 1) * 32, 30, s < (stars[n - 1] ?? 0) ? 'star' : 'star_empty', 0.95));
        }
      }
      cell.setSize(cellW, cellH);
      cell.setInteractive({ useHandCursor: true });
      cell.on('pointerdown', () => {
        if (locked) {
          toast(this, 'Vença a fase anterior para liberar', '#ffd36b');
          return;
        }
        this.tweens.add({ targets: cell, scale: 0.93, duration: 70, yoyo: true });
        this.go('Game', { level: n });
      });
      if (isCurrent) this.tweens.add({ targets: cell, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.add(cell);
    }
    if (dir) {
      c.x = dir * 200;
      c.alpha = 0;
      this.tweens.add({ targets: c, x: 0, alpha: 1, duration: 220, ease: 'Quad.out' });
    }
    this.grid = c;
    const pages = Math.ceil(TOTAL_LEVELS / PER_PAGE);
    setTr(this.pageText, `Fases ${this.page * PER_PAGE + 1}-${Math.min(TOTAL_LEVELS, (this.page + 1) * PER_PAGE)}   (${this.page + 1}/${pages})`);
  }

  private go(scene: string, data?: object) {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}
