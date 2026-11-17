export const notificationDefinitions = {
    realmEntered: { title: 'REALM ENTERED', sound: 'lostGraceDiscovered' },
    graceFulfilled: { title: 'GRACE FULFILLED', sound: 'playerLevelUp' },
    sigilFaltered: { title: 'SIGIL FALTERED', sound: 'enemyFailed', tone: 'failure' },
    oathFulfilled: { title: 'OATH FULFILLED', sound: 'playerLevelUp' },
    oathForsaken: { title: 'OATH FORSAKEN', sound: 'enemyFailed', tone: 'failure' },
    heresySpoken: { title: 'HERESY SPOKEN', sound: 'enemyFailed', tone: 'failure' },
    truthUncovered: { title: 'TRUTH UNCOVERED', sound: 'newItem' },
    riddleUnsolved: { title: 'RIDDLE UNSOLVED', sound: 'enemyFailed', tone: 'failure' },
    omenDeciphered: { title: 'OMEN DECIPHERED', sound: 'playerLevelUp' },
    trialAwakened: { title: 'TRIAL AWAKENED', sound: 'lostGraceDiscovered' },
    targetSummoned: { title: 'TARGET SUMMONED', sound: 'lostGraceDiscovered' },
    targetAbandoned: { title: 'TARGET ABANDONED' },
    vesselAwakened: { title: 'VESSEL AWAKENED', sound: 'lostGraceDiscovered' },
    embersScattered: { title: 'EMBERS SCATTERED' }
} as const;

export type Actions = keyof typeof notificationDefinitions;
