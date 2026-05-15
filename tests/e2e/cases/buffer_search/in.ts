const buf = Buffer.from([10, 20, 30, 20, 10]);

console.log("index:", buf.indexOf(20), buf.indexOf(20, 2), buf.indexOf(20, -2), buf.indexOf(99));
console.log("last:", buf.lastIndexOf(20), buf.lastIndexOf(20, 2), buf.lastIndexOf(20, -3), buf.lastIndexOf(99));
console.log("includes:", buf.includes(30), buf.includes(30, 3), buf.includes(10, -1));
