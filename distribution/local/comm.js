/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */
const http = require('node:http');
const { serialize, deserialize } = require('../util/serialization');


/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
    // console.log("** IN LOCAL COMM");
    // console.log("message is ", message);
    // console.log("remote is ", remote);
    // console.log("Callback is ", callback);
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 200;
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (!(message instanceof Array)) {
        callback(new Error('Improperly formatted message'));
        return;
    } 
    if (typeof remote != 'object' || !(remote instanceof Object)) {
        callback(new Error('Improperly formatted remote'));
        return;
    } else if (!('service' in remote) || typeof remote['service'] != 'string') {
        callback(new Error('Missing or improperly configured remote service'));
        return;
    } else if (!('method' in remote) || typeof remote['method'] != 'string') {
        callback(new Error('Missing or improperly configured remote method'));
        return;
    } else if (!('node' in remote) || typeof remote['node'] != 'object') {
        callback(new Error("Missing or improperly configured remote node"));
        return;
    } else if (!('ip' in remote['node']) || !('port' in remote['node'])) {
        callback(new Error('Missing node fields'));
        return;
    }
    // console.log("PASSED LOCAL COMM CHECKS");

    const toSend = serialize(message);
    // console.log("******** SERIALIZED ARGS ARE ", toSend);

    let gid = 'local';
    if ('gid' in remote) {
        gid = remote['gid'];
    }
    
    const options = {
        hostname: remote.node.ip,
        port: remote.node.port,
        path: `/${gid}/${remote.service}/${remote.method}`,
        method: 'PUT',
    };
    let attempt = 0;

    function trySend() {
        let response = '';

        const req = http.request(options, (res) => {
            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('error', (error) => {
                callback(new Error(`Error getting response: ${error}`));
            });

            res.on('end', () => {
                let deserializedRes;
                try {
                    deserializedRes = deserialize(response);
                } catch (e) {
                    callback(new Error("Failed to deserialize response"));
                    return;
                }

                if (deserializedRes instanceof Error) {
                    callback(deserializedRes);
                } else {
                    if (gid !== 'local') {
                        callback(deserializedRes.e, deserializedRes.v);
                    } else {
                        callback(null, deserializedRes);
                    }
                }
            });
        });

        req.on('error', (error) => {
            if (attempt < MAX_RETRIES) {
                console.log("RETRY COMM SEND")
                attempt++;
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // exponential backoff
                console.warn(`[comm] Socket error, retrying attempt ${attempt} in ${delay}ms...`);
                setTimeout(trySend, delay);
            } else {
                callback(new Error(`Failed after ${MAX_RETRIES} retries: ${error.message}`));
            }
        });

        req.write(toSend);
        req.end();
    }

    trySend();
    // let response = '';
    
    // const req = http.request(options, (res) => {
    //     res.on('data', (chunk) => {
    //         response += chunk;
    //     });

    //     res.on('error', (error) => {
    //         callback(new Error(`Error getting response: ${error}`));
    //         return;
    //     });

    //     res.on('end', () => {
    //         const deserializedRes = deserialize(response);
    //         // console.log("DESERIALIZED RES IS ", deserializedRes);
    //         if (deserializedRes instanceof Error) {
    //             callback(deserializedRes);
    //             return;
    //         } else {
    //             if (gid != 'local') {
    //                 callback(deserializedRes.e, deserializedRes.v);
    //                 return;
    //             }
    //             callback(null, deserializedRes);
    //             return;
    //         }
    //     });
    // });
    
    // req.on('error', (error) => {
    //     // callback(new Error(`Error making HTTP request: ${error}`));
    //     callback(null, "don't hang up");
    //     return;
    // });

    // req.write(toSend);
    // req.end();
}

module.exports = {send};
// module.exports = {send : require('@brown-ds/distribution/distribution/local/comm').send};
