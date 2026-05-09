const date = "date=2026-05-09";
const parts = date.match(/date=(\d+)-(\d+)-(\d+)/);
if (parts !== null) {
    console.log("capture len:", parts.length);
    console.log("full:", parts[0]);
    console.log("year:", parts[1]);
    console.log("month:", parts[2]);
    console.log("day:", parts[3]);
}

const global = "x=1 y=2".match(/\w=\d/g);
if (global !== null) {
    console.log("global:", global.join("|"));
}
