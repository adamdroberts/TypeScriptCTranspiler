// @ts-nocheck: dynamic require proof coverage intentionally exercises pure replacement callbacks.
const direct = require("pkg-direct-callback".replace("pkg-", () => "./"));
const block = require("pkg-block-callback".replace("pkg-", function () {
    return "./";
}));
const regex = require("pkg-regex-callback".replace(/pkg-/, () => "./"));
const token = require("pkg-dollar-callback".replace("pkg-", () => "./$&"));
const arrowAlias = () => "./";
const functionAlias = function () {
    return "./";
};
const alias = require("pkg-alias-callback".replace("pkg-", arrowAlias));
const functionAliasValue = require("pkg-function-alias-callback".replace("pkg-", functionAlias));

type Choice = "left" | "right";
function load(choice: Choice): any {
    const specifier = `pkg-${choice}-callback`.replaceAll("pkg-", () => "./");
    return require(specifier);
}
function loadAlias(choice: Choice): any {
    const specifier = `pkg-${choice}-alias-callback`.replaceAll("pkg-", arrowAlias);
    return require(specifier);
}

console.log(
    direct.label,
    block.label,
    regex.label,
    token.label,
    alias.label,
    functionAliasValue.label,
    load("left").label,
    load("right").label,
    loadAlias("left").label,
    loadAlias("right").label,
);
