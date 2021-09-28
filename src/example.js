
const request = require('request')
const express = require('express')
const schdule = require('node-schedule')
const email = require('./sendEmail')

const nodeExcel = require('node-xlsx');
const fs = require('fs');

const mysql = require('mysql');

const ig502 = require('./ig502')
const modelJs = require('./model')
const app = express()
const port = 3333

// 深市
const CODE000 = createCodes('000001', '000999');
// 002中小板\300创业板
const CODE002 = createCodes('002000', '002999');
// 沪市
const CODE600 = createCodes(600000, 600999);
const CODE601 = createCodes(601000, 601999);
const CODE603 = createCodes(603000, 603999);
const CODELIST = {
    'ig502_datas_000': CODE000.map(level1 => (level1+'').padStart(6, 0)),
    'ig502_datas_002': CODE002.map(level1 => (level1+'').padStart(6, 0)),
    'ig502_datas_600': CODE600.map(level1 => (level1+'').padStart(6, 0)),
    'ig502_datas_601': CODE601.map(level1 => (level1+'').padStart(6, 0)),
    'ig502_datas_603': CODE603.map(level1 => (level1+'').padStart(6, 0))
};

let dwmType = 'day'

let todayCodes = []
let usedCodes = []
let failCodes = []
let code404 = []
let stash = {
    list: [],
    results: {}
}

global.example = {
    beforeFlag: true,
    downloadFlag: true,
    init: false
}
    
// 1. 设置跨域问题等
var allowCrossDomain = function(req, res, next) {//设置response头部的中间件  
    res.header('Access-Control-Allow-Origin', 'http://localhost:8080');//8089是vue项目的端口，这里相对于白名单  
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');  
    res.header('Access-Control-Allow-Headers', 'Content-Type');  
    res.header('Access-Control-Allow-Credentials','true');  
    next();  
};  
app.use(allowCrossDomain);  


// var mysql = require('mysql');
let mysql_config = {
    // host : '59.110.112.35',
    // user : 'bdm782578544', 
    // password : 'Meng519890',
    // database : 'bdm782578544_db',
    host : '8.141.209.61',
    user : 'root', 
    password : 'Meng519890',
    database : 'ig502',
    // insecureAuth: true
}, connection;

function handleDisconnection() {
   connection = mysql.createConnection(mysql_config);
    connection.connect(async (err) => {
        if(err) {
            setTimeout('handleDisconnection()', 2000);
        } else {
            console.log('连接成功 id ' + connection.threadId);
            
            console.log('start time：' + new Date().toLocaleString());
            // // 1. 将成功的 和 不存在 的code 都取出来
            // await initQuery()

            // console.log(modelJs);
            
            // // 2. 初始化
            nodeSchedule()
            // if (example.init) {
            //     init()
            // }
        }
    });

    connection.on('error', function(err) {
        console.error('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            console.error('db error执行重连:'+err.message);
            handleDisconnection();
        } else {
            throw err;
        }
    });
    exports.connection = connection;
}

// handleDisconnect(db_config);
handleDisconnection()



// let add = "INSERT INTO gundam VALUES(111, 'rx891', 'hahaha111111')"
// let add = "INSERT INTO ig502(o,c,h,l,d,v) VALUES(111, 'rx891', 'hahaha111111')"
// let update = "UPDATE gundam SET name='rx781' WHERE id=3333"
// let query = 'SELECT * FROM gundam'
// let query = 'SELECT name FROM gundam WHERE name="rx782"'

// 3. 调用接口
app.get('/api/sendmail',  async (req, res) => {
    let { html } = req.query
    email.sendMail(html)
})

app.get('/api/init',  async (req, res) => {
    example.init = true
    let { type } = req.query
    // 1. 将成功的 和 不存在 的code 都取出来
    await initQuery(type || 'day')
    init(type || 'day')
})
app.get('/api/update',  async (req, res) => {
    let query = req.query

    // 1. 将成功的 和 不存在 的code 都取出来
    await initQuery(query.type)
    
    await update(query.type)
})

