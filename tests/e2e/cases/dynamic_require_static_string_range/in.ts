// @ts-nocheck: dynamic require proof coverage intentionally exercises string range calls.
const sliceSource = "xx./slice_tailzz";
const substringSource = "xx./substringyy";
const swappedSource = "xx./swapyy";
const undefSource = "xx./slice_undef";
const substrSource = "xx./substr_tailzz";

const sliceTail = require(sliceSource.slice(2, -2));
const substring = require(substringSource.substring(2, 13));
const swapped = require(swappedSource.substring(8, 2));
const undef = require(undefSource.slice(2, undefined));
const substrTail = require(substrSource.substr(2, 13));

console.log(sliceTail.label, substring.label, swapped.label, undef.label, substrTail.label);
