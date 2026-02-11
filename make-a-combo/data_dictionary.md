# Data Dictionary & Schema Specifications

## 1. MODULE: Template
**Source Table:** `Template` (Prisma)

| Column Name | Data Type | Description | Rules | Validation / Default | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **id** | `String` (PK) | Unique template ID | Auto-generated | Required, non-empty | **System** (Prisma `uuid()` or CUID) |
| **title** | `String` | Template name shown to user | User defined | Required | **User Input** (Save Modal) |
| **config** | `JSON` | Stores all layout, banner, products, styling | Valid JSON structure | Required | **App State** (React `config` state) |
| **active** | `Boolean` | Is this template live? | Only one active preference? | Default: `FALSE` | **User Input** (Toggle Switch) |
| **createdAt** | `DateTime` | When template was created | Immutable | Auto: `now()` | **System** (Prisma `@default(now())`) |
| **updatedAt** | `DateTime` | Last updated time | Updates on every edit | Auto: `now()` | **System** (Prisma `@updatedAt`) |

*> Note: `updatedAt` requires adding the `@updatedAt` attribute to the Prisma model.*
