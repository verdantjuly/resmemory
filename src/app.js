import http from 'http';
import url from 'url';
import TcpClient from './classes/client';
import { makePacket } from './utils/makePacket';
import authmiddleware from './authmiddleware';
import frontconnection from './frontconnection';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.GATE_PORT;

let mapClients = {};
let mapUrls = {};
let mapResponse = {};
let mapRR = {};
let index = 0;

const server = http
  .createServer((req, res) => {
    try {
      const method = req.method;
      const uri = url.parse(req.url, true);
      const pathname = uri.pathname;
      let params = {};
      let refresh;

      if (req.headers.cookie) {
        refresh = req.headers.cookie.refresh;

        if (refresh) {
          params.refresh = refresh;
        }
      }

      if (method === 'POST') {
        if (req.headers.authorization) {
          const userId = authmiddleware(req, res, params);

          params = { userId };
        }
        let body = '';

        req.on('data', function (data) {
          body += data;
        });
        req.on('end', function () {
          if (req.headers['content-type'] === 'application/json') {
            params.bodies = JSON.parse(body);
          }
          onRequest(res, method, pathname, params);
        });
      } else if (method === 'PATCH') {
        let body = '';
        const userId = authmiddleware(req, res, params);

        params = { userId };
        req.on('data', function (data) {
          body += data;
        });
        req.on('end', function () {
          if (req.headers['content-type'] === 'application/json') {
            params.bodies = JSON.parse(body);
          }

          const pathArray = pathname.split('/');
          let path = pathname;
          if (pathArray.length > 2) {
            path = pathname.substring(0, pathname.lastIndexOf('/'));
            params.params = pathArray.pop();
          }

          onRequest(res, method, path, params);
        });
      } else if (method === 'DELETE') {
        const userId = authmiddleware(req, res, params);

        params = { userId };
        let body = '';
        req.on('data', function (data) {
          body += data;
        });
        req.on('end', function () {
          if (req.headers['content-type'] === 'application/json') {
            params.bodies = JSON.parse(body);
          }
          const pathArray = pathname.split('/');
          let path = pathname;
          if (pathArray.length > 2) {
            path = pathname.substring(0, pathname.lastIndexOf('/'));
            params.params = pathArray.pop();
          }

          onRequest(res, method, path, params);
        });
      } else {
        if (pathname == '/' || pathname == '/main') {
          frontconnection(pathname, res);
        } else {
          if (req.headers.authorization) {
            const userId = authmiddleware(req, res, params);

            params = { userId };
          }
          params.query = uri.query;
          onRequest(res, method, pathname, params);
        }
      }
    } catch (error) {
      console.log('====================', error);
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ respondData: { code: 100 } }));
    }
  })
  .listen(port, () => {
    console.log(`Example app listening on port ${port}`);

    // Distributor 와 통신 처리
    const packet = makePacket('/distributes', 'POST', 0, {
      port: process.env.GATE_PORT,
      name: 'gate',
      urls: [],
    });

    let isConnectedDistributor = false;

    const clientDistributor = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedDistributor = true;
        clientDistributor.write(packet);
      },
      (options, data) => {
        onDistribute(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedDistributor = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedDistributor = false;
      }, // 에러 이벤트
    );

    // 주기적인 Distributor 접속 상태 확인
    setInterval(() => {
      if (isConnectedDistributor !== true) {
        clientDistributor.connect();
      }
    }, 3000);

    // Users와 통신 처리
    const packetUsers = makePacket('/users', 'GET', 0, {
      port: process.env.USERS_PORT,
      name: 'users',
      urls: [],
    });

    let isConnectedUsers = false;

    const clientUsers = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedUsers = true;
        clientUsers.write(packetUsers);
      },
      (options, data) => {
        onUsersModule(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedUsers = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedUsers = false;
      }, // 에러 이벤트
    );

    // 주기적인 Users 접속 상태 확인
    setInterval(() => {
      if (isConnectedUsers !== true) {
        clientUsers.connect();
      }
    }, 3000);

    // getPosts와 통신 처리
    const packetGetPosts = makePacket('/posts', 'GET', 0, {
      port: process.env.POSTS_PORT,
      name: 'posts',
      urls: [],
    });

    let isConnectedGetPosts = false;

    const clientGetPosts = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedGetPosts = true;
        clientGetPosts.write(packetGetPosts);
      },
      (options, data) => {
        onGetPostsModule(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedGetPosts = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedGetPosts = false;
      }, // 에러 이벤트
    );

    // 주기적인 getPosts와 접속 상태 확인
    setInterval(() => {
      if (isConnectedGetPosts !== true) {
        clientGetPosts.connect();
      }
    }, 3000);

    // getPosts와 통신 처리
    const packetAllUsers = makePacket('/users', 'GET', 0, {
      port: process.env.POSTS_PORT,
      name: 'posts',
      urls: [],
    });

    let isConnectedAllUsers = false;

    const clientAllUsers = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedAllUsers = true;
        clientAllUsers.write(packetAllUsers);
      },
      (options, data) => {
        onGetPostsModule(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedAllUsers = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedAllUsers = false;
      }, // 에러 이벤트
    );

    // 주기적인 getPosts와 접속 상태 확인
    setInterval(() => {
      if (isConnectedAllUsers !== true) {
        clientAllUsers.connect();
      }
    }, 3000);

    //admin/post 간 통신 처리
    const packetPosts = makePacket('/posts/admin', 'DELETE', 0, {
      port: process.env.POSTS_PORT,
      name: 'posts',
      urls: [],
    });

    let isConnectedPosts = false;

    const clientPosts = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedPosts = true;
        clientPosts.write(packetPosts);
      },
      (options, data) => {
        onPostsModule(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedPosts = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedPosts = false;
      }, // 에러 이벤트
    );

    // 주기적인 UsersTopology 접속 상태 확인
    setInterval(() => {
      if (isConnectedPosts !== true) {
        clientPosts.connect();
      }
    }, 3000);

    //admin/post 간 통신 처리
    const packetComments = makePacket('/comments/admin', 'DELETE', 0, {
      port: process.env.POSTS_PORT,
      name: 'posts',
      urls: [],
    });

    let isConnectedComments = false;

    const clientComments = new TcpClient(
      process.env.HOST,
      process.env.DIS_PORT,
      (options) => {
        // 접속 이벤트
        isConnectedComments = true;
        clientComments.write(packetComments);
      },
      (options, data) => {
        onCommentsModule(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedComments = false;
      }, // 접속 종료 이벤트
      (options) => {
        isConnectedComments = false;
      }, // 에러 이벤트
    );

    // 주기적인 UsersTopology 접속 상태 확인
    setInterval(() => {
      if (isConnectedComments !== true) {
        clientComments.connect();
      }
    }, 3000);
  });

