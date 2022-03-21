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

const main = async () => {
  try {
    const token = core.getInput("token");
    const data = await getData(token);

    core.setOutput('downloaded-translations', JSON.stringify(data.data, null, 2));
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
