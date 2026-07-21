const queue = new DispatchQueue("after");

dispatch.after(5, queue, () => "delayed").then((value) => {
    console.log("after", value);
});

console.log("before");
