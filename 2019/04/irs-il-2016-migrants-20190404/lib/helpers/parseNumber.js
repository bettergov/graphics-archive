function parseNumber(value, locale = navigator.language) {
  // https://stackoverflow.com/a/45309230
  const example = Intl.NumberFormat(locale).format("1.1");
  const cleanPattern = new RegExp(`[^-+0-9${example.charAt(1)}]`, "g");
  const cleaned = value.replace(cleanPattern, "");
  const normalized = cleaned.replace(example.charAt(1), ".");

  return parseFloat(normalized);
}

module.exports = inputVal => {
  var value;

  if (Number.isFinite(+inputVal)) {
    value = +inputVal;
  } else if (typeof inputVal === "string" && inputVal.includes("%")) {
    value = parseFloat(d[valueColumn]) / 100;
  } else if (typeof inputVal === "string" && inputVal.includes("$")) {
    value = parseFloat(inputVal.replace(/[$,]+/g, ""));
  } else if (typeof inputVal === "string") {
    value = parseNumber(inputVal, "en-US");
  }
  return value;
};
