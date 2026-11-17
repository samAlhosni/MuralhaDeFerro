// Idiomas: português (original), inglês e espanhol.
// O idioma do aparelho é detectado automaticamente; o jogador pode trocar no menu.
// Os textos do jogo são escritos em português e traduzidos por este dicionário.
// Placeholders: {n} = número, {s} = qualquer texto (ex.: nome).

export type Lang = 'pt' | 'en' | 'es';

const DICT: Record<string, [string, string]> = {
  // ---------- menu ----------
  'MURALHA DE FERRO': ['IRON WALL', 'MURALLA DE HIERRO'],
  'Defenda o castelo. Derrote o chefe.': ['Defend the castle. Defeat the boss.', 'Defiende el castillo. Derrota al jefe.'],
  JOGAR: ['PLAY', 'JUGAR'],
  'Recompensa diária': ['Daily reward', 'Recompensa diaria'],
  'Loja  •  Moedas grátis': ['Shop  •  Free coins', 'Tienda  •  Monedas gratis'],
  'Como jogar': ['How to play', 'Cómo jugar'],
  'Música ✓': ['Music ✓', 'Música ✓'],
  'Música ✗': ['Music ✗', 'Música ✗'],
  'Efeitos ✓': ['Sounds ✓', 'Efectos ✓'],
  'Efeitos ✗': ['Sounds ✗', 'Efectos ✗'],
  'RECOMPENSA DIÁRIA': ['DAILY REWARD', 'RECOMPENSA DIARIA'],
  'Entre todo dia para ganhar mais moedas!': ['Come back every day for more coins!', '¡Entra todos los días para ganar más monedas!'],
  'Dia {n}': ['Day {n}', 'Día {n}'],
  'Você já pegou hoje. Volte amanhã!': ['Already collected today. Come back tomorrow!', 'Ya la recogiste hoy. ¡Vuelve mañana!'],
  Fechar: ['Close', 'Cerrar'],
  '+{n} moedas!': ['+{n} coins!', '¡+{n} monedas!'],
  'Pegar {n}': ['Collect {n}', 'Recoger {n}'],
  'Vídeo: {n}': ['Video: {n}', 'Video: {n}'],
  'Nível {n}': ['Level {n}', 'Nivel {n}'],
  // ---------- carreira ----------
  CARREIRA: ['CAMPAIGN', 'CAMPAÑA'],
  Voltar: ['Back', 'Volver'],
  Loja: ['Shop', 'Tienda'],
  CHEFE: ['BOSS', 'JEFE'],
  TUTORIAL: ['TUTORIAL', 'TUTORIAL'],
  'Vença a fase anterior para liberar': ['Beat the previous level to unlock', 'Gana la fase anterior para desbloquear'],
  'Fases {n}-{n}   ({n}/{n})': ['Levels {n}-{n}   ({n}/{n})', 'Fases {n}-{n}   ({n}/{n})'],
  // ---------- loja ----------
  LOJA: ['SHOP', 'TIENDA'],
  'Compras de teste: nenhum valor é cobrado nesta versão.': ['Test purchases: nothing is charged in this version.', 'Compras de prueba: no se cobra nada en esta versión.'],
  'Moedas grátis': ['Free coins', 'Monedas gratis'],
  'Saco de moedas': ['Bag of coins', 'Bolsa de monedas'],
  'Baú de moedas': ['Chest of coins', 'Cofre de monedas'],
  'Tesouro do Rei': ["King's treasure", 'Tesoro del Rey'],
  'Sem anúncios': ['No ads', 'Sin anuncios'],
  '+15% grátis': ['+15% free', '+15% gratis'],
  'Melhor oferta': ['Best deal', 'Mejor oferta'],
  'Sem intervalos': ['No breaks', 'Sin pausas'],
  'entre as fases': ['between levels', 'entre fases'],
  'Restam {n} hoje': ['{n} left today', 'Quedan {n} hoy'],
  Assistir: ['Watch', 'Ver'],
  'Volte amanhã': ['Come back tomorrow', 'Vuelve mañana'],
  Comprado: ['Owned', 'Comprado'],
  'Anúncios removidos!': ['Ads removed!', '¡Anuncios eliminados!'],
  // ---------- batalha: interface ----------
  Castelo: ['Castle', 'Castillo'],
  'INICIAR ATAQUE': ['START BATTLE', 'INICIAR ATAQUE'],
  'Posicione e construa na área verde (também dentro do castelo)': ['Place and build in the green area (also inside the castle)', 'Coloca y construye en el área verde (también dentro del castillo)'],
  'Soldados {n}/{n}': ['Soldiers {n}/{n}', 'Soldados {n}/{n}'],
  'Nv {n}': ['Lv {n}', 'Nv {n}'],
  'Fase {n}': ['Level {n}', 'Fase {n}'],
  'Onda {n}/{n}': ['Wave {n}/{n}', 'Oleada {n}/{n}'],
  'Onda {n}': ['Wave {n}', 'Oleada {n}'],
  'próxima {n}s': ['next {n}s', 'próxima {n}s'],
  'última!': ['last one!', '¡última!'],
  'Chamar onda agora +{n}': ['Call wave now +{n}', 'Llamar oleada ya +{n}'],
  'Coragem! +{n} moedas': ['Brave! +{n} coins', '¡Valor! +{n} monedas'],
  'O Rei enviou reforços: +{n} moedas': ['The King sent help: +{n} coins', 'El Rey envió refuerzos: +{n} monedas'],
  'Reparar  {n}': ['Repair  {n}', 'Reparar  {n}'],
  'Moedas insuficientes para reparar': ['Not enough coins to repair', 'Monedas insuficientes para reparar'],
  'Tudo reparado!': ['All repaired!', '¡Todo reparado!'],
  'Moedas insuficientes': ['Not enough coins', 'Monedas insuficientes'],
  'Libera no nível {n}': ['Unlocks at level {n}', 'Se desbloquea en el nivel {n}'],
  'Toque num círculo do muro ou no chão': ['Tap a circle on the wall or the ground', 'Toca un círculo del muro o el suelo'],
  'Posicione na área clara, dentro do castelo ou num círculo do muro': ['Place in the green area, inside the castle or on a wall circle', 'Coloca en el área verde, dentro del castillo o en un círculo del muro'],
  'Muito perto de outra construção': ['Too close to another building', 'Muy cerca de otra construcción'],
  '{n} soldados selecionados': ['{n} soldiers selected', '{n} soldados seleccionados'],
  'Vender +{n}': ['Sell +{n}', 'Vender +{n}'],
  'Toque no mapa para mover': ['Tap the map to move', 'Toca el mapa para mover'],
  'Casa melhorada! Agora cabem {n} soldados': ['House upgraded! Now holds {n} soldiers', '¡Casa mejorada! Ahora caben {n} soldados'],
  'Casa cheia! Melhore a casa (+{n} soldados)': ['House full! Upgrade it (+{n} soldiers)', '¡Casa llena! Mejora la casa (+{n} soldados)'],
  'Toque onde quer o hospital': ['Tap where you want the hospital', 'Toca donde quieres el hospital'],
  'Toque onde as flechas vão cair': ['Tap where the arrows will fall', 'Toca donde caerán las flechas'],
  'Aguarde {n}s': ['Wait {n}s', 'Espera {n}s'],
  'Ninguém dentro da roda': ['Nobody inside the circle', 'Nadie dentro del círculo'],
  'A muralha caiu! Defenda o castelo!': ['The wall fell! Defend the castle!', '¡La muralla cayó! ¡Defiende el castillo!'],
  'ONDA DO CHEFE!': ['BOSS WAVE!', '¡OLEADA DEL JEFE!'],
  '{s} vem com sua guarda': ['{s} comes with his guard', '{s} viene con su guardia'],
  'Depois desta vem o chefe!': ['The boss comes after this one!', '¡Después de esta viene el jefe!'],
  'O CHEFE CHEGOU!': ['THE BOSS IS HERE!', '¡LLEGÓ EL JEFE!'],
  'Escolha e arraste\no dedo no mapa': ['Choose and drag\nyour finger on the map', 'Elige y arrastra\nel dedo en el mapa'],
  'Arraste para apagar (devolve metade)': ['Drag to erase (refunds half)', 'Arrastra para borrar (devuelve la mitad)'],
  '{s}: {n} moedas cada': ['{s}: {n} coins each', '{s}: {n} monedas cada uno'],
  apagar: ['erase', 'borrar'],
  'Pronto ✓': ['Done ✓', 'Listo ✓'],
  'Novo poder: Hospital!': ['New power: Hospital!', '¡Nuevo poder: Hospital!'],
  'Cura {n}% da vida dos soldados na roda': ['Heals {n}% of the soldiers health in the circle', 'Cura {n}% de la vida de los soldados en el círculo'],
  'Novo poder: Chuva de Flechas!': ['New power: Arrow Rain!', '¡Nuevo poder: Lluvia de Flechas!'],
  'Escolha onde as flechas vão cair': ['Choose where the arrows fall', 'Elige dónde caerán las flechas'],
  'Hospital melhorou!': ['Hospital improved!', '¡El hospital mejoró!'],
  'Agora cura {n}% (+2%)': ['Now heals {n}% (+2%)', 'Ahora cura {n}% (+2%)'],
  // ---------- resultado / pausa ----------
  'VITÓRIA!': ['VICTORY!', '¡VICTORIA!'],
  DERROTA: ['DEFEAT', 'DERROTA'],
  'O castelo caiu...': ['The castle fell...', 'El castillo cayó...'],
  'Suas moedas ficam guardadas mesmo na derrota': ['You keep your coins even when you lose', 'Conservas tus monedas aunque pierdas'],
  'Batalha: {n}   +   Bônus de vitória: {n}': ['Battle: {n}   +   Victory bonus: {n}', 'Batalla: {n}   +   Bono de victoria: {n}'],
  'Moedas ganhas:': ['Coins earned:', 'Monedas ganadas:'],
  'Nova unidade liberada: {s}!': ['New unit unlocked: {s}!', '¡Nueva unidad desbloqueada: {s}!'],
  'Assistir vídeo: 2x moedas': ['Watch video: 2x coins', 'Ver video: 2x monedas'],
  'Moedas dobradas!': ['Coins doubled!', '¡Monedas duplicadas!'],
  Mapa: ['Map', 'Mapa'],
  'Próxima fase': ['Next level', 'Siguiente fase'],
  'Fim!': ['The end!', '¡Fin!'],
  'Tentar de novo': ['Try again', 'Intentar de nuevo'],
  PAUSA: ['PAUSE', 'PAUSA'],
  Continuar: ['Continue', 'Continuar'],
  'Reiniciar fase': ['Restart level', 'Reiniciar fase'],
  'Sair para o mapa': ['Exit to map', 'Salir al mapa'],
  // ---------- unidades ----------
  Recruta: ['Recruit', 'Recluta'],
  Espadachim: ['Swordsman', 'Espadachín'],
  Machadeiro: ['Axeman', 'Hachero'],
  Lanceiro: ['Spearman', 'Lancero'],
  'Cavaleiro Leve': ['Light Knight', 'Caballero Ligero'],
  'Cavaleiro Pesado': ['Heavy Knight', 'Caballero Pesado'],
  Campeão: ['Champion', 'Campeón'],
  Arqueiro: ['Archer', 'Arquero'],
  Besteiro: ['Crossbowman', 'Ballestero'],
  Casa: ['House', 'Casa'],
  Barricada: ['Barricade', 'Barricada'],
  Muros: ['Walls', 'Muros'],
  Torre: ['Tower', 'Torre'],
  'Muro de madeira': ['Wooden wall', 'Muro de madera'],
  'Muro de pedra': ['Stone wall', 'Muro de piedra'],
  'Porta de madeira': ['Wooden door', 'Puerta de madera'],
  'Porta de pedra': ['Stone door', 'Puerta de piedra'],
  // ---------- eras e clima ----------
  'Era {n}': ['Age {n}', 'Era {n}'],
  Primavera: ['Spring', 'Primavera'],
  Outono: ['Autumn', 'Otoño'],
  Deserto: ['Desert', 'Desierto'],
  Pântano: ['Swamp', 'Pantano'],
  Inverno: ['Winter', 'Invierno'],
  'Dia de sol': ['Sunny day', 'Día soleado'],
  'Dia de chuva': ['Rainy day', 'Día de lluvia'],
  'Dia de neve': ['Snowy day', 'Día de nieve'],
  // ---------- frases do chefe ----------
  'Vou acabar com você!': ["I'll finish you!", '¡Acabaré contigo!'],
  'Está de brincadeira comigo?': ['Are you kidding me?', '¿Me estás tomando el pelo?'],
  'Acha que esse muro vai te proteger de mim?': ['You think that wall will protect you?', '¿Crees que ese muro te protegerá de mí?'],
  'Seu castelo vai cair hoje!': ['Your castle falls today!', '¡Tu castillo caerá hoy!'],
  'Isso é tudo que você tem?': ['Is that all you have?', '¿Eso es todo lo que tienes?'],
  'Corram, covardes!': ['Run, cowards!', '¡Corran, cobardes!'],
  'Ninguém me derrota!': ['Nobody defeats me!', '¡Nadie me derrota!'],
  'Suas flechas fazem cócegas!': ['Your arrows tickle!', '¡Tus flechas hacen cosquillas!'],
  'Entregue o castelo e talvez eu poupe você!': ['Surrender and maybe I will spare you!', '¡Entrega el castillo y quizás te perdone!'],
  'Hoje o seu reino acaba!': ['Today your kingdom ends!', '¡Hoy termina tu reino!'],
  // ---------- tutorial ----------
  'Fase 0: Como jogar': ['Level 0: How to play', 'Fase 0: Cómo jugar'],
  'Bem-vindo, comandante! Este é o seu castelo. Os inimigos vêm pela esquerda, pelas estradas.': [
    'Welcome, commander! This is your castle. Enemies come from the left, along the roads.',
    '¡Bienvenido, comandante! Este es tu castillo. Los enemigos vienen por la izquierda, por los caminos.',
  ],
  'Toque na carta RECRUTA aqui embaixo.': ['Tap the RECRUIT card below.', 'Toca la carta RECLUTA abajo.'],
  'Agora toque na área VERDE para colocar o soldado.': ['Now tap the GREEN area to place the soldier.', 'Ahora toca el área VERDE para colocar al soldado.'],
  'Muito bem! Agora toque na carta MUROS para construir.': ['Well done! Now tap the WALLS card to build.', '¡Muy bien! Ahora toca la carta MUROS para construir.'],
  'Arraste o dedo na área verde para desenhar um muro.': ['Drag your finger on the green area to draw a wall.', 'Arrastra el dedo en el área verde para dibujar un muro.'],
  'Ótimo! Toque em PRONTO para terminar de construir.': ['Great! Tap DONE to finish building.', '¡Genial! Toca LISTO para terminar de construir.'],
  'Toque na carta ARQUEIRO e depois num círculo em cima do muro.': ['Tap the ARCHER card, then a circle on top of the wall.', 'Toca la carta ARQUERO y luego un círculo sobre el muro.'],
  'A CASA abriga seus soldados. Melhore a casa para ter mais vagas.': ['The HOUSE holds your soldiers. Upgrade it for more room.', 'La CASA aloja a tus soldados. Mejórala para tener más espacio.'],
  'Tudo pronto! Toque em INICIAR ATAQUE.': ['All set! Tap START BATTLE.', '¡Todo listo! Toca INICIAR ATAQUE.'],
  'Na batalha: toque num soldado e depois no mapa para mandar ele ir lá.': ['In battle: tap a soldier, then the map to send him there.', 'En batalla: toca un soldado y luego el mapa para enviarlo allí.'],
  'Derrote todos os inimigos para vencer!': ['Defeat all enemies to win!', '¡Derrota a todos los enemigos para ganar!'],
  'Toque para continuar': ['Tap to continue', 'Toca para continuar'],
  'Tutorial completo! Agora vá para a Fase 1.': ['Tutorial complete! Now go to Level 1.', '¡Tutorial completo! Ahora ve a la Fase 1.'],
  'Pular tutorial': ['Skip tutorial', 'Saltar tutorial'],
  'Fase 1': ['Level 1', 'Fase 1'],
  // ---------- janelas HTML ----------
  'Bem-vindo, Comandante!': ['Welcome, Commander!', '¡Bienvenido, Comandante!'],
  'Como devemos te chamar?': ['What should we call you?', '¿Cómo te llamamos?'],
  'Seu apelido': ['Your nickname', 'Tu apodo'],
  Pular: ['Skip', 'Saltar'],
  Confirmar: ['Confirm', 'Confirmar'],
  Comandante: ['Commander', 'Comandante'],
  'ANÚNCIO DE TESTE': ['TEST AD', 'ANUNCIO DE PRUEBA'],
  'Vídeo recompensado': ['Rewarded video', 'Video con recompensa'],
  'Anúncio intersticial': ['Interstitial ad', 'Anuncio intersticial'],
  'COMPRA DE TESTE (simulada)': ['TEST PURCHASE (simulated)', 'COMPRA DE PRUEBA (simulada)'],
  Cancelar: ['Cancel', 'Cancelar'],
  Comprar: ['Buy', 'Comprar'],
};

