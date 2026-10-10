import {makeOwner, makeBase} from './owner';
async function main(): Promise<void> {
    const owner = makeOwner(41), base = makeBase();
    Object.setPrototypeOf(owner, base);
    const reader = owner.arrow();
    console.log('home-receiver:' + (owner.read() === 41 && reader() === 41));
    const result = await owner.query('field');
    owner.write('field', 42);
    console.log('suspended-reference:' + (result[0] === 41 && result[1] === owner && result[2]() === 42));
    Object.setPrototypeOf(owner, {read(): any { return this.marker + 1; }});
    console.log('live-home:' + (reader() === 43));
}
main();
