type PendingDelay={deadline:number;order:number;value:any;resolve:(value:any)=>void};
const pending:PendingDelay[]=[];
let now=0;
let order=0;
let draining=false;

function advance():void{
    pending.sort((left,right)=>left.deadline-right.deadline||left.order-right.order);
    const next=pending.shift();
    if(!next){draining=false;return;}
    now=next.deadline;
    next.resolve(next.value);
    // Await reactions enqueue nested delays before the next clock step.
    Promise.resolve().then(advance);
}

export function delay(milliseconds:number,value?:any):Promise<any>{
    return new Promise<any>((resolve)=>{
        pending.push({deadline:now+milliseconds,order:order++,value,resolve});
        if(!draining){draining=true;Promise.resolve().then(advance);}
    });
}
