const absolute = require("./urlcan_" + URL.canParse("https://example.com/a"));
const unsupported = require("./urlcan_" + URL.canParse("mailto:user@example.com"));
const relativeWithBase = require("./urlcan_" + URL.canParse("child", "https://example.com/root/"));
const absoluteWithBadBase = require("./urlcan_" + URL.canParse("https://example.com/skip", "not-a-base"));
const undefinedBase = require("./urlcan_" + URL.canParse("child", undefined));

console.log(
    absolute.label,
    unsupported.label,
    relativeWithBase.label,
    absoluteWithBadBase.label,
    undefinedBase.label,
);
