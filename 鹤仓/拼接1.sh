#!/bin/bash

# 提取 ziys-heom.txt 从第53894行开始的内容
sed -n '53894,$p' ziys-heom.txt >> 1.txt

echo "已将 ziys-heom.txt 从第53894行开始的内容追加到 1.txt 最后。"
