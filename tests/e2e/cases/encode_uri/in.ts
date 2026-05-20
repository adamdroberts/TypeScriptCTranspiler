const uri = "https://example.com/a path/with spaces?query=some value#hash";
const encodedURI = encodeURI(uri);
console.log(encodedURI);
console.log(decodeURI(encodedURI));

const comp = "some value with / and ? and & and =";
const encodedComp = encodeURIComponent(comp);
console.log(encodedComp);
console.log(decodeURIComponent(encodedComp));

console.log(encodeURI("a b c"));
console.log(encodeURIComponent("a b c"));

console.log(decodeURI("%20%2A%2B"));
console.log(decodeURIComponent("%20%2A%2B"));
