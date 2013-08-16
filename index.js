var winston = require("winston");
var server = require("./server");

winston.add(winston.transports.File, { filename: 'node-mitm.log' });

process.on("SIGINT", function() {
    winston.info("Got SIGINT. Stop the server.");
    server.stop();
});

server.start();
