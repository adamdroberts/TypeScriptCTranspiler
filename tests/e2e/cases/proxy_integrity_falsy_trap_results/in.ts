function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function falsePrevent(target: any): boolean {
    return false;
}

const sealTarget: any = { x: 1 };
const sealProxy: any = new Proxy(sealTarget, { preventExtensions: falsePrevent as any });
report("object seal", (): any => Object.seal(sealProxy) === sealProxy);
console.log("seal target extensible:", Object.isExtensible(sealTarget));

const freezeTarget: any = { x: 1 };
const freezeProxy: any = new Proxy(freezeTarget, { preventExtensions: falsePrevent as any });
report("object freeze", (): any => Object.freeze(freezeProxy) === freezeProxy);
console.log("freeze target extensible:", Object.isExtensible(freezeTarget));
