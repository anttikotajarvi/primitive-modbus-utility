#!/usr/bin/env node

/***************************************************************************
 * Primitive Modbus Utility
 *
 * Requirements:
 *   npm install modbus-serial
 *
 * Usage:
 *   1. Run: node modbusUtility.js
 *   2. Follow the on-screen prompts.
 ***************************************************************************/

const ModbusRTU = require("modbus-serial");
const readline = require("readline");

// -------------------------------------------------------------------------
// Configuration Constants
// -------------------------------------------------------------------------
const {
    SERIAL_PORT,
    BAUD_RATE,
    DATA_BITS,
    STOP_BITS,
    PARITY,
    SLAVE_ID,
    DEFAULT_QUANTITY,
    ENDIANNESS
  } = require("./config");
// -------------------------------------------------------------------------
// Register Names
//   Set to an object with "0xADDR":"Name" pairs, or false to disable
// -------------------------------------------------------------------------
const {
    DISCRETE_INPUT_NAMES,
    COIL_NAMES,
    HOLDING_REGISTER_NAMES,
    INPUT_REGISTER_NAMES
} = require("./register-names.json");
  

// -------------------------------------------------------------------------
// Helper: Modbus function names
// -------------------------------------------------------------------------
const FUNCTION_NAMES = {
  "0x01": "Read Coils",
  "0x02": "Read Discrete Inputs",
  "0x03": "Read Holding Registers",
  "0x04": "Read Input Registers",
  "0x0F": "Write Multiple Coils",
  "0x10": "Write Multiple Holding Registers"
};

// -------------------------------------------------------------------------
// Helper: Parse a string value into a number (binary, hex, or decimal).
// -------------------------------------------------------------------------
function parseValue(val) {
  if (val.startsWith("b")) {
    // Binary, e.g., b1010
    return parseInt(val.slice(1), 2);
  } else if (val.startsWith("0x") || val.startsWith("0X")) {
    // Hex, e.g., 0xFF
    return parseInt(val, 16);
  }
  // Decimal
  return parseInt(val, 10);
}

// -------------------------------------------------------------------------
// Helper: Convert a Modbus register value to the correct endianness.
// For a 16-bit register, if LITTLE, swap lower and higher bytes.
// -------------------------------------------------------------------------
function convertEndianness(value) {
  if (ENDIANNESS.toUpperCase() === "LITTLE") {
    const lowerByte = value & 0xff;
    const upperByte = (value >> 8) & 0xff;
    return (lowerByte << 8) | upperByte;
  }
  return value; // If BIG, do nothing
}

// -------------------------------------------------------------------------
// Helper: Convert decimal to hexadecimal with 0x prefix
// -------------------------------------------------------------------------
function toHex(num) {
  return "0x" + num.toString(16).padStart(4, "0").toUpperCase();
}

// -------------------------------------------------------------------------
// Helper: Convert integer to 16-bit binary with spaces every 4 bits
// -------------------------------------------------------------------------
function toBinaryWithSpaces(num) {
  const binStr = num.toString(2).padStart(16, "0");
  return binStr.replace(/(.{4})/g, "$1 ");
}

// -------------------------------------------------------------------------
// Helper: Normalize address letters to uppercase
// -------------------------------------------------------------------------
function normalizeAddress(address) {
    return address.toUpperCase().replace("0X", "0x");
}

// -------------------------------------------------------------------------
// Helper: Look up a name in the relevant register-name object
// -------------------------------------------------------------------------
function getRegisterName(functionCode, _addressHex) {
    const addressHex = normalizeAddress(_addressHex);

    switch (functionCode) {
    case "0x01":
      if (COIL_NAMES && COIL_NAMES[addressHex]) {
        return COIL_NAMES[addressHex];
      }
      break;
    case "0x02":
      if (DISCRETE_INPUT_NAMES && DISCRETE_INPUT_NAMES[addressHex]) {
        return DISCRETE_INPUT_NAMES[addressHex];
      }
      break;
    case "0x03":
      if (HOLDING_REGISTER_NAMES && HOLDING_REGISTER_NAMES[addressHex]) {
        return HOLDING_REGISTER_NAMES[addressHex];
      }
      break;
    case "0x04":
      if (INPUT_REGISTER_NAMES && INPUT_REGISTER_NAMES[addressHex]) {
        return INPUT_REGISTER_NAMES[addressHex];
      }
      break;
    default:
      return "";
  }
  return "";
}

// -------------------------------------------------------------------------
// Setup readline interface for CLI prompts
// -------------------------------------------------------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// -------------------------------------------------------------------------
// Create Modbus client
// -------------------------------------------------------------------------
const client = new ModbusRTU();

/**
 * Initialize connection to the serial port
 */
async function initModbusConnection() {
  try {
    await client.connectRTUBuffered(SERIAL_PORT, {
      baudRate: BAUD_RATE,
      dataBits: DATA_BITS,
      stopBits: STOP_BITS,
      parity: PARITY
    });
    client.setID(SLAVE_ID);
    console.log(`Connected to Modbus slave ID ${SLAVE_ID} on port ${SERIAL_PORT}`);
  } catch (err) {
    console.error("Error connecting to Modbus device:", err.message);
  }
}
                       
/**
 * Prompt user for input (promise-based).
 * @param {string} question
 * @returns {Promise<string>}
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Handle Read request
 * functionCode 0x01 - Read Coils
 * functionCode 0x02 - Read Discrete Inputs
 * functionCode 0x03 - Read Holding Registers
 * functionCode 0x04 - Read Input Registers
 */
