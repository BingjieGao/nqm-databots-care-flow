module.exports = (function() {
  "use strict";
  const fs = require("fs");
  function databot(input, output, context) {
    // just for local test if generated json file is corret
    output.setFileStorePath("./jsonFiles");
    // Generate the output file based on the given output name input.
    const outputFilePath = output.getFileStorePath(`${context.instanceId}-output.json`);
    // const outputFilePath = output.generateFileStorePath("json");
     // Create the output stream.
    const destStream = fs.createWriteStream(outputFilePath, {flags: input.appendOutput ? "a" : "w"});
    // decide to fire areaService poplet databot or areaService demand databot
    let databotType;
    if (input.databotType === "poplet") {
      databotType = require("./lib/behaviour-function-factory");
    } else if (input.databotType === "demand") {
      databotType = require("./lib/demand-databot");
    }
    databotType(input, context).then((databot) => {
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

  let input = null;
  if (process.env.NODE_ENV === "test") {
    // Requires nqm-databot-gpsgrab.json file for testing
    input = require("./databot-test.js")(process.argv[2]);
  } else {
    // Load the nqm input module for receiving input from the process host.
    input = require("nqm-databot-utils").input;
  }

// Read any data passed from the process host. Specify we're expecting JSON data.
  input.pipe(databot);
}());

