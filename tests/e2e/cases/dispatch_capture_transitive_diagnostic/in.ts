const q = new DispatchQueue("worker");
let counter = 0;

function readCounter(): number {
    return counter;
}

function readThroughHelper(): number {
    return readCounter();
}

dispatch.async(q, () => readThroughHelper());
