var express = require('express');
var app = express();

// const hostname = '127.0.0.1';
// const port = 3000;

require('./config')(app);
require('./routes')(app);
app.listen(3000);
// app.listen(port, () => console.log('Application is running on port ${port}'));
console.log('Application is running on port 3000');



// app.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });