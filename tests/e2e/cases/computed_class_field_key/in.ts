import { ComputedOwner, publicKey } from './owner';
const callable = ComputedOwner[publicKey];
const descriptor = Object.getOwnPropertyDescriptor(callable, 'name')!;
console.log('computed-field:' + (callable.name === '[imported-field]' && callable() === 1));
console.log('name-descriptor:' + (!descriptor.writable && !descriptor.enumerable && descriptor.configurable));
console.log('computed-class:' + (ComputedOwner.projected.name === 'projected' && ComputedOwner.projected.observed() === 'projected'));
