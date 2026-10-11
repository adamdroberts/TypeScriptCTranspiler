let value: any = 41;
const writes: any[] = [43, "later"];
function read(): any { return value; }
try { value = writes[0]; throw 0; } catch { console.log(read()); }
namespace Shared {
    export let value: any = 47;
    export function read(): any { return value; }
}
try { Shared.value = 53; throw 0; } catch { console.log(Shared.read()); }
const readers: (() => any)[] = [];
for (const next of writes) {
    let local: any;
    readers.push(() => local);
    try { local = next; throw 0; } catch { console.log(local); }
}
console.log(readers[0]());
console.log(readers[1]());
