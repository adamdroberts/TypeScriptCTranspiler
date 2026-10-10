export function make(constructor: any, target: any): any {
    return Reflect.construct(constructor, ['this.value = 37;'], target);
}
export function prototypeOf(owner: any): any {
    return Object.getOwnPropertyDescriptor(owner, 'prototype')!.value;
}
