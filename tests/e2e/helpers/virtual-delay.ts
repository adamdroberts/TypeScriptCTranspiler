type PendingDelay={deadline:number;order:number;value:string;resolve:(value:string)=>void};
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

export function delay(milliseconds:number,value:string):Promise<string>{
    return new Promise<string>((resolve)=>{
        pending.push({deadline:now+milliseconds,order:order++,value,resolve});
        if(!draining){draining=true;Promise.resolve().then(advance);}
    });
}
