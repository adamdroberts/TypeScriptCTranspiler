const reflect: any = Reflect;
const getPrototypeOf: any = reflect.getPrototypeOf;
const isExtensible: any = reflect.isExtensible;
const ownKeys: any = reflect.ownKeys;
const preventExtensions: any = reflect.preventExtensions;

try {
    console.log("getPrototypeOf:", getPrototypeOf());
} catch (err: any) {
    console.log("getPrototypeOf:", err);
}

try {
    console.log("isExtensible:", isExtensible());
} catch (err: any) {
    console.log("isExtensible:", err);
}

try {
    console.log("ownKeys:", ownKeys());
} catch (err: any) {
    console.log("ownKeys:", err);
}

try {
    console.log("preventExtensions:", preventExtensions());
} catch (err: any) {
    console.log("preventExtensions:", err);
}
