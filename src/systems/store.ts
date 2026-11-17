// Loja: moedas grátis por vídeo e compras com dinheiro (baratas).
// - No celular: Google Play Billing (plugin cordova-plugin-purchase).
// - No navegador: compra SIMULADA (para testarmos o fluxo).

import { Capacitor } from '@capacitor/core';
import { Save } from './save';
import { Ads } from './ads';
import { tr } from '../i18n';
import { PRODUCT_IDS } from '../config';

export interface Product {
  id: string;
  name: string;
  price: string; // preço mostrado no navegador; no celular vem o preço real da loja
  coins?: number;
  removeAds?: boolean;
  tag?: string;
}

export const PRODUCTS: Product[] = [
  { id: PRODUCT_IDS.coins500, name: 'Saco de moedas', coins: 500, price: 'R$ 2,99' },
  { id: PRODUCT_IDS.coins1500, name: 'Baú de moedas', coins: 1500, price: 'R$ 6,99', tag: '+15% grátis' },
  { id: PRODUCT_IDS.coins4000, name: 'Tesouro do Rei', coins: 4000, price: 'R$ 14,99', tag: 'Melhor oferta' },
  { id: PRODUCT_IDS.noAds, name: 'Sem anúncios', removeAds: true, price: 'R$ 7,99' },
];

/** Vídeo que dá moedas: limite por dia para não estragar o jogo. */
export const FREE_VIDEO = { coins: 80, perDay: 6 };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const native = () => Capacitor.isNativePlatform();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cdv = (): any => (window as any).CdvPurchase;

/** Compras esperando a confirmação do Google (id do produto → resolver). */
const pending = new Map<string, (ok: boolean) => void>();

/** Entrega o que foi comprado (moedas ou "sem anúncios"). */
function grant(productId: string) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;
  if (p.coins) Save.addCoins(p.coins);
  if (p.removeAds) {
    Save.get().removeAds = true;
    Save.persist();
  }
}

function simulatedCheckout(p: Product): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;
      background:#000b;font-family:Nunito,sans-serif;padding:16px`;
    el.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:22px 26px;max-width:340px;width:100%;text-align:center;color:#222">
        <div style="font-size:13px;letter-spacing:1px;color:#888">${tr('COMPRA DE TESTE (simulada)')}</div>
        <div style="font-size:22px;font-weight:900;margin:8px 0">${tr(p.name)}</div>
        <div style="font-size:30px;font-weight:900;color:#1a8f3a;margin-bottom:16px">${p.price}</div>
        <div style="display:flex;gap:10px">
          <button id="sc" style="flex:1;padding:12px;border:none;border-radius:10px;font:800 16px Nunito;background:#ddd;cursor:pointer">${tr('Cancelar')}</button>
          <button id="sb" style="flex:1;padding:12px;border:none;border-radius:10px;font:900 16px Nunito;background:#1a8f3a;color:#fff;cursor:pointer">${tr('Comprar')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    (el.querySelector('#sc') as HTMLButtonElement).onclick = () => { el.remove(); resolve(false); };
    (el.querySelector('#sb') as HTMLButtonElement).onclick = () => { el.remove(); resolve(true); };
  });
}

export const Store = {
  /** Liga a loja do Google Play (só no celular). */
  async init() {
    if (!native()) return;
    // o plugin só existe depois que o Cordova termina de carregar
    await new Promise<void>((r) => {
      if (cdv()) r();
      else document.addEventListener('deviceready', () => r(), { once: true });
      setTimeout(r, 5000);
    });
    const C = cdv();
    if (!C) return;
    const { store, ProductType, Platform } = C;
    store.register(
      PRODUCTS.map((p) => ({
        id: p.id,
        type: p.removeAds ? ProductType.NON_CONSUMABLE : ProductType.CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      })),
    );
    store
      .when()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .approved((tx: any) => {
        for (const pr of tx.products ?? []) {
          grant(pr.id);
          pending.get(pr.id)?.(true);
          pending.delete(pr.id);
        }
        tx.finish();
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .productUpdated((product: any) => {
        // "sem anúncios" já comprado (ex.: reinstalou o jogo): restaura
        if (product.id === PRODUCT_IDS.noAds && product.owned && !Save.get().removeAds) {
          Save.get().removeAds = true;
          Save.persist();
        }
      });
    try {
      await store.initialize([Platform.GOOGLE_PLAY]);
    } catch {
      // loja indisponível agora
    }
  },

  /** Preço real da loja (no idioma/moeda do jogador) ou o preço de exemplo. */
  priceOf(p: Product): string {
    const prod = native() ? cdv()?.store?.get(p.id) : null;
    return prod?.pricing?.price ?? p.price;
  },

  freeVideosLeft(): number {
    const f = Save.get().freeVideos;
    if (f.day !== today()) return FREE_VIDEO.perDay;
    return Math.max(0, FREE_VIDEO.perDay - f.count);
  },

  /** Assiste um vídeo e ganha moedas. Retorna as moedas ganhas (0 se não deu). */
  async watchFreeVideo(): Promise<number> {
    if (this.freeVideosLeft() <= 0) return 0;
    const ok = await Ads.showRewarded();
    if (!ok) return 0;
    const data = Save.get();
    if (data.freeVideos.day !== today()) data.freeVideos = { day: today(), count: 0 };
    data.freeVideos.count++;
    Save.addCoins(FREE_VIDEO.coins);
    return FREE_VIDEO.coins;
  },

  owns(p: Product): boolean {
    return !!p.removeAds && Save.get().removeAds;
  },

  async purchase(p: Product): Promise<boolean> {
    if (this.owns(p)) return false;
    if (!native()) {
      const ok = await simulatedCheckout(p);
      if (ok) grant(p.id);
      return ok;
    }
    const offer = cdv()?.store?.get(p.id)?.getOffer();
    if (!offer) return false;
    const result = new Promise<boolean>((resolve) => {
      pending.set(p.id, resolve);
      setTimeout(() => {
        if (pending.get(p.id) === resolve) {
          pending.delete(p.id);
          resolve(false);
        }
      }, 120000);
    });
    const err = await offer.order();
    if (err) {
      pending.delete(p.id);
      return false; // cancelou ou deu erro
    }
    return result;
  },
};
