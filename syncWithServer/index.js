const core = require("@actions/core");
const axios = require("axios");
const fs = require("fs");

const Adapter = {
  getServerTranslation: async (endpoint, headers) => {
    try {
      return await axios.get(endpoint, {
        headers,
      });
    } catch (error) {
      console.error(error);
    }
  },
  setServerTranslation: async (translationObject, endpoint, headers) => {
    try {
      return await axios.post(endpoint, JSON.stringify(translationObject), {
        headers,
      });
    } catch (error) {
      console.error(error);
    }
  },
};

const TranslationHelper = {
  toNamedKey: (keyValueStore) => {
    if (!keyValueStore) {
      console.log("Not valid input");
      return;
    }
    const originalBaseLanguages = keyValueStore.base;
    if (typeof originalBaseLanguages === "undefined") {
      console.log("Base languages were not available");
      return null;
    }
    const originalSpecificLanguages = keyValueStore.specific;
    if (typeof originalSpecificLanguages === "undefined") {
      console.log("Specific languages were not available");
      return null;
    }

    const mapLanguageObject = (original) => {
      return Object.entries(original).reduce((acc, [key, value]) => {
        acc[key] = value.reduce((acc, keyValueObject) => {
          acc[keyValueObject.key] = keyValueObject.value;
          return acc;
        }, {});
        return acc;
      }, {});
    };

    const baseNamedKey = mapLanguageObject(originalBaseLanguages);
    let specificNamedKey = {};
    Object.entries(originalSpecificLanguages).forEach(([key, value]) => {
      specificNamedKey[key] = mapLanguageObject(value);
    });
    return { base: baseNamedKey, ...specificNamedKey };
  },

  toKeyValue: (namedKey) => {
    const mapLanguageObject = (original) => {
      return Object.entries(original).reduce((acc, [key, value]) => {
        acc[key] = Object.entries(value).map(
          ([translationKey, translationValue]) => {
            return { key: translationKey, value: translationValue };
          }
        );
        return acc;
      }, {});
    };

    return {
      specific: Object.entries(namedKey).reduce((acc, [key, value]) => {
        if (key !== "base" && key !== "timestamp") {
          acc[key] = mapLanguageObject(value);
        }
        return acc;
      }, {}),
      base: mapLanguageObject(namedKey.base),
    };
  },
};

const diff = (source, target) => {
  if (typeof source === "object" && !Array.isArray(source) && source !== null)
    return Object.keys(source).reduce((acc, key) => {
      if (!target.hasOwnProperty(key)) acc[key] = source[key];
      else {
        const result = diff(source[key], target[key]);
        if (result && Object.keys(result).length > 0) {
          acc[key] = result;
        }
      }
      return acc;
    }, {});
};

const main = async () => {
  try {
    const endpoint = core.getInput("endpoint");
    const stringQueryParams = core.getInput("query-params");
    const path = core.getInput("file-path");
    const backupFilePath = core.getInput("backup-file-path");
    const currentBranchName = core.getInput("current-branch");
    const appInfo = JSON.parse(core.getInput("app-info"));

    const thisBranch = appInfo.find(
      (branch) => branch.branchName === currentBranchName
    );

    // If branch not found: exit
    if (!thisBranch) return;

    const serviceToken = thisBranch.serviceToken;
    const bearerToken = thisBranch.bearerToken;

    const headers = {
      Authorization: `Bearer ${bearerToken}`,
      "Content-type": "application/json",
      "X-SERVICE-TOKEN": serviceToken,
    };

    const response = await Adapter.getServerTranslation(endpoint, headers);
    const target = TranslationHelper.toNamedKey(response.data.data);

    fs.readFile(path, "utf-8", (error, file) => {
      if (error) {
        return console.error(error);
      }
      const source = JSON.parse(file);
      const diffToSend = TranslationHelper.toKeyValue(diff(source, target));
      if (stringQueryParams)
        Adapter.setServerTranslation(
          diffToSend,
          `${endpoint}?${stringQueryParams}`,
          headers
        );
    });

    fs.writeFile(backupFilePath, JSON.stringify(target), (err) => {
      if (err) console.error(err);
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
