import { setTimeout as delay } from "node:timers/promises";

async function aliasAwait(): Promise<string> {
    const value = await delay(5, "alias");
    return value;
}

async function parenthesizedAliasAwait(): Promise<string> {
    const value = (await delay(6, "alias-paren"));
    return value;
}

aliasAwait().then((value: string): void => console.log("result:", value));
parenthesizedAliasAwait().then((value: string): void => console.log("parenthesized-result:", value));

class Holder {
    async method(): Promise<string> {
        const value = await delay(10, "method");
        return value;
    }

    async parenthesizedMethod(): Promise<string> {
        const value = (await delay(11, "method-paren"));
        return value;
    }
}

const valueAlias = async (): Promise<string> => {
    const value = await delay(15, "value");
    return value;
};

const parenthesizedValueAlias = async (): Promise<string> => {
    const value = (await delay(16, "value-paren"));
    return value;
};

new Holder().method().then((value: string): void => console.log("method:", value));
new Holder().parenthesizedMethod().then((value: string): void => console.log("parenthesized-method:", value));
valueAlias().then((value: string): void => console.log("value:", value));
parenthesizedValueAlias().then((value: string): void => console.log("parenthesized-value:", value));
