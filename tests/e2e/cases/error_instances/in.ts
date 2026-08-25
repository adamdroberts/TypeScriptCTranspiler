const withMessage = new Error("boom");
const empty = new Error();
const called = Error("called");
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const extra = new Error("extra", {}, mark("n"));
const calledExtra = Error("called-extra", {}, mark("c"));
const undefinedExtra = new Error(undefined, undefined, mark("u"));
const calledUndefinedExtra = Error(undefined, undefined, mark("d"));
const ErrorAlias = Error;
const TypeErrorAlias = TypeError;
const aliasCalled: any = TypeErrorAlias("alias-called");
const aliasConstructed: any = new TypeErrorAlias("alias-constructed");
const dynamicWithMessage: any = withMessage;
const dynamicWithMessageAgain: any = withMessage;

console.log("with:", withMessage.name, withMessage.message, withMessage.toString(), String(withMessage));
console.log("empty:", empty.name, empty.message, empty.toString());
console.log("called:", called.name, called.message, called.toLocaleString(), called.valueOf() === called);
console.log("extra:", extra.name, extra.message, calledExtra.message, seen);
console.log("undefined:", undefinedExtra.message, calledUndefinedExtra.message, undefinedExtra.cause === undefined, calledUndefinedExtra.cause === undefined, seen);
console.log("methods:", withMessage.toString(mark("s")), called.toLocaleString(mark("l")), called.valueOf(mark("v")) === called, seen);
console.log("constructors:", typeof Error, (Error as any).name, (Error as any).length, typeof TypeError, (TypeError as any).name, (TypeError as any).length);
console.log("constructor identity:", ErrorAlias === Error, TypeErrorAlias === TypeError, (TypeError as any).prototype.constructor === TypeError, Object.hasOwn(TypeError, "prototype"));
console.log("alias instances:", aliasCalled.name, aliasConstructed.message, aliasCalled instanceof TypeError, aliasCalled instanceof Error, aliasConstructed instanceof TypeError, aliasConstructed.constructor === TypeError);
console.log("prototype chain:", Object.getPrototypeOf(aliasCalled) === (TypeError as any).prototype, (TypeError as any).prototype instanceof Error, (Error as any).prototype instanceof Error);
console.log("stable boxing:", dynamicWithMessage === dynamicWithMessageAgain, dynamicWithMessage.constructor === Error, dynamicWithMessage instanceof Error);

try {
    throw withMessage;
} catch (e) {
    console.log("caught:", e);
}
