import type { Actions } from './notifications';
export type { Actions } from './notifications';

export interface NotificationEventPayload {
    action: Actions;
}

export interface DispatchActionMessage {
    action: Actions;
}


export interface WebRequestDetails {
    url: string;
    method: string;
    tabId: number;
}
