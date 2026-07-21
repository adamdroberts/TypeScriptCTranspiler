const queue = new DispatchQueue("clone");
const numbers = [1, 2, 3];

const pending = dispatch.async(queue, () => numbers.length);
numbers.push(4);

pending.then((value) => console.log("clone", value));
