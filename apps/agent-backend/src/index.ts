import { app } from "./app";

const server = app.listen(3000);

console.log(
  `Agent backend is running at ${server.server?.hostname}:${server.server?.port}`,
);
