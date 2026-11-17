# Muralha de Ferro — Guia de publicação na Google Play

Este guia tem **a sua parte** (contas, cadastros e envio) em ordem. Algumas etapas levam **dias**
(verificação de identidade, teste fechado de 14 dias, revisão do Google), então vale começar logo.

> As regras do Google mudam de tempos em tempos. Se alguma tela estiver diferente do que está
> escrito aqui, siga o que a Play Console pedir.

---

## O que já está pronto (feito por mim)

- App Android criado (pasta `android/`), com tela deitada, tela cheia e tela sempre acesa.
- Fontes dentro do app (funciona sem internet).
- **AdMob** ligado (anúncios de **teste** por enquanto) + formulário de consentimento do Google.
- **Compras do Google Play** ligadas (moedas e "sem anúncios").
- Sem anúncios no tutorial; intersticial só entre fases; vídeo sempre opcional.
- Imagens da loja na pasta `store-assets/`: ícone 512x512, imagem de destaque 1024x500 (PT/EN/ES) e 5 capturas de tela.
- Mini-site na pasta `site/`: página do jogo, **política de privacidade** (PT/EN/ES) e `app-ads.txt`.

---

## SUA PARTE — passo a passo

### Etapa 1 — Conta Google nova (10 min)
1. Crie um Gmail só para o jogo (ex.: `muralhadeferro.jogo@gmail.com`).
2. Ative a **verificação em duas etapas** nessa conta (segurança).

### Etapa 2 — Conta de desenvolvedor Google Play (pode levar alguns dias)
1. Entre em **https://play.google.com/console** com a conta nova.
2. Escolha **conta pessoal**.
3. Pague a taxa única de **US$ 25** (cartão de crédito internacional).
4. Faça a **verificação de identidade** (documento com foto + endereço). Aguarde aprovação.
5. Se pedirem, confirme um **celular Android** e o número de telefone.

### Etapa 3 — Mini-site (política de privacidade e app-ads.txt) — grátis
O Google exige um link para a política de privacidade, e o AdMob recomenda o arquivo `app-ads.txt`
na raiz do site do desenvolvedor. A forma grátis mais simples é o **GitHub Pages**:
1. Crie uma conta em **https://github.com** (pode usar o mesmo Gmail novo).
2. Crie um repositório chamado exatamente **`SEU-USUARIO.github.io`** (público).
3. Envie para ele os arquivos da pasta `site/` (`index.html`, `privacidade.html`, `destaque.png`, `app-ads.txt`)
   usando o botão **"Add file → Upload files"**.
4. Em poucos minutos o site fica em `https://SEU-USUARIO.github.io`.
   - Política de privacidade: `https://SEU-USUARIO.github.io/privacidade.html`
5. **Antes de enviar**, me passe o **e-mail de contato** do jogo que eu troco o `CONTATO@EXEMPLO.COM`
   nos arquivos (ou troque você mesmo em `site/index.html` e `site/privacidade.html`).

### Etapa 4 — Conta no AdMob
1. Entre em **https://admob.google.com** com a conta nova.
2. Preencha **dados de pagamento** e **dados fiscais** (nome, CPF, endereço iguais ao documento).
3. **Adicionar app** → Android → "O app ainda não está publicado" (por enquanto) → nome "Muralha de Ferro".
4. Crie **2 blocos de anúncio**:
   - **Intersticial** (nome: "Entre fases")
   - **Premiado / Rewarded** (nome: "Video moedas")
