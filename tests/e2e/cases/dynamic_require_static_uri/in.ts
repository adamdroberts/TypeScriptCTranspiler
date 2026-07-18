const fromEncoded = require("./" + encodeURIComponent("uri encoded").replace("uri%20encoded", "encoded"));
const fromDecoded = require("./" + decodeURIComponent("decoded%20uri").replace("decoded uri", "decoded"));

console.log(fromEncoded.label, fromDecoded.label);
