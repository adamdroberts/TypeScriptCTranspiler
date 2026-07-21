const queue = new DispatchQueue("objects");

const date = dispatch.sync(queue, () => new Date(1700000000000));
console.log("date", date.getTime());

const buffer = dispatch.sync(queue, () => Buffer.from("ok"));
console.log("buffer", buffer.length, buffer.toString());

dispatch.async(queue, () => /ab+/i).then((regexp) => {
    console.log("regexp", regexp.test("xxABBB"), regexp.test("xyz"));
});

dispatch.async(queue, () => new Error("boom")).then((error) => {
    console.log("error", error.message);
});
