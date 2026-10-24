import { prisma } from "@/lib/db/prisma";

export interface CreateNotificationInput {
  shopId: string;
  userId?: string | null;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "APPROVAL" | "ALERT";
  link?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return await prisma.notification.create({
    data: {
      shopId: input.shopId,
      userId: input.userId || null,
      title: input.title,
      message: input.message,
      type: input.type || "INFO",
      link: input.link || null,
    },
  });
}

export async function getNotifications(shopId: string, userId?: string) {
  return await prisma.notification.findMany({
    where: {
      shopId,
      OR: [
        { userId: null }, // broadcast
        ...(userId ? [{ userId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function markNotificationAsRead(shopId: string, notificationId: string) {
  return await prisma.notification.updateMany({
    where: { id: notificationId, shopId },
    data: { isRead: true },
  });
}
