import { ConstructorOwner, ParameterOwner } from './owner';

const original: any = 'imported:' + String(7);
const owner = new ConstructorOwner(original);
console.log('actual-formal:' + (owner.value === original && owner.reader() === original));
const replacement = { label: 'replacement:' + String(7) };
owner.replace(replacement);
console.log('captured-write:' + (owner.reader() === replacement));
const symbol: any = Symbol('actual');
const parameterOwner = new ParameterOwner(symbol);
console.log('parameter-property:' + (parameterOwner.value === symbol));
