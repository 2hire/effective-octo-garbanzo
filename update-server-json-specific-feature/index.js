const core = require("@actions/core");
const axios = require("axios");
const fs = require("fs");

// utils
const { ErrorMessage } = require("../utils/constants");
const { filterLanguages, diff, isObject, isString } = require("../utils/utils");

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
      if (isObject(original))
        return Object.entries(original).reduce((acc, [key, value]) => {
          acc[key] = value.reduce((acc, keyValueObject) => {
            acc[keyValueObject.key] = keyValueObject.value;
            return acc;
          }, {});
          return acc;
        }, {});
      return {};
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
      if (isObject(original))
        return Object.entries(original).reduce((acc, [key, value]) => {
          acc[key] = Object.entries(value).map(
            ([translationKey, translationValue]) => {
              return { key: translationKey, value: translationValue };
            }
          );
          return acc;
        }, {});
      return {};
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

const main = async () => {
  try {
    const endpoint = core.getInput("endpoint");
    const path = core.getInput("file-path");
    const backupFilePath = core.getInput("backup-file-path");
    const currentBranchName = core.getInput("current-branch");
    const secrets = JSON.parse(core.getInput("secrets-context"));
    const secretSuffix = core.getInput("secret-suffix");

    const [_, thisBranchUnparsed] = Object.entries(secrets).find(
      ([key, value]) =>
        key.endsWith(secretSuffix) &&
        JSON.parse(value).branchName === currentBranchName
    );

    // If branch not found: exit
    if (!thisBranchUnparsed) return;

    const thisBranch = JSON.parse(thisBranchUnparsed);

    // Check if secret is an object, else return
    if (!isObject(thisBranch)) {
      console.error(ErrorMessage.NOT_AN_OBJECT);
      return;
    }

    const serviceToken = thisBranch.serviceToken;
    const bearerToken = thisBranch.bearerToken;
    const selectedLanguages = thisBranch.selectedLanguages;

    // type checking
    if (
      !isString(serviceToken) ||
      !isString(bearerToken) ||
      !Array.isArray(selectedLanguages)
    ) {
      console.error(ErrorMessage.INCOMPATIBLE_PROPERTIES);
      return;
    }

    const headers = {
      Authorization: `Bearer ${bearerToken}`,
      "Content-type": "application/json",
      "X-SERVICE-TOKEN": serviceToken,
    };

    // get server translations
    const response = await Adapter.getServerTranslation(
      endpoint.split("?")[0],
      headers
    );
    const target = TranslationHelper.toNamedKey(response.data.data);

    // reads translation file from input
    fs.readFile(path, "utf-8", (error, file) => {
      if (error) {
        return console.error(error);
      }
      const source = JSON.parse(file);

      // filtering by selected languages
      filterLanguages(source, selectedLanguages);

      // calculate diff between current translations and server translations to send to the server
      const diffToSend = TranslationHelper.toKeyValue(diff(source, target));

      Adapter.setServerTranslation(diffToSend, `${endpoint}`, headers);
    });

    // Save server translations
    fs.writeFile(backupFilePath, JSON.stringify(target), (err) => {
      if (err) console.error(err);
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
