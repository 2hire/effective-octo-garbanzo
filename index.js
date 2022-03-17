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
  if (
    typeof source === "object" &&
    !Array.isArray(yourVariable) &&
    yourVariable !== null
  ) {
    const sourceKeys = Object.keys(source);
    sourceKeys.forEach((key) => {
      if (!target.hasOwnProperty(key)) target[key] = source[key];
      else {
        updateKeys(source[key], target[key]);
      }
    });
  }
};

try {
  console.log("Getting inputs from action");
  // Getting inputs from action
  const path = core.getInput("file-path");
  const githubToken = core.getInput("github-token");
  const appInfo = JSON.parse(core.getInput("app-info"));

  console.log("Reading file from the given path");
  // Read file from path
  fs.readFile(path, "utf-8", (error, data) => {
    if (error) {
      return console.error(error);
    }

    console.log("Read successful");

    const source = JSON.parse(data);

    appInfo.forEach((element) => {
      console.log(`Fetching translations from ${element.branchName}...`);

      getData(element.branchName, githubToken).then((response) => {
        const target = response.data;
        console.log(`Fetched data: ${JSON.stringify(target)}`);
        // Updating keys
        console.log("Fetch successful");
        console.log("Updating keys...");
        updateKeys(source.base, target.base);
        console.log(`develop: ${JSON.stringify(source)}`);
        console.log(`${element.branchName} now: ${JSON.stringify(target)}`);
      });
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
