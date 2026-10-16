// @ts-nocheck
const values=[];values.push("before");console.log(values.join("|"));
let owner={code:"31;"};owner={next:owner};owner=owner.next;console.log(eval(owner.code));
const target={length:0};const push=Array.prototype.push.bind(target);
console.log(push("item",undefined),target[0],target.length);
console.log("array-indexed-complete");
let body="17;";const args=[];args.push({toString(){body="19;";return "|";}});["item"].join(...args);console.log(eval(body));
["23;"].some(value=>{body=value;return true;});console.log(eval(body));
["29;"].every(value=>{body=value;return true;});console.log(eval(body));
