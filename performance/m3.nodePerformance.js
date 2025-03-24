// Run 'npm test performance/m3.nodePerformance.js' from the main project directory
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 1111};
const n2 = {ip: '127.0.0.1', port: 2222};
const n3 = {ip: '127.0.0.1', port: 3333};
const n4 = {ip: '127.0.0.1', port: 4444};

test('new node actions', (done) => {
  let startTime = performance.now();
  distribution.local.status.spawn(n1, (e, v) => {
    let endTime = performance.now();
    console.log("Elapsed time (ms) to spawn a new node is ", endTime - startTime);

    // For testing the time it takes for the new node to perform an action 
    const remote = {node: n1, service: 'status', method: 'get'};
    startTime = performance.now();
    distribution.local.comm.send(['heapTotal'], remote, (e, v) => {
      endTime = performance.now();
      console.log("Elapsed time (ms) for the new node to perform an action is ", endTime - startTime);
      done();
    });
  });

  /*
  Note that we can make the heapTotal code run by using the following block of code instead of
  the previous block of code and running the following command block in a different terminal:

  startTime=$(node -e 'console.log(performance.now())'); 
  c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":9999},"onStart":{"type":"function","value":"() => {console.log(performance.now() - '"$startTime"')}"}}}'
  ./distribution.js --config "$c"
  */
  // // For testing the time it takes for the new node to perform an action 
  // const remote = {node: n1, service: 'status', method: 'get'};
  // const startTime = performance.now();
  // distribution.local.comm.send(['heapTotal'], remote, (e, v) => {
  //   const endTime = performance.now();
  //   console.log("Elapsed time (ms) for the new node to perform an action is ", endTime - startTime);
  //   done();
  // });
});

/* 
Can "substitute" the following process of programmatically booting up a new node through distribution.node.start()
with the following commands, which boot up nodes from the command line and print out the time it took for the nodes 
to boot up (note that the different command options experiment with different onStart functions):

Option 1:
startTime=$(node -e 'console.log(performance.now())')
c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":2222},"onStart":{"type":"function","value":"() => console.log(performance.now() - '"$startTime"')"}}}'
./distribution.js --config "$c"

Option 2:
startTime=$(node -e 'console.log(performance.now())') 
c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":2222},"onStart":{"type":"function","value":"() => {console.log(2 + 2); console.log(performance.now() - '"$startTime"')}"}}}'
./distribution.js --config "$c"

Option 3:
startTime=$(node -e 'console.log(performance.now())') 
c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":2222},"onStart":{"type":"function","value":"() => {console.log(true); console.log(performance.now() - '"$startTime"')}"}}}'
./distribution.js --config "$c"

Option 4:
startTime=$(node -e 'console.log(performance.now())')
c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":2222},"onStart":{"type":"function","value":"() => {const num = 4; console.log(num); console.log(performance.now() - '"$startTime"')}"}}}'
./distribution.js --config "$c"

Option 5:
startTime=$(node -e 'console.log(performance.now())')
c='{"type":"object","value":{"ip":{"type":"string","value":"127.0.0.1"},"port":{"type":"number","value":2222},"onStart":{"type":"function","value":"() => {console.log(`This is a string`); console.log(performance.now() - '"$startTime"')}"}}}'
./distribution.js --config "$c"
*/
beforeAll((done) => {
  let startTime = performance.now();
  const config = {
    ip: '127.0.0.1',
    port: 8678,
    onStart: () => console.log(`This is a string`) // Experiment w/ different onStart functions
  };
  const distribution = require('../distribution.js')(config);
  distribution.node.start((server) => {
    config.onStart();
    let endTime = performance.now();
    console.log(`The elapsed time to programmatically boot up a node is ${endTime - startTime} milliseconds`);
    localServer = server;

    let totalTime = 0;
    startTime = performance.now();
    distribution.local.status.spawn(n2, (e, v) => {
      endTime = performance.now();
      totalTime += endTime - startTime;
      startTime = performance.now();
      distribution.local.status.spawn(n3, (e, v) => {
        endTime = performance.now();
        totalTime += endTime - startTime;
        startTime = performance.now();
        distribution.local.status.spawn(n4, (e, v) => {
          endTime = performance.now();
          totalTime += endTime - startTime;
          const throughput = 3 / totalTime; // 3 newly spawned nodes
          const latency = totalTime / 3;
          console.log(`The throughput is ${throughput} spawned nodes per millisecond`);
          console.log(`The latency is ${latency} milliseconds per spawned node`);
          done();
        });
      });
    });
  });
});

afterAll((done) => {
  const remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          localServer.close();
          done();
        });
      });
    });
  });
});
