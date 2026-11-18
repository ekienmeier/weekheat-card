// The card element: Home Assistant's interface (config, hass, the element's lifecycle) and the
// wiring of the parts. It holds no logic and builds no markup of its own.

import { LitElement, html } from 'lit';
import { cardConfig } from './config.js';
import { watchDirectory } from './ha/directory.js';
import { Gateway } from './ha/gateway.js';
import { subscribeNotifications } from './ha/notifications.js';
import { rememberedLayout } from './state/actions/navigation.js';
import { makeContext } from './state/context.js';
import { load } from './state/loader.js';
import { watchedStates } from './state/selectors.js';
import { Store } from './state/store.js';
import { STYLES } from './ui/styles/index.js';
import { cardView } from './ui/views/app.js';

/** How often the card reads rooms, plans and days again, in ms. */
const RELOAD_MS = 10 * 60 * 1000;

/** How often the card renders again for the time (the period now, the line in the chart), in ms. */
const TICK_MS = 60 * 1000;

/**
 * A subscription that, if Home Assistant refuses it, logs why and ends as nothing: the card works
 * without banners or the directory watch, as on an older Home Assistant.
 * @param {Promise<() => void>} subscription
 * @returns {Promise<() => void>}
 */
function tolerant(subscription) {
  return subscription.catch((error) => {
    console.warn('Weekheat: a subscription was refused', error);
    return () => {};
  });
}

/** The card `custom:weekheat-card`. */
export class WeekheatCard extends LitElement {
  static styles = STYLES;

  /** A card with nothing loaded; it re-renders whenever its store changes. */
  constructor() {
    super();
    this.store = new Store();
    this.gateway = new Gateway();
    /** @type {import('./state/context.js').Context | null} */
    this.ctx = null;
    /** The fingerprint of the states shown, see watchedStates. */
    this.watched = '';
    /** @type {Array<Promise<() => void>>} subscriptions to end when the card leaves the page */
    this.subscriptions = [];
    /** @type {Array<ReturnType<typeof setInterval>> | null} */
    this.timers = null;
    this.store.subscribe(() => this.requestUpdate());
  }

  /**
   * Home Assistant's call with the card's options; invalid ones throw (see cardConfig).
   * @param {Record<string, any>} config
   */
  setConfig(config) {
    const settings = cardConfig(config);
    this.ctx = makeContext({ store: this.store, gateway: this.gateway, config: settings });
    this.store.ui.layout = rememberedLayout() || settings.layout;
    this.start();
    this.requestUpdate();
  }

  /**
   * Home Assistant's object, new on every state change in the home; the card renders again only
   * when a state it shows changed.
   * @param {any} hass
   */
  set hass(hass) {
    this.gateway.use(hass);
    this.start();
    if (!this.ctx) return;
    const watched = watchedStates(this.ctx);
    if (watched !== this.watched) this.requestUpdate();
    this.watched = watched;
  }

  /** On the page: load, and start the timers and subscriptions. */
  connectedCallback() {
    super.connectedCallback();
    this.start();
  }

  /** Off the page (Home Assistant detaches cards, e.g. when the view changes): stop them. */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  /** Start loading, the timers and the subscriptions, once the card is on the page and set up. */
  start() {
    if (!this.isConnected || !this.gateway.hass || !this.ctx || this.timers) return;
    const ctx = this.ctx;
    this.timers = [
      setInterval(() => load(ctx), RELOAD_MS),
      setInterval(() => this.requestUpdate(), TICK_MS),
    ];
    const notes = (all) => ctx.store.update((store) => (store.data.notes = all));
    this.subscriptions = [tolerant(subscribeNotifications(this.gateway, notes))];
    if (!this.gateway.isAdmin)
      this.subscriptions.push(tolerant(watchDirectory(this.gateway, () => load(ctx))));
    load(ctx);
  }

  /** Stop the timers and end the subscriptions. */
  stop() {
    (this.timers || []).forEach((timer) => clearInterval(timer));
    this.timers = null;
    this.subscriptions.forEach((subscription) => subscription.then((end) => end()));
    this.subscriptions = [];
  }

  /**
   * The card's content.
   * @returns {unknown}
   */
  render() {
    if (!this.ctx || !this.gateway.hass) return html`<ha-card></ha-card>`;
    return cardView(this.ctx);
  }

  /**
   * The card's height in the masonry view, in units of 50 px.
   * @returns {number}
   */
  getCardSize() {
    return 2 + (this.store.data.rooms?.length ?? 1);
  }

  /**
   * The options a new card starts with in the card picker.
   * @returns {object}
   */
  static getStubConfig() {
    return {};
  }
}
