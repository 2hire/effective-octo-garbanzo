const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const fs = require("fs");

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

try {
  const path = core.getInput("file-path");
  fs.readFile(path, "utf-8", (error, data) => {
    if (error) {
      return console.log(error);
    }

    console.log(data);
  });

  const githubToken = core.getInput("github-token");

  const appInfo = JSON.parse(core.getInput("app-info"));

  appInfo.forEach((element) => {
    getData(element.branchName, githubToken).then((response) => console.log(response.data));
  });

  const time = new Date().toTimeString();
  core.setOutput("time", time);
  // // Get the JSON webhook payload for the event that triggered the workflow
  // const payload = JSON.stringify(github.context.payload, undefined, 2);
  // console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
