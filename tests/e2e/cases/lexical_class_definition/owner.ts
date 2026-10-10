export const memberKey: unique symbol = Symbol('imported-local');
export function makeOwner(label: any): any {
    class Local {
        [memberKey](input: any = label): any { return input; }
        get current(): any { return label; }
        static self(): any { return Local; }
    }
    return Local;
}
export function forwardBinding(): boolean {
    const read = () => Later;
    let caught = false;
    try { read(); } catch (error) { caught = error instanceof ReferenceError; }
    class Later { static self(): any { return Later; } }
    return caught && read() === Later && Later.self() === Later;
}
