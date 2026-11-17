(function() {
  "use strict";
  function debug(...args) {
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
  function getValueByPath(obj, path) {
    let current = obj;
    for (const key of path.split(".")) {
      if (current === null || typeof current !== "object") {
        return void 0;
      }
      current = Object.getOwnPropertyDescriptor(current, key)?.value;
    }
    return current;
  }
  function messageIncludes(data, phrase) {
    const message = getValueByPath(data, "message");
    return typeof message === "string" && message.includes(phrase);
  }
  const siteHandlers = [
    {
      name: "tryhackme_room_join",
      urlPattern: "https://tryhackme.com/api/v*/rooms/join",
      eventName: "TRYHACKME_ROOM_JOIN_RESULT",
      soundPatterns: [],
      muteTimeout: 3e3,
      successAction: "realmEntered",
      parseResponse: (data) => Boolean(getValueByPath(data, "data"))
    },
    {
      name: "tryhackme_room_answer",
      urlPattern: "https://tryhackme.com/api/v*/rooms/answer",
      eventName: "TRYHACKME_ANSWER_RESULT",
      soundPatterns: ["correct-answer", "wrong-answer", "level-up"],
      muteTimeout: 3e3,
      successAction: "truthUncovered",
      failureAction: "heresySpoken",
      parseResponse: (data) => {
        const result = getValueByPath(data, "data.isCorrect");
        return typeof result === "boolean" ? result : void 0;
      }
    },
    {
      name: "hackthebox_challenge",
      urlPattern: "https://labs.hackthebox.com/api/v*/challenge/own",
      eventName: "HTB_CHALLENGE_ANSWER_RESULT",
      soundPatterns: ["machine_pwned", "sound-effects"],
      muteTimeout: 3e3,
      successAction: "graceFulfilled",
      failureAction: "sigilFaltered",
      parseResponse: (data) => !messageIncludes(data, "Incorrect flag")
    },
    {
      name: "hackthebox_machine",
      urlPattern: "https://labs.hackthebox.com/api/v*/machine/own",
      eventName: "HTB_MACHINE_ANSWER_RESULT",
      soundPatterns: ["machine_pwned", "sound-effects"],
      muteTimeout: 3e3,
      successAction: "graceFulfilled",
      failureAction: "sigilFaltered",
      parseResponse: (data) => !messageIncludes(data, "Incorrect Flag.")
    },
    {
      name: "hackthebox_academy",
      urlPattern: "https://academy.hackthebox.com/api/v*/answers",
      eventName: "HTB_ACADEMY_ANSWER_RESULT",
      soundPatterns: [],
      muteTimeout: 3e3,
      successAction: "oathFulfilled",
      failureAction: "oathForsaken",
      parseResponse: (data) => !messageIncludes(data, "Incorrect answer!")
    },
    {
      name: "hackthebox_sherlock_task",
      urlPattern: "https://labs.hackthebox.com/api/v*/sherlocks/*/tasks/*/flag",
      eventName: "HTB_SHERLOCK_TASK_ANSWER_RESULT",
      soundPatterns: ["machine_pwned", "sound-effects"],
      muteTimeout: 3e3,
      successAction: "omenDeciphered",
      failureAction: "riddleUnsolved",
      parseResponse: (data) => !messageIncludes(data, "Incorrect task flag!")
    },
    {
      name: "hackthebox_container_start",
      urlPattern: "https://labs.hackthebox.com/api/v*/container/start",
      method: "POST",
      eventName: "HTB_CONTAINER_START_RESULT",
      soundPatterns: ["machine_pwned", "sound-effects"],
      muteTimeout: 3e3,
      successAction: "trialAwakened",
      parseResponse: (data) => getValueByPath(data, "message") === "Instance Created!"
    },
    {
      name: "hackthebox_vm_spawn",
      urlPattern: "https://labs.hackthebox.com/api/v*/vm/spawn",
      method: "POST",
      eventName: "HTB_VM_SPAWN_RESULT",
      soundPatterns: ["machine_pwned", "sound-effects"],
      muteTimeout: 3e3,
      successAction: "targetSummoned",
      parseResponse: (data) => getValueByPath(data, "success") === true
    },
    {
      name: "hackthebox_vm_terminate",
      urlPattern: "https://labs.hackthebox.com/api/v*/vm/terminate",
      method: "POST",
      eventName: "HTB_VM_TERMINATE_RESULT",
      soundPatterns: [],
      muteTimeout: 3e3,
      successAction: "targetAbandoned",
      parseResponse: (data) => getValueByPath(data, "success") === true
    },
    {
      name: "hackthebox_academy_lab_start",
      urlPattern: "https://academy.hackthebox.com/api/v*/modules/*/sections/*/lab",
      method: "POST",
      eventName: "HTB_ACADEMY_LAB_START_RESULT",
      soundPatterns: [],
      muteTimeout: 3e3,
      successAction: "vesselAwakened",
      parseResponse: (data) => {
        const entrypoints = getValueByPath(data, "data.entrypoints");
        const labs = getValueByPath(data, "data.labs");
        return Array.isArray(entrypoints) && entrypoints.length > 0 || Array.isArray(labs) && labs.length > 0;
      }
    },
    {
      name: "hackthebox_academy_lab_stop",
      urlPattern: "https://academy.hackthebox.com/api/v*/modules/*/sections/*/lab",
      method: "DELETE",
      noResponseBody: true,
      eventName: "HTB_ACADEMY_LAB_STOP_RESULT",
      soundPatterns: [],
      muteTimeout: 3e3,
      successAction: "embersScattered",
      parseResponse: () => true
    }
  ];
  const HANDLED_EVENT_NAMES = siteHandlers.map((handler) => handler.eventName);
  function registerNotificationListeners() {
    const disposers = HANDLED_EVENT_NAMES.map((eventName) => {
      const listener = (event) => {
        const detail = event.detail;
        if (!detail) {
          return;
        }
        const message = {
          action: detail.action
        };
        const runtime = typeof chrome === "undefined" ? void 0 : chrome.runtime;
        if (!runtime?.sendMessage) {
          console.warn("[Elden] Extension runtime unavailable; reload this tab after reloading the extension.");
          return;
        }
        runtime.sendMessage(message).catch((err) => console.error("Message send error:", err));
      };
      window.addEventListener(eventName, listener);
      return () => window.removeEventListener(eventName, listener);
    });
    return () => disposers.forEach((dispose) => dispose());
  }
  const sounds = {
    newItem: "sounds/new-item.mp3",
    lostGraceDiscovered: "sounds/lost-grace-discovered.mp3",
    playerLevelUp: "sounds/player-level-up.mp3",
    enemyFailed: "sounds/enemy-failed.mp3"
  };
  const animations = {
    duration: 1e3,
    span: 3500,
    easings: {
      easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)"
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtension);
  } else {
    initializeExtension();
  }
  function initializeExtension() {
    injectPageScript();
  }
  function injectPageScript() {
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("inject.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    registerNotificationListeners();
  }
  function isNotificationAction(value) {
    return typeof value === "string" && Object.hasOwn(notificationDefinitions, value);
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isNotificationAction(message?.action)) {
      sendResponse({ received: false, error: "No valid action provided" });
      return false;
    }
    debug(`Showing banner for action: ${message.action}`);
    try {
      show(message.action);
      sendResponse({ received: true, action: message.action });
    } catch (error) {
      console.error("Error showing banner:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      sendResponse({ received: false, error: errorMessage });
    }
    return true;
  });
  function show(action, delay = 0) {
    if (!Object.hasOwn(notificationDefinitions, action)) {
      console.error(`Invalid action: ${action}`);
      return;
    }
    const banner = document.createElement("img");
    const bannerSrc = chrome.runtime.getURL(`banners/${action}.png`);
    banner.src = bannerSrc;
    banner.style.position = "fixed";
    banner.style.top = "0px";
    banner.style.right = "0px";
    banner.style.zIndex = "99999";
    banner.style.width = "100%";
    banner.style.height = "100vh";
    banner.style.objectFit = "cover";
    banner.style.objectPosition = "center";
    banner.style.opacity = "0";
    banner.style.pointerEvents = "none";
    banner.style.backgroundColor = "transparent";
    banner.onerror = () => {
      console.error("Failed to load banner image:", bannerSrc);
      const fallbackBanner = document.createElement("div");
      fallbackBanner.style.position = "fixed";
      fallbackBanner.style.top = "50%";
      fallbackBanner.style.left = "50%";
      fallbackBanner.style.transform = "translate(-50%, -50%)";
      fallbackBanner.style.zIndex = "99999";
      fallbackBanner.style.padding = "20px";
      fallbackBanner.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      fallbackBanner.style.color = "white";
      fallbackBanner.style.fontSize = "24px";
      fallbackBanner.style.borderRadius = "10px";
      fallbackBanner.textContent = notificationDefinitions[action].title;
      document.body.appendChild(fallbackBanner);
      setTimeout(() => {
        fallbackBanner.remove();
      }, 3e3);
    };
    banner.onload = () => {
    };
    const notification = notificationDefinitions[action];
    const soundName = "sound" in notification ? notification.sound : void 0;
    const audio = soundName ? new Audio(chrome.runtime.getURL(sounds[soundName])) : void 0;
    if (audio) {
      audio.volume = 0.25;
    }
    setTimeout(() => {
      requestAnimationFrame(() => {
        document.body.appendChild(banner);
        banner.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: animations.duration,
          easing: animations.easings.easeOutQuart,
          fill: "forwards"
        });
        if (audio) {
          audio.play().catch((error) => {
            console.log("Could not play sound:", error);
          });
        }
      });
    }, delay);
    setTimeout(() => {
      banner.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: animations.duration,
        easing: animations.easings.easeOutQuart,
        fill: "forwards"
      });
      setTimeout(() => {
        banner.remove();
      }, animations.duration);
    }, animations.span + delay);
  }
})();
