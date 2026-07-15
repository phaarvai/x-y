import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { config } from "./config/env";
import { requestIdMiddleware, notFoundHandler, globalErrorHandler } from "./middlewares/error-handler";
import { securityHeaders, rateLimitMiddleware, compressionMiddleware } from "./middlewares/security";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestIdMiddleware);
app.use(securityHeaders);
app.use(rateLimitMiddleware);
app.use(compressionMiddleware);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const corsOptions: cors.CorsOptions = {
  origin: config.corsOrigins.includes("*")
    ? true
    : (origin, cb) => {
        if (!origin || config.corsOrigins.includes(origin)) cb(null, true);
        else cb(new Error("CORS not allowed"));
      },
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", router);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
