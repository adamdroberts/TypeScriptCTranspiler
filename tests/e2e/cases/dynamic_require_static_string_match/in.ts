const first = "id abc-42 done".match(/([a-z]+)-(\d+)(?:-(x))?/)!;
const fromFull = require("./sm_full_" + first[0]);
const fromWord = require("./sm_word_" + first[1]);
const fromNum = require("./sm_num_" + first[2]);
const fromMissing = require("./sm_missing_" + first[3]);
const fromLength = require("./sm_len_" + first.length);

const global = "a1 b22 c333".match(/[a-z]\d+/g)!;
const fromGlobalFirst = require("./sm_global_" + global[0]);
const fromGlobalLast = require("./sm_global_" + global[2]);
const fromGlobalLength = require("./sm_global_len_" + global.length);

console.log(
    fromFull.label,
    fromWord.label,
    fromNum.label,
    fromMissing.label,
    fromLength.label,
    fromGlobalFirst.label,
    fromGlobalLast.label,
    fromGlobalLength.label,
);
