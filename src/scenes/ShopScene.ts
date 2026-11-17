import Phaser from 'phaser';
import { R, WORLD_W, WORLD_H } from '../art/art';
import { Save } from '../systems/save';
import { Store, PRODUCTS, FREE_VIDEO, type Product } from '../systems/store';
import { text, button, img, toast, coinCounter, drawPanel, TITLE_FONT } from '../ui/ui';

const CARD_W = 220;
const CARD_H = 340;

export class ShopScene extends Phaser.Scene {
  private back = 'Menu';
  private coinsUI!: ReturnType<typeof coinCounter>;

  constructor() {
    super('Shop');
  }

  init(data: { back?: string }) {
    this.back = data.back ?? 'Menu';
  }

  create() {
    this.add.image(0, 0, 'bg').setOrigin(0).setScale(1 / R);
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0e1620, 0.55);
    text(this, WORLD_W / 2, 50, 'LOJA', 50, '#ffe58a', { fontFamily: TITLE_FONT });
    button(this, 90, 50, 130, 52, 'Voltar', 'brown', () => this.go(this.back), 20);
    this.coinsUI = coinCounter(this, WORLD_W - 170, 50, Save.get().coins);

    const items: (Product | 'video')[] = ['video', ...PRODUCTS];
    items.forEach((item, i) => {
      const x = WORLD_W / 2 + (i - (items.length - 1) / 2) * (CARD_W + 22);
      this.card(x, 390, item);
    });
    text(this, WORLD_W / 2, WORLD_H - 24, 'Compras de teste: nenhum valor é cobrado nesta versão.', 15, '#c9c2b0');
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private card(x: number, y: number, item: Product | 'video') {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const isVideo = item === 'video';
    const best = !isVideo && item.tag === 'Melhor oferta';
    const top = isVideo ? 0x3f8f22 : best ? 0xc98a1c : 0x7a5a3c;
    const bottom = isVideo ? 0x24561a : best ? 0x7a4f0c : 0x4a3524;
    drawPanel(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, top, bottom, 18, best ? 0xffe58a : 0x20160f);
    c.add(g);

    const name = isVideo ? 'Moedas grátis' : item.name;
    c.add(text(this, 0, -CARD_H / 2 + 30, name, 22, '#ffffff'));

    // ícone
    const iconY = -40;
    if (isVideo) {
      const ig = this.add.graphics();
      ig.fillStyle(0x20160f, 1);
      ig.fillCircle(0, iconY, 46);
      ig.fillStyle(0xffffff, 1);
      ig.fillCircle(0, iconY, 42);
      ig.fillStyle(0x3f8f22, 1);
      ig.fillTriangle(-14, iconY - 22, -14, iconY + 22, 24, iconY);
      c.add(ig);
    } else if (item.removeAds) {
      const ig = this.add.graphics();
      ig.fillStyle(0x20160f, 1);
      ig.fillCircle(0, iconY, 46);
      ig.fillStyle(0xffffff, 1);
      ig.fillCircle(0, iconY, 42);
      c.add(ig);
      c.add(text(this, 0, iconY, 'AD', 38, '#a3302d', { strokeThickness: 0 }));
      const slash = this.add.graphics();
      slash.lineStyle(8, 0xe0503b, 1);
      slash.strokeCircle(0, iconY, 38);
      slash.lineBetween(-27, iconY - 27, 27, iconY + 27);
      c.add(slash);
    } else {
      // pilha de moedas (maior conforme o pacote)
      const n = item.coins! >= 4000 ? 10 : item.coins! >= 1500 ? 6 : 3;
      const rows = n >= 10 ? [4, 3, 2, 1] : n >= 6 ? [3, 2, 1] : [2, 1];
      rows.forEach((count, r) => {
        for (let k = 0; k < count; k++) {
          c.add(img(this, (k - (count - 1) / 2) * 30, iconY + 30 - r * 22, 'coin', 1.6));
        }
      });
    }

    // quantidade
    if (isVideo) {
      c.add(img(this, -30, 40, 'coin', 1.3));
      c.add(text(this, 18, 40, `+${FREE_VIDEO.coins}`, 30, '#ffe58a'));
      c.add(text(this, 0, 78, `Restam ${Store.freeVideosLeft()} hoje`, 16, '#e6f5d8'));
    } else if (item.coins) {
      c.add(img(this, -44, 40, 'coin', 1.3));
      c.add(text(this, 14, 40, item.coins.toLocaleString('pt-BR'), 30, '#ffe58a'));
    } else {
      c.add(text(this, 0, 40, 'Sem intervalos', 18, '#fbeed3'));
      c.add(text(this, 0, 64, 'entre as fases', 18, '#fbeed3'));
    }

    if (!isVideo && item.tag) {
      const rg = this.add.graphics();
      drawPanel(rg, -78, -CARD_H / 2 + 52, 156, 30, 0xe0303a, 0x8e1a1a, 10);
      c.add(rg);
      c.add(text(this, 0, -CARD_H / 2 + 67, item.tag, 15, '#ffffff'));
    }

    // botão
    let label: string;
    let enabled = true;
    if (isVideo) {
      label = 'Assistir';
      enabled = Store.freeVideosLeft() > 0;
      if (!enabled) label = 'Volte amanhã';
    } else if (Store.owns(item)) {
      label = 'Comprado';
      enabled = false;
    } else {
      label = Store.priceOf(item);
    }
    const btn = button(this, 0, CARD_H / 2 - 42, CARD_W - 40, 54, label, isVideo ? 'gold' : 'green', async () => {
      if (isVideo) {
        const got = await Store.watchFreeVideo();
        if (got) this.celebrate(`+${got} moedas!`);
      } else {
        const ok = await Store.purchase(item);
        if (ok) this.celebrate(item.coins ? `+${item.coins} moedas!` : 'Anúncios removidos!');
      }
    }, 22);
    if (!enabled) btn.setEnabled(false);
    c.add(btn);
  }

  private celebrate(msg: string) {
    this.coinsUI.set(Save.get().coins);
    this.coinsUI.pulse();
    toast(this, msg, '#ffe58a', 120);
    this.time.delayedCall(900, () => this.scene.restart({ back: this.back }));
  }

  private go(scene: string) {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
  }
}
