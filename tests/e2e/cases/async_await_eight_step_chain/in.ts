import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    const one = await delay(1, "1");
    var switchMarker, switchLabel;
    switchMarker = "";
    switchLabel = one;
    switch (one) {
        case "never":
            switchMarker = "x";
            break;
        default:
            switchMarker = "";
            break;
    }
    var loopMarker;
    loopMarker = "x";
    while (loopMarker.length > 0) {
        loopMarker = "";
    }
    do {
        loopMarker = "";
    } while (loopMarker.length > 0);
    for (let index = 0; index < 1; index++) {
        loopMarker = "";
    }
    for (const item of [one]) {
        loopMarker = item;
    }
    for (const key in [one]) {
        loopMarker = key;
    }
    try {
        loopMarker = "";
    } finally {
        loopMarker = one;
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    } finally {
        loopMarker = one;
    }
    if (one.length < 0) {
        var branchMarker;
        branchMarker = "never";
        loopMarker = branchMarker;
    } else {
        var branchMarker;
        branchMarker = one;
        loopMarker = branchMarker;
    }
    const two = await delay(2, one + "2" + (loopMarker === one ? "" : ""));
    const three = await delay(3, two + "3");
    const four = await delay(4, three + "4");
    const five = await delay(5, four + "5");
    const six = await delay(6, five + "6");
    const seven = await delay(7, six + "7");
    const eight = await delay(8, seven + "8");
    const nine = await delay(9, eight + "9");
    const ten = await delay(10, nine + "0");
    const eleven = await delay(11, ten + "1");
    const twelve = await delay(12, eleven + "2");
    const thirteen = await delay(13, twelve + "3");
    const fourteen = await delay(14, thirteen + "4");
    const fifteen = await delay(15, fourteen + "5");
    const sixteen = await delay(16, fifteen + "6");
    const seventeen = await delay(17, sixteen + "7");
    const eighteen = await delay(18, seventeen + "8");
    const nineteen = await delay(19, eighteen + "9");
    const twenty = await delay(20, nineteen + "0");
    const twentyOne = await delay(21, twenty + "1");
    const twentyTwo = await delay(22, twentyOne + "2");
    const twentyThree = await delay(23, twentyTwo + "3");
    const twentyFour = await delay(24, twentyThree + "4");
    const twentyFive = await delay(25, twentyFour + "5");
    const twentySix = await delay(26, twentyFive + "6");
    const twentySeven = await delay(27, twentySix + "7");
    const twentyEight = await delay(28, twentySeven + "8");
    return twentyEight;
}

class Chain {
    async method(): Promise<string> {
        const one = await delay(1, "a");
        var switchMarker, switchLabel;
        switchMarker = "";
        switchLabel = one;
        switch (one) {
            case "never":
                switchMarker = "x";
                break;
            default:
                switchMarker = "";
                break;
        }
        var loopMarker;
        loopMarker = "x";
        while (loopMarker.length > 0) {
            loopMarker = "";
        }
        do {
            loopMarker = "";
        } while (loopMarker.length > 0);
        for (let index = 0; index < 1; index++) {
            loopMarker = "";
        }
        for (const item of [one]) {
            loopMarker = item;
        }
        for (const key in [one]) {
            loopMarker = key;
        }
        try {
            loopMarker = "";
        } finally {
            loopMarker = one;
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        } finally {
            loopMarker = one;
        }
        if (one.length < 0) {
            var branchMarker;
            branchMarker = "never";
            loopMarker = branchMarker;
        } else {
            var branchMarker;
            branchMarker = one;
            loopMarker = branchMarker;
        }
        const two = await delay(2, one + "b" + (loopMarker === one ? "" : ""));
        const three = await delay(3, two + "c");
        const four = await delay(4, three + "d");
        const five = await delay(5, four + "e");
        const six = await delay(6, five + "f");
        const seven = await delay(7, six + "g");
        const eight = await delay(8, seven + "h");
        const nine = await delay(9, eight + "i");
        const ten = await delay(10, nine + "j");
        const eleven = await delay(11, ten + "k");
        const twelve = await delay(12, eleven + "l");
        const thirteen = await delay(13, twelve + "m");
        const fourteen = await delay(14, thirteen + "n");
        const fifteen = await delay(15, fourteen + "o");
        const sixteen = await delay(16, fifteen + "p");
        const seventeen = await delay(17, sixteen + "q");
        const eighteen = await delay(18, seventeen + "r");
        const nineteen = await delay(19, eighteen + "s");
        const twenty = await delay(20, nineteen + "t");
        const twentyOne = await delay(21, twenty + "u");
        const twentyTwo = await delay(22, twentyOne + "v");
        const twentyThree = await delay(23, twentyTwo + "w");
        const twentyFour = await delay(24, twentyThree + "x");
        const twentyFive = await delay(25, twentyFour + "y");
        const twentySix = await delay(26, twentyFive + "z");
        const twentySeven = await delay(27, twentySix + "0");
        const twentyEight = await delay(28, twentySeven + "1");
        return twentyEight;
    }
}

