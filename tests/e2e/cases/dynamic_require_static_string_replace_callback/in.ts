// @ts-nocheck: dynamic require proof coverage intentionally exercises pure replacement callbacks.
const direct = require("pkg-direct-callback".replace("pkg-", () => "./"));
const block = require("pkg-block-callback".replace("pkg-", function () {
    return "./";
}));
const regex = require("pkg-regex-callback".replace(/pkg-/, () => "./"));
const token = require("pkg-dollar-callback".replace("pkg-", () => "./$&"));

type Choice = "left" | "right";
function load(choice: Choice): any {
    const specifier = `pkg-${choice}-callback`.replaceAll("pkg-", () => "./");
    return require(specifier);
}

console.log(direct.label, block.label, regex.label, token.label, load("left").label, load("right").label);
