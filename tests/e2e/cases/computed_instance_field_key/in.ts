import { ComputedOwner, callableKey, inheritedKey, literalKey } from './owner';
const owner = new ComputedOwner();
console.log('instance-symbol-name:' + (owner[callableKey].name === '[imported-instance]' && owner[callableKey]() === 1));
console.log('literal-key-field:' + (owner[literalKey].name === 'projected' && owner[literalKey].observed() === 'projected'));
console.log('inherited-computed-field:' + (owner[inheritedKey].label === 'base'));
const replacement = Symbol('replacement');
owner[callableKey] = replacement;
console.log('instance-field-write:' + (owner.read() === replacement));
