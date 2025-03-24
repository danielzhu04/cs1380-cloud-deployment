/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const local = distribution.local;
const id = distribution.util.id;
const config = distribution.node.config;
const routes = distribution.local.routes;

test('(1 pts) student test', (done) => {
  // Status get normal
  local.status.get('nid', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(id.getNID(config));
    } catch (error) {
      done(error);
    }
  });

  // Status get nonexistent node info
  local.status.get('nonexistent node info', (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
  // Routes get normal
  // (Get a service not already accounted for in routes.local.test.js)
  const store = local.store;

  routes.get('store', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(store);
    } catch (error) {
      done(error);
    }
  });

  // Routes get nonexistent config
  routes.get('nonexistent config', (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
    }
  });

  // Routes get invalid config (not a string)
  routes.get(['status'], (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
  // Routes put normal 
  const testService = {};

  testService.test = () => {
    return 'This is a test';
  };

  routes.put(testService, 'test', (e, v) => {
    routes.get('test', (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v.test()).toBe('This is a test');
      } catch (error) {
        done(error);
      }
    });
  });

  // Routes put invalid service
  routes.put("not an object", 'nao', (e, v) => {
    routes.get('nao', (e, v) => {
      try {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
      } catch (error) {
        done(error);
      }
    });
  });

  // Routes put invalid config
  const invalidConfig = {};

  invalidConfig.output = () => {
    return 'This is some output';
  };

  routes.put(invalidConfig, ['output'], (e, v) => {
    routes.get('output', (e, v) => {
      try {
        expect(e).toBeDefined();
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
  // Routes rem normal
  const store = local.store;

  routes.rem('store', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(store);
    } catch (error) {
      done(error);
    }
  });

  // Routes rem invalid config (not a string)
  routes.rem(['store'], (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
    }
  });

  // Routes rem nonexistent config
  routes.rem('nonexistent config', (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

test('(1 pts) student test', (done) => {
  // Comm send normal
  const remote = {node: config, service: 'status', method: 'get'};
  const message = ['ip'];

  local.comm.send(message, remote, (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(config.ip);
    } catch (error) {
      done(error);
    }
  });

  // Comm send bad args
  const badMessage = ['id']; // nonexistent status.get() node info 
  local.comm.send(badMessage, remote, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
    }
  });

  // Comm send bad remote
  const badRemote = {node: config, service: 'notStatus', method: 'notGet'};
  local.comm.send(message, badRemote, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

// /* Infrastructure for comm.send() test cases */

let localServer = null;

beforeAll((done) => {
  distribution.node.start((server) => {
    localServer = server;
    done();
  });
});

afterAll((done) => {
  localServer.close();
  done();
});