/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
*/

const distribution = require('../config.js');

// M1 Test Cases

test('m1: sample test', () => {
  const object = {milestone: 'm1', status: 'complete'};
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized).toEqual(object);
});

test('m1: test array', () => {
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

test('m1: test date', () => {
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

test('m1: test error', () => {
  const errorWithMsg = new Error("This is an error message");
  let serialized = distribution.util.serialize(errorWithMsg);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(errorWithMsg);

  const errorNoMsg = new Error();
  serialized = distribution.util.serialize(errorNoMsg);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(errorNoMsg);
});

test('m1: test object', () => {
  let object = {str: "value", num: 8, bool: false, arr: ["a", true, 3]};
  let serialized = distribution.util.serialize(object);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);

  object = new Object();
  serialized = distribution.util.serialize(object);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);
  
  object = {emptyArr: [], arr: [5, 5], nestedArr: [1, [[{a: [true, false, {b: "c"}]}]]]};
  serialized = distribution.util.serialize(object);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);
});

test('m1: test boolean', () => {
  let bool = true;
  let serialized = distribution.util.serialize(bool);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(bool);

  bool = false;
  serialized = distribution.util.serialize(bool);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(bool);
});

test('m1: test null', () => {
  const nullVal = null;
  const serialized = distribution.util.serialize(nullVal);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(nullVal);
});

test('m1: test function', () => {
  const func = (a, b) => a + b;
  let serialized = distribution.util.serialize(func);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized.toString()).toEqual(func.toString());

  serialized =  distribution.util.serialize((b) => b / 2);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized.toString()).toEqual(((b) => b / 2).toString());
});

test('m1: test number', () => {
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

test('m1: test string', () => {
  let str = "testing";
  let serialized = distribution.util.serialize(str);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(str);

  str = "TEST TEST TEST";
  serialized = distribution.util.serialize(str);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(str);

  str = "";
  serialized = distribution.util.serialize(str);
  deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(str);
});

test('m1: test undefined', () => {
  let undefined;
  const serialized = distribution.util.serialize(undefined);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(undefined);
});

// M2 Test Cases

// M3 Test Cases

// M4 Test Cases

// M5 Test Cases
