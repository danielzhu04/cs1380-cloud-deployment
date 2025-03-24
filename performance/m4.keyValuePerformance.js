// Run this file from the main project directory with the command "node ./performance/m4.keyValuePerformance.js"
const distribution = require('../config.js');
const id = distribution.util.id;

// Generate 1000 random key-value pairs
const maxStrLen = 64;
const maxObjFields = 8;
const maxNum = 65536;

const randPairs = {};

function generateStr(strLen) {
  let str = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < strLen; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

for (let i = 0; i < 1000; i++) {
  let key = generateStr(Math.floor(Math.random() * maxStrLen));
  while (key in randPairs) {
    key = generateStr(Math.floor(Math.random() * maxStrLen));
  }

  const numFields = Math.floor(Math.random() * maxObjFields);

  randPairs[key] = {};

  for (let f = 0; f < numFields; f++) {
    const currKey = generateStr(Math.floor(Math.random() * maxStrLen));

    // Determine if should assign str value or num value to current object value
    let currVal = null;
    if (Math.floor(Math.random() * maxNum) % 2 == 0) {
      currVal = generateStr(Math.floor(Math.random() * maxStrLen));
    } else {
      currVal = Math.random() * maxNum;
    }

    randPairs[key][currKey] = currVal;
  }
}

// Measure performance of insertion and retrieval for the distributed key-value store
let localServer = null;
const mygroupGroup = {};

// Local node configurations
const n1 = {ip: '127.0.0.1', port: 1111};
const n2 = {ip: '127.0.0.1', port: 2222};
const n3 = {ip: '127.0.0.1', port: 3333};

// The node configurations used on the cloud -- note that the IPs are public AWS EC2 node IPs and will likely change whenever connecting to the EC2 instances
// const n1 = {ip: '3.144.110.22', port: 0}; // public IP of EC2 node 1 (update when necessary)
// const n2 = {ip: '3.142.164.165', port: 0}; // public IP of EC2 node 2 (update when necessary)
// const n3 = {ip: '3.14.254.238', port: 0}; // public IP of EC2 node 3 (update when necessary)

mygroupGroup[id.getSID(n1)] = n1;
mygroupGroup[id.getSID(n2)] = n2;
mygroupGroup[id.getSID(n3)] = n3;

distribution.node.start((server) => {
  localServer = server;

  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        const mygroupConfig = {gid: 'mygroup'};
  
        distribution.local.groups.put(mygroupConfig, mygroupGroup, (e, v) => {
          // Insertion case
          let numInserted = 0;
          let totalTime = 0;

          Object.keys(randPairs).forEach((key) => {
            const startTime = performance.now();
            distribution.mygroup.store.put(randPairs[key], key, (e, v) => { // note: can simply change "store" to "mem" to measure the insertion performance of mem
              const endTime = performance.now();
              totalTime += endTime - startTime;
              numInserted += 1;

              if (numInserted == 1000) {
                const throughput = 1000 / totalTime;
                console.log(`The throughput is ${throughput} objects inserted per millisecond`);
                const latency = totalTime / 1000;
                console.log(`The latency is ${latency} milliseconds per object insertion`);

                // Retrieval case
                let numRetrieved = 0;
                totalTime = 0;

                Object.keys(randPairs).forEach((key) => {
                  const startTime = performance.now();
                  distribution.mygroup.store.get(key, (e, v) => { // note: can simply change "store" to "mem" to measure the retrieval performance of mem
                    const endTime = performance.now();
                    totalTime += endTime - startTime;
                    numRetrieved += 1;

                    if (numRetrieved == 1000) {
                      const throughput = 1000 / totalTime;
                      console.log(`The throughput is ${throughput} objects retrieved per millisecond`);
                      const latency = totalTime / 1000;
                      console.log(`The latency is ${latency} milliseconds per object retrieval`);

                      distribution.mygroup.status.stop((e, v) => {
                        const remote = {service: 'status', method: 'stop'};
                        remote.node = n1;
                        distribution.local.comm.send([], remote, (e, v) => { 
                          remote.node = n2;
                          distribution.local.comm.send([], remote, (e, v) => {
                            remote.node = n3;
                            distribution.local.comm.send([], remote, (e, v) => {
                              localServer.close();
                            });
                          });
                        });
                      });
                    }
                  });
                });
              }
            });
          });
        });  
      });
    });
  });
});

// Run the command "rm store/*" from the main project directory to get rid of all the stored objects afterward
