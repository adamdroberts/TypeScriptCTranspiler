const fast = Buffer.allocUnsafe(3);
fast.fill(65);

const slow = Buffer.allocUnsafeSlow(2);
slow[0] = 66;
slow[1] = 67;

console.log("fast:", fast.length, fast.toString());
console.log("slow:", slow.length, slow.toString());
console.log("is buffer:", Buffer.isBuffer(fast), Buffer.isBuffer(slow));
