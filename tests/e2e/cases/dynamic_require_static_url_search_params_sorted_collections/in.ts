const sortedFirstKey = require("./uspsort_key_" + Array.from(new URLSearchParams("b=two&a=one")).sort()[0][0]);
const sortedFirstValue = require("./uspsort_value_" + Array.from(new URLSearchParams("b=two&a=one")).sort()[0][1]);
const sortedJoin = require("./uspsort_join_"
    + Array.from(new URLSearchParams("b=two&a=one")).sort()[0][0]
    + "="
    + Array.from(new URLSearchParams("b=two&a=one")).sort()[0][1]
    + "&"
    + Array.from(new URLSearchParams("b=two&a=one")).sort()[1][0]
    + "="
    + Array.from(new URLSearchParams("b=two&a=one")).sort()[1][1]);
const sortedFromEntries = require("./uspsort_object_" + (Object.fromEntries(Array.from(new URLSearchParams("b=two&a=one")).sort()) as { b: string }).b);

console.log(
    sortedFirstKey.label,
    sortedFirstValue.label,
    sortedJoin.label,
    sortedFromEntries.label,
);
