export interface FileDocument {
    _id: string
    creator: string
    name: string
    cid: string
}

export const FileSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    type: 'object',
    properties: {
        _id: {
            type: 'string',
        },
        creator: {
            type: 'string',
        },
        name: {
            type: 'string',
        },
        cid: {
            type: 'string',
        },
    },
    required: ['creator', 'name', 'cid', '_id'],
};
