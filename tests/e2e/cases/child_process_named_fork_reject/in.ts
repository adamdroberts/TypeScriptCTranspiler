import { fork } from "node:child_process";

let evaluated = false;
try {
    Reflect.apply(fork, {}, [(evaluated = true, "./worker.js")]);
    console.log("unexpected");
} catch (error) {
    console.log(evaluated, error instanceof TypeError,
        error instanceof Error && error.message === "child_process.fork requires an AOT child-module and IPC owner");
}
