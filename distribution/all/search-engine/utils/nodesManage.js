const distribution = require('../../../../config.js');
const id = distribution.util.id;
const engineConfig = require('../engineConfig.js')
const fs = require('fs');
const log = require('./log')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

let localServer = null;
const searchGroupConfig = engineConfig.searchGroupConfig
const gid = engineConfig.searchGroupConfig.gid
const searchGroup = {};    
const n1 = engineConfig.workerNodes.n1
const n2 = engineConfig.workerNodes.n2
const n3 = engineConfig.workerNodes.n3
const batchSize = 4;
const kURLs = 10;

function addNodesToGroup() {
    searchGroup[id.getSID(n1)] = n1;
    searchGroup[id.getSID(n2)] = n2;
    searchGroup[id.getSID(n3)] = n3;
}

function shutDownNodes(cb) {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n2;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n3;
          distribution.local.comm.send([], remote, (e, v) => {
                cb(); 
            });
        });
    });
}

function setUpNodes(cb) {
    // 2. Call main setup function (after ensuring all nodes have been shutdown)
    const startNodes = () => {
        addNodesToGroup()
    
        const groupInstantiation = () => {
            // Create the groups
            distribution.local.groups.put(searchGroupConfig, searchGroup, (e, v) => {
                    distribution.search.groups.put(searchGroupConfig, searchGroup, (e,v) => {
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
    
            // Start the nodes
            distribution.local.status.spawn(n1, (e, v) => {
                distribution.local.status.spawn(n2, (e, v) => {
                    distribution.local.status.spawn(n3, (e, v) => {
                        groupInstantiation();
                    });
                });
            });
        });
    }; 

    // 1. Stop the nodes if they are running
    shutDownNodes(startNodes); 
}

let dataset = [] 
let datasetKeys = []
function setUpURLs(dataPath, cb) {
    try {
        let URLs = []
        // const fileContent = fs.readFileSync(dataPath, 'utf-8');
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
      cb(null, v);
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
    // shardURLs: shardURLs, 
    processAllBatches: processAllBatches,
    setUpServer: setUpServer,
    searchKeyTerm: searchKeyTerm,
    mergeQueueIntoSearchDB: mergeQueueIntoSearchDB
}

// function setUpServer(batchKeys, cb) {
//   const config = { gid: gid, datasetKeys: batchKeys };
//   // SE_LOG("SETUP SERVER CALLED w/ config:", config.gid, config.datasetKeys);
//   distribution[gid].search.setup(config, (e, v) => {
//       // Maybe do updating index here (might need to change mr)
//       // distribution.local.store.get(searchdb) <-- get object of terms: [{}]
//       // then just directly do put 

//       let newdb = v;
//       // 1) Read the current queue file.  If it doesn't exist or is empty, we start with an empty object
//       fs.readFile('newIndexQueue.json', 'utf8', (err, data) => {
//           let queueData = {};
//           if (!err && data) {
//               try {
//                   queueData = JSON.parse(data);
//               } catch (parseErr) {
//                   console.error("Failed to parse newIndexQueue.json:", parseErr);
//               }
//           }
  
//           // 2) Merge v into queueData
//           Object.keys(v).forEach(term => {
//           if (!(term in queueData)) {
//               queueData[term] = [];
//           }
//           // Append the array of {url: freq} objects
//           queueData[term] = queueData[term].concat(v[term]);
//           });
  
//           // 3) Write the updated queue data back to newIndexQueue.json
//           fs.writeFile('newIndexQueue.json', JSON.stringify(queueData, null, 2), (writeErr) => {
//           if (writeErr) {
//               console.error("Failed to write queue data:", writeErr);
//               return cb(writeErr);
//           }
//           console.log("Appended new batch results to newIndexQueue.json");
//           // Return the partial v or something else as needed
//           cb(null, v);
//           });
//       });
//   });
// }


// function mergeQueueIntoSearchDB(cb) {
//   // console.log("MERGE CALLED SEARCH DB")
//   fs.readFile('newIndexQueue.json', 'utf8', (err, data) => {
//       if (err) {
//         // If file doesn't exist, or there's an error reading, just skip
//       //   console.log("BEFORE GET SEARCH DB", err)
//         return cb(null, "No queued data found or error reading 'indexQueue.json'.");
//       }
      
//       // Handle empty file case
//       if (!data || data.trim().length === 0) {
//         return cb(null, "Queue file is empty — nothing to merge.");
//       }

//       let queueData = {};
//       try {
//         queueData = JSON.parse(data); // { term1: [ {urlA: freq}, {urlB: freq} ], ... }
//       } catch (parseErr) {
//         return cb(parseErr);
//       }
//       // console.log("BEFORE GET SEARCH DB")
//       // 2) Retrieve the existing global index from local store
//       distribution.local.store.get("searchdb", (err2, globalIndex) => {
//         if (err2 || !globalIndex) {
//           // If no global index or error, assume an empty object
//           globalIndex = {};
//         }
//         // 3) Merge queued entries into the existing globalIndex
//         // Track merged terms
//         const mergedTerms = [];
//         Object.keys(queueData).forEach(term => {
//           if (!(term in globalIndex)) {
//             globalIndex[term] = [];
//           }
//           // Append the array of {url: freq} from the queue
//           globalIndex[term] = globalIndex[term].concat(queueData[term]);
  
//           // Sort by descending frequency
//           globalIndex[term].sort((a, b) => {
//             const freqA = Object.values(a)[0];
//             const freqB = Object.values(b)[0];
//             return freqB - freqA;
//           });
  
//           // Keep only top K if you have a limit
//           globalIndex[term] = globalIndex[term].slice(0, kURLs);
//           mergedTerms.push(term); // Mark this term for removal
//         });
  
//         // 4) Store the updated global index back to 'searchdb'
//         distribution.local.store.put(globalIndex, 'searchdb', (err3) => {
//           if (err3) return cb(err3);
//           // Remove merged terms from the queue
//           mergedTerms.forEach(term => {
//             delete queueData[term];
//           });
//           // 5) Clear the queue file, so we don't merge the same data again
//           fs.writeFile('newIndexQueue.json', JSON.stringify(queueData, null, 2), (err4) => {
//             if (err4) return cb(err4);
//             // console.log("Merged queue into 'searchdb' and cleared 'newIndexQueue.json'.");
//             return cb(null, "Merge complete");
//           });
//         });
//       });
//   });    
// }