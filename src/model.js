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
    // 大于 2% 中阴阳线
    // 大于 4、5 % 大阴阳线
    let current = data[data.length - 1];
    let pre = data[data.length - 2];
    return ((current.c - pre.c) / pre.c) * 100;
}
// function ztb(data) {
//     let current = data[data.length - 1];
//     let pre = data[data.length - 2];
//     // 10%涨停(后一日的开盘一定是 前一日*1.1的值吗)
//     // (current.c * 1.1).toFixed(2)
//     let z = pre.c * 1.1
//     let d = pre.c * 0.9
//     return z <= current.c || d >= current.c
// }
function zf(data) {
    let current = data[data.length - 1];
    let pre = data[data.length - 2];
    let result = (current.h - current.l) / pre.c * 100
    return result.toFixed(2)
}
function MA(data, n) {
    let before = data.slice(-n)
    let count = before.map(level1 => level1.c).reduce((x, y) => x + y)
    return (count / n).toFixed(2) / 1
}

function buyDate(date, number) {
    let dd = new Date(date)
    dd.setDate(dd.getDate() + number)
    let day = dd.getDay()
    // 周末跳过
    switch(day) {
        case 6:
            dd = new Date(date)
            dd.setDate(dd.getDate() + number + 2)
            break;
        case 0:
            dd = new Date(date)
            dd.setDate(dd.getDate() + number + 1)
            break;
    }
    let y = dd.getFullYear();   
    let m = dd.getMonth()+1
    let d = dd.getDate()
    
    return y+"-"+m+"-"+d;   
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
        results.push([ code, d1.d, buyDate(d3.d, 1), '亢龙有悔' ]);
        console.log(`${code}亢龙有悔`, d1.d, `累计第 ${++count} 个`);
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
        if (!(d2.l > d1.o && d3.l > d1.o)) return;
        if (YingYang(d4) !== 2) return;
        // 4的收盘价要比前3个都高
        if (!(d4.c > d3.o && d4.c > d2.o && d4.c > d1.c)) return;
        // return [d1, d2, d3, d4];
        results.push([ code, d1.d, buyDate(d4.d, 1), '一箭双雕' ]);
        console.log(`${code}一箭双雕`, d1.d, `累计第 ${++count} 个`);
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
        results.push([ code, d1.d, buyDate(d7.d, 1), '七星一' ]);
        console.log(`${code}七星一`, d1.d, `累计第 ${++count} 个`);
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
        results.push([ code, d1.d, buyDate(d7.d, 1), '七星二' ]);
        console.log(`${code}七星二`, d1.d, `累计第 ${++count} 个`);
    },
    isFkwz({ data, start, results, code }) {
        let [d1, d2, d3] = getModelLengthData(data, start, 3);
        if (!d1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (!((zdf([d1, d2]) > 2) && (zdf([d2, d3]) > 2))) return
        if (!((d3.o > d2.c) && (d3.c > d2.o))) return;
        // return true;
        results.push([ code, d2.d, buyDate(d3.d, 1), '反客为主' ]);
        console.log(`${code}反客为主`, d2.d, `累计第 ${++count} 个`);
    },
    isYydl({ data, start, results, code }) {
        // 因为d5后的某一天要是阳线，但不确定是哪一天
        let datas = getModelLengthData(data, start, 10);
        let [d1, d2, d3, d4, d5] = datas
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 1) return;
        if (d1.v < d2.v) return;
        if (YingYang(d3) !== 1) return;
        if (d2.v < d3.v || d2.h < d3.h || d2.l < d3.l) return;
        if (YingYang(d4) !== 1) return;
        if (d3.v < d4.v || d3.h < d4.h || d3.l < d4.l) return;
        if (YingYang(d5) !== 2) return;
        for (let i = 5; i < datas.length; i++) {
            if (YingYang(datas[i]) === 2 && (datas[i].c > d5.c)) {
                results.push([ code, d1.d, buyDate(d5.d, 1), '以逸待劳' ]);
                console.log(`${code}以逸待劳`, d1.d, `累计第 ${++count} 个`);
            }
        }
    },
    isCsfr({ data, start, results, code }) {
        let [d1, d2] = getModelLengthData(data, start, 2);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (!((d2.h > d1.h) && (d2.l > d1.l) && (d2.c > d1.o))) return;
        // return true;
        results.push([ code, d1.d, buyDate(d2.d, 1), '出水芙蓉' ]);
        console.log(`${code}出水芙蓉`, d1.d, `累计第 ${++count} 个`);
    },
    isGsdn({ data, start, results, code }) {
        let [d1, d2, d3, d4, d5, d6] = getModelLengthData(data, start, 6);
        if (!d1) return;
        // 大于2%算是中阳线
        if (YingYang(d3) !== 2) return
        if (!((zdf([d2, d3]) > zdf([d1, d2])) && zdf([d2, d3]) >= 2)) return;
        if (!(d3.v > d2.v)) return;
        if (!(d4.c > d3.o && d5.c > d3.o && d6.c > d3.o)) return;
        if (!(d4.v < d3.v && d5.v < d3.v && d6.v < d3.v)) return;
        // return [d2, d3, d4, d5];
        results.push([ code, d3.d, buyDate(d6.d, 1), '隔山打牛' ]);
        console.log(`${code}隔山打牛`, d3.d, `累计第 ${++count} 个`);
        // 1. 上升趋势中，
        // 2. 是阶段的顶点不可买，如果有缺口可以
    },
    isDY({ data, start, results, code }) {
        let [d1, d2, d3, d4, d5, d6, d7] = getModelLengthData(data, start, 7);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (YingYang(d3) !== 2) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 2) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        if (!(d7.c > d2.c && d7.c > d3.c && d7.c > d4.c && d7.c > d5.c && d7.c > d6.o)) return;
        // return [d2, d3, d4, d5, d6, d7];
        results.push([ code, d2.d, buyDate(d7.d, 1), '大有' ]);
        console.log(`${code}大有`, d2.d, `累计第 ${++count} 个`);
    },
    isLzyy({ data, start, results, code }) {
        let [d1, d2, d3, d4] = getModelLengthData(data, start, 4);
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (YingYang(d3) !== 1) return
        if (YingYang(d4) !== 2) return
        if (!(d4.c > d3.o)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '龙战于野' ]);
        console.log(`${code}龙战于野`, d2.d, `累计第 ${++count} 个`);
    },
    isCBZ({ data, start, results, code }) {
        let datas = getModelLengthData(data, start, 7);
        let [d1, d2] = datas
        if (!d1) return
        // 判断是否缺口
        let ho = d2.l > d1.h
        
        let flag = false
        for(let i = 2; i < datas; i++) {
            if (ho) {
                flag = (datas[i].c < d1.h) || (datas[i].o < d1.h)
            } else {
                flag = datas[i].h < d2.l
            }
        }
        if (!flag) return
        results.push([ code, d1.d, buyDate(d2.d, 1), '窓璧轴' ]);
        console.log(`${code}窓璧轴`, d1.d, `累计第 ${++count} 个`);
    },
    isFlzt({ data, start, results, code }) {
        let datas = getModelLengthData(data, start, 4);
        let [d1, d2, d3, d4] = datas
        if (!d1) return
        if (!(zdf([d1, d2]) > 9.7)) return;
        let sub =Math.abs( (d3.c - d3.o) / d3.o).toFixed(2)
        if (sub >= 0.5) return
        if (!((d3.l > d2.h) && (d3.v > d2.v))) return
        if (YingYang(d4) !== 2) return
        switch(YingYang(d3)) {
            case 1:
                if (!(d4.c > d3.o)) return
                break;
            case 2:
                if (!(d4.c > d3.c)) return
                break;
        }
        results.push([ code, d2.d, buyDate(d4.d, 1), '飞龙在天' ]);
        console.log(`${code}飞龙在天`, d2.d, `累计第 ${++count} 个`);
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
    },
    // 测试用
    testIsZTB({ data, start, code }) {
        let [d1, d2] = getModelLengthData(data, start, 2);
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        console.log(`${code}涨停板`, d1.d, `累计第 ${++count} 个`);
    }
};

// export default all;

// export { YingYang };

exports.all = all