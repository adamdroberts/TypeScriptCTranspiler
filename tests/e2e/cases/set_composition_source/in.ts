export {};let total=0;for(const source of new Set(['17;','19;']).union(new Set(['19;','23;'])))total+=Number(eval(source));console.log('composition source:',total===59);
