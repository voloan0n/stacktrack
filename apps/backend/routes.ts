import { FastifyInstance } from "fastify";
import { authRoutes } from "./routes/authRoute";
import { userRoutes } from "./routes/userRoute";
import { ticketRoutes } from "./routes/ticketRoute";
import { sessionRoutes } from "./routes/sessionRoute";
import { clientRoutes } from "./routes/clientRoute"; 
import { roleRoutes } from "./routes/roleRoute";
import { notificationRoutes } from "./routes/notificationRoute";
import { ticketOptionRoutes } from "./routes/ticketOptionRoute";
import { notificationTemplateRoutes } from "./routes/notificationTemplateRoute";

export function registerRoutes(app: FastifyInstance) {
  authRoutes(app);
  userRoutes(app);
  ticketRoutes(app);
  sessionRoutes(app);
  clientRoutes(app); 
  roleRoutes(app);
  notificationRoutes(app);
  notificationTemplateRoutes(app);
  ticketOptionRoutes(app);
}
