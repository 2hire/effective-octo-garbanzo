const core = require("@actions/core");
const axios = require("axios");
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
          acc[key] = sort(object[key]);
          return acc;
        }, {});
    }
    return object;
  },
};

const GitHubAPI = {
  Repository: {
    getContents: async (owner, repo, branchName, path, token) => {
      try {
        return await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branchName}`,
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
    },
    updateContents: async (
      owner,
      repo,
      branchName,
      path,
      content,
      sha,
      token
    ) => {
      try {
        return await axios.put(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          JSON.stringify({
            message: "[Garbanzo] Sorted target json [skip ci]",
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
    },
  },
};

const main = () => {
  try {
    const owner = core.getInput("owner");
    const repo = core.getInput("repo");
    const currentBranchName = core.getInput("current-branch");
    const path = core.getInput("file-path");
    const token = core.getInput("token");

    fs.readFile(path, "utf-8", async (error, data) => {
      if (error) {
        return console.error(error);
      }
      const object = JSON.parse(data);

      const responseJsonFile = await GitHubAPI.Repository.getContents(
        owner,
        repo,
        currentBranchName,
        path,
        token
      );
      if (responseJsonFile.data) {
        const jsonFileSHA = responseJsonFile.data.sha;
        await GitHubAPI.Repository.updateContents(
          owner,
          repo,
          currentBranchName,
          path,
          object,
          jsonFileSHA,
          token
        );
      }
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
