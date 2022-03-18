const core = require("@actions/core");
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

const getBranchRef = async (branchName, token) => {
  return await axios.get(
    `https://api.github.com/repos/Khalester/TestGithubActions/git/ref/heads/${branchName}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
};

const createBranch = async (newBranchName, sha, token) => {
  return await axios.post(
    `https://api.github.com/repos/Khalester/TestGithubActions/git/refs`,
    JSON.stringify({
      ref: `refs/heads/${newBranchName}`,
      sha,
    }),
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
};

/**
 * Given a branch name and a token, fetches the translations.
 * @param {string} branchName - The branch name to fetch the translations from.
 * @param {string} token - The token for the authorization header.
 * @returns The file infos.
 */
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

const updateTranslations = async (content, sha, branchName, token) => {
  try {
    return await axios.put(
      `https://api.github.com/repos/Khalester/TestGithubActions/contents/settings/translations.json`,
      JSON.stringify({
        message: "[Translation Sync] Updated translations",
        content: Buffer.from(
          JSON.stringify(content, null, 2),
          "utf-8"
        ).toString("base64"),
        sha,
        branch: branchName,
      }),
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
  } catch (error) {
    console.error(error);
  }
};

try {
  // Getting inputs from action
  const path = core.getInput("file-path");
  const githubToken = core.getInput("github-token");
  const appInfo = JSON.parse(core.getInput("app-info"));

  // Read file from path
  fs.readFile(path, "utf-8", (error, data) => {
    if (error) {
      return console.error(error);
    }
    const source = JSON.parse(data);

    appInfo.forEach((element) => {
      const branch = element.branchName;
      getData(branch, githubToken).then((response) => {
        const target = response.data;
        // Updating keys
        updateKeys(source.base, target.base);

        const translationBranch = branch.split("/")[0] + "/translations";

        getBranchRef(branch, githubToken).then((r) => {
          console.log(r.data);
          createBranch(`${branch.split("/")[0]}-translations`, r.data.object.sha, githubToken);
        })

        // Gets translations file
        // getTranslationsFile(translationBranch, githubToken).then((response) => {
        //   updateTranslations(
        //     target,
        //     response.data.sha,
        //     translationBranch,
        //     githubToken
        //   ).catch((error) => {
        //     console.error("Error updating translations", error);
        //   });
        // });
      });
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
