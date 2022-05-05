import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  username: 'postgres',
  password: '9173',
  schema: 'public',
  database: 'twitter_api',
  autoLoadEntities: true,
  synchronize: true,
};
