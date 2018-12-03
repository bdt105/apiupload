"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const myToolbox_1 = require("./myToolbox");
const util_1 = require("util");
class SmartUpload {
    //private uploadInfo: any = {};
    constructor(connexion, configuration, owner) {
        this.myToolbox = new myToolbox_1.MyToolbox();
        this.enclosed = "|";
        this.separator = ";";
        this.lineSeparator = "##";
        this.connexion = connexion;
        this.configuration = configuration;
        this.owner = owner;
    }
    logMessage(message) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(message)) {
                console.log(JSON.stringify(message) + " --- " + this.owner);
            }
            else {
                console.log(message + " --- " + this.owner);
            }
        }
    }
    logError(error) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(error)) {
                console.error(JSON.stringify(error) + " --- " + this.owner);
            }
            else {
                console.error(error + " --- " + this.owner);
            }
        }
    }
    errorMessage(text) {
        let ret = { "status": "ERR", "message": text };
        this.logError(ret);
        return ret;
    }
    respond(response, statusCode, data = null) {
        if (statusCode != 200) {
            this.logError(data);
        }
        else {
            this.logMessage(data);
        }
        response.status(statusCode);
        if (util_1.isObject(data)) {
            response.setHeader('content-type', 'application/json');
        }
        else {
            response.setHeader('content-type', 'test/plain');
        }
        response.send(JSON.stringify(data));
    }
    sendEmail(sendTo, subject, html) {
        var nodemailer = require('nodemailer');
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configuration.common.email,
                pass: this.configuration.common.password
            }
        });
        const mailOptions = {
            from: this.configuration.common.email,
            to: sendTo,
            subject: subject,
            html: html // plain text body
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                this.logError(error);
            }
            else {
                this.logMessage(info);
            }
        });
    }
    writeCsvFile(directory, fileName, csvObject, headerRowNumber) {
        var fs = require('fs');
        let headers = csvObject[headerRowNumber];
        let head = Object.keys(headers);
        let rows = Object.keys(csvObject);
        if (fs.existsSync(directory + fileName)) {
            fs.unlinkSync(directory + fileName);
        }
        for (var r = 0; r < rows.length; r++) {
            var l = "";
            /*
                        var l = this.enclosed + rows[r] + this.enclosed + this.separator + // Row
                            this.enclosed + (rows[r] == headerRowNumber + "" ? "header" : "row") + this.enclosed + this.separator + // Favorite
                            this.enclosed + "0" + this.enclosed; // favorite
            */
            for (var c = 0; c < head.length; c++) {
                let value = csvObject[rows[r]][head[c]];
                l += (l ? this.separator : "") + this.enclosed + (value ? value : "") + this.enclosed;
            }
            fs.appendFileSync(directory + fileName, l + this.lineSeparator);
        }
    }
    importCsvToTable(callback, csvFileName, tableName) {
        let mysqlDirectory = this.configuration.mySql.fileDirectory;
        let sql = "LOAD DATA INFILE '" + mysqlDirectory + csvFileName + "' " +
            "INTO TABLE `" + tableName + "` CHARACTER SET utf8 " +
            "FIELDS TERMINATED BY '" + this.separator + "' " +
            "ENCLOSED BY '" + this.enclosed + "' " +
            "LINES TERMINATED BY '" + this.lineSeparator + "';";
        var fs = require('fs');
        this.connexion.querySql((error, data) => {
            if (!error) {
                this.customizeTable((data1, error1) => {
                    fs.unlinkSync(mysqlDirectory + csvFileName);
                    callback(data1, error1);
                }, tableName);
            }
            else {
                callback(data, error);
            }
        }, sql);
    }
    customizeTable(callback, tableName) {
        let sql = "ALTER TABLE `" + tableName + "` " +
            "ADD COLUMN `row` INT(11) NOT NULL AUTO_INCREMENT FIRST, " +
            "ADD COLUMN `type` VARCHAR(6) NULL DEFAULT 'row' AFTER `row` , " +
            "ADD COLUMN `favorite` VARCHAR(1) NULL DEFAULT '0' AFTER `type`, " +
            "ADD PRIMARY KEY (`row`);";
        this.connexion.querySql((error, data) => {
            if (!error) {
                let sql1 = "UPDATE `" + tableName + "` SET `type`='header' where row = 1 ";
                this.connexion.querySql((error1, data1) => {
                    callback(data1, error1);
                }, sql1);
            }
            else {
                callback(data, error);
            }
        }, sql);
    }
    createTable(callback, tableName, fields, fieldSize) {
        let fieldScript = "";
        for (var i = 0; i < fields.length; i++) {
            fieldScript += (fieldScript ? ", " : "") + "`" + fields[i] + "` varchar(" + fieldSize + ")";
        }
        let createTableSql = "CREATE TABLE `" + tableName + "` (" + fieldScript + ") ENGINE=InnoDB DEFAULT CHARSET=utf8; ";
        this.connexion.querySql((error, data) => {
            callback(data, error);
        }, createTableSql);
    }
    dropTable(callback, tableName) {
        if (tableName) {
            let dropTable = "DROP TABLE IF EXISTS `" + tableName + "`";
            this.connexion.querySql((error, data) => {
                callback(data, error);
            }, dropTable);
        }
        else {
            callback(null, null);
        }
    }
    excelFileToCsvJson(fileName, sheetName, headerRowNumber) {
        var fs = require('fs');
        var XLSX = require('xlsx');
        this.logMessage("Start Excel parsing");
        var buf = fs.readFileSync(fileName);
        var wb = null;
        try {
            wb = XLSX.read(buf, { type: 'buffer' });
        }
        catch (error) {
        }
        this.logMessage("Excel parsing done");
        this.logMessage("Start Excel to csv process");
        if (wb) {
            let mySheet = wb.Sheets[sheetName];
            if (!mySheet) {
                let first = Object.keys(wb.Sheets)[0];
                mySheet = wb.Sheets[first];
            }
            if (mySheet) {
                let id = 0;
                let ret = {};
                for (var key in mySheet) {
                    let column = key.replace(/[0-9]/g, '');
                    let row = Number.parseInt(key.replace(/[^0-9]/g, ''));
                    if (!Number.isNaN(row) && row >= headerRowNumber) {
                        let l = this.enclosed + id.toString() + this.enclosed;
                        l += this.separator + this.enclosed + column + this.enclosed;
                        l += this.separator + this.enclosed + row + this.enclosed;
                        if (row == headerRowNumber) {
                            l += this.separator + this.enclosed + 'header' + this.enclosed;
                        }
                        else {
                            l += this.separator + this.enclosed + 'value' + this.enclosed;
                        }
                        l += this.separator + this.enclosed + this.myToolbox.escapeString(mySheet[key].w, true) + this.enclosed;
                        id += 1;
                        if (!ret[row]) {
                            ret[row] = [];
                        }
                        ret[row][column] = this.myToolbox.escapeString(mySheet[key].w, true);
                    }
                }
                this.logMessage("End Excel to csv process");
                return ret;
            }
        }
        return null;
    }
    csvFileToCsvJson(callback, fileName) {
        this.logMessage("Start Csv to Json");
        let csv = require('csvtojson');
        let converter = csv({
            "delimiter": this.separator,
            "quote": this.enclosed,
            "eol": this.lineSeparator
        }, null);
        converter.fromFile(fileName).then((data) => {
            callback(data);
            this.logMessage("End Csv to Json");
        });
    }
    deleteConfigurationFile(callback, idconfiguration, deleteItemsPlus) {
        if (idconfiguration) {
            this.loadConfigurationFile((data, error) => {
                if (!error) {
                    if (data && data.length > 0) {
                        let tableName = data[0].tableName;
                        this.dropTable((data1, error1) => {
                            if (!error1) {
                                let sql = "delete from configuration where idconfiguration=" + idconfiguration;
                                this.connexion.querySql((error, data) => {
                                    if (!error) {
                                        if (deleteItemsPlus) {
                                            let sql1 = "delete from itemplus where tableName='" + tableName + "'";
                                            this.connexion.querySql((error, data) => {
                                                if (!error) {
                                                    this.logMessage("itemplus data deleted " + JSON.stringify(data));
                                                    let sql1 = "delete from message where tableName='" + tableName + "'";
                                                    this.connexion.querySql((error, data) => {
                                                        if (!error) {
                                                            this.logMessage("message data deleted " + JSON.stringify(data));
                                                        }
                                                        else {
                                                            this.logMessage("message data NOT deleted " + JSON.stringify(data));
                                                        }
                                                    }, sql1);
                                                }
                                                else {
                                                    this.logMessage("itemplus data NOT deleted " + JSON.stringify(data));
                                                }
                                                callback(data, error);
                                            }, sql1);
                                            callback(data, error);
                                        }
                                        this.logMessage("Configuration data deleted " + JSON.stringify(data));
                                    }
                                    else {
                                        this.errorMessage("Configuration data NOT deleted " + JSON.stringify(error));
                                    }
                                    callback(data, error);
                                }, sql);
                            }
                            else {
                                callback(data1, error1);
                            }
                        }, tableName);
                    }
                }
            }, "idconfiguration", idconfiguration.toString());
        }
    }
    insertConfigurationFile(callback, tableName, originalFileName, headerRowNumber, configuration) {
        let sql = "insert into configuration (fileName, tableName, headerRowNumber, owner, title, displayLabel, configuration) values (" +
            "'" + originalFileName + "', '" + tableName + "', " +
            headerRowNumber + ", '" + this.owner + "', '" + originalFileName + "', 1, '" + configuration + "')";
        this.connexion.querySql((error, data) => {
            if (!error) {
                this.logMessage("Configuration data saved (insert) " + JSON.stringify(data));
            }
            else {
                this.errorMessage("Configuration data NOT saved (insert) " + JSON.stringify(error));
            }
            callback(data, error);
        }, sql);
    }
    updateConfigurationFile(callback, idconfiguration, tableName, configuration) {
        let sql = "update configuration set tableName='" + tableName + "', configuration='" + configuration + "' where idconfiguration=" + idconfiguration;
        this.connexion.querySql((error, data) => {
            if (!error) {
                this.idconfiguration = idconfiguration;
                this.logMessage("Configuration data saved (update) " + JSON.stringify(data));
            }
            else {
                this.errorMessage("Configuration data NOT saved (update) " + JSON.stringify(error));
            }
            callback(data, error);
        }, sql);
    }
    loadConfigurationFile(callback, field, value) {
        let sql = "select * from configuration where " + field + "='" + value + "'";
        this.connexion.querySql((error, data) => {
            callback(data, error);
        }, sql);
    }
    saveConfigurationFile(callback, tableName, originalFileName, headerRowNumber, idconfiguration, configuration) {
        if (idconfiguration) {
            this.updateConfigurationFile((data1, error1) => {
                callback(data1, error1);
            }, idconfiguration, tableName, configuration);
        }
        else {
            this.insertConfigurationFile((data, error) => {
                this.idconfiguration = data.insertId;
                callback(data, error);
            }, tableName, originalFileName, headerRowNumber, configuration);
        }
    }
    // public prepareData(data: any) {
    //     let ret: any = {};
    //     for (var i = 0; i < data.length; i++) {
    //         ret[i] = data[i];
    //     }
    //     return ret;
    // }
    configureAndImport(callback, fileName, csvFileName, fields, headerRowNumber, idconfiguration, tableName, configuration) {
        this.dropTable((data, error) => {
            if (!error) {
                this.createTable((data1, error1) => {
                    if (!error1) {
                        this.saveConfigurationFile((data2, error2) => {
                            if (!error2) {
                                this.importCsvToTable((data3, error3) => {
                                    callback(data3, error3);
                                }, csvFileName, tableName);
                            }
                            else {
                                callback(data2, error2);
                            }
                        }, tableName, fileName, headerRowNumber, idconfiguration, configuration);
                    }
                    else {
                        callback(data1, error1);
                    }
                }, tableName, fields, 200);
            }
            else {
                callback(data, error);
            }
        }, tableName);
    }
    importCsvFile(callback, fileName, fields, csvFileName, headerRowNumber, newFile, configuration) {
        this.idconfiguration = null;
        this.loadConfigurationFile((data, error) => {
            if (!error) {
                let tableName = this.myToolbox.getUniqueId();
                if (data && data.length > 0) {
                    tableName = !newFile ? data[0].tableName : tableName;
                    this.idconfiguration = !newFile ? data[0].idconfiguration : null;
                    if (this.idconfiguration) {
                        this.configureAndImport((data2, error2) => {
                            callback(data2, error2);
                        }, fileName, csvFileName, fields, headerRowNumber, this.idconfiguration, tableName, configuration);
                    }
                    else {
                        this.configureAndImport((data2, error2) => {
                            callback(data2, error2);
                        }, fileName, csvFileName, fields, headerRowNumber, null, tableName, configuration);
                    }
                }
                else {
                    this.configureAndImport((data2, error2) => {
                        callback(data2, error2);
                    }, fileName, csvFileName, fields, headerRowNumber, null, tableName, configuration);
                }
            }
            else {
                callback(null, error);
            }
        }, "fileName", fileName);
    }
    importExcelFile(callback, directory, fileName, downloadFileName, sheetName, headerRowNumber, newFile) {
        let csvObject = null;
        let fields = null;
        csvObject = this.excelFileToCsvJson(directory + downloadFileName, sheetName, headerRowNumber);
        let mysqlDirectory = this.configuration.mySql.fileDirectory;
        this.writeCsvFile(mysqlDirectory, downloadFileName, csvObject, headerRowNumber);
        fields = Object.keys(csvObject[headerRowNumber]);
        if (fields) {
            this.importCsvFile(callback, fileName, fields, downloadFileName, headerRowNumber, newFile, null);
        }
        else {
            callback(null, { "error": "Error reading csv" });
        }
    }
}
exports.SmartUpload = SmartUpload;
//# sourceMappingURL=smart.upload.js.map