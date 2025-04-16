const distribution = require('../../../../config.js');
const id = distribution.util.id;
const engineConfig = require('../engineConfig.js')
const fs = require('fs');
 
let localServer = null;
const searchGroupConfig = engineConfig.searchGroupConfig
const gid = engineConfig.searchGroupConfig.gid
const searchGroup = {};    
const n1 = engineConfig.workerNodes.n1
const n2 = engineConfig.workerNodes.n2
const n3 = engineConfig.workerNodes.n3
const n4 = engineConfig.workerNodes.n4
const n5 = engineConfig.workerNodes.n5 
const n6 = engineConfig.workerNodes.n6 
const n7 = engineConfig.workerNodes.n7
const batchSize = engineConfig.batchSize;
const kURLs = engineConfig.kURLs;

function addNodesToGroup() {
    searchGroup[id.getSID(n1)] = n1;
    searchGroup[id.getSID(n2)] = n2;
    searchGroup[id.getSID(n3)] = n3;
    searchGroup[id.getSID(n4)] = n4;
    searchGroup[id.getSID(n5)] = n5;
    searchGroup[id.getSID(n6)] = n6;
    searchGroup[id.getSID(n7)] = n7;
    
}

function shutDownNodes(cb) {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
      distribution.local.comm.send([], remote, (e, v) => {
        console.log('shutdown e: ', e, "v: ", v)
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
                  remote.node = n7;
                  distribution.local.comm.send([], remote, (e, v) => {
                        cb(); 
                    });
                  });
                });
              });
            });
        });
    });
}

function setUpNodes(cb) {
    // 2. Call main setup function (after ensuring all nodes have been shutdown)
    const startNodes = () => {
        console.log("ENTER START NODES")
        addNodesToGroup()
    
        const groupInstantiation = () => {
            // Create the groups
            distribution.local.groups.put(searchGroupConfig, searchGroup, (e, v) => {
                console.log("GROUP PUT: ", e, v)
                    distribution.search.groups.put(searchGroupConfig, searchGroup, (e,v) => {
                        console.log("GROUP ALL PUT: ", e, v)
                        if (Object.keys(e).length == 0) {
                            cb(null,localServer)
                        } else {
                            cb(e, null)
                        }
                    })
            });
        };

        // Now, start the nodes listening node
        distribution.node.start((server) => {
          localServer = server;
          groupInstantiation();
    
            // Start the nodes
            // distribution.local.status.spawn(n1, (e, v) => {
            //     console.log('e: ', e, "v: ", v)
            //     distribution.local.status.spawn(n2, (e, v) => {
            //         distribution.local.status.spawn(n3, (e, v) => {
            //             groupInstantiation();
            //         });
            //     });
            // });
        });
    }; 

    startNodes()
    // 1. Stop the nodes if they are running
    // shutDownNodes(startNodes); 
}

let dataset = [] 
let datasetKeys = []
function setUpURLs(dataPath, cb) {
    try {
        let URLs = []
        const path = require('path');
        const fileContent = fs.readFileSync(path.join(__dirname, dataPath), 'utf-8');
        const readURLs = fileContent.split('\n');
        readURLs.forEach(url => {
            datasetKeys.push(url)
            const kv = {}
            kv[url] = url
            URLs.push(kv)
        });
        dataset = URLs
        cb(null, URLs.length)
    } catch (err) {
        cb(err, null)
    }
}
let fileUpdateInProgress = false;
let fileUpdateQueue = [];


function updateQueueFile(updater, cb) {
  fileUpdateQueue.push({ updater, cb });
  processQueue();
}

function processQueue() {
  if (fileUpdateInProgress) return;
  if (fileUpdateQueue.length === 0) return;
  fileUpdateInProgress = true;
  const next = fileUpdateQueue.shift();
  fs.readFile('newIndexQueue.json', 'utf8', (err, data) => {
    let queueData = {};
    if (!err && data) {
      try {
        queueData = JSON.parse(data);
      } catch (parseErr) {
        console.error(parseErr);
      }
    }
    let updatedData;
    try {
      updatedData = next.updater(queueData) || {};
    } catch (uErr) {
      fileUpdateInProgress = false;
      next.cb(uErr);
      process.nextTick(processQueue);
      return;
    }
    fs.writeFile('newIndexQueue.json', JSON.stringify(updatedData, null, 2), (writeErr) => {
      fileUpdateInProgress = false;
      next.cb(writeErr);
      process.nextTick(processQueue);
    });
  });
}

