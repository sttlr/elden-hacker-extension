import { debug } from './logger';
import { dispatchActionToTab } from './tabMessenger';
import { notificationDefinitions } from './notifications';
import type { DispatchActionMessage } from './types';

function isDispatchActionMessage(message: unknown): message is DispatchActionMessage {
    if (typeof message !== 'object' || message === null || !('action' in message)) {
        return false;
    }

    const action = message.action;
    return typeof action === 'string' && Object.hasOwn(notificationDefinitions, action);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isDispatchActionMessage(message) || sender.tab?.id === undefined) {
        return;
    }

    const tabId = sender.tab.id;
    debug(`Dispatching ${message.action}`);
    dispatchActionToTab(tabId, message.action).catch((error) => {
        console.error('dispatchActionToTab failed:', error);
    });
    sendResponse({ received: true });
});
