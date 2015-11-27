# is-alive

Little process to notify by email when another server is down. This is accomplish by receiving a request from the other server by a period of time, if the request was not received after that period it will send an email notifying the server is down.

## Configure
Just clone this repo, and create a `config.json` from `config.json.sample` with your configs.  

The request to this server must be done as a POST to the root with a body having a secret as:
```javascript
{
  "secret": "you-secret-at-config.json"
}
```

Doing a GET to the root will get the status with a json like:
```javascript
{
  ip: "127.0.0.1", // IP from server which called (could be used to get the public IP)
  timestamp: "2015-11-27T17:56:27.189Z", // Time for last call
  isDown: false // If the state of it is down
}
```

## Install and start Server
Install dependencies with:
```bash
npm install
```

Start server by (default port is 5000)
```bash
npm start
```
or
```bash
PORT=5002 node index.js
```

### Licence BSD-3-Clause
Check LICENSE file for details
