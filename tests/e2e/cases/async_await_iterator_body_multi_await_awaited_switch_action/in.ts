function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let controlCount = 0;
let lastOf = "";
let lastIn = "";

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

function laterControl(value: string): Promise<string> {
    controlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        var first: string;
        first = await laterOf(item);
        const marker = first + "-second";
        var second: string;
        second = await laterOf(marker);
        switch (item) {
            case "of-a":
                lastOf = second + "-continue";
                var switchContinueSuffix: string;
                switchContinueSuffix = "-between";
                const switchContinueValue = await laterControl(lastOf);
                lastOf = switchContinueValue + switchContinueSuffix;
                var switchPostSuffix: string;
                switchPostSuffix = "-post";
                const switchPostValue = await laterControl(lastOf);
                lastOf = switchPostValue + switchPostSuffix;
                const switchFinalValue = await laterControl(lastOf);
                lastOf = switchFinalValue;
                continue;
            default:
                lastOf = second + "-break";
                var switchBreakSuffix: string;
                switchBreakSuffix = "-between";
                var switchBreakValue: string;
                switchBreakValue = await laterControl(lastOf);
                lastOf = switchBreakValue + switchBreakSuffix;
                var switchBreakPostSuffix: string;
                switchBreakPostSuffix = "-post";
                var switchBreakPostValue: string;
                switchBreakPostValue = await laterControl(lastOf);
                lastOf = switchBreakPostValue + switchBreakPostSuffix;
                var switchBreakFinalValue: string;
                switchBreakFinalValue = await laterControl(lastOf);
                lastOf = switchBreakFinalValue;
                break;
        }
    }
    return await later(ofCount + "|" + controlCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        var first: string;
        first = await laterIn(key);
        const marker = first + "-second";
        var second: string;
        second = await laterIn(marker);
        switch (key) {
            case "in-a":
                lastIn = second + "-continue";
                var switchContinueSuffix: string;
                switchContinueSuffix = "-between";
                const switchContinueValue = await laterControl(lastIn);
                lastIn = switchContinueValue + switchContinueSuffix;
                var switchPostSuffix: string;
                switchPostSuffix = "-post";
                const switchPostValue = await laterControl(lastIn);
                lastIn = switchPostValue + switchPostSuffix;
                const switchFinalValue = await laterControl(lastIn);
                lastIn = switchFinalValue;
                continue;
            default:
                lastIn = second + "-break";
                var switchBreakSuffix: string;
                switchBreakSuffix = "-between";
                var switchBreakValue: string;
                switchBreakValue = await laterControl(lastIn);
                lastIn = switchBreakValue + switchBreakSuffix;
                var switchBreakPostSuffix: string;
                switchBreakPostSuffix = "-post";
                var switchBreakPostValue: string;
                switchBreakPostValue = await laterControl(lastIn);
                lastIn = switchBreakPostValue + switchBreakPostSuffix;
                var switchBreakFinalValue: string;
                switchBreakFinalValue = await laterControl(lastIn);
                lastIn = switchBreakFinalValue;
                break;
        }
    }
    return await later(inCount + "|" + controlCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
