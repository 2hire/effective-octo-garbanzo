const core = require("@actions/core");
const fs = require("fs");

const Utils = {
  sort: (object) => {
    if (
      typeof object === "object" &&
      !Array.isArray(object) &&
      object !== null
    ) {
      return Object.keys(object)
        .sort()
        .reduce((acc, key) => {
          acc[key] = Utils.sort(object[key]);
          return acc;
        }, {});
    }
    return object;
  },
};

const main = () => {
  try {
    const path = core.getInput("file-path");

    fs.readFile(path, "utf-8", async (error, data) => {
      if (error) {
        return console.error(error);
      }
      const object = JSON.parse(data);
      let dataToWrite = JSON.stringify(Utils.sort(object), null, 2);
      if (dataToWrite.substring(dataToWrite.length - 1) !== "\n")
        dataToWrite += "\n";
      fs.writeFile(
        path,
        dataToWrite,
        (error) => {
          if (error) console.error(error);
        }
      );
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
