import { FileInterceptor } from '@nestjs/platform-express';
import { Injectable, mixin, NestInterceptor, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { MediaFilter } from './media.filter';

interface MediaInterceptorOptions {
  fieldName: string;
  path?: string;
}

function MediaInterceptor(
  options: MediaInterceptorOptions,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;
    constructor(configService: ConfigService) {
      const mediasDestination = configService.get('UPLOADED_FILES_DESTINATION');
      const destination = `${mediasDestination}${options.path}`;
      const multerOptions: MulterOptions = {
        storage: diskStorage({
          destination,
        }),
        fileFilter: MediaFilter,
        limits: {
          // 100 MB
          fileSize: 100000000,
        },
      };

      this.fileInterceptor = new (FileInterceptor(
        options.fieldName,
        multerOptions,
      ))();
    }

    intercept(...args: Parameters<NestInterceptor['intercept']>) {
      return this.fileInterceptor.intercept(...args);
    }
  }
  return mixin(Interceptor);
}

export default MediaInterceptor;
