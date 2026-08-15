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
const declaration = require("pkg-declaration-callback".replace("pkg-", declarationCallback));

type Choice = "left" | "right";
function load(choice: Choice): any {
    const specifier = `pkg-${choice}-callback`.replaceAll("pkg-", () => "./");
    return require(specifier);
}
function loadAlias(choice: Choice): any {
    const specifier = `pkg-${choice}-alias-callback`.replaceAll("pkg-", arrowAlias);
    return require(specifier);
}
function loadDeclaration(choice: Choice): any {
    const specifier = `pkg-${choice}-declaration-callback`.replaceAll("pkg-", declarationCallback);
    return require(specifier);
}
function declarationCallback() {
    return "./";
}

console.log(
    direct.label,
    block.label,
    regex.label,
    token.label,
    alias.label,
    functionAliasValue.label,
    declaration.label,
    load("left").label,
    load("right").label,
    loadAlias("left").label,
    loadAlias("right").label,
    loadDeclaration("left").label,
    loadDeclaration("right").label,
);
