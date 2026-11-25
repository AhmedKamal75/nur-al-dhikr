/** Named, enabled values only. Reverting edits returns to the clean state. */
export function editorFormSnapshot(form) {
  return JSON.stringify([...new FormData(form).entries()]);
}

/** Opt-in custom authoring only; programmatic save/replace keeps its lifecycle. */
export function installEditorDiscardGuard(root, { close, text }) {
  const form = root.querySelector('form[data-editor-discard-guard]');
  if (!form) return () => {};
  const initial = editorFormSnapshot(form);
  const body = root.querySelector('.modal__body');
  const panel = root.querySelector('[data-modal-panel]');
  const closeButton = root.querySelector('.modal__close');
  const originalLabel = panel?.getAttribute('aria-labelledby');
  let prompt = null;
  let focus = form.querySelector('input,textarea,select');
  let scroll = 0;
  let selection = null;
  function remember(e) {
    if (form.contains(e.target) && e.target.matches('input,textarea,select')) focus = e.target;
  }
  function keep() {
    if (!prompt) return;
    prompt.remove();
    prompt = null;
    form.hidden = false;
    if (closeButton) closeButton.hidden = false;
    if (originalLabel) panel?.setAttribute('aria-labelledby', originalLabel);
    else panel?.removeAttribute('aria-labelledby');
    focus?.focus({ preventScroll: true });
    if (selection && typeof focus?.setSelectionRange === 'function') {
      try {
        focus.setSelectionRange(...selection);
      } catch {
        /* non-text input */
      }
    }
    body.scrollTop = scroll;
  }
  function ask() {
    if (prompt) return;
    scroll = body.scrollTop;
    selection =
      typeof focus?.selectionStart === 'number'
        ? [focus.selectionStart, focus.selectionEnd, focus.selectionDirection]
        : null;
    prompt = document.createElement('div');
    prompt.className = 'editor-discard';
    const message = document.createElement('h2');
    message.id = 'editor-discard-message';
    message.textContent = text.message;
    const buttons = document.createElement('div');
    buttons.className = 'editor-form__actions';
    const keepButton = document.createElement('button');
    keepButton.type = 'button';
    keepButton.className = 'btn btn--primary';
    keepButton.textContent = text.keep;
    const discardButton = document.createElement('button');
    discardButton.type = 'button';
    discardButton.className = 'btn btn--secondary';
    discardButton.textContent = text.discard;
    keepButton.addEventListener('click', keep);
    discardButton.addEventListener('click', close);
    buttons.append(keepButton, discardButton);
    prompt.append(message, buttons);
    form.hidden = true;
    if (closeButton) closeButton.hidden = true;
    body.append(prompt);
    panel?.setAttribute('aria-labelledby', message.id);
    keepButton.focus({ preventScroll: true });
    body.scrollTop = 0;
  }
  function click(e) {
    if (!e.target.closest('[data-action="modal-close"]') || !root.contains(e.target)) return;
    if (editorFormSnapshot(form) === initial) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    ask();
  }
  function key(e) {
    if (e.key !== 'Escape' || !root.classList.contains('is-open')) return;
    if (!prompt && editorFormSnapshot(form) === initial) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (prompt) keep();
    else ask();
  }
  root.addEventListener('focusin', remember);
  root.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  return () => {
    root.removeEventListener('focusin', remember);
    root.removeEventListener('click', click, true);
    document.removeEventListener('keydown', key, true);
  };
}
