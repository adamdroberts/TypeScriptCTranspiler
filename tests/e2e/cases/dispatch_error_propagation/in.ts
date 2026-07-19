const q = new DispatchQueue("worker");

try {
    dispatch.sync(q, () => {
        throw new Error("boom in sync");
    });
} catch (e) {
    console.log("caught: " + e);
}

async function failing(): Promise<number> {
    return await dispatch.async(q, () => {
        if (1 < 2) throw new Error("boom in async");
        return 5;
    });
}

failing().catch((e) => console.log("rejected: " + e));
