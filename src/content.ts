import { debug } from './logger';
import { notificationDefinitions } from './notifications';
import type { Actions } from './types';
import { registerNotificationListeners } from './events';

const sounds = {
    newItem: 'sounds/new-item.mp3',
    lostGraceDiscovered: 'sounds/lost-grace-discovered.mp3',
    playerLevelUp: 'sounds/player-level-up.mp3',
    enemyFailed: 'sounds/enemy-failed.mp3'
} as const;

const animations = {
    duration: 1000,
    span: 3500,
    easings: {
        easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }
} as const;

debug('Elden Hacker Banner Extension loaded');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

function initializeExtension() {
    injectPageScript();
}

function injectPageScript() {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    registerNotificationListeners();
}

function isNotificationAction(value: unknown): value is Actions {
    return typeof value === 'string' && Object.hasOwn(notificationDefinitions, value);
}

chrome.runtime.onMessage.addListener((
    message: { action?: unknown } | undefined,
    _sender: unknown,
    sendResponse: (response?: unknown) => void
) => {
    debug('Message received in content script:', message);

    if (!isNotificationAction(message?.action)) {
        debug('No valid notification action in message');
        sendResponse({ received: false, error: 'No valid action provided' });
        return false;
    }

    debug(`Showing banner for action: ${message.action}`);
    try {
        show(message.action);
        sendResponse({ received: true, action: message.action });
    } catch (error) {
        console.error('Error showing banner:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        sendResponse({ received: false, error: errorMessage });
    }
    
    return true;
});

function show(action: Actions, delay = 0) {
    debug(`show() called with action: ${action}, delay: ${delay}`);

    if (!Object.hasOwn(notificationDefinitions, action)) {
        console.error(`Invalid action: ${action}`);
        return;
    }

    debug('Creating banner element...');
    const banner = document.createElement('img');
    const bannerSrc = chrome.runtime.getURL(`banners/${action}.png`);
    debug('Banner source URL:', bannerSrc);
    
    banner.src = bannerSrc;
    banner.style.position = 'fixed';
    banner.style.top = '0px';
    banner.style.right = '0px';
    banner.style.zIndex = '99999';
    banner.style.width = '100%';
    banner.style.height = '100vh';
    banner.style.objectFit = 'cover';
    banner.style.objectPosition = 'center';
    banner.style.opacity = '0';
    banner.style.pointerEvents = 'none';
    banner.style.backgroundColor = 'transparent';

    banner.onerror = () => {
        console.error('Failed to load banner image:', bannerSrc);
        const fallbackBanner = document.createElement('div');
        fallbackBanner.style.position = 'fixed';
        fallbackBanner.style.top = '50%';
        fallbackBanner.style.left = '50%';
        fallbackBanner.style.transform = 'translate(-50%, -50%)';
        fallbackBanner.style.zIndex = '99999';
        fallbackBanner.style.padding = '20px';
        fallbackBanner.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        fallbackBanner.style.color = 'white';
        fallbackBanner.style.fontSize = '24px';
        fallbackBanner.style.borderRadius = '10px';
        fallbackBanner.textContent = notificationDefinitions[action].title;
        
        document.body.appendChild(fallbackBanner);
        
        setTimeout(() => {
            fallbackBanner.remove();
        }, 3000);
    };

    banner.onload = () => {
        debug('Banner image loaded successfully');
    };

    const notification = notificationDefinitions[action];
    const soundName = 'sound' in notification ? notification.sound : undefined;
    const audio = soundName
        ? new Audio(chrome.runtime.getURL(sounds[soundName]))
        : undefined;
    if (audio) {
        audio.volume = 0.25;
    }

    debug(`Setting timeout for ${delay}ms before showing banner`);
    
    setTimeout(() => {
        debug('Showing banner now...');
        
        requestAnimationFrame(() => {
            debug('Appending banner to body');
            document.body.appendChild(banner);

            banner.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: animations.duration,
                easing: animations.easings.easeOutQuart,
                fill: 'forwards'
            });

            if (audio) {
                audio.play().catch((error) => {
                    console.log('Could not play sound:', error);
                });
            }
        });
    }, delay);

    setTimeout(() => {
        debug('Starting banner fade out...');
        
        banner.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: animations.duration,
            easing: animations.easings.easeOutQuart,
            fill: 'forwards'
        });

        setTimeout(() => {
            debug('Removing banner from DOM');
            banner.remove();
        }, animations.duration);
    }, animations.span + delay);
}
