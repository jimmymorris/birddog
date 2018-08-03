const express = require('express');
const app = express();
const server = require('http').createServer(app);

const io = require('socket.io').listen(server);

const crawler = require('crawler');
const request = require('request');
const cheerio = require('cheerio');
const minimist = require('minimist');

const domain = 'https://www.sabrehospitality.com';
let sitemap = domain.slice(-1) !== '/' ? domain + '/sitemap.xml' : domain + 'sitemap.xml',
    $,
    connections = [],
    failedURLs = [],
    pageQueue = [];

const badStatusCodes = [404, 500, 501, 502];

server.listen(process.env.PORT || 3000);

console.log('Server running...');

app.get('/', (req, res) =>{
    res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', function (socket) {
    failedURLs = [];
    pageQueue = [];
    io.to(`${socket.id}`).emit('heel');
    io.to(`${socket.id}`).emit('new scent', {
        msg: `Getting sitemap... <a href="${sitemap}" target="_blank">${sitemap}</a>`
    });

    request(sitemap, function (error, response, html) {
        if(badStatusCodes.includes(response.statusCode)) {
            io.to(`${socket.id}`).emit('whine', {
                msg: `Sitemap returned status: ${response.statusCode} :(`
            });
            return;
        }

        if(error) {
            io.to(`${socket.id}`).emit('whine', {
                msg: `<strong>ERROR:</strong> <em>${error}</em>`
            });
            return;
        }

        if (response.statusCode) {
            if (response.headers['content-type'] == 'text/xml') {
                $ = cheerio.load(html);
                io.to(`${socket.id}`).emit('new scent', {
                    msg: `Parsing sitemap...`
                });
                if (sitemap) {
                    $('url').each(function (i, page) {
                        pageQueue.push($(page).find('loc').text());
                    });
                } else {
                    $('nav page').each(function (i, page) {
                        let url = $(page).attr('name'),
                            path = $(page).attr('path');
                        if (!url.includes('http') && url !== '' && !path.includes('ajax'))
                            pageQueue.push(`${domain}${url}`);
                    });
                }
                if (pageQueue.length === 0) {
                    io.to(`${socket.id}`).emit('whine', {
                        msg: `There are <strong>no</strong> pages to crawl.`
                    });
                    return;
                }
                io.to(`${socket.id}`).emit('yelp', {
                    msg: `There are <strong>${pageQueue.length}</strong> pages to crawl. Time to queue`
                });

                io.to(`${socket.id}`).emit('start flush');

                sniff.queue(pageQueue);

                sniff.on('drain', () => {
                    io.to(`${socket.id}`).emit('laydown', {
                        msg: '<strong>Birddog is laying down.</strong>'
                    });
                });

            } else {
                io.to(`${socket.id}`).emit('whine', {
                    msg: `The sitemap was not XML :(`
                });
            }
        }
    });

    socket.on('disconnect', function () {
        io.to(`${socket.id}`).emit('heel');
    });

    const sniff = new crawler({
        maxConnections: 10,
        retries: 3,
        callback: function (error, res, done) {
            // process.stdout.clearLine();
            // process.stdout.cursorTo(0);
            // process.stdout.write(sniff.queueSize + ' pages left out of ' + pageQueue.length + '...');
            io.to(`${socket.id}`).emit('flush', {
                msg: `${sniff.queueSize} pages left out of ${pageQueue.length}...`
            });

            if (error) {
                failedURLs.push(res.options.uri);
                io.to(`${socket.id}`).emit('bad dog', {
                    msg: `<strong>Error</strong>: ${res.options.uri}. ${error}`
                });
                // console.log('\x1b[31m', `FAIL: ${res.options.uri}`, '\x1b[0m');
                // console.log('\x1b[31m', error, '\x1b[0m');
            } else {
                if (res.body.length < 100) {
                    // If the result is a blank page
                    io.to(`${socket.id}`).emit('bad dog', {
                        msg: `<strong>BLANK PAGE</strong>: ${res.options.uri}`
                    });
                    // console.log('\x1b[31m', `FAIL: ${res.options.uri}`, '\x1b[0m');
                    // failedURLs.push('\x1b[31m' + `FAIL: ${res.options.uri}` + '\x1b[0m');
                } else if (badStatusCodes.includes(res.statusCode)) {
                    // If the result is a bad error status code
                    io.to(`${socket.id}`).emit('bad dog', {
                        msg: `<strong>BAD STATUS (${res.statusCode})</strong>: ${res.options.uri}`
                    });
                } else if (res.$("head meta").length == 0) {
                    // If the result is broken but still returns status 200
                    io.to(`${socket.id}`).emit('bad dog', {
                        msg: `<strong>FAIL</strong>: ${res.options.uri}`
                    });
                    failedURLs.push(res.options.uri);
                } else {
                    // Congratulations, you passed. Good job.
                    io.to(`${socket.id}`).emit('bark', {
                        msg: `<strong>SUCCESS</strong>: ${res.options.uri}`
                    });
                }
            }
            done();
        }
    });


});