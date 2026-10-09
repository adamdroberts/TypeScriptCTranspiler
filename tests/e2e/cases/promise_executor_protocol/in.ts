import { statSync } from "node:fs";
import { Buffer } from "node:buffer";

const saved: any = {};
function executor(resolve: (value: number | PromiseLike<number>) => void, ...tail: any[]): void {
    console.log("executor", tail.length, typeof tail[0]);
    saved.resolve = resolve;
}
const result = new Promise<number>(executor);
const boxed: any = result;
const roundtrip: Promise<number> = boxed;
console.log("identity", roundtrip === result);
saved.resolve(17);
saved.resolve(19);
result.then((value: number) => { console.log("value", value); });
new Promise<number[]>(resolve => { resolve([3, 5]); })
    .then((value: number[]) => { console.log("array", value.join("|")); });
new Promise<Buffer>(resolve => { resolve(Buffer.from("payload")); })
    .then((value: Buffer) => { console.log("buffer", value.toString()); });
const stats = statSync("tests/e2e/cases/promise_executor_protocol/in.ts");
new Promise<typeof stats>(resolve => { resolve(stats); })
    .then(value => { console.log("stats", value.isFile()); });
const Constructor: any = Promise;
const reflected: any = Reflect.construct(Constructor, [function(resolve: any): void { resolve(23); }]);
reflected.then((value: any) => { console.log("reflected", value); });
