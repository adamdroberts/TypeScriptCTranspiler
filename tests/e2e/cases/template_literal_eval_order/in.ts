let order = "";

function mark(label: string, value: any): any {
    order = order + label;
    return value;
}

const dynNumber: any = 7;
const dynBoolean: any = false;
const dynNull: any = null;
const dynUndefined: any = undefined;

console.log(`A${mark("a", dynNumber)}B${mark("b", dynBoolean)}C${mark("c", dynNull)}D${mark("d", dynUndefined)}E`);
console.log("order:", order);
