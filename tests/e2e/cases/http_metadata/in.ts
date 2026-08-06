import httpDefault, { METHODS as namedMethods, STATUS_CODES as namedStatus, maxHeaderSize as namedMaxHeaderSize } from "node:http";
import * as httpNamespace from "http";

console.log("named:", namedMethods.length, Object.keys(namedStatus).length, namedMethods[0], namedMethods[34], namedStatus[200], namedStatus[418], namedMaxHeaderSize);
console.log("namespace:", httpNamespace.METHODS.length, httpNamespace.METHODS[6], httpNamespace.STATUS_CODES[404], httpNamespace.maxHeaderSize);
console.log("default:", httpDefault.METHODS.length, httpDefault.STATUS_CODES[500], httpDefault.maxHeaderSize);
