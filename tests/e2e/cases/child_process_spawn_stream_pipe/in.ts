import { spawn } from "child_process";

const firstProducer: any = spawn("/bin/printf", ["pipe-data"]);
const firstConsumer: any = spawn("/bin/cat");
const firstOutput: string[] = [];
firstConsumer.stdout.setEncoding("utf8");
firstConsumer.stdout.on("data", (chunk: any) => firstOutput.push(chunk));
const firstReturned: any = firstProducer.stdout.pipe(firstConsumer.stdin);
console.log("return:", firstReturned === firstConsumer.stdin);
firstConsumer.on("close", () => {
    console.log(`default:${firstOutput.join("")}`);

    const secondProducer: any = spawn("/bin/printf", ["left"]);
    const secondConsumer: any = spawn("/bin/cat");
    const secondOutput: string[] = [];
    secondConsumer.stdout.setEncoding("utf8");
    secondConsumer.stdout.on("data", (chunk: any) => secondOutput.push(chunk));
    secondProducer.stdout.pipe(secondConsumer.stdin, { end: false });
    const unpiped: any = secondProducer.stdout.unpipe(secondConsumer.stdin);
    secondProducer.stdout.pipe(secondConsumer.stdin, { end: false });
    console.log("unpipe:", unpiped === secondProducer.stdout);
    secondProducer.stdout.on("end", () => secondConsumer.stdin.end("right"));
    secondConsumer.on("close", () => console.log(`endfalse:${secondOutput.join("")}`));
});
