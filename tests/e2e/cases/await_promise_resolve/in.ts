import "./scheduler.js";

async function nativePayload(): Promise<number[]> {
    const input = Promise.resolve([3, 5, 7]);
    const value = await input;
    return value;
}
nativePayload().then(value => console.log("native:" + value.join(",")));
