#!/usr/bin/env node

/***************************************************************************
 * parseEnums.js
 * 
 * Check README.md
 ***************************************************************************/

const fs = require("fs");
const path = require("path");

/* -------------------------------------------------------------------------
 * CONFIGURATION
 *
 * Adjust these values as needed to parse your file and specific enums.
 * ------------------------------------------------------------------------- */

// The file that contains the C++ enums.
const SOURCE_FILE = "path/to/your/file.h"; 

// Enum names that you want to parse. You can remove or add more if needed.
const DISCRETE_INPUTS_ENUM_NAME = "LOCAL_DISCRETE_INPUTS";
const COILS_ENUM_NAME = "LOCAL_COILS";
const HOLDING_REGISTER_ENUM_NAME = "LOCAL_HOLDING_REGISTERS";
const INPUT_REGISTER_ENUM_NAME = "LOCAL_INPUT_REGISTERS";

// -------------------------------------------------------------------------
// 1) Read the entire file into a string
// -------------------------------------------------------------------------
let fileContents;
try {
  fileContents = fs.readFileSync(SOURCE_FILE, "utf8");
} catch (err) {
  console.error(`Error reading file "${SOURCE_FILE}":`, err.message);
  process.exit(1);
}

// -------------------------------------------------------------------------
// 2) Parse a single enum block by name
//    e.g. parseEnumBlock(fileContents, "LOCAL_DISCRETE_INPUTS")
// -------------------------------------------------------------------------
function parseEnumBlock(text, enumName) {
  // We'll capture everything between:  enum <enumName> {  and the matching };
  // Using a non-greedy ([^}]*) so that we capture until the first }
  // that ends the enum. This is a simplistic approach, but works
  // for many well-formed cases.
  const regex = new RegExp(`enum\\s+${enumName}\\s*\\{([^}]*)\\};`, "m");
  const match = text.match(regex);
  if (!match) {
    // If we don't find a match, return null
    return null;
  }

  const enumBlock = match[1]; // The lines inside the braces { ... }

  // Split into individual lines
  const lines = enumBlock.split("\n");

  const enumMap = {};

  // Each line might look like:
  //   NAME = 0x0000, // comment
  // We can parse that with a regex or split approach.
  // We'll remove trailing commas/comments.
  for (let line of lines) {
    // Trim whitespace
    line = line.trim();
    // Ignore empty lines or lines that don't contain '='
    if (!line || !line.includes("=")) {
      continue;
    }
    // Example pattern:
    //   MY_NAME = 0x0000,
    //   MY_NAME = 0x0000 // comment
    // We can parse with a capturing group for the name and the address.
    const lineRegex = /^(\w+)\s*=\s*(0x[0-9A-Fa-f]+)\s*(,|\/|$)/;
    const lineMatch = line.match(lineRegex);
    if (lineMatch) {
      const name = lineMatch[1];      // e.g. MY_NAME
      const hexVal = lineMatch[2];    // e.g. 0x0000
      // We'll build up an object like: { "0x0000": "MY_NAME" }
      enumMap[hexVal] = name;
    }
  }

  return enumMap;
}

// -------------------------------------------------------------------------
// 3) Build name objects for each enum we care about
// -------------------------------------------------------------------------
function buildRegisterNames() {
  const discreteInputs = parseEnumBlock(fileContents, DISCRETE_INPUTS_ENUM_NAME);
  const coils = parseEnumBlock(fileContents, COILS_ENUM_NAME);
  const holdingRegisters = parseEnumBlock(fileContents, HOLDING_REGISTER_ENUM_NAME);
  const inputRegisters = parseEnumBlock(fileContents, INPUT_REGISTER_ENUM_NAME);

  // Return them all in one object so we can see them together.
  return {
    DISCRETE_INPUT_NAMES: discreteInputs,
    COIL_NAMES: coils,
    HOLDING_REGISTER_NAMES: holdingRegisters,
    INPUT_REGISTER_NAMES: inputRegisters
  };
}

// -------------------------------------------------------------------------
// 4) Execute and print the results
// -------------------------------------------------------------------------
const registerNames = buildRegisterNames();
const out = JSON.stringify(registerNames, null, 2);
const outFile = path.join(__dirname, "register-names.json");
fs.writeFileSync(outFile, out, "utf8");
