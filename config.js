/**
 * Configuration constants for our Modbus utility.
 * 
 * You can adjust these as needed without touching the CLI logic.
 */
module.exports = {
    // Serial port settings
    SERIAL_PORT: "/dev/ttyACM0",
    BAUD_RATE: 9600,
    DATA_BITS: 8,
    STOP_BITS: 1,
    PARITY: "none",
  
    // Modbus details
    SLAVE_ID: 1,
    DEFAULT_QUANTITY: 1,
  
    // Endianness: "BIG" or "LITTLE"
    ENDIANNESS: "BIG"
  };
  