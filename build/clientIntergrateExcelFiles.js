"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("bdt105toolbox/dist");
const smart_upload_1 = require("./smart.upload");
const dist_2 = require("bdt105connexion/dist");
let toolbox = new dist_1.Toolbox();
var configuration = toolbox.loadFromJsonFile("configuration.json");
var excelFiles = toolbox.loadFromJsonFile("excelFiles.json");
var interval = configuration.ftp.ftpIntegrationInterval;
var removeFilesAfterSent = configuration.ftp.removeFilesAfterSent;
function computeDate(d1, d2) {
    let dif = d2.getTime() - d1.getTime();
    let minn = dif / 1000 / 60;
    let min = Math.trunc(minn);
    let sec = minn - min;
    if (sec > 59) {
        sec -= 59;
        min++;
    }
    return { "minutes": min, "seconds": sec };
}
let integrateExcelFiles = () => {
    var fs = require('fs');
    let fileImportedCount = 0;
    fs.readdir(configuration.excel.fileDirectory, (error, files) => {
        if (!error) {
            for (var i = 0; i < files.length; i++) {
                let file = files[i];
                if (excelFiles) {
                    let excelFile = excelFiles[file];
                    if (excelFile && excelFile.active) {
                        configuration.mySql.multipleStatements = true;
                        var c = new dist_2.Connexion(configuration.mySql, null);
                        let su = new smart_upload_1.SmartUpload(c, configuration, excelFile.owner);
                        let d1 = new Date();
                        toolbox.log("Start importing file " + file);
                        // if (excelFile.exportType == "mysql") {
                        su.importExcelFileToMySql((data, error) => {
                            let d2 = new Date();
                            let dif = computeDate(d1, d2);
                            toolbox.log("File " + file + " imported in " + dif.minutes + " minutes and " + dif.seconds + " seconds");
                            toolbox.log("Records: " + data.result.rowCount + ", record ok: " + data.result.ok + ", not ok: " + data.result.nok);
                            fileImportedCount++;
                            if (error) {
                                console.error(error);
                            }
                            if (excelFile.removeAfterImport) {
                                fs.unlinkSync(file);
                            }
                        }, file, excelFile.sheetName, excelFile.headerRowNumber, excelFile.overwrite, excelFile.fields, excelFile.importStep ? excelFile.importStep : 20);
                        // }
                        /*
                                                if (excelFile.exportType == "elasticsearch") {
                                                    su.importExcelFileToElasticsearch((data: any, error: any) => {
                                                        let d2 = new Date();
                                                        let dif = computeDate(d1, d2);
                                                        toolbox.log("File " + file + " imported in " + dif.minutes + " minutes and " + dif.seconds + " seconds");
                                                        //toolbox.log("Records: " + data.result.rowCount + ", record ok: " + data.result.ok + ", not ok: " + data.result.nok);
                        
                                                        fileImportedCount++;
                                                        if (error) {
                                                            console.error(error);
                                                        }
                                                        if (excelFile.removeAfterImport) {
                                                            fs.unlinkSync(file);
                                                        }
                                                    }, file, excelFile.sheetName, excelFile.headerRowNumber, excelFile.overwrite, excelFile.keyFields)
                                                }
                        */
                    }
                }
            }
        }
    });
};
integrateExcelFiles();
/*
setInterval(() => {
    integrateFtpFiles();
}, interval);
*/
//# sourceMappingURL=clientIntergrateExcelFiles.js.map