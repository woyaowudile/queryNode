let count = 0

function getModelLengthData(data, start = 0, leng = 1) {
    // 如果数量不满足模型，则退出
    let maxLength = start + leng;
    if (maxLength > data.length) return [];
    let results = data.slice(start, start + leng);
    return results;
}
function entity(data) {
    // 实体
    if (!data) return;
    let { o, c } = data;
    return Math.abs(o - c);
}
function YingYang(data) {
    if (!data) return;
    // ying1， yang2，shizixing3
    let { o, c } = data;
    if (c < o) {
        return 1;
    } else if (c > o) {
        return 2;
    } else {
        return 3;
    }
}
function lohc(d1, d2) {
    return d2.o < d1.c && d2.c > d1.c;
}
function zdf(data) {
    // 大于 2% 中阳线
    let current = data[data.length - 1];
    let pre = data[data.length - 2];
    return ((current.c - pre.c) / pre.c) * 100;
}

const all = {
    isKlyh({ data, start, results, code }) {
        let [d1, d2, d3] = getModelLengthData(data, start, 3);
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 2) return;
        if (!(d1.c > d2.o)) return;
        // 怎么算小？怎么算大？
        if (entity(d1) >= entity(d2)) return;
        if (YingYang(d3) !== 1) return;
        // 3相对于2要低开高收
        if (!lohc(d2, d3)) return;
        // return [d1, d2, d3];
        results.push([ code, d1.d, '亢龙有悔' ]);
        console.log(`${code}亢龙有悔`, d1.d, `累计 ${++count} 次`);
    },
    isYjsd({ data, start, results, code }) {
        /**
         * 1阳 ；2、3阴；4阳
         * 2、3不能跌破1的实体
         * 4要比前3个实体都高
         */
        let [d1, d2, d3, d4] = getModelLengthData(data, start, 4);
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        // 2和3的开盘价都要在1的开盘价之上，即不能跌破1的实体
        if (!(d2.c > d1.o && d3.c > d1.o)) return;
        if (YingYang(d4) !== 2) return;
        // 4的收盘价要比前3个都高
        if (!(d4.c > d3.o && d4.c > d2.o && d4.c > d1.c)) return;
        // return [d1, d2, d3, d4];
        results.push([ code, d1.d, '一箭双雕' ]);
        console.log(`${code}一箭双雕`, d1.d, `累计 ${++count} 次`);
    },
    isQx1({ data, start, results, code }) {
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let [d1, d2, d3, d4, d5, d6, d7] = getModelLengthData(data, start, 7);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 2) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        // return [d1, d2, d3, d4, d5, d6, d7];
        results.push([ code, d1.d, '七星一' ]);
        console.log(`${code}七星一`, d1.d, `累计 ${++count} 次`);
    },
    isQx2({ data, start, results, code }) {
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let [d1, d2, d3, d4, d5, d6, d7] = getModelLengthData(data, start, 7);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 1) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        // return [d1, d2, d3, d4, d5, d6, d7];
        results.push([ code, d1.d, '七星二' ]);
        console.log(`${code}七星二`, d1.d, `累计 ${++count} 次`);
    },
    isFkwz({ data, start, results, code }) {
        let [d1, d2] = getModelLengthData(data, start, 2);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (!(d2.o > d1.c && d2.c > d1.o)) return;
        // return true;
        results.push([ code, d1.d, '反客为主' ]);
        console.log(`${code}反客为主`, d1.d, `累计 ${++count} 次`);
    },
    isYydl({ data, start, results, code }) {
        let [d1, d2, d3, d4, d5] = getModelLengthData(data, start, 5);
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 1) return;
        if (d1.v < d2.v) return;
        if (YingYang(d3) !== 1) return;
        if (d2.v < d3.v || d2.h < d3.h || d2.l < d3.l) return;
        if (YingYang(d4) !== 1) return;
        if (d3.v < d4.v || d3.h < d4.h || d3.l < d4.l) return;
        if (YingYang(d5) !== 2) return;
        // return true;
        results.push([ code, d1.d, '以逸待劳' ]);
        console.log(`${code}以逸待劳`, d1.d, `累计 ${++count} 次`);
    },
    isCsfr({ data, start, results, code }) {
        let [d1, d2] = getModelLengthData(data, start, 2);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (!(d2.h > d1.h && d2.l > d1.l && d2.c > d1.o)) return;
        // return true;
        results.push([ code, d1.d, '出水芙蓉' ]);
        console.log(`${code}出水芙蓉`, d1.d, `累计 ${++count} 次`);
    },
    isGsdn({ data, start, results, code }) {
        let [d1, d2, d3, d4, d5] = getModelLengthData(data, start, 5);
        if (!d1) return;
        // 大于2%算是中阳线
        if (zdf([d1, d2]) < 2) return;
        if (!(d2.v > d1.v)) return;
        if (!(d3.c > d2.o && d4.c > d2.o && d5.c > d2.o)) return;
        if (!(d3.v < d2.v && d4.v < d2.v && d5.v < d2.v)) return;
        // return [d2, d3, d4, d5];
        results.push([ code, d1.d, '隔山打牛' ]);
        console.log(`${code}隔山打牛`, d1.d, `累计 ${++count} 次`);
    },
    isDY({ data, start, results, code }) {
        let [d1, d2, d3, d4, d5, d6] = getModelLengthData(data, start, 6);
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 2) return;
        if (YingYang(d3) !== 2) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 1) return;
        if (YingYang(d6) !== 2) return;
        if (!(d6.c > d1.c && d6.c > d2.c && d6.c > d3.c && d6.c > d4.c && d6.c > d5.o)) return;
        // return [d1, d2, d3, d4, d5, d6];
        results.push([ code, d1.d, '大有' ]);
        console.log(`${code}大有`, d1.d, `累计 ${++count} 次`);
    },
    YingYang(data) {
        if (!data) return;
        // ying1， yang2，shizixing3
        let { o, c } = data;
        if (c < o) {
            return 1;
        } else if (c > o) {
            return 2;
        } else {
            return 3;
        }
    }
};

// export default all;

// export { YingYang };

exports.all = {
    ...all
}