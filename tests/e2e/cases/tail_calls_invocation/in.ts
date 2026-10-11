"use strict";
class TailOwner { tag: number = 101; }
function leftOwner(n: number): TailOwner { return n ? rightOwner(n - 1) : new TailOwner(); }
function rightOwner(n: number): TailOwner { try {} finally { return n ? leftOwner(n - 1) : new TailOwner(); } }
function textLeft(n: number): string { return n ? textRight(n - 1) : "tail"; }
function textRight(n: number): string { return n ? textLeft(n - 1) : "tail"; }
function actualArguments(...args: any[]): string { return args.join(":"); }
function forwardArguments(): string { return actualArguments(107, ...[109, 113], 127); }
console.log(leftOwner(41).tag);
console.log(textLeft(43));
console.log(forwardArguments());
async function promiseTarget(): Promise<number> { return 137; }
function promiseForward(): Promise<number> { return promiseTarget(); }
promiseForward().then(value => console.log(value));
