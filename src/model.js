
let count = 0

function getModelLengthData(data, start = 0, leng = 1, flag) {
    // 如果数量不满足模型，则退出
    let maxLength = (start + leng) > data.length ? data.length-1 : start + leng;
    let results = data.slice(start, maxLength);
    return !flag ? (results.length === leng ? results : []) : results;
}
function entity(data) {
    // 实体: (收-开)/开
    if (!data) return;
    let { o, c } = data;
    let max = Math.max(o, c)
    // 大实体：, 中实体：>0.0179-0.0310 ， 小实体：
    return (((Math.abs(c - o)) / max).toFixed(4)) / 1;
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
function zs (data, start, date, compare) {
   let datas = getModelLengthData(data, start, date)
   return datas.some(level1 => {
       let {c, o, l} = level1
       return l <= compare
   })
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
    data.forEach((level1, index1)=> {
        // 连续3根阴线
        let [d1, d2, d3] = [level1, data[index1+1], data[index1+2]]
        if (!(d1 && d2 && d3)) return
        if (YingYang(d1) !== 1) return
        if (YingYang(d2) !== 1) return
        if (YingYang(d3) !== 1) return
        // 最佳条件, 依次最大，且最大是最小的3倍以上
        // if (!(entity(d3) > entity(d2) > entity(d1))) return
        // if (!(entity(d3) > entity(d1)*3)) return 
        if (!((d3.o < d2.c) || (d2.o < d1.c))) return
        arr = [d3]
    })
    return arr
}
function szx(data) {
    
}
function MA(data, n) {
    if (data.length < n) return
    let before = data.slice(-n)
    let count = before.map(level1 => level1.c).reduce((x, y) => x + y)
    return (count / n).toFixed(2) / 1
}
function JC(data, start, slow, fast) {
    let bma60 = MA(getModelLengthData(data, (start)-slow, slow), slow)
    let bma10 = MA(getModelLengthData(data, (start)-fast, fast), fast)
    let ma60 = MA(getModelLengthData(data, (start-1)-slow, slow), slow)
    let ma10 = MA(getModelLengthData(data, (start-1)-fast, fast), fast)
    let ama60 = MA(getModelLengthData(data, (start-2)-slow, slow), slow)
    let ama10 = MA(getModelLengthData(data, (start-2)-fast, fast), fast)
    
    // 金
    if ((ama60 < ama10) && (bma60 > bma10)) {
        return 3
    } 
    else if ((bma10 > bma60) && (ama60 > ama10)) {
        return 1
    }
}
function slowUp(data, start) {
    // 向上
    let slow = 60, fast = 10
    let ama60 = MA(getModelLengthData(data, (start)-slow, slow), slow)
    let ma60 = MA(getModelLengthData(data, (start-1)-slow, slow), slow)
    let bma60 = MA(getModelLengthData(data, (start-2)-slow, slow), slow)
    return bma60 <= ma60 && ma60 <=ama60
}
function slowDown(data, start) {
    // 向下
    let slow = 60, fast = 10
    let ama60 = MA(getModelLengthData(data, (start)-slow, slow), slow)
    let ma60 = MA(getModelLengthData(data, (start-1)-slow, slow), slow)
    let bma60 = MA(getModelLengthData(data, (start-2)-slow, slow), slow)
    return (bma60 > ma60) && (ma60 > ama60)
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
    return last1 === 2
    // if (last1 !== 2) return
    // for (let i = boxs.length - 2; i > 0; i--) {
    //     if (boxs[i].status === 3) {
    //         // console.log(i, 3);
    //         return false
    //     } else if (boxs[i].status === 1) {
    //         // console.log(i, 1)
    //         return true
    //     }
    // }
    
}
function hp(data, start, cycle, callback) {
        let scale = 1.045
        let datas = getModelLengthData(data, start - cycle, cycle);
        let [d1] = datas
        if (!d1) return
        let index = 0, startIndex = 0, arr = []
        while((startIndex + index + 5) < datas.length) {
            startIndex += index
            let avrage = Math.abs(datas[startIndex].c-datas[startIndex].o) / 2
            let base = Math.min(datas[startIndex].c, datas[startIndex].o) + avrage
            let pre = {
                date: datas[startIndex].d,
                max: base * scale,
                min: base / scale
            }
            datas.slice(startIndex, datas.length - 1).forEach((level1, index1) => {
                let { c, o, h, l, d } = level1
                if (h > pre.min && l < pre.max) {
                    index = index1
                }
            })
            let max = datas.slice(startIndex, (startIndex + index + 1)).map(level1 => Math.max(level1.c, level1.o))
            let min = datas.slice(startIndex, (startIndex + index + 1)).map(level1 => Math.min(level1.c, level1.o))
            let date = datas.slice(startIndex, (startIndex + index + 1)).map(level1 => level1.d)
            arr.push({ max, min, date, count: index++ })
        }
        let flag = false
        let [last2] = arr.slice(arr.length -2, -1)
        let [last] = arr.slice(-1)
        if (arr.length <= 1) {
            flag = true
        } else {
            if (last.count > 22) {
                let max2 = [...last2.max]
                let max = [...last.max]
                flag = max2 >= max
            }
        }
        if (callback) {
            flag = callback(arr, datas)
        }
        return flag
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
    let y = dd.getFullYear() + '';   
    let m = dd.getMonth()+1 + ''
    let d = dd.getDate() + ''
    
    return (y.padStart(4, 0))+"-"+(m).padStart(2, 0)+"-"+(d.padStart(2, 0));   
}

const all = {
    isKlyh({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let [d1, d2, d3, d4] = getModelLengthData(data, start, 4);
        if (!d1) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (!(d2.c > d3.o)) return;
        // 怎么算小？怎么算大？答：相比较，越明显越好
        if (!(entity(d2) * 1.5) < entity(d3)) return;
        // 跳空低开
        if (!(d3.o < d2.c)) return
        // 3相对于2要低开高收
        if (!(lohc(d3, d4) && (d4.c < d3.o))) return;
        
        // let datas = getModelLengthData(data, start, 15);
        // let [result] = xiong(datas)
        // if (!result) return
        // return [d2, d3, d4];
        results.push([ code, d1.d, buyDate(d4.d, 1), '亢龙有悔' ]);
        console.log(`${code}亢龙有悔`, d1.d, `累计第 ${++count} 个`);
    },
    isYjsd({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
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
    isQx1({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
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
        if (!slowDown(data, start)) return
        // return [d1, d2, d3, d4, d5, d6, d7];
        results.push([ code, d1.d, buyDate(d7.d, 1), '七星一' ]);
        console.log(`${code}七星一`, d1.d, `累计第 ${++count} 个`);
    },
    isQx2({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
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
        if (!slowDown(data, start)) return
        results.push([ code, d1.d, buyDate(d7.d, 1), '七星二' ]);
        console.log(`${code}七星二`, d1.d, `累计第 ${++count} 个`);
    },
    isFkwz({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let [d1, d2, d3] = getModelLengthData(data, start, 3);
        if (!d1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (!(entity(d2) >= 0.02)) return
        // if (!((zdf([d1, d2]) > 2) && (zdf([d2, d3]) > 2))) return
        if (!((d3.o > d2.c) && (d3.c > d2.o))) return;
        // return true;
        if (!slowUp(data, start)) return
        results.push([ code, d2.d, buyDate(d3.d, 1), '反客为主' ]);
        console.log(`${code}反客为主`, d2.d, `累计第 ${++count} 个`);
    },
    isYydl({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        // 因为d5后的某一天要是阳线，但不确定是哪一天
        let datas = getModelLengthData(data, start, 10);
        let [d1, d2, d3, d4, d5] = datas
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 1) return;
        if (d1.v/1 < d2.v/1) return;
        if (YingYang(d3) !== 1) return;
        if (d2.v/1 < d3.v/1 || d2.h < d3.h || d2.l < d3.l) return;
        if (YingYang(d4) !== 1) return;
        if (d3.v/1 < d4.v/1 || d3.h < d4.h || d3.l < d4.l) return;
        if (YingYang(d5) !== 2) return;
        let find = datas.find((level1, index1) => {
            if (index1 >= 5) {
                return YingYang(level1) === 2 && (level1.c > d5.c)
            }
        })
        if (!find) return
        results.push([ code, d1.d, buyDate(find.d, 1), '以逸待劳' ]);
        console.log(`${code}以逸待劳`, d1.d, `累计第 ${++count} 个`);
    },
    isCsfr({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let [d1, d2] = getModelLengthData(data, start, 2);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (!((d2.h > d1.h) && (d2.l > d1.l) && (d2.c > d1.o))) return;
        // return true;
        results.push([ code, d1.d, buyDate(d2.d, 1), '出水芙蓉' ]);
        console.log(`${code}出水芙蓉`, d1.d, `累计第 ${++count} 个`);
    },
    isGsdn({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        // 判断条件：慢速均线向上
        let [d1, d2, d3, d4, d5, d6] = getModelLengthData(data, start, 6);
        if (!d1) return;
        // 大于2%算是中阳线
        if (YingYang(d3) !== 2) return
        if (!((zdf([d2, d3]) > zdf([d1, d2])) && zdf([d2, d3]) >= 2)) return;
        if (!(d3.v/1 > d2.v/1)) return;
        if (!(d4.c > d3.o && d5.c > d3.o && d6.c > d3.o)) return;
        if (!(d4.v/1 < d3.v/1 && d5.v/1 < d3.v/1 && d6.v/1 < d3.v/1)) return;
        if (!slowUp(data, start)) return
        // return [d2, d3, d4, d5];
        results.push([ code, d3.d, buyDate(d6.d, 1), '隔山打牛' ]);
        console.log(`${code}隔山打牛`, d3.d, `累计第 ${++count} 个`);
        // 1. 上升趋势中，
        // 2. 是阶段的顶点不可买，如果有缺口可以
    },
    isDY({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        // 盈利： 17-20%
        let [d1, d2, d3, d4, d5, d6, d7] = getModelLengthData(data, start, 7);
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (YingYang(d3) !== 2) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 2) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        if (!(entity(d6) < 0.0236)) return
        if (!(d7.c > d2.c && d7.c > d3.c && d7.c > d4.c && d7.c > d5.c && d7.c > d6.o)) return;
        // return [d2, d3, d4, d5, d6, d7];
        results.push([ code, d2.d, buyDate(d7.d, 1), '大有' ]);
        console.log(`${code}大有`, d2.d, buyDate(d7.d, 1), `累计第 ${++count} 个`);
    },
    isFhlz({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        // 盈利： 10%+
        let [d1, d2, d3, d4] = getModelLengthData(data, start-1, 4);
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v/1 < d2.v/1)) return
        if (!(d3.c < d2.c)) return
        if (!(d3.v/1 < d2.v/1)) return
        if (!(d4.c > d2.c)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '峰回路转' ]);
        console.log(`${code}峰回路转`, d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isLzyy({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let [d1, d2, d3, d4] = getModelLengthData(data, start-1, 4);
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (YingYang(d3) !== 1) return
        if (YingYang(d4) !== 2) return
        if (!(d4.c > d3.o)) return
        if (!((entity(d3) >= 0.03) || (zdf([d2, d3]) > 9.7))) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '龙战于野' ]);
        console.log(`${code}龙战于野`, d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isCBZ({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
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
    isFlzt({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let datas = getModelLengthData(data, start-1, 4);
        let [d1, d2, d3, d4] = datas
        if (!d1) return
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (!(entity(d3) < 0.0179)) return
        if (!((d3.l > d2.h) && (d3.v/1 > d2.v/1))) return
        if (YingYang(d4) !== 2) return
        // if (!(d4.v/1 > d3.v/1)) return
        let max = Math.min(d3.c, d3.o)
        if (!(d4.c > max)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '飞龙在天' ]);
        console.log(`${code}飞龙在天`, d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isLahm({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
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
    isSlbw0({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let datas = getModelLengthData(data, start, 4);
        let [d1, d2, d3, d4] = datas
        if (!d1) return
        // 小实体
        if (!((entity(d2) < 0.0179) && (entity(d2) <= entity(d3)))) return
        if (!(d3.l < d2.l)) return
        if (YingYang(d3) !== 1) return
        if (YingYang(d4) !== 2) return
        // 第三天yang的c > 第二天ying的o(的0.0115倍，防止差别过小) && ying的l < yang的l
        if (!((d4.c > (d3.c * 1.0115)) && (d3.l < d4.l))) return
        // 小实体之前要出现 xiong
        // if (d2.d === '2016-09-30') {
        //     debugger
        // }
        let before = getModelLengthData(data, start - 9, 10);
        let flag = before.every(level1 => level1.l > d3.l)
        let [result] = xiong(before)
        if (!(result && flag)) return
        // 止损, 小于第三天ying的l
        if (zs(data, start+4, 10, d3.l)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '神龙摆尾0' ]);
        console.log(`${code}神龙摆尾0`,d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw1({ data, start, results, code, dwmType }) {
        // 20%
        if (dwmType !== 'day') return
    
        let datas = getModelLengthData(data, start - 49, 51);
        let [d1] = datas
        if (!d1) return;
        let current = data[start]
        // 下跌后横盘
        let flag = hp(data, start, 60, (arr, ds) => {
            return ds.every((level1, index1) => {
                if (index1 > 0 && level1.d !== current.d) {
                    return zdf([ds[index1-1], ds[index1]]) < 9.7
                }
                return true
            })
        })
        if (!flag) return
        // 
        let afters = getModelLengthData(data, start+1, 22);
        // 不跌破涨停板开盘价
        let stop_loss = afters.every(level1 => {
            let { c, o } = level1
            let min = Math.min(c, o)
            return min >= current.o
        })
        if (!stop_loss) return
        // 5日后某天回到箱体内
        let index = afters.every((level1, index1) => {
            let { c, o } = level1
            let max = Math.max(c, o)
            if (index1 <= 7) {
                return current.c > max
            }
            return true
        })
        if (!index) return
        // 之后某日突破涨停板的收盘价, 且放量
        let buy = afters.find((level1, index1) => {
            if (YingYang(level1) !== 2) return
            let pre = afters[index1 - 1]
            return (level1.c > current.c) && (pre.v/1 < level1.v/1)
        })
        if (!buy) return
        
        results.push([ code, current.d, buyDate(buy.d, 1), '神龙摆尾1' ]);
        console.log(`${code}神龙摆尾1`,current.d, buyDate(buy.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw2({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let qsData = qs(data, start, 48, 12)
        if (!qsData) return
        
        let current = data[start]

        if (current.d === '2015-09-28') {
            debugger
        }
        let num = 1, max = 0, buy
        let callback = function () {
            let after = data[start + num]
            if (!after)  return
            let min = Math.min(after.c, after.o)
            let flag = false
            if (min > current.c && num < 20) {
                if (num > 5) {
                   flag = max < Math.max(after.o, after.c)
                }
                if (!flag) {
                    num++
                    max = Math.max(after.o, after.c, max)
                    callback()
                } else {
                    buy = after
                }
            }
        }
        callback()
        if (!buy) return

        results.push([ code, current.d, buyDate(buy.d, 1), '神龙摆尾2' ]);
        console.log(`${code}神龙摆尾2`,current.d, buyDate(buy.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw3({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let datas = getModelLengthData(data, start-1, 4);
        let [d1, d2, d3, d4] = datas
        if (!d1) return
        if (!(zdf([d1, d2]) > 9.7)) return
        if (YingYang(d3) !== 2) return
        if (YingYang(d4) !== 2) return
        if (!(d3.v/1 > d2.v/1)) return
        let zfz = zf([d2, d3])
        if (!(zfz > 4) && (zfz < 6)) return
        if (!((entity(d3) > entity(d4)) && (entity(d4) < 0.0179))) return;
        if (!(d4.v/1 < d3.v/1)) return
        results.push([ code, d2.d, buyDate(d4.d, 1), '神龙摆尾3' ]);
        console.log(`${code}神龙摆尾3`,d2.d, buyDate(d4.d, 1), `累计第 ${++count} 个`);
    },
    isSlbw4({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let datas = getModelLengthData(data, start, 12);
        let [d1, d2] = datas
        if (!d1) return
        if (YingYang(d2) !== 2) return
        if (!((d2.h > d1.h) && (d2.v/1 > d1.v/1))) return
        let zfz = zf([d1, d2])
        if (!(zfz > 4) && (zfz < 6)) return
        let find = datas.slice(-10).find(level1 => {
            if (YingYang(level1) !== 2) return
            return level1.h > d2.h && level1.v/1 > d2.v/1
        })
        if (!find) return
        results.push([ code, d2.d, buyDate(find.d, 1), '神龙摆尾4' ]);
        console.log(`${code}神龙摆尾4`,d2.d, buyDate(find.d, 1), `累计第 ${++count} 个`);
    },
    isSlqs({ data, start, results, code, dwmType }) {
        if (dwmType !== 'day') return
        let datas = getModelLengthData(data, start-1, 3);
        let [d1, d2, d3] = datas
        if (!d1) return
        if (!(zdf([d1, d2]) > 9.7)) return
        if (!(d1.v/1 < d2.v/1)) return
        if (!(zdf([d2, d3]) > 9.7)) return
        if (!(d3.v/1 < d2.v/1)) return
        results.push([ code, d2.d, buyDate(d3.d, 1), '双龙取水' ]);
        console.log(`${code}双龙取水`,d2.d, buyDate(d3.d, 1), `累计第 ${++count} 个`);

    },
    isG8M1({ data, start, results, code, dwmType }) {
        if (dwmType !== 'week') return
        // 10\60
        let qs = JC(60, 10)
        if (qs !== 3) return
        // 4. 当天的阳线要上穿慢速均线
        let current = data[start-1]
        if (YingYang(current) !== 2) return
        if (!(current.c > ma60)) return
        results.push([ code, current.d, buyDate(current.d, 1), '葛式八法-买1' ]);
        console.log(`${code}葛式八法-买1`,current.d, buyDate(current.d, 1), `累计第 ${++count} 个`);
    },
    isyylm({ data, start, results, code, dwmType }) {
        if (dwmType !== 'month') return
        // 下跌要2年左右
        let datas = getModelLengthData(data, start, 24);
        let [d1] = datas
        if (!d1) return
        let bMax = Math.max(d1.c, d1.o), aMax = Math.max(d1.c, d1.o)
        let bMin = Math.min(d1.c, d1.o), aMin = Math.min(d1.c, d1.o)
        datas.forEach((level1, index1) => {
            let { c, o } = level1
            let max = Math.max(c, o)
            let min = Math.min(c, o)
            aMax = Math.max(aMax, max)
            aMin = Math.min(aMin, min)
            if (index1 <= 12) {
                // 下跌的最低价，用于和后面横盘最低价比较。确保横盘的价在这个价格的下面
                bMin = Math.min(bMin, min)
            }
        })
        if (!(bMax >= aMax)) return
        // 最大值和最小值要相差2倍以上
        if (!(bMax > (aMin * 2))) return
        
        // 筑底横盘,(从高点下跌到确认筑底结束，给个大概3年多的时间)
        let time = 0
        let flag = new Array(60-40).fill(1).some((level1, index1) => {
            time = 24 + index1
            let hpDatas = getModelLengthData(data, start+12, time, true);
            let everys = hpDatas.every(level2 => {
                return (bMin*1.3) > Math.min(level2.c, level2.o)
            })
            let isHp = hp(hpDatas, hpDatas.length, hpDatas.length, (arr) => {
                if (!arr[arr.length-1]) {
                    return 
                }
                return arr[arr.length-1].count >= 12
            })
            return everys && isHp
        })
        if (!flag) return
        let [cy] = d1.d.split('-')
        let ok = results.every(level1 => {
            let [a1, a2, a3, a4] = level1
            if (a1 === code && a4 === '鱼跃龙门') {
                let [year] = a2.split('-')
                return (year/1 + 2) < cy/1
            } else {
                return true
            }
        })
        if (!ok) return
        // 不好判断日期，就写当天
        let date = new Date().toLocaleDateString()
        results.push([ code, d1.d, buyDate(date, 1), '鱼跃龙门' ]);
        console.log(`${code}鱼跃龙门`,d1.d, buyDate(date, 1), time,`累计第 ${++count} 个`);
    },
    // 测试用
    testIsZTB({ data, start, results, code, dwmType }, arrs) {
        let scale = 1.045
        let datas = getModelLengthData(data, start- 59, 61);
        let [d1] = datas
        if (!d1) return
        let index = 0, startIndex = 0, arr = []
        while((startIndex + index + 5) < datas.length) {
            startIndex += index
            let avrage = Math.abs(datas[index].c-datas[index].o) / 2
            let base = Math.min(datas[index].c, datas[index].o) + avrage
            let pre = {
                max: base * scale,
                min: base / scale
            }
            datas.slice(startIndex, datas.length - 1).forEach((level1, index1) => {
                let { c, o, h, l } = level1
                
                if (h > pre.min && l < pre.max) {
                    index = index1
                }
            })
            let max = datas.slice(startIndex, (startIndex + index + 1)).map(level1 => Math.max(level1.c, level1.o))
            let min = datas.slice(startIndex, (startIndex + index + 1)).map(level1 => Math.min(level1.c, level1.o))
            arr.push({ max, min, count: index++ })
        }
        
        let [last, last2] = arr
        if (last.count > 22) {
            if (!last2) {
                return true
            } else {
                let max2 = [...last2.max]
                let max = [...last.max]
                return max2 >= max
            }
        }
    }
};

// export default all;

// export { YingYang };

module.exports = {
    ...all,
    YingYang,
    zdf
}