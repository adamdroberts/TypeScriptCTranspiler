import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    let first = "seed";
    if (kind === 0) first = await delay(1, "zero");
    else if (kind === 1) first = await delay(1, "one");
    else if (kind === 2) first = await delay(1, "two");
    else if (kind === 3) first = await delay(1, "three");
    else if (kind === 4) first = await delay(1, "four");
    else if (kind === 5) first = await delay(1, "five");
    else if (kind === 6) first = await delay(1, "six");
    else first = await delay(1, "seven");
    const second = await delay(1, first + "-second");
    return second;
}

class Worker {
    async run(kind: number): Promise<string> {
        let first = "method-seed";
        if (kind === 0) first = await delay(1, "method-zero");
        else if (kind === 1) first = await delay(1, "method-one");
        else if (kind === 2) first = await delay(1, "method-two");
        else if (kind === 3) first = await delay(1, "method-three");
        else if (kind === 4) first = await delay(1, "method-four");
        else if (kind === 5) first = await delay(1, "method-five");
        else if (kind === 6) first = await delay(1, "method-six");
        else first = await delay(1, "method-seven");
        const second = await delay(1, first + "-second");
        return second;
    }
}

const value = async function(kind: number): Promise<string> {
    let first = "value-seed";
    if (kind === 0) first = await delay(1, "value-zero");
    else if (kind === 1) first = await delay(1, "value-one");
    else if (kind === 2) first = await delay(1, "value-two");
    else if (kind === 3) first = await delay(1, "value-three");
    else if (kind === 4) first = await delay(1, "value-four");
    else if (kind === 5) first = await delay(1, "value-five");
    else if (kind === 6) first = await delay(1, "value-six");
    else first = await delay(1, "value-seven");
    const second = await delay(1, first + "-second");
    return second;
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        let first = "branch-seed";
        if (kind === 0) first = await delay(1, "branch-zero");
        else if (kind === 1) first = await delay(1, "branch-one");
        else if (kind === 2) first = await delay(1, "branch-two");
        else if (kind === 3) first = await delay(1, "branch-three");
        else if (kind === 4) first = await delay(1, "branch-four");
        else if (kind === 5) first = await delay(1, "branch-five");
        else if (kind === 6) first = await delay(1, "branch-six");
        else first = await delay(1, "branch-seven");
        const second = await delay(1, first + "-second");
        return second;
    }
    return "fallthrough";
}

declaration(0).then((result: string): void => console.log("declaration-zero:", result));
declaration(7).then((result: string): void => console.log("declaration-seven:", result));
new Worker().run(6).then((result: string): void => console.log("method-six:", result));
value(5).then((result: string): void => console.log("value-five:", result));
branch(true, 7).then((result: string): void => console.log("branch-seven:", result));
branch(false, 0).then((result: string): void => console.log("branch-fallthrough:", result));
