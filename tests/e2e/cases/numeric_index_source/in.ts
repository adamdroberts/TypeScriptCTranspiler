const bodies = ["17;", "19;"];
let index = 0;
while (index < 3) console.log("array:", eval(bodies[index++]));

const inherited: any = { __proto__: { "-1": "23;" }, 0: "29;" };
let offset = 0;
while (offset < 3) console.log("inherited:", eval(inherited[-offset++]));
