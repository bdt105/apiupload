import { MyToolbox } from "./myToolbox";
import { Connexion } from 'bdt105connexion/dist';
import { isObject } from 'util';

export class SmartUpload {
    private connexion: Connexion;
    private myToolbox = new MyToolbox();

    private enclosed = "|";
    private separator = ";";
    private lineSeparator = "##";
    private configuration: any;
    private owner: string;

    public idconfiguration: number;

    //private uploadInfo: any = {};

    constructor(connexion: Connexion, configuration: any, owner: string) {
        this.connexion = connexion;
        this.configuration = configuration;
        this.owner = owner;
    }

    protected logMessage(message: any) {
        if (this.configuration.common.logToConsole) {
            if (isObject(message)) {
                console.log(JSON.stringify(message) + " --- " + this.owner);
            } else {
                console.log(message + " --- " + this.owner);
            }
        }
    }

    protected logError(error: any) {
        if (this.configuration.common.logToConsole) {
            if (isObject(error)) {
                console.error(JSON.stringify(error) + " --- " + this.owner);
            } else {
                console.error(error + " --- " + this.owner);
            }
        }
    }

    protected errorMessage(text: string) {
        let ret = { "status": "ERR", "message": text };
        this.logError(ret);
        return ret;
    }

    protected respond(response: any, statusCode: number, data: any = null) {
        if (statusCode != 200) {
            this.logError(data);
        } else {
            this.logMessage(data);
        }
        response.status(statusCode);
        if (isObject(data)) {
            response.setHeader('content-type', 'application/json');
        } else {
            response.setHeader('content-type', 'test/plain');
        }
        response.send(JSON.stringify(data));
    }

