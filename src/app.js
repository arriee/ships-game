const express = require('express');
const path = require('path');

const app = express();

const publicDirPath = path.join(__dirname, '../public');

app.use(express.static(publicDirPath));

app.get('', ((req, res) => {
    res.render('index');
}))

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})