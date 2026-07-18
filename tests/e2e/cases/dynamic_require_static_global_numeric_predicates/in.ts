const fromFiniteString = require("./finite_string_" + isFinite("42"));
const fromFiniteBadString = require("./finite_bad_string_" + isFinite("42x"));
const fromFiniteBool = require("./finite_bool_" + isFinite(false));
const fromFiniteNull = require("./finite_null_" + isFinite(null));
const fromFiniteUndefined = require("./finite_undefined_" + isFinite(undefined));
const fromNaNString = require("./nan_string_" + isNaN("NaN"));
const fromNaNNumber = require("./nan_number_" + isNaN(12));
const fromNaNUndefined = require("./nan_undefined_" + isNaN(void 0));

console.log(
    fromFiniteString.label,
    fromFiniteBadString.label,
    fromFiniteBool.label,
    fromFiniteNull.label,
    fromFiniteUndefined.label,
    fromNaNString.label,
    fromNaNNumber.label,
    fromNaNUndefined.label,
);
