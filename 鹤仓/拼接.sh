#!/bin/bash

# 定义输出文件
output="ziys-heom.txt"

# 清空旧的输出文件
> "$output"

# 按顺序拼接 1.txt 2.txt 3.txt
for file in 1.txt 2.txt 3.txt; do
    if [ -f "$file" ]; then
        cat "$file" >> "$output"
    else
        echo "警告：文件 $file 不存在，跳过。"
    fi
done

echo "拼接完成，生成 $output"

# 定义目标目录
dir1="/storage/emulated/0/FlyPY_pro/小鹤音形/"
dir2="/storage/emulated/0/IME-Converter-web/dict/"

# 复制到两个目录
cp "$output" "$dir1"
cp "$output" "$dir2"

echo "已复制 $output 到:"
echo " - $dir1"
echo " - $dir2"
