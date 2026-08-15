import { transcode } from "buffer";
import { transcode as transcodeAlias } from "node:buffer";
import bufferDefault from "buffer";
import * as bufferNs from "node:buffer";

const fromHex = "hex";
const toUtf8 = "utf-8";
const toHex = "hex";
const toBase64 = "base64";

const named = require("./bt_" + transcode(Buffer.from("Hi"), "utf8", toHex).toString());
const namedAlias = require("./bt_" + transcodeAlias(Buffer.from("4869"), fromHex, toUtf8).toString());
const defaultImport = require("./bt_" + bufferDefault.transcode(Buffer.from("4869"), fromHex, toBase64).toString());
const namespaceImport = require("./bt_" + bufferNs.transcode(Buffer.from("SGk="), toBase64, toHex).toString());

console.log(named.label, namedAlias.label, defaultImport.label, namespaceImport.label);
