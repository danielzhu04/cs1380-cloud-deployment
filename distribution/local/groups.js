const { getSID } = require("../util/id");

const groups = {}; // {group name: {sid: node objects}}

groups.get = function(name, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }

    if (name in groups) {
        callback(null, groups[name]);
    } else {
        callback(new Error(`Cannot find name ${name} in groups`));
    }
};

groups.put = function(config, group, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof config != 'string' && typeof config != 'object') {
        callback(new Error('Config in invalid format'));
        return;
    }
    if (typeof group != 'object' || !(group instanceof Object)) {
        callback(new Error('Group in invalid format'));
        return;
    }

    let gid = config;
    let hash = null;
    if (typeof config == "object") {
        gid = config.gid;
        hash = config.hash;
    }
    distribution[gid] = {};
    distribution[gid].comm = require("../all/comm")({gid: gid});
    distribution[gid].status = require("../all/status")({gid: gid});
    distribution[gid].routes = require("../all/routes")({gid: gid});
    distribution[gid].groups = require("../all/groups")({gid: gid});
    distribution[gid].mem = require("../all/mem")({gid: gid, hash: hash});
    distribution[gid].store = require("../all/store")({gid: gid, hash: hash});
    distribution[gid].mr = require("../all/mr")({gid: gid});
    distribution[gid].search = require("../all/search-engine/service")({gid: gid});

    groups[gid] = group;
    if (config != 'all') { // modify 'all' group as well
        for (const key in group) {
            if (!groups['all']) {
                groups['all'] = {};
            }
            groups['all'][key] = group[key];
        }
    } 
    callback(null, group);
};

groups.del = function(name, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof name != 'string') {
        callback(new Error('Name in invalid format'));
        return;
    }

    if (name in groups) {
        const toDelete = groups[name];
        delete groups[name];
        callback(null, toDelete);
    } else {
        callback(new Error(`Cannot find name ${name} in groups`));
    }
};

groups.add = function(name, node, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof name != 'string') {
        callback(new Error('Name in invalid format'));
        return;
    }
    if (typeof node != 'object' || !(node instanceof Object)) {
        callback(new Error('Node in invalid format, should be object'));
        return;
    }

    if (name in groups) {
        try {
            const nodeSID = getSID(node);
            groups[name][nodeSID] = node;
            callback(null, node);
        } catch (error) {
            callback(new Error("Cannot retrieve SID: ", error));
        }
    } else {
        callback(new Error(`Cannot find name ${name} in groups`));
    }
};

groups.rem = function(name, node, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof name != 'string') {
        callback(new Error('Name in invalid format'));
        return;
    }
    if (typeof node != 'string') {
        callback(new Error('Node in invalid format, should be string'));
        return;
    }

    if (name in groups) {
        if (node in groups[name]) {
            const toRemove = groups[name][node];
            delete groups[name][node];
            callback(null, toRemove);
        } else {
            callback(new Error(`Cannot find node ${node} in groups for name ${name}`));
        }
    } else {
        callback(new Error(`Cannot find name ${name} in groups`));
    }
};

module.exports = groups;
