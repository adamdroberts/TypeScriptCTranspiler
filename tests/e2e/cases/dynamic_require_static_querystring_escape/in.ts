// @ts-nocheck: dynamic require proof coverage intentionally exercises static querystring fragments.
import querystringDefault from "querystring";
import * as nodeQuerystring from "node:querystring";
import { escape, unescape, unescape as decodeFragment } from "querystring";

const viaDefault = require("./" + querystringDefault.escape("qs default"));
const viaNamespace = require("./" + nodeQuerystring.escape("qs+namespace"));
const viaNamed = require("./" + escape("qs/named"));
const viaUnescape = require("./" + unescape("qs%5Funescape"));
const viaAlias = require("./" + decodeFragment("qs%2Dalias"));

console.log(
    "static querystring fragments:",
    viaDefault.label,
    viaNamespace.label,
    viaNamed.label,
    viaUnescape.label,
    viaAlias.label,
);
