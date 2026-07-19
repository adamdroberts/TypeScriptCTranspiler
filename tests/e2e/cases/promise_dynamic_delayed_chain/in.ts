import { setTimeout as delay } from "node:timers/promises";

const runner = {
    async rejected(prefix: string): Promise<string> {
        const value = await delay(1, "bad");
        throw prefix + value;
    },
};

Promise.resolve("start")
    .then((_value: string): Promise<void> => {
        return runner.rejected("delayed-")
            .catch((reason: string): string => {
                console.log("dynamic-delayed-catch:", reason);
                return "delayed-recovered";
            })
            .finally((): void => {
                console.log("dynamic-delayed-finally");
            })
            .then((value: string): void => {
                console.log("dynamic-delayed-value:", value);
            });
    });
