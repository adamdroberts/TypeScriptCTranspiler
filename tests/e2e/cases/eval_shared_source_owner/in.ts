import {Owner, retained} from './owner';
async function main(): Promise<void> {
    const owner = new Owner();
    const read = owner.retain();
    const local = retained();
    await Promise.resolve();
    console.log(owner.read(), read(owner), local());
    const indirect = eval;
    console.log(indirect("29;"), eval(31 as any));
}
main();
