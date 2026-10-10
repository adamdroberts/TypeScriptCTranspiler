import {compare} from './owner';
console.log(compare('2','10').join(','));
console.log(compare(9007199254740993n,9007199254740992).join(','));
console.log(compare(NaN,1).join(','));
console.log((true as any)<(false as any),('2' as any)<3,('2' as any)>1,(null as any)<=0);
const converted={valueOf(){return 2;}};
console.log((converted as any)<3);
let actual:string=((1<2) as any);
console.log(typeof actual==='boolean',(actual as any)===true);
