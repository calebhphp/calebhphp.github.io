// Five questions that assemble a personal model: template, modules, goals, tone.
import { t } from '../i18n.js';
import * as store from '../store.js';
import { head } from './parts.js';
import { icon, toast } from '../ui.js';

const Q = [
  { id: 'prof', opts: ['dev', 'artista', 'criador', 'estudante', 'outro'] },
  { id: 'income', opts: ['clt-pj', 'clt', 'pj', 'freela'] },
  { id: 'pain', opts: ['leak', 'forget', 'impulse', 'unknown'] },
  { id: 'goal', opts: ['reserva', 'casa', 'debt', 'trip'] },
  { id: 'time', opts: ['1', '5', '15'] },
  { id: 'tone', opts: ['game', 'calm'] },
];

let answers = {};

export function render(s) {
  const done = Q.every(q => answers[q.id]);
  return `${head(t('quiz.title'), t('quiz.sub'))}
  <form class="quiz" id="quiz">
    ${Q.map((q, n) => `<fieldset class="card qz">
      <legend><span class="qz-n">${n + 1}/${Q.length}</span> ${t('quiz.' + q.id)}</legend>
      <div class="qz-opts">${q.opts.map(o => `<label class="qz-opt"><input type="radio" name="${q.id}" value="${o}" ${answers[q.id] === o ? 'checked' : ''} required>
        <span><strong>${t(`quiz.${q.id}.${o}`)}</strong><small>${t(`quiz.${q.id}.${o}Hint`)}</small></span></label>`).join('')}</div>
    </fieldset>`).join('')}
    <div class="qz-foot">
      <button class="btn btn-primary" type="submit">${icon('i-spark')}${t('quiz.build')}</button>
      <a class="btn btn-ghost" href="#inicio">${t('quiz.skip')}</a>
      <span class="muted">${done ? '' : t('quiz.left', { n: Q.filter(q => !answers[q.id]).length })}</span>
    </div>
  </form>`;
}

export function mount(root) {
  const form = root.querySelector('#quiz');
  form.addEventListener('change', e => { answers[e.target.name] = e.target.value; root.querySelector('.qz-foot .muted').textContent = Q.every(q => answers[q.id]) ? '' : t('quiz.left', { n: Q.filter(q => !answers[q.id]).length }); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const miss = Q.find(q => !answers[q.id]);
    if (miss) { form.querySelector(`input[name="${miss.id}"]`).focus(); toast(t('quiz.missing')); return; }
    const a = { ...answers };
    // Profession picks the pack; how money comes in picks the base.
    const tpl = a.prof === 'dev' ? (a.income === 'pj' || a.income === 'freela' ? 'dev-usd' : 'dev')
      : a.prof === 'outro' ? a.income : a.prof;
    store.reset(tpl, s => {
      s.profile.quiz = a;
      if (a.tone === 'calm') s.modules = s.modules.filter(m => m !== 'conquistas');
      if (a.pain === 'impulse') { s.budgets.compras = 150; s.budgets.lazer = 160; }
      if (a.pain === 'forget') s.modules = ['inicio', 'contas', ...s.modules.filter(m => m !== 'inicio' && m !== 'contas')];
      const order = { reserva: 'g1', casa: 'g2', trip: 'g3', debt: null };
      if (order[a.goal]) s.goals.sort((x, y) => (y.id === order[a.goal]) - (x.id === order[a.goal]));
      if (a.goal === 'debt') s.goals.forEach(g => { g.monthly = Math.round(g.monthly * 0.5); });
      s.game.rewards[0].text = t('quiz.reward.' + a.goal);
    });
    answers = {};
    toast(t('quiz.done'));
    location.hash = '#inicio';
  });
}

export function quizBanner(s) {
  if (s.profile.quiz) return '';
  return `<div class="banner span-12"><div><h2>${t('quiz.bannerTitle')}</h2><p>${t('quiz.bannerBody')}</p></div>
    <a class="btn btn-primary" href="#comecar">${icon('i-spark')}${t('quiz.bannerCta')}</a></div>`;
}
