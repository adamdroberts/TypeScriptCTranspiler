import { EventEmitter, on } from "node:events";

async function consume(iterator: any): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        const first = item[0];
        await Promise.resolve(first);
        let second: string;
        second = first + "-second";
        await Promise.resolve(second);
        const third = second + "-third";
        await Promise.resolve(third);
        const fourth = third + "-fourth";
        await Promise.resolve(fourth);
        const fifth = fourth + "-fifth";
        await Promise.resolve(fifth);
        const sixth = fifth + "-sixth";
        await Promise.resolve(sixth);
        const seventh = sixth + "-seventh";
        await Promise.resolve(seventh);
        const eighth = seventh + "-eighth";
        await Promise.resolve(eighth);
        const ninth = eighth + "-ninth";
        await Promise.resolve(ninth);
        const tenth = ninth + "-tenth";
        await Promise.resolve(tenth);
        const eleventh = tenth + "-eleventh";
        await Promise.resolve(eleventh);
        const twelfth = eleventh + "-twelfth";
        await Promise.resolve(twelfth);
        const thirteenth = twelfth + "-thirteenth";
        await Promise.resolve(thirteenth);
        const fourteenth = thirteenth + "-fourteenth";
        await Promise.resolve(fourteenth);
        const fifteenth = fourteenth + "-fifteenth";
        await Promise.resolve(fifteenth);
        const sixteenth = fifteenth + "-sixteenth";
        await Promise.resolve(sixteenth);
        const seventeenth = sixteenth + "-seventeenth";
        await Promise.resolve(seventeenth);
        const eighteenth = seventeenth + "-eighteenth";
        await Promise.resolve(eighteenth);
        const nineteenth = eighteenth + "-nineteenth";
        await Promise.resolve(nineteenth);
        const twentieth = nineteenth + "-twentieth";
        await Promise.resolve(twentieth);
        const twentyFirst = twentieth + "-twenty-first";
        await Promise.resolve(twentyFirst);
        const twentySecond = twentyFirst + "-twenty-second";
        await Promise.resolve(twentySecond);
        const twentyThird = twentySecond + "-twenty-third";
        await Promise.resolve(twentyThird);
        const twentyFourth = twentyThird + "-twenty-fourth";
        await Promise.resolve(twentyFourth);
        const twentyFifth = twentyFourth + "-twenty-fifth";
        await Promise.resolve(twentyFifth);
        const twentySixth = twentyFifth + "-twenty-sixth";
        await Promise.resolve(twentySixth);
        const twentySeventh = twentySixth + "-twenty-seventh";
        await Promise.resolve(twentySeventh);
        const twentyEighth = twentySeventh + "-twenty-eighth";
        await Promise.resolve(twentyEighth);
        const twentyNinth = twentyEighth + "-twenty-ninth";
        await Promise.resolve(twentyNinth);
        const thirtyFirst = twentyNinth + "-thirty-first";
        await Promise.resolve(thirtyFirst);
        const thirtySecond = thirtyFirst + "-thirty-second";
        await Promise.resolve(thirtySecond);
        const thirtyThird = thirtySecond + "-thirty-third";
        await Promise.resolve(thirtyThird);
        await Promise.reject("thirty-four-rejection");
        break;
    }
    return "unexpected-fulfillment";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
consume(iterator).then((value: string): void => {
    console.log("body-thirty-four-awaits-rejected: unexpected", value);
}, (reason: any): void => {
    console.log("body-thirty-four-awaits-rejected:", reason);
});
emitter.emit("data", "item");
