module.exports = (function() {
  "use strict";

  return {
    tdxHost: "https://q.nq-m.com",
    // poplet databot
    // serviceRatio case
    inputs: {
      databotType: "poplet",
      areaServiceId: "B1oGYw7Ae",
      ccgCode: "E38000001",
      behaviourId: "BygEt3RKzg",
      popletData: "BklR9rbICl", // output from poplet databot
      consultationId: "r1lk-gHpmg", // consultation rate
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
