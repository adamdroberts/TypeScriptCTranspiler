import { FieldOwner, DerivedOwner } from './owner';

const owner = new FieldOwner();
console.log('field-presence:' + (owner.before[0] === undefined && owner.before[1] === false));
console.log('field-owner:' + (owner.reader() === owner.value && owner.value === 'imported:7'));
console.log('empty-field:' + (Object.hasOwn(owner, 'empty') && owner.empty === undefined));
const derived = new DerivedOwner();
console.log('derived-field:' + (derived.own === derived.base && derived.own.label === 'base:7'));
