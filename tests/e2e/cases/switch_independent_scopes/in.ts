let result = "";
switch (0) {
    case 0:
        let value = "outer";
        switch (1) { default: let value = "inner"; result += value; }
        result += ":" + value;
}
console.log(result);
