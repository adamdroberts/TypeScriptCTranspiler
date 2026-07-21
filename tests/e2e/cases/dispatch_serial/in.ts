const q = new DispatchQueue("worker");
const pool = DispatchQueue.concurrent();

const s = dispatch.sync(q, () => "sync says " + (41 + 1));
console.log(s);

async function double(n: number): Promise<number> {
    return await dispatch.async(pool, () => n * 2);
}

async function run(): Promise<number> {
    const doubled = await double(21);
    return doubled + 1;
}

run().then((v) => console.log("async result: " + v));
