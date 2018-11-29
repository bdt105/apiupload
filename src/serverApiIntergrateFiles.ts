import { Toolbox } from "bdt105toolbox/dist"
import { SmartUpload } from "./smart.upload";
import { Connexion } from "bdt105connexion/dist";

let toolbox: Toolbox = new Toolbox();

var configuration = toolbox.loadFromJsonFile("configuration.json");

var interval = configuration.ftp.ftpIntegrationInterval;
var removeFilesAfterSent = configuration.ftp.removeFilesAfterSent;

let integrateFtpFiles = () => {
    var fs = require('fs');
    fs.readdir(configuration.ftp.ftpDirectory, (error: any, files: any) => {
        if (!error) {
            for (var i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.endsWith(".zip")) {
                    let fileRoot = file.replace(".zip", "");
                    let csvFileName = fileRoot + ".csv";
                    let confFileName = fileRoot + ".conf.json";
                    let zipFileName = file;
                    fs.copyFileSync(configuration.ftp.ftpDirectory + zipFileName, zipFileName);
                    toolbox.writeFileUnZip(
                        (data1: any, error1: any) => {
                            if (!error1) {
                                var fs = require('fs');
                                var dat = fs.readFileSync(confFileName);
                                var fs = require('fs');
                                let json = JSON.parse(dat);
                                let fileName = json.configuration.fileName;
                                let fields = json.fields;

                                var c = new Connexion(configuration.mySql, null);

                                let su = new SmartUpload(c, configuration, json.owner);
                                fs.copyFileSync(csvFileName, configuration.mySql.fileDirectory + csvFileName);

                                su.importCsvFile(
                                    (data2: any, error2: any) => {
                                        if (!error2) {
                                            if (removeFilesAfterSent) {
                                                try {
                                                    fs.unlinkSync(csvFileName);
                                                    fs.unlinkSync(confFileName);
                                                    fs.unlinkSync(configuration.ftp.ftpDirectory + zipFileName);
                                                } catch (error3) {
                                                    toolbox.logError(JSON.stringify(error) + JSON.stringify(error3));
                                                }
                                            }
                                            toolbox.log("File " + file + " imported");
                                        } else {
                                            toolbox.logError("File " + file + " NOT imported" + JSON.stringify(error2));
                                        }
                                    }, fileName, fields, csvFileName, 0, false);
                            } else {
                                toolbox.logError(error1);
                            }
                        }, zipFileName, true
                    )
                }
            }
        }
    });
}

integrateFtpFiles();

setInterval(() => {
    integrateFtpFiles();
}, interval);

