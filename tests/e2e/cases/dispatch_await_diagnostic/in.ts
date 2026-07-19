const q = new DispatchQueue("worker");

async function inner(): Promise<number> {
    return 1;
}

dispatch.async(q, async () => await inner());
