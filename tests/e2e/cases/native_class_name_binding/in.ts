import { Native, memberKey, outer } from './owner';
async function verify(): Promise<void> {
    const Constructor: any = Native;
    const owner: any = new Constructor();
    const read = Constructor.closure();
    console.log('static-inner-name:' + (Constructor.self() === Constructor && Constructor.original === Constructor && Constructor.fromBlock() === Constructor && read() === Constructor && outer() === Constructor));
    console.log('instance-inner-name:' + (owner.owner === Constructor && owner.deferred() === Constructor && owner.input === Constructor && owner.self === Constructor && owner[memberKey]() === Constructor));
    const later = await Constructor.later();
    console.log('async-inner-name:' + (later === Constructor));
    const sequence = Constructor.sequence();
    console.log('generator-inner-name:' + (sequence.next().value === Constructor && sequence.next().value === Constructor));
    const asyncSequence = Constructor.asyncSequence();
    const first = await asyncSequence.next(), last = await asyncSequence.next();
    console.log('async-generator-inner-name:' + (first.value === Constructor && last.value === Constructor));
}
verify().catch((error: any) => { throw error; });
