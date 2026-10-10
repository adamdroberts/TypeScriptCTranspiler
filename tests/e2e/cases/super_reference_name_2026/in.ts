// The pinned ECMAScript 2026 GetValue updates [[ReferencedName]] in the
// captured Reference. Node 26 still converts this super name twice.
const events: string[] = [];
let conversions = 0;
const key: any = {[Symbol.toPrimitive](): string { events.push('key'); return conversions++ === 0 ? 'first' : 'second'; }};
const object: any = {
    compound(): any { return super[key] += (events.push('rhs'), 3); },
    update(): any { return super[key]++; },
    write(): any { return super[key] = (events.push('rhs'), 8); },
    read(): any { return super[key]; },
};
const base: any = {first: 2, second: 30};
Object.setPrototypeOf(object, base);
const compound = object.compound();
console.log('retained-name:' + (compound === 5 && object.first === 5 && !Object.hasOwn(object, 'second') && events.join(',') === 'key,rhs'));
events.length = 0; conversions = 0;
const previous = object.update();
console.log('update-name:' + (previous === 2 && object.first === 3 && !Object.hasOwn(object, 'second') && events.join(',') === 'key'));
events.length = 0; conversions = 0;
object.write();
console.log('deferred-write:' + (object.first === 8 && events.join(',') === 'rhs,key'));
Object.setPrototypeOf(object, null); events.length = 0; conversions = 0;
let rejected = false;
try { object.write(); } catch (error) { rejected = error instanceof TypeError; }
console.log('null-base-before-name:' + (rejected && events.join(',') === 'rhs'));
