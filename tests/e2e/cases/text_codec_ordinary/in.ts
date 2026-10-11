async function main(): Promise<void> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    await Promise.resolve();
    const bytes = encoder.encode("fn-codec");
    console.log("suspended:", decoder.decode(bytes), bytes.length);
    console.log("metadata:", encoder.encoding, decoder.encoding, decoder.fatal, decoder.ignoreBOM);
    console.log("owners:", Object.getPrototypeOf(encoder) === TextEncoder.prototype, Object.getPrototypeOf(decoder) === TextDecoder.prototype);
    const buffer = new ArrayBuffer(2, {maxByteLength: 4});
    const view = new DataView(buffer);
    view.setUint8(0, 65);
    view.setUint8(1, 90);
    console.log("sources:", decoder.decode(buffer), decoder.decode(view));
    buffer.resize(1);
    console.log("resized:", decoder.decode(view));
}
main();
