console.log('negative-second',new Date(1969,11,31,23,59,59,0).getTime());
console.log('fraction',new Date(1970,0,1,0,0,-1,999.9).getTime());
const date=new Date(0);
console.log('ordered',date.setHours(80063993375,29,1,-288230376151711740));
console.log('year',date.setFullYear(0,0,1));
console.log('legacy',date.setYear(99.9));
