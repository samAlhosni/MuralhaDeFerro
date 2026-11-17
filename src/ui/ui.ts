import Phaser from 'phaser';
import { R } from '../art/art';
import { tr } from '../i18n';

export { tr };

/** Troca o texto já traduzindo. */
export function setTr(t: Phaser.GameObjects.Text, pt: string) {
  const v = tr(pt);
  if (t.text !== v) t.setText(v);
  return t;
}

export const FONT = 'Nunito, sans-serif';
export const TITLE_FONT = 'Cinzel, serif';

export const COLORS = {
  green: [0x7ccf4a, 0x3f8f22],
  gold: [0xffd36b, 0xd18f16],
  blue: [0x5b9be0, 0x2a5fa8],
  red: [0xe0605b, 0xa3302d],
  brown: [0x8a6542, 0x5a3e26],
  gray: [0x8a8f96, 0x55595e],
} as const;

export type ColorName = keyof typeof COLORS;

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size = 24,
  color = '#ffffff',
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
) {
  // todo texto passa pelo tradutor (português → idioma do jogador)
  const t = scene.add.text(x, y, tr(str), {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: '900',
    color,
    stroke: '#20160f',
    strokeThickness: Math.max(3, size / 6),
    align: 'center',
    resolution: 2,
    ...opts,
  });
  t.setOrigin(0.5);
  return t;
}

/** Desenha um painel arredondado com degradê simulado. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
  radius = 14,
  border = 0x20160f,
) {
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x, y + 4, w, h, radius);
  g.fillStyle(border, 1);
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, radius + 2);
  // Phaser não aplica degradê em retângulo arredondado: usa duas faixas + brilho
  g.fillStyle(top, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(bottom, 1);
  g.fillRoundedRect(x, y + h * 0.5, w, h * 0.5, { tl: 0, tr: 0, bl: radius, br: radius });
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(x + 4, y + 3, w - 8, Math.min(h * 0.35, 18), radius * 0.7);
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(v: boolean): Button;
  label: Phaser.GameObjects.Text;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: ColorName,
  onClick: () => void,
  size = 24,
): Button {
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  let enabled = true;
  const redraw = (col: ColorName) => {
    g.clear();
    // formato de pílula (bem arredondado) para parecer botão de jogo
    drawPanel(g, -w / 2, -h / 2, w, h, COLORS[col][0], COLORS[col][1], h / 2 - 1);
  };
  redraw(color);
  const t = text(scene, 0, 0, label, size);
  c.add([g, t]);
  c.label = t;
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  // Só dispara se o toque começou neste botão (evita cliques "vazando"
  // de janelas HTML por cima do jogo ou arrastes de outro lugar).
  let pressed = false;
  c.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    scene.tweens.add({ targets: c, scale: 0.93, duration: 60, yoyo: true });
  });
  c.on('pointerout', () => {
    pressed = false;
  });
  c.on('pointerup', () => {
    if (!enabled || !pressed) return;
    pressed = false;
    onClick();
  });
  c.setEnabled = (v: boolean) => {
    enabled = v;
    redraw(v ? color : 'gray');
    t.setAlpha(v ? 1 : 0.7);
    return c;
  };
  return c;
}

export interface RoundButton extends Phaser.GameObjects.Container {
  /** Texto pequeno embaixo (ex.: tempo de espera). */
  sub: Phaser.GameObjects.Text;
  /** Sombra escura por cima (0 = livre, 1 = esperando). */
  setCooldown(ratio: number): void;
  setIcon(key: string): void;
}

/**
 * Botão redondo de jogo: círculo com borda e brilho e um ícone ou letra no meio.
 * `bare` = sem fundo (só o ícone/letra com contorno), como o "H" do hospital.
 */
