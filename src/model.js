
let count = 0

function getModelLengthData(data, start = 0, leng = 1) {
    // 如果数量不满足模型，则退出
    let maxLength = start + leng;
    if (maxLength > data.length) return [];
    let results = data.slice(start, maxLength);
    return results;
}
function entity(data) {
    // 实体: (收-开)/开
    if (!data) return;
    let { o, c } = data;
    return (((Math.abs(c - o)) / o).toFixed(2)) / 1;
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
    // 大于 > 5 % 大阴阳线
    // todo ... 处理一字涨停板
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
function xiong(data) {
    let arr = []
    let max = {}
    data.some(level1 => {
        // 阴线，且 开盘价依次降低, 最高价依次降低
        let flago = max.o ? max.o > level1.o : true
        let flagh = max.h ? max.h > level1.h : true
        if (YingYang(level1) === 1 && flago && flagh) {
            max.o = level1.o
            max.h = level1.h
            arr.push(level1)
        } else {
            let [last] = data.slice(-1)
            if(arr.length >= 3 && (level1.d === last.d)) {
                return arr
            }
            max = {}
            arr = []
            return
        }

    })
    return arr.slice(-1)
}
function szx(data) {
    
}
function MA(data, n) {
    if (data.length < n) return
    let before = data.slice(-n)
    let count = before.map(level1 => level1.c).reduce((x, y) => x + y)
    return (count / n).toFixed(2) / 1
}

function qs(data, start, n, count = 10) {

    let maDatas = getModelLengthData(data, start-(n-1), n)
    if (!maDatas.length) return
    let lists = new Array(Math.ceil(maDatas.length / count)).fill(1)

    let boxs = [], copyDatas = JSON.parse(JSON.stringify(maDatas))
    lists.map((level1, index1) => {
        let datas = copyDatas.splice(-count)
        let max = Math.max(...datas.map(level2 => level2.h))
        let min = Math.min(...datas.map(level2 => level2.l))
        boxs.unshift({ max, min, d: datas[0].d, length: datas.length })
    })
    
    
    let compare = null, scale = 1.018
    boxs.forEach((level1, index1) => {
        if (index1 > 0) {
            let pre = boxs[index1 - 1]
            if (compare) {
                pre = compare
            }
            if (((pre.max * scale) > level1.max) && ((pre.min / scale) > level1.min)) {
                // 1. 下跌(±0.18%)
                compare = null
                level1.status = 1
                level1.zdf = -((pre.min / level1.min) - 1)

            } else if (((pre.max * scale) >= level1.max && (pre.min / scale) <= level1.min)) {
                // 2-1. 横盘 (被包含)
                compare = {
                    max: Math.max(pre.max, level1.max),                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
                    min: Math.min(pre.min, level1.min)
                }
                level1.status = 2
                level1.zdf = 0
            }
            else if ((pre.max <= (level1.max * scale) && pre.min >= (level1.min / scale))) {
                // 2-2. 横盘 (包含)
                compare = {
                    max: Math.max(pre.max, level1.max),                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
                    min: Math.min(pre.min, level1.min)
                }
                level1.status = 2
                level1.zdf = 0
            }
            else if (((pre.max * scale) < level1.max) && ((pre.min / scale) < level1.min)) {
                // 3. 上涨(±0.18%)
                compare = null
                level1.status = 3
                level1.zdf = ((level1.max / pre.max) - 1)
            }
            
        }
    })
    /**
     * 判断所处位置 及 走势
     * todo... 复杂的走势以后想到再写
     * 上涨: > 0.05(10%)
     * 下跌: < -0.05(-10%)
     * 中间值算横盘
     */
    let zf = boxs.reduce((x, y) => {
        let y1 = (y && y.zdf) || 0
        return x + y1
    }, 0)
    
    let last1 = boxs[boxs.length - 1].status
    if (last1 !== 2) return
    for (let i = boxs.length - 2; i > 0; i--) {
        if (boxs[i].status === 3) {
            console.log(i, 3);
            break
        } else if (boxs[i].status === 1) {
            console.log(i, 1)
            break;
        }
    }
    debugger
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
        if (YingYang(d3) !== 1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 2) return;
        if (!(d1.c > d2.o)) return;
        // 怎么算小？怎么算大？答：相比较，越明显越好
        if (!(entity(d1) < entity(d2))) return;
        // 跳空低开
        if (!(d2.o < d1.c)) return
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
        let datas = getModelLengthData(data, start, 7);
        let [d1, d2, d3, d4, d5, d6, d7] = datas
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
        if (!ho) return
        let flag = datas.slice(-5).every(level1 => {
            return level1.l >= d1.h
        })
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
    isLahm({ data, start, results, code }) {
        let datas = getModelLengthData(data, start - 4, 5);
        let [d1] = datas
        if (!d1) return;
        let [val] = datas.slice(-1)
        let [result] = xiong(datas)
        if (!result) return
        if (!(val.c > result.o)) return
        results.push([ code, val.d, buyDate(val.d, 1), '柳暗花明' ]);
        console.log(`${code}柳暗花明`, val.d, buyDate(val.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw1({ data, start, results, code }) {
        // let befores = {}, afters = {}

        // befores.datas = getModelLengthData(data, start - 30, 31); // 一个月以上，最少22天
        // afters.datas = getModelLengthData(data, start, 30); // 一周以上，最少5天
        // let [last] = befores.datas.slice(-1)
        // debugger
        // if (!(befores.datas[0] && afters.datas[0])) return
        // befores.datas.slice(0, 30).forEach(level1 => {
        //     if (!befores.max || level1.h > befores.max) {
        //         befores.max = level1.h
        //     }
        //     if (!befores.min || level1.l < befores.min) {
        //         befores.min = level1.l
        //     }
        // })
        // // todo...

        // afters.max = last.c
        // afters.min = last.o
        // let num = NaN
        // let buy = afters.datas.find((level1, index1) => {
        //     if (level1.c > afters.max && index1 > 5) {
        //         num = index1
        //         let pre = afters.datas[index1]
        //         return level1.v > pre.v
        //     }
        // })
        // let flag = afters.datas.some((level1, index1) => {
        //     if (index1 <= num) {
        //         switch(YingYang(level1)) {
        //             case 1:
        //                 return level1.o < afters.max && level1.c > afters.min
        //                 break;
        //             case 2:
        //                 return level1.o > afters.min && level1.c < afters.max
        //                 break;
        //         }
        //     }
        // })
        
        // if (!(flag && buy)) return
        // results.push([ code, last.d, buyDate(buy.d, 1), '神龙摆尾1' ]);
        // console.log(`${code}神龙摆尾1`,last.d, buyDate(buy.d, 1), `累计第 ${++count} 个`);
        qs(data, start, 48, 12)
    },
    isSlbw3({ data, start, results, code }) {
        let datas = getModelLengthData(data, start, 4);
        let [d1, d2, d3, d4] = datas
        if (!d1) return
        if (!(zdf([d1, d2]) > 9.7)) return
        if (YingYang(d3) !== 2) return
        if (!(d3.v > d2.v)) return
        let zfz = zf([d2, d3])
        if (!(zfz > 4) && (zfz < 6)) return
        if (YingYang(d4) !== 2) return
        if (!(d4.v < d3.v)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '神龙摆尾3' ]);
        console.log(`${code}神龙摆尾3`,d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw4({ data, start, results, code }) {
        let datas = getModelLengthData(data, start, 12);
        let [d1, d2] = datas
        if (!d1) return
        if (YingYang(d2) !== 2) return
        if (!((d2.h > d1.h) && (d2.v > d1.v))) return
        let zfz = zf([d1, d2])
        if (!(zfz > 4) && (zfz < 6)) return
        let find = datas.slice(-10).find(level1 => {
            if (YingYang(level1) !== 2) return
            return level1.h > d2.h && level1.v > d2.v
        })
        if (!find) return
        results.push([ code, d2.d, buyDate(find.d, 1), '神龙摆尾4' ]);
        console.log(`${code}神龙摆尾4`,d2.d, buyDate(find.d, 1), `累计第 ${++count} 个`);
    },
    isG8M1({ data, start, results, code }) {
        // 10\60
        let datas = getModelLengthData(data, start, 12);
        let [d1, d2] = datas
    },
    // 测试用
    testIsZTB({ data, start, results, code }) {
        let datas = getModelLengthData(data, start - 4, 5);
        let [d1] = datas
        if (!d1) return;
        let [val] = datas.slice(-1)
        let [result] = xiong(datas)
        if (!result) return
        debugger
        if (!(val.c > result.o)) return
        console.log(`${code}柳暗花明`, result.d, buyDate(val.d, 1), `累计第 ${++count} 个`);
    }
};

// export default all;

// export { YingYang };

module.exports = {
    ...all,
    YingYang,
    zdf
}