import http from "node:http";

export interface MockHandler {
  (req: http.IncomingMessage, res: http.ServerResponse): void;
}

export interface MockServer {
  baseUrl: string;
  close: () => Promise<void>;
  setHandler: (handler: MockHandler) => void;
}

/**
 * Creates an ephemeral in-process HTTP mock server.
 * Never performs real outbound requests.
 */
export async function createMockServer(
  initialHandler?: MockHandler
): Promise<MockServer> {
  let currentHandler: MockHandler =
    initialHandler ??
    ((_req, res) => {
      res.writeHead(404);
      res.end();
    });

  const server = http.createServer((req, res) => {
    currentHandler(req, res);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
    setHandler: (handler: MockHandler) => {
      currentHandler = handler;
    },
  };
}
