const events: string[] = [];

function mark(value: string): string {
    events.push(value);
    return value;
}

const boxedString: any = new (String as any)(mark("abc"), mark("ignored"));
const boxedNumber: any = new (Number as any)("42");
const boxedBoolean: any = new (Boolean as any)(false);

console.log("functions:", typeof String, (String as any).name, (String as any).length, typeof Number, (Number as any).name, (Number as any).length, typeof Boolean, (Boolean as any).name, (Boolean as any).length);
console.log("calls:", String(), String(12), Number(), Number("12.5"), Boolean(), Boolean(""), Boolean("x"));
console.log("objects:", typeof boxedString, typeof boxedNumber, typeof boxedBoolean, Array.isArray(boxedString), Array.isArray(boxedNumber), Array.isArray(boxedBoolean));
console.log("values:", boxedString.valueOf(), boxedNumber.valueOf(), boxedBoolean.valueOf(), String(boxedNumber), Number(boxedString), Boolean(boxedBoolean));
console.log("prototypes:", boxedString instanceof String, boxedNumber instanceof Number, boxedBoolean instanceof Boolean, boxedString.constructor === String, boxedNumber.constructor === Number, boxedBoolean.constructor === Boolean);
console.log("string exotic:", boxedString.length, boxedString[0], boxedString[2], boxedString[3] === undefined);
console.log("order:", events.join("|"));
