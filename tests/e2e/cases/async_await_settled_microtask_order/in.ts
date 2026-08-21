let caught = false;
let resumed = false;

async function recoverSettledRejection(): Promise<string> {
    try {
        await Promise.reject("bad");
        return "never";
    } catch (error) {
        caught = true;
        return "caught:" + error;
    }
}

async function consumeSettledFulfillment(): Promise<string> {
    const value = await Promise.resolve("ok");
    resumed = true;
    return value;
}

const rejected = recoverSettledRejection();
const fulfilled = consumeSettledFulfillment();
console.log("immediate", caught, resumed);
rejected.then((value) => console.log(value, caught));
fulfilled.then((value) => console.log(value, resumed));
