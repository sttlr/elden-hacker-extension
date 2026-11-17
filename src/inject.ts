import { debug } from './logger';
import { audioMute } from './audioMute';
import { findHandler } from './siteHandlers';
import type { SiteHandler } from './siteHandlers';

declare global {
  interface XMLHttpRequest {
    _eldenUrl?: string;
    _eldenMethod?: string;
  }
}

function processResponse(handler: SiteHandler, data: unknown) {
  debug(`${handler.name} response:`, data);
  const isCorrect = handler.parseResponse(data);
  if (isCorrect === undefined) {
    return;
  }

  const action = isCorrect ? handler.successAction : handler.failureAction;
  if (!action) {
    return;
  }

  debug(`Dispatching ${handler.eventName} with action=${action}`);
  window.dispatchEvent(new CustomEvent(handler.eventName, { detail: { action } }));
}

// Intercept fetch
const { fetch: originalFetch } = window;

window.fetch = async (...args: Parameters<typeof fetch>) => {
  const request = args[0];
  const requestUrl = typeof request === 'string' || request instanceof URL
    ? String(request)
    : request.url;
  const url = requestUrl.startsWith('http')
    ? requestUrl
    : new URL(requestUrl, window.location.href).href;
  const method = args[1]?.method ?? (request instanceof Request ? request.method : 'GET');
  debug('Fetch called:', method, url);

  const handler = findHandler(url, method);
  if (handler) {
    debug(`Processing ${handler.name} fetch submission`);
    audioMute.set(handler.soundPatterns, handler.muteTimeout);
    const response = await originalFetch(...args);

    if (handler.noResponseBody) {
      if (response.ok) {
        processResponse(handler, undefined);
      }
      return response;
    }

    response.clone().json().then((data: unknown) => {
      processResponse(handler, data);
    }).catch((err: unknown) => console.error('[Elden] Error parsing fetch response:', err));
    return response;
  }

  return originalFetch(...args);
};

// Intercept XHR
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string) {
  this._eldenUrl = new URL(url, window.location.href).href;
  this._eldenMethod = method;
  return Reflect.apply(originalXhrOpen, this, arguments);
};

XMLHttpRequest.prototype.send = function() {
  const url = this._eldenUrl ?? '';
  const method = this._eldenMethod ?? 'GET';
  debug('XMLHttpRequest called:', method, url);

  const handler = findHandler(url, method);
  if (handler) {
    debug(`Processing ${handler.name} XHR submission`);
    audioMute.set(handler.soundPatterns, handler.muteTimeout);
    const originalOnReadyStateChange = this.onreadystatechange;

    this.onreadystatechange = function(this: XMLHttpRequest, event: Event) {
      if (this.readyState === 4) {
        if (handler.noResponseBody) {
          if (this.status >= 200 && this.status < 300) {
            processResponse(handler, undefined);
          }
        } else {
          try {
            const data: unknown = JSON.parse(this.responseText);
            processResponse(handler, data);
          } catch (err) {
            console.error('[Elden] Error parsing XHR response:', err);
          }
        }
      }
      originalOnReadyStateChange?.call(this, event);
    };
  }

  return Reflect.apply(originalXhrSend, this, arguments);
};

// Mute sounds when needed
const originalPlay = Audio.prototype.play;

Audio.prototype.play = function(this: HTMLAudioElement) {
  if (audioMute.shouldMute(this.src)) {
    return Promise.resolve();
  }
  return originalPlay.call(this);
};
