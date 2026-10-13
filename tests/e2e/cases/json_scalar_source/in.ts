const jsonScalarState = { source: '17;' };
let jsonScalarValue = 0;
for (let index = 0; index < 7; index++) jsonScalarValue++;
console.log('scalar:', JSON.stringify(jsonScalarValue), eval(jsonScalarState.source));
console.log('container:', JSON.stringify({ value: jsonScalarValue }), eval(jsonScalarState.source));
