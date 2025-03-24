/** @typedef {import("../types").Callback} Callback */

const groups = require("../local/groups.js");
const localComm = require("../local/comm.js");

/**
 * NOTE: This Target is slightly different from local.all.Target
 * @typdef {Object} Target
 * @property {string} service
 * @property {string} method
 */

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
      callback = function() {};
    }

    let numRes = 0;
    const errMap = {};
    const valMap = {};

    groups.get(context.gid, (e, v) => {
      if (e) {
        callback(new Error(`Cannot retrieve group: ${e}`));
        return;
      }

      configuration["gid"] = "local";

      // v has form {sid: node object} where each sid corresponds to one node 
      const numNodes = Object.keys(v).length;
      Object.keys(v).forEach(sid => {
        const nodeObj = v[sid];
        const newRemote = {...configuration, node: nodeObj};
        localComm.send(message, newRemote, (e, v) => {
          if (e) {
            errMap[sid] = e;
          } else {
            valMap[sid] = v;
          }

          numRes += 1;
          if (numRes == numNodes) {
            callback(errMap, valMap);
          }
        });
      });
    });
  }

  return {send};
};

module.exports = comm;
