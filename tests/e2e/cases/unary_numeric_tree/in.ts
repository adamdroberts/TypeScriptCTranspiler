import {positive, negative, complement} from './owner';
console.log(negative(true) === -1, Object.is(negative(false), -0));
console.log(negative('0b11') === -3, positive('6') === 6, complement('6') === -7);
const object: any = {valueOf() {return '6';}};
console.log(negative(object) === -6, positive(object) === 6);
const actual: number = negative(7n);
console.log(typeof actual === 'bigint', negative(7n) === -7n);
try {positive(7n);} catch(error: any) {console.log(error instanceof TypeError);}
