import Phaser from 'phaser';
// fontes embutidas no app (funciona sem internet)
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import { WORLD_W, WORLD_H } from './art/art';
import { Ads } from './systems/ads';
import { Store } from './systems/store';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CareerScene } from './scenes/CareerScene';
import { GameScene } from './scenes/GameScene';
import { ShopScene } from './scenes/ShopScene';

async function start() {
  // espera as fontes carregarem para os textos não aparecerem com fonte errada
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 20px Nunito'), document.fonts.load('900 20px Cinzel')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    // segue com fonte padrão
  }

  // no celular: liga anúncios (com consentimento) e loja do Google Play
  void Ads.init();
  void Store.init();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#0e1620',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: { activePointers: 2 },
    scene: [BootScene, MenuScene, CareerScene, GameScene, ShopScene],
  });
}

void start();
