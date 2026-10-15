const object: any = {};
const receiver: any = { toString() { throw new Error('unexpected receiver conversion'); } };
const replacement: any = {};
object[Symbol.replace] = function(value: any, next: any): any {
    return { same: this === object && value === receiver && next === replacement };
};
console.log('protocol:', (String.prototype.replace.call(receiver, object, replacement) as any).same);
let trace = '';
const text: any = { toString() { trace += 'T'; return 'ababa'; } };
const search: any = { toString() { trace += 'S'; return 'a'; } };
const output = String.prototype.replaceAll.call(text, search, function(this: any, matched: string, offset: number, original: string): string {
    'use strict';
    trace += String(offset);
    if (this !== undefined || matched !== 'a' || original !== 'ababa') throw new Error('callback arguments');
    return 'x';
});
console.log('fallback:', output, trace);
const units = 'A😀B'.replaceAll('', '-');
console.log('utf16:', units.length, units.charCodeAt(3), units.charCodeAt(5));
