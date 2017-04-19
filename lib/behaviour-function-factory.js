module.exports = (function() {
  "use strict";
  const Promise = require("bluebird");
  /**
   *
   * @param {*} behaviourFunctionId - indication of practive demographics
   * for now only calculate service ratio is used as default demographic situation
   * case "serviceRatio"
   */
  const behaviourFactory = function(input, context) {
    let databot;
    const tdxApi = Promise.promisifyAll(context.tdxApi);
    return tdxApi.getDatasetDataAsync(context.packageParams.areaServiceDataset, {areaServiceId: input.areaServiceId},
      null, null)
      .then((result) => {
        if (!result || result.data.length !== 1) {
          // if areaServiceId does not match any line in the tdx dataset
          return Promise.reject(new Error("NOT valid areaServiceId input"));
        } else {
          switch (result.data[0].behaviourFunctionId) {
            case "service-ratio":
              databot = require("./service-ratio-behaviour");
              console.log(databot);
              break;
            default:
              databot = null;
              break;
          }
          return databot;
        }
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  };
  return behaviourFactory;
}());
