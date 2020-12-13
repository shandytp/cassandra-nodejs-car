var cassandra = require('./cassandra'),
    client = cassandra.client,
    cql = cassandra.cql,
    Promise = require('promise');

module.exports = function (app) {
    // all of the following methods go here
    app.get('/', function (req, res) {
        client.execute('SELECT dateOf(date) as date, username,\
        brand, color, mileage, model, price, year \
        FROM car_offers', [],
            function (err, result) {
                if (err) {
                    res.render('500');
                } else {
                    res.render('home', { rows: result.rows });
                }
            });
    });

    app.get('/show/adduser', function (req, res) {
        res.render('add_user', {});
    });
    app.post('/adduser', function (req, res) {
        client.execute('INSERT INTO users (\
        username, emails, first_name, last_name,\
        password, state)\
        VALUES (?, null, ?, ?, null, null) IF NOT EXISTS',
            [req.param('username'), req.param('first_name'),
            req.param('last_name')],
            function (err) {
                if (err) {
                    res.render('add_user', {
                        username: req.param('username'),
                        first_name: req.param('first_name'),
                        last_name: req.param('last_name'),
                        errorOccured: true
                    });
                } else {
                    res.redirect('/');
                }
            });
    });

    app.get('/show/addoffer', function (req, res) {
        client.execute('SELECT username, first_name, last_name \
        FROM users', [],
            function (err, users) {
                if (err) {
                    res.render('500');
                } else {
                    res.render('add_offer', { users: users.rows });
                }
            });
    });

    app.post('/addoffer', function (req, res) {
        var offer_timeuuid = cql.types.timeuuid();
        client.execute('INSERT INTO car_offers (\
        country, date, brand, color, equipment,\
        mileage, model, price, username, year)\
        VALUES (?, ?, ?, ?, null, ?, ?, ?, ?, ?)',
            [req.param('country'),
                offer_timeuuid,
            req.param('brand'),
            req.param('color'),
            parseInt(req.param('mileage'), 10),
            req.param('model'),
            {
                value: parseFloat(req.param('price')),
                hint: cql.types.dataTypes.float
            },
            req.param('username'),
            parseInt(req.param('year'), 10)],
            function (err) {
                if (err) {
                    res.render('add_offer', {
                        brand: req.param('brand'),
                        color: req.param('color'),
                        mileage: req.param('mileage'),
                        model: req.param('model'),
                        price: req.param('price'),
                        username: req.param('username'),
                        year: req.param('year'),
                        errorOccured: true
                    });
                } else {
                    makeSearchIndexEntries(
                        req.param('brand'),
                        req.param('color'),
                        parseFloat(req.param('price')),
                        offer_timeuuid, req.param('country'));

                    res.redirect('/');
                }
            });
    });

    function makeSearchIndexEntries(brand, color, price, date, country) {
        var insertQuery = 'INSERT INTO car_offers_search_index\
        (brand, color, price_range, creation_time, date, country)\
        VALUES (?, ?, ?, now(), ?, ?)';

        brand = brand.toLowerCase();
        color = color.toLowerCase();
        var price_range = convertPriceToRange(price);

        var queries = [
            { query: insertQuery, params: ['', '', '', date, country] },
            { query: insertQuery, params: ['', '', price_range, date, country] },
            { query: insertQuery, params: ['', color, '', date, country] },
            { query: insertQuery, params: ['', color, price_range, date, country] },
            { query: insertQuery, params: [brand, '', '', date, country] },
            { query: insertQuery, params: [brand, '', price_range, date, country] },
            { query: insertQuery, params: [brand, color, '', date, country] },
            { query: insertQuery, params: [brand, color, price_range, date, country] }
        ];
        var consistency = cql.types.consistencies.one;
        client.executeBatch(queries, consistency, function (err) {
            if (err) {
                console.log('error inserting ');
            }
        });
    }
    function convertPriceToRange(price) {
        if (price > 0) {
            if (price < 1000) {
                return '1';
            }
            if (price < 3000) {
                return '2';
            }
            if (price < 5000) {
                return '3';
            }
            if (price < 10000) {
                return '4';
            }
            return '5';
        }
        return '0';
    }

    app.get('/show/search', function (req, res) {
        res.render('search', {});
    });

    app.post('/search', function (req, res) {
        var accumulator = [];

        var brand = req.param('brand').toLowerCase();
        var color = req.param('color').toLowerCase();
        var price_range = req.param('price_range');

        client.execute('SELECT country, date \
        FROM car_offers_search_index \
        WHERE brand=? AND color=? AND price_range = ?',
            [brand, color, price_range],
            function (err, result) {
                if (!err) {
                    var prevPromise = Promise.resolve();
                    result.rows.forEach(function (row) {
                        prevPromise = prevPromise.then(function () {
                            return new Promise(function (resolve, reject) {
                                client.execute(
                                    'SELECT dateOf(date) as date, username,\
        brand, color, mileage, model, price, year \
        FROM car_offers \
        WHERE country = ? AND date = ?',
                                    [row.get('country'), row.get('date')],
                                    function (err, result) {
                                        resolve(result.rows[0]);
                                    });
                            });
                        }).then(function (value) {
                            accumulator.push(value);
                        });
                    });
                    prevPromise.then(function () {
                        res.render('search', {
                            brand: req.param('brand'),
                            color: req.param('color'),
                            price_range: req.param('price_range'),
                            results: accumulator
                        });
                    });
                }
                else {
                    res.render('search', {
                        brand: req.param('brand'),
                        color: req.param('color'),
                        price_range: req.param('price_range')
                    });
                }
            });
    });




};
