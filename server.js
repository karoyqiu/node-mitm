var winston = require("winston");
var http = require("http");
var server = null;

function start() {
    if (server === null) {
        function onRequest(request, response) {
            winston.info("Request:", { url: request.url, headers: request.headers });

            var options = {
                hostname: "sourceforge.net",
                port: 80,
                method: request.method,
                path: request.url,
                headers: request.headers,
            };

            options.headers.host = options.hostname;

            var req = http.request(options, function(res) {
                winston.info("Response:", { statusCode: res.statusCode, headers: res.headers });
                response.writeHeader(res.statusCode, http.STATUS_CODES[res.statusCode], res.headers);

                res.on("data", function(chunk) {
                    response.write(chunk);
                });

                res.on("end", function() {
                    response.end();
                });
            });

            request.on("data", function(chunk) {
                req.write(chunk);
            });

            request.on("end", function() {
                req.end();
            });

            req.on("error", function(e) {
                winston.error("Problem with request: " + e.message);
                response.writeHeader(500);
                response.end(e.message);
            });
        }

        server = http.createServer(onRequest);
        server.listen(8888);
        winston.info("The server started.");
    } else {
        winston.warn("The server has already started.");
    }
}

function stop() {
    if (server !== null) {
        server.close();
        server = null;
        console.log("The server stopped.");
    }
}

exports.start = start;
exports.stop = stop;
