import express = require('express');
import { MyToolbox } from "./myToolbox";
import { Connexion, JwtConfiguration } from 'bdt105connexion/dist';
import { ApiUpload } from './api.upload';

let app = express();
let myToolbox = new MyToolbox();
let port = myToolbox.getConfiguration().common.uploadApiPort;

// For POST-Support
let bodyParser = require('body-parser');

process.on('uncaughtException', function (err) {
    console.error(err);
    console.error("Node NOT Exiting...");
    console.log(err);
    console.log("Node NOT Exiting...");
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // Request methods you wish to allow    
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type'); // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Set to true if you need the website to include cookies in the requests sent, to the API (e.g. in case you use sessions)
    // Pass to next layer of middleware
    next();
});

// Only secret is needed bacause no token will be created here, only token check. Secret here must be the same as sender.
let jwtConfiguration = null;
if (myToolbox.getConfiguration().authentification && myToolbox.getConfiguration().authentification.active) {
    jwtConfiguration = new JwtConfiguration(myToolbox.getConfiguration().authentification.secret, "", "", "");
}

// No access to database only check if token is ok
var conn = new Connexion(myToolbox.getConfiguration().mySql, jwtConfiguration);
var multer = require('multer');
var upload = multer({ dest: myToolbox.getConfiguration().common.uploadDirectory });

let us = new ApiUpload(app, upload, conn, myToolbox.getConfiguration());
us.assign();

app.listen(port);
conn.tryConnectSql();

myToolbox.logg("Listening upload on port " + port.toString());