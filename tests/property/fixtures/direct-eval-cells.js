var host = globalThis;
function check(value,label){if(!value)throw label;host.print(label+":true");}
function collect(){if(NATIVE_GC)host.$262.gc();}

function caller(parameter){
    var variable = {value:3}; let lexical = {value:5}; const constant = {value:7};
    const before = function(){return typeof introduced;};
    const reader = eval("parameter = {value:11}; variable = {value:13}; lexical = {value:17}; (() => [parameter, variable, lexical, constant]);", ...[]);
    check(parameter.value===11 && variable.value===13 && lexical.value===17,"caller-write-aliases");
    variable={value:19}; lexical={value:23};
    check(reader()[1]===variable && reader()[2]===lexical,"ordinary-write-aliases");
    let rejected=false;try{eval("constant = null;");}catch(reason){rejected=reason instanceof TypeError;}
    check(rejected && constant.value===7,"caller-immutable-cell");
    eval("var introduced = {value:29}; function introducedFunction(){return [introduced, lexical];}");
    check(before()==="object" && introducedFunction()[0]===introduced,"persistent-function-variable-record");
    eval("introduced = {value:31};");
    const strictReader=eval('"use strict"; var hidden={value:37}; (() => hidden);');
    check(typeof hidden==="undefined" && strictReader().value===37,"strict-eval-local-vars");
    let conflict=false;try{eval("var unpublished; var lexical;");}catch(reason){conflict=reason instanceof SyntaxError;}
    check(conflict && typeof unpublished==="undefined" && lexical.value===23,"caller-lexical-var-preflight");
    check(eval("delete parameter;")===false && eval("delete variable;")===false,"non-deletable-caller-bindings");
    return {reader:reader,late:before,declared:introducedFunction,strict:strictReader,
        update:function(value){variable=value;lexical=value;},introduced:function(){return introduced;}};
}
const first=caller({value:1}),second=caller({value:2});collect();
first.update({value:41});
check(first.reader()[1].value===41 && first.reader()[2].value===41 && second.reader()[1].value===19 &&
    first.introduced().value===31 && first.declared()[1].value===41 && first.strict().value===37 &&
    !Object.prototype.hasOwnProperty.call(host,"introduced"),"escaped-caller-cell-ownership");

function strictCaller(){"use strict";var local=43;eval("var local=47; var strictInserted=53;");return [local,typeof strictInserted];}
check(strictCaller().join("|")==="43|undefined","caller-strictness-dispatch");
function outer(){let shared={value:59};return function(){
    check(shared.value===59,"outer-before-eval");eval("var shared = {value:61};");
    shared={value:67};return [shared,eval("shared"),function(){return shared;}];
};}
const shadowed=outer()();collect();
host.print("shadow-values:"+shadowed[0].value+":"+shadowed[1].value+":"+shadowed[2]().value);
check(shadowed[0]===shadowed[1] && shadowed[2]().value===67,"eval-shadow-of-outer-binding");
function lexicalOwner(){var shared={value:139};let reader;
    {let shared={value:149};reader=function(){return shared;};}
    return reader;
}
const lexicalReader=lexicalOwner();collect();check(lexicalReader().value===149,"source-closure-lexical-scope-owner");
function parameterScopes(value=163,read=eval("(() => value);")){var value=167;return [read,value];}
const parameterResult=parameterScopes();collect();check(parameterResult[0]()===163 && parameterResult[1]===167,"separate-parameter-and-body-cells");
function parameterVisibility(read=eval("(() => typeof bodyVariable);")){var bodyVariable=173;return [read(),function(){return bodyVariable;}];}
const visibility=parameterVisibility();collect();check(visibility[0]==="undefined" && visibility[1]()===173,"parameter-eval-excludes-body-vars");
function parameterTdz(value=eval("later;"),later=179){return value;}
let parameterRejected=false;try{parameterTdz();}catch(reason){parameterRejected=reason instanceof ReferenceError;}
check(parameterRejected,"parameter-eval-tdz");
function argumentsParameter(arguments=241){return eval("arguments;");}
check(argumentsParameter()===241,"body-record-inherits-explicit-arguments-parameter");
function context(value){
    const receiver=eval("this;");
    const actual=eval("arguments;");
    eval("arguments[0]=181;");
    check(value===181 && arguments===actual,"eval-mapped-arguments-binding");
    return eval("(() => [this, arguments, new.target, value]);");
}
const receiver={value:191};const contextReader=context.call(receiver,193);collect();
const contextValues=contextReader.call({});
check(contextValues[0]===receiver && contextValues[1][0]===181 && contextValues[2]===undefined && contextValues[3]===181,"retained-eval-call-context");
function strictReceiver(){"use strict";return eval("this;");}
check(strictReceiver.call(197)===197 && context.call(undefined,223).call(null)[0]===host,"strict-and-sloppy-eval-this");
function primitiveReceiver(){return this===eval("this;");}
check(primitiveReceiver.call(227),"single-sloppy-this-boxing");
function constructContext(value){this.read=eval("(() => [this, arguments, new.target]);");}
function Alternate(){}
const constructed=Reflect.construct(constructContext,[199],Alternate);collect();const constructorValues=constructed.read();
check(constructorValues[0]===constructed && constructorValues[1][0]===199 && constructorValues[2]===Alternate,"retained-eval-construction-context");
let targetRejected=false;try{eval("var newTargetUnpublished; new.target;");}catch(reason){targetRejected=reason instanceof SyntaxError;}
check(targetRejected && typeof newTargetUnpublished==="undefined","new-target-context-preflight");
function reassignArguments(){const replacement={value:211};eval("arguments = null;");return arguments===null;}
function declareArguments(){var arguments;return Array.isArray(arguments)===false && arguments.length===0;}
check(reassignArguments() && declareArguments(),"mutable-function-arguments-binding");

