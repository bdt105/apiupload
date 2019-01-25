import { Toolbox } from "bdt105toolbox/dist"
import { SmartUpload } from "./smart.upload";
import { Connexion } from "bdt105connexion/dist";

let toolbox: Toolbox = new Toolbox();

var configuration = toolbox.loadFromJsonFile("configuration.json");
var excelFiles = toolbox.loadFromJsonFile("excelFiles.json");

var interval = configuration.ftp.ftpIntegrationInterval;
var removeFilesAfterSent = configuration.ftp.removeFilesAfterSent;

function computeDate(d1: Date, d2: Date) {
    let dif = d2.getTime() - d1.getTime();
    let minn = dif / 1000 / 60
    let min = Math.trunc(minn);
    let sec = minn - min;
    if (sec > 59) {
        sec -= 59;
        min++;
    }
    return { "minutes": min, "seconds": sec }
}

let integrateExcelFiles = () => {
    var fs = require('fs');
    let fileImportedCount = 0;
    fs.readdir(configuration.excel.fileDirectory, (error: any, files: any) => {
        if (!error) {
            for (var i = 0; i < files.length; i++) {
                let file = files[i];
                if (excelFiles) {
                    let excelFile = excelFiles[file]
                    if (excelFile && excelFile.active) {
                        configuration.mySql.multipleStatements = true;
                        var c = new Connexion(configuration.mySql, null);

                        let su = new SmartUpload(c, configuration, excelFile.owner);
                        let d1 = new Date();
                        toolbox.log("Start importing file " + file);
                        // if (excelFile.exportType == "mysql") {
                            su.importExcelFileToMySql((data: any, error: any) => {
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
}

integrateExcelFiles();
/*
setInterval(() => {
    integrateFtpFiles();
}, interval);
*/
