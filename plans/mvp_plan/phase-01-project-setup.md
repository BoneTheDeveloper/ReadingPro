---
title: "Phase 01: Project Setup & Environment"
description: "Initialize Next.js 15 project with TypeScript, shadcn/ui, Tailwind CSS 4, Prisma, and core dependencies"
status: pending
priority: P1
effort: 3h
branch: main
tags: [setup, nextjs, typescript, shadcn]
created: 2026-04-20
---

# Phase 01: Project Setup & Environment

**Status:** pending
**Owner:** unassigned
**Dependencies:** none

---

## Overview

Initialize Next.js 15 project with all required dependencies, configuration files, and development tooling.

---

## Requirements

### Functional
- Next.js 15 with App Router
- React 19
- TypeScript 5+
- Tailwind CSS 4
- shadcn/ui component library
- Prisma ORM with SQLite
- ESLint + Prettier
- Git repository initialization

### Non-Functional
- Type-safe configuration
- Hot module reloading
- Development/production environment variables
- Clean git history (proper .gitignore)

---

## Architecture

```
project-root/
├── src/
│   └── app/              # Next.js App Router
├── prisma/
│   └── schema.prisma     # Database schema
├── components/           # React components
├── lib/                  # Utility functions
├── public/               # Static assets
├── .env.local            # Environment variables
├── next.config.ts        # Next.js config
├── tailwind.config.ts    # Tailwind config
├── tsconfig.json         # TypeScript config
└── package.json          # Dependencies
```

---

## Related Code Files

### Files to Create
- `package.json` - Project dependencies
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind + design tokens
- `postcss.config.mjs` - PostCSS configuration
- `prisma/schema.prisma` - Database schema (initial)
- `.env.local.example` - Environment template
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.gitignore` - Git ignore patterns
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page
- `src/app/globals.css` - Global styles with design tokens
- `components.json` - shadcn/ui config

### Files to Modify
- None (new project)

---

## Implementation Steps

### 1. Initialize Next.js Project

```bash
# Create Next.js project with all required flags
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git

# Or if project exists, ensure these packages are installed:
npm install next@15 react@19 react-dom@19
npm install -D typescript @types/react @types/node
```

**Verification:** `npm run dev` starts development server on localhost:3000

### 2. Install Core Dependencies

```bash
# shadcn/ui CLI
npx shadcn@latest init -d

# Prisma
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite

# PDF parsing
npm install pdf-parse

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns
```

**Verification:** All packages install without peer dependency conflicts

### 3. Configure Tailwind CSS 4 with Design Tokens

**File:** `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Indigo
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Secondary - Blue
        secondary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Neutral
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Semantic
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-literata)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Verification:** Design tokens available as utility classes (e.g., `bg-primary-600`)

### 4. Configure shadcn/ui

**File:** `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Add initial components:
```bash
npx shadcn@latest add button card input progress badge avatar
```

**Verification:** Components render in `src/components/ui/` directory

### 5. Configure Prisma with SQLite

**File:** `prisma/schema.prisma` (initial)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Initial schema - Phase 02 will expand this
model Example {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**File:** `.env.local`

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_api_key_here"
```

**Verification:** `npx prisma migrate dev --name init` creates SQLite database

### 6. Setup Google Fonts

**File:** `src/app/layout.tsx`

```typescript
import { Inter, Literata, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${literata.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Verification:** Fonts load and are applied to text elements

### 7. Configure ESLint and Prettier

**File:** `.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**File:** `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Verification:** `npm run lint` runs without errors

### 8. Setup Utility Functions

**File:** `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateReadingTime(wordCount: number): string {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `~${minutes} min read`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
```

**Verification:** Utility functions are exported and type-safe

### 9. Initialize Git Repository

```bash
git init
git add .
git commit -m "feat: initialize Next.js 15 project with TypeScript and shadcn/ui"
```

**File:** `.gitignore`

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/*.db
prisma/*.db-journal
```

**Verification:** `git status` shows clean working directory after initial commit

---

## Todo List

- [ ] Initialize Next.js project with TypeScript
- [ ] Install and configure shadcn/ui
- [ ] Setup Tailwind CSS with design tokens
- [ ] Configure Prisma with SQLite
- [ ] Add Google Fonts (Inter, Literata, JetBrains Mono)
- [ ] Setup ESLint and Prettier
- [ ] Create utility functions
- [ ] Initialize Git repository
- [ ] Verify development server runs without errors

---

## Success Criteria

1. ✅ `npm run dev` starts server on localhost:3000
2. ✅ Tailwind classes apply design tokens correctly
3. ✅ shadcn/ui components render without errors
4. ✅ Prisma client generates successfully
5. ✅ TypeScript compilation with no errors
6. ✅ Git repository initialized with proper .gitignore

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Next.js 15 breaking changes | Low | Medium | Use stable release, verify shadcn/ui compatibility |
| Font loading delay | Medium | Low | Use `display: swap`, preload critical fonts |
| Prisma SQLite permissions | Low | Low | Ensure write permissions for prisma directory |

---

## Next Steps

After completion:
- Proceed to [Phase 02: Database Schema](phase-02-database-schema.md)

---

## Context Links

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Design Guidelines](../../docs/design-guidelines.md)
