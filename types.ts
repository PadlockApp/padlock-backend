import WebSocket from 'ws';

export interface SuperWS extends WebSocket {
    isAlive: boolean
}

export interface AuthPayload {
    uid: string
    signature: string
    token?: string
}

export interface ItemPayload {
    creator?: string
    name?: string
    cid: string
}

export type Payload = AuthPayload | ItemPayload;

export interface Req {
    action: string
    payload?: Payload
}

export interface AuthReturn {
    token: string
}

export interface ItemReturn {
    creator?: string
    name?: string
    cid: string
}

export type Return = AuthReturn | ItemReturn | ItemReturn[];

export interface ErrorLog {
    status: number
    message: string
}


export interface Res {
    data?: Return
    error?: ErrorLog
}

export interface AuthToken {
    uid: string
    iat: number
}
