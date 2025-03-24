// Run this file from main directory with the command "node ./performance/m2.rpcPerformance.js"
const distribution = require('../config.js');

let totalElapsedTime = 0;
const reqLimit = 1000;

let n = 0;
let addOne = () => {
    return ++n;
};
  
const node = {ip: '127.0.0.1', port: 9009};
  
let addOneRPC = distribution.util.wire.createRPC(distribution.util.wire.toAsync(addOne));
  
const rpcService = {
    addOne: addOneRPC,
};

let localServer = null;

distribution.node.start((server) => {
    localServer = server;
});

rpcPerfFunc(reqLimit, totalElapsedTime);

function rpcPerfFunc(round, totalElapsedTime) {
    if (round == 0) {
        const throughput = 1000 / totalElapsedTime;
        console.log(`The throughput of rpc is ${throughput} service requests per millisecond`);
        const latency = totalElapsedTime / 1000;
        console.log(`The latency of rpc is ${latency} milliseconds per service request`);
        localServer.close();
        return;
    } else {
        distribution.local.comm.send([rpcService, 'addOneService'],
            {node: node, service: 'routes', method: 'put'}, (e, v) => {
                const startTime = performance.now();
                distribution.local.comm.send([],
                    {node: node, service: 'addOneService', method: 'addOne'}, (e, v) => {
                        try {
                            const endTime = performance.now();
                            const elapsedTime = endTime - startTime;
                            totalElapsedTime += elapsedTime;
                            rpcPerfFunc(round - 1, totalElapsedTime);
                        } catch (error) {
                            localServer.close();
                            return;
                        }
                    }
                );
            }
        );
    }
}
