// @ts-nocheck: dynamic require proof coverage intentionally exercises static path fragments.
import pathDefault from "path";
import * as nodePath from "node:path";
import { basename, dirname, extname } from "path";

const viaDefault = require("./" + pathDefault.basename("/tmp/path_default.ts", ".ts"));
const viaNamespace = require("./" + nodePath.basename("/tmp/path_namespace.js", ".js"));
const viaNamed = require("./" + basename("/tmp/path_named.cjs", ".cjs"));
const viaDirname = require("./" + dirname("path_dirname/index.js"));
const viaExtname = require("./path_ext" + extname("module.label"));

console.log(
    "static path fragments:",
    viaDefault.label,
    viaNamespace.label,
    viaNamed.label,
    viaDirname.label,
    viaExtname.label,
);
