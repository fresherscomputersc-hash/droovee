const { MongoMemoryReplSet } = require("mongodb-memory-server");
(async () => {
  const repl = await MongoMemoryReplSet.create({
    instanceOpts: [{ port: 27017, storageEngine: "wiredTiger" }],
    replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  });
  console.log("MONGO_READY " + repl.getUri("droovee?directConnection=true"));
  setInterval(() => {}, 60000);
})();
