const scalar = String.fromCodePoint(0x1f600);
const halves = String.fromCharCode(0xd83d) + String.fromCharCode(0xde00);
function codes(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) result += (i ? "," : "") + text.charCodeAt(i);
    return result;
}
for (const text of [scalar, halves]) {
    console.log("units:", text.match(/./g)!.length, text.match(/./gu)!.length);
    console.log("search:", ("A" + text + "B").search(/B/));
    console.log("halves:", codes(text.replace(/\ud83d/g, "H")), codes(text.replace(/\ude00/g, "L")));
    console.log("zero:", codes(text.replace(/(?:)/g, "-")), codes(text.replace(/(?:)/gu, "-")));
    console.log("split:", text.split(/(?:)/).map(codes).join("|"), text.split(/(?:)/u).map(codes).join("|"));
}
console.log("backtrack:", "abc".match(/(a|ab)c/)!.join("|"));
console.log("lookbehind:", "abc".match(/(?<=([ab]+)([bc]+))$/)!.join("|"));
console.log("lookahead:", /(?=(a+))a*b\1/.test("aaabaaa"));
console.log("named:", "ab".replace(/(?<word>a)(b)/, "$<word>|$2|$12|$$|$&"));
console.log("empty:", "".split(/(?:)/).length, "abc".split(/(?:)/).join("|"));
console.log("flags:", new RegExp("a", "mi").flags, new RegExp("[a&&a]", "v").unicodeSets);
