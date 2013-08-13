var http = require("http");
var server = null;

function start() {
    if (server === null) {
        function onRequest(request, response) {
            console.log("Request received.");

            var options = {
                hostname: "sourceforge.net",
                port: 80,
                method: request.method,
                path: request.url,
                headers: request.headers,
            };

            options.headers.host = options.hostname;

            var req = http.request(options, function(res) {
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
                console.error("Problem with request: " + e.message);
                response.writeHeader(500);
                response.end(e.message);
            });
        }

        server = http.createServer(onRequest);
        server.listen(8888);
        console.log("The server started.");
    } else {
        console.warn("The server has already started.");
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
