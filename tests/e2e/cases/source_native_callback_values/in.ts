function read(): void { console.log(eval("17;")); }
const descriptor = Object.getOwnPropertyDescriptor({callback: read}, "callback")!;
const receiver: any = {};
Object.setPrototypeOf(receiver, descriptor);
receiver.value();
console.log("complete");
