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
const fromTestTrue = require("./rx_test_" + (/a+/.test("baad")));
const fromTestFalse = require("./rx_test_" + new RegExp("^z+$").test("abc"));
const fromGlobalTest = require("./rx_test_global_" + new RegExp("a", "g").test("ba"));
const regexpMatch = /([a-z]+)-(\d+)(?:-(x))?/.exec("id abc-42 done")!;
const fromExecFull = require("./rx_exec_full_" + regexpMatch[0]);
const fromExecWord = require("./rx_exec_word_" + regexpMatch[1]);
const fromExecNum = require("./rx_exec_num_" + regexpMatch[2]);
const fromExecMissing = require("./rx_exec_missing_" + regexpMatch[3]);

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
    fromTestTrue.label,
    fromTestFalse.label,
    fromGlobalTest.label,
    fromExecFull.label,
    fromExecWord.label,
    fromExecNum.label,
    fromExecMissing.label,
);
