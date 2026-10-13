/** Finite primitive projection of the native util formatter. Object coercion
 * belongs to the source owner/call graph; this producer never executes it. */
export function nativePrimitiveFormat(values:readonly (string|number|bigint|boolean|null|undefined)[]):string|null {
    if(!values.length)return "";
    const number=(value:typeof values[number]):number=>typeof value==="bigint"?NaN:Number(value);
    const first=values[0],format=typeof first==="string"?first:null;
    let output="",next=format===null?0:1;
    if(format!==null)for(let index=0;index<format.length;index++){
        const char=format[index]!;
        if(char!=="%"||index+1===format.length){output+=char;continue;}
        const code=format[++index]!;
        if(code==="%"){output+="%";continue;}
        if(!["s","d","i","f","j"].includes(code)||next===values.length){output+="%"+code;continue;}
        const value=values[next++]!;
        if(code==="s")output+=String(value);
        else if(code==="j"){
            if(typeof value==="bigint")return null;
            output+=value===undefined?"undefined":JSON.stringify(value);
        }else{
            if(typeof value==="bigint")return null;
            const numeric=number(value);
            if(Number.isNaN(numeric))output+="NaN";
            else if(code==="f")output+=String(numeric);
            else{
                if(!Number.isFinite(numeric)||numeric>=2**63||numeric<-(2**63))return null;
                output+=BigInt(Math.trunc(numeric)).toString();
            }
        }
    }
    for(;next<values.length;next++)output+=(format!==null||next>0?" ":"")+String(values[next]);
    return output;
}
