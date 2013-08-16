var winston = require("winston");
var http = require("http");
var fs = require('fs');
var server = null;
var targetHost = "www.baidu.com";

var data = {
    log: {
        version: '1.2', // Version of HAR file-format
        creator: {
            name: 'node-mitm-har-capture',
            version: '0.0.1' // TODO: Get from package.json
            // comment: ""
        },
        pages: [],
        entries: []
    }
};

function start() {
    if (server === null) {
        function onRequest(request, response) {
            winston.info("Request:", { url: request.url });

            var startTime = Date.now();

            var requestBodySize = 0;
            var requestBody = [];
            var responseBodySize = 0;
            var responseBody = [];

            var options = {
                hostname: targetHost,
                port: 80,
                method: request.method,
                path: request.url,
                headers: request.headers,
            };

            options.headers.host = options.hostname;

            var req = http.request(options, function(res) {
                winston.info("Response:", { statusCode: res.statusCode });
                response.writeHeader(res.statusCode, http.STATUS_CODES[res.statusCode], res.headers);

                responseBodySize = 0;
                responseBody = [];

                res.on("data", function(chunk) {
                    responseBodySize += chunk.length;
                    responseBody.push(chunk);

                    response.write(chunk);
                });

                res.on("end", function() {
                    if (Buffer.isBuffer(responseBody[0])) {
                        responseBody = Buffer.concat(responseBody).toString("base64");
                    } else {
                        responseBody = responseBody.join("");
                    }

                    response.end();

                    var endTime = Date.now();
                    var deltaTime = endTime - startTime;

                    // Store har-stuff...
                    var pageId = "page" + startTime;
                    var page = {
                        startedDateTime: new Date(startTime).toISOString(),
                        id: pageId,
                        title: req.path,
                        pageTimings: { onLoad: deltaTime }
                    };
                    var entry = {
                        timings: {
                            send: -1,
                            receive: -1,
                            wait: deltaTime,
                            onLoad: -1,
                        },
                        startedDateTime: new Date(startTime).toISOString(),
                        time: deltaTime,
                        request: {
                            method: req.method,
                            url: req.path,
                            httpVersion: 'HTTP/' + req.res.httpVersion,
                            headersSize: 0, // Filled out later
                            headers: [], // Filled out later
                            queryString: [], // TODO
                            cookies: [], // TODO
                            bodySize: requestBodySize,
                            content: {
                                size: requestBodySize,
                                text: requestBody,
                                comment: "Captured input stream"
                            }
                        },
                        response: {
                            status: res.statusCode,
                            redirectURL: req.originalUrl,
                            httpVersion: 'HTTP/' + req.httpVersion, // TODO
                            headersSize: -1,
                            statusText: http.STATUS_CODES[res.statusCode], // TODO
                            headers: [],
                            cookies: [], // TODO
                            bodySize: -1, // TODO
                            redirectURL: "",
                            content: { // TODO
                                size: responseBodySize,
                                mimeType: '',
                                text: responseBody,
                                compression: -1
                            },
                            timings: {
                                send: 0,
                                receive: 0,
                                wait: deltaTime,
                                comment: "Server-side processing only"
                            }
                        },
                        cache: {}, // TODO / is it optional
                        pageref: pageId
                    };

                    // REQUEST DATA
                    // Fix up data-stucture with iterative data from request
                    // Headers
                    Object.keys(req._headers).forEach(function (headerName) {
                        entry.request.headersSize += headerName.length + 2 + req._headers[headerName].length;
                        entry.request.headers.push({
                            name: headerName,
                            value: req._headers[headerName]
                        });
                    });

                    // Query strings
/*
                    Object.keys(req.query).forEach(function (queryName) {
                        entry.request.queryString.push({
                            name: queryName,
                            value: req.query[queryName]
                        });
                    });
*/

                    Object.keys(res.headers).forEach(function (headerName) {
                        entry.response.headersSize += headerName.length + 2 + res.headers[headerName].length;

                        var v = res.headers[headerName];

                        if (v instanceof Array) {
                            v = v.join();
                        }

                        entry.response.headers.push({
                            name: headerName,
                            value: v
                        });
                    });

                    data.log.pages.push(page);
                    data.log.entries.push(entry);

                    // Write the data out
                    fs.writeFile(
                        targetHost + "-host.har",
                        JSON.stringify(data, undefined, 2)
                    );
                });
            });

            request.on("data", function(chunk) {
                requestBodySize += chunk.length;
                requestBody.push(chunk);

                req.write(chunk);
            });

            request.on("end", function() {
                if (Buffer.isBuffer(requestBody[0])) {
                    requestBody = Buffer.concat(requestBody).encode("base64");
                } else {
                    requestBody = requestBody.join("");
                }

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
    winston.info("What?");

    //if (server != null) {
        winston.info("Closing up.");
        server.close();
        winston.info("Closing up 2.");
        server = null;
        winston.info("The server stopped.");
    //}
}

exports.start = start;
exports.stop = stop;
