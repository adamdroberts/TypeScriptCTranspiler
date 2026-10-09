var host=globalThis;
function check(value,label){if(!value)throw label;host.print(label+":true");}
function collect(){if(NATIVE_GC)host.$262.gc();}
function replacement(text){return "replacement:"+text;}
async function asynchronous(value){
    let own=value;const receiver=this;
    const observed=(eval)(await "own += 3; own;");
    check(observed===14 && own===14,"awaited-direct-eval-cell");
    const context=eval(await "[this, arguments[0], new.target];");
    check(context[0]===receiver && context[1]===11 && context[2]===undefined,"awaited-direct-eval-function-context");
    {let branch={value:17};
        const reader=eval(await "(() => branch);");branch={value:19};collect();
        check(reader().value===19,"awaited-eval-block-cell");
    }
    const read=eval(await "var introduced=23; (() => introduced);");
    check(introduced===23 && read()===23 && !Object.prototype.hasOwnProperty.call(host,"introduced"),"awaited-sloppy-variable-record");
    return read;
}
async function strictAsynchronous(){"use strict";let own=29;
    const read=eval(await "var introduced=31; (() => [own, introduced]);");
    own=37;return [read,typeof introduced];
}
async function replaceWhileEvaluating(){host.eval=replacement;await 0;return "own;";}
async function retainedCallee(){let own=41;const original=eval;
    const result=eval(await replaceWhileEvaluating());host.eval=original;return result;
}
async function actualArguments(){let own=43,effects="";
    const value=eval(...(await ["own += 4; own;"]),await (effects+="extra",0));
    let rejected=false;
    try{eval(await "own=101;",await Promise.reject(53));}catch(reason){rejected=reason===53;}
    check(rejected && own===47,"abrupt-argument-skips-eval-body");
    return [value,effects];
}
function* generator(value){let own=value;
    const read=eval((yield 0,"(() => own);"));own=59;return read;
}
async function* asyncGenerator(value){let own=value;
    const read=eval((await 0,yield 0,"(() => own);"));own=61;return read;
}
function* nestedArguments(eval){let own=67;
    return eval(...(yield 0,["own += 6; own;"]),(yield 0,undefined));
}
function* child(previous,value){yield 0;return eval((yield 0,"(() => [value, previous]);"));}
async function finish(){
    const receiver={};const read=await asynchronous.call(receiver,11);collect();check(read()===23,"retained-awaited-eval-owner");
    const strict=await strictAsynchronous();collect();check(strict[0]().join("|")==="37|31" && strict[1]==="undefined","awaited-strict-eval-owner");
    check(await retainedCallee()===41,"callee-retained-before-argument-suspension");
    const actuals=await actualArguments();check(actuals[0]===47 && actuals[1]==="extra","suspended-actual-list-and-extra-effects");
    const owner=generator(0);owner.next();collect();const reader=owner.next().value;
    check(reader()===59,"yielded-direct-eval-reference");
    const asyncOwner=asyncGenerator(0);await asyncOwner.next();collect();const asyncReader=(await asyncOwner.next()).value;
    check(asyncReader()===61,"async-generator-direct-eval-reference");
    const nested=nestedArguments(eval);nested.next();collect();nested.next();collect();check(nested.next().value===73,"formal-eval-and-suspended-spread-list");
    GENERATED_PARTITIONS
    let chain=null;for(let value=0;value<4096;++value){const pending=child(chain,value);pending.next();pending.next();if(value%127===0)collect();chain=pending.next().value;}
    collect();for(let value=4095;value>=0;--value){const result=chain();if(result[0]!==value)throw "suspended eval owner";chain=result[1];if(value%127===0)collect();}
    check(chain===null,"deep-suspended-eval-owner-tree");
}
finish();
