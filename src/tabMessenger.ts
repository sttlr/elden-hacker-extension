import { wait } from './utils';
import type { Actions } from './types';

async function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting tab:', chrome.runtime.lastError);
                resolve(undefined);
            } else {
                resolve(tab);
            }
        });
    });
}

async function sendMessage(tabId: number, action: Actions) {
    return new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

async function trySendWithRetries(tabId: number, action: Actions, attempts = 3) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            await sendMessage(tabId, action);
            return;
        } catch (error) {
            console.error(`Error sending message (attempt ${attempt + 1}):`, error);
            if (attempt < attempts - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                await wait(delay);
            } else {
                throw error;
            }
        }
    }
}

async function injectContentScript(tabId: number) {
    await new Promise<void>((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

async function injectFallback(tabId: number) {
    await new Promise<void>((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                console.log('Content script injected via fallback');
            }
        }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

export async function dispatchActionToTab(tabId: number, action: Actions) {
    const tab = await getTab(tabId);
    if (!tab || !tab.active) {
        throw new Error('Unable to dispatch action to inactive or missing tab');
    }

    try {
        await trySendWithRetries(tabId, action);
    } catch (error) {
        console.error('Initial dispatch failed, attempting to inject content script:', error);
        try {
            await injectContentScript(tabId);
            await wait(500);
            await trySendWithRetries(tabId, action);
        } catch (injectionError) {
            console.error('Injection attempt failed, trying fallback script:', injectionError);
            try {
                await injectFallback(tabId);
                await wait(500);
                await trySendWithRetries(tabId, action);
            } catch (fallbackError) {
                console.error('Fallback injection also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }
}
