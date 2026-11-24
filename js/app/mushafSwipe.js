import { store, actions } from '../core/state.js';
import { VIEWS } from '../core/config.js';
import { clamp } from '../core/utils.js';
import { findTouch, isSwipeGuardTarget, mushafSwipeTurn } from '../domain/gestures.js';
import {
  mushafRoutePage,
  mushafSpreadActive,
  nextSpreadPage,
  prevSpreadPage,
} from '../services/mushaf.js';
import { ensureMushafNavigationPages } from './lazyData.js';
import { navigateMushafPage } from './handlers/quran.js';
import { takeoverManualZoom } from './autoFit.js';

/** Owns only the temporary paper surfaces, never scripture or reader state. */
export function initMushafSwipe() {
  let gesture = null;
  let settling = false;
  let active = null;
  let pinch = null;
  let suppressClickUntil = 0;
  let renderBook = null;
  const motion = () =>
    store.getState().settings.mushafPrefs.pageFlipAnimation !== false &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const current = (g) =>
    store.getState().activeView === VIEWS.MUSHAF &&
    mushafRoutePage(store.getState()).page === g.page;
  const destination = (g, sign) => {
    if (g.spread) return sign > 0 ? nextSpreadPage(g.page) : prevSpreadPage(g.page);
    const n = g.page + sign;
    return n < 1 || n > 604 ? null : n;
  };
  function cleanup(g) {
    if (g?.stage) {
      for (const el of [g.outgoing, g.incoming])
        for (const animation of el.getAnimations()) animation.cancel();
      g.stage.remove();
    }
    if (active === g) active = null;
    document.body.classList.remove('is-mushaf-dragging');
    settling = false;
  }
  function surfaces(g, sign) {
    const dest = destination(g, sign);
    const state = store.getState();
    if (!renderBook || !state.mushaf.pages[String(dest)] || !motion()) return false;
    if (!g.stage) {
      const book = document.querySelector('.mushaf-book');
      if (!book) return false;
      const box = book.getBoundingClientRect();
      const navTop =
        document.querySelector('#bottomnav')?.getBoundingClientRect().top || window.innerHeight;
      const bottom = Math.min(window.innerHeight, navTop > box.top ? navTop : window.innerHeight);
      const stage = document.createElement('div');
      stage.className = 'mushaf-drag-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.inert = true;
      stage.style.cssText = `left:${box.left}px;top:${Math.max(0, box.top)}px;width:${box.width}px;height:${Math.min(box.bottom, bottom) - Math.max(0, box.top)}px`;
      const outgoing = book.cloneNode(true);
      outgoing.classList.add('mushaf-drag-outgoing');
      outgoing.style.cssText = `position:absolute;top:${Math.min(0, box.top)}px;width:${box.width}px`;
      stage.append(outgoing);
      document.body.append(stage);
      g.stage = stage;
      g.outgoing = outgoing;
      g.width = box.width;
      g.bookTop = Math.min(0, box.top);
      document.body.classList.add('is-mushaf-dragging');
    }
    if (g.sign !== sign) {
      g.incoming?.remove();
      const holder = document.createElement('div');
      holder.innerHTML = renderBook(
        { ...state, activeParams: { page: String(dest) } },
        { preview: true }
      );
      const incoming = holder.querySelector('.mushaf-book');
      if (!incoming) return false;
      incoming.classList.add('mushaf-drag-incoming');
      incoming.dataset.page = String(dest);
      incoming.style.cssText = `position:absolute;top:${g.bookTop}px;width:${g.width}px`;
      // The overlay is outside #main. Copy inherited page/theme variables.
      const original = document.querySelector('.mushaf-page-wrap');
      if (original) {
        const cs = getComputedStyle(original);
        for (const name of [
          '--mushaf-gold',
          '--mushaf-gold-soft',
          '--mushaf-paper-bg',
          '--mushaf-paper-ink',
          '--mushaf-paper-border',
        ])
          g.stage.style.setProperty(name, cs.getPropertyValue(name));
      }
      g.stage.append(incoming);
      g.incoming = incoming;
      g.sign = sign;
    }
    return true;
  }
  function paint(g, dx) {
    const sign = dx >= 0 ? 1 : -1;
    if (destination(g, sign) == null) {
      if (g.stage) {
        cleanup(g);
        g.stage = null;
        g.sign = null;
      }
      return;
    }
    if (!surfaces(g, sign)) return;
    g.offset = clamp(dx, -g.width, g.width);
    g.outgoing.style.transform = `translateX(${g.offset}px)`;
    g.incoming.style.transform = `translateX(${g.offset - sign * g.width}px)`;
  }
  async function finish(g, turn) {
    active = g;
    settling = true;
    if (g.stage) {
      const to = turn ? g.sign * g.width : 0;
      const duration = motion() ? Math.max(100, Math.min(240, Math.abs(to - g.offset) * 0.65)) : 0;
      const animations = [
        g.outgoing.animate(
          [{ transform: `translateX(${g.offset}px)` }, { transform: `translateX(${to}px)` }],
          { duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }
        ),
        g.incoming.animate(
          [
            { transform: `translateX(${g.offset - g.sign * g.width}px)` },
            { transform: `translateX(${to - g.sign * g.width}px)` },
          ],
          { duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }
        ),
      ];
      await Promise.all(animations.map((a) => a.finished.catch(() => {})));
    }
    if (turn && !g.aborted && current(g)) {
      g.committing = true;
      await navigateMushafPage(turn, { animate: !g.stage });
    }
    // Keep the incoming paper until the routed reader has rendered that page.
    if (turn && g.stage && !g.aborted) {
      const dest = destination(g, turn === 'next' ? 1 : -1);
      const started = performance.now();
      while (
        store.getState().activeView === VIEWS.MUSHAF &&
        document.querySelector('#main .mushaf-book')?.dataset.mushafPage !== String(dest) &&
        performance.now() - started < 1000
      ) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    cleanup(g);
  }
  const abort = () => {
    const g = gesture;
    gesture = null;
    pinch = null;
    if (g) void finish(g, null);
    if (active && !active.committing && !current(active)) {
      active.aborted = true;
      cleanup(active);
    }
  };
  document.addEventListener(
    'click',
    (e) => {
      if (performance.now() < suppressClickUntil && e.target.closest?.('.mushaf-book')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
  document.addEventListener(
    'touchstart',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF || settling) return;
      if (
        e.touches.length !== 1 ||
        !e.target.closest?.('.mushaf-book') ||
        isSwipeGuardTarget(e.target)
      ) {
        abort();
        return;
      }
      const touch = e.touches[0];
      const state = store.getState();
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        page: mushafRoutePage(state).page,
        spread: mushafSpreadActive(state.settings.mushafPrefs),
        lastX: touch.clientX,
        lastTime: performance.now(),
        velocity: 0,
        offset: 0,
      };
      void import('../views/mushafReader.js').then((m) => {
        renderBook = m.renderMushaf;
      });
      for (const sign of [-1, 1]) {
        const dest = destination(gesture, sign);
        if (dest != null) void ensureMushafNavigationPages(dest).catch(() => {});
      }
    },
    { passive: true }
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (store.getState().activeView !== VIEWS.MUSHAF) {
        abort();
        return;
      }
      if (e.touches.length === 2) {
        const savedPinch = pinch;
        abort();
        pinch = savedPinch;
        const [a, b] = e.touches;
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const scale = Number(store.getState().settings.mushafPrefs.fontScale) || 1;
        if (!pinch) pinch = { distance, scale };
        else {
          const next = clamp((pinch.scale * distance) / pinch.distance, 0.6, 2.2);
          if (Math.abs(next - scale) >= 0.04) {
            store.dispatch(actions.updateMushafPrefs({ fontScale: Math.round(next * 100) / 100 }));
            takeoverManualZoom();
          }
        }
        e.preventDefault();
        return;
      }
      const g = gesture;
      if (!g || !current(g)) return;
      const touch = findTouch(e.touches, g.id);
      if (!touch) return;
      const dx = touch.clientX - g.x,
        dy = touch.clientY - g.y;
      if (!g.dragging) {
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
          abort();
          return;
        }
        if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy)) return;
        g.dragging = true;
      }
      e.preventDefault();
      const now = performance.now();
      g.velocity = (touch.clientX - g.lastX) / Math.max(1, now - g.lastTime);
      g.lastX = touch.clientX;
      g.lastTime = now;
      paint(g, dx);
    },
    { passive: false }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (!e.touches.length) pinch = null;
      const g = gesture;
      if (!g) return;
      const touch = findTouch(e.changedTouches, g.id);
      if (!touch) return;
      gesture = null;
      const dx = touch.clientX - g.x,
        dy = touch.clientY - g.y;
      let turn = mushafSwipeTurn(dx, dy);
      if (
        !turn &&
        Math.abs(dx) >= 28 &&
        Math.abs(dx) > Math.abs(dy) &&
        Math.sign(g.velocity) === Math.sign(dx) &&
        Math.abs(g.velocity) > 0.55 &&
        performance.now() - g.lastTime < 100
      )
        turn = dx > 0 ? 'next' : 'prev';
      if (!g.dragging || !current(g) || destination(g, dx > 0 ? 1 : -1) == null) turn = null;
      if (g.dragging) suppressClickUntil = performance.now() + 400;
      if (motion() && !g.stage) turn = null;
      if (g.stage && Math.sign(dx) !== g.sign) {
        cleanup(g);
        g.stage = null;
        turn = null;
      }
      void finish(g, turn);
    },
    { passive: true }
  );
  document.addEventListener('touchcancel', abort, { passive: true });
  window.addEventListener('pagehide', () => {
    if (active) {
      active.aborted = true;
      cleanup(active);
    }
    abort();
  });
  store.subscribe(() => {
    if ((gesture && !current(gesture)) || (active && !active.committing && !current(active)))
      abort();
  });
}
