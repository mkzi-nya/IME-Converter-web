import re
from collections import defaultdict
import xml.etree.ElementTree as ET

# 音标到无音标映射
tone_map = str.maketrans({
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
    'ü': 'v'
})

# 存储拼音到汉字的映射
pinyin_dict = defaultdict(set)

# 处理一行
def process_line(line):
    match = re.search(r'\[([^\]]+)\]→([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+);', line)
    if match:
        chars = match.group(1)
        pinyin = match.group(2).translate(tone_map)
        for char in chars:
            pinyin_dict[pinyin].add(char)

# 读取源文件并处理
with open('Han-Latin.xml', 'r', encoding='utf-8') as f:
    for line in f:
        process_line(line)

# 创建 XML 根结构
supplementalData = ET.Element('supplementalData')
version = ET.SubElement(supplementalData, 'version', number='$Revision$')
transforms = ET.SubElement(supplementalData, 'transforms')
transform = ET.SubElement(transforms, 'transform', {
    'source': 'Hani', 
    'target': 'Latn', 
    'direction': 'forward', 
    'alias': 'Han-Latin Hans-Latn und-Latn-t-und-hani und-Latn-t-und-hans'
})
tRule = ET.SubElement(transform, 'tRule')

# 添加注释
tRule.text = '\n# Warning: does not do round-trip mapping!!\n# START GENERATED Han-Latin.xml\n'

# 添加拼音映射
for pinyin in sorted(pinyin_dict.keys()):
    chars = ''.join(sorted(pinyin_dict[pinyin]))
    tRule.text += f'[{chars}]→{pinyin};\n'

# 写入 XML 文件
tree = ET.ElementTree(supplementalData)
ET.indent(tree, space="\t", level=0)  # 格式化输出，Python 3.9+
tree.write('Han-Latin.xml', encoding='utf-8', xml_declaration=True)

print("处理完成，已生成 Han-Latin.xml")
