// Where the data lives. Credibility comes from saying it plainly.
import { t } from '../i18n.js';
import { head } from './parts.js';
import { icon } from '../ui.js';
import { hasAI } from '../ai.js';
import { exportCsv, exportBackup, readBackup } from '../export.js';
import { toast } from '../ui.js';

const ITEMS = ['bank', 'local', 'ai', 'import', 'future'];

export function render() {
  return `${head(t('priv.title'), t('priv.sub'))}
  <div class="grid">
    <section class="card span-8" aria-labelledby="pv-t">
      <h2 id="pv-t" class="sr-only">${t('priv.title')}</h2>
      <ul class="priv">${ITEMS.map(k => `<li>${icon(k === 'bank' ? 'i-lock' : k === 'ai' ? 'i-spark' : k === 'import' ? 'i-in' : k === 'future' ? 'i-flag' : 'i-safe')}
        <div><h3>${t('priv.' + k)}</h3><p>${t('priv.' + k + 'Body')}</p></div></li>`).join('')}</ul>
    </section>
    <section class="card span-4" aria-labelledby="pc-t">
      <div class="card-head"><h2 id="pc-t">${t('priv.control')}</h2></div>
      <p class="card-sub">${t('priv.controlBody')}</p>
      <p class="muted small">${hasAI() ? t('priv.aiOn') : t('priv.aiOff')}</p>
      <button class="btn" data-action="wipe">${icon('i-x')}${t('priv.wipe')}</button>
    </section>
    <section class="card span-6" aria-labelledby="ex-t">
      <div class="card-head"><h2 id="ex-t">${t('priv.export')}</h2><span class="badge b-good">${t('priv.free')}</span></div>
      <p class="card-sub">${t('priv.exportBody')}</p>
      <div class="btn-row">
        <button class="btn btn-primary" type="button" id="ex-csv">${icon('i-down')}${t('priv.csv')}</button>
        <button class="btn" type="button" id="ex-json">${icon('i-down')}${t('priv.backup')}</button>
        <label class="btn">${icon('i-up')}${t('priv.restore')}<input type="file" id="ex-file" accept=".json,application/json" class="sr-only"></label>
      </div>
    </section>
    <section class="card span-6" aria-labelledby="of-t">
      <div class="card-head"><h2 id="of-t">${t('priv.offline')}</h2></div>
      <p class="card-sub">${t('priv.offlineBody')}</p>
      <p class="muted small" id="of-state">${t(navigator.onLine ? 'priv.online' : 'priv.isOffline')}</p>
    </section>
  </div>`;
}

export function mount(root) {
  root.querySelector('#ex-csv').addEventListener('click', () => toast(t('priv.csvDone', { n: exportCsv() })));
  root.querySelector('#ex-json').addEventListener('click', () => { exportBackup(); toast(t('priv.backupDone')); });
  root.querySelector('#ex-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast(t('priv.badFile')); return; }
    toast(readBackup(await f.text()) ? t('priv.restored') : t('priv.badFile'));
  });
}
