import { events, memberKey, makeOwner, makeAsyncOwner } from './owner';
async function verify(): Promise<void> {
    const label = Symbol('label'), marker = Symbol('marker');
    const Constructor: any = makeOwner(label), owner: any = new Constructor();
    const read = owner.read();
    console.log('constructor-order:' + events.join(','));
    console.log('constructor-captures:' + (Constructor.length === 0 && owner[memberKey] === label && owner.value === label && owner.observed === label && owner.target === Constructor && read[0] === Constructor && read[1] === Constructor && read[2] === owner));
    const Other: any = class {};
    const reflected: any = Reflect.construct(Constructor, [marker, label, marker, label], Other);
    const reflection = reflected.read();
    console.log('reflected-constructor:' + (Object.getPrototypeOf(reflected) === Other.prototype && reflected.value === marker && reflected.target === Other && reflected.tail[0] === marker && reflected.tail[1] === label && reflection[0] === Constructor && reflection[1] === Other && reflection[2] === reflected));
    const AsyncConstructor: any = await makeAsyncOwner(label), omitted: any = new AsyncConstructor();
    const explicit: any = new AsyncConstructor([{ owner: { value: marker } }], label, marker);
    const captured = explicit.read();
    console.log('resumed-constructor-formals:' + (omitted.value === label && explicit.value === marker && explicit.input[0] === label && explicit.input[1] === marker && explicit.target === AsyncConstructor && captured[0] === AsyncConstructor && captured[1] === explicit && captured[2] === marker && captured[3] === explicit.input));
}
verify().catch((error: any) => { throw error; });
