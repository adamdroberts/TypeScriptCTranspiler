const fromQuery = require("./usp_" + new URLSearchParams("a=1&b=two").toString());
const fromEncoded = require("./usp_" + new URLSearchParams("q=hello world").toString());
const fromEmpty = require("./usp_" + new URLSearchParams().toString());
const fromSize = require("./usp_size_" + new URLSearchParams("a=1&b=two&a=3").size);
const fromEmptySize = require("./usp_size_" + new URLSearchParams().size);
const fromEntryKey = require("./usp_entry_key_" + Array.from(new URLSearchParams("a=1&b=two&a=3"))[0][0]);
const fromEntryValue = require("./usp_entry_value_" + Array.from(new URLSearchParams("a=1&b=two&a=3"))[1][1]);
const fromEntriesObject = require("./usp_from_entries_" + (Object.fromEntries(new URLSearchParams("a=1&b=two&a=3")) as { a: string }).a);

console.log(
    fromQuery.label,
    fromEncoded.label,
    fromEmpty.label,
    fromSize.label,
    fromEmptySize.label,
    fromEntryKey.label,
    fromEntryValue.label,
    fromEntriesObject.label,
);
