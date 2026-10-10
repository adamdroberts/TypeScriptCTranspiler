import { Owner } from './owner';
async function main(): Promise<void> {
    const owner = new Owner();
    const retained = owner.retain();
    console.log(owner.read());
    console.log(owner.invoke());
    console.log(owner.has(owner));
    console.log(owner.has({}));
    console.log(Owner.read());
    const updated = await owner.update();
    console.log(updated);
    console.log(retained());
}
main();
