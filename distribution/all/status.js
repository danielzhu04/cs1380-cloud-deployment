const status = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    get: (configuration, callback) => {
      const remote = {service: "status", method: "get"};
      distribution[context.gid].comm.send([configuration], remote, (e, v) => {
        if (configuration == "counts" || configuration == "heapTotal" || configuration == "heapUsed") {
          let aggregate = 0;
          for (const currVal of Object.values(v)) {
            aggregate += currVal;
          }
          callback(e, aggregate);
        } else {
          callback(e, v);
        }
      });
    },

    spawn: (configuration, callback) => {
      distribution.local.status.spawn(configuration, (e, v) => {
        if (e) {
          callback(new Error(`Error spawning node: ${e}`));
          return;
        }

        distribution.local.groups.add(context.gid, v, (e, v) => {
          callback(e, v);
          distribution[context.gid].groups.add(context.gid, v, (e, v) => {
            // Ignore output for now -- we don't know which node groups know about 
            // the group we want to add the node to, so there may be errors even 
            // after we successfully add the node to the right group locally. 
          });
        });
      });
    },

    stop: (callback) => {
      remote = {service: "status", method: "stop"}
      distribution[context.gid].comm.send([], remote, (e, v) => {
        callback(e, v); 
      });
    },
  };
};

module.exports = status;
