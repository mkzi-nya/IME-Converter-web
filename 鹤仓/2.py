import re
import xml.etree.ElementTree as ET
from collections import OrderedDict

# 读取已有字的双拼编码
existing_codes = {}
with open('1.txt', 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            parts = line.strip().split('\t')
            if len(parts) == 2:
                char, code = parts
                existing_codes[char] = code

# 读取仓颉码表，支持一个字多个编码，过滤掉以 x 开头的编码
cangjie_codes = {}
with open('cangjie5.txt', 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            code, char = line.strip().split('\t')
            if not code.startswith('x'):  # 忽略x开头
                if char not in cangjie_codes:
                    cangjie_codes[char] = []
                cangjie_codes[char].append(code)  # 收集所有合法仓颉码

# 读取ul.xml
tree = ET.parse('ul.xml')
root = tree.getroot()
tRule = root.find('.//tRule')

results = []

for line in tRule.text.splitlines():
    match = re.search(r'\[(.*?)\]→(.*?);', line)
    if match:
        chars, shuangpin = match.groups()
        for char in chars:
            if char not in existing_codes:
                if char in cangjie_codes:
                    seen_codes = set()
                    for cj in cangjie_codes[char]:
                        first_code = cj[0]
                        last_code = cj[-1]
                        combined_code = f"{shuangpin}{first_code}{last_code}"
                        key = (char, combined_code)
                        if key not in seen_codes:
                            seen_codes.add(key)
                            results.append(f"{char}\t{combined_code}")
                else:
                    print(f"警告：找不到字【{char}】的仓颉码，跳过。")

# 最后去重，保留顺序
deduped_results = list(OrderedDict.fromkeys(results))

# 写入2.txt
with open('2.txt', 'w', encoding='utf-8') as f:
    for item in deduped_results:
        f.write(item + '\n')

print("处理完成，结果已写入2.txt")
