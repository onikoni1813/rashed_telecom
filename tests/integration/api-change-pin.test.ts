import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as changePinRoute } from "@/app/api/v1/auth/change-pin/route";
import { prisma } from "@/lib/db/prisma";
import { hashPin } from "@/lib/auth/local-session";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("POST /api/v1/auth/change-pin", () => {
  const userId = "00000000-0000-0000-0000-000000000001";
  const initialPin = hashPin("1234");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if new PIN is not 4 digits", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currentPin: "1234",
        newPin: "123", // only 3 digits
        confirmPin: "123",
      }),
    });

    const res = await changePinRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("৪ ডিজিটের সংখ্যা");
  });

  it("fails if newPin and confirmPin do not match", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currentPin: "1234",
        newPin: "5555",
        confirmPin: "6666",
      }),
    });

    const res = await changePinRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("মিলছে না");
  });

  it("fails if current PIN is incorrect", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      pinHash: initialPin.hash,
      pinSalt: initialPin.salt,
    });

    const req = new Request("http://localhost:3000/api/v1/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currentPin: "9999", // wrong
        newPin: "5678",
        confirmPin: "5678",
      }),
    });

    const res = await changePinRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("বর্তমান পিন কোডটি সঠিক নয়");
  });

  it("successfully updates PIN when inputs are valid", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      pinHash: initialPin.hash,
      pinSalt: initialPin.salt,
    });
    (prisma.user.update as any).mockResolvedValue({
      id: userId,
    });

    const req = new Request("http://localhost:3000/api/v1/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        currentPin: "1234",
        newPin: "5678",
        confirmPin: "5678",
      }),
    });

    const res = await changePinRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("সফলভাবে পরিবর্তন করা হয়েছে");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          pinHash: expect.any(String),
          pinSalt: expect.any(String),
        }),
      })
    );
  });
});

