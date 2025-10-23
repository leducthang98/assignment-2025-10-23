import express from 'express';
import resourceRoutes from './routes/resourceRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', resourceRoutes);

app.use(errorHandler);

export default app;