    protected sendEmail(sendTo: string, subject: string, html: string) {
        var nodemailer = require('nodemailer')
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configuration.common.email,
                pass: this.configuration.common.password
            }
        });
        const mailOptions = {
            from: this.configuration.common.email, // sender address
            to: sendTo, // list of receivers
            subject: subject, // Subject line
            html: html // plain text body
        };
        transporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
                this.logError(error)
            } else {
                this.logMessage(info);
            }
        });
    }

    private writeCsvFile(directory: string, fileName: string, csvObject: any, headerRowNumber: number) {
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

    private importCsvToTable(callback: Function, csvFileName: string, tableName: string) {
        let mysqlDirectory = this.configuration.mySql.fileDirectory;
        let sql = "LOAD DATA INFILE '" + mysqlDirectory + csvFileName + "' " +
            "INTO TABLE `" + tableName + "` CHARACTER SET utf8 " +
            "FIELDS TERMINATED BY '" + this.separator + "' " +
            "ENCLOSED BY '" + this.enclosed + "' " +
            "LINES TERMINATED BY '" + this.lineSeparator + "';"
        var fs = require('fs');

        this.connexion.querySql(
            (error: any, data: any) => {
                if (!error) {
                    this.customizeTable(
                        (data1: any, error1: any) => {
                            fs.unlinkSync(mysqlDirectory + csvFileName);
                            callback(data1, error1);
                        }, tableName
                    )
                } else {
                    callback(data, error);
                }
            }, sql);
    }

    private customizeTable(callback: Function, tableName: string) {
        let sql =
            "ALTER TABLE `" + tableName + "` " +
            "ADD COLUMN `row` INT(11) NOT NULL AUTO_INCREMENT FIRST, " +
            "ADD COLUMN `type` VARCHAR(6) NULL DEFAULT 'row' AFTER `row` , " +
            "ADD COLUMN `favorite` VARCHAR(1) NULL DEFAULT '0' AFTER `type`, " +
            "ADD PRIMARY KEY (`row`);"
        this.connexion.querySql(
            (error: any, data: any) => {
                if (!error) {
                    let sql1 = "UPDATE `" + tableName + "` SET `type`='header' where row = 1 ";
                    this.connexion.querySql((error1: any, data1: any) => {
                        callback(data1, error1);

                    }, sql1);
                } else {
                    callback(data, error);

                }
            }, sql
        );
    }

    public createTable(callback: Function, tableName: string, fields: any, fieldSize: number) {
        let fieldScript = "";
        for (var i = 0; i < fields.length; i++) {
            fieldScript += (fieldScript ? ", " : "") + "`" + fields[i] + "` varchar(" + fieldSize + ")";
        }
        let createTableSql = "CREATE TABLE `" + tableName + "` (" + fieldScript + ") ENGINE=InnoDB DEFAULT CHARSET=utf8; ";
        this.connexion.querySql(
            (error: any, data: any) => {
                callback(data, error);
            }, createTableSql
        );
    }

    public dropTable(callback: Function, tableName: string) {
        if (tableName) {
            let dropTable = "DROP TABLE IF EXISTS `" + tableName + "`";
            this.connexion.querySql(
                (error: any, data: any) => {
                    callback(data, error);
                }, dropTable);
        } else {
            callback(null, null);
        }
    }

    public excelFileToCsvJson(fileName: string, sheetName: string, headerRowNumber: number) {
        var fs = require('fs');
        var XLSX = require('xlsx');

        this.logMessage("Start Excel parsing");

        var buf = fs.readFileSync(fileName);
        var wb = null;
        try {
            wb = XLSX.read(buf, { type: 'buffer' });
        } catch (error) {

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
                let ret: any = {};
                for (var key in mySheet) {
                    let column = key.replace(/[0-9]/g, '');
                    let row = Number.parseInt(key.replace(/[^0-9]/g, ''));
                    if (!Number.isNaN(row) && row >= headerRowNumber) {
                        let l = this.enclosed + id.toString() + this.enclosed;
                        l += this.separator + this.enclosed + column + this.enclosed;
                        l += this.separator + this.enclosed + row + this.enclosed;
                        if (row == headerRowNumber) {
                            l += this.separator + this.enclosed + 'header' + this.enclosed;
                        } else {
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

    public csvFileToCsvJson(callback: Function, fileName: string) {
        this.logMessage("Start Csv to Json");

        let csv = require('csvtojson');

        let converter = csv(
            {
                "delimiter": this.separator,
                "quote": this.enclosed,
                "eol": this.lineSeparator
            }, null);

        converter.fromFile(fileName).then(
            (data: any) => {
                callback(data);
                this.logMessage("End Csv to Json");
            }
        );
    }

    public deleteConfigurationFile(callback: Function, idconfiguration: number, deleteItemsPlus: boolean) {
        if (idconfiguration) {
            this.loadConfigurationFile(
                (data: any, error: any) => {
                    if (!error) {
                        if (data && data.length > 0) {
                            let tableName = data[0].tableName;
                            this.dropTable((data1: any, error1: any) => {
                                if (!error1) {
                                    let sql = "delete from configuration where idconfiguration=" + idconfiguration;
                                    this.connexion.querySql(
                                        (error: any, data: any) => {
                                            if (!error) {
                                                if (deleteItemsPlus) {
                                                    let sql1 = "delete from itemplus where tableName='" + tableName + "'";
                                                    this.connexion.querySql(
                                                        (error: any, data: any) => {
                                                            if (!error) {
                                                                this.logMessage("itemplus data deleted " + JSON.stringify(data));
                                                                let sql1 = "delete from message where tableName='" + tableName + "'";
                                                                this.connexion.querySql(
                                                                    (error: any, data: any) => {
                                                                        if (!error) {
                                                                            this.logMessage("message data deleted " + JSON.stringify(data));
                                                                        } else {
                                                                            this.logMessage("message data NOT deleted " + JSON.stringify(data));
                                                                        }
                                                                    }, sql1);
                                                            } else {
                                                                this.logMessage("itemplus data NOT deleted " + JSON.stringify(data));
                                                            }
                                                            callback(data, error);
                                                        }, sql1);
                                                    callback(data, error);
                                                }
                                                this.logMessage("Configuration data deleted " + JSON.stringify(data));
                                            } else {
                                                this.errorMessage("Configuration data NOT deleted " + JSON.stringify(error));
                                            }
                                            callback(data, error)
                                        }, sql);
                                } else {
                                    callback(data1, error1);
                                }
                            }, tableName);
                        }
                    }
                }, "idconfiguration", idconfiguration.toString());
        }
    }

    private insertConfigurationFile(callback: Function, tableName: string, originalFileName: string, headerRowNumber: number, configuration: string) {
        let sql = "insert into configuration (fileName, tableName, headerRowNumber, owner, title, displayLabel, configuration) values (" +
            "'" + originalFileName + "', '" + tableName + "', " +
            headerRowNumber + ", '" + this.owner + "', '" + originalFileName + "', 1, '" + configuration + "')";
        this.connexion.querySql(
            (error: any, data: any) => {
                if (!error) {
                    this.logMessage("Configuration data saved (insert) " + JSON.stringify(data));
                } else {
                    this.errorMessage("Configuration data NOT saved (insert) " + JSON.stringify(error));
                }
                callback(data, error)
            }, sql);
    }

    private updateConfigurationFile(callback: Function, idconfiguration: number, tableName: string, configuration: string) {
        let sql = "update configuration set tableName='" + tableName + "', configuration='" + configuration + "' where idconfiguration=" + idconfiguration;
        this.connexion.querySql(
            (error: any, data: any) => {
                if (!error) {
                    this.idconfiguration = idconfiguration
                    this.logMessage("Configuration data saved (update) " + JSON.stringify(data));
                } else {
                    this.errorMessage("Configuration data NOT saved (update) " + JSON.stringify(error));
                }
                callback(data, error)
            }, sql);
    }

    private loadConfigurationFile(callback: Function, field: string, value: string) {
        let sql = "select * from configuration where " + field + "='" + value + "'";
        this.connexion.querySql(
            (error: any, data: any) => {
                callback(data, error);
            }, sql);
    }

    private saveConfigurationFile(callback: Function, tableName: string, originalFileName: string, headerRowNumber: number, idconfiguration: number, configuration: string) {
        if (idconfiguration) {
            this.updateConfigurationFile(
                (data1: any, error1: any) => {
                    callback(data1, error1);
                }, idconfiguration, tableName, configuration);
        } else {
            this.insertConfigurationFile(
                (data: any, error: any) => {
                    this.idconfiguration = data.insertId;
                    callback(data, error);
                }, tableName, originalFileName, headerRowNumber,  configuration);
        }
    }

    // public prepareData(data: any) {
    //     let ret: any = {};
    //     for (var i = 0; i < data.length; i++) {
    //         ret[i] = data[i];
    //     }
    //     return ret;
    // }

    private configureAndImport(callback: Function, fileName: string, csvFileName: string, fields: any, headerRowNumber: number, idconfiguration: number, tableName: string, configuration: string) {
        this.dropTable((data: any, error: any) => {
            if (!error) {
                this.createTable((data1: any, error1: any) => {
                    if (!error1) {
                        this.saveConfigurationFile((data2: any, error2: any) => {
                            if (!error2) {
                                this.importCsvToTable((data3: any, error3: any) => {
                                        callback(data3, error3);
                                }, csvFileName, tableName);
                            } else {
                                callback(data2, error2);
                            }
                        }, tableName, fileName, headerRowNumber, idconfiguration, configuration);
                    } else {
                        callback(data1, error1);
                    }
                }, tableName, fields, 200);
            } else {
                callback(data, error);
            }
        }, tableName);
    }

    public importCsvFile(callback: Function, fileName: string, fields: any, csvFileName: string, headerRowNumber: number, newFile: boolean, configuration: string) {
        this.idconfiguration = null;
        this.loadConfigurationFile((data: any, error: any) => {
            if (!error) {
                let tableName = this.myToolbox.getUniqueId();
                if (data && data.length > 0) {
                    tableName = !newFile ? data[0].tableName : tableName;
                    this.idconfiguration = !newFile ? data[0].idconfiguration : null;
                    if (this.idconfiguration) {
                        this.configureAndImport(
                            (data2: any, error2: any) => {
                                callback(data2, error2);
                            }, fileName, csvFileName, fields, headerRowNumber, this.idconfiguration, tableName, configuration);
                    } else {
                        this.configureAndImport(
                            (data2: any, error2: any) => {
                                callback(data2, error2);
                            }, fileName, csvFileName, fields, headerRowNumber, null, tableName, configuration);
                    }
                } else {
                    this.configureAndImport(
                        (data2: any, error2: any) => {
                            callback(data2, error2);
                        }, fileName, csvFileName, fields, headerRowNumber, null, tableName, configuration);
                }
            } else {
                callback(null, error);
            }
        }, "fileName", fileName);

    }

    public importExcelFile(callback: Function, directory: string, fileName: string, downloadFileName: string, sheetName: string, headerRowNumber: number, newFile: boolean) {
        let csvObject = null;
        let fields: any = null;

        csvObject = this.excelFileToCsvJson(directory + downloadFileName, sheetName, headerRowNumber);
        let mysqlDirectory = this.configuration.mySql.fileDirectory;
        this.writeCsvFile(mysqlDirectory, downloadFileName, csvObject, headerRowNumber);
        fields = Object.keys(csvObject[headerRowNumber]);
        if (fields) {
            this.importCsvFile(callback, fileName, fields, downloadFileName, headerRowNumber, newFile, null);
        } else {
            callback(null, { "error": "Error reading csv" });
        }
    }

}