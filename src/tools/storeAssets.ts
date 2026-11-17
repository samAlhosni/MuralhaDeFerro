// Ferramenta interna (não vai para o app): monta o ícone (512x512) e a
// imagem de destaque (1024x500) da Play Store usando a arte do jogo.
import Phaser from 'phaser';
import '@fontsource/cinzel/900.css';
import '@fontsource/nunito/900.css';
import { buildTextures, R, CASTLE_TEX, KEEP_TEX } from '../art/art';
import { MAP } from '../battle/map';
import { setLang, tr, type Lang } from '../i18n';

const params = new URLSearchParams(location.search);
const kind = params.get('a') === 'feature' ? 'feature' : 'icon';
const lang = (params.get('lang') ?? 'pt') as Lang;
setLang(lang);
const W = kind === 'icon' ? 512 : 1024;
const H = kind === 'icon' ? 512 : 500;

class Art extends Phaser.Scene {
  create() {
    buildTextures(this);
    if (kind === 'icon') this.icon();
    else this.feature();
    // avisa o script de captura que terminou
    this.time.delayedCall(300, () => ((window as unknown as { __ready: boolean }).__ready = true));
  }

  private img(key: string, x: number, y: number, s: number, ox = 0.5, oy = 1) {
    return this.add.image(x, y, key).setOrigin(ox, oy).setScale(s / R);
  }

  /** Ícone: céu de fim de tarde, torre do castelo e um cavaleiro de armadura. */
  private icon() {
    // céu de fim de tarde (degradê desenhado direto no canvas)
    const sky = this.textures.createCanvas('icon_sky', W, H)!;
    const c = sky.getContext();
    const grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2c5fa8');
    grad.addColorStop(0.6, '#e7a25a');
    grad.addColorStop(1, '#f6c77a');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);
    const sun = c.createRadialGradient(360, 290, 10, 360, 290, 230);
    sun.addColorStop(0, 'rgba(255,245,210,.95)');
    sun.addColorStop(1, 'rgba(255,245,210,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, W, H);
    // chão em duas camadas
    c.fillStyle = '#4f8f3a';
    c.beginPath();
    c.ellipse(256, 520, 420, 120, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3f7a33';
    c.beginPath();
    c.ellipse(256, 580, 420, 120, 0, 0, Math.PI * 2);
    c.fill();
    sky.refresh();
    this.add.image(0, 0, 'icon_sky').setOrigin(0);
    // castelo interior ao fundo (inteiro dentro do ícone)
    this.img('keep', 360, 440, 3.1, KEEP_TEX.ax / KEEP_TEX.w, KEEP_TEX.ay / KEEP_TEX.h);
    // cavaleiro em destaque
    this.add.image(185, 488, 'shadow').setScale(4.6 / R).setAlpha(0.7);
    this.img('u_campeao', 185, 492, 5.2);
    // moldura dourada
    const g = this.add.graphics();
    g.lineStyle(14, 0xffd36b, 1);
    g.strokeRoundedRect(7, 7, W - 14, H - 14, 60);
  }

  /** Imagem de destaque: o castelo, o exército dos dois lados e o título. */
  private feature() {
    const bg = this.add.image(0, 0, 'bg').setOrigin(0).setScale((1 / R) * (W / 1100));
    bg.setX(-60).setY(-80);
    const k = W / 1100;
    this.add.image((CASTLE_TEX.x - 140) * k, (CASTLE_TEX.y - 80) * k, 'castle').setOrigin(0).setScale((1 / R) * k);
    this.img('keep', (MAP.keep.x - 140) * k, (MAP.keep.y - 96) * k, k, KEEP_TEX.ax / KEEP_TEX.w, KEEP_TEX.ay / KEEP_TEX.h);
    for (const def of MAP.wallSegments) {
      this.add.image((MAP.wallX - 140) * k, (def.y0 - 80) * k, `cwall_${def.id}`).setOrigin(0.5, 0).setScale((1 / R) * k);
    }
    // escurece um pouco embaixo do título
    const g = this.add.graphics();
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    g.fillRect(0, 0, W, 190);
    // exércitos
    const army: [string, number, number, number, boolean][] = [
      ['e_capitao', 150, 460, 2.6, false], ['e_bruto', 70, 470, 2.4, false], ['e_cavnegro', 250, 455, 2.1, false], ['e_guerreiro', 330, 470, 2.2, false],
      ['u_campeao', 640, 465, 2.6, true], ['u_cavpesado', 540, 460, 2.2, true], ['u_espadachim', 720, 472, 2.3, true], ['u_arqueiro', 470, 470, 2.2, true],
    ];
    for (const [key, x, y, s, flip] of army) {
      this.add.image(x, y + 4, 'shadow').setScale((s * 1.3) / R).setAlpha(0.7);
      this.img(key, x, y, s).setFlipX(flip);
    }
    const title = this.add
      .text(W / 2, 78, tr('MURALHA DE FERRO'), {
        fontFamily: 'Cinzel, serif',
        fontSize: '84px',
        fontStyle: '900',
        color: '#ffe58a',
        stroke: '#20160f',
        strokeThickness: 12,
        resolution: 2,
      })
      .setOrigin(0.5);
    title.setShadow(0, 6, '#000', 10, true, true);
    this.add
      .text(W / 2, 148, tr('Defenda o castelo. Derrote o chefe.'), {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '30px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#20160f',
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0.5);
  }
}

void document.fonts.load('900 40px Cinzel').then(() =>
  new Phaser.Game({ type: Phaser.CANVAS, parent: 'art', width: W, height: H, backgroundColor: '#0e1620', scene: [Art], render: { antialias: true } }),
);
