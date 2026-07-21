function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

let bodyCount = 0;

async function loopBodyAwaitIfBothReturn(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (await laterCondition(count === 0)) {
            if (bodyCount === 0) {
                bodyCount++;
            }
            try {
                bodyCount += 0;
            } finally {
                bodyCount += 0;
            }
            switch (bodyCount) {
                case 0:
                    bodyCount++;
                    break;
                default:
                    bodyCount++;
                    break;
            }
            return await later("true-" + bodyCount);
        } else {
            if (bodyCount === 0) {
                bodyCount++;
            }
            try {
                bodyCount += 0;
            } finally {
                bodyCount += 0;
            }
            switch (bodyCount) {
                case 0:
                    bodyCount++;
                    break;
                default:
                    bodyCount++;
                    break;
            }
            return await later("false-" + bodyCount);
        }
    }
    return await later("done-" + bodyCount);
}

loopBodyAwaitIfBothReturn().then((value) => console.log(value));
