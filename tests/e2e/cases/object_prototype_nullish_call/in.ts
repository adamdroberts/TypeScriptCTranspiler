function target(label: string, value: any): any {
    console.log("target:", label);
    return value;
}

function ignored(label: string): string {
    console.log("ignored:", label);
    return label;
}

const objectValue: any = {};
const nullValue: any = null;
const undefinedValue: any = undefined;

try {
    console.log("has:", Object.prototype.hasOwnProperty.call(target("has-null", null), ignored("has-key")));
} catch (err: any) {
    console.log("has-error:", String(err));
}

try {
    console.log("enum:", Object.prototype.propertyIsEnumerable.call(target("enum-undefined", undefined), ignored("enum-key")));
} catch (err: any) {
    console.log("enum-error:", String(err));
}

try {
    console.log("proto:", Object.prototype.isPrototypeOf.call(target("proto-null", null), objectValue, ignored("proto-extra")));
} catch (err: any) {
    console.log("proto-error:", String(err));
}

try {
    console.log("locale:", Object.prototype.toLocaleString.call(target("locale-undefined", undefined), ignored("locale-extra")));
} catch (err: any) {
    console.log("locale-error:", String(err));
}

try {
    console.log("value:", Object.prototype.valueOf.call(target("value-null", null), ignored("value-extra")));
} catch (err: any) {
    console.log("value-error:", String(err));
}

console.log(
    "toString-nullish:",
    Object.prototype.toString.call(nullValue),
    Object.prototype.toString.call(undefinedValue),
);
