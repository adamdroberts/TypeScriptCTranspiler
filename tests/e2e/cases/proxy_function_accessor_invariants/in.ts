function GetNoGetter(this: any): void {}
function SetNoSetter(this: any): void {}
function DefineData(this: any): void {}
function DefineGetter(this: any): void {}
function DescriptorData(this: any): void {}
function DescriptorGetter(this: any): void {}
function DescriptorMatch(this: any): void {}

function getter(this: any): string {
    return "target";
}

function otherGetter(this: any): string {
    return "other";
}

function setter(this: any, value: any): void {
}

function fakeGet(target: any, prop: any, receiver: any): any {
    if (prop === "acc") return "fake";
    return Reflect.get(target, prop, receiver);
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
    return true;
}

function trueDefine(target: any, prop: any, desc: any): boolean {
    return true;
}

function dataDescriptor(target: any, prop: any): any {
    if (prop === "acc") {
        return { value: "fake", enumerable: true, configurable: false };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function changedGetterDescriptor(target: any, prop: any): any {
    if (prop === "acc") {
        return { get: otherGetter, set: setter, enumerable: true, configurable: false };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function matchingAccessorDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

const getNoGetterTarget: any = GetNoGetter as any;
Object.defineProperty(getNoGetterTarget, "acc", {
    set: setter,
    enumerable: true,
    configurable: false,
});
const getNoGetterProxy: any = new Proxy(getNoGetterTarget, { get: fakeGet as any });
try {
    console.log("get no getter:", Reflect.get(getNoGetterProxy, "acc"));
} catch (err: any) {
    console.log("get no getter:", err);
}

const setNoSetterTarget: any = SetNoSetter as any;
Object.defineProperty(setNoSetterTarget, "acc", {
    get: getter,
    enumerable: true,
    configurable: false,
});
const setNoSetterProxy: any = new Proxy(setNoSetterTarget, { set: trueSet as any });
try {
    console.log("set no setter:", Reflect.set(setNoSetterProxy, "acc", "fake"));
} catch (err: any) {
    console.log("set no setter:", err);
}

const defineDataTarget: any = DefineData as any;
Object.defineProperty(defineDataTarget, "acc", {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: false,
});
const defineDataProxy: any = new Proxy(defineDataTarget, { defineProperty: trueDefine as any });
try {
    console.log("define data:", Reflect.defineProperty(defineDataProxy, "acc", { value: "fake" }));
} catch (err: any) {
    console.log("define data:", err);
}

const defineGetterTarget: any = DefineGetter as any;
Object.defineProperty(defineGetterTarget, "acc", {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: false,
});
const defineGetterProxy: any = new Proxy(defineGetterTarget, { defineProperty: trueDefine as any });
try {
    console.log("define getter:", Reflect.defineProperty(defineGetterProxy, "acc", { get: otherGetter }));
} catch (err: any) {
    console.log("define getter:", err);
}

const descriptorDataTarget: any = DescriptorData as any;
Object.defineProperty(descriptorDataTarget, "acc", {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: false,
});
const descriptorDataProxy: any = new Proxy(descriptorDataTarget, { getOwnPropertyDescriptor: dataDescriptor as any });
try {
    const desc: any = Reflect.getOwnPropertyDescriptor(descriptorDataProxy, "acc");
    console.log("descriptor data:", desc.value);
} catch (err: any) {
    console.log("descriptor data:", err);
}

const descriptorGetterTarget: any = DescriptorGetter as any;
Object.defineProperty(descriptorGetterTarget, "acc", {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: false,
});
const descriptorGetterProxy: any = new Proxy(descriptorGetterTarget, { getOwnPropertyDescriptor: changedGetterDescriptor as any });
try {
    const desc: any = Reflect.getOwnPropertyDescriptor(descriptorGetterProxy, "acc");
    console.log("descriptor getter:", desc.get === otherGetter);
} catch (err: any) {
    console.log("descriptor getter:", err);
}

const descriptorMatchTarget: any = DescriptorMatch as any;
Object.defineProperty(descriptorMatchTarget, "acc", {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: false,
});
const descriptorMatchProxy: any = new Proxy(descriptorMatchTarget, { getOwnPropertyDescriptor: matchingAccessorDescriptor as any });
const matchingDesc: any = Reflect.getOwnPropertyDescriptor(descriptorMatchProxy, "acc");
console.log("descriptor match:", typeof matchingDesc.get, typeof matchingDesc.set, matchingDesc.enumerable, matchingDesc.configurable);
