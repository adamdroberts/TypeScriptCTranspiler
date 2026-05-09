const a = 900719925474099312345n;
const b = BigInt("12345678901234567890");

console.log("sum:", (a + b).toString());
console.log("diff:", (b - a).toString());
console.log("mul:", (123456789n * 987654321n).toString());
console.log("divmod:", (10n / 3n).toString(), (10n % 3n).toString(), (-10n / 3n).toString(), (-10n % 3n).toString());
console.log("pow:", (2n ** 10n).toString());

let x = 5n;
x += 2n;
x *= 3n;
x -= 1n;
x /= 4n;
x %= 4n;
console.log("compound:", x.toString());

const thirteen = BigInt("13");
console.log("compare:", 4n < 5n, 5n <= 5n, 7n > 9n, 9n >= 9n, 12n === BigInt("12"), 12n !== thirteen);
console.log("radix:", b.toString(16));
console.log("prefix:", 0xffn.toString(), 0o77n.toString(), 0b101010n.toString(), BigInt("0b101").toString());
console.log("ctor:", BigInt(42).toString(), BigInt(true).toString(), BigInt(false).toString());
console.log("typeof:", typeof a);
console.log("concat:", "id:" + 123n);
