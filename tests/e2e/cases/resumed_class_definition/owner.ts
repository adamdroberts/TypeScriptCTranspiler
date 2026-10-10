export const memberKey: unique symbol = Symbol('resumed-member');
export function* makeGenerator(label: any): any {
    yield 'pause';
    class Local {
        [memberKey](input: any = label): any { return input; }
        static self(): any { return Local; }
        static async later(): Promise<any> { await Promise.resolve(0); return Local; }
    }
    yield Local;
}
export async function makeOwner(label: any): Promise<any> {
    await Promise.resolve(0);
    return class Named {
        [memberKey](input: any = label): any { return input; }
        static self(): any { return Named; }
        static async later(): Promise<any> { await Promise.resolve(0); return Named; }
    };
}
export async function* repeatedOwners(label: any): any {
    for (let index = 0; index < 2; index++) {
        await Promise.resolve(0);
        class Iteration {
            [memberKey](): any { return label; }
            index(): number { return index; }
            static self(): any { return Iteration; }
        }
        yield Iteration;
    }
}

export async function patternedOwner(
    [Constructor = class {
        [memberKey](): any { return value; }
        async later(): Promise<any> { await Promise.resolve(0); return value; }
    }]: any[],
    { owner: { value } }: any,
    ...tail: any[]
): Promise<any> {
    await Promise.resolve(0);
    return [Constructor, value, tail];
}
