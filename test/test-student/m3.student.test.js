/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

const mygroupConfig = {gid: 'mygroup'};
const mygroupGroup = {};

let localServer = null;

const n1 = {ip: '127.0.0.1', port: 9001};
const n2 = {ip: '127.0.0.1', port: 9002};
const n3 = {ip: '127.0.0.1', port: 9003};
const n4 = {ip: '127.0.0.1', port: 9004};
const n5 = {ip: '127.0.0.1', port: 9005};
const n6 = {ip: '127.0.0.1', port: 9006};

test('(1 pts) student test', (done) => {
  // Test local.groups
  distribution.local.groups.get('nonexistentGroup', (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
      return;
    }
  });

  const expectedKeys = Object.keys(mygroupGroup);
  distribution.local.groups.get('mygroup', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(Object.keys(v).length).toBe(expectedKeys.length);
      expect(Object.keys(v)).toEqual(expect.arrayContaining(expectedKeys));
      done();
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
  // Test all.comm
  const remote = {service: "status", method: "get"};
  distribution.mygroup.comm.send(['nonexistentGet'], remote, (e, v) => {
    try {
      Object.keys(mygroupGroup).forEach((sid) => {
        expect(e[sid]).toBeDefined();
        expect(e[sid]).toBeInstanceOf(Error);
        expect(v).toEqual({});
      });
    } catch (error) {
      done(error);
      return;
    }
  });

  const expectedV = [n1.port, n2.port, n3.port, n4.port, n5.port];
  distribution.mygroup.comm.send(['port'], remote, (e, v) => {
    try {
      expect(e).toEqual({});
      expect(Object.values(v).length).toBe(expectedV.length);
      expect(Object.values(v)).toEqual(expect.arrayContaining(expectedV));
      done();
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
  // Test all.groups
  const testGroup = {}
  testGroup[id.getSID(n6)] = n6;
  distribution.mygroup.groups.put('testGroup', testGroup, (e, v) => {
    try {
      expect(e).toEqual({});
      Object.keys(mygroupGroup).forEach((sid) => {
        expect(Object.keys(v[sid]).length).toBe(Object.keys(testGroup).length);
        expect(Object.keys(v[sid])).toEqual(expect.arrayContaining(Object.keys(testGroup)));
      });
      done();
    } catch (error) {
      done(error);
    }
  });
});

test('(1 pts) student test', (done) => {
  // Test all.routes
  const newService = {};

  newService.newMethod = () => {
    return 'This is a new method';
  };

  distribution.mygroup.routes.put(newService, 'newMethod', (e, v) => {
    const remote = {node: n1, service: 'routes', method: 'get'};
    distribution.local.comm.send(['newMethod'], remote, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v.newMethod()).toBe('This is a new method');
      } catch (error) {
        done(error);
        return;
      }
      remote.node = n2;
      distribution.local.comm.send(['newMethod'], remote, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v.newMethod()).toBe('This is a new method');
        } catch (error) {
          done(error);
          return;
        }
        remote.node = n3;
        distribution.local.comm.send(['newMethod'], remote, (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v.newMethod()).toBe('This is a new method');
          } catch (error) {
            done(error);
            return;
          }
          remote.node = n4;
          distribution.local.comm.send(['newMethod'], remote, (e, v) => {
            try {
              expect(e).toBeFalsy();
              expect(v.newMethod()).toBe('This is a new method');
            } catch (error) {
              done(error);
              return;
            }
            remote.node = n5;
            distribution.local.comm.send(['newMethod'], remote, (e, v) => {
              try {
                expect(e).toBeFalsy();
                expect(v.newMethod()).toBe('This is a new method');
                done();
              } catch (error) {
                done(error);
              }
            });
          });
        });
      });
    });
  });
});

test('(1 pts) student test', (done) => {
  // Test all.status
  distribution.mygroup.status.get('nonexistentGet', (e, v) => {
    try {
      Object.keys(mygroupGroup).forEach((sid) => {
        expect(e[sid]).toBeDefined();
        expect(e[sid]).toBeInstanceOf(Error);
      });
      expect(v).toEqual({});
    } catch (error) {
      done(error);
      return;
    }
  });

  const expectedV = [n1.port, n2.port, n3.port, n4.port, n5.port];
  distribution.mygroup.status.get('port', (e, v) => {
    try {
      expect(e).toEqual({});
      expect(Object.values(v).length).toBe(expectedV.length);
      expect(Object.values(v)).toEqual(expect.arrayContaining(expectedV));
      done();
    } catch (error) {
      done(error);
    }
  });
});

beforeAll((done) => {
  // First, stop the nodes if they are running
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


    const groupInstantiation = () => {
      // Create the groups
      distribution.local.groups
          .put(mygroupConfig, mygroupGroup, (e, v) => {
            done();
          });
    };


    // Now, start the nodes listening node
    distribution.node.start((server) => {
      localServer = server;

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
    }); ;
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
