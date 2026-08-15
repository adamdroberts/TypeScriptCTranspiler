// @ts-nocheck: dynamic require proof coverage intentionally exercises const RegExp aliases.
const matchPattern = /([a-z]+)-(\d+)/;
const match = "id-42".match(matchPattern)!;
const fromFull = require("./ra_full_" + match[0]);
const fromWord = require("./ra_word_" + match[1]);
const fromNumber = require("./ra_number_" + match[2]);
const fromMatchLength = require("./ra_match_" + match.length);

const globalPattern = /([a-z])(\d+)/g;
const matches = Array.from("a1 b22".matchAll(globalPattern));
const fromGlobalFirst = require("./ra_global_" + matches[0][0]);
const fromGlobalCapture = require("./ra_global_" + matches[1][2]);
const fromGlobalLength = require("./ra_global_len_" + matches.length);

const splitPattern = /,/;
const split = "alias,split".split(splitPattern);
const fromSplitFirst = require("./ra_" + split[0]);
const fromSplitSecond = require("./ra_" + split[1]);

const searchPattern = /\d+/;
const searchPosition = "alias 42".search(searchPattern);
const fromSearch = require("./ra_search_" + searchPosition);

const replacePattern = /alias-/;
const replaced = "alias-replace".replace(replacePattern, "./");
const fromReplace = require(replaced);

console.log(
    fromFull.label,
    fromWord.label,
    fromNumber.label,
    fromMatchLength.label,
    fromGlobalFirst.label,
    fromGlobalCapture.label,
    fromGlobalLength.label,
    fromSplitFirst.label,
    fromSplitSecond.label,
    fromSearch.label,
    fromReplace.label,
);
