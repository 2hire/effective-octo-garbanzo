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

const updateAndSortKeys = (source, target) => {
  if (typeof source === "object" && !Array.isArray(source) && source !== null) {
    const sourceKeys = Object.keys(source);
    sourceKeys.forEach((key) => {
      if (!target.hasOwnProperty(key)) target[key] = source[key];
      else {
        const [sKeys, tKeys] = updateAndSortKeys(source[key], target[key]);
        source[key] = sKeys;
        target[key] = tKeys;
      }
      // sorts children keys
      source[key] = sortObject(source[key]);
      target[key] = sortObject(target[key]);
    });
  }

  return [source, target];
};

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

const getBranchRef = async (owner, repo, branchName, token) => {
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
};

const createBranch = async (owner, repo, newBranchName, sha, token) => {
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
};

const getJsonFileInfo = async (owner, repo, branchName, path, token) => {
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
};

const updateJson = async (
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
        message: "[Garbanzo] Updated target json [skip ci]",
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

const createPullRequest = async (owner, repo, head, base, token) => {
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
};

const main = () => {
  try {
    // Getting inputs from action
    const owner = core.getInput("owner");
    const repo = core.getInput("repo");
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
            // Updates target keys
            const [_, target] = updateAndSortKeys(source, responseData.data);
            const responseBranchRef = await getBranchRef(
              owner,
              repo,
              branch,
              token
            );
            if (responseBranchRef.data) {
              const branchRefSHA = responseBranchRef.data.object.sha;
              await createBranch(owner, repo, garbanzoBranch, branchRefSHA, token);
              const responseJsonFile = await getJsonFileInfo(
                owner,
                repo,
                garbanzoBranch,
                path,
                token
              );
              if (responseJsonFile.data) {
                const jsonFileSHA = responseJsonFile.data.sha;
                await updateJson(
                  owner,
                  repo,
                  garbanzoBranch,
                  path,
                  target,
                  jsonFileSHA,
                  token
                );
                await createPullRequest(owner, repo, garbanzoBranch, branch, token);
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
