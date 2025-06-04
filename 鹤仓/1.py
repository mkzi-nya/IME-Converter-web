def process_files(fc_path, cangjie_path, output_path, max_lines=53893):
    from collections import defaultdict, OrderedDict

    # 读取仓颉码表
    cangjie_map = defaultdict(list)
    with open(cangjie_path, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                code, char = parts
                # 忽略以 'x' 开头的仓颉码
                if not code.startswith('x'):
                    cangjie_map[char].append(code)

    processed_lines = []
    extra_lines = []

    with open(fc_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx < max_lines:
                parts = line.strip().split()
                if len(parts) != 2:
                    # 不是单字行，原样保留（注意替换空格为Tab）
                    processed_lines.append(line.strip().replace(' ', '\t'))
                    continue

                char, code = parts
                code_len = len(code)

                if char in cangjie_map:
                    seen_codes = set()

                    for cj_code in cangjie_map[char]:
                        if len(cj_code) == 1:
                            first = cj_code[0]
                            last = cj_code[0]
                        else:
                            first = cj_code[0]
                            last = cj_code[-1]

                        # 生成新编码
                        if code_len == 3:
                            new_code = code[:2] + first
                        elif code_len == 4:
                            new_code = code[:2] + first + last
                        else:
                            new_code = code

                        key = (char, new_code)
                        if key not in seen_codes:
                            seen_codes.add(key)
                            processed_lines.append(f"{char}\t{new_code}")
                else:
                    processed_lines.append(f"{char}\t{code}")
            else:
                extra_lines.append(line.strip().replace(' ', '\t'))

    # 去重，保留顺序
    deduped_lines = list(OrderedDict.fromkeys(processed_lines))

    # 写入新文件
    with open(output_path, 'w', encoding='utf-8') as f:
        for line in deduped_lines:
            f.write(line + '\n')
        for line in extra_lines:
            f.write(line + '\n')

if __name__ == "__main__":
    process_files('./ziys-heom1.txt', './cangjie5.txt', './1.txt')