app.get('/api/before/download',  async (req, res) => {
    let query = req.query
    // 1. 将成功的 和 不存在 的code 都取出来
    await initQuery(query.type)
    /**
     * type: 'day | week | month'
     * d: 'today' 或者 3(指定天数，比如3天前)
     * size: 10. 分段所有的code， 例如 每10个一组调接口 
     * today： 会将模型只筛选出 今天以及今天之后 为买入的。
     *      否则不筛选，是数据的全部(多少取决于天数 )，
     *      且按model导出excel
     * 不传参数：默认查找有史以来所有的数据，且按model导出excel
     */
    let keys = Object.keys(CODELIST)
    let count = keys.length - 1
    stash.list = []
    stash.results = {}
    let callback = async () => {
        if (count < 0) {
            const result = await download(null, '汇总', query)
            res.send({ code: 200, message: '筛选完成' })
            return
        }
        let name = keys[count]
        const r = await beforeDownload(query, name)
        count--
        callback()
    }
    callback()
})

app.get('/api/download',  async (req, res) => {
    /**
     * query： {
     *      flag: Boolean // true: 按code导出。false：按model导出
     *      d: 同上，但这里就和天数没关系了，只有today和其他。
     * }
     */
    let query = req.query
    const result = await download(null, '汇总', query)
    res.download(result)
})

app.get('/api/write', (req, res) => {
    let query = req.query
    write(query.data, 'day')
})



app.post('/api/trade/echart/query', (req, res) => {
    let body = ''
    req.on('data',  (chunk) => {
        body  +=  chunk;      
    });
    req.on('end',  () => {
        let { code, buy_date, sale_date } = JSON.parse(body)
        let type = code.slice(0,3)
        let sql = `SELECT * FROM ig502_datas_${type} WHERE code=${code} and d >= '${buy_date}'`
        if (sale_date) {
            sql += ` and d <= '${sale_date}'`
        }
        connection.query(sql, (err, result) => {
            if (err) {
                res.send({
                    code: 400,
                    message: err.message,
                    data: []
                })
            } else {
                res.send({
                    code: 200,
                    message: '查询数据成功',
                    data: result
                })
            }
        })
    })
})

app.get('/api/trade/query', (req, res) => {
    console.log('query');
    let sql = `SELECT * FROM trade`
    connection.query(sql, (err, result) => {
        if (err) {
            res.send({
                code: 400,
                message: err.message,
                data: []
            })
        } else {
            res.send({
                code: 200,
                message: '查询数据成功',
                data: result
            })
        }
    })
})
app.delete('/api/trade/delete', (req, res) => {
    console.log('delete');
    let sql = `DELETE FROM trade WHERE id = ${req.query.id}`
    connection.query(sql, (err, result) => {
        if (err) {
            res.send({
                code: 400,
                message: err.message,
                data: []
            })
        } else {
            res.send({
                code: 200,
                message: '删除数据成功',
                data: result
            })
        }
    })
    
})
app.put('/api/trade/update', (req, res) => {
    let body  =  '';     
    req.on('data',  (chunk) => {
        body  +=  chunk;      
    });
    req.on('end',  () => {
        let json1 = JSON.parse(body)
        let condition = ''
        let arrs = ['stop_loss','buy','sale', 'num']
        Object.keys(json1).forEach(level1 => {
            if (level1 === 'id') return
            condition += `${level1} = ` + (arrs.includes(level1) ? json1[level1] : `'${json1[level1]}'`) + ','
        })
        let type = json1['code'].slice(0,3)
        condition += `type = '${type}'`

        let sql = `UPDATE trade SET ${condition} WHERE id = ${json1.id}`
        connection.query(sql, (err, result) => {
            if (err) {
                res.send({
                    code: 400,
                    message: err.message
                })
            } else {
                res.send({
                    code: 200,
                    message: '编辑成功'
                })
            }
        })
    });
})
app.post('/api/trade/add', (req, res) => {
    let body  =  '';     
    req.on('data',  (chunk) => {
        body  +=  chunk;      
    });
    req.on('end',  () => {
        let json1 = JSON.parse(body)
        let keys = ''
        let values = ''
        let arrs = ['stop_loss','buy','sale', 'num']
        Object.keys(json1).forEach(level1 => {
            keys += `${level1},`
            values += (arrs.includes(level1) ? json1[level1] : `'${json1[level1]}'`) + ','
        })
        // 将 类别 添加进去
        let type = json1['code'].slice(0,3)
        keys += 'type'
        values += `'${type}'`
        // let values = `'${type}', '${code}', "${name}", '${buy_date}', '${sale_date}', ${stop_loss}, ${buy}, ${sale}, ${is_sale}, '${remark || ''}'`
        let sql = `INSERT INTO trade(${keys}) VALUES(${values})`
        connection.query(sql, (err, result) => {
            if (err) {
                res.send({
                    code: 400,
                    message: err.message
                })
            } else {
                res.send({
                    code: 200,
                    message: '新增成功'
                })
            }
        })
    });
})









