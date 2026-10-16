/** Drain an arbitrary finite product without materializing its intermediate
 * prefixes. An empty operand has no tuples; an empty List has one tuple. */
export function* sourceChoiceTuples<T>(parts:readonly (readonly T[])[]):IterableIterator<T[]> {
    if(parts.some(values=>!values.length))return;
    const positions=parts.map(()=>0);
    for(;;){
        yield parts.map((values,index)=>values[positions[index]!]!);
        let index=parts.length-1;
        while(index>=0){positions[index]=positions[index]!+1;if(positions[index]!<parts[index]!.length)break;positions[index]=0;index--;}
        if(index<0)return;
    }
}
