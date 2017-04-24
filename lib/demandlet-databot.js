module.exports = (function() {
  "use strict";
  const _ = require("lodash");
  const Promise = require("bluebird");
  const split = require("split");
  /**
   * taking GeoJson data for GP points
   * from https://q.nq-m.com/v1/datasets/HJl8nzSiJe/data
   * for creating the data visualization on UI
   *
   * @param {*} input - config input
   * should take data source
   * {
   *  areaServiceDemandId: "string", UUID
   *  areaServiceId: "string",
   *  consultationDemandId: "string"
   * }
   */
  const demandlet = function(input, output, context, deststream) {
    const popletDatasetId = input.popletData;
    const areaServiceDemandDataset = context.packageParams.areaDemandDataset;
    const areaServiceDemandId = input.areaServiceDemandId;
    let consultationObject;
    let consultationId;
    const tdxApi = context.tdxApi;
    let consultationData;
    const initTime = Date.now();
    // retrive data from areaServiceDemand table
    // get poplet dataset UUID areaServiceDemandId
    // and consultationId
    return tdxApi.getDatasetDataAsync(areaServiceDemandDataset, {areaServiceDemandId}, null, null)
      .then((result) => {
        // no valid result or not only result returned
        if (!result || result.data.length !== 1) {
          output.debug(`NO vaild areaServiceDemandId given ${areaServiceDemandId}`);
        } else {
          areaServiceId = result.data[0].areaServiceId;
          consultationId = result.data[0].consultatioDemandId;
          // retriving consultation rates data first
          return tdxApi.getDatasetDataAsync(consultationId, null, null, null);
        }
      })
      .then((result) => {
        if (!result || result.data.length === 0) {
          output.debug("NO valid consultation data");
        } else {
          consultationData = result.data;
          consultationObject = dicLookup(consultationData);
          // return a list of ageBand the popletData has
          return tdxApi.getDistinctAsync(popletDatasetId, "ageBand", null, null, {limit: 0});
        }
      })
      .then((response) => {
        if (!response || response.data.length === 0) {
          output.debug("NO valid data retrived from poplet dataset");
        } else {
          return Promise.each(response.data, (ageBand) => {
            let index = 0;
            return new Promise(function(resolve, reject) {
              if (ageBand === "90+") ageBand = "90%2B";
              tdxApi.getNDDatasetData(
                popletDatasetId,
                {ageBand: ageBand},
                null,
                {limit: 0}
              )
              .pipe(split(JSON.parse, null, {trailing: true}))
              .on("data", (dataObj) => {
                // output.debug(dataObj);
                index += 1;
                demandCalculation(consultationObject, dataObj, deststream, areaServiceDemandId, output);
              })
              .on("end", () => {
                resolve();
                output.debug(`ageBand is ${ageBand}`);
                output.debug(`length is ${index}`);
              })
              .on("error", (err) => {
                output.debug(`error streaming poplet data ${err.message}`);
              });
            });
          })
          .catch((err) => {
            output.debug("error requesting with ageBand");
          });
        }
      })
      .then((response) => {
        // close write file
        deststream.end();
        // time estimation for one CCG calculation
        output.debug(`total time usage is ${Date.now() - initTime}`);
      })
      .catch((err) => {
        output.debug(`error retriving data ${err}`);
      });
  };

  function demandCalculation(consultationObject, popletObj, deststream, areaServiceDemandId, output) {
    const key = `${popletObj.gender}${popletObj.ageBand}`;
    // the return data schema
    const rObj = {
      areaServiceDemandId: areaServiceDemandId,
      areaId: popletObj.areaId,
      gender: popletObj.gender,
      ageBand: popletObj.ageBand,
      serviceId: popletObj.serviceId,
      year: popletObj.year,
    };
    // calculate consultation rates for each demographic
    const count = consultationObject[key] ? consultationObject[key] * popletObj.count : 0;
    rObj.count = count;
    deststream.write(`${JSON.stringify(rObj)}\n`);
  }

  /**
   * creating a dictionary for quick lookup the rates
   * @param {*} consultationData - consultation rates data for each demographic
   */

  function dicLookup(consultationData) {
    const returnObject = {};
    _.forEach(consultationData, (consultationObj) => {
      const key = `${consultationObj.gender}${consultationObj.age_band}`;
      if (!returnObject[key]) returnObject[key] = consultationObj.rate;
    });
    return returnObject;
  }
  return demandlet;
}());