function temporal(){let saw=false;try{eval("typeof later;");}catch(reason){saw=reason instanceof ReferenceError;}
    let later=71;return saw && eval("later;")===71;}
check(temporal(),"caller-tdz-cell");
const readers=[];
for(let iteration=0;iteration<7;++iteration){let item={value:iteration};readers.push(eval("(() => [iteration, item]);"));}
collect();check(readers.map(function(read){const values=read();return values[0]+":"+values[1].value;}).join("|")===
    "0:0|1:1|2:2|3:3|4:4|5:5|6:6","retained-iteration-cell-aliases");
{
    let branch=73;
    switch(0){case (eval("branch += 6;"),0): check(branch===79,"switch-scope-cell-projection");}
}
try{throw {value:83};}catch(reason){const read=eval("(() => reason);");reason={value:89};collect();check(read()===reason,"catch-cell-projection");}
function replaced(eval){return eval("1 + 2");}
check(replaced(function(source){return source+"!";})==="1 + 2!","actual-eval-callee-identity");
function remove(){eval("var disposable=97;");const before=typeof disposable;eval("delete disposable;");return before+":"+typeof disposable;}
check(remove()==="number:undefined","deletable-inserted-variable");

async function asynchronous(parameter){let value=parameter;var temporary=parameter;await 0;
    const read=eval("(() => [parameter, value]);");eval("parameter=101; value=103;");
    eval("temporary=151; var resumedInserted=157;");
    check(temporary===151 && resumedInserted===157 && !Object.prototype.hasOwnProperty.call(host,"temporary"),"resumable-variable-record");
    check(eval("this;")===host && eval("arguments;")[0]===101,"resumed-eval-function-context");
    await 0;return [parameter,value,read];}
function* generator(parameter){let value=parameter;yield 0;
    const read=eval("(() => [parameter, value]);");eval("parameter=107; value=109;");yield read;return [parameter,value];}
async function* asyncGenerator(parameter){let value=parameter;await 0;yield 0;
    const read=eval("(() => [parameter, value]);");eval("parameter=113; value=127;");yield read;return [parameter,value];}
function child(previous,index){let own=index;return eval("(() => [own, previous]);");}
async function asynchronousArguments(){var arguments;await 0;return eval("arguments;");}
function* parameterGenerator(value=229,read=eval("(() => value);")){var value=233;yield [read,value];}
function* argumentsGenerator(arguments=251){yield eval("arguments;");}
async function finish(){
    const asynchronousArgumentsValue=await asynchronousArguments(239);
    check(asynchronousArgumentsValue[0]===239,"resumable-arguments-var-initialization");
    const parameterOwner=parameterGenerator();const parameterValues=parameterOwner.next().value;collect();
    check(parameterValues[0]()===229 && parameterValues[1]===233,"resumable-parameter-body-separation");
    check(argumentsGenerator().next().value===251,"resumable-body-record-inherits-arguments-parameter");
    const asynchronousResult=await asynchronous(0);collect();
    check(asynchronousResult[0]===101 && asynchronousResult[1]===103 && asynchronousResult[2]().join("|")==="101|103","async-caller-cell-projection");
    const ordinary=generator(0);ordinary.next();const ordinaryReader=ordinary.next().value;collect();
    check(ordinaryReader().join("|")==="107|109" && ordinary.next().value.join("|")==="107|109","generator-caller-cell-projection");
    const asyncOwner=asyncGenerator(0);await asyncOwner.next();const asyncReader=(await asyncOwner.next()).value;collect();
    check(asyncReader().join("|")==="113|127" && (await asyncOwner.next()).value.join("|")==="113|127","async-generator-caller-cell-projection");
    let chain=null;for(let index=0;index<4096;++index){chain=child(chain,index);if(index%127===0)collect();}
    collect();for(let index=4095;index>=0;--index){const value=chain();if(value[0]!==index)throw "retained caller tree";chain=value[1];if(index%127===0)collect();}
    check(chain===null,"deep-retained-caller-environment-tree");
}
finish();
