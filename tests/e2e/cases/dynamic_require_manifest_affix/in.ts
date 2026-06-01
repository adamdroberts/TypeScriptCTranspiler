let locale = "en";
let plugin = "current";

const localeModule: any = require("./locales/" + locale);
const pluginModule: any = require(`./plugins/${plugin}.plugin`);

console.log("affix locale:", localeModule.label);
console.log("affix plugin:", pluginModule.label);
