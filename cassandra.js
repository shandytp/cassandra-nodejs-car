var cql = require('node-cassandra-cql');
// const cassandra = require('cassandra-driver')
var client = new cql.Client({
    hosts: ['127.0.0.1:9042'], keyspace: 'used_cars'
});
module.exports = {
    client: client,
    cql: cql
};