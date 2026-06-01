import importedAddon from "./build/Release/native.node";

const nativeAddon = require("native-pkg");
const { answer, missing = "fallback", ...rest } = nativeAddon;
const { answer: importedAnswer, missing: importedMissing = "imported", ...importedRest } = importedAddon;

function readScoped() {
    const scopedAddon = require("native-pkg");
    const { answer: scopedAnswer, missing: scopedMissing = "scoped", ...scopedRest } = scopedAddon;
    return [
        answer,
        missing,
        rest,
        importedAnswer,
        importedMissing,
        importedRest,
        scopedAnswer,
        scopedMissing,
        scopedRest,
    ];
}

console.log(readScoped().length);
