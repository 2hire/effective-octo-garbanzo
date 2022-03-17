const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const fs = require("fs");

const MessageType = {
  SUCCESS: "success",
  INFO: "info",
  ERROR: "error",
  WARNING: "warning",
};

/**
 * Given a message and a type, prints coloured text based on type.
 * @param {string} message - The message to be printed.
 * @param {MessageType} type - The type of the message.
 */
const print = (message, type) => {
  switch (type) {
    case MessageType.SUCCESS:
      core.info("\033[1;32m", message, "\033[0m");
      break;
    case MessageType.INFO:
      core.info("\033[2m", message, "\033[0m");
      break;
    case MessageType.ERROR:
      core.info("\033[5;1;30;41m", message, "\033[0m");
      break;
    case MessageType.WARNING:
      core.ing("\033[2m", message, "\033[0m");
      break;
    default:
      core.info(message);
  }
};

/**
 * Given a branch name and a token, fetches the translations from the given branch.
 * @param {string} branchName - The branch name to get data from.
 * @param {string} token - The token for the authorization header.
 * @returns promise with fetched json data.
 */
const getData = async (branchName, token) => {
  try {
    return await axios
      .get(
        `https://raw.githubusercontent.com/Khalester/TestGithubActions/${branchName}/settings/translations.json`,
        {
          headers: {
            Authorization: `token ${token}`,
          },
        }
      )
      .json();
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
  print("Getting inputs from action", MessageType.INFO);
  // Getting inputs from action
  const path = core.getInput("file-path");
  const githubToken = core.getInput("github-token");
  const appInfo = JSON.parse(core.getInput("app-info"));

  print("Reading file from the given path", MessageType.INFO);
  // Read file from path
  fs.readFile(path, "utf-8", (error, data) => {
    if (error) {
      return print(error, MessageType.ERROR);
    }

    print("Read successful", MessageType.SUCCESS);

    appInfo.forEach((element) => {
      print(
        `Fetching translations from ${element.branchName}...`,
        MessageType.INFO
      );

      getData(element.branchName, githubToken).then((response) => {
        // Updating keys
        print("Fetch successful", MessageType.SUCCESS);
        print("Updating keys...", MessageType.INFO);
        updateKeys(data.base, response.base);
        print(`develop: ${data}`);
        print(`${element.branchName} now: ${response}`);
      });
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
