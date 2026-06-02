function* ops(): Generator<any, string, any> {
    const deleted = delete (yield "object").drop;
    console.log("delete:", deleted);

    const oldCount = (yield "counter").count++;
    console.log("post-prop:", oldCount);

    const oldIndex = (yield "array")[1]--;
    console.log("post-index:", oldIndex);

    const nextCount = ++(yield "prefix-counter").count;
    console.log("prefix-prop:", nextCount);

    const nextIndex = --(yield "prefix-array")[1];
    console.log("prefix-index:", nextIndex);

    return "done";
}

const obj: any = { drop: "x", keep: "y" };
const counter: any = { count: 4 };
const arr: any = [10, 20, 30];
const prefixCounter: any = { count: 7 };
const prefixArr: any = [3, 4, 5];

const g = ops();
console.log("next1:", JSON.stringify(g.next()));
console.log("next2:", JSON.stringify(g.next(obj)), "drop" in obj, obj.keep);
console.log("next3:", JSON.stringify(g.next(counter)), counter.count);
console.log("next4:", JSON.stringify(g.next(arr)), arr.join(","));
console.log("next5:", JSON.stringify(g.next(prefixCounter)), prefixCounter.count);
console.log("next6:", JSON.stringify(g.next(prefixArr)), prefixArr.join(","));
