const core = require("@actions/core");
const axios = require("axios");
const fs = require("fs");

const getRawJsonData = async (owner, repo, branchName, path, token) => {
  try {
    return await axios.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branchName}/${path}`,
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

const Utils = {
  updateKeys: (source, target) => {
    if (
      typeof source === "object" &&
      !Array.isArray(source) &&
      source !== null
    ) {
      const sourceKeys = Object.keys(source);
      sourceKeys.forEach((key) => {
        if (!target.hasOwnProperty(key)) target[key] = source[key];
        else {
          Utils.updateKeys(source[key], target[key]);
        }
      });
    }

    return [source, target];
  },
};

const GitHubAPI = {
  Branch: {
    getRef: async (owner, repo, branchName, token) => {
      try {
        return await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branchName}`,
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
    create: async (owner, repo, newBranchName, sha, token) => {
      try {
        return await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
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
      } catch (error) {
        console.error(error);
      }
    },
  },

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
            message: "feat: [Garbanzo] Updated target json",
            content: Buffer.from(
              JSON.stringify(content, null, 2) + "\n",
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

  Pull: {
    createRequest: async (owner, repo, head, base, token) => {
      try {
        return await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          JSON.stringify({
            head,
            base,
            title: `[Garbanzo] Merging ${head} to ${base}`,
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
    // Getting inputs from action
    const owner = core.getInput("owner");
    const repo = core.getInput("repo");
    const path = core.getInput("file-path");
    const token = core.getInput("token");
    const secrets = JSON.parse(core.getInput("secrets-context"));
    const secretSuffix = core.getInput("secret-suffix");

    // Read file from path
    fs.readFile(path, "utf-8", (error, data) => {
      if (error) {
        return console.error(error);
      }

      Object.entries(secrets).forEach(async ([key, value]) => {
        try {
          // Not a secret we are interested in, skip
          if (!key.endsWith(secretSuffix)) return;
          const parsedValue = JSON.parse(value);

          // Check if secret is an object, else return
          if (
            !(
              parsedValue &&
              !Array.isArray(parsedValue) &&
              typeof parsedValue === "object"
            )
          ) {
            console.log("Secret is not an object. Skipping...");
            return;
          }

          const branch = parsedValue.branchName;
          const selectedLanguages = parsedValue.selectedLanguages;

          // type checking
          if (
            (!typeof branch === "string" && !branch instanceof String) ||
            !Array.isArray(selectedLanguages)
          ) {
            console.log("Secret has incompatible properties. Skipping...");
            return;
          }

          const garbanzoBranch = branch.split("/")[0] + "-garbanzo";

          // Get json data
          const responseData = await getRawJsonData(
            owner,
            repo,
            branch,
            path,
            token
          );
          if (responseData.data) {
            const source = JSON.parse(data);

            // not an array, return
            if (!Array.isArray(selectedLanguages)) {
              return;
            }

            // filtering by selected languages
            Object.keys(source).forEach((sourceKey) => {
              if (sourceKey === "base" || !isNaN(Number(sourceKey))) {
                source[sourceKey] = Object.keys(source[sourceKey]).reduce(
                  (acc, key) => {
                    if (selectedLanguages.includes(key))
                      acc[key] = source[sourceKey][key];
                    return acc;
                  },
                  {}
                );
              }
            });

            // Updates target keys
            const [_, target] = Utils.updateKeys(source, responseData.data);
            const responseBranchRef = await GitHubAPI.Branch.getRef(
              owner,
              repo,
              branch,
              token
            );
            if (responseBranchRef.data) {
              const branchRefSHA = responseBranchRef.data.object.sha;
              await GitHubAPI.Branch.create(
                owner,
                repo,
                garbanzoBranch,
                branchRefSHA,
                token
              );
              const responseJsonFile = await GitHubAPI.Repository.getContents(
                owner,
                repo,
                garbanzoBranch,
                path,
                token
              );
              if (responseJsonFile.data) {
                const jsonFileSHA = responseJsonFile.data.sha;
                await GitHubAPI.Repository.updateContents(
                  owner,
                  repo,
                  garbanzoBranch,
                  path,
                  target,
                  jsonFileSHA,
                  token
                );
                await GitHubAPI.Pull.createRequest(
                  owner,
                  repo,
                  garbanzoBranch,
                  branch,
                  token
                );
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
