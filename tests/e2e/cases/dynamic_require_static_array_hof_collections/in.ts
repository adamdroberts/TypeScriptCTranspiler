const mapValue = require("./array_hof_" + ["old"].map((value) => value + "_mapped")[0]);
const mapIndex = require("./array_hof_" + ["a", "b"].map((value, index) => value + index)[1]);
const filterValue = require("./array_hof_" + ["drop", "keep"].filter((value) => value === "keep")[0]);
const filterIndex = require("./array_hof_" + ["drop", "index"].filter((value, index) => index === 1)[0]);
const flatMapValue = require("./array_hof_" + ["head"].flatMap((value) => [value, "tail"])[1]);
const flatMapIndex = require("./array_hof_" + ["left", "right"].flatMap((value, index) => [value + index])[1]);
const entry = require("./array_hof_entry_" + Object.entries(["drop", "value"].filter((value) => value !== "drop"))[0][1]);

console.log(mapValue.label, mapIndex.label, filterValue.label, filterIndex.label, flatMapValue.label, flatMapIndex.label, entry.label);
