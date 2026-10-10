export const memberKey: unique symbol = Symbol('native-member');
export class Native {
    static original: any = Native;
    static fromBlock: any;
    static { Native.fromBlock = () => Native; }
    owner: any = Native;
    deferred: any = () => Native;
    constructor(public input: any = Native) {}
    [memberKey](): any { return Native; }
    static self(): any { return Native; }
    get self(): any { return Native; }
    static closure(): any { return () => Native; }
    static async later(): Promise<any> { await Promise.resolve(0); return Native; }
    static *sequence(): any { yield Native; return Native; }
    static async *asyncSequence(): any { yield Native; return Native; }
}
export function outer(): any { return Native; }
