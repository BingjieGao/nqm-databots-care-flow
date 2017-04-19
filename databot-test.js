module.exports = (configpath) => {
  "use strict";

  const debugLog = require("debug")("nqm");
  const util = require("util");
  const fs = require("fs");
  const assert = require("assert");
  const _ = require("lodash");
  const TDXAPI = require("nqm-api-tdx");
  const Promise = require("bluebird");
  const config = require(configpath);
  const path = require("path");
  const mkdirp = require("mkdirp").sync;


  let _resolvedDatabotStoragePath;

  const outputType = {
    DEBUG: 1, // STDOUT - diagnostic fed back to TDX
    ERROR: 2, // STDERR - fed back to TDX
    RESULT: 3, // Result update to the TDX
    PROGRESS: 4, // Progress updates to TDX
  };

  const _writeOutputSync = function(fd, msg) {
    msg = typeof msg !== "undefined" ? msg : "";
    if (msg) {
      const buf = new Buffer(msg.toString());
      fs.writeSync(fd, buf, 0, buf.length);
    }
  };

  const _writeOutput = function(fd, msg) {
    msg = typeof msg !== "undefined" ? msg : "";
    const buf = new Buffer(msg.toString());
    fs.writeSync(fd, buf, 0, buf.length);
  };

  const writeDebug = function() {
    const msg = util.format.apply(util, arguments);
    return debugLog(msg);
  };
  const writeAbort = function() {
    const msg = util.format.apply(util, arguments);
    _writeOutputSync(outputType.ERROR, msg + "\n");
    process.exit(1);
  };

  const writeError = function() {
    const msg = util.format.apply(util, arguments);
    return _writeOutput(outputType.ERROR, msg + "\n");
  };

  const writeResult = function(obj) {
    if (typeof obj !== "object") {
      return writeError("output.result - expected type 'object', got type '%s'", typeof obj);
    } else {
      return debugLog(JSON.stringify(obj) + "\n");
    }
  };

  const writeProgress = function(progress) {
    assert(_.isNumber(progress));
    return _writeOutput(outputType.DEBUG, "Progress:"+progress.toString() + "\n");
  };

  const setFileStorePath = function(fileStorePath) {
    if (!_resolvedDatabotStoragePath && fileStorePath) {
      _resolvedDatabotStoragePath = path.resolve(__dirname,fileStorePath);
      mkdirp(_resolvedDatabotStoragePath);    
    }
  };

  const getFileStorePath = function(targetFile) {
    if (!_resolvedDatabotStoragePath) {
      writeAbort("getFileStorePath - store path not set");
    } else {
      return path.resolve(_resolvedDatabotStoragePath, targetFile);
    }
  }; 

  let context;
  const output = {
    debug: writeDebug,
    progress: writeProgress,
    error: writeError,
    result: writeResult,
    getFileStorePath: getFileStorePath,
    setFileStorePath: setFileStorePath,
  };

  const readAndRun = function(cb) {
    if (typeof cb !== "function") {
      throw new Error("input.read - callback required");
    }
    const context = {
      "instanceId": config.instanceId,
      "instanceName": config.instanceName,
      "instancePort": config.instancePort,
      "instanceAuthKey": config.instanceAuthKey,
      "authToken": config.authToken,
      "outputSchema": config.outputSchema,
      "chunkNumber": config.chunkNumber,
      "chunkTotal": config.chunkTotal,
      "packageParams": config.packageParams,
      "commandHost": config.commandHost,
      "queryHost": config.queryHost,
      "tdxApi": null,
      "shareKeyId": config.shareKeyId,
      "shareKeySecret": config.shareKeySecret,
      "accessTokenTTL": 31536000,
    };

    // Initialise a tdx api instance
    context.tdxApi = new TDXAPI({
      commandHost: context.commandHost,
      queryHost: context.queryHost,
      accessToken: context.authToken,
      accessTokenTTL: context.accessTokenTTL,
    });
    Promise.promisifyAll(context.tdxApi);

    context.tdxApi.authenticate(config.shareKeyId, config.shareKeySecret, function(err, accessToken) {
      if (err) throw err;
      else {
        context.authToken = accessToken;
        cb(config.inputSchema, output, context);
      }
    });
  };
  return {
    pipe: readAndRun,
  };
};
