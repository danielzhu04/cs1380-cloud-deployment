/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');

const workloadLatencies = {};

test('(1 pts) student test', () => {
  // Test Numbers
  let num = 0;
  let serialized = distribution.util.serialize(num);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(num);

  num = 7;
  serialized = distribution.util.serialize(num);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(num);

  num = 100.001;
  serialized = distribution.util.serialize(num);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(num);

  num = -5;
  serialized = distribution.util.serialize(num);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(num);
});


test('(1 pts) student test', () => {
  // Test Strings
  workloadLatencies["string"] = [];

  let str = "testing";
  let startTime = performance.now();
  let serialized = distribution.util.serialize(str);
  let deserialized = distribution.util.deserialize(serialized);
  let endTime = performance.now();
  expect(deserialized).toEqual(str);

  workloadLatencies["string"].push(endTime - startTime);
  
  str = "TEST TEST TEST";
  startTime = performance.now();
  serialized = distribution.util.serialize(str);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized).toEqual(str);

  workloadLatencies["string"].push(endTime - startTime);

  str = "";
  startTime = performance.now();
  serialized = distribution.util.serialize(str);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized).toEqual(str);

  workloadLatencies["string"].push(endTime - startTime);
});


test('(1 pts) student test', () => {
  // Test Booleans
  let bool = true;
  let serialized = distribution.util.serialize(bool);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(bool);

  bool = false;
  serialized = distribution.util.serialize(bool);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(bool);
});

test('(1 pts) student test', () => {
  // Test null
  const nullVal = null;
  const serialized = distribution.util.serialize(nullVal);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(nullVal);
});

test('(1 pts) student test', () => {
  // Test undefined
  let undefined;
  const serialized = distribution.util.serialize(undefined);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(undefined);
});

test('(extra) test array', () => {
  let array = [1, 2, "hello"];
  let serialized = distribution.util.serialize(array);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(array);

  array = [{a: 1, b: 2, c: 3}, null, undefined, [], ["a", "b"]];
  serialized = distribution.util.serialize(array);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(array);

  array = [new Error(), {a: [1, 2], b: [3]}, new Date()];
  serialized = distribution.util.serialize(array);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(array);
});

test('(extra) test date', () => {
  let date = new Date("1/1/11");
  let serialized = distribution.util.serialize(date);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(date);

  date = new Date();
  serialized = distribution.util.serialize(date);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(date);

  date = new Date("2025-02-02T07:34:08.989Z");
  serialized = distribution.util.serialize(date);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(date);

  date = new Date(99, 5, 24);
  serialized = distribution.util.serialize(date);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(date);
});

test('(extra) test error', () => {
  const errorWithMsg = new Error("This is an error message");
  let serialized = distribution.util.serialize(errorWithMsg);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(errorWithMsg);

  const errorNoMsg = new Error();
  serialized = distribution.util.serialize(errorNoMsg);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(errorNoMsg);
});

test('(extra) test object', () => {
  workloadLatencies["object"] = [];

  let object = {str: "value", num: 8, bool: false, arr: ["a", true, 3]};
  let startTime = performance.now();
  let serialized = distribution.util.serialize(object);
  let deserialized = distribution.util.deserialize(serialized);
  let endTime = performance.now();
  expect(deserialized).toEqual(object);

  workloadLatencies["object"].push(endTime - startTime);

  object = new Object();
  startTime = performance.now();
  serialized = distribution.util.serialize(object);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized).toEqual(object);

  workloadLatencies["object"].push(endTime - startTime);
  
  object = {emptyArr: [], arr: [5, 5], nestedArr: [1, [[{a: [true, false, {b: "c"}]}]]]};
  startTime = performance.now();
  serialized = distribution.util.serialize(object);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized).toEqual(object);

  workloadLatencies["object"].push(endTime - startTime);
});

test('(extra) test function', () => {
  workloadLatencies["function"] = [];

  let func = (a, b) => a + b;
  let startTime = performance.now();
  let serialized = distribution.util.serialize(func);
  let deserialized = distribution.util.deserialize(serialized);
  let endTime = performance.now();
  expect(deserialized.toString()).toEqual(func.toString());

  workloadLatencies["function"].push(endTime - startTime);

  func = () => 'this is the output';
  startTime = performance.now();
  serialized = distribution.util.serialize(func);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized.toString()).toEqual(func.toString());

  workloadLatencies["function"].push(endTime - startTime);

  startTime = performance.now();
  serialized =  distribution.util.serialize((b) => b / 2);
  deserialized = distribution.util.deserialize(serialized);
  endTime = performance.now();
  expect(deserialized.toString()).toEqual(((b) => b / 2).toString());

  workloadLatencies["function"].push(endTime - startTime);
});

afterAll(() => {
  console.log("Calculated average latencies (ms per serialization-deserialization operation): ")
  Reflect.ownKeys(workloadLatencies).forEach((workloadType) => {
    let currSum = 0;
    workloadLatencies[workloadType].forEach((latency) => currSum += latency);
    console.log(`Workload type ${workloadType}: ${currSum / 3}`); // 3 tests per workloadType testing function
  });
});
