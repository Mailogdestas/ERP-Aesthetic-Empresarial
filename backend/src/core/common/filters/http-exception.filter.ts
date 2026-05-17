import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : 'Erro interno';
    if (!(exception instanceof HttpException)) {
      // Log detalhado para diagnóstico em desenvolvimento
      // eslint-disable-next-line no-console
      console.error('Unhandled exception:', exception);
    }
    response.status(status).json({ statusCode: status, message });
  }
}
