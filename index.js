const core = require("@actions/core");
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
    const githubToken = core.getInput("github-token");
    const appInfo = JSON.parse(core.getInput("app-info"));

    // Read file from path
    fs.readFile(path, "utf-8", (error, data) => {
      if (error) {
        return console.error(error);
      }
      const source = JSON.parse(data);

      appInfo.forEach(async (element) => {
        const branch = element.branchName;
        const translationBranch = branch.split("/")[0] + "-translations";

        try {
          const target = (await getData(branch, githubToken)).data;

          updateKeys(source.base, target.base);

          const branchRefSHA = (await getBranchRef(branch, githubToken)).data
            .object.sha;

          await createBranch(translationBranch).translationBranch,
            branchRefSHA,
            githubToken;

          const translationFileSHA = await getTranslationsFile(
            translationBranch,
            githubToken
          );

          await updateTranslations(
            target,
            translationFileSHA,
            translationBranch,
            githubToken
          );

          await createPullRequest(translationBranch, branch, githubToken);
        } catch (error) {
          console.log(error);
        }

        // getData(branch, githubToken).then((response) => {
        //   const target = response.data;
        //   // Updating keys
        //   updateKeys(source.base, target.base);

        //   const translationBranch = branch.split("/")[0] + "-translations";

        //   getBranchRef(branch, githubToken).then((r) => {
        //     createBranch(
        //       translationBranch,
        //       r.data.object.sha,
        //       githubToken
        //     ).then(() => {
        //       // Gets translations file
        //       getTranslationsFile(translationBranch, githubToken).then(
        //         (response) => {
        //           updateTranslations(
        //             target,
        //             response.data.sha,
        //             translationBranch,
        //             githubToken
        //           )
        //             .then(() => {
        //               createPullRequest(translationBranch, branch, githubToken);
        //             })
        //             .catch((error) => {
        //               console.error("Error updating translations", error);
        //             });
        //         }
        //       );
        //     });
        //   });
        // });
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
