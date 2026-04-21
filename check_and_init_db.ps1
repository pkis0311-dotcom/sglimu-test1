# Supabase Table Check & Initialization Guide

$SUPABASE_URL = "https://xxvfgnoffomrhtxitqkj.supabase.co"
$API_KEY = "sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9"
$headers = @{ "apikey" = $API_KEY; "Authorization" = "Bearer $API_KEY" }

$requiredTables = @("products", "categories", "banners", "orders", "inquiries", "site_configs", "users")

Write-Host "--- SG LIMU Supabase Table Status Check ---" -ForegroundColor Cyan

foreach ($table in $requiredTables) {
    try {
        $uri = "$SUPABASE_URL/rest/v1/$table?select=count"
        $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        Write-Host "[OK] Table '$table' exists." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Table '$table' is MISSING or inaccessible! (Status: $($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host "`n--- SQL for Missing Tables ---" -ForegroundColor Yellow
Write-Host "If any tables are missing, please run the following SQL in your Supabase SQL Editor:`n"

$sql = @"
-- 1. products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price TEXT DEFAULT '전화문의',
  stock INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_major BOOLEAN DEFAULT false,
  parent_id TEXT REFERENCES categories(id),
  display_order INTEGER DEFAULT 0,
  icon_class TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. banners
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('slide', 'popup')),
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. site_configs (for dynamic content mapping)
CREATE TABLE IF NOT EXISTS site_configs (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. inquiries
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT,
  phone TEXT,
  title TEXT,
  content TEXT,
  status TEXT DEFAULT '대기',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT,
  organization TEXT,
  phone TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_price INTEGER,
  items JSONB,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
"@

Write-Host $sql
