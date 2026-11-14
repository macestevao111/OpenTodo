import { handle } from "hono/vercel";
import app from "../src/server/index.js";

export const config = {
  runtime: "nodejs",
};

export default handle(app);
