"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("bdt105toolbox/dist");
const smart_upload_1 = require("./smart.upload");
const dist_2 = require("bdt105connexion/dist");
let toolbox = new dist_1.Toolbox();
var configuration = toolbox.loadFromJsonFile("configuration.json");
var interval = configuration.ftp.ftpIntegrationInterval;
var removeFilesAfterSent = configuration.ftp.removeFilesAfterSent;
let integrateFtpFiles = () => {
    var fs = require('fs');
    fs.readdir(configuration.ftp.ftpDirectory, (error, files) => {
        if (!error) {
            for (var i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.endsWith(".zip")) {
                    let fileRoot = file.replace(".zip", "");
                    let csvFileName = fileRoot + ".csv";
                    let confFileName = fileRoot + ".conf.json";
                    let zipFileName = file;
                    fs.copyFileSync(configuration.ftp.ftpDirectory + zipFileName, zipFileName);
                    toolbox.writeFileUnZip((data1, error1) => {
                        if (!error1) {
                            var fs = require('fs');
                            var dat = fs.readFileSync(confFileName);
                            var fs = require('fs');
                            let json = JSON.parse(dat);
                            let fileName = json.configuration.fileName;
                            let fields = json.fields;
                            var c = new dist_2.Connexion(configuration.mySql, null);
                            let su = new smart_upload_1.SmartUpload(c, configuration, json.owner);
                            fs.copyFileSync(csvFileName, configuration.mySql.fileDirectory + csvFileName);
                            su.importCsvFile((data2, error2) => {
                                if (!error2) {
                                    if (removeFilesAfterSent) {
                                        try {
                                            fs.unlinkSync(csvFileName);
                                            fs.unlinkSync(confFileName);
                                            fs.unlinkSync(configuration.ftp.ftpDirectory + zipFileName);
                                        }
                                        catch (error3) {
                                            toolbox.logError(JSON.stringify(error) + JSON.stringify(error3));
                                        }
                                    }
                                    toolbox.log("File " + file + " imported");
                                }
                                else {
                                    toolbox.logError("File " + file + " NOT imported" + JSON.stringify(error2));
                                }
                            }, fileName, fields, csvFileName, 0, json.configuration.newFile, dat);
                        }
                        else {
                            toolbox.logError(error1);
                        }
                    }, zipFileName, true);
                }
            }
        }
    });
};
integrateFtpFiles();
/*
setInterval(() => {
    integrateFtpFiles();
}, interval);
*/
//# sourceMappingURL=serverIntergrateFiles.js.map