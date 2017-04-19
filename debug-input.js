module.exports = (function() {
  "use strict";

  return {
    tdxHost: "https://tdx.nqminds.com",
    // poplet databot
    // serviceRatio case
    inputs: {
      databotType: "poplet",
      areaServiceId: "B1oGYw7Ae",
      ccgCode: "E38000001",
      behaviourId: "BygEt3RKzg",
    },
    packageParams: {
      areaServiceDataset: "HyxAFvPQAg",
      serviceMapping: "SyeTVqStHl",
      boundaryLookup: "B1eUF5s2Ul",
      patientsMapping: "H1xiygRDBl",
    },
    fileStorePath: "./jsonFiles",
  };
}());
