async function declaration(values: any, output: string[]): Promise<string> {
    for await (const value of values) {
        output.push(String(value));
    }
    return "declaration:" + output.join(",");
}

class Collector {
    private prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(values: any, output: string[]): Promise<string> {
        for await (const value of values) {
            output.push(String(value));
        }
        return this.prefix + ":" + output.join(",");
    }

    static async collect(values: any, output: string[]): Promise<string> {
        for await (const value of values) {
            output.push(String(value));
        }
        return "static:" + output.join(",");
    }
}

const lifted = async (values: any, output: string[]): Promise<string> => {
    for await (const value of values) {
        output.push(String(value));
    }
    return "lifted:" + output.join(",");
};

function makeClosure(prefix: string): (values: any, output: string[]) => Promise<string> {
    return async (values: any, output: string[]): Promise<string> => {
        for await (const value of values) {
            output.push(String(value));
        }
        return prefix + ":" + output.join(",");
    };
}

const object = {
    async method(values: any, output: string[]): Promise<string> {
        for await (const value of values) {
            output.push(String(value));
        }
        return "object:" + output.join(",");
    },
};

const values: any = [Promise.resolve("a"), "b"];
declaration(values, []).then((result: string): void => console.log(result));
new Collector("instance").method(values, []).then((result: string): void => console.log(result));
Collector.collect(values, []).then((result: string): void => console.log(result));
lifted(values, []).then((result: string): void => console.log(result));
makeClosure("closure")(values, []).then((result: string): void => console.log(result));
object.method(values, []).then((result: string): void => console.log(result));
