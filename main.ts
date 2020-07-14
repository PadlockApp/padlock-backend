import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

interface AuthPayload {
    uid: string
    signature: string
}

interface ItemPayload {
    creator?: string
    name?: string
    cid: string
}

type Payload = AuthPayload | ItemPayload;

interface Req {
    action: string
    payload?: Payload
}

interface AuthReturn {
    token: string
}

interface ItemReturn {
    creator?: string
    name?: string
    cid: string
}

type Return = AuthReturn | ItemReturn | ItemReturn[];

interface ErrorLog {
    status: number
    message: string
}


interface Res {
    return?: Return
    error?: ErrorLog
}

const assert = (condition: boolean, description?: string) => {
    if (condition) {
        return;
    } else {
        throw Error(description)
    }
}

wss.on('connection', (ws: WebSocket) => {
    let uid = null;
    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {
        try {
            const req: Req = JSON.parse(message);
            switch (req.action) {
                case 'getAuth':
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

//start our server
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port ${(server.address() as WebSocket.AddressInfo).port} :)`);
});
