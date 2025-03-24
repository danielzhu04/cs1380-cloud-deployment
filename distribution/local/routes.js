/** @typedef {import("../types").Callback} Callback */


const serviceMap = {}; // format: <str names, func services>

/**
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }

    const configObjKeys = ['service', 'gid'];
    if (typeof configuration != 'string' 
        && ((typeof configuration != 'object' || !(configuration instanceof Object)) 
            && configObjKeys.every(key => Object.keys(configuration).includes(key)))) {
        callback(new Error('Configuration in invalid format'));
        return;
    }

    if (typeof configuration == 'string') {
        if (configuration in serviceMap) {
            callback(null, serviceMap[configuration]);
            return;
        } else {
            const rpc = global.toLocal[configuration];
            if (rpc) {
                callback(null, {call: rpc});
            } else {
                callback(new Error('Cannot find configuration'));
            }
            return;
        }
    }

    // Else, type of configuration must be an object
    const serviceName = configuration.service;
    if (serviceName in serviceMap) {
        let gid = configuration['gid'];
        if (!gid || gid == 'local') {
            callback(null, serviceMap[serviceName]);
            return;
        }
        callback(null, distribution[gid][serviceName]);
    } else {
        const rpc = global.toLocal[serviceName];
        if (rpc) {
            callback(null, {call: rpc});
        } else {
            callback(new Error('Cannot find configuration'));
        }
    }
}

/**
 * @param {object} service
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function put(service, configuration, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof configuration != 'string') {
        callback(new Error('Configuration in invalid format'));
        return;
    }
    if (typeof service != 'object') {
        callback(new Error('Service in invalid format'));
        return;
    }

    serviceMap[configuration] = service;
    callback(null, configuration);
}

/**
 * @param {string} configuration
 * @param {Callback} callback
 */
function rem(configuration, callback) {
    if (typeof callback != 'function' || !(callback instanceof Function)) {
        callback = function() {};
    }
    if (typeof configuration != 'string') {
        callback(new Error('Configuration in invalid format'));
        return;
    }

    if (configuration in serviceMap) {
        const deleted = serviceMap[configuration];
        delete serviceMap[configuration];
        callback(null, deleted);
    } else {
        callback(new Error('Could not find configuration to delete'));
    }
};

module.exports = {get, put, rem};
