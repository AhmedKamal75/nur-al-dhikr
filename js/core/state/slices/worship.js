/**
 * core/state/slices/worship.js — worship-and-practice slice of the store
 * reducer.
 *
 * Owns fasting prefs, sadaqah, sunnah/qada/location profiles, dua journal,
 * reflections, Ramadan logs/planner, zakat, checklist + prayer log, quiz
 * and plan import. Pure (state, action) => state; returns undefined when
 * the action belongs to another slice (the dispatcher in ../reducer.js
 * tries each in turn).
 */

import { CHECKLIST_ITEMS } from '../../config.js';
import { dateKey, uid } from '../../utils.js';
import { FASTING_CATEGORIES } from '../../../domain/fasting.js';
import { PRAYER_KEYS, cycleState } from '../../../domain/prayerLog.js';
import {
  addBacklog as addQadaBacklog,
  completeOldest as completeOldestQada,
} from '../../../domain/qada.js';
import {
  makeProfile as makeLocationProfile,
  profileToPrayerPatch,
} from '../../../domain/locations.js';

export function reduceWorship(state, action) {
  switch (action.type) {
    // Voluntary fasting prefs (v3.18) — guarded enum mutations; the fasts
    // themselves ride the generic RAMADAN_FAST_TOGGLE on non-Ramadan keys.
    case 'FASTING_TOGGLE_CATEGORY': {
      if (!FASTING_CATEGORIES.includes(action.cat)) return state;
      const cur = state.fastingPrefs[action.cat] ?? { enabled: false, remind: false };
      return {
        ...state,
        fastingPrefs: {
          ...state.fastingPrefs,
          [action.cat]: { ...cur, enabled: !cur.enabled },
        },
      };
    }
    case 'FASTING_TOGGLE_REMIND': {
      if (!FASTING_CATEGORIES.includes(action.cat)) return state;
      const cur = state.fastingPrefs[action.cat] ?? { enabled: false, remind: false };
      return {
        ...state,
        fastingPrefs: {
          ...state.fastingPrefs,
          [action.cat]: { ...cur, remind: !cur.remind },
        },
      };
    }
    case 'FASTING_SET_REMIND_TIME': {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(action.time))) return state;
      return { ...state, fastingPrefs: { ...state.fastingPrefs, remindTime: action.time } };
    }

    // Quick-log sadaqah (v3.19) — entries are timestamps with an optional
    // note; "given today" counts entries, never amounts (no amount field).
    case 'SADAQAH_LOG':
      return {
        ...state,
        sadaqahLog: [
          { id: uid('sadaqah'), ts: Date.now(), note: String(action.note || '').slice(0, 200) },
          ...state.sadaqahLog,
        ].slice(0, 500),
      };
    case 'SADAQAH_REMOVE':
      return { ...state, sadaqahLog: state.sadaqahLog.filter((e) => e.id !== action.id) };

    /* -------------------------------------------------------------- */
    /* (v4.4) Sunnah prayers / qada' / locations / journal / planner  */
    /* -------------------------------------------------------------- */

    case 'SUNNAH_TOGGLE': {
      const key = dateKey(new Date());
      const day = { ...(state.sunnahLog[key] || {}) };
      day[action.id] = !day[action.id];
      return { ...state, sunnahLog: { ...state.sunnahLog, [key]: day } };
    }

    case 'QADA_ADD':
      return {
        ...state,
        qadaLog: [
          ...addQadaBacklog(state.qadaLog, action.prayer, action.n, {
            reason: action.reason,
            date: action.date,
          }),
        ].slice(0, 1000),
      };

    case 'QADA_COMPLETE': {
      const next = completeOldestQada(state.qadaLog, action.prayer);
      return next === state.qadaLog ? state : { ...state, qadaLog: next };
    }

    case 'QADA_REMOVE_ALL':
      return {
        ...state,
        qadaLog: state.qadaLog.filter((e) => e.doneAt || e.prayer !== action.prayer),
      };

    case 'LOCATION_PROFILE_SAVE': {
      const profile = makeLocationProfile({
        id: action.id,
        name: action.name,
        prayer: state.settings.prayer,
      });
      const rest = state.locationProfiles.filter(
        (p) => p.id !== profile.id && p.name !== profile.name
      );
      return { ...state, locationProfiles: [...rest, profile].slice(0, 5) };
    }

    case 'LOCATION_PROFILE_APPLY': {
      const profile = state.locationProfiles.find((p) => p.id === action.id);
      if (!profile) return state;
      return {
        ...state,
        settings: {
          ...state.settings,
          prayer: { ...state.settings.prayer, ...profileToPrayerPatch(profile) },
        },
      };
    }

    case 'LOCATION_PROFILE_REMOVE':
      return {
        ...state,
        locationProfiles: state.locationProfiles.filter((p) => p.id !== action.id),
      };

    case 'DUA_JOURNAL_ADD':
      return {
        ...state,
        duaJournal: [
          {
            id: uid('dua'),
            ts: Date.now(),
            date: dateKey(new Date()),
            text: String(action.text || '').slice(0, 4000),
            answered: false,
            answeredTs: null,
          },
          ...state.duaJournal,
        ].slice(0, 1000),
      };

    case 'DUA_JOURNAL_TOGGLE_ANSWERED': {
      const next = state.duaJournal.map((e) =>
        e.id === action.id
          ? { ...e, answered: !e.answered, answeredTs: !e.answered ? Date.now() : null }
          : e
      );
      return { ...state, duaJournal: next };
    }

    case 'DUA_JOURNAL_REMOVE':
      return { ...state, duaJournal: state.duaJournal.filter((e) => e.id !== action.id) };

    case 'REFLECTION_ADD':
      return {
        ...state,
        reflections: [
          {
            id: uid('refl'),
            ts: Date.now(),
            week: String(action.week || ''),
            promptId: String(action.promptId || ''),
            text: String(action.text || '').slice(0, 8000),
          },
          ...state.reflections,
        ].slice(0, 500),
      };

    case 'REFLECTION_REMOVE':
      return { ...state, reflections: state.reflections.filter((e) => e.id !== action.id) };

    case 'RAMADAN_PLANNER_TOGGLE': {
      // Shared by taraweeh / i'tikaf / last-ten checklist; `slice` is the
      // persisted map name, `key` the hijri year-month, `day` the day.
      const map = state[action.slice] || {};
      const month = { ...(map[action.key] || {}) };
      month[action.day] = !month[action.day];
      return { ...state, [action.slice]: { ...map, [action.key]: month } };
    }

    case 'RAMADAN_FAST_TOGGLE': {
      const key = action.logKey;
      const entry = state.ramadanLog[key] || {};
      return {
        ...state,
        ramadanLog: { ...state.ramadanLog, [key]: { ...entry, [action.day]: !entry[action.day] } },
      };
    }

    case 'ZAKAT_PREFS_SET':
      return {
        ...state,
        zakat: { ...state.zakat, prefs: { ...state.zakat.prefs, ...action.patch } },
      };

    case 'ZAKAT_INPUT_SET':
      return {
        ...state,
        zakat: { ...state.zakat, inputs: { ...state.zakat.inputs, [action.field]: action.value } },
      };

    case 'ZAKAT_INPUTS_CLEAR':
      return {
        ...state,
        zakat: {
          ...state.zakat,
          inputs: {
            cash: '',
            goldGrams: '',
            silverGrams: '',
            investments: '',
            businessGoods: '',
            receivables: '',
            otherAssets: '',
            liabilities: '',
          },
        },
      };

    case 'ZAKAT_SNAPSHOT_SAVE':
      return { ...state, zakatHistory: [action.snapshot, ...state.zakatHistory].slice(0, 30) };

    case 'ZAKAT_SNAPSHOT_DELETE':
      return { ...state, zakatHistory: state.zakatHistory.filter((s) => s.id !== action.id) };

    case 'ZAKAT_SNAPSHOT_UPDATE':
      return {
        ...state,
        zakatHistory: state.zakatHistory.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s
        ),
      };

    case 'CHECKLIST_TOGGLE': {
      // FIX (review v3.1 A7/B4): accept only known checklist item ids — a
      // forged data-item used to store arbitrary garbage rows (even a
      // literal "__proto__" key) into the persisted map.
      if (!CHECKLIST_ITEMS.some((i) => i.id === action.item)) return state;
      const key = action.date || dateKey(new Date());
      const day = state.dailyChecklist[key] || {};
      return {
        ...state,
        dailyChecklist: {
          ...state.dailyChecklist,
          [key]: { ...day, [action.item]: !day[action.item] },
        },
      };
    }

    case 'CHECKLIST_DAY_RESET': {
      // (v4.6.0) Clear one day's checklist (the sheet's "start fresh").
      const key = action.date || dateKey(new Date());
      if (!(key in state.dailyChecklist)) return state;
      const dailyChecklist = { ...state.dailyChecklist };
      delete dailyChecklist[key];
      return { ...state, dailyChecklist };
    }

    case 'PRAYER_LOG_CYCLE': {
      // Tri-state prayer log riding the same dailyChecklist map the habit
      // checklist uses (see js/prayerLog.js for the storage contract).
      // Only the five fard prayers are ever cyclable; anything else no-ops.
      if (!PRAYER_KEYS.includes(action.item)) return state;
      const key = dateKey(new Date());
      const day = state.dailyChecklist[key] || {};
      const next = cycleState(day[action.item]);
      const newDay = { ...day };
      if (next == null) delete newDay[action.item];
      else newDay[action.item] = next;
      return { ...state, dailyChecklist: { ...state.dailyChecklist, [key]: newDay } };
    }

    case 'QUIZ_START':
      return {
        ...state,
        quiz: {
          deck: action.deck,
          index: 0,
          correctCount: 0,
          wrongCount: 0,
          revealed: false,
          selectedId: null,
          finished: false,
        },
      };

    case 'QUIZ_ANSWER': {
      if (state.quiz.revealed || !state.quiz.deck.length) return state;
      const q = state.quiz.deck[state.quiz.index];
      const correct = q && action.itemId === q.itemId;
      return {
        ...state,
        quiz: {
          ...state.quiz,
          revealed: true,
          selectedId: action.itemId,
          correctCount: state.quiz.correctCount + (correct ? 1 : 0),
          wrongCount: state.quiz.wrongCount + (correct ? 0 : 1),
        },
      };
    }

    case 'QUIZ_NEXT': {
      if (!state.quiz.deck.length) return state;
      const nextIndex = state.quiz.index + 1;
      const finished = nextIndex >= state.quiz.deck.length;
      const nextQuiz = {
        ...state.quiz,
        index: nextIndex,
        revealed: false,
        selectedId: null,
        finished,
      };
      if (!finished) return { ...state, quiz: nextQuiz };
      return {
        ...state,
        quiz: nextQuiz,
        quizStats: {
          bestScore: Math.max(state.quizStats.bestScore, state.quiz.correctCount),
          totalAttempts: state.quizStats.totalAttempts + 1,
          totalCorrect: state.quizStats.totalCorrect + state.quiz.correctCount,
        },
      };
    }

    case 'QUIZ_EXIT':
      return {
        ...state,
        quiz: {
          deck: [],
          index: 0,
          correctCount: 0,
          wrongCount: 0,
          revealed: false,
          selectedId: null,
          finished: false,
        },
      };

    // (v4.4) Plan import — merges ONLY the plan keys from a family member's
    // exported plan file; personal history/logs are never touched.
    case 'PLAN_IMPORT': {
      const plan = action.plan || {};
      const next = { ...state };
      if (plan.khatmaPlan) next.khatmaPlan = plan.khatmaPlan;
      if (plan.dailyGoal) next.settings = { ...next.settings, dailyGoal: plan.dailyGoal };
      if (plan.tasbihTargets) {
        const counters = { ...next.counters };
        for (const [id, target] of Object.entries(plan.tasbihTargets)) {
          counters[id] = {
            ...(counters[id] || { count: 0, completedCycles: 0, lastUpdated: 0 }),
            target,
          };
        }
        next.counters = counters;
      }
      return next;
    }

    default:
      return undefined;
  }
}
