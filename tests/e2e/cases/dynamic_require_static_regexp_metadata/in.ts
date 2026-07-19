const fromSource = require("./" + (/a.b/gimsu).source.replace("a.b", "source"));
const fromFlags = require("./" + new RegExp("a+", "gi").flags.replace("gi", "flags"));
const fromGlobal = require("./rx_global_" + new RegExp("a", "g").global);
const fromIgnore = require("./rx_ignore_" + /a/i.ignoreCase);
const fromMultiline = require("./rx_multiline_" + new RegExp("a", "m").multiline);
const fromDotAll = require("./rx_dotall_" + /a/s.dotAll);
const fromUnicode = require("./rx_unicode_" + /a/u.unicode);
const fromSticky = require("./rx_sticky_" + new RegExp("a", "y").sticky);
const fromIndices = require("./rx_indices_" + new RegExp("a", "d").hasIndices);
const fromString = require("./" + new RegExp("x/y", "m").toString().replace("/x\\/y/m", "string"));
const fromLocale = require("./" + (/cat/i).toLocaleString().replace("/cat/i", "locale"));

console.log(
    fromSource.label,
    fromFlags.label,
    fromGlobal.label,
    fromIgnore.label,
    fromMultiline.label,
    fromDotAll.label,
    fromUnicode.label,
    fromSticky.label,
    fromIndices.label,
    fromString.label,
    fromLocale.label,
);
