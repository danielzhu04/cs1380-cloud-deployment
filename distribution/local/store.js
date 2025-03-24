/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/
const fs = require('fs');
const path = require('path');
const id = require('../util/id');
const { serialize, deserialize } = require('../util/serialization');

const absDir = path.resolve(__dirname, '..', '..', 'store');
// fs.mkdirSync(absDir, recursive=true);
let keys = [];

function put(state, configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  let filename = configuration;
  if (configuration == null) {
    filename = id.getID(state);
  } else if (typeof configuration == 'object') {
    let key = configuration.key;
    if (typeof key == 'undefined' || key == null) {
      key = id.getID(state);
    } 
    if (typeof configuration.gid != 'undefined' && configuration.gid != null) {
      filename = `${configuration.gid}${key}`;
    } else {
      filename = key;
    }
  }

  const listKey = filename;
  filename = filename.replace(/\W/g, '');
  const filePath = path.join(absDir, filename);
  const serializedData = serialize(state);
  try {
    fs.writeFileSync(filePath, serializedData);
    keys.push(listKey);
    callback(null, state);
  } catch (error) {
    callback(new Error(`Cannot put configuration ${configuration}: ${error}`));
  }
}

function get(configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  let filename = configuration;
  if (typeof configuration == 'object') {
    const key = configuration.key;
    if (typeof key == 'undefined' || key == null) {
      callback(new Error(`Invalid configuration key`));
      return;
    }
    if (typeof configuration.gid != 'undefined' && configuration.gid != null) {
      filename = `${configuration.gid}${key}`;
    } else {
      filename = key;
    }
  }

  filename = filename.replace(/\W/g, '');
  const filePath = path.join(absDir, filename);
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const deserializedData = deserialize(fileContents);
    callback(null, deserializedData);
  } catch (error) {
    callback(new Error(`Cannot read contents from configuration ${configuration}`));
  }
}

function del(configuration, callback) {
  if (typeof configuration != 'string' && typeof configuration != 'object') {
    callback(new Error(`Invalid configuration type`));
    return;
  }

  let filename = configuration;
  if (typeof configuration == 'object') {
    const key = configuration.key;
    if (typeof key == 'undefined' || key == null) {
      callback(new Error(`Invalid configuration key`));
      return;
    }
    if (typeof configuration.gid != 'undefined' && configuration.gid != null) {
      filename = `${configuration.gid}${key}`;
    } else {
      filename = key;
    }
  }

  filename = filename.replace(/\W/g, '');
  const filePath = path.join(absDir, filename);
  try {
    get(configuration, (e, v) => {
      if (e) {
        callback(new Error(`Cannot retrieve configuration ${configuration} while deleting: ${error}`));
      } else {
        fs.unlinkSync(filePath);
        callback(null, v);
      }
    })
  } catch (error) {
    callback(new Error(`Cannot delete configuration ${configuration}: ${error}`));
  }
}

function delAll(callback) {
  let delCounter = 0;
  const deletedEntries = [];

  if (keys.length == 0) {
    callback(null, []);
    return;
  }

  keys.forEach((key) => {
    del(key, (e, v) => {
      if (v) {
        deletedEntries.push(v);
      }

      delCounter += 1;
      if (delCounter == keys.length) {
        keys = [];
        callback(null, deletedEntries);
      }
    });
  });
}

module.exports = {put, get, del, delAll};
