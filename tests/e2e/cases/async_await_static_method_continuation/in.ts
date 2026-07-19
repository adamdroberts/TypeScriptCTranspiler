import { setTimeout as delay } from "node:timers/promises";

class StaticAsyncRunner {
    static async awaitedLocal(prefix: string): Promise<string> {
        const value = await delay(1, "local");
        return prefix + value + "!";
    }

    static async branch(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            const value = await delay(1, "branch");
            return prefix + value + "!";
        }
        const fallback = await delay(1, "fallthrough");
        return prefix + fallback + "!";
    }

    static async leading(prefix: string): Promise<string> {
        const first = await delay(1, "first");
        const second = await delay(1, first + "-second");
        return prefix + second + "!";
    }
}

StaticAsyncRunner.awaitedLocal("static-")
    .then((value: string): Promise<string> => {
        console.log("static-awaited-local:", value);
        return StaticAsyncRunner.branch(true, "static-");
    })
    .then((value: string): Promise<string> => {
        console.log("static-branch-true:", value);
        return StaticAsyncRunner.branch(false, "static-");
    })
    .then((value: string): Promise<string> => {
        console.log("static-branch-false:", value);
        return StaticAsyncRunner.leading("static-");
    })
    .then((value: string): void => {
        console.log("static-leading:", value);
    });
