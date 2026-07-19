const q = new DispatchQueue("worker");
let counter = 0;
dispatch.async(q, () => counter + 1);