const value = async (): Promise<string> => {
    const one = await delay(1, "A");
    var switchMarker, switchLabel;
    switchMarker = "";
    switchLabel = one;
    switch (one) {
        case "never":
            switchMarker = "X";
            break;
        default:
            switchMarker = "";
            break;
    }
    var loopMarker;
    loopMarker = "x";
    while (loopMarker.length > 0) {
        loopMarker = "";
    }
    do {
        loopMarker = "";
    } while (loopMarker.length > 0);
    for (let index = 0; index < 1; index++) {
        loopMarker = "";
    }
    for (const item of [one]) {
        loopMarker = item;
    }
    for (const key in [one]) {
        loopMarker = key;
    }
    try {
        loopMarker = "";
    } finally {
        loopMarker = one;
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    } finally {
        loopMarker = one;
    }
    if (one.length < 0) {
        var branchMarker;
        branchMarker = "never";
        loopMarker = branchMarker;
    } else {
        var branchMarker;
        branchMarker = one;
        loopMarker = branchMarker;
    }
    const two = await delay(2, one + "B" + (loopMarker === one ? "" : ""));
    const three = await delay(3, two + "C");
    const four = await delay(4, three + "D");
    const five = await delay(5, four + "E");
    const six = await delay(6, five + "F");
    const seven = await delay(7, six + "G");
    const eight = await delay(8, seven + "H");
    const nine = await delay(9, eight + "I");
    const ten = await delay(10, nine + "J");
    const eleven = await delay(11, ten + "K");
    const twelve = await delay(12, eleven + "L");
    const thirteen = await delay(13, twelve + "M");
    const fourteen = await delay(14, thirteen + "N");
    const fifteen = await delay(15, fourteen + "O");
    const sixteen = await delay(16, fifteen + "P");
    const seventeen = await delay(17, sixteen + "Q");
    const eighteen = await delay(18, seventeen + "R");
    const nineteen = await delay(19, eighteen + "S");
    const twenty = await delay(20, nineteen + "T");
    const twentyOne = await delay(21, twenty + "U");
    const twentyTwo = await delay(22, twentyOne + "V");
    const twentyThree = await delay(23, twentyTwo + "W");
    const twentyFour = await delay(24, twentyThree + "X");
    const twentyFive = await delay(25, twentyFour + "Y");
    const twentySix = await delay(26, twentyFive + "Z");
    const twentySeven = await delay(27, twentySix + "0");
    const twentyEight = await delay(28, twentySeven + "1");
    return twentyEight;
};

