import {events, makeBase, makeDerived, NativeBase, makeDefault} from './owner';
async function main(): Promise<void> {
    const Base = makeBase(), Derived = await makeDerived(Base, 42);
    const owner = new Derived();
    console.log('derived:' + (owner.value === 42 && owner.field === 42 && owner.read() === 42 && owner.reader() === owner && owner.target === Derived && owner instanceof Base));
    console.log(events.join(','));
    const NativeDerived = makeDefault(NativeBase), native = new NativeDerived(17);
    console.log('native-base:' + (native.value === 17 && native.field === 3 && native.observed === NativeDerived.prototype && native instanceof NativeDerived));
    function Alternate(): void {}
    const alternate = Reflect.construct(Derived, [19], Alternate);
    console.log('alternate:' + (Object.getPrototypeOf(alternate) === Alternate.prototype && alternate.value === 19 && alternate.field === 42 && alternate.reader() === alternate && alternate.target === Alternate));
}
main();
