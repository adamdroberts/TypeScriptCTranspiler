export {};
let events = "";
const bodyError: any = {};
const disposalError: any = {};

function resource(name: string, failure: any): any {
    const value: any = {name};
    Object.defineProperty(value, Symbol.dispose, {
        configurable: true,
        get(): any {
            events += "get:" + name + "|";
            return function(this: any): void {
                events += "dispose:" + this.name + "|";
                if (failure) throw failure;
            };
        },
    });
    return value;
}

function leave(): void {
    using first = resource("first", null);
    using second = resource("second", disposalError);
    Object.defineProperty(first, Symbol.dispose, {value: (): void => {throw "method reread";}});
    try {throw bodyError;} finally {events += "finally|";}
}

let failure: any = null;
try {leave();} catch (error) {failure = error;}
console.log("suppressed:", failure instanceof SuppressedError,
    failure.error === disposalError, failure.suppressed === bodyError);
console.log(events);
failure.error = bodyError;
console.log("write:", failure.error === bodyError);
Object.defineProperty(failure, "error", {get(): any {return disposalError;}, configurable: true});
console.log("accessor:", failure.error === disposalError);
console.log("delete:", delete failure.error, failure.error === undefined);

events = "";
async function leaveLoop(): Promise<any> {
    for (await using value of [resource("loop", null)]) {
        events += "body|";
        return bodyError;
    }
    return null;
}
leaveLoop().then((value: any): void => {
    console.log("async return:", value === bodyError);
    console.log(events);
});

let moduleDisposed = false;
const moduleValue: any = {[Symbol.dispose](): void {moduleDisposed = true;}};
using moduleResource = moduleValue;
export function readModuleResource(): any {return moduleResource;}
Promise.resolve().then((): void => {
    console.log("module cell:", moduleDisposed, readModuleResource() === moduleValue);
});
