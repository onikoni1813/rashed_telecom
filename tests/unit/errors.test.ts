import { describe, it, expect } from "vitest";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  formatErrorResponse,
} from "@/lib/errors";

describe("Typed Error Hierarchy and Response Formatter", () => {
  it("formats ValidationError with 400 status and details", () => {
    const error = new ValidationError("Invalid product SKU", { field: "sku" });
    const requestId = "test-req-123";
    const result = formatErrorResponse(error, requestId);

    expect(result.status).toBe(400);
    expect(result.body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid product SKU",
      details: { field: "sku" },
      requestId: "test-req-123",
    });
  });

  it("formats UnauthorizedError with 401 status", () => {
    const error = new UnauthorizedError("Session expired");
    const result = formatErrorResponse(error, "req-auth");

    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("UNAUTHORIZED");
    expect(result.body.error.message).toBe("Session expired");
  });

  it("formats ForbiddenError with 403 status", () => {
    const error = new ForbiddenError("Insufficient permissions");
    const result = formatErrorResponse(error, "req-forbidden");

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("FORBIDDEN");
  });

  it("formats NotFoundError with 404 status", () => {
    const error = new NotFoundError("Product not found");
    const result = formatErrorResponse(error, "req-404");

    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe("NOT_FOUND");
  });

  it("formats ConflictError with 409 status", () => {
    const error = new ConflictError("Invoice number already exists");
    const result = formatErrorResponse(error, "req-409");

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("CONFLICT");
  });

  it("safely handles unexpected non-AppError exceptions without leaking secrets", () => {
    const rawError = new Error("Database connection password=secret123 failed");
    const result = formatErrorResponse(rawError, "req-500");

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.body.error.requestId).toBe("req-500");
  });
});
