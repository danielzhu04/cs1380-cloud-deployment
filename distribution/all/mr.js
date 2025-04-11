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
      let counter = 0;
      keys.forEach((key) => {
        // Retrieve each key from the distributed store
        distribution[gid].store.get(key, (e, v) => {
          if (e) {
            callback(new Error(`Cannot get key from distributed store in map: ${e}`));
            return;
          }
          // Apply the map function to the key 
          console.log("key is ", key);
          console.log("v is ", v);
          const mapResult = config["map"](key, v, {"gid": gid});
          console.log("AFTER RAW MAP, type of result is ", typeof mapResult);
          // console.log("after map is ", mapResult);
          if (mapResult instanceof Array) {
            nidValues[nid] = nidValues[nid].concat(mapResult); // If result is an array, concat to existing array
          } else {
            nidValues[nid].push(mapResult); // If result is not an array, push to existing array 
          }

          counter += 1;
          if (counter == keys.length) {
            // Put each of the map results into the local store, format is <uniqueID, [map results]>
            distribution.local.store.put(nidValues[nid], uniqueID, (e, v) => {
              if (e) {
                callback(new Error("Cannot put map results into local store"));
                return;
              }

              console.log("About to return from map wrapper");
              // console.log("ABOUT TO RET FROM MAP WRAPPER, nidvals are ", nidValues);
              callback(null, nidValues);
              return;
            });
          }
        });
      });
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
                  keyValues.push(redResult);
                }

                counter += 1;
                if (counter == Object.keys(aggregates).length) {
                  callback(null, keyValues);
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
        console.log("STARTING MAP PHASE");
        const numNodes = Object.keys(v).length;
        let numResponses = 0;
        let mapResults = {}; // Stores results of map phase, format is <nid: [map results]>
        Object.keys(nidsToKeys).forEach((nid) => { // Each iteration corresponds to a new node
          const keyList = nidsToKeys[nid];
          const remote = {service: uniqueID, method: 'map', node: nidsToNodes[nid]};
          const message = {gid: context.gid, nid: nid, keys: keyList, map: configuration["map"], uniqueID: uniqueID};
          distribution.local.comm.send([message], remote, (e, v) => {
            if (e) {
              console.log("E is ", e);
              cb(new Error("Error mapping with local comm"));
              return;
            }

            mapResults = Object.assign(mapResults, v);

            numResponses += 1;
            if (numResponses == Object.keys(nidsToKeys).length) {
              console.log("MAPRESULTS ARE: ", mapResults); // mapresults undefined
              console.log("STARTING SHUFFLE PHASE");
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
                    console.log("STARTING REDUCE PHASE");
                    // Start reduce phase
                    numResponses = 0;
                    let retList = [];
                    const objectTracker = {};
                    Object.keys(nidsToNodes).forEach((nid) => {
                      const remote = {service: uniqueID, method: 'reduce', node: nidsToNodes[nid]};
                      const message = {gid: context.gid, reduce: configuration["reduce"], uniqueID: uniqueID};
                      distribution.local.comm.send([message], remote, (e, v) => {
                        if (e) {
                          cb(new Error("Error reducing with local comm"));
                          return;
                        }

                        if (v instanceof Array) {
                          console.log("V IS INSTANCEOF ARRAY");
                          if (Object.keys(v).length != 0) {
                            console.log("V is ", v);
                            retList = retList.concat(v);

                            // loop through elements in v and add to objecttracker
                            Object.keys(v).forEach((key) => {
                              if (v[key] instanceof Object) {
                                const currKey = Object.keys(v[key])[0];
                                const currVal = v[key][currKey];

                                if (!(currKey in objectTracker)) {
                                  objectTracker[currKey] = currVal;
                                } else {
                                  if (currVal instanceof Array) {
                                    objectTracker[currKey] = objectTracker[currKey].concat(currVal);
                                  } else {
                                    objectTracker[currKey] = currVal;
                                  }
                                }
                              }
                            });

                            // or can maybe check to see if v is of type object, and see if the
                            // v key exists in retlist items -- can maybe loop through retlist
                            // and then retrive keys, and then check to see if any key == v key
                            // handle 2 cases: if list, then concat, else if number, then add
                          }
                        } else {
                          retList.push(v);

                          console.log("In else condition, v is ", v);
                          if (v instanceof Object) {
                            const key = Object.keys(v)[0];
                            const val = v[key];

                            if (!(key in objectTracker)) {
                              objectTracker[key] = val;
                            } else {
                              if (val instanceof Array) {
                                objectTracker[key] = objectTracker[key].concat(val);
                              } else {
                                objectTracker[key] = val;
                              }
                            }
                          }
                        }
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
                          console.log("About to update object tracker");
                          try {
                            if (Object.keys(objectTracker).length > 0 && Object.values(objectTracker)[0] instanceof Array) {
                              console.log("need to sort list");
                              Object.keys(objectTracker).forEach((term) => {
                                objectTracker[term].sort((x, y) => { // sort a list of {k: v} objects
                                  return Object.values(y)[0] - Object.values(x)[0];
                                });
                              });
                            } else {
                              console.log("don't need to sort list");
                            }
                          } catch (error) {
                            console.log("Error is ", error);
                          }


                          console.log("OBJECT TRACKER IS: ", objectTracker);
                          console.log("RETLIST ATP IS ", retList);


                          let remNodeCount = 0; 
                          Object.keys(nodesTOCleanup).forEach(nk => {
                            const remote = {service: uniqueID, method: 'mapCleanup', node: nodesTOCleanup[nk]};
                            const mapFinConfig = {gid: context.gid, uniqueID: uniqueID}
                            const message = [mapFinConfig]
                            distribution.local.comm.send(message, remote, (e,v) => {
                              remNodeCount += 1
                              
                              if (remNodeCount == Object.keys(nodesTOCleanup).length) {
                                distribution[context.gid].mem.delAll((e, v) => {
                                  distribution[context.gid].routes.rem(mrTempService, uniqueID, (e1, v1) => {
                                    // NOTE: return object tracker if its key list is nonempty
                                    // cb(null, retList);
                                    if (Object.keys(objectTracker).length > 0) {
                                      // change retlist;
                                      retList = [];
                                      Object.keys(objectTracker).forEach((term) => {
                                        retList.push({[term]: objectTracker[term]});
                                      });
                                      console.log("should be returning new retList");
                                    } else {
                                      console.log("no need to change retlist");
                                    }
                                    cb(null, retList);
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
