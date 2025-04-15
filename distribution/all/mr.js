/** @typedef {import("../types").Callback} Callback */
const id = distribution.util.id;

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Map functions used for mapreduce
 * @callback Mapper
 * @param {any} key
 * @param {any} value
 * @returns {object[]}
 */

/**
 * Reduce functions used for mapreduce
 * @callback Reducer
 * @param {any} key
 * @param {Array} value
 * @returns {object}
 */

/**
 * @typedef {Object} MRConfig
 * @property {Mapper} map
 * @property {Reducer} reduce
 * @property {string[]} keys
 */


/*
  Note: The only method explicitly exposed in the `mr` service is `exec`.
  Other methods, such as `map`, `shuffle`, and `reduce`, should be dynamically
  installed on the remote nodes and not necessarily exposed to the user.
*/

function generateStr(strLen) {
  let str = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < strLen; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

function mr(config) {
  const context = {
    gid: config.gid || 'all',
  };

  /**
   * @param {MRConfig} configuration
   * @param {Callback} cb
   * @return {void}
   */
  function exec(configuration, cb) {
    const uniqueID = "mr-" + generateStr(10);
    const mrTempService = {};
    // Establish methods map, shuffle, and reduce
    function map(config, callback) {
      if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
      }

      const gid = config["gid"];
      const keys = config["keys"];
      const nid = config["nid"];
      const uniqueID = config.uniqueID
      const nidValues = {[nid]: []}; // Format is <nid, [map results]>
      
      // Create an array of promises for each key.
      const promises = keys.map(key => {
        return new Promise((resolve, reject) => {
          // Retrieve each key from the distributed store.
          distribution[gid].store.get(key, (e, v) => {
            if (e) return reject(new Error(`Cannot get key from distributed store in map: ${e}`));
            // IMPORTANT: Await the async mapper here.
            config["map"](key, v, { "gid": gid })
              .then(mapResult => {
                if (mapResult instanceof Array) {
                  nidValues[nid] = nidValues[nid].concat(mapResult);
                } else {
                  nidValues[nid].push(mapResult);
                }
                resolve();
              })
              .catch(reject);
          });
        });
      });

      // Wait for all promises to resolve.
      Promise.all(promises)
        .then(() => {
          distribution.local.store.put(nidValues[nid], uniqueID, (e, v) => {
            if (e) {
              callback(new Error("Cannot put map results into local store"));
              return;
            }
            callback(null, nidValues);
          });
        })
        .catch(callback);
    }

    function shuffle(config, callback) {
      if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
      }

      const gid = config["gid"];
      const nid = config["nid"];
      const uniqueID = config.uniqueID
      const keyValues = {}; // Format is <key: [values]>

      // Retrieve stored <uniqueID, [map results]> from local store
      distribution.local.store.get(uniqueID, (e, v) => {
        if (e) {
          callback(new Error(`Cannot get key ${nid} from local store in shuffle phase: ${e}`));
          return;
        }

        v.forEach((kvPair) => {
          const key = Object.keys(kvPair)[0]; // Get the key for each map result
          const value = Object.values(kvPair)[0]; // Get the value for each map result 

          if (!(key in keyValues)) {
            keyValues[key] = [];
          }
          keyValues[key].push(value);
        });

        let counter = 0;
        Object.keys(keyValues).forEach((key) => {
          let valList = keyValues[key];
          distribution[gid].mem.append(valList, key, (e, v) => {
            if (e) {
              callback(new Error("Cannot append shuffle results to distributed mem"));
              return;
            }

            counter += 1;
            if (counter == Object.keys(keyValues).length) {
              callback(null, keyValues);
              return;
            }
          });
        });
      });
    }

    function reduce(config, callback) {
      if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
      }

      const gid = config["gid"];
      const aggregates = {};
      let keyValues = []; // Format is [{key: value}, ...]
      let keyValuesObj = {};

      distribution.local.mem.getAll((e, allKeys) => {
        if (e) {
          callback(new Error("Error getting all local mem keys in reduce"));
          return;
        }

        if (allKeys.length == 0) { // If no keys, just return empty keyValues
          callback(null, keyValues);
          return;
        }

        let counter = 0;
        allKeys.forEach((key) => { // Retrieve values per key
          distribution.local.mem.get({gid: gid, key: key}, (e, v) => {
            if (e) {
              callback(new Error("Error getting local mem values in reduce"));
              return;
            }

            if (!(key in aggregates)) {
              aggregates[key] = v;
            } else {
              aggregates[key] = aggregates[key].concat(v);
            }

            counter += 1;
            if (counter == allKeys.length) {
              counter = 0;

              Object.keys(aggregates).forEach((key) => {
                const redResult = config["reduce"](key, aggregates[key], {"gid": gid});
                if (redResult instanceof Array) {
                  keyValues = keyValues.concat(redResult);
                } else {
                  // console.log("THE RESULT IS ", redResult);
                  // Note: extremely implementation-specific design
                  Object.keys(redResult).forEach((key) => {
                    if (!(key in keyValuesObj)) {
                      keyValuesObj[key] = [];
                    }
                    keyValuesObj[key] = keyValuesObj[key].concat(redResult[key]);
                  });
                  // keyValues.push(redResult); // change to edit object 
                }

                counter += 1;
                if (counter == Object.keys(aggregates).length) {
                  // console.log("CALLING BACK, keyValuesObj is ", keyValuesObj);
                  if (Object.keys(keyValuesObj).length > 0) {
                    console.log("CALLING BACK WITH KEYVALUESOBJ");
                    callback(null, keyValuesObj);
                  } else {
                    console.log("CALLING BACK WITH NORMAL KEYVALUES");
                    callback(null, keyValues);
                  }
                  // callback(null, keyValues);
                  return;
                }
              });
            }
          });
        });
      });
    }

     // Clean up all local KVs associated with the current mr ID in all mr nodes. 
     const mapCleanup = (config, callback) => {
      let MID = config.uniqueID

      distribution.local.store.del(MID, (err, v) => {
        callback(err, v)
      })
    }

    mrTempService.map = map;
    mrTempService.reduce = reduce;
    mrTempService.shuffle = shuffle;
    mrTempService.mapCleanup = mapCleanup; 

    // Register temporary service endpoint on each node
    distribution[context.gid].routes.put(mrTempService, uniqueID, (e, v) => {
      if (Object.keys(e).length != 0) {
        console.log("e is ", e);
        cb(new Error('Cannot create temporary service endpoint'));
        return;
      }

      // Retrieve nodes and distribute keys among them
      distribution.local.groups.get(context.gid, (e, v) => { // v is <sid: node obj>
        if (e) {
          cb(new Error("Cannot get local groups"));
          return;
        }
        
        let nodesTOCleanup = v // For Map phase clean up at the end. 

        const nidsToNodes = {};
        Object.values(v).forEach(node => {
          const nid = id.getNID(node);
          nidsToNodes[nid] = node;
        });

        const nidsToKeys = {}; // Format is <nid: [key]>
        configuration.keys.forEach((key) => {
          const kid = id.getID(key);
          const putNid = id.consistentHash(kid, Object.keys(nidsToNodes));

          if (!(putNid in nidsToKeys)) {
            nidsToKeys[putNid] = [];
          }
          nidsToKeys[putNid].push(key);
        });

        // Start map phase
        const numNodes = Object.keys(v).length;
        let numResponses = 0;
        let mapResults = {}; // Stores results of map phase, format is <nid: [map results]>
        Object.keys(nidsToKeys).forEach((nid) => { // Each iteration corresponds to a new node
          const keyList = nidsToKeys[nid];
          const remote = {service: uniqueID, method: 'map', node: nidsToNodes[nid]};
          const message = {gid: context.gid, nid: nid, keys: keyList, map: configuration["map"], uniqueID: uniqueID};
          distribution.local.comm.send([message], remote, (e, v) => {
            if (e) {
              cb(new Error("Error mapping with local comm"));
              return;
            }

            mapResults = Object.assign(mapResults, v);

            numResponses += 1;
            if (numResponses == Object.keys(nidsToKeys).length) {
              // Start shuffle phase
              numResponses = 0;
              let shuffledPairs = {};
              Object.keys(mapResults).forEach((nid) => {
                const kvPairs = mapResults[nid];
                const remote = {service: uniqueID, method: 'shuffle', node: nidsToNodes[nid]};
                const message = {gid: context.gid, nid: nid, pairs: kvPairs, uniqueID: uniqueID};
                distribution.local.comm.send([message], remote, (e, v) => {
                  if (e) {
                    cb(new Error("Error shuffling with local comm"));
                    return;
                  }

                  numResponses += 1;

                  const kvPairMap = v; // Format is <map key, [map values]>
                  Object.keys(kvPairMap).forEach((key) => {
                    if (!(key in shuffledPairs)) {
                      shuffledPairs[key] = kvPairMap[key];
                    } else {
                      shuffledPairs[key] = shuffledPairs[key].concat(kvPairMap[key]);
                    }
                  });

                  if (numResponses == Object.keys(mapResults).length) {
                    // Start reduce phase
                    numResponses = 0;
                    let retList = [];
                    const retObj = {};
                    // const objectTracker = {};
                    Object.keys(nidsToNodes).forEach((nid) => {
                      const remote = {service: uniqueID, method: 'reduce', node: nidsToNodes[nid]};
                      const message = {gid: context.gid, reduce: configuration["reduce"], uniqueID: uniqueID};
                      console.log("About to call reduce");
                      distribution.local.comm.send([message], remote, (e, v) => {
                        console.log("AFTER CALLING REDUCE USING LOCAL COMM");
                        console.log("AFTER reduce, e is ", e);
                        // console.log("AFTER reduce, v is ", v);
                        if (e) {
                          cb(new Error("Error reducing with local comm"));
                          return;
                        }

                        if (v instanceof Array) {
                          if (Object.keys(v).length != 0) {
                            retList = retList.concat(v);
                          }
                        } else {
                          console.log("IN NON-ARRAY RETLIST REDUCE CHECK");
                          Object.keys(v).forEach((key) => {
                            if (!(key in retObj)) {
                              retObj[key] = [];
                            }
                            retObj[key] = retObj[key].concat(v[key]);
                          })
                          // retList.push(v);
                        }
                        console.log("after populating retlist or retobj");

                        // NEXT STEPS: need to check if something is an object and if so, 
                        // somehow merge results together
                        // maybe check for each obj in retlist, if that obj shares
                        // key with new obj, then concat values (values should always be lists)
                        // and update current retlist object

                        // also need to sort the list by value (by word count, can maybe just do that here?) --
                        // maybe do this at the very end

                        numResponses += 1;
                        if (numResponses == numNodes) {
                          // Done with all 3 phases, starting teardown
                          // NEED TO UPDATE OBJECT TRACKER
                          console.log("sorting retobj");
                          try {
                            if (Object.keys(retObj).length > 0 && Object.values(retObj)[0] instanceof Array) { 
                              Object.keys(retObj).forEach((term) => {
                                retObj[term].sort((x, y) => {
                                  return Object.values(y)[0] - Object.values(x)[0];
                                });
                              });
                              // console.log("FINISHED RETOBJ IS ", retObj);
                            }
                          } catch (error) {
                            console.error("ERROR IN SORTING ", error);
                          }
                          
                         
                          // try {
                          //   if (Object.keys(objectTracker).length > 0 && Object.values(objectTracker)[0] instanceof Array) {
                              
                          //     Object.keys(objectTracker).forEach((term) => {
                          //       objectTracker[term].sort((x, y) => { // sort a list of {k: v} objects
                          //         return Object.values(y)[0] - Object.values(x)[0];
                          //       });
                          //     });
                          //   } else {
                              
                          //   }
                          // } catch (error) {
                           
                          // }
                          console.log("passed sorting phase, in cleanup phase");

                          let remNodeCount = 0; 
                          Object.keys(nodesTOCleanup).forEach(nk => {
                            const remote = {service: uniqueID, method: 'mapCleanup', node: nodesTOCleanup[nk]};
                            const mapFinConfig = {gid: context.gid, uniqueID: uniqueID}
                            const message = [mapFinConfig]
                            distribution.local.comm.send(message, remote, (e,v) => {
                              remNodeCount += 1
                              
                              if (remNodeCount == Object.keys(nodesTOCleanup).length) {
                                console.log("reached remnodecount");
                                distribution[context.gid].mem.delAll((e, v) => {
                                  distribution[context.gid].routes.rem(mrTempService, uniqueID, (e1, v1) => {
                                    // NOTE: return object tracker if its key list is nonempty
                                    // cb(null, retList);
                                    // if (Object.keys(objectTracker).length > 0) {
                                    //   // change retlist;
                                    //   retList = [];
                                    //   Object.keys(objectTracker).forEach((term) => {
                                    //     retList.push({[term]: objectTracker[term]});
                                    //   });
                                    //   // ("should be returning new retList");
                                    // } else {
                                    //   // console.log("no need to change retlist");
                                    // }
                                    console.log("about to return entirely");
                                    if (Object.keys(retObj).length > 0) {
                                      // console.log("returning retobj, retobj is ", retObj);
                                      cb(null, retObj);
                                      return;
                                    } else {
                                      // console.log("returning retlist, retlist is ", retList);
                                      cb(null, retList);
                                      return;
                                    }
                                    console.log("******ABOUT TO CALL BACK FROM MR");
                                    // cb(null, retList);
                                    return;
                                  });
                              })
                            }
                          }); 
                          });
                        }
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
  }

  return {exec};
};

module.exports = mr;
