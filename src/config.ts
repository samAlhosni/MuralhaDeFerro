// =====================================================================
// CONFIGURAÇÃO DE PUBLICAÇÃO — trocar aqui antes de enviar para a loja
// =====================================================================

/**
 * true = anúncios de TESTE do Google (seguro: nunca conta clique real).
 * Só mude para false na versão final, DEPOIS de colocar os IDs reais abaixo.
 */
export const USE_TEST_ADS = true;

/** IDs dos blocos de anúncio criados no AdMob (preencher com os seus). */
export const ADMOB_IDS = {
  // IDs de teste oficiais do Google (funcionam em qualquer app)
  testInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  testRewarded: 'ca-app-pub-3940256099942544/5224354917',
  // >>> PREENCHER com os do seu AdMob (ex.: 'ca-app-pub-1234567890123456/1234567890')
  interstitial: '',
  rewarded: '',
};

/**
 * IDs dos produtos da loja. Devem ser IGUAIS aos cadastrados na Play Console
 * (Monetização > Produtos no app).
 */
export const PRODUCT_IDS = {
  coins500: 'coins_500',
  coins1500: 'coins_1500',
  coins4000: 'coins_4000',
  noAds: 'no_ads',
};
