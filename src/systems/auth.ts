// Perfil local do jogador (sem login: o progresso fica só no aparelho).

import { Save } from './save';
import { tr } from '../i18n';

export function setNickname(name: string) {
  const clean = name.trim().slice(0, 16);
  const p = Save.get().profile;
  if (clean) p.nickname = clean;
  p.askedNickname = true;
  Save.persist();
}

/** Abre o modal HTML pedindo o apelido. */
export function askNickname(): Promise<void> {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal')!;
    const input = document.getElementById('nickInput') as HTMLInputElement;
    const ok = document.getElementById('nickOk')!;
    const skip = document.getElementById('nickSkip')!;
    // textos da janela no idioma do jogador
    const h2 = modal.querySelector('h2');
    const p = modal.querySelector('p');
    if (h2) h2.textContent = tr('Bem-vindo, Comandante!');
    if (p) p.textContent = tr('Como devemos te chamar?');
    input.placeholder = tr('Seu apelido');
    ok.textContent = tr('Confirmar');
    skip.textContent = tr('Pular');
    modal.classList.add('open');
    input.value = '';
    setTimeout(() => input.focus(), 50);
    const done = (save: boolean) => {
      setNickname(save ? input.value : '');
      modal.classList.remove('open');
      ok.onclick = null;
      skip.onclick = null;
      input.onkeydown = null;
      resolve();
    };
    ok.onclick = () => done(true);
    skip.onclick = () => done(false);
    input.onkeydown = (e) => { if (e.key === 'Enter') done(true); };
  });
}
