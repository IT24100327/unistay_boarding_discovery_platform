import 'dotenv/config';
import app from './app';
import { config } from './config/env';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Server] UniStay backend running on port ${PORT} in ${config.nodeEnv} mode`);
});