// ---------- detecção e escolha ----------
const STORE_KEY = 'mdf_lang';
function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
  } catch {
    // sem armazenamento
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const code = (l || '').toLowerCase();
    if (code.startsWith('pt')) return 'pt';
    if (code.startsWith('es')) return 'es';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

let current: Lang = detect();

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORE_KEY, l);
  } catch {
    // ignora
  }
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : l;
}

export const LANG_LABEL: Record<Lang, string> = { pt: 'PT', en: 'EN', es: 'ES' };

// padrões com {n}/{s} viram expressões regulares
const PATTERNS = Object.keys(DICT)
  .filter((k) => k.includes('{n}') || k.includes('{s}'))
  .map((k) => {
    const re = new RegExp(
      '^' +
        k
          .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
          .replace(/\{n\}/g, '(-?\\d+)')
          .replace(/\{s\}/g, '(.+?)') +
        '$',
      's',
    );
    return { key: k, re };
  });

/** Traduz um texto escrito em português para o idioma atual. */
export function tr(pt: string): string {
  if (current === 'pt' || !pt) return pt;
  const idx = current === 'en' ? 0 : 1;
  const exact = DICT[pt];
  if (exact) return exact[idx];
  for (const p of PATTERNS) {
    const m = pt.match(p.re);
    if (!m) continue;
    let i = 1;
    return DICT[p.key][idx].replace(/\{[ns]\}/g, () => m[i++] ?? '');
  }
  return pt;
}
