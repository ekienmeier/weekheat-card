// The card's entry: registers `custom:weekheat-card` and offers it in the card picker.

import { WeekheatCard } from './card.js';
import { VERSION } from './version.js';

if (!customElements.get('weekheat-card')) {
  customElements.define('weekheat-card', WeekheatCard);
  const description =
    'Heating plans with working-day and free-day plans for heat-only thermostats.';
  const page = /** @type {any} */ (window);
  page.customCards = page.customCards || [];
  page.customCards.push({ type: 'weekheat-card', name: 'Weekheat', description });
  console.info(`%c WEEKHEAT %c ${VERSION} `, 'background:#ff8a50;color:#fff', '');
}
