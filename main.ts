; (global as any).WebSocket = require('isomorphic-ws');
import express from 'express';
import http from 'http';
import WebSocket, { AddressInfo } from 'ws';
import { SuperWS, Req, AuthPayload, ItemPayload, Res } from './types';
import { createPow } from "@textile/powergate-client";
import { Client, KeyInfo, ThreadID } from '@textile/hub';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { config } from 'dotenv';
import { FileSchema } from './schemas';
config();

const {
    POW_HOST,
    SPACE_HOST,
    POW_TOKEN,
    DB_USER_API_KEY,
    DB_USER_API_SECRET,
} = process.env;

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const assert = (condition: boolean, description?: string) => {
    if (condition) {
        return;
    } else {
        throw Error(description)
    }
}

// init
(async () => {
    const pow = createPow({ host: POW_HOST });
    try {
        // Use env token
        pow.setToken(POW_TOKEN as string);
    } catch (error) {
        // Fallback
        // TODO: remove for production
        const { token } = await pow.ffs.create();
        pow.setToken(token);
    }
    // FFS is ready
    const { ffs } = pow;

    const keyInfo: KeyInfo = {
        // Using insecure keys
        key: DB_USER_API_KEY as string,
        secret: DB_USER_API_SECRET as string,
        // @ts-ignore
        type: 1,
    }
    const db = await Client.withKeyInfo(keyInfo);
    const identity = await Libp2pCryptoIdentity.fromRandom();
    await db.getToken(identity);
    const { listList: threads } = await db.listThreads();
    if (threads.length === 0) {
        await db.newDB();
    }
    const threadId = (await db.listThreads()).listList[0].id;
    const thread: ThreadID = await ThreadID.fromString(threadId as string);
    try {
        await db?.getCollectionIndexes(thread, 'files')
    } catch (e) {
        await db?.newCollection(thread, 'files', FileSchema);
    }
    // DB and thread are now ready
})();

// API
wss.on('connection', (ws: SuperWS) => {
    ws.isAlive = true;
    let uid = null;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    ws.on('message', (message: string) => {
        try {
            const req: Req = JSON.parse(message);
            switch (req.action) {
                case 'getAuth':
                    assert(uid === null, 'Already authorized');
                    uid = (req.payload as AuthPayload).uid;
                    console.log(uid);
                    break;
                case 'getAllListings':
                    ws.send('{all cataloged items}');
                    break;
                case 'addListing':
                    assert(uid !== null, 'Not authorized to add new item');
                    const itemToAdd = req.payload as ItemPayload;
                    ws.send(itemToAdd.cid);
                    wss.clients.forEach(client => {
                        client.send('new_item_added');
                    })
                    break;
                case 'removeListing':
                    assert(uid !== null, 'Not authorized to remove item');
                    const itemToRemove = req.payload as ItemPayload;
                    ws.send(itemToRemove.cid);
                    wss.clients.forEach(client => {
                        client.send('item_removed');
                    })
                    break;
                default:
                    throw Error('Unidentified action');
            }
        } catch (e) {
            const error = e as Error;
            const res: Res = { error: { status: 400, message: error.message } };
            ws.send(JSON.stringify(res));
        }
    });
});

setInterval(() => {
    wss.clients.forEach((ws: SuperWS) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(null, false);
    });
}, 10000);

//start server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port ${(server.address() as AddressInfo).port} :)`);
});
