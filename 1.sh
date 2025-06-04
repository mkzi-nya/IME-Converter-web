#!/bin/bash

# 输入文件
input="./1.txt"
# 临时输出文件
output="./1_dedup.txt"

# 清除重复行，保留第一次出现的
awk '!seen[$0]++' "$input" > "$output"

# 可选：覆盖原文件
mv "$output" "$input"

echo "重复行已清除，已更新 $input"
