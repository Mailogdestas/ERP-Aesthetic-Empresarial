import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/common/filters/http-exception.filter';
import { LoggingInterceptor } from './core/common/interceptors/logging.interceptor';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for frontend running at localhost:3000
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3010'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  setupSwagger(app);

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`Backend running at http://localhost:${port}/api`);
}
bootstrap();
