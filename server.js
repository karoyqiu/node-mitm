var winston = require("winston");
var http = require("http");
var fs = require('fs');
var server = null;

function start() {
    if (server === null) {
        function onRequest(request, response) {
            winston.info("Request:", { url: request.url, headers: request.headers });

            var startTime = Date.now();

            var requestBodySize = 0;
            var requestBody = [];
            var responseBodySize = 0;
            var responseBody = [];

            var options = {
                hostname: "www.baidu.com",
                port: 80,
                method: request.method,
                path: request.url,
                headers: request.headers,
            };

            options.headers.host = options.hostname;

            var req = http.request(options, function(res) {
                winston.info("Response:", { statusCode: res.statusCode, headers: res.headers });
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
                    var data = {
                        log: {
                            version: '1.1', // Version of HAR file-format
                            creator: {
                                name: 'node-mitm-har-capture',
                                version: '0.0.1' // TODO: Get from package.json
                                // comment: ""
                            },
                            pages: [{
                                startedDateTime: new Date(startTime).toISOString(),
                                id: 'page' + startTime,
                                title: req.url,
                                pageTimings: { onLoad: deltaTime }
                            }],
                            entries: [{
                                timings: {
                                    send: -1,
                                    receive: -1,
                                    wait: deltaTime,
                                    comment: "Server-side processing only",
                                    onLoad: -1,
                                },
                                startedDateTime: new Date(startTime).toISOString(),
                                time: deltaTime,
                                request: {
                                    method: req.method,
                                    url: req.originalUrl,
                                    httpVersion: 'HTTP/' + req.httpVersion,
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
                                pageref: 'page' + startTime
                            }]
                        }
                    };

                    // REQUEST DATA
                    // Fix up data-stucture with iterative data from request
                    // Headers
                    Object.keys(req._headers).forEach(function (headerName) {
                        data.log.entries[0].request.headersSize += headerName.length + 2 + req._headers[headerName].length;
                        data.log.entries[0].request.headers.push({
                            name: headerName,
                            value: req._headers[headerName]
                        });
                    });

                    // Query strings
/*
                    Object.keys(req.query).forEach(function (queryName) {
                        data.log.entries[0].request.queryString.push({
                            name: queryName,
                            value: req.query[queryName]
                        });
                    });
*/

                    Object.keys(res.headers).forEach(function (headerName) {
                        data.log.entries[0].response.headersSize += headerName.length + 2 + res.headers[headerName].length;
                        data.log.entries[0].response.headers.push({
                            name: headerName,
                            value: res.headers[headerName]
                        });
                    });

                    // Write the data out
                    fs.writeFile(
                        Date.now().toString() + "-host.har",
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
    if (server !== null) {
        server.close();
        server = null;
        console.log("The server stopped.");
    }
}

exports.start = start;
exports.stop = stop;
