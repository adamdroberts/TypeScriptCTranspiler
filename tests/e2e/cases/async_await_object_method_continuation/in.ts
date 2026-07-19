import { setTimeout as delay } from "node:timers/promises";

const objectRunner = {
    async awaitedLocal(prefix: string): Promise<string> {
        const value = await delay(1, "local");
        return prefix + value + "!";
    },

    async branch(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            const value = await delay(1, "branch");
            return prefix + value + "!";
        }
        const fallback = await delay(1, "fallthrough");
        return prefix + fallback + "!";
    },

    async leading(prefix: string): Promise<string> {
        const first = await delay(1, "first");
        const second = await delay(1, first + "-second");
        return prefix + second + "!";
    },

    async rejected(prefix: string): Promise<string> {
        return Promise.reject(prefix + "bad");
    },
};

objectRunner.rejected("object-")
    .catch((reason: string): string => {
        console.log("object-catch:", reason);
        return "object-recovered";
    })
    .finally((): void => {
        console.log("object-finally");
    })
    .then((recovered: string): void => {
        console.log("object-final-value:", recovered);
    });

objectRunner.awaitedLocal("object-")
    .then((value: string): Promise<string> => {
        console.log("object-awaited-local:", value);
        return objectRunner.branch(true, "object-");
    })
    .then((value: string): Promise<string> => {
        console.log("object-branch-true:", value);
        return objectRunner.branch(false, "object-");
    })
    .then((value: string): Promise<string> => {
        console.log("object-branch-false:", value);
        return objectRunner.leading("object-");
    })
    .then((value: string): void => {
        console.log("object-leading:", value);
    });
