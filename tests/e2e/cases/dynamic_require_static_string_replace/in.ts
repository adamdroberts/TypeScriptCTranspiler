// @ts-nocheck: dynamic require proof coverage intentionally exercises string replacement calls.
const searchPrefix = "pkg-";
const replacementPrefix = "./";
const replaceName = "pkg-replace".replace(searchPrefix, replacementPrefix);

type Choice = "left" | "right";
function load(choice: Choice): any {
    const specifier = `pkg-${choice}-replace`.replaceAll("pkg-", "./");
    return require(specifier);
}

const direct = require("pkg-direct-replace".replace("pkg-", "./"));
const replaced = require(replaceName);

console.log(direct.label, replaced.label, load("left").label, load("right").label);
