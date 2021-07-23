
const request = require('request')
const express = require('express')

const nodeExcel = require('node-xlsx');
const fs = require('fs');

const mysql = require('mysql');

const ig502 = require('./ig502')
const modelJs = require('./model')
const app = express()
const port = 3333

const CODELIST = createCodes(600000, 600999);
let usedCodes = []
let failCodes = []
let code404 = []
let stash = {}

global.example = {
    beforeFlag: true,
    downloadFlag: true,
    init: false
}
    
// 1. 设置跨域问题等
var allowCrossDomain = function(req, res, next) {//设置response头部的中间件  
    res.header('Access-Control-Allow-Origin', 'http://localhost:8000');//8089是vue项目的端口，这里相对于白名单  
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
            // 1. 将成功的 和 不存在 的code 都取出来
            const res1 = await getConnectionDB('ig502_404', 'SELECT code FROM ig502_404')
            code404 = res1.data.map(level1 => level1.code)
            const res2 = await getConnectionDB('ig502_used', 'SELECT code FROM ig502_used')
            usedCodes = res2.data.map(level1 => level1.code)

            // console.log(modelJs.all);
            
            // // 2. 初始化
            if (example.init) {
                // init()
            }
        }
    });

    connection.on('error', function(err) {
        console.error('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
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
app.get('/api/getfile',  async (req, res) => {
})

app.get('/api/init',  async (req, res) => {
    example.init = true
    init()
})

app.get('/api/before/download',  async (req, res) => {
    // 批量查询，一个select创建一个sql连接，影响性能
    // let strs = usedCodes.join(',')
    if (!example.beforeFlag) return
    let query = req.query
    let strs = createCodes(600000, 600999).join(',')
    let sql = `select * from ig502_datas where code in (${strs})`
    // 今天 之前的 几天， 例如 query.d = 7就是一周前，今天是7-23的7天前是7-16
    if (query.d) {
        // 7天前处理成 '2021-7-16'
        let days = someDay(query.d / 1) 
        // 查询某个时间段的值 (注意d是字符串类型)
        sql += `and d >= '${days}'`
    }
    console.log('开始查询 ig502_datas');
    example.beforeFlag= false
    connection.query(sql, (err, results) => {
        if (err) {
            console.log('查询ig502_datas失败:', err.message);
        }
        stash.list = results
        example.beforeFlag= true
        debugger
        console.log(`ig502_datas 共 ${ results.length } 条, 写入stsh 完成`);
    })
})

app.get('/api/download',  async (req, res) => {
    if (!example.downloadFlag) return
    example.downloadFlag = false
    getModelClick()
    console.log('准备写入');
    let header = [ 'code', 'date', 'type' ]
    let lists = []
    Object.keys(stash.results).forEach(level1 => {
        let datas = stash.results[level1]
        lists.push({
            name: level1,
            data: [
                header,
                ...datas
            ]
        }) 
    })
    const buffer = nodeExcel.build(lists);// list 的格式也需要跟上述格式一致
    console.log('开始写入');
    fs.writeFile('excelfile.xlsx', buffer, function (err) {
        if (err)
            throw err;
        example.downloadFlag = true
        console.log('写入完成');
    });
})

app.get('/api/testmodel',  async (req, res) => {
    getModelClick()
})


app.post('/api/checkDatas',  async (req, res) => {
    let data = ''
    req.on('data', chunk => {
        data += chunk
    })
    req.on('end', () => {
        let json1 = JSON.parse(data)
        let strs = json1.join(',')
        // 批量查询，一个select创建一个sql连接，影响性能
        let sql = `select * from ig502_datas where code in (${strs})`
        connection.query(sql, (err, results) => {
            if (err) {
                console.log('查询ig502_datas失败:', err.message);
            }
            res.send({
                code: 200,
                message: '成功',
                data: results
            })
        })
    })
})

app.get('/api/getusedcodes',  async (req, res) => {
    let sql = 'select * from ig502_used'
    connection.query(sql, (err, results) => {
        if (err) {
            console.log('查询ig502_used失败:', err.message);
        }
        let result = results.map(level1 => level1.code)
        res.send({
            code: 200,
            message: '成功',
            data: result
        })
    })
})


/**
 *  根据数据 搜索模型
 */

function getModelClick() {
    console.log('开始筛选');
    let datas = stash.list
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
        getModel(data, level1);
    });
    console.log('筛选结束');
}
function getModel(data, code) {
    let results = [];
    data.forEach((level1, start) => {
        let params = { data, start, results, code };
        switch (modelJs.all.YingYang(level1)) {
            case 1:
                modelJs.all.isQx1(params);
                modelJs.all.isQx2(params);
                // modelJs.all.isFkwz(params);
                // modelJs.all.isCsfr(params);
                break;
            case 2:
                modelJs.all.isYjsd(params);
                modelJs.all.isYydl(params); // ok
                // modelJs.all.isGsdn(params);
                // modelJs.all.isDY(params);
                break;
            default:
                break;
        }
    });
    if (!stash.results) {
        stash.results = {}
    }
    stash.results[code] = results
}
/********************************************* */


function init() {
     // 1. 将数据库中的404都拿出来，合并在一起
    let codes = code404.concat(usedCodes)
    // 2. 排除所有已失效的code
    let unusecodes = CODELIST.filter(level1 => !codes.includes(level1))
    
    let count = unusecodes.length
    let next = function () {
        if (count < 1) {
            console.log('over');
            return
        }
        // 3. 开始递归 获取 -> 存储
        setTimeout( async () => {
            let code = unusecodes[--count]
            console.log(code, '---', new Date().toLocaleString());
            const res1 = await getApi(code)
            debugger
            console.log(`${code}：${res1.code}`);
            if (res1.code === 200) {
                // 3.1 将成功的code存储
                let sql = `INSERT INTO ig502_used(code) VALUES(${code})`
                await getConnection(code, sql)
                // 3.2 将数据写入数据库
                await getConnection(code, addSql(code, res1.message))
            } else if (res1.code === 404) {
                let sql = `INSERT INTO ig502_404(code) VALUES(${code})`
                await getConnection(code, sql)
            }
            next()
        }, 3000);
    }
    next()
}

function getApi(code) {
    return new Promise((reslove, reject) => {
        request({
            url: ig502.getUrl(code),
            method:'GET',
            headers:{'Content-Type':'text/json' }
        }, (error,response,body) => {
            if (error) {
                reject(`${code}：error`)
            }
            if (!body) {
                reject(`${code} body is undefined !!!`)
            }
            if (body.indexOf('404无资源') > -1) {
                code404.push(code)
                reslove({
                    message: `${code}：404无资源`,
                    code: 404
                })
            }
            else if (body.indexOf('503请求过于频繁') > -1 || body.indexOf('基础版访问间隔2秒') > -1) {
                reslove({
                    message: `${code}：503请求过于频繁`,
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
function getConnection(code, sql) {
    return new Promise((reslove, reject) => {
        connection.query(sql, (err, result) => {
            if (err) {
                failCodes.push(code)
                connection.query(`DELETE  FROM ig502_used WHERE code=${code}`)
                debugger
                console.log(`${code}: ${err.message}`);
                reslove(`${code}: 写入失败`)
            } else {
                reslove(`${code}: 写入成功`)
            }
        })
    })
}

function addSql(code, body) {
    let json1 = JSON.parse(body)
    let add = `INSERT INTO ig502_datas(code,o,c,h,l,d,v) VALUES`
    let str = json1.map(level1 => {
        let { o,c,h,l,d,v } = level1
        return `(${code}, ${o}, ${c}, ${h}, ${l}, '${d}', ${v})`
    })
    add += str.join(',')
    return add
}


function createCodes(start, end) {
    let results = [];
    for (let i = start; i <= end; i++) {
        results.push(i);
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


function wait(ms) {
    return new Promise(r => setTimeout(() => {
        console.log(4);
        r()
    }, ms));
}


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
  