# primitive-modbus-utility

## Why
To quickly interface with modbus devices.
E.g. using arduino as a modbus slave via USB serial.
This can be done with CMB27/ModbusRTUSlave

## How
- Install dependencies (modbus-serial)
`npm install`
- Check config in `config.js`. Most importantly just set the correct port.

*Optionally:*
- Manually define register names in `register-names.json` 
*or*
 - modify `parse-enums.js` and run `npm run parseEnums` to automatically generate names from a C-style file.
By default the parsing script rquires the format
```
enum LOCAL_HOLDING_REGISTERS { 
	EXAMPLE_REGISTER = 0x0000,
	ANOTHER_REGISTER = 0x0001,
	HR_MAX
}
```
> The final unassigned field (`HR_MAX`) is usually used to dynamically get the enum length. The parser handles these gracefully

*Finally*
- Follow prompts

## Example usage
```
> primitive-modbus-utility@0.1.0 start
> node main.js

Connected to Modbus slave ID 1 on port /dev/ttyACM0

Choose an action (or type 'quit' to exit):
READ:
  0x01 -> Coils
  0x02 -> Discrete Inputs
  0x03 -> Holding Registers
  0x04 -> Input Registers
WRITE:
  0x0F -> Multiple Coils
  0x10 -> Multiple Holding Registers
Enter function code: 0x03
Enter address [space] quantity (default=1): 4 4
"Read Holding Registers" 4 registers from 0x0004.
┌─────────┬───────┬──────────┬─────────────────────────┬─────────┬──────────┬────────────────────────┐
│ (index) │ Reg.  │  Addr.   │          Name           │ Decimal │   Hex    │         Binary         │
├─────────┼───────┼──────────┼─────────────────────────┼─────────┼──────────┼────────────────────────┤
│    0    │ 'HR5' │ '0x0004' │   'CALIBRATE_SENSOR'    │    0    │ '0x0000' │ '0000 0000 0000 0000 ' │
│    1    │ 'HR6' │ '0x0005' │  'SYS_AUTOSTART_TIME'   │  65535  │ '0xFFFF' │ '1111 1111 1111 1111 ' │
│    2    │ 'HR7' │ '0x0006' │   'SYS_AUTOSTOP_TIME'   │  65535  │ '0xFFFF' │ '1111 1111 1111 1111 ' │
│    3    │ 'HR8' │ '0x0007' │   'SYS_SAVE_SETTINGS'   │   255   │ '0x00FF' │ '0000 0000 1111 1111 ' │
└─────────┴───────┴──────────┴─────────────────────────┴─────────┴──────────┴────────────────────────┘

Choose an action (or type 'quit' to exit):
READ:
  0x01 -> Coils
  0x02 -> Discrete Inputs
  0x03 -> Holding Registers
  0x04 -> Input Registers
WRITE:
  0x0F -> Multiple Coils
  0x10 -> Multiple Holding Registers
Enter function code: 

```
