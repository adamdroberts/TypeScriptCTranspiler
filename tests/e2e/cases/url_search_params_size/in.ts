import { URLSearchParams as NodeURLSearchParams } from "node:url";

// 1. Constructor tests
const params1 = new URLSearchParams();
console.log("empty size:", params1.size);

const params2 = new URLSearchParams("a=1&b=2&a=3");
console.log("initial size:", params2.size); // should be 3

const nodeParams = new NodeURLSearchParams("?x=10&y=20");
console.log("node initial size:", nodeParams.size); // should be 2

// 2. Append tests
params2.append("c", "4");
console.log("after append size:", params2.size); // should be 4

params2.append("a", "5");
console.log("after append duplicate size:", params2.size); // should be 5

// 3. Set tests
// Set existing key 'b' (exists once)
params2.set("b", "changed");
console.log("after set existing size:", params2.size); // should be 5 (keeps count, no duplicates for 'b')

// Set existing key 'a' (has duplicates '1', '3', '5')
params2.set("a", "single");
console.log("after set duplicate size:", params2.size); // should be 3 (duplicates removed, 'a' occurs once)

// Set non-existing key
params2.set("d", "new");
console.log("after set new size:", params2.size); // should be 4

// 4. Delete tests
// Delete non-existing key
params2.delete("nonexistent");
console.log("after delete nonexistent size:", params2.size); // should be 4

// Delete key 'd'
params2.delete("d");
console.log("after delete size:", params2.size); // should be 3

// 5. Sort tests
params2.sort();
console.log("after sort size:", params2.size); // should be 3

// 6. URL searchParams integration
const url = new URL("https://example.com/path?foo=bar&baz=qux");
console.log("url searchParams size:", url.searchParams.size); // should be 2
const sp = url.searchParams;
sp.append("new", "val");
console.log("saved searchParams size after append:", sp.size); // should be 3
