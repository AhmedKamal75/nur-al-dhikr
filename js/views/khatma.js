/**
 * views/khatma.js — the Khatma (Qur'an completion) tracker: progress
 * panel, plan editor, history (extracted from views/mushafReader.js,
 * Blueprint E step 2). Pure string templates over domain/khatma.js status.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { MUSHAF_PAGE_COUNT } from '../core/config.js';
import { planStatus, justCompletedKhatma } from '../domain/khatma.js';

export function buildMushafTrack(state) {
  const lang = state.settings.language;
  const readCount = Object.keys(state.mushafPagesRead).length;
  const pct = Math.round((readCount / MUSHAF_PAGE_COUNT) * 100);

  // Khatma plan block: pure status from js/khatma.js, rendered compactly.
  const status = planStatus({ pagesRead: state.mushafPagesRead, plan: state.khatmaPlan });
  const plan = state.khatmaPlan;
  const fmtDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  let planRows = '';
  if (plan) {
    const bits = [];
    if (plan.dailyTarget && status.todayEnd) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.todayTarget', lang, { a: status.todayStart, b: status.todayEnd })}</span>`
      );
    }
    if (plan.dailyTarget && status.pace != null) {
      bits.push(
        `<span class="mushaf-khatma__bit" dir="ltr">${t('khatma.pace', lang, { n: status.pace })}</span>`
      );
    }
    if (
      plan.targetDate &&
      status.requiredPerDay != null &&
      Number.isFinite(status.requiredPerDay)
    ) {
      bits.push(
        `<span class="mushaf-khatma__bit" dir="ltr">${t('khatma.neededPerDay', lang, { n: status.requiredPerDay })}</span>`
      );
    }
    if (plan.targetDate) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.deadline', lang, { date: fmtDate(plan.targetDate) })}</span>`
      );
    }
    if (status.projectedFinishISO) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.projected', lang, { date: fmtDate(status.projectedFinishISO) })}</span>`
      );
    }
    // One honest verdict, in priority order: finished > behind the daily
    // schedule > ahead of the daily schedule > pace/projection verdicts.
    let verdictText = '';
    let verdictCls = '';
    let verdictCelebrate = false;
    if (status.complete) {
      verdictText = t('khatma.completeBanner', lang);
      verdictCls = 'mushaf-khatma__verdict--done';
      // v3.12: one-shot bloom stamped only while the completion stamp in
      // khatmaHistory is fresh — later re-renders of the same banner stay
      // silent (see js/celebrate.js for the contract).
      verdictCelebrate = justCompletedKhatma(state);
    } else if (status.behindBy > 0) {
      verdictText = t('khatma.behind', lang, { n: status.behindBy });
      verdictCls = 'mushaf-khatma__verdict--warn';
    } else if (status.todayEnd && status.read >= status.todayEnd) {
      verdictText = t('khatma.ahead', lang);
      verdictCls = 'mushaf-khatma__verdict--good';
    } else if (status.onTrack === true) {
      verdictText = t('khatma.onTrack', lang);
      verdictCls = 'mushaf-khatma__verdict--good';
    } else if (status.onTrack === false) {
      verdictText = t('khatma.behindSchedule', lang);
      verdictCls = 'mushaf-khatma__verdict--warn';
    }
    planRows = `
    <div class="mushaf-khatma__bits">${bits.map((b) => `<span class="mushaf-khatma__bitwrap">${b}</span>`).join('')}</div>
    ${verdictText ? `<p class="mushaf-khatma__verdict ${verdictCls}${verdictCelebrate ? ' celebrate' : ''}">${verdictText}</p>` : ''}`;
  }

  const planButtons = `
    <div class="mushaf-khatma__actions">
      <button type="button" class="btn ${plan ? 'btn--secondary' : 'btn--primary'} btn--sm" data-action="khatma-open-plan">
        ${icon('target', { size: 14 })} ${t(plan ? 'khatma.editPlan' : 'khatma.setPlan', lang)}
      </button>
      ${plan ? `<button type="button" class="link-btn link-btn--sm" data-action="khatma-clear-plan">${t('khatma.clearPlan', lang)}</button>` : ''}
    </div>`;

  const historyLine = state.khatmaHistory?.length
    ? `<p class="mushaf-khatma__history">${icon('star', { size: 13 })} ${t('khatma.history', lang, { n: state.khatmaHistory.length })}${state.khatmaHistory[0]?.days ? ` · ${state.khatmaHistory[0].days === 1 ? t('khatma.lastDaysOne', lang) : t('khatma.lastDays', lang, { n: state.khatmaHistory[0].days })}` : ''}</p>`
    : '';

  return `
  <div class="mushaf-track">
    <h2 id="modal-title-mushaf-track">${t('mushaf.khatma', lang)}</h2>
    <p class="panel__subtext">${t('mushaf.trackHint', lang)}</p>
    <div class="mushaf-khatma">
      <div class="mushaf-khatma__head">
        <span class="mushaf-khatma__label">${t('mushaf.khatma', lang)}</span>
        <button type="button" class="link-btn link-btn--sm" data-action="mushaf-reset-progress">${t('mushaf.khatmaReset', lang)}</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${t('mushaf.khatmaProgress', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
      </div>
      <p class="mushaf-khatma__sub" dir="ltr">${readCount} / ${MUSHAF_PAGE_COUNT} · ${pct}%</p>
      ${planRows}
      ${planButtons}
      ${historyLine}
    </div>
  </div>`;
}

/** Khatma plan editor, opened from the progress panel. Pure template — the
 *  form is processed by the 'khatma-plan' handler in app.js. */
export function buildKhatmaPlanForm(state) {
  const lang = state.settings.language;
  const plan = state.khatmaPlan;
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const suggestion = 20;
  return `
  <div class="khatma-plan">
    <h2 id="modal-title-khatma-plan">${t('khatma.planTitle', lang)}</h2>
    <form class="editor-form" data-form="khatma-plan">
      <div class="khatma-plan__presets">
        <button type="button" class="btn btn--secondary btn--sm" data-action="khatma-ramadan-preset">
          ${icon('moon', { size: 14 })} ${t('khatma.ramadanPreset', lang)}
        </button>
        <span class="panel__subtext">${t('khatma.ramadanPresetHint', lang)}</span>
      </div>
      <label class="field-label" for="khatma-start-date">${t('khatma.startLabel', lang)}</label>
      <input class="input" type="date" id="khatma-start-date" name="startDate" value="${plan?.startDate || todayISO}" />

      <label class="field-label" for="khatma-target-date">${t('khatma.targetLabel', lang)}</label>
      <input class="input" type="date" id="khatma-target-date" name="targetDate" value="${plan?.targetDate || ''}" min="${todayISO}" />

      <label class="field-label" for="khatma-daily-target">${t('khatma.dailyLabel', lang)}</label>
      <input class="input" type="number" id="khatma-daily-target" name="dailyTarget" min="1" max="604" inputmode="numeric" placeholder="${suggestion}" value="${plan?.dailyTarget || ''}" />

      <p class="panel__subtext">${t('khatma.planHint', lang)}</p>
      <div class="khatma-plan__actions">
        <button type="submit" class="btn btn--primary">${icon('check', { size: 16 })} ${t('khatma.save', lang)}</button>
      </div>
    </form>
  </div>`;
}
