import { w as wait, d as debug } from "./utils.js";
async function getTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting tab:", chrome.runtime.lastError);
        resolve(void 0);
      } else {
        resolve(tab);
      }
    });
  });
}
async function sendMessage(tabId, action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
async function trySendWithRetries(tabId, action, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await sendMessage(tabId, action);
      return;
    } catch (error) {
      console.error(`Error sending message (attempt ${attempt + 1}):`, error);
      if (attempt < attempts - 1) {
        const delay = Math.pow(2, attempt) * 1e3;
        await wait(delay);
      } else {
        throw error;
      }
    }
  }
}
async function injectContentScript(tabId) {
  await new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
async function injectFallback(tabId) {
  await new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log("Content script injected via fallback");
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
async function dispatchActionToTab(tabId, action) {
  const tab = await getTab(tabId);
  if (!tab || !tab.active) {
    throw new Error("Unable to dispatch action to inactive or missing tab");
  }
  try {
    await trySendWithRetries(tabId, action);
  } catch (error) {
    console.error("Initial dispatch failed, attempting to inject content script:", error);
    try {
      await injectContentScript(tabId);
      await wait(500);
      await trySendWithRetries(tabId, action);
    } catch (injectionError) {
      console.error("Injection attempt failed, trying fallback script:", injectionError);
      try {
        await injectFallback(tabId);
        await wait(500);
        await trySendWithRetries(tabId, action);
      } catch (fallbackError) {
        console.error("Fallback injection also failed:", fallbackError);
        throw fallbackError;
      }
    }
  }
}
const notificationDefinitions = {
  realmEntered: { title: "REALM ENTERED", sound: "lostGraceDiscovered" },
  graceFulfilled: { title: "GRACE FULFILLED", sound: "playerLevelUp" },
  sigilFaltered: { title: "SIGIL FALTERED", sound: "enemyFailed", tone: "failure" },
  oathFulfilled: { title: "OATH FULFILLED", sound: "playerLevelUp" },
  oathForsaken: { title: "OATH FORSAKEN", sound: "enemyFailed", tone: "failure" },
  heresySpoken: { title: "HERESY SPOKEN", sound: "enemyFailed", tone: "failure" },
  truthUncovered: { title: "TRUTH UNCOVERED", sound: "newItem" },
  riddleUnsolved: { title: "RIDDLE UNSOLVED", sound: "enemyFailed", tone: "failure" },
  omenDeciphered: { title: "OMEN DECIPHERED", sound: "playerLevelUp" },
  trialAwakened: { title: "TRIAL AWAKENED", sound: "lostGraceDiscovered" },
  targetSummoned: { title: "TARGET SUMMONED", sound: "lostGraceDiscovered" },
  targetAbandoned: { title: "TARGET ABANDONED" },
  vesselAwakened: { title: "VESSEL AWAKENED", sound: "lostGraceDiscovered" },
  embersScattered: { title: "EMBERS SCATTERED" }
};
function isDispatchActionMessage(message) {
  if (typeof message !== "object" || message === null || !("action" in message)) {
    return false;
  }
  const action = message.action;
  return typeof action === "string" && Object.hasOwn(notificationDefinitions, action);
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isDispatchActionMessage(message) || sender.tab?.id === void 0) {
    return;
  }
  const tabId = sender.tab.id;
  debug(`Dispatching ${message.action}`);
  dispatchActionToTab(tabId, message.action).catch((error) => {
    console.error("dispatchActionToTab failed:", error);
  });
  sendResponse({ received: true });
});
