var { isMobile } = require("../breakpoints");
var { flow, mapValues, omitBy } = require("lodash/fp");
var parseNumber = require("./parseNumber");

const loadMobile = d => {
  if (d.value_mobile && isMobile.matches) {
    d.use_value = d.value_mobile;
  } else {
    d.use_value = d.value;
  }

  return d;
};

const parseValue = d => {
  switch (d.type) {
    case "number":
      return parseNumber(d.use_value);
    default:
      return d.use_value;
  }
};

const nestStringProperties = obj => {
  if (!obj) {
    return {};
  }

  const isPlainObject = obj => !!obj && obj.constructor === {}.constructor;

  const getNestedObject = obj =>
    Object.entries(obj).reduce((result, [prop, val]) => {
      prop.split(".").reduce((nestedResult, prop, propIndex, propArray) => {
        const lastProp = propIndex === propArray.length - 1;
        if (lastProp) {
          nestedResult[prop] = isPlainObject(val) ? getNestedObject(val) : val;
        } else {
          nestedResult[prop] = nestedResult[prop] || {};
        }

        return nestedResult[prop];
      }, result);

      return result;
    }, {});

  return getNestedObject(obj);
};

function _arraysEqual(a1, a2) {
  /* WARNING: arrays must not contain {objects} or behavior may be undefined */
  return JSON.stringify(a1) == JSON.stringify(a2);
}

function _isArrayLike(obj) {
  return _arraysEqual(Object.keys(obj), Object.keys(Object.values(obj)));
}

const castArrays = obj => {
  Object.entries(obj).forEach(([key, val]) => {
    if (typeof val === "object" && _isArrayLike(val)) {
      val = Object.values(val);
      obj[key] = val;
    }

    if (typeof val === "object") {
      castArrays(val);
    }
  });

  return obj;
};

module.exports = props =>
  flow(
    mapValues(loadMobile),
    mapValues(parseValue),
    omitBy(d => d == null),
    nestStringProperties,
    castArrays
  )(props);
