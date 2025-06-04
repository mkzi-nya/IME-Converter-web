input_file = './1.txt'
output_file = './1-1.txt'

# 读取原文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 分两部分：前51200行，和后面的
first_part = lines[:51200]
second_part = lines[51200:]

# 存放要剪切的行和保留下来的行
cut_lines = []
remain_lines = []

# 处理前51200行
for line in first_part:
    parts = line.strip().split('\t')
    if len(parts) == 2:
        word, code = parts
        if len(word) > 1 and len(code) == 4:
            cut_lines.append(line)
        else:
            remain_lines.append(line)
    else:
        remain_lines.append(line)

# 剩下的后半部分不用动，直接加进去
remain_lines.extend(second_part)

# 写入新文件，先写剪切下来的，再写剩下的
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(cut_lines)
    f.writelines(remain_lines)

print(f'处理完成，结果保存在{output_file}')