async function branchEight(flag: boolean): Promise<string> {
    if (flag) {
        const one = await delay(21, "b");
        var switchMarker, switchLabel;
        switchMarker = "";
        switchLabel = one;
        switch (one) {
            case "never":
                switchMarker = "x";
                break;
            default:
                switchMarker = "";
                break;
        }
        var loopMarker;
        loopMarker = "x";
        while (loopMarker.length > 0) {
            loopMarker = "";
        }
        do {
            loopMarker = "";
        } while (loopMarker.length > 0);
        for (let index = 0; index < 1; index++) {
            loopMarker = "";
        }
        for (const item of [one]) {
            loopMarker = item;
        }
        for (const key in [one]) {
            loopMarker = key;
        }
        try {
            loopMarker = "";
        } finally {
            loopMarker = one;
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        } finally {
            loopMarker = one;
        }
        if (one.length < 0) {
            var branchMarker;
            branchMarker = "never";
            loopMarker = branchMarker;
        } else {
            var branchMarker;
            branchMarker = one;
            loopMarker = branchMarker;
        }
        const two = await delay(22, one + "1" + (loopMarker === one ? "" : ""));
        const three = await delay(23, two + "2");
        const four = await delay(24, three + "3");
        const five = await delay(25, four + "4");
        const six = await delay(26, five + "5");
        const seven = await delay(27, six + "6");
        const eight = await delay(28, seven + "7");
        const nine = await delay(29, eight + "8");
        const ten = await delay(30, nine + "9");
        const eleven = await delay(31, ten + "0");
        const twelve = await delay(32, eleven + "1");
        const thirteen = await delay(33, twelve + "2");
        const fourteen = await delay(34, thirteen + "3");
        const fifteen = await delay(35, fourteen + "4");
        const sixteen = await delay(36, fifteen + "5");
        const seventeen = await delay(37, sixteen + "6");
        const eighteen = await delay(38, seventeen + "7");
        const nineteen = await delay(39, eighteen + "8");
        const twenty = await delay(40, nineteen + "9");
        const twentyOne = await delay(41, twenty + "0");
        const twentyTwo = await delay(42, twentyOne + "1");
        const twentyThree = await delay(43, twentyTwo + "2");
        const twentyFour = await delay(44, twentyThree + "3");
        const twentyFive = await delay(45, twentyFour + "4");
        const twentySix = await delay(46, twentyFive + "5");
        const twentySeven = await delay(47, twentySix + "6");
        const twentyEight = await delay(48, twentySeven + "7");
        return twentyEight;
    }
    const one = await delay(29, "f");
    var switchMarker, switchLabel;
    switchMarker = "";
    switchLabel = one;
    switch (one) {
        case "never":
            switchMarker = "x";
            break;
        default:
            switchMarker = "";
            break;
    }
    var loopMarker;
    loopMarker = "x";
    while (loopMarker.length > 0) {
        loopMarker = "";
    }
    do {
        loopMarker = "";
    } while (loopMarker.length > 0);
    for (let index = 0; index < 1; index++) {
        loopMarker = "";
    }
    for (const item of [one]) {
        loopMarker = item;
    }
    for (const key in [one]) {
        loopMarker = key;
    }
    try {
        loopMarker = "";
    } finally {
        loopMarker = one;
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    } finally {
        loopMarker = one;
    }
    if (one.length < 0) {
        var branchMarker;
        branchMarker = "never";
        loopMarker = branchMarker;
    } else {
        var branchMarker;
        branchMarker = one;
        loopMarker = branchMarker;
    }
    const two = await delay(30, one + "1" + (loopMarker === one ? "" : ""));
    const three = await delay(31, two + "2");
    const four = await delay(32, three + "3");
    const five = await delay(33, four + "4");
    const six = await delay(34, five + "5");
    const seven = await delay(35, six + "6");
    const eight = await delay(36, seven + "7");
    const nine = await delay(37, eight + "8");
    const ten = await delay(38, nine + "9");
    const eleven = await delay(39, ten + "0");
    const twelve = await delay(40, eleven + "1");
    const thirteen = await delay(41, twelve + "2");
    const fourteen = await delay(42, thirteen + "3");
    const fifteen = await delay(43, fourteen + "4");
    const sixteen = await delay(44, fifteen + "5");
    const seventeen = await delay(45, sixteen + "6");
    const eighteen = await delay(46, seventeen + "7");
    const nineteen = await delay(47, eighteen + "8");
    const twenty = await delay(48, nineteen + "9");
    const twentyOne = await delay(49, twenty + "0");
    const twentyTwo = await delay(50, twentyOne + "1");
    const twentyThree = await delay(51, twentyTwo + "2");
    const twentyFour = await delay(52, twentyThree + "3");
    const twentyFive = await delay(53, twentyFour + "4");
    const twentySix = await delay(54, twentyFive + "5");
    const twentySeven = await delay(55, twentySix + "6");
    const twentyEight = await delay(56, twentySeven + "7");
    return twentyEight;
}