/**
 *  根据数据 搜索模型
 */

function getModelClick(datas, dwm) {
    console.log('开始筛选');
    let results = {}
    datas.forEach(level2 => {
        let { code } = level2;
        if (!results[code]) {
            results[code] = [level2];
        } else {
            results[code].push(level2);
        }
    });
    Object.keys(results).forEach(level1 => {
        let data = results[level1];
        getModel(data, level1, dwm);
    });
    console.log('筛选结束');
}
function getModel(data, code, dwmType) {
    let qs = null
    let results = [];
    data.forEach((level1, start) => {
        if (start < 60) {
            return
        }
        // d1 不确定是阴、阳线时，就放在switch的外面
        let params = { data, start, results, code, dwmType };
        // if(data[start].d === '2017-08-31') {
        //     debugger
        // }
        // modelJs.isSlqs(params) // ok
        // modelJs.isSlbw0(params); // ok
        // // modelJs.isSlbw4(params);
        // // modelJs.isCBZ(params);
        // modelJs.isFkwz(params);
        // // modelJs.isG8M1(params);
        // modelJs.isyylm(params); // ok
        switch (modelJs.YingYang(level1)) {
            case 1:
                // modelJs.isKlyh(params);
                // modelJs.isQx1(params);
                // modelJs.isQx2(params);
                // modelJs.isCsfr(params);
                // modelJs.isDY(params); // ok
                break;
            case 2:
                // if (start > 60 && modelJs.zdf(data.slice(start - 1, start + 1)) > 9.7) {
                //     modelJs.isSlbw1(params) // ok
                //     // modelJs.isSlbw2(params)
                //     modelJs.isSlbw3(params); // ok
                //     modelJs.isLzyy(params); // ok
                //     modelJs.isFhlz(params); // ok
                //     modelJs.isFlzt(params); // ok
                //     // modelJs.testIsZTB(params)
                // }
                // // modelJs.isLahm(params);
                modelJs.isYjsd(params); // ok
                // modelJs.isYydl(params); // ok
                // modelJs.isGsdn(params);
                break;
            default:
                break;
        }
    });
    if (!stash.results[code]) {
        stash.results[code] = results
    } else {
        stash.results[code].push(results)
    }
}
/********************************************* */

/**
 *  下载准备前后
 */
