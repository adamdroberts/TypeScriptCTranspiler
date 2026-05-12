const typed = [NaN, 0, -0, 2];
console.log("typed includes:", typed.includes(NaN), typed.indexOf(NaN), typed.includes(-0), typed.indexOf(-0));

const dynamic: any = [NaN, 0, -0, 2];
console.log("dynamic includes:", dynamic.includes(NaN), dynamic.indexOf(NaN), dynamic.includes(-0), dynamic.indexOf(-0));

console.log("from:", typed.includes(NaN, 1), dynamic.includes(NaN, 1));
