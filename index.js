const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const fs = require("fs");

const getData = async () => {
  try {
    return await axios.get("https://dog.ceo/api/breeds/list/all");
  } catch (error) {
    console.error(error);
  }
};

const printData = async () => {
  const data = await getData();

  console.log(data.data.message);
};

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput("who-to-greet");
  console.log(`Hello ${nameToGreet}!`);

  const path = core.getInput("file-path");
  console.log(`File path: ${path}`);
  fs.readFile(path, 'utf-8', (error, data) => {
    if (error) {
      return console.log(error);
    }
    
    console.log(data);
  })
  
  const isPresent = core.getInput("app-info");

  if (isPresent) console.log('We got data!');

  printData();

  const time = new Date().toTimeString();
  core.setOutput("time", time);
  // // Get the JSON webhook payload for the event that triggered the workflow
  // const payload = JSON.stringify(github.context.payload, undefined, 2);
  // console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