async function handleRead(functionCode) {
  try {
    let addressQuantity = await askQuestion("Enter address [space] quantity (default=1): ");
    let [addrStr, qtyStr] = addressQuantity.split(/\s+/);

    if (!addrStr) {
      // If user didn't enter anything, default to address = 0
      addrStr = "0";
    }
    if (!qtyStr) {
      // If user didn't enter quantity, default to 1
      qtyStr = String(DEFAULT_QUANTITY);
    }

    const startAddress = parseValue(addrStr);
    const quantity = parseValue(qtyStr);

    // Perform the read based on function code
    let data;
    switch (functionCode) {
      case "0x01": // Read Coils
        data = await client.readCoils(startAddress, quantity);
        break;
      case "0x02": // Read Discrete Inputs
        data = await client.readDiscreteInputs(startAddress, quantity);
        break;
      case "0x03": // Read Holding Registers
        data = await client.readHoldingRegisters(startAddress, quantity);
        break;
      case "0x04": // Read Input Registers
        data = await client.readInputRegisters(startAddress, quantity);
        break;
      default:
        console.error("Unsupported read function code.");
        return;
    }
    // Repeat the request back to user
    console.log(`"${FUNCTION_NAMES[functionCode]}" ${quantity} registers from ${toHex(startAddress)}.`);

    /*
      data for coils/discrete inputs -> data.data is an array of booleans
      data for registers -> data.data is an array of 16-bit numbers
    */
    if (functionCode === "0x01" || functionCode === "0x02") {
      // Coils / Discrete inputs (booleans)
      const tableData = {};
      const bits = data.data.slice(0, quantity); // pick only the requested quantity
      bits.forEach((boolVal, index) => {
        const addressDec = startAddress + index;
        const addressHex = toHex(addressDec);
        const name = getRegisterName(functionCode, addressHex);
        const registerPrefix = functionCode === "0x01" ? "C" : "DI";
        const registerID = `${registerPrefix}${addressDec+1}`; // 1-based index
        tableData[index] = {
            "Reg.": registerID,
            "Addr.": addressHex,
            "Name": name,
            "Value": boolVal
        };
      });
      console.table(tableData);

    } else {
      // Holding / Input registers (16-bit numbers)
      const tableData = data.data.map((rawVal, index) => {
        const addressDec = startAddress + index;
        const addressHex = toHex(addressDec);
        const name = getRegisterName(functionCode, addressHex);

        // Convert raw value by endianness
        const actualValue = convertEndianness(rawVal);

        const registerPrefix = functionCode === "0x03" ? "HR" : "IR";
        const registerID = `${registerPrefix}${addressDec+1}`; // 1-based index
        return {
          "Reg.": registerID,
          "Addr.": addressHex,
          "Name": name,
          "Decimal": actualValue,
          "Hex": toHex(actualValue),
          "Binary": toBinaryWithSpaces(actualValue)
        };
      });
      console.table(tableData);
    }
  } catch (err) {
    console.error("Error reading data:", err.message);
  }
}

/**
 * Handle Write request
 * functionCode 0x0F - Write Multiple Coils
 * functionCode 0x10 - Write Multiple Holding Registers
 */
async function handleWrite(functionCode) {
  try {
    let addressValues = await askQuestion(
      "Enter address [space] value [space] value ... (ex: 10 1 1 0 1): "
    );

    const parts = addressValues.split(/\s+/);
    if (parts.length < 2) {
      console.error("You must provide at least an address and one value.");
      return;
    }

    const startAddress = parseValue(parts[0]);
    const values = parts.slice(1).map(parseValue);

    if (functionCode === "0x0f") {
      // Write Multiple Coils
      // values are booleans, so interpret any nonzero as true
      const booleanVals = values.map((val) => val !== 0);
      await client.writeCoils(startAddress, booleanVals);
      console.log("Successfully wrote multiple coils.");

    } else if (functionCode === "0x10") {
      // Write Multiple Holding Registers
      const registerVals = values.map(convertEndianness);
      await client.writeRegisters(startAddress, registerVals);
      console.log("Successfully wrote multiple holding registers.");

    } else {
      console.error("Unsupported write function code.");
    }
  } catch (err) {
    console.error("Error writing data:", err.message);
  }
}

/**
 * Main interactive loop
 */
async function mainLoop() {
  // Initialize modbus connection
  await initModbusConnection();

  while (true) {
    // Prompt for function code
    console.log("\nChoose an action (or type 'quit' to exit):");
    console.log("READ:");
    console.log("  0x01 -> Coils");
    console.log("  0x02 -> Discrete Inputs");
    console.log("  0x03 -> Holding Registers");
    console.log("  0x04 -> Input Registers");
    console.log("WRITE:");
    console.log("  0x0F -> Multiple Coils");
    console.log("  0x10 -> Multiple Holding Registers");

    let funcCode = await askQuestion("Enter function code: ");
    funcCode = funcCode.toLowerCase();

    if (funcCode === "quit") {
      console.log("Exiting...");
      break;
    }

    // Decide read or write
    switch (funcCode) {
      // READ
      case "0x01":
      case "0x02":
      case "0x03":
      case "0x04":
        await handleRead(funcCode);
        break;

      // WRITE
      case "0x0f":
      case "0x10":
        await handleWrite(funcCode);
        break;

      default:
        console.error("Unrecognized function code. Please try again.");
        break;
    }
  }

  // Close the connection and readline
  client.close();
  rl.close();
}

// Run the main loop
mainLoop().catch((err) => {
  console.error("Unexpected error:", err);
  client.close();
  rl.close();
});
