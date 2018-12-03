"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("bdt105toolbox/dist");
const smart_upload_1 = require("./smart.upload");
const dist_2 = require("bdt105connexion/dist");
let toolbox = new dist_1.Toolbox();
var configuration = toolbox.loadFromJsonFile("configuration.json");
const csvFileName = "listArticles.csv";
const confFileName = "listArticles.conf.json";
const zipFileName = "listArticles.zip";
var fs = require('fs');
fs.copyFileSync(configuration.common.ftpDirectory + zipFileName, zipFileName);
toolbox.writeFileUnZip((data, error) => {
    var fs = require('fs');
    var dat = fs.readFileSync(confFileName);
    var fs = require('fs');
    let json = JSON.parse(dat);
    let fileName = json.configuration.fileName;
    let fields = json.fields;
    var c = new dist_2.Connexion(configuration.mySql, null);
    let su = new smart_upload_1.SmartUpload(c, configuration, json.owner);
    fs.copyFileSync(csvFileName, configuration.mySql.fileDirectory + csvFileName);
    su.importCsvFile((data, error) => {
        console.log("Ok");
    }, fileName, fields, csvFileName, 0, true);
}, zipFileName, false);
//# sourceMappingURL=testImportCsv.js.map