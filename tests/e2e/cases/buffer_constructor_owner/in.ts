async function observeBufferOwner(): Promise<void> {
    const saved: any = Buffer, allocate: any = Buffer.alloc;
    const pending: Promise<any> = (async (): Promise<any> => allocate(await Promise.resolve(2), 66))();
    saved.alloc = (): any => allocate(1, 67);
    console.log("method replacement:", Buffer.alloc(5).toString(), allocate.call(null, 2, 65).toString());
    saved.alloc = allocate;
    const host: any = globalThis;
    host.Buffer = {alloc: (): any => allocate(1, 68)};
    console.log("global replacement:", Buffer.alloc(5).toString(), (await pending).toString());
    host.Buffer = saved;
    console.log("owner identity:", Buffer === saved, saved.prototype.constructor === saved);
}
observeBufferOwner();
