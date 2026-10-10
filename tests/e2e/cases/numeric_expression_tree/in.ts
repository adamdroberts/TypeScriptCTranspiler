import {shift, complement, assign, arithmetic} from './owner';
console.log((4294967297 | 0) === 1, (4294967297 >>> 0) === 1);
console.log(shift(1, 33) === 2, (1 << 32) === 1, assign(4294967297, 32) === 1);
console.log(complement(4294967297) === -2, ~4294967297 === -2);
console.log(shift(-1, 31) === -2147483648, (1 >>> -1) === 0);
console.log(arithmetic('7', 2) === '10 units');
console.log((5n & 3n) === 1n, (8n << -1n) === 4n);
