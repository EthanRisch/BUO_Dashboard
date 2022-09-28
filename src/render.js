const { google } = require("googleApis");
const keys = require("./data/keys.json");
require("dotenv").config();

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
  "https://www.googleapis.com/auth/spreadsheets",
]);

/////////////////// GET JSON //////////////////////////////////////
const teamScores = require("./data/teams.json");
const stops = require("./data/stops.json");

////////////////////// INIT BUTTONS ////////////////////////////////
// const updateFormBtn = document.getElementById("updateForm");
const calcScoresBtn = document.getElementById("calcScores");

////////////////////////// Button Listeners //////////////////////////
// updateFormBtn.addEventListener("click", () => updateForm());
calcScoresBtn.addEventListener("click", () => {
  const client = authorize();
  manager(client);
});

/////////////// onCalcScoresClick ///////////////////////////////////
function calcScores() {
  const client = authorize();
}

////////////////// Authorization /////////////////////////
/**
 * Authorize the client and give edit access to the spreadsheet
 */
function authorize() {
  client.authorize(function (err, tokens) {
    if (err) {
      console.log(err);
      return;
    }
  });

  return client;
}

/////////////////////// Update Data ////////////////////////////

/**
 * This function manages the rest of the file.
 *
 * @param {authenticated google client} cl
 */
async function manager(cl) {
  const gsapi = google.sheets({ version: "v4", auth: cl });

  resetVals();

  let dataArr = await getData(gsapi);

  scoreTeams(dataArr);

  let sortedList = sortTeams();

  printResults(gsapi, sortedList, "Results");

  let stopsArr = countStops(dataArr);

  printResults(gsapi, stopsArr, "Stops");
  updateElectronData(sortedList, "teams-data", true);
  updateElectronData(stopsArr, "stops-data", false);
}

function resetVals() {
  for (team in teamScores) {
    teamScores[team] = 0;
  }
  for (item in stops) {
    stops[item] = 0;
  }
}

async function getData(gsapi) {
  const opt_get = {
    spreadsheetId: process.env.SHEET_ID,
    range: "Form Responses 2",
  };

  // Get all data in sheet
  let data = await gsapi.spreadsheets.values.get(opt_get);
  return data.data.values;
}

/**
 * This function iterates through the list of teams and scores them.
 *
 * @param {String[][]} dataArr The array that stores team names and current scores
 */
function scoreTeams(dataArr) {
  dataArr.map(function (r) {
    for (var prop in teamScores) {
      if (r[2] === prop) {
        teamScores[prop] = teamScores[prop] + parseInt(r[3]);
      }
    }
  });
}

/**
 * This function itereates through the list of stops and counts how many times each has been visited.
 *
 * @param {*} data
 * @returns
 */
function countStops(data) {
  data.map(function (r) {
    for (var prop in stops) {
      if (r[1] === prop) {
        stops[prop] = stops[prop] + 1;
      }
    }
  });

  let stopsArr = [];

  for (var stop in stops) {
    stopsArr.push([stop, stops[stop]]);
  }

  return stopsArr;
}

/**
 * This function sorts the teams via score.
 *
 * @returns A sorted 2d array of teams names and their scores
 */
function sortTeams() {
  let sortable = [];

  for (var team in teamScores) {
    sortable.push([team, teamScores[team]]);
  }

  sortable.sort(function (a, b) {
    return b[1] - a[1];
  });

  return sortable;
}

/**
 * This function prints the desired data to the spreadsheet.
 *
 * @param {*} gsapi
 * @param {*} values
 * @param {*} location
 */
async function printResults(gsapi, values, location) {
  const resource = { values };

  await gsapi.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: location,
  });

  const opt_append = {
    spreadsheetId: SHEET_ID,
    range: location,
    valueInputOption: "RAW",
    resource: resource,
    // range: 'Data!A2:C5'
  };

  gsapi.spreadsheets.values.append(opt_append);
}

function updateElectronData(values, location, isTeams) {
  let element = document.getElementById(location);

  let toAdd = "";

  for (i = 0; i < values.length; i++) {
    if (i < 3 && isTeams) {
      toAdd +=
        "<p style = 'font-weight: bold; background-color:rgb(255, 157, 157); margin: 0'>";
      toAdd += values[i][0] + ": " + values[i][1];
      toAdd += "<br/></p>";
      continue;
    }
    toAdd += values[i][0] + ": " + values[i][1];
    toAdd += "<br/>";
  }

  element.innerHTML = toAdd;
}
