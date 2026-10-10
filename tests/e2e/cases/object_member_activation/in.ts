import { create, Receiver, explicit } from "./source";
const owner = create(11), receiver: any = { stored: 17 };
owner.value = 23;
console.log("own", owner.value, owner.identity() === owner);
const descriptor: any = Object.getOwnPropertyDescriptor(owner, "value");
descriptor.set.call(receiver, 29);
console.log("borrow", descriptor.get.call(receiver), owner.value, owner.identity.call(receiver) === receiver);
const arrow = owner.capture.call(receiver);
console.log("arrow", arrow.call(owner) === receiver);
console.log("native", explicit.method.call(new Receiver(), 23));
async function verify(): Promise<void> {
    const marker = { token: 31 };
    const result = await owner.delayed.call(receiver, marker);
    console.log("retained", result[0] === receiver, result[1] === marker, result[2]() === receiver);
    const generator = owner.steps.call(receiver);
    const pause = generator.next();
    await Promise.resolve(0);
    const completed = generator.next();
    console.log("generator", pause.value === receiver, pause.done, completed.value === receiver, completed.done);
}
verify().catch((error: any) => { console.log("failure", String(error)); throw error; });
