module.exports = (function() {
  "use strict";
  const _ = require("lodash");
  const safeBands = require("./safe-age");
  /**
   *
   * @param {*} serviceRatioId - datasetId refers to serviceRatio
   * @param {*} populationId - datasetId refers to poplets data, default one is S1gCLZJxNe
   * @param {*} networkId - datasetId refers to network that contains a set of opened services
   */
  const areaServiceDatabot = function(input, output, context, deststream) {
    /**
     * @param {*} areaServiceDataset - the unique areaServiceId points
     * to a document in the area service lookup
     * schema is
     * {
     * areaServiceId: "string",
     * populationId: "string"
     * networkId: "string",
     * behaviourFunctionId: "string",
     * }
     * @param {*} araeServiceId - UID
     * @param {*} ccgCode - within this ccg area
     */
    const areaServiceDataset = context.packageParams.areaServiceDataset;
    const areaServiceId = input.areaServiceId;
    const ccgCode = input.ccgCode;
    const tdxApi = context.tdxApi;
    let populationId;
    let networkId;
    let serviceRatioId;
    // a set of serviceArray from networkId
    let serviceArray = null;
    let areaArray = null;
    let ratioData = null;
    // requesting data according to each senario
    tdxApi.getDatasetDataAsync(areaServiceDataset, {areaServiceId: areaServiceId}, null, null)
      .then((result) => {
        if (!result || result.data.length !== 1) {
          output.debug("NO result requesting from areaServiceDataset with input UUID areaServiceId");
        } else {
          populationId = result.data[0].populationId;
          networkId = result.data[0].networkId;
          serviceRatioId = input.behaviourId;
          const networkPipeline = [
            {
              $group: {
                _id: null,
                serviceArray: {
                  $push: "$serviceId",
                },
              },
            },
          ];
          // requesting a set of available services
          // original schema
          // e.g. [{serviceId:"A8001"}, {serviceId:"A8001"}, ...]
          // $push as an array
          return tdxApi.getAggregateDataAsync(networkId, JSON.stringify(networkPipeline), null);
        }
      })
      .then((response) => {
        // get all lsoa areas within given ccgCode
        if (!response || response.data[0].serviceArray.length === 0) {
          output.debug("NO result from network datset");
        } else {
          serviceArray = response.data[0].serviceArray;
          // boundary look up dataset from tdx
          const patientsMapping = context.packageParams.patientsMapping;
          // matching pipeline, all lsoa areas $in this ccgCode
          const pipeline = [
            {
              $match: {
                parentId: ccgCode,
              },
            },
            {
              $group: {
                _id: null,
                childArray: {
                  $push: "$childId",
                },
              },
            },
          ];
          // original schema:
          // {
          //  parentId: ccg code,
          //  childId: lsoa code,
          // }
          // retriving all childIds with parentId matching given ccg code
          return tdxApi.getAggregateDataAsync(patientsMapping, JSON.stringify(pipeline), null);
          // a set of LSOA areas
        }
      })
      .then((response) => {
        if (!response || response.data.length === 0) {
          output.debug("NO valid matching data from boundary lookup");
        } else {
          // lsoa areas filtered by given ccg code
          // from gp view, the total poplets registered in gps within this ccg area
          // gp points in this ccg code have patients from
          // lsoas $in areaArray
          // response is {data: [{_id: null, childArray:[...]}]}
          areaArray = response.data[0].childArray;
          // resuest all serviceRatio data within this areaArray
          const filter = {
            // this need to be fixed, the new field should be areaId instead of _
            area_id: {
              $in: areaArray,
            },
            age_band: {
              $in: safeBands,
            },
          };
          // retriving ratio data $in the set of LSOA codes = areaArray
          // data schema
          // e.g.
          // {
          //  area_id: "string",
          //  gender: "string",
          //  age_band: "string",
          //  ratio: "object",
          // }
          return tdxApi.getDatasetDataAsync(serviceRatioId, filter, null, {limit: 0});
        }
      })
      .then((response) => {
        if (!response || response.data.length === 0) {
          output.debug("NO valid serviceRatio data available");
        } else {
          ratioData = response.data;
          const popletFilter = {
            area_id: {
              $in: areaArray,
            },
            age_band: {
              $in: safeBands,
            },
          };
          // retriving poplet data within this areaId array
          return tdxApi.getDatasetDataAsync(populationId, popletFilter, null, {limit: 0});
        }
      })
      .then((response) => {
        if (!response || response.data.length === 0) {
          output.debug("NO valid poplet data available");
        } else {
          return mapData(response.data, ratioData, serviceArray, deststream);
        }
      })
      .catch((err) => {
        output.debug(`requesting tdx data with err ${err.message}`);
      });
  };

  /**
   * parameter fields are:
   * @param {*} populationData - area_id, gender, age_band, year, persons
   * @param {*} ratioData - area_id, gender, age_band, year, persosns
   * for each mapped area_id, each demographic,
   * multiply with original/renormalized ratio from ratioData
   * and actual number of people in populationData
   */
  function mapData(populationData, ratioData, serviceArray, deststream) {
    // re-format the ratioData from an array to a dictionary lookup object
    // in order to do the multiplications with poplet data
    const ratioObject = dicLookup(ratioData, serviceArray);
    _.forEach(populationData, (populationObj) => {
      const key = `${populationObj.area_id}${populationObj.gender}${populationObj.age_band}`;
      if (ratioObject[key]) {
        const rObj = {
          areaId: populationObj.area_id,
          gender: populationObj.gender,
          year: populationObj.year,
          ageBand: populationObj.age_band,
        };
        _.forEach(ratioObject[key], (ratio, serviceId) => {
          // add serviceId field to each original poplet object
          rObj.serviceId = serviceId;
          // multiply with service ratio and persons each areaId, each demographic
          rObj.count = ratio * populationObj.persons;
          deststream.write(`${JSON.stringify(rObj)}\n`);
        });
      }
    });
  }

  function dicLookup(ratioData, serviceArray) {
    let renormalize;
    // in ratioData, ratio is formed accordingly by each available service
    // if senario is to be changed in the way that a set of services should be closed
    // the ratios of people registered from one area in available services area renormalized
    if (serviceArray.length === 1 && serviceArray[0] === "all") {
      // no service within this ccg code is closed
      // no need to re-normalize
      renormalize = false;
    } else {
      renormalize = true;
    }
    const returnObject = {};
    _.forEach(ratioData, (ratioObj) => {
      let sum = 0;
      const key = `${ratioObj.area_id}${ratioObj.gender}${ratioObj.age_band}`;
      if (!returnObject[key]) returnObject[key] = {};
      ratioObj.ratio = renormalize ? _.pick(ratioObj.ratio, serviceArray) : ratioObj.ratio;
      // re-calculating ratios
      // calculate sum of ratios with picked services
      _.forEach(ratioObj.ratio, (ratio, serviceId) => {
        sum += ratio;
      });
      // re-normalize service ratio
      _.forEach(ratioObj.ratio, (ratio, serviceId) => {
        returnObject[key][serviceId] = ratio / sum;
      });
    });
    return returnObject;
  }

  return areaServiceDatabot;
}());
