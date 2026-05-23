const undef: any = undefined;
const nil: any = null;
const obj: any = {};

console.log("undef:", undef === undefined, undefined === undef, undef !== undefined);
console.log("null:", nil === null, null === nil, nil !== null);
console.log("cross:", undef === null, nil === undefined, obj.missing === undefined);
console.log("asserted:", nil === (null as any), (null as any) === nil, undef === (undefined as any));
