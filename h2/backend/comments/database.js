const mysql = require('mysql2/promise');

async function createPool(databaseName){
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'BZvkL6bq2KX!ZkjdL@%ok*k*EtgkCz',
        database: databaseName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
    return mysql.createPool(dbConfig);
}

module.exports = createPool;