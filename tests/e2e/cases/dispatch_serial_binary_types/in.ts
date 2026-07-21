const queue = new DispatchQueue("serial-binary-types");

const buffer = dispatch.sync(queue, () => new ArrayBuffer(4));
console.log("arraybuffer", buffer.byteLength);

dispatch.async(queue, () => new DataView(new ArrayBuffer(10), 2, 5)).then((view) => {
    console.log("dataview", view.byteOffset, view.byteLength, view.buffer.byteLength);
});

const encoder = dispatch.sync(queue, () => new TextEncoder());
console.log("encoder", encoder.encode("xy").length);

dispatch.async(queue, () => new TextDecoder()).then((decoder) => {
    console.log("decoder", decoder.decode(Buffer.from("yes")));
});
