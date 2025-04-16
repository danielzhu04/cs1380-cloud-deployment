const distribution = require('../../config.js');
const path = require('path');
const fs = require('fs');
const id = distribution.util.id;

jest.setTimeout(1000000);

const myGroup = {};

/*
    The local node will be the orchestrator.
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

let dataset = [];
function setUpURLs(dataPath) {
  let datasetKeys = []
  try {
    let URLs = [];
    const fileContent = fs.readFileSync(path.join(__dirname, dataPath), 'utf-8');
    const readURLs = fileContent.split('\n');
    readURLs.forEach(url => {
      datasetKeys.push(url)
      const kv = {}
      kv[url] = url
      URLs.push(kv)
    });
    dataset = URLs
    return datasetKeys;
  } catch (err) {
    return err;
  }
}


function shardURLs(gid, cb) {
  if (dataset.length == 0) {
      cb(null, 'empty') ;
      return
  }

  let cntr = 0;
    // Send the dataset to the worker nodes. 
    dataset.forEach((o) => {
      const key = Object.keys(o)[0];
      const value = o[key];
      distribution[gid].store.put(value, key, (e, v) => {
        cntr++;
        // Return to main repl once done. 
        if (cntr == dataset.length) {
          cb(e, v)
          return; 
        }
      });
  });
}

test('crawler and indexer 1: 1 book', (done) => {
  const dataKeys = setUpURLs('../../distribution/all/search-engine/data/test1.txt');

  shardURLs("myGroup", (e, v) => {
    distribution.local.store.del("searchdb", (e, v) => {
      distribution.myGroup.search.setup({datasetKeys: dataKeys, gid: "myGroup"}, (e, v) => {
        const searchResults = v;
        distribution.local.store.put(searchResults, "searchdb", (e, v) => {
          distribution.local.store.get("searchdb", (e, v) => {
            try {
              expect(Object.keys(v)).toEqual(Object.keys(searchResults)); // should contain the same keys
              Object.values(v).forEach((valList) => {
                // every value (a list) should be sorted by term frequency
                if (valList.length > 1) {
                  for (let i = 1; i < valList.length; i++) {
                    expect(Object.values(valList[i])[0]).toBeLessThanOrEqual(Object.values(valList[i - 1])[0]);
                  }
                }
              });
              expect(v["michael"].length).toBe(1);
              const mostFreqObj = Object.values(v["michael"][0]);
              expect(Object.values(mostFreqObj)[0]).toBe(6);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    });
  });
});

test('crawler and indexer 2: 4 books', (done) => {
  const dataKeys = setUpURLs('../../distribution/all/search-engine/data/test2.txt');

  shardURLs("myGroup", (e, v) => {
    distribution.local.store.del("searchdb", (e, v) => {
      // console.log("about to do setup");
      // console.log("datakeys are ", dataKeys);
      distribution.myGroup.search.setup({datasetKeys: dataKeys, gid: "myGroup"}, (e, v) => {
        // console.log("after doing setup");
        const searchResults = v;
        distribution.local.store.put(searchResults, "searchdb", (e, v) => {
          distribution.local.store.get("searchdb", (e, v) => {
            try {
              expect(Object.keys(v)).toEqual(Object.keys(searchResults));
              Object.values(v).forEach((valList) => {
                // every value (a list) should be sorted by term frequency
                if (valList.length > 1) {
                  for (let i = 1; i < valList.length; i++) {
                    expect(Object.values(valList[i])[0]).toBeLessThanOrEqual(Object.values(valList[i - 1])[0]);
                  }
                }
              });
              expect(v["daniel"].length).toBe(1);
              const mostFreqObj = Object.values(v["daniel"][0]);
              expect(Object.values(mostFreqObj)[0]).toBe(8);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    });
  });
});

test('crawler and indexer 3: 10 books', (done) => {
  const dataKeys = setUpURLs('../../distribution/all/search-engine/data/test3.txt');

  shardURLs("myGroup", (e, v) => {
    distribution.local.store.del("searchdb", (e, v) => {
      distribution.myGroup.search.setup({datasetKeys: dataKeys, gid: "myGroup"}, (e, v) => {
        const searchResults = v;
        distribution.local.store.put(searchResults, "searchdb", (e, v) => {
          distribution.local.store.get("searchdb", (e, v) => {
            try {
              expect(Object.keys(v)).toEqual(Object.keys(searchResults));
              Object.values(v).forEach((valList) => {
                // every value (a list) should be sorted by term frequency
                if (valList.length > 1) {
                  for (let i = 1; i < valList.length; i++) {
                    expect(Object.values(valList[i])[0]).toBeLessThanOrEqual(Object.values(valList[i - 1])[0]);
                  }
                }
              });
              expect(v["lidia"].length).toBe(1);
              const mostFreqObj = Object.values(v["lidia"][0]);
              expect(Object.values(mostFreqObj)[0]).toBe(38);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    });
  });
});

test('crawler and indexer 4: 25 books', (done) => {
  const dataKeys = setUpURLs('../../distribution/all/search-engine/data/test4.txt');

  shardURLs("myGroup", (e, v) => {
    distribution.local.store.del("searchdb", (e, v) => {
      distribution.myGroup.search.setup({datasetKeys: dataKeys, gid: "myGroup"}, (e, v) => {
        const searchResults = v;
        distribution.local.store.put(searchResults, "searchdb", (e, v) => {
          distribution.local.store.get("searchdb", (e, v) => {
            try {
              expect(Object.keys(v)).toEqual(Object.keys(searchResults));
              Object.values(v).forEach((valList) => {
                // every value (a list) should be sorted by term frequency
                if (valList.length > 1) {
                  for (let i = 1; i < valList.length; i++) {
                    expect(Object.values(valList[i])[0]).toBeLessThanOrEqual(Object.values(valList[i - 1])[0]);
                  }
                }
              });
              expect(v["adam"].length).toBe(9);
              const mostFreqObj = Object.values(v["adam"][0]);
              expect(Object.values(mostFreqObj)[0]).toBe(34);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    });
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