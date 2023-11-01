const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if ( req.method === 'OPTIONS' ) {
    res.writeHead(200);
    res.end();
    return;
  }

  const queryObject = url.parse(req.url,true).query;
  const subreddit = queryObject.subreddit || '';
  const page = queryObject.page || 1;

  if (req.url.startsWith('/api/threads')) {
    // Imitate the behavior of getRemovedThreadIDs
    if (subreddit.toLowerCase() === 'all') {
      subreddit = '';
    }

    // Mock data
    const data = ['16bm9de'];

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
