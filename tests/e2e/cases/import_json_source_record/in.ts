let body = "17;";
const attributes: any = { type: "json", get [Symbol.iterator](): any { body = "19;"; return undefined; } };
async function main(): Promise<void> {
    const promise: any = import("./data.json", {with: attributes});
    console.log("immediate:", eval(body));
    const first: any = await promise;
    const second: any = await import("./data.json", {with: {type: "json"}});
    console.log("namespace:", first === second, first.default === second.default, first.default.value);
}
main();
