function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of"]) {
        const first = await laterOf(item);
        if (ofCount > 0) {
            ofCount += 10;
        }
        switch (ofCount) {
            case 11:
                ofCount += 1;
                break;
            default:
                break;
        }
        while (ofCount === 12) {
            ofCount += 1;
        }
        do {
            ofCount += 1;
        } while (ofCount === 13);
        for (; ofCount === 14;) {
            ofCount += 1;
        }
        for (const nested of ["nested"]) {
            ofCount += nested.length;
        }
        switch (ofCount) {
            case 21:
                ofCount += 1;
            case 22:
                var clauseBump = 1;
                ofCount += clauseBump;
                break;
            default:
                break;
        }
        try {
            ofCount += 1;
        } finally {
            ofCount += 1;
        }
        try {
            throw "postlude";
        } catch (reason) {
            ofCount += 2;
        } finally {
            ofCount += 1;
        }
        if (ofCount < 0) {
            ofCount += 100;
        } else {
            let branchBump: number;
            branchBump = 2;
            ofCount += branchBump;
        }
        const suffix = "-second";
        const second = await laterOf(first + suffix);
        return await later(ofCount + "|" + second);
    }
    return await later("fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { in: "value" };
    for (const key in values) {
        const first = await laterIn(key);
        if (inCount > 0) {
            inCount += 10;
        }
        switch (inCount) {
            case 11:
                inCount += 1;
                break;
            default:
                break;
        }
        while (inCount === 12) {
            inCount += 1;
        }
        do {
            inCount += 1;
        } while (inCount === 13);
        for (; inCount === 14;) {
            inCount += 1;
        }
        for (const nestedKey in { nested: "value" }) {
            inCount += nestedKey.length;
        }
        switch (inCount) {
            case 21:
                inCount += 1;
            case 22:
                var clauseBump = 1;
                inCount += clauseBump;
                break;
            default:
                break;
        }
        try {
            inCount += 1;
        } finally {
            inCount += 1;
        }
        try {
            throw "postlude";
        } catch (reason) {
            inCount += 2;
        } finally {
            inCount += 1;
        }
        if (inCount < 0) {
            inCount += 100;
        } else {
            let branchBump: number;
            branchBump = 2;
            inCount += branchBump;
        }
        const suffix = "-second";
        const second = await laterIn(first + suffix);
        throw await later("in-" + inCount + "|" + second);
    }
    return await later("fallthrough");
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value), (reason) => console.log(reason));
