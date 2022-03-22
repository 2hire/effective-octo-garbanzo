const core = require("@actions/core");
const axios = require("axios");

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

const updateServerJsonFile = () => console.log('Updating server translations');

const main = async () => {
  try {
    const owner = core.getInput("owner");
    const repo = core.getInput("repo");
    const currentBranchName = core.getInput("current-branch");
    const path = core.getInput("file-path");
    const token = core.getInput("token");
    const appInfo = JSON.parse(core.getInput("app-info"));
    console.log(currentBranchName);
    console.log(
      appInfo.find((branch) => branch.branchName === currentBranchName)
    );

    updateServerJsonFile();

    const data = await getRawJsonData(owner, repo, currentBranchName, path, token);

    core.setOutput(
      "downloaded-json-file",
      JSON.stringify(data.data, null, 2)
    );
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