// API 호출 처리
export function onRequest(res, method, pathname, params) {
  const key = method + pathname;
  const client = mapUrls[key];
  if (client == null) {
    res.writeHead(404);
    res.end();
  } else {
    const packet = makePacket(pathname, method, index, params);

    mapResponse[`key_${index}`] = res;
    index++;
    if (mapRR[key] == null) {
      mapRR[key] = 0;
    }

    mapRR[key]++;
    client[mapRR[key] % client.length].write(packet);
  }
}

export function onDistribute(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'gate') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

export function onUsersModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'users') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

export function onGetPostsModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'posts') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}
export function onAllUsersModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'users') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

export function onPostsModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'posts') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

export function onCommentsModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'posts') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

export function onThreadsModule(data) {
  for (let n in data.params) {
    const node = data.params[n];
    const key = node.host + ':' + node.port;

    if (mapClients[key] == null && node.name !== 'threads') {
      const client = new TcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient,
      );

      mapClients[key] = {
        client: client,
        info: node,
      };

      for (let m in node.urls) {
        const key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
}

// 마이크로서비스 접속 이벤트 처리
function onCreateClient(options) {
  console.log('onCreateClient');
}

// 마이크로서비스 응답 처리
function onReadClient(options, packet) {
  console.log('onReadClient============', packet);
  if (packet.responseData.code == 121) {
    mapResponse[`key_${packet.key}`].setHeader(
      'Authorization',
      `Bearer ${packet.responseData.token}`,
    );
    delete packet.token;
  }
  if (packet.responseData.code == 111) {
    const today = new Date();
    mapResponse[`key_${packet.key}`].setHeader('Set-Cookie', [
      `refresh=${packet.responseData.refresh}; expires=7d`,
    ]);
    delete packet.responseData.refresh;
  }
  if (packet.responseData.code == 123) {
    mapResponse[`key_${packet.key}`].setHeader(
      'Authorization',
      `Bearer ${packet.responseData.token}`,
    );
    delete packet.responseData.refresh;
    delete packet.token;
  }
  if (packet.responseData.code == 131) {
    mapResponse[`key_${packet.key}`].setHeader('Set-Cookie', [
      `refresh=""; expires=Sat, 02 Oct 2021 17:46:04 GMT;`,
    ]);
    mapResponse[`key_${packet.key}`].removeHeader('Set-Cookie');
    mapResponse[`key_${packet.key}`].removeHeader('Authorization');
  }
  mapResponse[`key_${packet.key}`].writeHead(200, { 'Content-Type': 'application/json' });
  mapResponse[`key_${packet.key}`].end(JSON.stringify(packet));
  delete mapResponse[`key_${packet.key}`]; // http 응답 객체 삭제
}

// 마이크로서비스 접속 종료 처리
function onEndClient(options) {
  const key = options.host + ':' + options.port;
  console.log('onEndClient', mapClients[key]);

  for (let n in mapClients[key].info.urls) {
    const node = mapClients[key].info.urls[n];
    delete mapUrls[node];
  }
  delete mapClients[key];
}

// 마이크로서비스 접속 에러 처리
function onErrorClient(options) {
  console.log('onErrorClient');
}
