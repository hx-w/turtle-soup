#!/bin/sh
# 容器启动脚本：自动处理数据库迁移
# 幂等设计：可安全多次执行

set -e

echo "🚀 启动海龟汤服务..."

# 等待数据库连接
echo "⏳ 等待数据库连接..."
until nc -z postgres 5432 2>/dev/null; do
  sleep 0.5
done
sleep 1
echo "✅ 数据库连接成功"

# 检查并执行迁移（aiHostDelayMinutes → aiHostDelaySeconds）
echo "🔄 检查数据库迁移..."

# 检查 Channel 表是否存在
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'Channel'
);" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = "t" ]; then
  # 检查旧字段是否存在
  OLD_FIELD_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'Channel' 
    AND column_name = 'aiHostDelayMinutes'
  );" 2>/dev/null || echo "f")
  
  if [ "$OLD_FIELD_EXISTS" = "t" ]; then
    echo "📦 检测到旧字段，执行迁移..."
    
    # 执行迁移 SQL
    psql "$DATABASE_URL" <<'MIGRATION'
    -- 1. 重命名字段
    ALTER TABLE "Channel" RENAME COLUMN "aiHostDelayMinutes" TO "aiHostDelaySeconds";
    
    -- 2. 更新默认值
    ALTER TABLE "Channel" ALTER COLUMN "aiHostDelaySeconds" SET DEFAULT 60;
    
    -- 3. 转换数据（分钟 → 秒）
    UPDATE "Channel" SET "aiHostDelaySeconds" = "aiHostDelaySeconds" * 60;
MIGRATION
    
    echo "✅ 迁移完成：aiHostDelayMinutes → aiHostDelaySeconds"
  else
    echo "✅ 数据库已是最新版本"
  fi
else
  echo "✅ 全新安装，跳过迁移"
fi

# 同步数据库 schema（处理未来可能的变更）
echo "🔄 同步数据库结构..."
npx prisma migrate deploy

# 启动应用
echo "🎯 启动应用服务..."
exec node dist/index.js
