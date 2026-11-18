// Small pieces the views share: buttons, labelled fields, options, an action row, a save bar.

import { html } from 'lit';

/**
 * A button.
 * @param {unknown} label its content
 * @param {() => unknown} onClick
 * @param {{kind?: string, disabled?: boolean, aria?: string}} [options] its classes ("btn small"
 *   by default), whether it is disabled, and a label for screen readers
 * @returns {unknown}
 */
export function button(
  label,
  onClick,
  { kind = 'btn small', disabled = false, aria = undefined } = {},
) {
  return html`<button class=${kind} ?disabled=${disabled} aria-label=${aria ?? label}
    @click=${onClick}>${label}</button>`;
}

/**
 * A labelled text field that reports every change (so nothing typed is lost).
 * @param {string} label
 * @param {string | number} value
 * @param {(value: string) => void} onInput
 * @returns {unknown}
 */
export function textField(label, value, onInput) {
  return html`<label class="field">${label}
    <input .value=${String(value ?? '')} @input=${(event) => onInput(event.target.value)}></label>`;
}

/**
 * A labelled number field.
 * @param {string} label
 * @param {string | number} value
 * @param {{min: number, max: number, step: number, onInput: (value: string) => void}} field
 * @returns {unknown}
 */
export function numberField(label, value, { min, max, step, onInput }) {
  return html`<label class="field">${label}
    <input type="number" inputmode="numeric" min=${min} max=${max} step=${step}
      .value=${String(value)} @input=${(event) => onInput(event.target.value)}></label>`;
}

/**
 * The options of a select, one of them selected.
 * @param {Array<[string, string]>} list value and label
 * @param {string} selected
 * @returns {unknown[]}
 */
export function options(list, selected) {
  return list.map(
    ([value, label]) =>
      html`<option value=${value} ?selected=${value === selected}>${label}</option>`,
  );
}

/**
 * A labelled select.
 * @param {string} label
 * @param {{list: Array<[string, string]>, selected: string, onChange: (value: string) => void,
 *   disabled?: boolean}} choice
 * @returns {unknown}
 */
export function selectField(label, { list, selected, onChange, disabled = false }) {
  return html`<label class="field">${label}
    <select ?disabled=${disabled} @change=${(event) => onChange(event.target.value)}>
      ${options(list, selected)}</select></label>`;
}

/**
 * A row of buttons, right-aligned.
 * @param {...unknown} items
 * @returns {unknown}
 */
export function actionRow(...items) {
  return html`<div class="actions"><span class="grow"></span>${items}</div>`;
}

/**
 * The bar shown while an editor has unsaved changes: Cancel and Save.
 * @param {string[]} words "not saved", "cancel", "save" in the user's language
 * @param {{cancel: () => unknown, save: () => unknown, disabled?: boolean}} actions
 * @returns {unknown}
 */
export function saveBar([unsaved, cancel, save], actions) {
  return html`<div class="save-bar"><span>${unsaved}</span><span class="grow"></span>
    ${button(cancel, actions.cancel, { kind: 'btn flat small' })}
    ${button(save, actions.save, { disabled: actions.disabled })}</div>`;
}
