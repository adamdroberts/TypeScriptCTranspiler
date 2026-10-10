import { Owner, trace } from './owner';
async function main(): Promise<void> {
    const retained = Owner;
    const instance = new retained();
    await Promise.resolve();
    console.log(trace());
    console.log(retained === Owner);
    console.log(instance.read);
    console.log(instance instanceof Owner);
    const dynamic: any = instance;
    console.log(dynamic.constructor === retained);
}
main();
