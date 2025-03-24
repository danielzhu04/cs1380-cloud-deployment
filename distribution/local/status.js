const log = require('../util/log');

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

status.get = function(configuration, callback) {
  if (typeof callback != 'function' || !(callback instanceof Function)) {
      callback = function() {};
  }
  if (typeof configuration != 'string') {
      callback(new Error('Configuration in invalid format'));
      return;
  }

  if (configuration == 'nid') {
    callback(null, global.moreStatus.nid);
  } else if (configuration == 'sid') {
    callback(null, global.moreStatus.sid);
  } else if (configuration == 'ip') {
    callback(null, global.nodeConfig['ip']);
  } else if (configuration == 'port') {
    callback(null, global.nodeConfig['port']);
  } else if (configuration == 'counts') {
    callback(null, global.moreStatus.counts);
  } else if (configuration == 'heapTotal') {
    callback(null, process.memoryUsage().heapTotal);
  } else if (configuration == 'heapUsed') {
    callback(null, process.memoryUsage().heapUsed);
  } else {
    callback(new Error(`Unrecognized configuration ${configuration}`)); 
  }
};


status.spawn = require('@brown-ds/distribution/distribution/local/status').spawn; 
status.stop = require('@brown-ds/distribution/distribution/local/status').stop; 

module.exports = status;
