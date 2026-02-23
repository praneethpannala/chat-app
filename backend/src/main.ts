import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    credentials: false,
  });

  await app.listen(process.env.PORT || 3001);
  console.log('Zync backend running on port 3001');
}

bootstrap();
