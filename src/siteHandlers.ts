import type { Actions } from './notifications';

import { getValueByPath } from './utils';

export type ParseResultFn = (data: unknown) => boolean | undefined;

export type SiteHandler = {
    name: string;
    urlPattern: string;
    method?: string;
    noResponseBody?: boolean;
    eventName: string;
    soundPatterns: readonly string[];
    muteTimeout: number;
    successAction?: Actions;
    failureAction?: Actions;
    parseResponse: ParseResultFn;
};

function messageIncludes(data: unknown, phrase: string) {
    const message = getValueByPath(data, 'message');
    return typeof message === 'string' && message.includes(phrase);
}


export const siteHandlers: SiteHandler[] = [
    {
        name: 'tryhackme_room_join',
        urlPattern: 'https://tryhackme.com/api/v*/rooms/join',
        eventName: 'TRYHACKME_ROOM_JOIN_RESULT' as const,
        soundPatterns: [] as const,
        muteTimeout: 3000,
        successAction: 'realmEntered',
        parseResponse: (data: unknown) => Boolean(getValueByPath(data, 'data'))
    },
    {
        name: 'tryhackme_room_answer',
        urlPattern: 'https://tryhackme.com/api/v*/rooms/answer',
        eventName: 'TRYHACKME_ANSWER_RESULT' as const,
        soundPatterns: ['correct-answer', 'wrong-answer', 'level-up'] as const,
        muteTimeout: 3000,
        successAction: 'truthUncovered',
        failureAction: 'heresySpoken',
        parseResponse: (data: unknown) => {
            const result = getValueByPath(data, 'data.isCorrect');
            return typeof result === 'boolean' ? result : undefined;
        }
    },
    {
        name: 'hackthebox_challenge',
        urlPattern: 'https://labs.hackthebox.com/api/v*/challenge/own',
        eventName: 'HTB_CHALLENGE_ANSWER_RESULT' as const,
        soundPatterns: ['machine_pwned', 'sound-effects'] as const,
        muteTimeout: 3000,
        successAction: 'graceFulfilled',
        failureAction: 'sigilFaltered',
        parseResponse: (data: unknown) => !messageIncludes(data, 'Incorrect flag')
    },
    {
        name: 'hackthebox_machine',
        urlPattern: 'https://labs.hackthebox.com/api/v*/machine/own',
        eventName: 'HTB_MACHINE_ANSWER_RESULT' as const,
        soundPatterns: ['machine_pwned', 'sound-effects'] as const,
        muteTimeout: 3000,
        successAction: 'graceFulfilled',
        failureAction: 'sigilFaltered',
        parseResponse: (data: unknown) => !messageIncludes(data, 'Incorrect Flag.')
    },
    {
        name: 'hackthebox_academy',
        urlPattern: 'https://academy.hackthebox.com/api/v*/answers',
        eventName: 'HTB_ACADEMY_ANSWER_RESULT' as const,
        soundPatterns: [] as const,
        muteTimeout: 3000,
        successAction: 'oathFulfilled',
        failureAction: 'oathForsaken',
        parseResponse: (data: unknown) => !messageIncludes(data, 'Incorrect answer!')
    },
    {
        name: 'hackthebox_sherlock_task',
        urlPattern: 'https://labs.hackthebox.com/api/v*/sherlocks/*/tasks/*/flag',
        eventName: 'HTB_SHERLOCK_TASK_ANSWER_RESULT' as const,
        soundPatterns: ['machine_pwned', 'sound-effects'] as const,
        muteTimeout: 3000,
        successAction: 'omenDeciphered',
        failureAction: 'riddleUnsolved',
        parseResponse: (data: unknown) => !messageIncludes(data, 'Incorrect task flag!')
    },
    {
        name: 'hackthebox_container_start',
        urlPattern: 'https://labs.hackthebox.com/api/v*/container/start',
        method: 'POST',
        eventName: 'HTB_CONTAINER_START_RESULT' as const,
        soundPatterns: ['machine_pwned', 'sound-effects'] as const,
        muteTimeout: 3000,
        successAction: 'trialAwakened',
        parseResponse: (data: unknown) => getValueByPath(data, 'message') === 'Instance Created!'
    },
    {
        name: 'hackthebox_vm_spawn',
        urlPattern: 'https://labs.hackthebox.com/api/v*/vm/spawn',
        method: 'POST',
        eventName: 'HTB_VM_SPAWN_RESULT' as const,
        soundPatterns: ['machine_pwned', 'sound-effects'] as const,
        muteTimeout: 3000,
        successAction: 'targetSummoned',
        parseResponse: (data: unknown) => getValueByPath(data, 'success') === true
    },
    {
        name: 'hackthebox_vm_terminate',
        urlPattern: 'https://labs.hackthebox.com/api/v*/vm/terminate',
        method: 'POST',
        eventName: 'HTB_VM_TERMINATE_RESULT' as const,
        soundPatterns: [] as const,
        muteTimeout: 3000,
        successAction: 'targetAbandoned',
        parseResponse: (data: unknown) => getValueByPath(data, 'success') === true
    },
    {
        name: 'hackthebox_academy_lab_start',
        urlPattern: 'https://academy.hackthebox.com/api/v*/modules/*/sections/*/lab',
        method: 'POST',
        eventName: 'HTB_ACADEMY_LAB_START_RESULT' as const,
        soundPatterns: [] as const,
        muteTimeout: 3000,
        successAction: 'vesselAwakened',
        parseResponse: (data: unknown) => {
            const entrypoints = getValueByPath(data, 'data.entrypoints');
            const labs = getValueByPath(data, 'data.labs');
            return (Array.isArray(entrypoints) && entrypoints.length > 0) ||
                (Array.isArray(labs) && labs.length > 0);
        }
    },
    {
        name: 'hackthebox_academy_lab_stop',
        urlPattern: 'https://academy.hackthebox.com/api/v*/modules/*/sections/*/lab',
        method: 'DELETE',
        noResponseBody: true,
        eventName: 'HTB_ACADEMY_LAB_STOP_RESULT' as const,
        soundPatterns: [] as const,
        muteTimeout: 3000,
        successAction: 'embersScattered',
        parseResponse: () => true
    }
];



export const HANDLED_EVENT_NAMES = siteHandlers.map((handler) => handler.eventName);

function matchesUrl(url: string, pattern: string) {
    const firstWildcard = pattern.indexOf('*');
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
        const nextWildcard = pattern.indexOf('*', patternIndex);
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

export function findHandler(url: string, method?: string) {
    const normalizedMethod = method?.toUpperCase();
    return siteHandlers.find((handler) =>
        matchesUrl(url, handler.urlPattern) &&
        (!handler.method || handler.method === normalizedMethod)
    );
}
