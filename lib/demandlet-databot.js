module.exports = (function() {
  "use strict";
  const _ = require("lodash");
  const Promise = require("bluebird");
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
    let areaServiceId;
    let consultationId;
    const tdxApi = context.tdxApi;
    let consultationData;
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
          // retrive a list of lsoa area Ids
          return tdxApi.getDistinctAsync(popletDatasetId, "areaId", {areaServiceId}, null, null);
        }
      })
      .then((response) => {
        if (!response || response.data.length === 0) {
          output.debug("NO valid poplet data");
        } else {
          return Promise.each(response.data, (areaId) => {
            return tdxApi.getDatasetDataAsync(popletDatasetId, {areaServiceId: areaServiceId, areaId: areaId}, null, {limit: 0})
              .then((response) => {
                output.debug(response.data[0]);
                if (!response || response.data.length === 0) {
                  output.debug("NO valid poplet data");
                } else {
                // calculate demands for each demographic,
                // with estimated number of people
                // from each LSOA registered in each GP
                  demandCalculation(consultationData, response.data, deststream, areaServiceDemandId, output);
                }
              })
              .catch((err) => {
                output.debug(`error retriving poplet data ${err}`);
              });
          });
        }
      })
      .catch((err) => {
        output.debug(`error retriving data ${err}`);
      });
  };

  function demandCalculation(consultationData, popletData, deststream, areaServiceDemandId, output) {
    const consultationObject = dicLookup(consultationData, output);
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
      deststream.write(`${JSON.stringify(rObj)}\n`);
    });
  }

  /**
   * creating a dictionary for quick lookup the rates
   * @param {*} consultationData - consultation rates data for each demographic
   */

  function dicLookup(consultationData, output) {
    const returnObject = {};
    _.forEach(consultationData, (consultationObj) => {
      const key = `${consultationObj.gender}${consultationObj.age_band}`;
      if (!returnObject[key]) returnObject[key] = consultationObj.rate;
    });
    return returnObject;
  }
  return demandlet;
}());
