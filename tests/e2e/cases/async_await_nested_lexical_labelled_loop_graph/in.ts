async function guardedLabel(): Promise<string> {
    {
        let index = 0;
        outer: while (await Promise.resolve(index < 3)) {
            console.log("guard-body", index);
            index++;
            if (index === 1) continue outer;
            break outer;
        }
        console.log("guard-tail", index);
    }
    return "guard-done";
}

async function branchedLabel(): Promise<string> {
    {
        let index = 0;
        repeat: while (await Promise.resolve(index < 3)) {
            console.log("branch-body", index);
            index++;
            if (index === 1) {
                continue repeat;
            } else {
                break repeat;
            }
        }
        console.log("branch-tail", index);
    }
    return await Promise.resolve("branch-done");
}

async function labelledFor(): Promise<string> {
    {
        let prefix = 10;
        let seen = 0;
        outer: for (let index = 0; await Promise.resolve(index < 4); index++) {
            console.log("for-body", index);
            seen += index;
            if (index < 1) continue outer;
            break outer;
        }
        console.log("for-tail", prefix + seen);
    }
    return "for-done";
}

async function labelledDo(): Promise<string> {
    {
        let index = 0;
        again: do {
            console.log("do-body", index);
            index++;
            if (index === 1) continue again;
            break again;
        } while (await Promise.resolve(index < 4));
        console.log("do-tail", index);
    }
    return "do-done";
}

async function immediate(): Promise<string> {
    return "immediate";
}

guardedLabel().then(value => console.log("result", value));
branchedLabel().then(value => console.log("result", value));
labelledFor().then(value => console.log("result", value));
labelledDo().then(value => console.log("result", value));
immediate().then(value => console.log("result", value));
