import { format } from "util";
import * as utilNs from "node:util";
import defaultUtil from "util";
import { format as fmtAlias } from "node:util";

// Basic specifiers
console.log(format("hello %s", "world"));
console.log(utilNs.format("num=%d/%i float=%f", 42, 42, 3.14));
console.log(defaultUtil.format("json=%j percent=%%", { a: 1, b: "two" }));
console.log(fmtAlias("leftovers %s", "one", "two", 3));

// No placeholders
console.log(format("just plain text"));
console.log(format(1, 2, 3));
console.log(format("no placeholders but extra", 10, true));

// Edge cases
console.log(format("%j", undefined));
console.log(format("%j", null));
console.log(format("%d %i %f", NaN, NaN, NaN));
console.log(format());
