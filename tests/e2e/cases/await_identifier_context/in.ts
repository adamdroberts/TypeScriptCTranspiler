import "./consumer.cjs";
async function typedAwait(): Promise<void> {
    const values = await Promise.resolve([11, 13]);
    console.log("typed:", values.join(","));
}
typedAwait();
