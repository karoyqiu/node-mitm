var winston = require("winston");
var server = require("./server");

winston.add(winston.transports.File, { filename: 'node-mitm.log' });

server.start();
