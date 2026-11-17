import Phaser from 'phaser';
import { R, WORLD_W, CASTLE_TEX, KEEP_TEX } from '../art/art';
import { MAP } from '../battle/map';
import { Save } from '../systems/save';
import { Daily, DAILY_REWARDS } from '../systems/daily';
import { Ads } from '../systems/ads';
import { askNickname } from '../systems/auth';
import { Sound } from '../systems/audio';
import { text, button, img, toast, coinCounter, modal, drawPanel, TITLE_FONT, tr } from '../ui/ui';
import { lang, setLang, LANG_LABEL, type Lang } from '../i18n';

export class MenuScene extends Phaser.Scene {
  private coinsUI!: ReturnType<typeof coinCounter>;
  private clouds: Phaser.GameObjects.Image[] = [];
  private greeting!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create() {
    this.clouds = [];
    this.dailyOpen = false;
    this.add.image(0, 0, 'bg').setOrigin(0).setScale(1 / R);
    this.add.image(CASTLE_TEX.x, CASTLE_TEX.y, 'castle').setOrigin(0).setScale(1 / R);
    this.add
      .image(MAP.keep.x, MAP.keep.y - 16, 'keep')
      .setOrigin(KEEP_TEX.ax / KEEP_TEX.w, KEEP_TEX.ay / KEEP_TEX.h)
      .setScale(1 / R)
      .setDepth(MAP.keep.y);
    MAP.houseSlots.slice(0, 2).forEach((p) => this.add.image(p.x, p.y + 18, 'house').setOrigin(0.5, 40 / 46).setScale(1 / R).setDepth(p.y));
    for (const def of MAP.wallSegments) {
      this.add.image(MAP.wallX, def.y0, `cwall_${def.id}`).setOrigin(0.5, 0).setScale(1 / R).setDepth(def.y1);
    }
    for (let i = 0; i < 3; i++) {
      const c = img(this, Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(120, 650), 'cloudshadow', Phaser.Math.FloatBetween(1.2, 2));
      c.setData('speed', Phaser.Math.FloatBetween(8, 18)).setDepth(900);
      this.clouds.push(c);
    }
    // personagens decorativos: defensores à direita, invasores à esquerda
    const row: [string, number, number, number][] = [
      ['u_cavpesado', 930, 640, 1.15], ['u_campeao', 1000, 650, 1.2], ['u_espadachim', 860, 655, 1.15],
      ['u_lanceiro', 800, 650, 1.1], ['u_arqueiro', 745, 655, 1.1],
      ['e_capitao', 300, 660, 1.5], ['e_guerreiro', 220, 645, 1.15], ['e_cavnegro', 380, 650, 1.1],
      ['e_bruto', 150, 660, 1.35], ['e_saqueador', 460, 655, 1.1],
    ];
    row.forEach(([key, x, y, s]) => {
      this.add.image(x, y + 6, 'shadow').setScale((s * (key.includes('cav') ? 1.9 : 1.1)) / R).setDepth(y - 1);
      const sp = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(s / R).setDepth(y);
      if (key.startsWith('u_')) sp.setFlipX(true);
      this.tweens.add({ targets: sp, y: y - 5, duration: 600 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    // título
    const title = text(this, WORLD_W / 2, 150, 'MURALHA DE FERRO', 78, '#ffe58a', {
      fontFamily: TITLE_FONT,
      strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 6, color: '#000', blur: 10, fill: true, stroke: true },
    });
    this.tweens.add({ targets: title, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    text(this, WORLD_W / 2, 215, 'Defenda o castelo. Derrote o chefe.', 24, '#fbeed3');

    // topo: perfil e moedas
    const pg = this.add.graphics();
    drawPanel(pg, 16, 12, 330, 54, 0x3a2a1c, 0x24180f, 14);
    this.greeting = text(this, 181, 39, '', 20, '#fbeed3');
    this.updateGreeting();
    this.coinsUI = coinCounter(this, WORLD_W - 170, 39, Save.get().coins);

    // botões
    // primeira vez: JOGAR leva direto para a Fase 0 (tutorial)
    const play = button(this, WORLD_W / 2, 330, 320, 84, 'JOGAR', 'green', () => {
      if (!Save.get().tutorialDone) this.go('Game', { level: 0 });
      else this.go('Career');
    }, 40);
    button(this, WORLD_W / 2, 572, 220, 46, 'Como jogar', 'brown', () => this.go('Game', { level: 0 }), 20);
    // idioma (detectado automaticamente; dá para trocar aqui)
    const langBtn = button(this, 60, 100, 90, 40, `🌐 ${LANG_LABEL[lang()]}`, 'brown', () => {
      const order: Lang[] = ['pt', 'en', 'es'];
      setLang(order[(order.indexOf(lang()) + 1) % order.length]);
      this.scene.restart();
    }, 16);
    void langBtn;
    this.tweens.add({ targets: play, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    button(this, WORLD_W / 2, 430, 320, 60, 'Recompensa diária', 'gold', () => this.openDaily(), 24);
    button(this, WORLD_W / 2, 505, 320, 56, 'Loja  •  Moedas grátis', 'blue', () => this.go('Shop'), 22);

    Sound.music('menu');
    const musicBtn = button(this, WORLD_W - 170, 100, 110, 40, Sound.musicOn ? 'Música ✓' : 'Música ✗', 'brown', () => {
      Sound.setMusicOn(!Sound.musicOn);
      musicBtn.label.setText(tr(Sound.musicOn ? 'Música ✓' : 'Música ✗'));
    }, 16);
    const soundBtn = button(this, WORLD_W - 55, 100, 110, 40, Sound.enabled ? 'Efeitos ✓' : 'Efeitos ✗', 'brown', () => {
      Sound.setEnabled(!Sound.enabled);
      soundBtn.label.setText(tr(Sound.enabled ? 'Efeitos ✓' : 'Efeitos ✗'));
    }, 16);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    void this.onboarding();
  }

  private updateGreeting() {
    const d = Save.get();
    this.greeting.setText(`${tr(d.profile.nickname)}  •  ${tr(`Nível ${d.maxUnlocked}`)}`);
  }

  private async onboarding() {
    if (!Save.get().profile.askedNickname) {
      // bloqueia toques no jogo enquanto a janela HTML está aberta
      this.input.enabled = false;
      await askNickname();
      await new Promise((r) => setTimeout(r, 150));
      this.input.enabled = true;
      this.updateGreeting();
    }
    if (Daily.pendingDay() !== null) this.openDaily();
  }

  private go(scene: string, data: object = {}) {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, { back: 'Menu', ...data }));
  }

  private dailyOpen = false;

  private openDaily() {
    if (this.dailyOpen) return;
    this.dailyOpen = true;
    const pending = Daily.pendingDay();
    const current = Daily.currentStreakIndex();
    const m = modal(this, 860, 400, 'RECOMPENSA DIÁRIA');
    m.root.once('destroy', () => { this.dailyOpen = false; });
    m.box.add(text(this, 0, -130, 'Entre todo dia para ganhar mais moedas!', 22, '#fbeed3'));
    const boxW = 104;
    const gap = 12;
    const startX = -((DAILY_REWARDS.length - 1) * (boxW + gap)) / 2;
    DAILY_REWARDS.forEach((amount, i) => {
      const x = startX + i * (boxW + gap);
      const g = this.add.graphics();
      const claimed = pending === null ? i <= current : i < current;
      const isToday = pending !== null && i === pending;
      const top = isToday ? 0xffd36b : claimed ? 0x4c7a3a : 0x5a4636;
      const bottom = isToday ? 0xd18f16 : claimed ? 0x2f5224 : 0x3a2c22;
      drawPanel(g, x - boxW / 2, -90, boxW, 130, top, bottom, 14);
      m.box.add(g);
      m.box.add(text(this, x, -70, `Dia ${i + 1}`, 18, isToday ? '#3a2410' : '#fbeed3', { strokeThickness: isToday ? 0 : 3 }));
      const coin = img(this, x, -25, 'coin', i === 6 ? 2.2 : 1.6);
      m.box.add(coin);
      m.box.add(text(this, x, 18, String(amount), 22, '#ffe58a'));
      if (claimed) m.box.add(text(this, x + 34, -82, '✔', 22, '#8ff06a'));
      if (isToday) this.tweens.add({ targets: coin, angle: { from: -10, to: 10 }, duration: 500, yoyo: true, repeat: -1 });
    });

    if (pending === null) {
      m.box.add(text(this, 0, 80, 'Você já pegou hoje. Volte amanhã!', 22, '#fbeed3'));
      m.box.add(button(this, 0, 145, 220, 56, 'Fechar', 'brown', () => m.close(), 22));
      return;
    }
    const amount = DAILY_REWARDS[pending];
    const finish = (got: number) => {
      m.close();
      this.coinsUI.set(Save.get().coins);
      this.coinsUI.pulse();
      toast(this, `+${got} moedas!`, '#ffe58a', 270);
    };
    m.box.add(button(this, -150, 120, 250, 62, `Pegar ${amount}`, 'green', () => finish(Daily.claim(1)), 24));
    m.box.add(button(this, 150, 120, 270, 62, `Vídeo: ${amount * 2}`, 'gold', async () => {
      const ok = await Ads.showRewarded();
      finish(Daily.claim(ok ? 2 : 1));
    }, 24));
  }

  update(_t: number, dms: number) {
    for (const c of this.clouds) {
      c.x += c.getData('speed') * (dms / 1000);
      if (c.x > WORLD_W + 100) c.x = -100;
    }
  }
}
