/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/
const distribution = require('../../config.js');
const id = distribution.util.id;

const ncdcGroup = {};
const dlibGroup = {};
const tfidfGroup = {};
const strmatchGroup = {};
const ridxGroup = {};

let localServer = null;

const n1 = {ip: '127.0.0.1', port: 3333};
const n2 = {ip: '127.0.0.1', port: 4444};
const n3 = {ip: '127.0.0.1', port: 5555};

test('(1 pts) student test', (done) => {
  // Test ncdc
  const mapper = (key, value) => {
    const words = value.split(/(\s+)/).filter((e) => e !== ' ');
    const out = {};
    out[words[1]] = parseInt(words[3]);
    return [out];
  };

  const reducer = (key, values) => {
    const out = {};
    out[key] = values.reduce((a, b) => Math.max(a, b), -Infinity);
    return out;
  };

  const dataset = [
    {'010': '001234567099999 2002 0101020049999999N9 +0060 1+9999'},
    {'001': '007654321099999 1989 0212890049999999N9 -0023 1+9999'},
    {'101': '002222222099999 1943 0426430049999999N9 -0005 1+9999'},
    {'999': '007777777099999 1928 0895860040500001N9 +0036 1+9999'},
    {'454': '008484848099999 2012 0090090040500001N9 +0001 1+9999'},
    {'015': '193847578292848 2002 0929490049999999N9 +0044 1+9999'},
    {'029': '222838457573828 1976 0939270049999999N9 -0053 1+9999'},
    {'132': '110102923847592 2002 0162740049999999N9 -0005 1+9999'},
    {'433': '996868686494869 1928 0243540040500001N9 +0037 1+9999'},
    {'777': '113242432344242 2012 0002020040500001N9 +0011 1+9999'}
  ];

  const expected = [
    {'2002': 60}, 
    {'1989': -23},
    {'1943': -5},
    {'1928': 37},
    {'2012': 11},
    {'1976': -53},
  ];

  const doMapReduce = (cb) => {
    distribution.ncdc.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      try {
        expect(v).toEqual(expect.arrayContaining(expected));
        done();
      } catch (e) {
        done(e);
      }
    });
  };

  let cntr = 0;
  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.ncdc.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});


test('(1 pts) student test', (done) => {
  // Test dlib
  const mapper = (key, value) => {
    const items = [];
    const counts = {};
    const words = value.split(" ");
    words.forEach((word) => {
      if (!(word in counts)) {
        counts[word] = 0;
      }
      counts[word] += 1;
    });

    Object.keys(counts).forEach((word) => {
      const wordFreq = {[word]: counts[word]};
      items.push(wordFreq);
    });
    return items;
  };

  const reducer = (key, values) => {
    const out = {};
    out[key] = values.reduce((counts, curr) => counts + curr, 0);
    return out;
  };

  const dataset = [
    {'b0': 'Hello'},
    {'b1': 'it was the age of wisdom, it was the age of foolishness'},
    {'b2': 'The quick brown fox'},
    {'b3': 'hi, hello, goodbye'},
    {'b4': 'it was the spring of hope, it was the winter of despair,'},
    {'b5': 'spring summer autumn winter'},
  ];

  const expected = [
    {Hello: 1}, 
    {it: 4},
    {was: 4}, 
    {the: 4},
    {age: 2}, 
    {of: 4}, 
    {'wisdom,': 1},
    {foolishness: 1}, 
    {The: 1},
    {quick: 1}, 
    {brown: 1},
    {fox: 1}, 
    {'hi,': 1},
    {'hello,': 1}, 
    {'goodbye': 1},
    {spring: 2}, 
    {'hope,': 1},
    {winter: 2},
    {'despair,': 1},
    {summer: 1},
    {autumn: 1}
  ];

  const doMapReduce = (cb) => {
    distribution.dlib.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      try {
        expect(v).toEqual(expect.arrayContaining(expected));
        done();
      } catch (e) {
        done(e);
      }
    });
  };

  let cntr = 0;
  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.dlib.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});


