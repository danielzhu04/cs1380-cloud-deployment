
/*
    Checklist:

    1. Serialize strings
    2. Serialize numbers
    3. Serialize booleans
    4. Serialize (non-circular) Objects
    5. Serialize (non-circular) Arrays
    6. Serialize undefined and null
    7. Serialize Date, Error objects
    8. Serialize (non-native) functions
    9. Serialize circular objects and arrays
    10. Serialize native functions
*/

function serialize(object) {
  if (typeof object == "number") {
    return `{"type":"number","value":${object.toString()}}`;
  } else if (typeof object == "boolean") {
    return `{"type":"boolean","value":${object.toString()}}`;
  } else if (typeof object == "undefined") {
    return `{"type":"undefined","value":""}`;
  } else if (typeof object == "string") {
    return `{"type":"string","value":${JSON.stringify(object)}}`;
  } else if (typeof object == "function" || object instanceof Function) {
    const funcStr = object.toString().replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
    return `{"type":"function","value":"${funcStr}"}`;
  } else if (object == null) {
    return `{"type":"null","value":${object}}`;
  } else if (object instanceof Error) {
    const values = [];
    Reflect.ownKeys(object).forEach((field) => {
      values.push(`"${field.toString()}":${JSON.stringify(object[field])}`);
    });
    return `{"type":"error","value":{${values.join(",")}}}`;
  } else if (object instanceof Array) {
    const values = [];
    for (let i = 0; i < object.length; i ++) {
      values.push(`"${i}":${serialize(object[i])}`);
    }
    return `{"type":"array","length":${object.length},"value":{${values.join(",")}}}`;
  } else if (object instanceof Date) {
    return `{"type":"date","value":"${object.toISOString()}"}`;
  } else if (typeof object == "object" || object instanceof Object) {
    const values = [];
    Reflect.ownKeys(object).forEach((field) => {
      values.push(`"${field.toString()}":${serialize(object[field])}`);
    });
    return `{"type":"object","value":{${values.join(",")}}}`;
  } else {
    return `{"type":"unknown","value":"unexpected object type ${typeof object}"}`;
  }
}


function deserialize(string) {
  let parsedJson;
  try {
    parsedJson = JSON.parse(string);
  } catch (error) {
    return `Could not parse input JSON: ${error}`;
  }
  if (parsedJson.type == "number" || parsedJson.type == "string" || parsedJson.type == "boolean" || parsedJson.type == "null" || parsedJson.type == "unknown") {
    return parsedJson.value;
  } else if (parsedJson.type == "undefined") {
    return undefined;
  } else if (parsedJson.type == "function") {
    const funcStr = parsedJson.value.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\"/g, '"');
    return new Function(`return ${funcStr}`)();
  } else if (parsedJson.type == "object") {
    const obj = new Object();
    Reflect.ownKeys(parsedJson.value).forEach((field) => {
      obj[field] = deserialize(JSON.stringify(parsedJson.value[field]));
    });
    return obj;
  } else if (parsedJson.type == "date") {
    return new Date(parsedJson.value);
  } else if (parsedJson.type == "error") {
    const err = new Error();
    Reflect.ownKeys(parsedJson.value).forEach((field) => {
      err[field] = parsedJson.value[field];
    });
    return err;
  } else if (parsedJson.type == "array") {
    const retArr = [];
    for (let i = 0; i < parsedJson.length; i++) {
      retArr.push(deserialize(JSON.stringify(parsedJson.value[i])));
    }
    return retArr;
  } else {
    return `cannot deserialize string ${string}`;
  }
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