class BranchChain {
    async method(flag: boolean): Promise<string> {
        if (flag) {
            const one = await delay(37, "m");
            var switchMarker, switchLabel;
            switchMarker = "";
            switchLabel = one;
            switch (one) {
                case "never":
                    switchMarker = "x";
                    break;
                default:
                    switchMarker = "";
                    break;
            }
            var loopMarker;
            loopMarker = "x";
            while (loopMarker.length > 0) {
                loopMarker = "";
            }
            do {
                loopMarker = "";
            } while (loopMarker.length > 0);
            for (let index = 0; index < 1; index++) {
                loopMarker = "";
            }
            for (const item of [one]) {
                loopMarker = item;
            }
            for (const key in [one]) {
                loopMarker = key;
            }
            try {
                loopMarker = "";
            } finally {
                loopMarker = one;
            }
            try {
                if (one.length < 0) throw one;
                loopMarker = "";
            } catch (error) {
                loopMarker = String(error);
            }
            try {
                if (one.length < 0) throw one;
                loopMarker = "";
            } catch (error) {
                loopMarker = String(error);
            } finally {
                loopMarker = one;
            }
            if (one.length < 0) {
                var branchMarker;
                branchMarker = "never";
                loopMarker = branchMarker;
            } else {
                var branchMarker;
                branchMarker = one;
                loopMarker = branchMarker;
            }
            const two = await delay(38, one + "1" + (loopMarker === one ? "" : ""));
            const three = await delay(39, two + "2");
            const four = await delay(40, three + "3");
            const five = await delay(41, four + "4");
            const six = await delay(42, five + "5");
            const seven = await delay(43, six + "6");
            const eight = await delay(44, seven + "7");
            const nine = await delay(45, eight + "8");
            const ten = await delay(46, nine + "9");
            const eleven = await delay(47, ten + "0");
            const twelve = await delay(48, eleven + "1");
            const thirteen = await delay(49, twelve + "2");
            const fourteen = await delay(50, thirteen + "3");
            const fifteen = await delay(51, fourteen + "4");
            const sixteen = await delay(52, fifteen + "5");
            const seventeen = await delay(53, sixteen + "6");
            const eighteen = await delay(54, seventeen + "7");
            const nineteen = await delay(55, eighteen + "8");
            const twenty = await delay(56, nineteen + "9");
            const twentyOne = await delay(57, twenty + "0");
            const twentyTwo = await delay(58, twentyOne + "1");
            const twentyThree = await delay(59, twentyTwo + "2");
            const twentyFour = await delay(60, twentyThree + "3");
            const twentyFive = await delay(61, twentyFour + "4");
            const twentySix = await delay(62, twentyFive + "5");
            const twentySeven = await delay(63, twentySix + "6");
            const twentyEight = await delay(64, twentySeven + "7");
            return twentyEight;
        }
        const one = await delay(45, "n");
        var switchMarker, switchLabel;
        switchMarker = "";
        switchLabel = one;
        switch (one) {
            case "never":
                switchMarker = "x";
                break;
            default:
                switchMarker = "";
                break;
        }
        var loopMarker;
        loopMarker = "x";
        while (loopMarker.length > 0) {
            loopMarker = "";
        }
        do {
            loopMarker = "";
        } while (loopMarker.length > 0);
        for (let index = 0; index < 1; index++) {
            loopMarker = "";
        }
        for (const item of [one]) {
            loopMarker = item;
        }
        for (const key in [one]) {
            loopMarker = key;
        }
        try {
            loopMarker = "";
        } finally {
            loopMarker = one;
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        } finally {
            loopMarker = one;
        }
        if (one.length < 0) {
            var branchMarker;
            branchMarker = "never";
            loopMarker = branchMarker;
        } else {
            var branchMarker;
            branchMarker = one;
            loopMarker = branchMarker;
        }
        const two = await delay(46, one + "1" + (loopMarker === one ? "" : ""));
        const three = await delay(47, two + "2");
        const four = await delay(48, three + "3");
        const five = await delay(49, four + "4");
        const six = await delay(50, five + "5");
        const seven = await delay(51, six + "6");
        const eight = await delay(52, seven + "7");
        const nine = await delay(53, eight + "8");
        const ten = await delay(54, nine + "9");
        const eleven = await delay(55, ten + "0");
        const twelve = await delay(56, eleven + "1");
        const thirteen = await delay(57, twelve + "2");
        const fourteen = await delay(58, thirteen + "3");
        const fifteen = await delay(59, fourteen + "4");
        const sixteen = await delay(60, fifteen + "5");
        const seventeen = await delay(61, sixteen + "6");
        const eighteen = await delay(62, seventeen + "7");
        const nineteen = await delay(63, eighteen + "8");
        const twenty = await delay(64, nineteen + "9");
        const twentyOne = await delay(65, twenty + "0");
        const twentyTwo = await delay(66, twentyOne + "1");
        const twentyThree = await delay(67, twentyTwo + "2");
        const twentyFour = await delay(68, twentyThree + "3");
        const twentyFive = await delay(69, twentyFour + "4");
        const twentySix = await delay(70, twentyFive + "5");
        const twentySeven = await delay(71, twentySix + "6");
        const twentyEight = await delay(72, twentySeven + "7");
        return twentyEight;
    }
}