test('(1 pts) student test', (done) => {
  // Test tfidf
  const mapper = (key, value) => {
    const items = [];

    const objs = {};
    const words = value.split(" ");
    words.forEach((word) => {
      if (!(word in objs)) {
        objs[word] = {"id": key, "contents": value, "count": 0};
      }
      objs[word]["count"] += 1;
    });

    Object.keys(objs).forEach((word) => {
      const wordFreq = {[word]: objs[word]};
      items.push(wordFreq);
    });

    return items;
  };

  // Reduce function: calculate TF-IDF for each word
  const reducer = (key, values) => {
    const calcObj = {[key]: {}};

    values.forEach((obj) => {
      const id = obj["id"];
      const contents = obj["contents"];
      const count = obj["count"];

      const words = contents.split(" ");

      const tf = count / words.length;
      const idf = Math.log10(5 / values.length);
      const tfidf = tf * idf;
      calcObj[key][id] = Math.round(tfidf * 100) / 100;;
    });

    return calcObj; 
  };

  const dataset = [
    {'doc1': 'the sky is blue'},
    {'doc2': 'trees are green'},
    {'doc3': 'the ocean is blue'},
    {'doc4': 'daffodils are yellow'},
    {'doc5': 'red yellow green'},
  ];

  const expected = [
    {'the': {'doc1': 0.1, 'doc3': 0.1}},
    {'sky': {'doc1': 0.17}},
    {'is': {'doc1': 0.1, 'doc3': 0.1}},
    {'blue': {'doc1': 0.1, 'doc3': 0.1}},
    {'trees': {'doc2': 0.23}},
    {'are': {'doc2': 0.13, 'doc4': 0.13}},
    {'green': {'doc2': 0.13, 'doc5': 0.13}}, 
    {'ocean': {'doc3': 0.17}},
    {'daffodils': {'doc4': 0.23}}, 
    {'yellow': {'doc4': 0.13, 'doc5': 0.13}},
    {'red': {'doc5': 0.23}},
  ];

  const doMapReduce = (cb) => {
    distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      try {
        expect(v).toEqual(expect.arrayContaining(expected));
        done();
      } catch (e) {
        done(e);
      }
    });
  };

  let cntr = 0;
  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.tfidf.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Test strmatch
  const mapper = (key, value) => {
    const regex = /^the/i;
    const isValid = regex.test(value);
    if (isValid) {
      return [{null: {[true]: key}}];
    } else {
      return [{null: {[false]: key}}];
    }
  };

  const reducer = (key, values) => {
    let out = [];
    values.forEach((kvPair) => {
      if (kvPair.hasOwnProperty(true)) {
        out.push(kvPair[true]);
      }
    });
    return out;
  };

  const dataset = [
    {'doc0': 'The day starts at 8'},
    {'doc1': 'the cat sleeps!!'},
    {'doc2': 'asdfghjkl qwertyuiop zxcvbnm'},
    {'doc3': 'THE LION ROARS'},
    {'doc4': 'The teacher teaches math and science.'},
    {'doc5': 'Brown University'},
    {'doc6': 'He is not the president.'},
    {'doc7': 'a'},
    {'doc8': ''}
  ];

  const expected = ['doc0', 'doc1', 'doc3', 'doc4'];

  const doMapReduce = (cb) => {
    distribution.strmatchGroup.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      try {
        expect(v).toEqual(expect.arrayContaining(expected));
        done();
      } catch (e) {
        done(e);
      }
    });
  };

  let cntr = 0;
  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.strmatchGroup.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Test rdix
  const mapper = (key, value) => {
    const termsToDocs = [];
    const terms = value.split(" ");
    terms.forEach((term) => {
      const mapping = {[term]: key};
      if (!(termsToDocs.includes(mapping))) {
        termsToDocs.push(mapping);
      }
    });
    return termsToDocs;
  };

  const reducer = (key, values) => {
    return {[key]: values};
  };

  const dataset = [
    {'doc0': 'Bowl of water'},
    {'doc1': 'water is clear'},
    {'doc2': 'clear skies'},
    {'doc3': 'A Bowl of Soup'},
    {'doc4': 'A Bowl of Rice.'},
    {'doc5': '.'}
  ];

  const expected = [
    {'Bowl': ['doc0', 'doc3', 'doc4']},
    {'of': ['doc0', 'doc3', 'doc4']},
    {'water': ['doc0', 'doc1']},
    {'is': ['doc1']},
    {'clear': ['doc1', 'doc2']},
    {'skies': ['doc2']},
    {'A': ['doc3', 'doc4']},
    {'Soup': ['doc3']},
    {'Rice.': ['doc4']},
    {'.': ['doc5']}
  ];

  const doMapReduce = (cb) => {
    distribution.ridxGroup.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      try {
        expect(v.length).toBe(expected.length);
        v.forEach((kvPair) => {
          expect(expected.includes(kvPair));
        });
        done();
      } catch (e) {
        done(e);
      }
    });
  };

  let cntr = 0;
  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.ridxGroup.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});



function getDatasetKeys(dataset) {
  return dataset.map((o) => Object.keys(o)[0]);
}

beforeAll((done) => {
  ncdcGroup[id.getSID(n1)] = n1;
  ncdcGroup[id.getSID(n2)] = n2;
  ncdcGroup[id.getSID(n3)] = n3;

  dlibGroup[id.getSID(n1)] = n1;
  dlibGroup[id.getSID(n2)] = n2;
  dlibGroup[id.getSID(n3)] = n3;

  tfidfGroup[id.getSID(n1)] = n1;
  tfidfGroup[id.getSID(n2)] = n2;
  tfidfGroup[id.getSID(n3)] = n3;

  strmatchGroup[id.getSID(n1)] = n1;
  strmatchGroup[id.getSID(n2)] = n2;
  strmatchGroup[id.getSID(n3)] = n3;

  ridxGroup[id.getSID(n1)] = n1;
  ridxGroup[id.getSID(n2)] = n2;
  ridxGroup[id.getSID(n3)] = n3;


  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const ncdcConfig = {gid: 'ncdc'};
    startNodes(() => {
      distribution.local.groups.put(ncdcConfig, ncdcGroup, (e, v) => {
        distribution.ncdc.groups.put(ncdcConfig, ncdcGroup, (e, v) => {
          const dlibConfig = {gid: 'dlib'};
          distribution.local.groups.put(dlibConfig, dlibGroup, (e, v) => {
            distribution.dlib.groups.put(dlibConfig, dlibGroup, (e, v) => {
              const tfidfConfig = {gid: 'tfidf'};
              distribution.local.groups.put(tfidfConfig, tfidfGroup, (e, v) => {
                distribution.tfidf.groups.put(tfidfConfig, tfidfGroup, (e, v) => {
                  const strmatchGroupConfig = {gid: 'strmatchGroup'};
                  distribution.local.groups.put(strmatchGroupConfig, strmatchGroup, (e, v) => {
                    distribution.strmatchGroup.groups.put(strmatchGroupConfig, strmatchGroup, (e, v) => {
                      const ridxGroupConfig = {gid: 'ridxGroup'};
                      distribution.local.groups.put(ridxGroupConfig, ridxGroup, (e, v) => {
                        distribution.ridxGroup.groups.put(ridxGroupConfig, ridxGroup, (e, v) => {
                          done();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

afterAll((done) => {
  const remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        done();
      });
    });
  });
});

