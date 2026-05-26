let order = "";

function mark(label: string, value: any): any {
    order = order + label;
    return value;
}

const dynNumber: any = 42;
const dynBoolean: any = true;
const dynNull: any = null;
const dynUndefined: any = undefined;

console.log(String.raw`A\n${mark("a", dynNumber)}:${mark("b", dynBoolean)}:${mark("c", dynNull)}:${mark("d", dynUndefined)}\tZ`);
console.log("order:", order);
