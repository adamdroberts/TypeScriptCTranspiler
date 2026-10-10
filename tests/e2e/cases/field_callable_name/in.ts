import { CallableOwner } from './owner';

const owner = new CallableOwner();
console.log('field-name:' + (owner.reader.name === 'reader'));
console.log('explicit-name:' + (owner.named.name === 'explicit'));
console.log('class-name:' + (owner.nested.name === 'nested' && owner.nested.observed() === 'nested'));
console.log('static-name:' + (CallableOwner.stored.name === 'stored'));
