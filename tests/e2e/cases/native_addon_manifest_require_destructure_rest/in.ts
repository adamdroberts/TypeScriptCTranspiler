const { answer, missing = "fallback", ...rest } = require("native-pkg");

function readRest() {
    const { answer: scopedAnswer, missing: scopedMissing = "scoped", ...scopedRest } = require("native-pkg");
    return [answer, missing, rest, scopedAnswer, scopedMissing, scopedRest];
}

console.log(readRest().length);
