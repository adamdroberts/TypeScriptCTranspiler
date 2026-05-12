const re = /([a-z]+)-(\d+)/;
const hit = re.exec("id abc-42 done");

if (hit !== null) {
    console.log("len:", hit.length);
    console.log("full:", hit[0]);
    console.log("word:", hit[1]);
    console.log("num:", hit[2]);
}

const none = re.exec("no digits here");
console.log("none:", none === null);
