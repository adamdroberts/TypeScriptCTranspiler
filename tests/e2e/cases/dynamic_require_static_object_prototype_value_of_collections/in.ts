const objectWrapped = Object.prototype.valueOf.call({ pick: "value_object" }) as any;
const arrayWrapped = Object.prototype.valueOf.call(["value_array"]) as any;
const nestedWrapped = Object.prototype.valueOf.call({ names: ["value_nested"] }) as any;

const fromObject = require("./" + objectWrapped.pick);
const fromArray = require("./" + arrayWrapped[0]);
const fromNested = require("./" + nestedWrapped.names[0]);
const fromInline = require("./" + (Object.prototype.valueOf.call({ direct: "value_inline" }) as any).direct);

console.log(fromObject.label, fromArray.label, fromNested.label, fromInline.label);
