-- AlterTable: Add shipping contact and shipment tracking fields
ALTER TABLE "orders" ADD COLUMN "shippingPhone" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingEmail" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipmentId" TEXT;
ALTER TABLE "orders" ADD COLUMN "trackingId" TEXT;
ALTER TABLE "orders" ADD COLUMN "courier" TEXT;
ALTER TABLE "orders" ADD COLUMN "courierService" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingStatus" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingRawResponse" JSONB;
