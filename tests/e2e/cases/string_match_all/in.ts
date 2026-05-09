const matches = "a1 b22 c333".matchAll(/([a-z])(\d+)/g);
console.log("count:", matches.length);

for (const match of matches) {
    console.log(match[0], match[1], match[2]);
}

const none = "abc".matchAll(/z(\d+)/g);
console.log("none:", none.length);
