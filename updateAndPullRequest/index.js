const core = require("@actions/core");
const axios = require("axios");
const fs = require("fs");

const sortObject = (object) => {
  if (typeof object === "object" && !Array.isArray(object) && object !== null)
    return Object.keys(object)
      .sort()
      .reduce((obj, key) => {
        obj[key] = object[key];
        return obj;
      }, {});
  return object;
};


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
        message: "[Translation Sync] Updated translations [skip ci]",
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

const createPullRequest = async (head, base, token) => {
  try {
    return await axios.post(
      "https://api.github.com/repos/Khalester/TestGithubActions/pulls",
      JSON.stringify({
        head,
        base,
        title: `[Translation Sync] Merging ${head} to ${base}`,
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

const main = () => {
  try {
    // Getting inputs from action
    const path = core.getInput("file-path");
    const token = core.getInput("token");
    const appInfo = JSON.parse(core.getInput("app-info"));

    // Read file from path
    fs.readFile(path, "utf-8", (error, data) => {
      if (error) {
        return console.error(error);
      }
      const source = JSON.parse(data);

      appInfo.forEach(async (element) => {
        try {
          const branch = element.branchName;
          const translationBranch = branch.split("/")[0] + "-translations";

          // Get translations data
          const responseData = await getData(branch, token);
          if (responseData.data) {
            const target = responseData.data;
            // Updates target keys
            updateKeys(source.base, target.base);
            const responseBranchRef = await getBranchRef(branch, token);
            if (responseBranchRef.data) {
              const branchRefSHA = responseBranchRef.data.object.sha;
              await createBranch(translationBranch, branchRefSHA, token);
              const responseTranslationsFile = await getTranslationsFile(
                translationBranch,
                token
              );
              if (responseTranslationsFile.data) {
                const translationsFileSHA = responseTranslationsFile.data.sha;
                await updateTranslations(
                  target,
                  translationsFileSHA,
                  translationBranch,
                  token
                );
                await createPullRequest(translationBranch, branch, token);
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
