const id = require('../util/id');

let memMap = {}; // format {name: obj}
let gidMemMap = {} // format {gid: name: obj}

function put(state, configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  if (typeof configuration == 'string' || configuration == null) {
    let key = configuration;
    if (configuration == null) {
      key = id.getID(state);
    }
    memMap[key] = state;
    callback(null, state);
    return;
  }

  // Now, configuration must be object
  let key = configuration.key;
  if (typeof key == 'undefined' || key == null) {
    key = id.getID(state);
  }
  const gid = configuration.gid;
  if (typeof gid == 'undefined' || gid == null) {
    memMap[key] = state;
    callback(null, state);
  } else {
    if (!(gid in gidMemMap)) {
      gidMemMap[gid] = {};
    }
    gidMemMap[gid][key] = state;
    callback(null, state);
  }
};

function get(configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  if (typeof configuration == 'string') {
    if (configuration in memMap) {
      callback(null, memMap[configuration]);
      return;
    } else {
      callback(new Error(`Cannot find configuration ${configuration} in mem`));
      return;
    }
  }

  // Now, configuration must be object
  const gid = configuration.gid;
  const key = configuration.key;
  if (typeof gid == 'undefined' || typeof key == 'undefined') {
    callback(new Error(`Undefined gid or key in configuration`));
    return;
  }
  if (gid in gidMemMap) {
    if (key in gidMemMap[gid]) {
      callback(null, gidMemMap[gid][key]);
    } else {
      callback(new Error(`Cannot find key ${key} in mem`));
    }
  } else {
    callback(new Error(`Cannot find gid ${gid} in mem`));
  }
}

function del(configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  if (typeof configuration == 'string') {
    if (configuration in memMap) {
      const deleted = memMap[configuration];
      delete memMap[configuration];
      callback(null, deleted);
      return;
    } else {
      callback(new Error(`Cannot find configuration ${configuration} to delete`));
      return;
    }
  }

  // Now, configuration must be object
  const gid = configuration.gid;
  const key = configuration.key;
  if (typeof gid == 'undefined' || typeof key == 'undefined') {
    callback(new Error(`Undefined gid or key in configuration`));
    return;
  }
  if (gid in gidMemMap) {
    if (key in gidMemMap[gid]) {
      const deleted = gidMemMap[gid][key];
      delete gidMemMap[gid][key];
      callback(null, deleted);
    } else {
      callback(new Error(`Cannot find key ${key} in mem`));
    }
  } else {
    callback(new Error(`Cannot find gid ${gid} in mem`));
  }
};

function getAll(callback) {
  let retMap = {};

  retMap = Object.assign(retMap, memMap);
  Object.keys(gidMemMap).forEach((gid) => {
    retMap = Object.assign(retMap, gidMemMap[gid]);
  });

  callback(null, Object.keys(retMap));
}

function append(state, configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  get(configuration, (e, v) => {
    if (!e) { // If item already exists in mem
      const prevVal = v;

      del(configuration, (e, v) => { // Delete old item
        if (e) {
          callback(new Error("Cannot delete duplicate in append"));
          return;
        }

        let toAppend = [];

        if (prevVal instanceof Array) {
          toAppend = prevVal;
        } else {
          toAppend.push(prevVal);
        }

        if (state instanceof Array) {
          toAppend = toAppend.concat(state);
        } else {
          toAppend.push(state);
        }

        put(toAppend, configuration, (e, v) => {
          callback(e, v);
        })
      })
    } else {
      put(state, configuration, (e, v) => {
        callback(e, v);
      })
    }
  });
}

function delAll(callback) {
  memMap = {};
  gidMemMap = {};
  callback(null, {});
}

module.exports = {put, get, del, getAll, append, delAll};
