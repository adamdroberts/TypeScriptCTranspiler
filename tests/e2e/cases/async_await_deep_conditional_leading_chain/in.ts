import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    let first = "seed";
    if (kind === 0) { var suffix = "-zero"; first = await delay(1, "zero" + suffix); }
    else if (kind === 1) first = await delay(1, "one");
    else if (kind === 2) first = await delay(1, "two");
    else if (kind === 3) first = await delay(1, "three");
    else if (kind === 4) first = await delay(1, "four");
    else if (kind === 5) first = await delay(1, "five");
    else if (kind === 6) first = await delay(1, "six");
    else if (kind === 7) first = await delay(1, "seven");
    else if (kind === 8) first = await delay(1, "eight");
    else if (kind === 9) first = await delay(1, "nine");
    else if (kind === 10) first = await delay(1, "ten");
    else if (kind === 11) first = await delay(1, "eleven");
    else { var suffix = "-twelve"; first = await delay(1, "twelve" + suffix); }
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
        else if (kind === 7) first = await delay(1, "method-seven");
        else if (kind === 8) first = await delay(1, "method-eight");
        else if (kind === 9) first = await delay(1, "method-nine");
        else if (kind === 10) first = await delay(1, "method-ten");
        else if (kind === 11) first = await delay(1, "method-eleven");
        else first = await delay(1, "method-twelve");
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
    else if (kind === 7) first = await delay(1, "value-seven");
    else if (kind === 8) first = await delay(1, "value-eight");
    else if (kind === 9) first = await delay(1, "value-nine");
    else if (kind === 10) first = await delay(1, "value-ten");
    else if (kind === 11) first = await delay(1, "value-eleven");
    else first = await delay(1, "value-twelve");
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
        else if (kind === 7) first = await delay(1, "branch-seven");
        else if (kind === 8) first = await delay(1, "branch-eight");
        else if (kind === 9) first = await delay(1, "branch-nine");
        else if (kind === 10) first = await delay(1, "branch-ten");
        else if (kind === 11) first = await delay(1, "branch-eleven");
        else first = await delay(1, "branch-twelve");
        const second = await delay(1, first + "-second");
        return second;
    }
    return "fallthrough";
}

declaration(0).then((result: string): void => console.log("declaration-zero:", result));
declaration(12).then((result: string): void => console.log("declaration-twelve:", result));
new Worker().run(11).then((result: string): void => console.log("method-eleven:", result));
value(10).then((result: string): void => console.log("value-ten:", result));
branch(true, 12).then((result: string): void => console.log("branch-twelve:", result));
branch(false, 0).then((result: string): void => console.log("branch-fallthrough:", result));
