// Regex test + global replace + non-trivial match.
// Outer 1000 × full set of regex ops.
const OUTER = 1000;

const validator = /^[a-z]+\d+$/;
const digits = /\d+/g;
const word = /\b[a-z]{4,}\b/g;
const corpus =
    "alpha 123 beta 456 gamma 78 delta 9 epsilon 1024 zeta 2048 " +
    "the quick brown fox jumps over the lazy dog 9999 times";
const candidates: string[] = [
    "abc123",
    "no_match!",
    "x42",
    "lots_of_text_with_no_match_at_all",
    "tail9",
    "hello1234567890",
    "_starts_with_underscore",
    "ALL_CAPS_42",
    "mid_dle1",
    "endsWithDigit2",
];

const t0 = Date.now();
let acc = 0;
for (let i = 0; i < OUTER; i++) {
    for (let j = 0; j < candidates.length; j++) {
        if (validator.test(candidates[j])) acc += 1;
    }
    acc += corpus.replace(digits, "#").length;
    const ws = corpus.match(word);
    if (ws !== null) acc += ws.length;
}
const t1 = Date.now();
console.log("BENCH:regex:" + (t1 - t0) + ":" + acc);
