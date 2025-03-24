/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

jest.spyOn(process, 'exit').mockImplementation((n) => { });

const mygroupGroup = {};
const mygroupBGroup = {};

let localServer = null;

const n1 = {ip: '127.0.0.1', port: 8000};
const n2 = {ip: '127.0.0.1', port: 8001};
const n3 = {ip: '127.0.0.1', port: 8002};
const n4 = {ip: '127.0.0.1', port: 8003};
const n5 = {ip: '127.0.0.1', port: 8004};
const n6 = {ip: '127.0.0.1', port: 8005};

test('(1 pts) student test', (done) => {
  // Local mem test
  const user = {first: 'John', last: 'Doe'};
  const key = 'johndoe';

  distribution.local.mem.put(user, key, (e, v) => {
    distribution.local.mem.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toBe(user);
      } catch (error) {
        done(error);
      }
    });
  });

  distribution.local.mem.put(user, null, (e, v) => {
    distribution.local.mem.get(id.getID(user), (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toBe(user);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});


test('(1 pts) student test', (done) => {
  // Local store test
  const user = {first: 'Jane', last: 'Doe'};
  const key = 'janedoe';

  distribution.local.store.put(user, key, (e, v) => {
    distribution.local.store.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
      } catch (error) {
        done(error);
      }
    });
  });

  distribution.local.store.put(user, null, (e, v) => {
    distribution.local.store.get(id.getID(user), (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});


test('(1 pts) student test', (done) => {
  // Distributed mem test
  const user = {first: 'Foo', last: 'Bar'};
  const key = 'foobar';

  distribution.all.mem.put(user, key, (e, v) => {
    distribution.all.mem.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
      } catch (error) {
        done(error);
      }
    });
  });

  distribution.mygroup.mem.put(user, key, (e, v) => {
    distribution.mygroupB.mem.get(key, (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Distributed store test
  const user = {first: 'Lorem', last: 'Ipsum'};
  const key = 'loremipsum';

  distribution.all.store.put(user, key, (e, v) => {
    distribution.all.store.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
      } catch (error) {
        done(error);
      }
    });
  });

  distribution.mygroup.mem.put(user, key, (e, v) => {
    distribution.mygroupB.mem.get(key, (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Consistent hash test 
  const key = 'foobar';
  const nodes = [
    {ip: '127.0.0.1', port: 5555}, // nid c586f356077a9aca0b640c3324becddf6f1b1e84dc7165cae4b1b7cea279c89d
    {ip: '127.0.0.1', port: 6666} // nid d267ae1e9a9987993ac0f7d3fc322ac6ad1bcc16a5654004c710f0010f09e5c4
  ];

  const kid = id.getID(key);
  const nids = nodes.map((node) => id.getNID(node));

  let hash = id.consistentHash(kid, nids);
  let expectedHash = 'c586f356077a9aca0b640c3324becddf6f1b1e84dc7165cae4b1b7cea279c89d';

  try {
    expect(expectedHash).toBeTruthy();
    expect(hash).toBe(expectedHash);
  } catch (error) {
    done(error);
  }

  // Rendezvous hash test
  hash = id.rendezvousHash(kid, nids);
  expectedHash = 'c586f356077a9aca0b640c3324becddf6f1b1e84dc7165cae4b1b7cea279c89d';

  try {
    expect(expectedHash).toBeTruthy();
    expect(hash).toBe(expectedHash);
    done();
  } catch (error) {
    done(error);
  }
});

beforeAll((done) => {
  // First, stop the nodes if they are running
  const remote = {service: 'status', method: 'stop'};

  const fs = require('fs');
  const path = require('path');

  fs.rmSync(path.join(__dirname, '../store'), {recursive: true, force: true});
  fs.mkdirSync(path.join(__dirname, '../store'));

  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n6;
            distribution.local.comm.send([], remote, (e, v) => {
              startNodes();
            });
          });
        });
      });
    });
  });

  const startNodes = () => {
    mygroupGroup[id.getSID(n1)] = n1;
    mygroupGroup[id.getSID(n2)] = n2;
    mygroupGroup[id.getSID(n3)] = n3;
    mygroupGroup[id.getSID(n4)] = n4;
    mygroupGroup[id.getSID(n5)] = n5;

    mygroupBGroup[id.getSID(n1)] = n1;
    mygroupBGroup[id.getSID(n2)] = n2;
    mygroupBGroup[id.getSID(n3)] = n3;
    mygroupBGroup[id.getSID(n4)] = n4;
    mygroupBGroup[id.getSID(n5)] = n5;

    // Now, start the nodes listening node
    distribution.node.start((server) => {
      localServer = server;

      const groupInstantiation = () => {
        const mygroupConfig = {gid: 'mygroup'};
        const mygroupBConfig = {gid: 'mygroupB', hash: id.rendezvousHash};

        // Create the groups
        distribution.local.groups.put(mygroupBConfig, mygroupBGroup, (e, v) => {
          distribution.local.groups.put(mygroupConfig, mygroupGroup, (e, v) => {
            distribution.mygroup.groups.put(mygroupConfig, mygroupGroup, (e, v) => {
              done();
            });
          });
        });
      };

      // Start the nodes
      distribution.local.status.spawn(n1, (e, v) => {
        distribution.local.status.spawn(n2, (e, v) => {
          distribution.local.status.spawn(n3, (e, v) => {
            distribution.local.status.spawn(n4, (e, v) => {
              distribution.local.status.spawn(n5, (e, v) => {
                distribution.local.status.spawn(n6, (e, v) => {
                  groupInstantiation();
                });
              });
            });
          });
        });
      });
    });
  };
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
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n6;
            distribution.local.comm.send([], remote, (e, v) => {
              localServer.close();
              done();
            });
          });
        });
      });
    });
  });
});
