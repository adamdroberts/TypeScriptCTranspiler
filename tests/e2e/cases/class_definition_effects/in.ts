// @ts-nocheck
export {};
let trace = '';
const marker = {};
class Base {}
Base = new Proxy(Base, { get(target, key, receiver) {
    if (key === 'prototype') trace += 'P';
    return Reflect.get(target, key, receiver);
} });
class Unused extends Base {}
console.log('heritage', trace);
class ThrowBase {}
ThrowBase = new Proxy(ThrowBase, { get(target, key, receiver) {
    if (key === 'prototype') throw marker;
    return Reflect.get(target, key, receiver);
} });
try { class UnusedAbrupt extends ThrowBase {} }
catch (error) { console.log('abrupt', error === marker); }
console.log('definition complete', true);
