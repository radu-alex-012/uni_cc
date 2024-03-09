const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname});
});
app.post('/submit-student-data', function (req, res) {
    var name = req.body.firstName + ' ' + req.body.lastName;
    res.send(name + ' submitted successfully!');
});

const server = app.listen(3000, () => {
    console.log('Server is running at port 3000');
});