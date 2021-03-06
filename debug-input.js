module.exports = (function() {
  "use strict";

  return {
    tdxHost: "https://q.nq-m.com",
    shareKeyId: "H1g9B29Ele",
    shareKeySecret: "1234554321",
    commandHost: "https://cmd.nq-m.com",
    queryHost: "https://q.nq-m.com",


    // poplet databot
    // serviceRatio case
    // inputs: {
    //   databotType: "poplet",
    //   areaServiceId: "B1oGYw7Ae",
    //   ccgCode: "E38000198", // west hampshire
    //   behaviourId: "BygEt3RKzg",
    //   popletData: "BklR9rbICl", // output from poplet databot
    // },

    // demand databot
    inputs: {
      databotType: "demand",
      areaDemandId: "ryC8hg8Cl",  // UUID of areaDemandDataset
      popletData: "SygXtzSUAx",
      popletDataFile: "ByesWfHIRe",
    },
    packageParams: {
      areaServiceDataset: "HyxAFvPQAg",
      areaDemandDataset: "ryxWB8gU0l",
      serviceMapping: "SyeTVqStHl",
      boundaryLookup: "B1eUF5s2Ul",
      patientsMapping: "H1xiygRDBl",
      practiceGeojson: "HJl8nzSiJe",
    },
    fileStorePath: "jsonFiles",
  };
}());
