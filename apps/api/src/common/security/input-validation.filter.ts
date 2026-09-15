import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import { ContractValidationError } from "@ice24/contracts";

@Catch(ContractValidationError)
export class InputValidationFilter implements ExceptionFilter {
  public catch(_error: ContractValidationError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<{
        status(code: number): { json(body: unknown): void };
      }>()
      .status(400)
      .json({ statusCode: 400, message: "Invalid request" });
  }
}