function beforeDownload({size, d, type='day' }, name) {
    return new Promise((reslove, reject) => {
            
        // 批量查询，一个select创建一个sql连接，影响性能
        // let strs = usedCodes.join(',')
        let current = size || 10
        let len = Math.ceil(CODELIST[name].length / current)
        // let arr = new Array(len).fill(1)
        let getSql = function (sql, name, dwm) {
            return new Promise((reslove, reject) => {
                connection.query(sql, (err, results) => {
                    if (err) {
                        console.log(`查询${name}失败:`, err.message);
                        reject(`查询${name}失败:`, err.message)
                    }
                    
                    console.log(`${name} 共 ${ results.length } 条, 写入stsh 完成`);
                    
                    getModelClick(results, dwm)
                    reslove(`${name} 共 ${ results.length } 条, 写入stsh 完成`)
                })
            })
        }
        let fn = async function (dwm) {
            if (--len < 0) {
                return reslove({code: 200, message: '查询完毕'})
            }
            let strs = CODELIST[name].slice(len * current, (len+1)*current).join(',')
            // let strs = CODELIST[name].join(',')
            // let strs = createCodes(600000, 600009).join(',')
            let sql = `select * from ${name} where code in (${strs}) and type='${dwm}'`
            // 今天 之前的 几天， 例如 d = 7就是一周前，今天是7-23的7天前是7-16
            if (d) {
                // 7天前处理成 '2021-7-16' 
                let days = someDay(d / 1) 
                // 查询某个时间段的值 (注意d是字符串类型)
                sql += `and d >= '${days}'`
            }
            await getSql(sql, name, dwm)
            fn(dwm)
            console.log(`开始查询 ${name} -- ${len}`);
            
        }
        fn(type)
    })
}
function download(results, modelName, {d='all', flag = false, type='day'} = {}) {
    return new Promise((reslove, reject) => {
        if (results) {
            getModelClick(results, type)
        }
        console.log('准备写入');
        let now = new Date().toLocaleDateString()
        let header = [ 'code', 'date', 'buyDate', 'type', 'success' ]
        let lists = [], obj = {}, model = 'model'
        if (flag) {
            model = 'code'
            // 按code分sheet页，即 600000 包含所有 模型
            Object.keys(stash.results).forEach(level1 => {
                let arr = stash.results[level1]
                if (!obj[level1]) obj[level1] = [arr]
                else obj[level1].push(arr)
            })
        }
        else {
            // 按 模型 分sheet页，即 一箭双雕 包含所有 code
            let arr = [] // [{}, {}]
            Object.values(stash.results).forEach(level1 => arr = arr.concat(level1))
            arr.forEach(level1 => {
                let [code, date, buy, name] = level1
                if (!obj[name]) obj[name] = [level1]
                else obj[name].push(level1)
            })
        }
        Object.keys(obj).forEach(level1 => {
            let datas = obj[level1].filter(level2 => {
                if (d === 'today') {
                   return new Date(level2[2]).getTime() >= new Date(now).getTime()
                } else {
                    return true
                }
            })
            lists.push({
                name: level1,
                data: [
                    header,
                    ...datas
                ]
            })
        })
        if (!lists.length) {
            console.log('未筛选出任何模型');
            return
        }
        const buffer = nodeExcel.build(lists);// list 的格式也需要跟上述格式一致
        console.log('开始写入');
        let date = new Date().toLocaleDateString().replace(/\//g, '')
        fs.writeFile(`${modelName}${model}_${date}_d-${d}.xlsx`, buffer, function (err) {
            if (err)
                throw err;
            console.log('写入完成');
            reslove(`${modelName}${model}_${date}_d-${d}.xlsx`)
        });
    })
}
/* ******************************************** */

function update(dwm = 'day') {
    let type = {
        day: 'Day_qfq',
        week: 'Week_qfq',
        month: 'Month_qfq',
    }[dwm]
   return new Promise((reslove, reject) => {
        let codes = usedCodes.filter(level1 => !todayCodes.includes(level1))
        //    let objs = {
        //        a: [{a1:1},{a2:2},{a3:3}],
        //        b: [{b1:1},{b2:2},{b3:3}],
        //    }
        let keys = Object.keys(CODELIST)
        let index = keys.length

        let unusecodes = CODELIST[keys[--index]].filter(level1 => codes.includes(level1))
        let count = unusecodes.length
    
        let next = function () {
            if (count < 1) {
                write(`${keys[index]}: over`, dwm)
                if (--index >= 0) {
                    unusecodes = CODELIST[keys[index]].filter(level1 => codes.includes(level1))
                    count = unusecodes.length
                    next()
                } else {
                    email.sendMail(`update：${dwm} 成功！`)
                    console.log('over');
                    reslove()
                }
            } else {
                // 3. 开始递归 获取 -> 存储
                setTimeout( async () => {
                    let code = unusecodes[--count]
                    console.log(code, '---', new Date().toLocaleString());
                    const res1 = await getApi(code, 'real/time', type)
                    console.log(`${code}：${res1.code}`);
                    if (res1.code === 200) {
                        // 3.2 将数据写入数据库
                        const res2 = await getConnection(code, addSql(code, '[' + res1.message + ']', 'ig502_today', dwm), dwm)
                        const res3 = await getConnection(code, addSql(code, '[' + res1.message + ']', keys[index], dwm), dwm)
                        console.log(res3, keys[index]);
                    }
                    next()
                }, 2100);
            }
        }
        next(count, unusecodes)
   })
}

function init(dwm) {
    let type = {
        day: 'Day_qfq',
        week: 'Week_qfq',
        month: 'Month_qfq',
    }
     // 1. 将数据库中的404都拿出来，合并在一起
    let codes = code404.concat(usedCodes)
    // 2. 排除所有已失效的code
    let keys = Object.keys(CODELIST)
    let index = keys.length
    let unusecodes = CODELIST[keys[--index]].filter(level1 => !codes.includes(level1))
    
    let count = unusecodes.length
    let next = function () {
        if (count < 1) {
            write(`${keys[index]}: over`, type[dwm])
            if (--index >= 0) {
                unusecodes = CODELIST[keys[index]].filter(level1 => !codes.includes(level1))
                count = unusecodes.length
                next()
            } else {
                email.sendMail(`init：${dwm} 成功！`)
                console.log('over');
                return
            }
        } else {
            // 3. 开始递归 获取 -> 存储
            setTimeout( async () => {
                let code = unusecodes[--count]
                let name = keys[index]
                console.log(code, '---', new Date().toLocaleString());
                getApi(code, 'history/trade', type[dwm]).then(async res1 => {
                    console.log(`${code}：${res1.code}`);
                    if (res1.code === 200) {
                        // 3.1 将成功的code存储
                        let sql = `INSERT INTO ig502_used(code, type, type1) VALUES(${code}, ${name.split('_')[2]}, '${dwm}')`
                        await getConnection(code, sql, dwm)
                        // 3.2 将数据写入数据库
                        await getConnection(code, addSql(code, res1.message, name, dwm), dwm)
                    } else if (res1.code === 404) {
                        let sql = `INSERT INTO ig502_404(code, type) VALUES(${code}, '${dwm}')`
                        await getConnection(code, sql, dwm)
                    }
                    next()
                }).catch(err => {
                    ++count
                    console.log(`${code}：${err.message}`);
                    next()
                })
                
            }, 2500);
        }
    }
    next()
}

function getApi(code, type, dwm) {
    return new Promise((reslove, reject) => {
        request({
            url: ig502.getUrl(code, type, dwm),
            method:'GET',
            headers:{'Content-Type':'text/json' }
        }, (error,response,body) => {
            console.log('调用接口成功');
            // 调完接口后，有可能就报错了，发个邮件通知一下
            timeId = setTimeout(() => {
                console.log('开始发送邮件');
                email.sendMail('已经三分钟了，任务好像失败了呢')
            }, 3 * 1000 * 60)
            if (error) {
                console.log(`${code}：error`);
                reject(`${code}：error`)
            }
            if (!body) {
                console.log(`${code} body is undefined !!!`);
                reject(`${code} body is undefined !!!`)
            }
            if (body.indexOf('404无资源') > -1) {
                code404.push(code)
                reslove({
                    message: `${code}：404无资源`,
                    code: 404
                })
            }
            else if (['503请求过于频繁', '基础版访问间隔2秒', 'licence访问受限'].includes(body)) {
                reslove({
                    message: `${code}：${body}`,
                    code: 503
                })
            }
            else if(!error && response.statusCode==200){
                usedCodes.push(code)
                reslove({
                    message: body,
                    code: 200
                })
            }
        })
    })
}

function getConnectionDB(code, sql) {
    return new Promise((reslove, reject) => {
        connection.query(sql, (err, result) => {
            if (err) {
                reject(`${code}: 查询失败`)
            } else {
                reslove({
                    code: 200,
                    message: `${code}: 查询成功`,
                    data: result
                })
            }
        })
    })
}
function getConnection(code, sql, dwm) {
    return new Promise((reslove, reject) => {
        connection.query(sql, (err, result) => {
            // 清除 发送失败内容的邮件
            clearTimeout(timeId)
            if (err) {
                failCodes.push(code)
                connection.query(`DELETE  FROM ig502_used WHERE code=${code} and type1='${dwm}'`)
                console.log(`${code}: ${err.message}`);
                reslove(`${code}: 写入失败`)
            } else {
                reslove(`${code}: 写入成功`)
            }
        })
    })
}

function addSql(code, body, name, dwm) {
    let json1 = JSON.parse(body)
    let add = `INSERT INTO ${name}(code,o,c,h,l,d,v,type) VALUES`
    let str = json1.map(level1 => {
        let { o,c,h,l,d,v } = level1
        return `(${code}, ${o}, ${c}, ${h}, ${l}, '${d}', ${v}, '${dwm}')`
    })
    add += str.join(',')
    return add
}


function createCodes(start, end) {
    let results = [];
    for (let i = start; i <= end; i++) {
        results.push((i+'').padStart(6, 0));
    }
    return results;
}

function someDay(days) {
    let today = new Date()
    let interval = 24 * 60 * 60 * 1000 * days
    let after = new Date(today - interval)
    let year = after.getFullYear()
    let month = after.getMonth() + 1 + ''
    let date = after.getDate() + ''
    return `${year}-${month.padStart(2, 0)}-${date.padStart(2, 0)}`
}

function write(buffer, dwm) {
    let date = new Date().toLocaleString()
    let str = `${date}：${dwm}\n${buffer}\n-----------------\n`
    fs.appendFile(`log.txt`, str,function (err) {
        if (err)
            throw err;
        console.log('写入完成');
    });
}



function wait(ms) {
    return new Promise(r => setTimeout(() => {
        console.log(4);
        r()
    }, ms));
}

async function initQuery(dwm = 'day') {
    const res1 = await getConnectionDB('ig502_404', `SELECT code FROM ig502_404 WHERE type='${dwm}'`)
    code404 = res1.data.map(level1 => level1.code).map(level1 => (level1+'').padStart(6, 0))
    const res2 = await getConnectionDB('ig502_used', `SELECT code FROM ig502_used WHERE type1='${dwm}'`)
    usedCodes = res2.data.map(level1 => level1.code).map(level1 => (level1+'').padStart(6, 0))
    const res3 = await getConnectionDB('ig502_today', `SELECT code FROM ig502_today WHERE type='${dwm}'`)
    todayCodes = res3.data.map(level1 => level1.code).map(level1 => (level1+'').padStart(6, 0))
    return new Promise((reslove, reject) => reslove())
}


function nodeSchedule() {
    // let rule = new schdule.RecurrenceRule(); 
    /**
     * rule: Object{
     *      date:null
     *      dayOfWeek:null
     *      hour:null
     *      minute:null
     *      month:null
     *      recurs:true
     *      second:0
     *      year:null
     * }
     */
    // 例： rule.hour = [1, 3, 4, 20]. 表示 每天 1点、3点、4点、晚上8点 运行
    // '* * * * * *' '秒分时日月周'
    // 例： 每日的12.30 -> '00 30 12 * * *'
    schdule.scheduleJob('00 30 16 * * *', () => {
        connection.query(`DELETE FROM ig502_today WHERE type = 'day'`, async (err, result) => {
            if (err) {
            } else {
                email.sendMail(`今天（${new Date().toLocaleString()}）的任务开始了`)
                await initQuery('day')
                update('day')
            }
        })
    })
    schdule.scheduleJob('00 30 2 * * 5', () => {
        // 每周六 的4.30 更新
        connection.query(`DELETE FROM ig502_today WHERE type = 'week'`, async (err, result) => {
            if (err) {
            } else {
                email.sendMail(`这周（${new Date().toLocaleString()}）的任务开始了`)
                await initQuery('week')
                update('week')
            }
        })
    })
    // schdule.scheduleJob('00 30 1 1 * *', () => {
    //     // 每月 1 号的 1.30 更新
    //     connection.query(`DELETE FROM ig502_today WHERE type = 'month'`, async (err, result) => {
    //         if (err) {
    //         } else {
    //             email.sendMail(`本月（${new Date().toLocaleString()}）的任务开始了`)
    //             await initQuery('month')
    //             update('month')
    //         }
    //     })
    // })
}

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
  