const branchValue = async (flag: boolean): Promise<string> => {
    if (flag) {
        const one = await delay(53, "v");
        var switchMarker, switchLabel;
        switchMarker = "";
        switchLabel = one;
        switch (one) {
            case "never":
                switchMarker = "x";
                break;
            default:
                switchMarker = "";
                break;
        }
        var loopMarker;
        loopMarker = "x";
        while (loopMarker.length > 0) {
            loopMarker = "";
        }
        do {
            loopMarker = "";
        } while (loopMarker.length > 0);
        for (let index = 0; index < 1; index++) {
            loopMarker = "";
        }
        for (const item of [one]) {
            loopMarker = item;
        }
        for (const key in [one]) {
            loopMarker = key;
        }
        try {
            loopMarker = "";
        } finally {
            loopMarker = one;
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        }
        try {
            if (one.length < 0) throw one;
            loopMarker = "";
        } catch (error) {
            loopMarker = String(error);
        } finally {
            loopMarker = one;
        }
        if (one.length < 0) {
            var branchMarker;
            branchMarker = "never";
            loopMarker = branchMarker;
        } else {
            var branchMarker;
            branchMarker = one;
            loopMarker = branchMarker;
        }
        const two = await delay(54, one + "1" + (loopMarker === one ? "" : ""));
        const three = await delay(55, two + "2");
        const four = await delay(56, three + "3");
        const five = await delay(57, four + "4");
        const six = await delay(58, five + "5");
        const seven = await delay(59, six + "6");
        const eight = await delay(60, seven + "7");
        const nine = await delay(61, eight + "8");
        const ten = await delay(62, nine + "9");
        const eleven = await delay(63, ten + "0");
        const twelve = await delay(64, eleven + "1");
        const thirteen = await delay(65, twelve + "2");
        const fourteen = await delay(66, thirteen + "3");
        const fifteen = await delay(67, fourteen + "4");
        const sixteen = await delay(68, fifteen + "5");
        const seventeen = await delay(69, sixteen + "6");
        const eighteen = await delay(70, seventeen + "7");
        const nineteen = await delay(71, eighteen + "8");
        const twenty = await delay(72, nineteen + "9");
        const twentyOne = await delay(73, twenty + "0");
        const twentyTwo = await delay(74, twentyOne + "1");
        const twentyThree = await delay(75, twentyTwo + "2");
        const twentyFour = await delay(76, twentyThree + "3");
        const twentyFive = await delay(77, twentyFour + "4");
        const twentySix = await delay(78, twentyFive + "5");
        const twentySeven = await delay(79, twentySix + "6");
        const twentyEight = await delay(80, twentySeven + "7");
        return twentyEight;
    }
    const one = await delay(61, "x");
    var switchMarker, switchLabel;
    switchMarker = "";
    switchLabel = one;
    switch (one) {
        case "never":
            switchMarker = "x";
            break;
        default:
            switchMarker = "";
            break;
    }
    var loopMarker;
    loopMarker = "x";
    while (loopMarker.length > 0) {
        loopMarker = "";
    }
    do {
        loopMarker = "";
    } while (loopMarker.length > 0);
    for (let index = 0; index < 1; index++) {
        loopMarker = "";
    }
    for (const item of [one]) {
        loopMarker = item;
    }
    for (const key in [one]) {
        loopMarker = key;
    }
    try {
        loopMarker = "";
    } finally {
        loopMarker = one;
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    }
    try {
        if (one.length < 0) throw one;
        loopMarker = "";
    } catch (error) {
        loopMarker = String(error);
    } finally {
        loopMarker = one;
    }
    if (one.length < 0) {
        var branchMarker;
        branchMarker = "never";
        loopMarker = branchMarker;
    } else {
        var branchMarker;
        branchMarker = one;
        loopMarker = branchMarker;
    }
    const two = await delay(62, one + "1" + (loopMarker === one ? "" : ""));
    const three = await delay(63, two + "2");
    const four = await delay(64, three + "3");
    const five = await delay(65, four + "4");
    const six = await delay(66, five + "5");
    const seven = await delay(67, six + "6");
    const eight = await delay(68, seven + "7");
    const nine = await delay(69, eight + "8");
    const ten = await delay(70, nine + "9");
    const eleven = await delay(71, ten + "0");
    const twelve = await delay(72, eleven + "1");
    const thirteen = await delay(73, twelve + "2");
    const fourteen = await delay(74, thirteen + "3");
    const fifteen = await delay(75, fourteen + "4");
    const sixteen = await delay(76, fifteen + "5");
    const seventeen = await delay(77, sixteen + "6");
    const eighteen = await delay(78, seventeen + "7");
    const nineteen = await delay(79, eighteen + "8");
    const twenty = await delay(80, nineteen + "9");
    const twentyOne = await delay(81, twenty + "0");
    const twentyTwo = await delay(82, twentyOne + "1");
    const twentyThree = await delay(83, twentyTwo + "2");
    const twentyFour = await delay(84, twentyThree + "3");
    const twentyFive = await delay(85, twentyFour + "4");
    const twentySix = await delay(86, twentyFive + "5");
    const twentySeven = await delay(87, twentySix + "6");
    const twentyEight = await delay(88, twentySeven + "7");
    return twentyEight;
};

declaration().then((result) => console.log("declaration:", result));
new Chain().method().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
branchEight(true).then((result) => console.log("branch-true:", result));
branchEight(false).then((result) => console.log("branch-false:", result));
new BranchChain().method(true).then((result) => console.log("method-branch-true:", result));
new BranchChain().method(false).then((result) => console.log("method-branch-false:", result));
branchValue(true).then((result) => console.log("value-branch-true:", result));
branchValue(false).then((result) => console.log("value-branch-false:", result));
