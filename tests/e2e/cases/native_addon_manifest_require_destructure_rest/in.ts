const { answer, ...rest } = require("native-pkg");

function readRest() {
    const { answer: scopedAnswer, ...scopedRest } = require("native-pkg");
    return [answer, rest, scopedAnswer, scopedRest];
}

console.log(readRest().length);
