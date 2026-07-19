const fromToString = require("./urlsp_" + new URL("https://example.com/path?b=two&a=one").searchParams.toString());
const fromGet = require("./urlsp_get_" + new URL("https://example.com/path?b=two&a=one").searchParams.get("a"));
const fromHas = require("./urlsp_has_" + new URL("https://example.com/path?b=two&a=one").searchParams.has("b"));
const fromSize = require("./urlsp_size_" + new URL("https://example.com/path?b=two&a=one").searchParams.size);
const fromEntry = require("./urlsp_entry_" + Array.from(new URL("https://example.com/path?b=two&a=one").searchParams)[1][0]);
const fromEntriesObject = require("./urlsp_object_" + (Object.fromEntries(new URL("https://example.com/path?b=two&a=one").searchParams) as { a: string }).a);

console.log(
    fromToString.label,
    fromGet.label,
    fromHas.label,
    fromSize.label,
    fromEntry.label,
    fromEntriesObject.label,
);
