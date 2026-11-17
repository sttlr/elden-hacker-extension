function debug(...args) {
}
function getValueByPath(obj, path) {
  let current = obj;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") {
      return void 0;
    }
    current = Object.getOwnPropertyDescriptor(current, key)?.value;
  }
  return current;
}
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
export {
  debug as d,
  getValueByPath as g,
  wait as w
};
