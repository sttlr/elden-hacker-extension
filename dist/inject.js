import { g as getValueByPath, d as debug } from "./utils.js";
class AudioMuteController {
  activePatterns = [];
  timerId;
  set(patterns, timeout) {
    this.activePatterns = [...patterns];
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.timerId = window.setTimeout(() => {
      this.activePatterns = [];
      this.timerId = void 0;
    }, timeout);
  }
  shouldMute(src) {
    if (!this.activePatterns.length) {
      return false;
    }
    return this.activePatterns.some((pattern) => src.includes(pattern));
  }
}
const audioMute = new AudioMuteController();
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
siteHandlers.map((handler) => handler.eventName);
function matchesUrl(url, pattern) {
  const firstWildcard = pattern.indexOf("*");
  if (firstWildcard === -1) {
    return url.includes(pattern);
  }
  const prefix = pattern.slice(0, firstWildcard);
  const prefixIndex = url.indexOf(prefix);
  if (prefixIndex === -1) {
    return false;
  }
  let urlIndex = prefixIndex + prefix.length;
  let patternIndex = firstWildcard + 1;
  while (patternIndex < pattern.length) {
    const nextWildcard = pattern.indexOf("*", patternIndex);
    const segmentEnd = nextWildcard === -1 ? pattern.length : nextWildcard;
    const segment = pattern.slice(patternIndex, segmentEnd);
    const segmentIndex = url.indexOf(segment, urlIndex);
    if (segmentIndex === -1 || segmentIndex === urlIndex) {
      return false;
    }
    urlIndex = segmentIndex + segment.length;
    if (nextWildcard === -1) {
      return true;
    }
    patternIndex = nextWildcard + 1;
  }
  return true;
}
function findHandler(url, method) {
  const normalizedMethod = method?.toUpperCase();
  return siteHandlers.find(
    (handler) => matchesUrl(url, handler.urlPattern) && (!handler.method || handler.method === normalizedMethod)
  );
}
function processResponse(handler, data) {
  debug(`${handler.name} response:`, data);
  const isCorrect = handler.parseResponse(data);
  if (isCorrect === void 0) {
    return;
  }
  const action = isCorrect ? handler.successAction : handler.failureAction;
  if (!action) {
    return;
  }
  debug(`Dispatching ${handler.eventName} with action=${action}`);
  window.dispatchEvent(new CustomEvent(handler.eventName, { detail: { action } }));
}
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const request = args[0];
  const requestUrl = typeof request === "string" || request instanceof URL ? String(request) : request.url;
  const url = requestUrl.startsWith("http") ? requestUrl : new URL(requestUrl, window.location.href).href;
  const method = args[1]?.method ?? (request instanceof Request ? request.method : "GET");
  const handler = findHandler(url, method);
  if (handler) {
    debug(`Processing ${handler.name} fetch submission`);
    audioMute.set(handler.soundPatterns, handler.muteTimeout);
    const response = await originalFetch(...args);
    if (handler.noResponseBody) {
      if (response.ok) {
        processResponse(handler, void 0);
      }
      return response;
    }
    response.clone().json().then((data) => {
      processResponse(handler, data);
    }).catch((err) => console.error("[Elden] Error parsing fetch response:", err));
    return response;
  }
  return originalFetch(...args);
};
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function(method, url) {
  this._eldenUrl = new URL(url, window.location.href).href;
  this._eldenMethod = method;
  return Reflect.apply(originalXhrOpen, this, arguments);
};
XMLHttpRequest.prototype.send = function() {
  const url = this._eldenUrl ?? "";
  const method = this._eldenMethod ?? "GET";
  const handler = findHandler(url, method);
  if (handler) {
    debug(`Processing ${handler.name} XHR submission`);
    audioMute.set(handler.soundPatterns, handler.muteTimeout);
    const originalOnReadyStateChange = this.onreadystatechange;
    this.onreadystatechange = function(event) {
      if (this.readyState === 4) {
        if (handler.noResponseBody) {
          if (this.status >= 200 && this.status < 300) {
            processResponse(handler, void 0);
          }
        } else {
          try {
            const data = JSON.parse(this.responseText);
            processResponse(handler, data);
          } catch (err) {
            console.error("[Elden] Error parsing XHR response:", err);
          }
        }
      }
      originalOnReadyStateChange?.call(this, event);
    };
  }
  return Reflect.apply(originalXhrSend, this, arguments);
};
const originalPlay = Audio.prototype.play;
Audio.prototype.play = function() {
  if (audioMute.shouldMute(this.src)) {
    return Promise.resolve();
  }
  return originalPlay.call(this);
};
