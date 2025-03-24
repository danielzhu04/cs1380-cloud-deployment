/** @typedef {import("../types.js").Node} Node */

const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
/** @typedef {!string} ID */

/**
 * @param {any} obj
 * @return {ID}
 */
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

/**
 * The NID is the SHA256 hash of the JSON representation of the node
 * @param {Node} node
 * @return {ID}
 */
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

/**
 * The SID is the first 5 characters of the NID
 * @param {Node} node
 * @return {ID}
 */
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function getMID(message) {
  const msg = {};
  msg.date = new Date().getTime();
  msg.mss = message;
  return getID(msg);
}

function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

function consistentHash(kid, nids) {
  const kidNum = idToNum(kid);
  const numList = [kidNum];
  const numToNid = {};

  nids.forEach((nid) => {
    const currNum = idToNum(nid);
    numList.push(currNum);
    numToNid[currNum] = nid;
  });

  const sortedList = numList.slice().sort();
  let retNum = null;
  for (let i = 0; i < sortedList.length; i++) {
    if (sortedList[i] == kidNum) {
      if (i == sortedList.length - 1) {
        retNum = sortedList[0];
      } else {
        retNum = sortedList[i + 1];
      }
    }
  }

  return numToNid[retNum];
}


function rendezvousHash(kid, nids) {
  const kidNidList = [];
  const kidNidToNid = {};
  nids.forEach((nid) => {
    const kidNid = kid + nid;
    kidNidList.push(kidNid);
    kidNidToNid[kidNid] = nid;
  });

  const hashNums = [];
  const hashToKidNid = {};
  kidNidList.forEach((kidNid) => {
    const hashNum = idToNum(getID(kidNid));
    hashNums.push(hashNum);
    hashToKidNid[hashNum] = kidNid;
  });

  const sortedList = hashNums.slice().sort();
  const retKidNid = hashToKidNid[sortedList[sortedList.length - 1]];
  
  return kidNidToNid[retKidNid];
}

module.exports = {
  getID,
  getNID,
  getSID,
  getMID,
  idToNum,
  naiveHash,
  consistentHash,
  rendezvousHash,
};