5. **Me envie** (não são senhas, pode mandar):
   - o **ID do app** (formato `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)
   - os **2 IDs dos blocos** (formato `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`)
   - o seu **ID de editor** (`pub-XXXXXXXXXXXXXXXX`, aparece em Configurações) → vai no `app-ads.txt`
6. ⚠️ **Nunca clique nos seus próprios anúncios** e não peça para amigos clicarem.
   Enquanto testamos, o jogo usa só anúncios de teste.

### Etapa 5 — Instalar o Android Studio (1 hora, com downloads)
1. Baixe em **https://developer.android.com/studio** e instale com as opções padrão.
2. Abra uma vez e deixe ele baixar o SDK (ele faz sozinho no primeiro uso).
3. Me avise quando terminar: eu configuro os IDs reais e gero a versão final com você.

### Etapa 6 — Gerar o arquivo do app (.aab) assinado (faremos juntos)
1. No terminal, na pasta do projeto:
   ```
   npm run build
   npx cap sync android
   npx cap open android
   ```
2. No Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle**.
3. **Create new...** para criar a **chave de assinatura (upload key)**:
   - Guarde o arquivo `.jks` e as senhas em **2 lugares seguros** (ex.: pendrive + Google Drive da conta nova).
   - ⚠️ Se perder a chave/senha, pode ficar sem conseguir atualizar o jogo.
4. Escolha **release** → o arquivo sai em `android/app/release/app-release.aab`.
5. Ícone do app: no Android Studio, botão direito em `app/res` → **New → Image Asset** → escolha
   `store-assets/icone-512.png`.

### Etapa 7 — Criar o app na Play Console
1. **Criar app**: nome "Muralha de Ferro", idioma Português (Brasil), **Jogo**, **Gratuito**.
2. **Ficha da loja principal** (textos prontos mais abaixo neste arquivo):
   - Nome, descrição breve, descrição completa.
   - Ícone: `store-assets/icone-512.png`
   - Gráfico de destaque: `store-assets/destaque-1024x500-pt.png`
   - Capturas de tela do celular: `store-assets/captura-*.png`
   - Adicione traduções em **Inglês** e **Espanhol** (textos abaixo + imagens `-en` / `-es`).
   - **Site**: `https://SEU-USUARIO.github.io` · **E-mail**: o e-mail de contato do jogo.
3. **Configurar o app** (painel "Configurar seu app"):
   - **Política de privacidade**: `https://SEU-USUARIO.github.io/privacidade.html`
   - **Acesso ao app**: "Todas as funcionalidades estão disponíveis sem acesso especial".
   - **Anúncios**: **Sim, meu app contém anúncios**.
   - **Classificação do conteúdo**: responda o questionário (respostas sugeridas abaixo).
   - **Público-alvo**: marque **13 a 15, 16 a 17 e 18+** (NÃO marque menores de 13).
   - **Segurança dos dados**: respostas sugeridas abaixo.
   - **Categoria**: Jogos → **Estratégia**. Tags: Defesa de torres, Estratégia, Medieval.
4. **Produtos no app** (Monetizar → Produtos → Produtos no app). Crie com estes IDs **exatos**:
   | ID | Nome | Preço sugerido |
   |---|---|---|
   | `coins_500` | Saco de moedas (500) | R$ 2,99 |
   | `coins_1500` | Baú de moedas (1.500) | R$ 6,99 |
   | `coins_4000` | Tesouro do Rei (4.000) | R$ 14,99 |
   | `no_ads` | Sem anúncios | R$ 7,99 |
   (Para criar produtos a Play Console pede um perfil de pagamentos e, às vezes, que já exista um .aab enviado.)

### Etapa 8 — Teste fechado (obrigatório para conta pessoal nova: 12 testadores por 14 dias)
1. **Testar → Teste fechado** → criar faixa → enviar o `.aab`.
2. Adicionar a lista de e-mails dos **12+ testadores** (amigos, família, grupos de troca de testes).
3. Mandar o link de convite; cada um aceita e **instala pela Play Store**.
4. Os testadores devem manter o jogo instalado e **abrir de vez em quando** durante **14 dias seguidos**.
5. Coletem opiniões e bugs → me mandem → eu corrijo e geramos versões novas.

### Etapa 9 — Produção
1. Depois dos 14 dias: **Solicitar acesso à produção** (responder as perguntas sobre o teste).
2. Antes da versão final eu troco `USE_TEST_ADS` para `false` (anúncios reais) e coloco os IDs reais.
3. Enviar o `.aab` para **Produção** → revisão do Google (alguns dias).
4. 🎉 Publicado! Depois disso, no AdMob, ligue o app ao link da Play Store.

---

## Textos da loja (copiar e colar)

### Português (Brasil)
**Nome (máx. 30):** `Muralha de Ferro - Castelo`

**Descrição breve (máx. 80):**
`Construa muros, posicione soldados e defenda seu castelo de hordas e chefes!`

**Descrição completa:**
```
⚔️ Os invasores estão chegando! Construa suas muralhas, posicione seus soldados e defenda o castelo!

Muralha de Ferro é um jogo de estratégia e defesa de castelo. Antes de cada batalha você monta a sua defesa do jeito que quiser: desenhe muros de madeira e de pedra com portas, coloque arqueiros em cima das muralhas, construa torres com balista e espalhe seus soldados pelo campo. Quando o ataque começa, a batalha corre sem pausa — e você comanda suas tropas em tempo real!

🏰 DESENHE SUAS PRÓPRIAS MURALHAS
Arraste o dedo para construir muros e portas onde quiser. Seus soldados passam pelas portas — os inimigos precisam quebrá-las!

🛡️ EXÉRCITO COMPLETO
Recrutas, espadachins, machadeiros, lanceiros, cavaleiros, campeões, arqueiros e besteiros. Cada um com sua força.

👑 CHEFES LENDÁRIOS
Enfrente heróis antigos como Aquiles, Leônidas, Aníbal e Gengis Khan, que chegam cercados de guardas — e cheios de provocações!

🌍 100 FASES E 5 ERAS
Primavera, outono, deserto, pântano e inverno, com clima que muda: sol, chuva com raios e neve.

✨ PODERES ESPECIAIS
Use o Hospital para curar suas tropas e a Chuva de Flechas para arrasar os invasores.

🎁 RECOMPENSA DIÁRIA
Entre todos os dias e ganhe cada vez mais moedas.

✅ Joga offline
✅ Sem cadastro
✅ Português, inglês e espanhol

Você consegue manter a muralha de pé?
```

### English
**Name:** `Iron Wall: Castle Defense`

**Short description:**
`Build walls, place soldiers and defend your castle from hordes and bosses!`

**Full description:**
```
⚔️ The invaders are coming! Build your walls, place your soldiers and defend the castle!

Iron Wall is a strategy and castle defense game. Before each battle you design your defense your way: draw wooden and stone walls with doors, put archers on top of the walls, build ballista towers and spread your soldiers across the field. When the attack begins, the battle runs non-stop — and you command your troops in real time!

🏰 DRAW YOUR OWN WALLS
Drag your finger to build walls and doors anywhere. Your soldiers walk through the doors — enemies have to break them!

🛡️ A FULL ARMY
Recruits, swordsmen, axemen, spearmen, knights, champions, archers and crossbowmen. Each with its own strength.

👑 LEGENDARY BOSSES
Face ancient heroes like Achilles, Leonidas, Hannibal and Genghis Khan, who arrive surrounded by guards — and full of taunts!

🌍 100 LEVELS AND 5 AGES
Spring, autumn, desert, swamp and winter, with changing weather: sun, thunderstorms and snow.

✨ SPECIAL POWERS
Use the Hospital to heal your troops and Arrow Rain to crush the invaders.

🎁 DAILY REWARD
Come back every day for more and more coins.

✅ Play offline
✅ No sign-up
✅ English, Portuguese and Spanish

Can you keep the wall standing?
```

### Español
**Nombre:** `Muralla de Hierro: Castillo`

**Descripción breve:**
`¡Construye muros, coloca soldados y defiende tu castillo de hordas y jefes!`

**Descripción completa:**
```
⚔️ ¡Los invasores se acercan! ¡Construye tus murallas, coloca a tus soldados y defiende el castillo!

Muralla de Hierro es un juego de estrategia y defensa de castillos. Antes de cada batalla preparas tu defensa a tu manera: dibuja muros de madera y de piedra con puertas, pon arqueros sobre las murallas, construye torres con balista y reparte a tus soldados por el campo. Cuando empieza el ataque, la batalla no se detiene — ¡y tú diriges a tus tropas en tiempo real!

🏰 DIBUJA TUS PROPIAS MURALLAS
Arrastra el dedo para construir muros y puertas donde quieras. Tus soldados pasan por las puertas — ¡los enemigos tienen que romperlas!

🛡️ UN EJÉRCITO COMPLETO
Reclutas, espadachines, hacheros, lanceros, caballeros, campeones, arqueros y ballesteros. Cada uno con su fuerza.

👑 JEFES LEGENDARIOS
Enfrenta a héroes antiguos como Aquiles, Leónidas, Aníbal y Gengis Kan, que llegan rodeados de guardias — ¡y llenos de provocaciones!

🌍 100 FASES Y 5 ERAS
Primavera, otoño, desierto, pantano e invierno, con clima cambiante: sol, tormentas y nieve.

✨ PODERES ESPECIALES
Usa el Hospital para curar a tus tropas y la Lluvia de Flechas para arrasar a los invasores.

🎁 RECOMPENSA DIARIA
Entra todos los días y gana cada vez más monedas.

✅ Juega sin conexión
✅ Sin registro
✅ Español, portugués e inglés

¿Podrás mantener la muralla en pie?
```

---

## Respostas sugeridas dos questionários

### Classificação do conteúdo (IARC)
- Categoria: **Jogo**.
- Violência: **Sim** — violência **fantasiosa / de desenho**, sem sangue realista, sem violência contra humanos realistas.
- Medo/terror: Não · Sexualidade/nudez: Não · Linguagem imprópria: Não · Drogas/álcool/tabaco: Não · Jogos de azar: Não.
- Interação entre usuários / chat: **Não** · Compartilha localização: **Não**.
- Compras digitais: **Sim**.
- Resultado esperado: classificação livre/baixa (ex.: 10+ / 12, conforme o país).

### Segurança dos dados
- O app coleta ou compartilha dados? **Sim** (por causa do AdMob).
- Tipo de dado: **Identificadores do dispositivo ou outros IDs** (ID de publicidade) → finalidade:
  **Publicidade ou marketing** e **Análise** · Coletado e **compartilhado** (com o Google).
- Também: **Diagnóstico** (falhas/desempenho) e **Interações no app** — coletados pelo SDK de anúncios.
- Os dados são **criptografados em trânsito**: **Sim** (o SDK do Google usa HTTPS).
- O usuário pode pedir exclusão? O jogo não guarda dados em servidor; os dados de anúncios são do Google
  (o usuário pode redefinir o ID de publicidade no Android).
- Progresso, moedas e apelido ficam **só no aparelho** (não são "coletados", pois não saem do celular).

### Público-alvo
- Faixas: **13–15, 16–17, 18+**. Não marque menores de 13.
- "O app pode atrair crianças sem querer?": **Não** (estilo medieval/estratégia, mas tem anúncios gerais).
