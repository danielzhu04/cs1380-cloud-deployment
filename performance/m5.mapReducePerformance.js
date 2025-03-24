const distribution = require('../config.js');
const id = distribution.util.id;

const tfidfGroup = {};

let localServer = null;

const n1 = {ip: '127.0.0.1', port: 6666};
const n2 = {ip: '127.0.0.1', port: 7777};
const n3 = {ip: '127.0.0.1', port: 8888};

let totalTime = 0;

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
    let startTime = performance.now();
    distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
      let endTime = performance.now();
      totalTime += (endTime - startTime);
      try {
        expect(v).toEqual(expect.arrayContaining(expected));

        let cntr = 0;
        // Send the dataset to the cluster
        dataset.forEach((o) => {
          const key = Object.keys(o)[0];
          const value = o[key];
          distribution.tfidf.store.put(value, key, (e, v) => {
            cntr++;
            // Once the dataset is in place, run the map reduce
            if (cntr === dataset.length) {
              startTime = performance.now();
              distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
                endTime = performance.now();
                totalTime += (endTime - startTime);
                try {
                  expect(v).toEqual(expect.arrayContaining(expected));

                  let cntr = 0;
                  // Send the dataset to the cluster
                  dataset.forEach((o) => {
                    const key = Object.keys(o)[0];
                    const value = o[key];
                    distribution.tfidf.store.put(value, key, (e, v) => {
                      cntr++;
                      // Once the dataset is in place, run the map reduce
                      if (cntr === dataset.length) {
                        startTime = performance.now();
                        distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
                          endTime = performance.now();
                          totalTime += (endTime - startTime);
                          try {
                            expect(v).toEqual(expect.arrayContaining(expected));
                            
                            let cntr = 0;
                            // Send the dataset to the cluster
                            dataset.forEach((o) => {
                              const key = Object.keys(o)[0];
                              const value = o[key];
                              distribution.tfidf.store.put(value, key, (e, v) => {
                                cntr++;
                                // Once the dataset is in place, run the map reduce
                                if (cntr === dataset.length) {
                                  startTime = performance.now();
                                  distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
                                    endTime = performance.now();
                                    totalTime += (endTime - startTime);
                                    try {
                                      expect(v).toEqual(expect.arrayContaining(expected));
                                      let cntr = 0;

                                      // Send the dataset to the cluster
                                      dataset.forEach((o) => {
                                        const key = Object.keys(o)[0];
                                        const value = o[key];
                                        distribution.tfidf.store.put(value, key, (e, v) => {
                                          cntr++;
                                          // Once the dataset is in place, run the map reduce
                                          if (cntr === dataset.length) {
                                            startTime = performance.now();
                                            distribution.tfidf.mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
                                              endTime = performance.now();
                                              totalTime += (endTime - startTime);
                                              try {
                                                expect(v).toEqual(expect.arrayContaining(expected));
                                                done();
                                              } catch (e) {
                                                done(e);
                                              }
                                            });
                                          }
                                        });
                                      });
                                    } catch (e) {
                                      done(e);
                                    }
                                  });
                                }
                              });
                            });
                          } catch (e) {
                            done(e);
                          }
                        });
                      }
                    });
                  });
                } catch (e) {
                  done(e);
                }
              });
            }
          });
        });
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


function getDatasetKeys(dataset) {
  return dataset.map((o) => Object.keys(o)[0]);
}

beforeAll((done) => {
  tfidfGroup[id.getSID(n1)] = n1;
  tfidfGroup[id.getSID(n2)] = n2;
  tfidfGroup[id.getSID(n3)] = n3;


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

    const tfidfConfig = {gid: 'tfidf'};
    startNodes(() => {
      distribution.local.groups.put(tfidfConfig, tfidfGroup, (e, v) => {
        distribution.tfidf.groups.put(tfidfConfig, tfidfGroup, (e, v) => {
          done();
        });
      });
    });
  });
});

afterAll((done) => {
  const throughput = 5 / totalTime;
  console.log(`The throughput is ${throughput} TF-IDF MapReduce operations per millisecond`);
  const latency = totalTime / 5;
  console.log(`The latency is ${latency} milliseconds per TF-IDF MapReduce operation`);
  
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