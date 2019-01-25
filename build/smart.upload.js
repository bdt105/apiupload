"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const myToolbox_1 = require("./myToolbox");
const dist_1 = require("bdt105toolbox/dist");
const util_1 = require("util");
class SmartUpload {
    //private uploadInfo: any = {};
    constructor(connexion, configuration, owner) {
        this.myToolbox = new myToolbox_1.MyToolbox();
        this.rest = new dist_1.Rest();
        this.enclosed = "|";
        this.separator = ";";
        this.lineSeparator = "##";
        this.logFile = null;
        this.connexion = connexion;
        this.configuration = configuration;
        this.owner = owner;
    }
    logMessage(message) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(message)) {
                this.myToolbox.log(JSON.stringify(message) + " --- " + this.owner, this.logFile, this.logFile == null);
            }
            else {
                this.myToolbox.log(message + " --- " + this.owner, this.logFile, this.logFile == null);
            }
        }
    }
    logError(error) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(error)) {
                this.myToolbox.errorMessage(JSON.stringify(error) + " --- " + this.owner);
            }
            else {
                this.myToolbox.errorMessage(error + " --- " + this.owner);
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
    createTable(callback, tableName, fieldsDefinition) {
        let fieldScript = "";
        let indexUnique = "";
        for (var i = 0; i < fieldsDefinition.length; i++) {
            let fieldName = this.myToolbox.escapeString(fieldsDefinition[i].name, true);
            fieldScript += (fieldScript ? ", " : "") +
                "`" + fieldName + "` " + fieldsDefinition[i].type + "(" + fieldsDefinition[i].size + ")";
            if (fieldsDefinition[i].isKey) {
                indexUnique += (indexUnique ? ", " : "") + "`" + fieldName + "` ASC";
            }
        }
        if (indexUnique) {
            indexUnique = ", UNIQUE INDEX (" + indexUnique + ")";
        }
        let createTableSql = "CREATE TABLE IF NOT EXISTS `" + tableName + "` (`id` INT NOT NULL AUTO_INCREMENT, " + fieldScript + indexUnique + ", PRIMARY KEY (`id`))" + " ENGINE=InnoDB DEFAULT CHARSET=utf8; ";
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
    excelFileToJson(fileName, sheetName) {
        var fs = require('fs');
        var XLSX = require('xlsx');
        // this.logMessage("Start Excel parsing");
        var buf = fs.readFileSync(fileName);
        var wb = null;
        try {
            wb = XLSX.read(buf, { type: 'buffer' });
        }
        catch (error) {
        }
        // this.logMessage("Excel parsing done");
        // this.logMessage("Start Excel to json process");
        let mySheet = null;
        if (wb) {
            mySheet = wb.Sheets[sheetName];
            if (!mySheet) {
                let first = Object.keys(wb.Sheets)[0];
                mySheet = wb.Sheets[first];
            }
        }
        // this.logMessage("End Excel to json process");
        return mySheet;
    }
    excelToProperJsonMySql(fileName, sheetName, headerRowNumber) {
        // this.logMessage("Start Excel to proper json process");
        let sheet = this.excelFileToJson(fileName, sheetName);
        let res = {};
        if (sheet) {
            for (var key in sheet) {
                let column = key.replace(/[0-9]/g, '');
                let row = Number.parseInt(key.replace(/[^0-9]/g, ''));
                if (!Number.isNaN(row) && row >= headerRowNumber) {
                    if (!res[row]) {
                        res[row] = [];
                    }
                    res[row].push({ "row": row, "column": column, "value": sheet[key].w });
                }
            }
        }
        return res;
    }
    excelToProperJsonElasticsearch(fileName, sheetName, headerRowNumber, index, keyFields) {
        let sheet = this.excelFileToJson(fileName, sheetName);
        let res = {};
        if (sheet) {
            for (var key in sheet) {
                let column = key.replace(/[0-9]/g, '');
                let row = Number.parseInt(key.replace(/[^0-9]/g, ''));
                if (!Number.isNaN(row) && row >= headerRowNumber) {
                    if (!res[row]) {
                        res[row] = [];
                    }
                    res[row].push({ "row": row, "column": column, "value": sheet[key].w });
                }
            }
        }
        let headers = res[headerRowNumber];
        let res2 = [];
        for (key in res) {
            if (key != headerRowNumber.toString()) {
                let obj = {};
                for (var i = 0; i < headers.length; i++) {
                    obj[headers[i].value] = res[key][i] ? res[key][i].value.trim() : "";
                }
                res2.push(obj);
            }
        }
        return res2;
    }
    excelFileToCsvJson(fileName, sheetName, headerRowNumber) {
        let mySheet = this.excelFileToJson(fileName, sheetName);
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
        return null;
    }
    runQueryRecursive(callback, queries, count, maxRowcount, result) {
        this.connexion.queryPool((error, data) => {
            count++;
            if (error) {
                result.nok += queries[count - 1].count;
            }
            else {
                result.ok += queries[count - 1].count;
            }
            //this.myToolbox.log(!error ? count + " Record saved" : error);
            if (count == maxRowcount) {
                data.result = result;
                callback(data, error);
            }
            else {
                this.runQueryRecursive(callback, queries, count, maxRowcount, result);
            }
        }, queries[count].sql);
    }
    importJsonToMysql(callback, json, tableName, headerRowNumber, importStep = 20) {
        if (json) {
            let fieldsSql = "";
            let fields = [];
            let fieldRow = json[headerRowNumber];
            let rowCount = Object.keys(json).length - 1; // exclude header
            if (fieldRow && fieldRow.length > 0) {
                for (var i = 0; i < fieldRow.length; i++) {
                    fields.push(this.myToolbox.escapeString(fieldRow[i].value, true).trim());
                    fieldsSql += (fieldsSql ? ", " : "") + "`" + this.myToolbox.escapeString(fieldRow[i].value, true).trim() + "`";
                }
                let queries = [];
                let sql = "";
                let count = 0;
                let count1 = 0;
                for (var key in json) {
                    if (key != headerRowNumber.toString()) {
                        let insertSql = "";
                        let updateSql = "";
                        for (var i = 0; i < fields.length; i++) {
                            let value = json[key] && json[key][i] ? json[key][i].value : "";
                            insertSql += (insertSql ? ", " : "") + "'" + this.myToolbox.escapeString(value, false).trim() + "'";
                            updateSql += (updateSql ? ", " : "") + "`" + fields[i] + "`='" + this.myToolbox.escapeString(value, false).trim() + "'";
                        }
                        sql += "INSERT INTO `" + tableName + "` (" + fieldsSql + ") VALUES (" + insertSql + ")";
                        sql += " ON DUPLICATE KEY UPDATE " + updateSql + ";\n";
                        count++;
                        count1++;
                        if ((count % importStep == 0) || (count == rowCount)) {
                            queries.push({ "sql": sql, "count": count1 });
                            sql = "";
                            count1 = 0;
                        }
                    }
                }
                // run queries synchronesly
                this.runQueryRecursive((data, error) => {
                    callback(data, error);
                }, queries, 0, queries.length, { "ok": 0, "nok": 0, "rowCount": rowCount });
            }
        }
    }
    /*
        importJsonToMysql(callback: Function, json: any, tableName: string, headerRowNumber: number) {
            if (json) {
                let fieldsSql = "";
                let fields: any = [];
                let fieldRow = json[headerRowNumber];
                let rowNumber = Object.keys(json).length - 1; // exclude header which won't be inserted
                let rowCount = 0;
                let rowOk = 0;
                let rowNOk = 0;
                if (fieldRow && fieldRow.length > 0) {
                    for (var i = 0; i < fieldRow.length; i++) {
                        fields.push(this.myToolbox.escapeString(fieldRow[i].value, true).trim());
                        fieldsSql += (fieldsSql ? ", " : "") + "`" + this.myToolbox.escapeString(fieldRow[i].value, true).trim() + "`";
                    }
    
                    let queries = [];
                    let sql = "";
    
                    for (var key in json) {
                        if (key != headerRowNumber.toString()) {
                            let insertSql = "";
                            let updateSql = "";
                            for (var i = 0; i < fields.length; i++) {
                                let value = json[key] && json[key][i] ? json[key][i].value : "";
                                insertSql += (insertSql ? ", " : "") + "'" + this.myToolbox.escapeString(value, false).trim() + "'";
                                updateSql += (updateSql ? ", " : "") + "`" + fields[i] + "`='" + this.myToolbox.escapeString(value, false).trim() + "'";
                            }
    
                            sql = "INSERT INTO `" + tableName + "` (" + fieldsSql + ") VALUES (" + insertSql + ")";
                            sql += " ON DUPLICATE KEY UPDATE " + updateSql + ";\n";
    
                            queries.push(sql);
    
                            this.connexion.queryPool(
                                (error: any, data: any) => {
                                    rowCount++;
                                    rowOk = (!error ? rowOk + 1 : rowOk);
                                    rowNOk = (error ? rowNOk + 1 : rowNOk);
                                    this.myToolbox.log(!error ? rowCount + " Record " : error);
                                    if (rowCount == rowNumber) {
                                        this.myToolbox.log("All records treated: " + rowOk + ", not ok: " + rowNOk);
                                        callback(data, error);
                                    }
                                    if (error) {
                                        console.error(error);
                                    }
                                }, sql);
                        }
                    }
    
                    // run queries synchronesly
    
                    // this.runQueryRecursive((error: any, data: any) => {
                    //     callback(data, error)
                    // }, queries, 0, queries.length, { ok: 0, nok: 0 });
    
    
                }
    
            }
        }
    */
    importJsonToElasticsearch(callback, json, type, keyFields) {
        if (json) {
            let count = 0;
            let body = "";
            for (var i = 0; i < json.length; i++) {
                let key = this.myToolbox.getUniqueId();
                if (keyFields) {
                    key = "";
                    for (var j = 0; j < keyFields.length; j++) {
                        key += json[i][keyFields[j]];
                    }
                    key = this.myToolbox.replaceAll(key, " ", "_");
                    key = this.myToolbox.replaceAll(key, "\\\\", "_");
                    key = this.myToolbox.replaceAll(key, "\n", "_");
                    key = this.myToolbox.replaceAll(key, "\r", "_");
                    key = this.myToolbox.replaceAll(key, "\\?", "_");
                }
                let url = this.configuration.elasticsearch.baseUrl + "_bulk";
                body += (body ? "\n" : "") + JSON.stringify({ "index": { "_index": this.configuration.elasticsearch.index, "_type": type, "_id": key } }) +
                    "\n" + JSON.stringify(json[i]);
                if (i % 100 == 0) {
                    body += "\n";
                    this.rest.call((error, data) => {
                        count++;
                        if (count == json.length) {
                            callback(data, error);
                        }
                    }, "POST", url, body);
                }
            }
        }
    }
    importExcelFileToMySql(callback, fileName, sheetName, headerRowNumber, overwrite, fieldsDefinition, importStep) {
        // this.logMessage("Start Json to sql");
        let json = this.excelToProperJsonMySql(fileName, sheetName, headerRowNumber);
        if (json) {
            let defaultType = "varchar";
            let defaultSize = 150;
            let fields = [];
            let header = json[headerRowNumber];
            for (var i = 0; i < header.length; i++) {
                if (fieldsDefinition && fieldsDefinition[header[i].value]) {
                    fields.push({
                        "name": fieldsDefinition[header[i].value].name ? fieldsDefinition[header[i].value].name : header[i].value,
                        "type": fieldsDefinition[header[i].value].type ? fieldsDefinition[header[i].value].type : defaultType,
                        "size": fieldsDefinition[header[i].value].size ? fieldsDefinition[header[i].value].size : defaultSize,
                        "isKey": fieldsDefinition[header[i].value].isKey ? fieldsDefinition[header[i].value].isKey : false
                    });
                }
                else {
                    fields.push({
                        "name": header[i].value,
                        "type": defaultType,
                        "size": defaultSize,
                        "isKey": false
                    });
                }
            }
            if (overwrite) {
                this.dropTable((data) => {
                    // this.logMessage("Former table '" + fileName + "' dropped");
                    this.createTable((data) => {
                        this.logMessage("Table '" + fileName + "' created");
                        this.importJsonToMysql(callback, json, fileName, headerRowNumber, importStep);
                    }, fileName, fields);
                }, fileName);
            }
            else {
                this.createTable((data, error) => {
                    if (!error) {
                        // this.logMessage("Table '" + fileName + "' created");
                        this.importJsonToMysql(callback, json, fileName, headerRowNumber, importStep);
                    }
                    else {
                        console.error(error);
                    }
                }, fileName, fieldsDefinition);
            }
        }
        // this.logMessage("End Json to sql");
    }
    importExcelFileToElasticsearch(callback, fileName, sheetName, headerRowNumber, index, keyFields) {
        let json = this.excelToProperJsonElasticsearch(fileName, sheetName, headerRowNumber, index, keyFields);
        let type = this.myToolbox.replaceAll(fileName, " ", "_");
        type = this.myToolbox.replaceAll(type, "\\?", "_");
        this.importJsonToElasticsearch((data, error) => {
            callback(data, error);
        }, json, type, keyFields);
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
            }, "idconfiguration=" + idconfiguration.toString());
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
    loadConfigurationFile(callback, where) {
        let sql = "select * from configuration where " + where;
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
                }, tableName, fields /*, 200*/); // to verify with new signature TODO !!!
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
        }, "fileName='" + fileName + "' and owner='" + this.owner + "'");
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