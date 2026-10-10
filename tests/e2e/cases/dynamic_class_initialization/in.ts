import { events, memberKey, makeOwner, makeAsyncOwner } from './owner';
async function verify(): Promise<void> {
    const label = Symbol('label');
    const Constructor: any = makeOwner(label);
    console.log('definition-order:' + events.join(','));
    events.length = 0;
    const first: any = new Constructor(), second: any = new Constructor();
    const deferred = first.deferred();
    console.log('instance-order:' + events.join(','));
    console.log('retained-initializers:' + (first !== second && first[memberKey] === label && first.read() === label && Constructor.same === Constructor && Constructor.readBlock() === label && deferred[0] === first && deferred[1] === label));
    const descriptor = Object.getOwnPropertyDescriptor(first, memberKey);
    console.log('own-field-descriptors:' + (descriptor.value === label && descriptor.writable && descriptor.enumerable && descriptor.configurable && Object.hasOwn(first, 'uninitialized') && first.uninitialized === undefined && Object.hasOwn(first, '__proto__') && first.__proto__ === label && Object.getPrototypeOf(first) === Constructor.prototype));
    const AsyncConstructor: any = await makeAsyncOwner(label);
    const owner: any = new AsyncConstructor();
    console.log('resumed-initializers:' + (owner.read() === label && AsyncConstructor.original === AsyncConstructor && AsyncConstructor.fromBlock === label));
}
verify().catch((error: any) => { throw error; });
