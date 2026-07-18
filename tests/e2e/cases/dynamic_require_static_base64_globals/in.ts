const encoded = require("./b64_" + btoa("hi"));
const decoded = require("./plain_" + atob("b2s="));
const encodedUtf8 = require("./b64_" + btoa("✓"));

console.log(encoded.label, decoded.label, encodedUtf8.label);
