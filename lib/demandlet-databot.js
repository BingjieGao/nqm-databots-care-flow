module.exports = (function() {
  "use strict";
  const _ = require("lodash");
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
    const popletDatasetId = context.packageParams.popletDataset;
    const areaServiceId = input.areaServiceId;
    const areaServiceDemandId = context.packageParams.areaDemandDataset;
    const consultationId = input.consultationId;
    const tdxApi = context.tdxApi;
    let consultationData;
    // retrive data from areaServiceDemand table
    // get poplet dataset UUID areaServiceId
    // and consultationId
    return tdxApi.getDatasetDataAsync(areaServiceDemandId, null, null, null)
      .then((result) => {
        // no valid result or not only result returned
        if (!result || result.data.length !== 1) {
          output.debug(`NO vaild areaServiceDemandId given ${areaServiceDemandId}`);
        } else {
          // retriving consultation rates data first
          return tdxApi.getDatasetDataAsync(consultationId, null, null, null)
            .then((result) => {
              if (!result || result.data.length === 0) {
                output.debug("NO valid consultation data");
              } else {
                consultationData = result.data;
                // retrive area service poplet data
                // the output data of "poplet" databot
                return tdxApi.getDatasetDataAsync(popletDatasetId, {areaServiceId}, null, null);
              }
            })
            .then((response) => {
              if (!response || response.data.length === 0) {
                output.debug("NO valid poplet data");
              } else {
                // calculate demands for each demographic,
                // with estimated number of people
                // from each LSOA registered in each GP
                demandCalculation(consultationData, response.data, deststream, areaServiceDemandId);
              }
            });
        }
      })
      .catch((err) => {
        output.debug(`error with demand databot ${err}`);
      });
  };
  function demandCalculation(consultationData, popletData, deststream, areaServiceDemandId) {
    const consultationObject = dicLookup(consultationData);
    _.forEach(popletData, (popletObj) => {
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
      deststream.write(`${JSON.stringify(rObj)}`);
    });
  }

  /**
   * creating a dictionary for quick lookup the rates
   * @param {*} consultationData - consultation rates data for each demographic
   */

  function dicLookup(consultationData) {
    let returnObject;
    _.forEach(consultationData, (consultationObj) => {
      const key = `${consultationObj.gender}${consultationObj.age_band}`;
      if (!returnObject) returnObject[key] = consultationObj.rate;
    });
    return returnObject;
  }
  return demandlet;
}());
