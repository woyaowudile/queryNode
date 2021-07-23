
const LICENCE = '3E68261B-3A3D-88E6-E903-B0C327D49AA4';

// function getUrl(code) {
//     return `http://ig507.com/data/time/history/trade/${code}/Day_qfq?licence=${LICENCE}`
// }

module.exports = {
    getUrl: (code) => {
        return `http://ig507.com/data/time/history/trade/${code}/Day_qfq?licence=${LICENCE}`
    }
}
// export {
//     getUrl
// }
// request(getUrl(code), function(err, response, body){
//   //err 当前接口请求错误信息
//   //response 一般使用statusCode来获取接口的http的执行状态
//   //body 当前接口response返回的具体数据 返回的是一个jsonString类型的数据 
//   //需要通过JSON.parse(body)来转换
//   if(!err && response.statusCode == 200){
//     //todoJSON.parse(body)
//     var res = JSON.parse(body);
//   }
// }