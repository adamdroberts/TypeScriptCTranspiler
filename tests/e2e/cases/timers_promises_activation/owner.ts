import {setTimeout as delay,setImmediate as immediate} from 'node:timers/promises';
export function delayed(options:any,value:any):Promise<any>{return delay(0,value,options);}
export function expanded(actuals:[any,any,any]):Promise<any>{return immediate(...actuals);}
