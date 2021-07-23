var mysql = require('mysql');
var mysql_config = {
    host : '8.141.209.61',
    user : 'root', 
    password : 'Meng519890',
    database : 'ig502_db',
    // insecureAuth: true
};

function handleDisconnection() {
   var connection = mysql.createConnection(mysql_config);
    connection.connect(function(err) {
        if(err) {
            setTimeout(handleDisconnection, 2000);
        } else {
            console.log('连接成功 id ' + connection.threadId);
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

module.exports =  handleDisconnection;