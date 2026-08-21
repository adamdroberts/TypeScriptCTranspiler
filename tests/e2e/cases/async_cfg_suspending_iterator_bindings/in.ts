// @ts-nocheck

const iteratorOrder: number[] = [];

function iteratorKey(marker: number, key: string): Promise<string> {
    iteratorOrder.push(marker);
    return Promise.resolve(key);
}

function iteratorFallback(marker: number, value: number): Promise<number> {
    iteratorOrder.push(marker);
    return Promise.resolve(value);
}

function iteratorTextFallback(marker: number, value: string): Promise<string> {
    iteratorOrder.push(marker);
    return Promise.resolve(value);
}

async function ordinaryBindings(): Promise<string> {
    const readers: any = [];
    for (const {
        [await iteratorKey(1, "value")]: value = await iteratorFallback(2, -1),
        ["miss" + await iteratorKey(value > 0 ? 3 : 99, "ing")]: missing =
            await iteratorFallback(4, value + 1),
    } of [{ value: 10 }, { value: 20 }]) {
        readers.push(() => value + ":" + missing);
        await Promise.resolve();
    }
    return readers[0]() + ";" + readers[1]();
}

async function forInBinding(): Promise<string> {
    const heads: string[] = [];
    for (const [head = await iteratorTextFallback(5, "empty")] in { a: 1, z: 2 }) {
        heads.push(head);
    }
    return heads.join(",");
}

let asyncTrace = "";

function asyncRows(label: string, rows: any[]): any {
    let index = 0;
    const iterator: any = {};
    iterator.next = (): Promise<any> => {
        asyncTrace += label + "next>";
        if (index >= rows.length) return Promise.resolve({ done: true });
        return Promise.resolve({ value: rows[index++], done: false });
    };
    iterator.return = (): Promise<any> => {
        asyncTrace += label + "return>";
        return Promise.resolve({ done: true });
    };
    iterator[Symbol.asyncIterator] = (): any => iterator;
    return iterator;
}

async function asyncBinding(): Promise<string> {
    let output = "";
    for await (const {
        [await iteratorKey(6, "value")]: value = await iteratorFallback(7, -1),
    }: { value: number } of asyncRows("S", [{ value: 30 }, { value: 40 }])) {
        output += String(value) + ",";
    }
    return output;
}

function rejectedIteratorBinding(): Promise<number> {
    return Promise.reject("iterator binding rejected");
}

async function bindingRejection(): Promise<string> {
    for await (const { value = await rejectedIteratorBinding() } of asyncRows("R", [{}])) {
        return String(value);
    }
    return "unreachable";
}

ordinaryBindings()
    .then((ordinary) => {
        console.log("ordinary:", ordinary);
        return forInBinding();
    })
    .then((forIn) => {
        console.log("for-in:", forIn);
        return asyncBinding();
    })
    .then((asyncValues) => {
        console.log("async:", asyncValues, iteratorOrder.join(","), asyncTrace);
        return bindingRejection();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("rejection:", reason, asyncTrace),
    );
