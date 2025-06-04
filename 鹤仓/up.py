import re
import xml.etree.ElementTree as ET

# 小鹤双拼映射表
initials = {
    'b': 'b', 'p': 'p', 'm': 'm', 'f': 'f',
    'd': 'd', 't': 't', 'n': 'n', 'l': 'l',
    'g': 'g', 'k': 'k', 'h': 'h',
    'j': 'j', 'q': 'q', 'x': 'x',
    'zh': 'v', 'ch': 'i', 'sh': 'u',
    'r': 'r', 'z': 'z', 'c': 'c', 's': 's',
    'y': 'y', 'w': 'w'
}

finals = {
    'a': 'a', 'ai': 'd', 'an': 'j', 'ang': 'h', 'ao': 'c',
    'e': 'e', 'ei': 'w', 'en': 'f', 'eng': 'g', 'er': 'r',
    'o': 'o', 'ou': 'z', 'ong': 's',
    'i': 'i', 'ia': 'x', 'ian': 'm', 'iang': 'l', 'iao': 'n', 'ie': 'p', 'in': 'b', 'ing': 'k', 'iu': 'q',
    'u': 'u', 'ua': 'x', 'uai': 'k', 'uan': 'r', 'uang': 'l', 'ue': 't', 'ui': 'v', 'un': 'y',
    'v': 'v', 've': 't' ,'uo': 'o'
}

# 解析拼音，返回双拼码
def pinyin_to_shuangpin(pinyin):
    # 特殊处理 zh, ch, sh
    if pinyin.startswith(('zh', 'ch', 'sh')):
        initial = pinyin[:2]
        final = pinyin[2:]
    else:
        initial = pinyin[0]
        final = pinyin[1:]
    
    if initial not in initials or final not in finals:
        return None  # 无法解析，返回None
    
    return initials[initial] + finals[final]

# 读取 XML
tree = ET.parse('Han-Latin.xml')
root = tree.getroot()

# 找到 <tRule> 内容
tRule = root.find('.//tRule')

new_text = ''
for line in tRule.text.splitlines():
    match = re.search(r'\[(.*?)\]→(.*?);', line)
    if match:
        chars, pinyin = match.groups()
        sp = pinyin_to_shuangpin(pinyin)
        if sp:
            new_line = f'[{chars}]→{sp};'
            new_text += new_line + '\n'
        else:
            # 保留无法转换的行
            new_text += line + '\n'
    else:
        new_text += line + '\n'

tRule.text = new_text

# 输出新的 XML 文件
tree.write('Han-Latin-shuangpin.xml', encoding='utf-8', xml_declaration=True)

print("拼音已替换为小鹤双拼，文件名：Han-Latin-shuangpin.xml")