function setUpServer(batchKeys, cb) {
  const config = { gid: gid, datasetKeys: batchKeys };
  distribution[gid].search.setup(config, (err, v) => {
    if (err) {
      return cb(err);
    }
    cb(null, v);
    
    updateQueueFile((queueData) => {
      Object.keys(v).forEach(term => {
        if (!queueData[term]) {
          queueData[term] = [];
        }
        queueData[term] = queueData[term].concat(v[term]);
      });
      return queueData;
    }, (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return cb(updateErr);
      }
      console.log("Appended new batch results to newIndexQueue.json");
      // cb(null, v);
    });
  });
}


function processBatch(batch, cb) {
    let cntr = 0;
    let batchKeys = []; // Collect keys for this batch
    
    batch.forEach(o => {
      const key = Object.keys(o)[0];
      const value = o[key];
      batchKeys.push(key);
      
      // Shard: Store the URL's value with its key.
      distribution[gid].store.put(value, key, (e, v) => {
        cntr++;
        if (e) {
          return cb(e);
        }
        // When all URLs in the batch have been processed:
        if (cntr === batch.length) {
          // Now setup the server for this batch:
          setUpServer(batchKeys, (e, v) => {
            if (e) {
              return cb(e);
            }
            cb(null, v);
          });
        }
      });
    });
}

function processAllBatches(finalCallback) {
    if (dataset.length === 0) {
      return finalCallback(null, "All batches processed");
    }
    const start = performance.now();
    // Extract the next batch (up to 4 URLs)
    const batch = dataset.splice(0, batchSize);
    processBatch(batch, (err, result) => {
      if (err) return finalCallback(err);
      const end = performance.now();
      console.log(`Batch latency: ${(end - start).toFixed(2)} ms`);
      // After processing this batch, process the next one recursively.
      setTimeout(() => {
        processAllBatches(finalCallback);
      }, 500); // 500 ms delay – adjust as needed
    });
}


function mergeQueueIntoSearchDB(cb) {
  updateQueueFile((queueData) => {
    return queueData;
  }, (updateErr) => {
    if (updateErr) {
      return cb(updateErr);
    }
    fs.readFile('newIndexQueue.json', 'utf8', (err, data) => {
      if (err || !data) {
        return cb(null, "Queue file empty or read error, nothing to merge.");
      }
      let queueData;
      try {
        queueData = JSON.parse(data);
      } catch (e) {
        return cb(e);
      }
      if (!queueData || Object.keys(queueData).length === 0) {
        return cb(null, "Queue file is empty - nothing to merge.");
      }
      distribution.local.store.get("searchdb", (err2, globalIndex) => {
        if (err2 || !globalIndex) {
          globalIndex = {};
        }
        const mergedTerms = [];
        Object.keys(queueData).forEach(term => {
          if (!globalIndex[term]) {
            globalIndex[term] = [];
          }
          globalIndex[term] = globalIndex[term].concat(queueData[term]);
          globalIndex[term].sort((a, b) => {
            const freqA = Object.values(a)[0];
            const freqB = Object.values(b)[0];
            return freqB - freqA;
          });
          globalIndex[term] = globalIndex[term].slice(0, kURLs);
          mergedTerms.push(term);
        });
        distribution.local.store.put(globalIndex, 'searchdb', (err3) => {
          if (err3) return cb(err3);
          mergedTerms.forEach(term => {
            delete queueData[term];
          });
          fs.writeFile('newIndexQueue.json', JSON.stringify(queueData, null, 2), (err4) => {
            if (err4) return cb(err4);
            cb(null, "Merge complete");
          });
        });
      });
    });
  });
}

function searchKeyTerm(searchTerms, cb) {
    const config = {gid: gid, terms: searchTerms}
    distribution[gid].search.query(config, (e,v) => {
        if (v) {
            cb(null, v)
            return; 
        } else {
            cb(e, null)
            return; 
        }
    })
}

module.exports = {
    setUpNodes: setUpNodes, 
    shutDownNodes: shutDownNodes,
    setUpURLs: setUpURLs,  
    processAllBatches: processAllBatches,
    setUpServer: setUpServer,
    searchKeyTerm: searchKeyTerm,
    mergeQueueIntoSearchDB: mergeQueueIntoSearchDB,
    batchSize: batchSize
}
