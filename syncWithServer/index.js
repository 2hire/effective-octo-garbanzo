const core = require("@actions/core");
const axios = require("axios");

const getData = async (token) => {
  try {
    return await axios.get(
      `https://raw.githubusercontent.com/Khalester/TestGithubActions/appName1/develop/settings/translations.json`,
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

const updateServerTranslations = () => console.log('Updating server translations');

const main = async () => {
  try {
    const appInfo = JSON.parse(core.getInput("app-info"));
    const currentBranchName = core.getInput("current-branch");
    console.log(currentBranchName);
    console.log(
      appInfo.find((branch) => branch.branchName === currentBranchName)
    );
    const token = core.getInput("token");

    updateServerTranslations();

    const data = await getData(token);

    core.setOutput(
      "downloaded-translations",
      JSON.stringify(data.data, null, 2)
    );
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
