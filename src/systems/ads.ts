// Serviço de anúncios.
// - No celular (app Android): AdMob de verdade, com formulário de consentimento.
// - No navegador: anúncio SIMULADO (para testarmos o fluxo).
//
// Cuidados para a conta do AdMob não ter problema:
//  * enquanto USE_TEST_ADS = true, só aparecem anúncios de teste do Google;
//  * o intersticial só aparece ENTRE as fases (nunca durante a batalha);
//  * o vídeo recompensado é sempre opcional;
//  * nenhum anúncio no tutorial (Fase 0).

import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Save } from './save';
import { tr } from '../i18n';
import { USE_TEST_ADS, ADMOB_IDS } from '../config';

export const INTERSTITIAL_EVERY = 2; // intersticial a cada 2 partidas

const native = () => Capacitor.isNativePlatform();
const interstitialId = () => (USE_TEST_ADS || !ADMOB_IDS.interstitial ? ADMOB_IDS.testInterstitial : ADMOB_IDS.interstitial);
const rewardedId = () => (USE_TEST_ADS || !ADMOB_IDS.rewarded ? ADMOB_IDS.testRewarded : ADMOB_IDS.rewarded);

let ready = false;

function simulatedAd(title: string, seconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;
      align-items:center;justify-content:center;background:#000d;color:#fff;
      font-family:Nunito,sans-serif;gap:14px;text-align:center;padding:16px`;
    el.innerHTML = `
      <div style="font-size:14px;opacity:.6;letter-spacing:2px">${tr('ANÚNCIO DE TESTE')}</div>
      <div style="font-size:28px;font-weight:900">${tr(title)}</div>
      <div id="adCount" style="font-size:56px;font-weight:900;color:#ffd679">${seconds}</div>
      <button id="adClose" style="display:none;font:900 18px Nunito;padding:10px 26px;border:none;border-radius:10px;background:#ffd679;cursor:pointer">${tr('Fechar')}</button>`;
    document.body.appendChild(el);
    const count = el.querySelector('#adCount') as HTMLElement;
    const close = el.querySelector('#adClose') as HTMLButtonElement;
    let left = seconds;
    const timer = window.setInterval(() => {
      left--;
      count.textContent = String(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        close.style.display = 'block';
      }
    }, 1000);
    close.onclick = () => {
      el.remove();
      resolve(true);
    };
  });
}

/** Espera um evento do AdMob (ou desiste depois de `ms`). */
function once(event: string, ms = 60000): Promise<unknown> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: unknown) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (AdMob as any).addListener(event, (info: unknown) => finish(info ?? true)).then((h: { remove: () => void }) => {
      setTimeout(() => {
        h.remove();
        finish(null);
      }, ms);
    });
  });
}

export const Ads = {
  /** Liga o AdMob no celular e pede o consentimento quando a lei exige (ex.: Europa). */
  async init() {
    if (!native() || ready) return;
    try {
      await AdMob.initialize({ initializeForTesting: USE_TEST_ADS });
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
      ready = true;
    } catch {
      // sem anúncios desta vez; o jogo continua normal
    }
  },

  /** Vídeo recompensado. Resolve true se o jogador assistiu até o fim (ganha a recompensa). */
  async showRewarded(): Promise<boolean> {
    if (!native()) return simulatedAd('Vídeo recompensado', 3);
    try {
      if (!ready) await this.init();
      await AdMob.prepareRewardVideoAd({ adId: rewardedId(), isTesting: USE_TEST_ADS });
      let rewarded = false;
      const rewardWait = once(RewardAdPluginEvents.Rewarded).then((v) => {
        if (v) rewarded = true;
      });
      const closed = once(RewardAdPluginEvents.Dismissed);
      await AdMob.showRewardVideoAd();
      await Promise.race([closed, rewardWait.then(() => closed)]);
      return rewarded;
    } catch {
      return false; // sem anúncio disponível agora
    }
  },

  /** Intersticial (tela cheia entre partidas). */
  async showInterstitial(): Promise<void> {
    if (!native()) {
      await simulatedAd('Anúncio intersticial', 2);
      return;
    }
    try {
      if (!ready) await this.init();
      await AdMob.prepareInterstitial({ adId: interstitialId(), isTesting: USE_TEST_ADS });
      const closed = once(InterstitialAdPluginEvents.Dismissed, 45000);
      await AdMob.showInterstitial();
      await closed;
    } catch {
      // sem anúncio: segue o jogo
    }
  },

  /**
   * Chamado ao terminar uma partida. Mostra o intersticial a cada N partidas,
   * mas pula se o jogador acabou de assistir um vídeo recompensado.
   */
  async afterBattle(watchedRewarded: boolean): Promise<void> {
    const data = Save.get();
    if (data.removeAds) return; // comprou "sem anúncios"
    data.battlesSinceAd++;
    if (watchedRewarded) {
      data.battlesSinceAd = 0;
      Save.persist();
      return;
    }
    if (data.battlesSinceAd >= INTERSTITIAL_EVERY) {
      data.battlesSinceAd = 0;
      Save.persist();
      await this.showInterstitial();
      return;
    }
    Save.persist();
  },
};
