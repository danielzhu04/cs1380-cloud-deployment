const distribution = require('../../config.js');
const id = distribution.util.id;

const myGroup = {};

/*
    The local node will be the orchestrator.
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

// test('service setup', (done) => {
//   distribution.myGroup.service.setup({test: "test setup"}, (e, v) => {
//     console.log("e is ", e, " and v is ", v);
//     distribution.myGroup.service.query({test: "test query"}, (e, v) => {
//       console.log("e is ", e, " and v is ", v);
//       done();
//     });
//   });
// });

test('mock indexer', (done) => {
  distribution.myGroup.search.setup({gid: "myGroup"}, (e, v) => {
    const searchResults = v;
    distribution.myGroup.store.get("searchdb", (e, v) => {
      console.log("e is ", e);
      console.log("v is ", v);

      try {
        expect(v).toEqual(expect.arrayContaining(searchResults));
        done();
      } catch (e) {
        done(e);
      }
    })
  });
});

/*
    Test setup and teardown
*/

beforeAll((done) => {
  myGroup[id.getSID(n1)] = n1;
  myGroup[id.getSID(n2)] = n2;
  myGroup[id.getSID(n3)] = n3;


  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const config = {gid: 'myGroup'};
    startNodes(() => {
      distribution.local.groups.put(config, myGroup, (e, v) => {
        distribution.myGroup.groups.put(config, myGroup, (e, v) => {
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
        localServer.close();
        done();
      });
    });
  });
});
