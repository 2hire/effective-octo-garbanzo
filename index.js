const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const fs = require("fs");

/**
 * Given a branch name and a token, fetches the translations from the given branch.
 * @param {string} branchName - The branch name to get data from.
 * @param {string} token - The token for the authorization header.
 * @returns promise with fetched json data.
 */
const getData = async (branchName, token) => {
  try {
    return await axios.get(
      `https://raw.githubusercontent.com/Khalester/TestGithubActions/${branchName}/settings/translations.json`,
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );
  } catch (error) {
    console.error(error);
  }
};

/**
 * Given a source object and a target object, updates the target object with missing keys.
 * @param {object} source - The source object.
 * @param {object} target - The target object.
 */
const updateKeys = (source, target) => {
  if (typeof source === "object" && !Array.isArray(source) && source !== null) {
    const sourceKeys = Object.keys(source);
    sourceKeys.forEach((key) => {
      if (!target.hasOwnProperty(key)) target[key] = source[key];
      else {
        updateKeys(source[key], target[key]);
      }
    });
  }
};

const getTranslationsFile = async (branchName, token) => {
  return await axios.get(
    `https://api.github.com/repos/Khalester/TestGithubActions/contents/settings/translations.json?ref=${branchName}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
};

const updateTranslations = async (
  branchName,
  token,
  updatedTranslations,
  sha
) => {
  try {
    return await axios.put(
      `https://api.github.com/repos/Khalester/TestGithubActions/contents/settings/translation.json`,
      {
        message: "[Translation Sync] Updated translations",
        content: updatedTranslations,
        sha,
        branch: branchName,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

try {
  console.log("Getting inputs from action");
  // Getting inputs from action
  const path = core.getInput("file-path");
  const githubToken = core.getInput("github-token");
  const appInfo = JSON.parse(core.getInput("app-info"));

  // console.log("Reading file from the given path");
  // Read file from path
  fs.readFile(path, "utf-8", (error, data) => {
    if (error) {
      return console.error(error);
    }

    // console.log("Read successful");

    const source = JSON.parse(data);

    appInfo.forEach((element) => {
      const branch = element.branchName;
      // console.log(`Fetching translations from ${branch}...`);

      getData(branch, githubToken).then((response) => {
        const target = response.data;
        // console.log(`Fetched data: ${JSON.stringify(target, null, 2)}`);
        // // Updating keys
        // console.log("Fetch successful");
        // console.log("Updating keys...");
        // updateKeys(source.base, target.base);
        // console.log(`develop: ${JSON.stringify(source, null, 2)}`);

        console.log(`${branch} now: ${JSON.stringify(target, null, 2)}\n`);

        console.log("Updating translations...");
        const translationBranch = branch.split("/")[0] + "/translations";
        getTranslationsFile(translationBranch, githubToken).then((response) => {
          updateTranslations(
            translationBranch,
            githubToken,
            target,
            response.sha
          )
            .then((response) => {
              console.log("Translations updated");
            })
            .catch((error) => {
              console.error("Error updating translations");
            });
        });
      });
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
