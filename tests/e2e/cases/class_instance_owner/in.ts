// @ts-nocheck: ordinary actual values cross source annotations without coercion.
import {InstanceOwner, DerivedOwner} from './owner';
const owner = new InstanceOwner(), peer = new InstanceOwner(), derived = new DerivedOwner();
const marker = {token: 'actual'}, receiver = {value: 3}, method = owner.activation;
const view = method.call(receiver, undefined, marker, undefined)();
console.log(view[0] === receiver, view[1].length, view[2], view[3].length, view[3][0] === marker, view[3][1] === undefined);
console.log(!Object.hasOwn(owner, 'activation'), owner.activation === peer.activation, owner.activation === InstanceOwner.prototype.activation, Object.getPrototypeOf(owner) === InstanceOwner.prototype);
console.log(Object.getPrototypeOf(derived) === DerivedOwner.prototype, Object.getPrototypeOf(DerivedOwner.prototype) === InstanceOwner.prototype, derived.activation === method);
owner.current = marker;
const descriptor = Object.getOwnPropertyDescriptor(InstanceOwner.prototype, 'current');
console.log(owner.current === marker, Object.getOwnPropertyDescriptor(owner, 'value').value === marker, descriptor.get.call(receiver), descriptor.get.name, descriptor.set.name);
const originalSqrt = Math.sqrt;
Math.sqrt = function (value) { return marker; };
const actualNumeric = owner.numeric(marker);
Math.sqrt = originalSqrt;
console.log(owner.numeric('81'), actualNumeric === marker);
const original = owner.echo;
InstanceOwner.prototype.echo = function (value) { return [this, value]; };
const changed = peer.echo(marker);
console.log(changed[0] === peer, changed[1] === marker, original.call(receiver, marker) === marker);
const step = owner.values(marker).next();
console.log(step.value[0] === owner, step.value[1] === marker);
async function suspended(): Promise<void> {
    const pending = owner.delayed(marker), saved = owner.activation;
    await Promise.resolve();
    const delayed = await pending;
    console.log(delayed[0] === owner, delayed[1] === marker, saved.call(owner, marker)()[2] === marker);
}
suspended();
