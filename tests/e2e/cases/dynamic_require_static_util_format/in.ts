// @ts-nocheck: dynamic require proof coverage intentionally exercises static util.format fragments.
import utilDefault from "util";
import * as nodeUtil from "node:util";
import { format, format as fmt } from "util";

const viaDefault = require("./" + utilDefault.format("uf-%s", "default"));
const viaNamespace = require("./" + nodeUtil.format("uf-%s-%s", "name", "space"));
const viaNamed = require("./" + format("uf-%s", "named"));
const viaAlias = require("./" + fmt("uf-%s", "alias"));
const viaAppend = require("./" + format("uf", "append"));

console.log(
    "static util format:",
    viaDefault.label,
    viaNamespace.label,
    viaNamed.label,
    viaAlias.label,
    viaAppend.label,
);
