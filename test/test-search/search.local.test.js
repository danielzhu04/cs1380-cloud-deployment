const distribution = require('../../config.js');
const path = require('path');
const fs = require('fs');
const id = distribution.util.id;

jest.setTimeout(5000);

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

test('mock indexer', (done) => {
  const dataKeys = setUpURLs('../../distribution/all/search-engine/data/books.txt');

  shardURLs("myGroup", (e, v) => {
    distribution.myGroup.search.setup({datasetKeys: dataKeys, gid: "myGroup"}, (e, v) => {
      const searchResults = v;
      console.log("done with search setup, e is ", e);
      console.log("V is ", v);
      distribution.local.store.put(searchResults, "searchdb", (e, v) => {
        console.log("v is ", v);
        distribution.local.store.get("searchdb", (e, v) => {
          console.log('v is ', v);
          try {
            // expect(v.length).toBe(searchResults.length);
            expect(Object.keys(v)).toEqual(expect.arrayContaining(Object.keys(searchResults)));
            done();
          } catch (e) {
            done(e);
          }
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
