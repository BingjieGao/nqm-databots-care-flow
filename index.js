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
    // the UUID of areaServiceDataset
    // refers to databot inputs dataset ids
    const areaServiceId = input.areaServiceId;
    const areaServiceDataset = context.packageParams.areaServiceDataset;
    if (input.databotType === "poplet") {
      databotType = require("./lib/behaviour-function-factory");

      // in poplet databot, choose from case-factory in terms of
      // input dataset schema
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
    } else if (input.databotType === "demand") {
      databotType = require("./lib/demandlet-databot");
      // demand databot
      // const sourceStream = request.get("https://q.nq-m.com/v1/resource/ByesWfHIRe/preview?");
      databotType(input, output, context, destStream);
    } else {
      console.log(input.databotType);
      output.abort("NOT valid databotType input");
    }
  }
  const input = require("nqm-databot-utils").input;
  input.pipe(databot);
}());

