const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();

    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg'
    };

    // FIX: Provide a default fallback (octet-stream) if the extension isn't in the list
    const type = contentType[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // It's good practice to check the error code
            if (err.code == 'ENOENT') {
                // File likely doesn't exist
                res.writeHead(404);
                res.end('File not found');
            } else {
                // Some other server error (e.g. permissions)
                res.writeHead(500);
                res.end('Server error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': type });
            res.end(data);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});