const queue = new DispatchQueue("binary-types");

const buffer = dispatch.sync(queue, () => new ArrayBuffer(8));
console.log("arraybuffer", buffer.byteLength);

dispatch.async(queue, () => new DataView(new ArrayBuffer(16), 4, 6)).then((view) => {
    console.log("dataview", view.byteOffset, view.byteLength, view.buffer.byteLength);
});

const encoder = dispatch.sync(queue, () => new TextEncoder());
console.log("encoder", encoder.encode("hello").length);

dispatch.async(queue, () => new TextDecoder()).then((decoder) => {
    console.log("decoder", decoder.decode(Buffer.from("ok")));
});
