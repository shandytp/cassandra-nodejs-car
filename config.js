var express = require('express'),
    bodyParser = require('body-parser'),
    handlebars = require('express3-handlebars'),
    moment = require('moment');

module.exports = function (app) {
    app.engine('html', handlebars({
        defaultLayout: 'main',
        extname: ".html",
        layoutsDir: __dirname + '/views/layouts',
        helpers: {
            formatDate: function (value) {
                return moment(value).format('YYYY-MM-DD HH:mm:ss');
            },
            if_eq: function (a, b, opts) {
                if (a == b) {
                    return opts.fn(this);
                }
                else {
                    return opts.inverse(this);
                }
            }
        }
    }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');
    app.use(express.static(__dirname + '/public'));
};
