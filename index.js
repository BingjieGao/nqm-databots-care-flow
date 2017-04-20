module.exports = (function() {
  "use strict";
  const fs = require("fs");
  function databot(input, output, context) {
    output.debug("databot");
    const outputFilePath = output.generateFileStorePath("json");
     // Create the output stream.
    const destStream = fs.createWriteStream(outputFilePath, {flags: input.appendOutput ? "a" : "w"});

    // decide to fire areaService poplet databot or areaService demand databot
    let databotType;
    if (input.databotType === "poplet") {
      databotType = require("./lib/behaviour-function-factory");
    } else if (input.databotType === "demand") {
      databotType = require("./lib/demandlet-databot");
    } else {
      output.abort("NOT valid databotType input");
    }

    // the UUID of areaServiceDataset
    // refers to databot inputs dataset ids
    const areaServiceId = input.areaServiceId;
    const areaServiceDataset = context.packageParams.areaServiceDataset;

    databotType(areaServiceId, areaServiceDataset, context.tdxApi)
    .then((databot) => {
      return databot(input, output, context, destStream);
    })
    .then(() => {
      // destStream.end() is called in each write to file process separately
      output.debug("output file path is %s", outputFilePath);
      output.result({outputFilePath: outputFilePath});
    })
    .catch((err) => {
      output.debug(err.message);
    });
  }
  const input = require("nqm-databot-utils").input;
  input.pipe(databot);
}());

