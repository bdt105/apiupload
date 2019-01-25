"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const myToolbox_1 = require("./myToolbox");
const util_1 = require("util");
const smart_upload_1 = require("./smart.upload");
class ApiUpload {
    constructor(app, upload, connexion, configuration) {
        this.myToolbox = new myToolbox_1.MyToolbox();
        this.app = app;
        this.connexion = connexion;
        this.upload = upload;
        this.configuration = configuration;
    }
    logMessage(message) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(message)) {
                console.log(JSON.stringify(message) + " --- " + this.currentOwner);
            }
            else {
                console.log(message + " --- " + this.currentOwner);
            }
        }
    }
    logError(error) {
        if (this.configuration.common.logToConsole) {
            if (util_1.isObject(error)) {
                console.error(JSON.stringify(error) + " --- " + this.currentOwner);
            }
            else {
                console.error(error + " --- " + this.currentOwner);
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
            response.setHeader('content-type', 'text/plain');
        }
        response.send(JSON.stringify(data));
    }
    assign() {
        this.app.get('/', (request, response) => {
            this.respond(response, 200, 'API Upload is running');
        });
        this.app.post('/uploadFile', this.upload.single('file'), (req, res) => {
            this.logMessage("Api called: " + '/uploadFile');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            let params = req.body;
            delete (params.token);
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let uploadDirectory = this.myToolbox.getConfiguration().common.uploadDirectory;
            let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory);
                this.logMessage("Upload directory created");
            }
            if (params.identifier) {
                if (!fs.existsSync(transfertDirectory)) {
                    fs.mkdirSync(transfertDirectory);
                    this.logMessage("transfertDirectory directory created");
                }
                let personnalDirectory = transfertDirectory + params.identifier + "/";
                if (fs.existsSync(personnalDirectory)) {
                    fs.copyFile(uploadDirectory + req.file.filename, personnalDirectory + req.file.originalname, (err) => {
                        if (err) {
                            this.respond(res, 500, JSON.stringify({ status: "ERR", error: err }));
                        }
                        else {
                            this.respond(res, 200, JSON.stringify({ status: "OK", "message": "File stored" }));
                        }
                    });
                }
                else {
                    this.respond(res, 404, "Identifier '" + params.identifier + "' is unknowed");
                }
            }
            else {
                this.respond(res, 403, "No 'identifier' set");
            }
        });
        this.app.post('/downloadFile', this.upload.array(), (req, res) => {
            this.logMessage("Api called: " + '/downloadFile');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            let params = req.body;
            delete (params.token);
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
            if (params.identifier) {
                if (!fs.existsSync(transfertDirectory)) {
                    fs.mkdirSync(transfertDirectory);
                    this.logMessage("transfertDirectory directory created");
                }
                let personnalDirectory = transfertDirectory + params.identifier + "/";
                if (fs.existsSync(personnalDirectory)) {
                    if (fs.existsSync(personnalDirectory + params.fileName)) {
                        let content = fs.readFileSync(personnalDirectory + params.fileName, "utf8");
                        this.respond(res, 200, content);
                    }
                    else {
                        this.respond(res, 403, null);
                    }
                }
                else {
                    this.respond(res, 404, "Identifier '" + params.identifier + "' is unknowed");
                }
            }
            else {
                this.respond(res, 403, "No 'identifier' set");
            }
        });
        this.app.post('/identifier', this.upload.array(), (req, res) => {
            this.logMessage("Api called: " + '/identifier');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
            let id = this.myToolbox.getUniqueShortId();
            if (id) {
                if (!fs.existsSync(transfertDirectory)) {
                    fs.mkdirSync(transfertDirectory);
                    this.logMessage("transfertDirectory directory created");
                }
                let personnalDirectory = transfertDirectory + id + "/";
                if (!fs.existsSync(personnalDirectory)) {
                    fs.mkdirSync(personnalDirectory);
                    this.logMessage(personnalDirectory + " directory created");
                }
                this.respond(res, 200, { status: "OK", identifier: id });
            }
        });
        this.app.post('/checkIdentifier', this.upload.array(), (req, res) => {
            this.logMessage("Api called: " + '/checkIdentifier');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            let id = req.body.identifier;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
            if (id) {
                if (fs.existsSync(transfertDirectory)) {
                    this.respond(res, 200, { status: "OK", identifier: id });
                }
                else {
                    this.respond(res, 404, { status: "ERR", "message": "Identifier " + id + " not found" });
                }
            }
            else {
                this.respond(res, 403, { status: "ERR", "message": "No identifier" });
            }
        });
        this.app.post('/deleteFile', this.upload.array(), (req, res) => {
            this.logMessage("Api called: " + '/deleteFile');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            let params = req.body;
            delete (params.token);
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            if (params.identifier) {
                var fs = require('fs');
                let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
                let personnalDirectory = transfertDirectory + params.identifier + "/";
                if (fs.existsSync(personnalDirectory + params.fileName)) {
                    fs.unlink(personnalDirectory + params.fileName, (err) => {
                        if (err) {
                            this.respond(res, 500, { status: "ERR", error: err });
                        }
                        else {
                            this.respond(res, 200, { status: "OK", "message": "File " + params.fileName + " deleted" });
                        }
                    });
                }
                else {
                    this.respond(res, 200, { status: "OK", "message": "File " + params.fileName + " not found" });
                }
            }
            else {
                this.respond(res, 403, "No 'identifier' set");
            }
        });
        this.app.post('/listFiles', this.upload.array(), (req, res) => {
            this.logMessage("Api called: " + '/listFiles');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            let params = req.body;
            delete (params.token);
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            if (params.identifier) {
                var fs = require('fs');
                let transfertDirectory = this.myToolbox.getConfiguration().common.transfertDirectory;
                let personnalDirectory = transfertDirectory + params.identifier + "/";
                if (fs.existsSync(personnalDirectory)) {
                    fs.readdir(personnalDirectory, (error, files) => {
                        if (!error) {
                            this.respond(res, 200, { status: "OK", "data": files });
                        }
                        else {
                            this.respond(res, 500, { status: "ERR", error: error });
                        }
                    });
                }
                else {
                    this.respond(res, 404, "No directory " + personnalDirectory);
                }
            }
            else {
                this.respond(res, 403, "No 'identifier' set");
            }
        });
        this.app.post('/uploadExcelFile', this.upload.single('file'), (req, res) => {
            this.logMessage("Api called: " + '/uploadExcelFile');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let uploadDirectory = this.myToolbox.getConfiguration().common.uploadDirectory;
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory);
                this.logMessage("Upload directory created");
            }
            let smartUpload = new smart_upload_1.SmartUpload(this.connexion, this.configuration, req.body.owner);
            let newFile = req.body.newFile == "true";
            smartUpload.importExcelFile((data, error) => {
                if (!error) {
                    fs.unlinkSync(uploadDirectory + req.file.filename);
                    data.idconfiguration = smartUpload.idconfiguration;
                    data.originalFileName = req.file.originalname;
                    this.respond(res, 200, data);
                }
                else {
                    this.respond(res, 500, error);
                }
            }, uploadDirectory, req.file.originalname, req.file.filename, req.body.sheetname, req.body.headerRowNumber, newFile);
        });
        this.app.post('/uploadCsvFile', this.upload.single('file'), (req, res) => {
            this.logMessage("Api called: " + '/uploadCsvFile');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let uploadDirectory = this.myToolbox.getConfiguration().common.uploadDirectory;
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory);
                this.logMessage("Upload directory created");
            }
            let smartUpload = new smart_upload_1.SmartUpload(this.connexion, this.configuration, req.body.owner);
            let newFile = req.body.newFile == "true";
            let fields = null;
            smartUpload.csvFileToCsvJson((data) => {
                fields = Object.keys(data[req.body.headerRowNumber]);
                smartUpload.importCsvFile((data, error) => {
                    if (!error) {
                        fs.unlinkSync(uploadDirectory + req.file.filename);
                        data.idconfiguration = smartUpload.idconfiguration;
                        data.originalFileName = req.file.originalname;
                        this.respond(res, 200, data);
                    }
                    else {
                        this.respond(res, 500, error);
                    }
                }, req.file.originalname, fields, req.file.filename, req.body.headerRowNumber, newFile, null);
            }, uploadDirectory + req.file.filename);
        });
        this.app.post('/uploadImage', this.upload.single('file'), (req, res) => {
            this.logMessage("Api called: " + '/uploadImage');
            this.currentOwner = req.body.owner;
            let token = req.body.token;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(res, 403, 'Token is absent or invalid');
                    return;
                }
            }
            var fs = require('fs');
            let imageDirectory = this.configuration.common.imageDirectory;
            let imageUrlDirectory = this.configuration.common.imageUrlDirectory;
            fs.renameSync(req.file.destination + req.file.filename, imageDirectory + req.file.filename);
            let mes = { "status": "ok", "imageUrl": imageUrlDirectory + req.file.filename, "imageFileName": req.file.filename };
            this.respond(res, 200, mes);
        });
        this.app.delete('/deleteImage', this.upload.array(), (request, response) => {
            this.logMessage("Api called: " + '/deleteImage');
            this.currentOwner = request.body.owner;
            let token = request.body.token;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(response, 403, 'Token is absent or invalid');
                    return;
                }
            }
            let imageFileName = request.body.imageFileName;
            var fs = require('fs');
            let imageDirectory = this.configuration.common.imageDirectory;
            if (fs.existsSync(imageDirectory + imageFileName)) {
                let r = fs.unlinkSync(imageDirectory + imageFileName);
            }
            this.respond(response, 200, { "status": "ok" });
        });
        this.app.post('/deleteConfigurationFile', this.upload.array(), (request, response) => {
            this.logMessage("Api called: " + '/deleteConfigurationFile');
            this.currentOwner = request.body.owner;
            let token = request.body.token;
            let idconfiguration = request.body.idconfiguration;
            let deleteItemsPlus = request.body.deleteItemsPlus;
            if (this.configuration.requiresToken) {
                let authent = this.connexion.checkJwt(token);
                if (!authent.decoded) {
                    this.respond(response, 403, 'Token is absent or invalid');
                    return;
                }
            }
            this.logMessage("Deleting the configuration data");
            let smartUpload = new smart_upload_1.SmartUpload(this.connexion, this.configuration, request.body.owner);
            smartUpload.deleteConfigurationFile((data, error) => {
                if (!error) {
                    this.respond(response, 200, { "status": "ok", "data": data });
                    this.logMessage("File " + idconfiguration + " deleted");
                }
                else {
                    this.respond(response, 500, { "status": "err", "error": error });
                    this.logMessage("File " + idconfiguration + " NOT deleted");
                }
            }, idconfiguration, deleteItemsPlus);
        });
    }
}
exports.ApiUpload = ApiUpload;
//# sourceMappingURL=api.upload.js.map