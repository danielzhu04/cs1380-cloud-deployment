// Run this file from main directory with the command "node ./performance/m2.commPerformance.js"
const distribution = require('../config.js');
const local = distribution.local;
const config = distribution.node.config;
    
const remote = {node: config, service: 'status', method: 'get'};
const message = ['ip'];

let totalElapsedTime = 0;
const reqLimit = 1000;

let localServer = null;

distribution.node.start((server) => {
    localServer = server;
});

commPerfFunc(reqLimit, totalElapsedTime);

function commPerfFunc(round, totalElapsedTime) {
    if (round == 0) {
        const throughput = 1000 / totalElapsedTime;
        console.log(`The throughput of comm is ${throughput} service requests per millisecond`);
        const latency = totalElapsedTime / 1000;
        console.log(`The latency of comm is ${latency} milliseconds per service request`);
        localServer.close();
        return;
    } else {
        const startTime = performance.now();
        local.comm.send(message, remote, (e, v) => {
            try {
                const endTime = performance.now();
                const elapsedTime = endTime - startTime;
                totalElapsedTime += elapsedTime;
                commPerfFunc(round - 1, totalElapsedTime);
            } catch (error) {
                localServer.close();
                return;
            }
        });
    }
}
