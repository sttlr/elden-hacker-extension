import { debug } from './logger';
import { HANDLED_EVENT_NAMES } from './siteHandlers';
import type { NotificationEventPayload, DispatchActionMessage } from './types';

export function registerNotificationListeners() {
    const disposers = HANDLED_EVENT_NAMES.map((eventName) => {
        const listener = (event: CustomEvent<NotificationEventPayload>) => {
            const detail = event.detail;
            if (!detail) {
                return;
            }

            debug(`Received ${eventName}:`, detail);

            const message: DispatchActionMessage = {
                action: detail.action
            };

            const runtime = typeof chrome === 'undefined' ? undefined : chrome.runtime;
            if (!runtime?.sendMessage) {
                console.warn('[Elden] Extension runtime unavailable; reload this tab after reloading the extension.');
                return;
            }

            runtime.sendMessage(message).catch((err) => console.error('Message send error:', err));
        };

        window.addEventListener(eventName as string, listener as EventListener);
        return () => window.removeEventListener(eventName as string, listener as EventListener);
    });

    return () => disposers.forEach((dispose) => dispose());
}
