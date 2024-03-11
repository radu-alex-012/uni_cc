const mysql = require('mysql2');

function createDatabaseConnection(databaseName) {
    const connection = mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'BZvkL6bq2KX!ZkjdL@%ok*k*EtgkCz',
        database: databaseName,
    });

    return connection.promise();
}

module.exports = createDatabaseConnection;