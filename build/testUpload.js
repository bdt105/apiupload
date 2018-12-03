const express = require('express');
const bodyParser = require('body-parser');
const app = express();
var multer = require('multer');
const port = 8000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(port, () => {
    console.log('We are live on' + port);
});
var upload = multer({ dest: './upload/' });
app.post('/upload', upload.single('file'), function (req, res) {
    console.log(req.file);
    var fs = require('fs');
    fs.rename('./upload/' + req.file.filename, './upload/' + req.file.originalname, (err) => {
        if (err)
            throw err;
        res.send("file saved on server");
        fs.stat('./upload/' + req.file.originalname, (err, stats) => {
            if (err)
                throw err;
            console.log(`stats: ${JSON.stringify(stats)}`);
        });
    });
});
//# sourceMappingURL=testUpload.js.map