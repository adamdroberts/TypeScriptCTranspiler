import { setTimeout as delay } from "node:timers/promises";

async function suffix(): Promise<string> {
    const value = await delay(5, "ready");
    return value + "!";
}

async function doubled(): Promise<number> {
    const value = await delay(10, 21);
    return value * 2;
}

class Worker {
    async label(): Promise<string> {
        const value = await delay(15, "method");
        return value + "!";
    }
}

const arrow = async (): Promise<string> => {
    const value = await delay(20, "arrow");
    return value + "!";
};

suffix().then((value: string): void => {
    console.log("suffix:", value);
});

doubled().then((value: number): void => {
    console.log("double:", value);
});

new Worker().label().then((value: string): void => {
    console.log("method:", value);
});

arrow().then((value: string): void => {
    console.log("arrow:", value);
});