export function roundButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  r: number,
  content: { icon?: string; iconScale?: number; letter?: string; letterColor?: string },
  color: ColorName,
  onClick: () => void,
  bare = false,
): RoundButton {
  const c = scene.add.container(x, y) as RoundButton;
  const g = scene.add.graphics();
  if (!bare) {
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(0, 4, r);
    g.fillStyle(0x20160f, 1);
    g.fillCircle(0, 0, r + 3);
    g.fillStyle(COLORS[color][1], 1);
    g.fillCircle(0, 0, r);
    g.fillStyle(COLORS[color][0], 1);
    g.fillCircle(0, -r * 0.12, r * 0.86);
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(0, -r * 0.45, r * 1.1, r * 0.55);
  }
  c.add(g);
  let icon: Phaser.GameObjects.Image | null = null;
  if (content.icon) {
    icon = img(scene, 0, 0, content.icon, content.iconScale ?? 1);
    c.add(icon);
  }
  if (content.letter) {
    c.add(text(scene, 0, 0, content.letter, r * 1.35, content.letterColor ?? '#ffffff', { fontFamily: TITLE_FONT, strokeThickness: 7 }));
  }
  const shade = scene.add.graphics();
  c.add(shade);
  const sub = text(scene, 0, r + 12, '', 15, '#ffffff');
  c.add(sub);
  c.sub = sub;
  c.setSize(r * 2 + 6, r * 2 + 6);
  c.setInteractive({ useHandCursor: true });
  let pressed = false;
  c.on('pointerdown', () => {
    pressed = true;
    scene.tweens.add({ targets: c, scale: 0.9, duration: 60, yoyo: true });
  });
  c.on('pointerout', () => {
    pressed = false;
  });
  c.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    onClick();
  });
  c.setCooldown = (ratio: number) => {
    shade.clear();
    if (ratio <= 0) return;
    shade.fillStyle(0x000000, 0.55);
    shade.slice(0, 0, r + 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
    shade.fillPath();
  };
  c.setIcon = (key: string) => icon?.setTexture(key);
  return c;
}

/** Imagem gerada em 2x exibida no tamanho correto. */
export function img(scene: Phaser.Scene, x: number, y: number, key: string, scale = 1) {
  return scene.add.image(x, y, key).setScale(scale / R);
}

export function toast(scene: Phaser.Scene, msg: string, color = '#ffffff', y = 130) {
  const { width } = scene.scale.gameSize;
  const t = text(scene, width / 2, y, msg, 26, color).setDepth(5000).setAlpha(0);
  scene.tweens.add({
    targets: t,
    alpha: 1,
    y: y - 15,
    duration: 180,
    onComplete: () => {
      scene.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 300, onComplete: () => t.destroy() });
    },
  });
}

/** Contador de moedas (ícone + número). */
export function coinCounter(scene: Phaser.Scene, x: number, y: number, value: number) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawPanel(g, -10, -20, 150, 40, 0x3a2a1c, 0x24180f, 20);
  const icon = img(scene, 8, 0, 'coin', 1.3);
  const t = text(scene, 75, 1, String(value), 24, '#ffe58a');
  c.add([g, icon, t]);
  return {
    container: c,
    set(v: number) {
      t.setText(String(Math.round(v)));
    },
    pulse() {
      scene.tweens.add({ targets: icon, scale: (1.6) / R, duration: 90, yoyo: true });
    },
  };
}

/** Escurece a tela e devolve um container para montar um popup. */
export function modal(scene: Phaser.Scene, w: number, h: number, title: string) {
  const { width, height } = scene.scale.gameSize;
  const root = scene.add.container(0, 0).setDepth(4000);
  const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x050a12, 0.65).setInteractive();
  const box = scene.add.container(width / 2, height / 2);
  const g = scene.add.graphics();
  drawPanel(g, -w / 2, -h / 2, w, h, 0x4a3524, 0x2a1d12, 22, 0xc99a4a);
  const ribbon = scene.add.graphics();
  drawPanel(ribbon, -w / 2 + 40, -h / 2 - 26, w - 80, 52, 0xc23b3b, 0x7e1f1f, 14);
  const t = text(scene, 0, -h / 2, title, 30, '#ffe58a', { fontFamily: TITLE_FONT });
  box.add([g, ribbon, t]);
  root.add([dim, box]);
  box.setScale(0.7);
  box.setAlpha(0);
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
  return {
    root,
    box,
    close() {
      scene.tweens.add({
        targets: box,
        scale: 0.8,
        alpha: 0,
        duration: 150,
        onComplete: () => root.destroy(),
      });
    },
  };
}
