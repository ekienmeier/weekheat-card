// Persistent notifications: the room automations raise them (a period applied late, a state too
// long), and the card shows Weekheat's as banners.

/**
 * @typedef {object} Notification
 * @property {string} notification_id
 * @property {string} message
 * @property {string} [title]
 */

/**
 * Follow the persistent notifications.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {(notes: Record<string, Notification>) => void} onChange gets all of them after a change
 * @returns {Promise<() => void>} ends the subscription
 */
export function subscribeNotifications(gateway, onChange) {
  const notes = {};
  return gateway.subscribe({ type: 'persistent_notification/subscribe' }, (message) => {
    const changed = Object.keys(message.notifications || {});
    if (message.type === 'removed') changed.forEach((id) => delete notes[id]);
    else Object.assign(notes, message.notifications);
    onChange({ ...notes });
  });
}

/**
 * The notifications that the Weekheat automations raised.
 * @param {Record<string, Notification>} notes
 * @returns {Notification[]}
 */
export function weekheatNotes(notes) {
  return Object.values(notes).filter((note) =>
    String(note.notification_id).startsWith('weekheat_'),
  );
}

/**
 * Dismiss a notification.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export function dismissNotification(gateway, id) {
  return gateway.service('persistent_notification', 'dismiss', { notification_id: id });
}
