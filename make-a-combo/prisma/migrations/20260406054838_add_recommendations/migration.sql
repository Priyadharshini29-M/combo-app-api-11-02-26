-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "recommendation_popup_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductRecommendation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "triggerProductId" TEXT NOT NULL,
    "triggerProductTitle" TEXT NOT NULL,
    "triggerProductHandle" TEXT,
    "triggerProductImage" TEXT,
    "recommendedProductId" TEXT NOT NULL,
    "recommendedProductTitle" TEXT NOT NULL,
    "recommendedProductHandle" TEXT,
    "recommendedProductImage" TEXT,
    "popupTitle" TEXT NOT NULL DEFAULT 'You might also like',
    "ctaText" TEXT NOT NULL DEFAULT 'Add to Combo',
    "dismissText" TEXT NOT NULL DEFAULT 'No thanks',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
