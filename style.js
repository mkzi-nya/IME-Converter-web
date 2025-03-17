/****************************************************
 * 全局状态
 ****************************************************/
let schemaConfigs = [];       // schema.txt 解析后的配置数组
let currentSchema = null;     // 当前选定的方案
let codeMap = new Map();      // 码表：code → 汉字（用于解码）
let charMap = new Map();      // 码表：汉字/词 → 数组[编码]（用于汉字转编码）
let codeCandidatesMap = new Map(); // 反向映射：code → 数组[汉字]（用于显示候选顺序）

// 键映射对象（当 kce=true 时）
let keyMapObj = {};
let reverseKeyMapObj = {};

// 记录最后编辑的区域："chars" 或 "codes"
let lastEdited = null;

//////////////////////////////////////////
// 页面加载后初始化
//////////////////////////////////////////
window.addEventListener('DOMContentLoaded', async () => {
  initEventHandlers();
  try {
    await loadSchemaConfigs();
    if (schemaConfigs.length > 0) {
      setCurrentSchema(schemaConfigs[0]);
    }
  } catch (err) {
    alert('加载schema.txt失败：' + err.message);
  }
});

//////////////////////////////////////////
// 事件绑定
//////////////////////////////////////////
function initEventHandlers() {
  // 委托处理按钮（清空、复制、粘贴）
  document.body.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName.toLowerCase() === 'button') {
      if (target.dataset.clear) {
        const id = target.dataset.clear;
        document.getElementById(id).value = '';
        document.getElementById(id).dispatchEvent(new Event('input'));
      } else if (target.dataset.copy) {
        copyText(target.dataset.copy);
      } else if (target.dataset.paste) {
        pasteText(target.dataset.paste);
      }
    }
  });

  // 输入框实时转换
  const inputCharsEl = document.getElementById('inputChars');
  const inputCodesEl = document.getElementById('inputCodes');
  inputCharsEl.addEventListener('input', () => {
    lastEdited = 'chars';
    convertCharsToCodes();
  });
  inputCodesEl.addEventListener('input', () => {
    lastEdited = 'codes';
    convertCodesToChars();
  });

  // 方案选择弹窗
  document.getElementById('chooseSchemaBtn').addEventListener('click', toggleModal);
  document.getElementById('closeModalBtn').addEventListener('click', toggleModal);
}

//////////////////////////////////////////
// 读取并解析 schema.txt
//////////////////////////////////////////
async function loadSchemaConfigs() {
  const response = await fetch('./dict/schema.txt');
  if (!response.ok) {
    throw new Error('无法读取 ./dict/schema.txt');
  }
  const text = await response.text();
  parseSchemaText(text);
  renderSchemaList();
}

function parseSchemaText(schemaText) {
  /*
    示例配置（部分关键参数说明）：
    
    [仓颉示例]
    name=仓颉输入法
    file=cangjie.txt
    f=code_left_char_right
    d= 
    od= 
    kce=false
    dr=prefer_first
    ml=5
    mcp=2
    mcpLetter=x
    pp=false

    [仓颉(字母映射)]
    name=仓颉(字母映射)
    file=cangjie.txt
    f=code_left_char_right
    d= 
    od= 
    kce=true
    dr=prefer_first
    ml=5
    mcp=2
    mcpLetter=x
    pp=false
    keyMap=a=日,b=月,c=金,d=木,e=水,f=火,g=土,h=竹,i=戈,j=十,k=大,l=中,m=一,n=弓,o=人,p=心,q=手,r=口,s=尸,t=廿,u=山,v=女,w=田,x=難,y=卜,z=片
  */
  schemaConfigs = [];
  const lines = schemaText.split(/\r?\n/);
  let currentBlock = null;
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;
    if (line.startsWith('#')) return;
    const blockMatch = line.match(/^\[(.+)\]$/);
    if (blockMatch) {
      currentBlock = { id: blockMatch[1], properties: {} };
      schemaConfigs.push(currentBlock);
    } else if (currentBlock) {
      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        currentBlock.properties[key] = value;
      } else {
        throw new Error(`schema.txt 第 ${idx + 1} 行格式错误：${rawLine}`);
      }
    }
  });
}

function renderSchemaList() {
  const ul = document.getElementById('schemaList');
  ul.innerHTML = '';
  schemaConfigs.forEach(cfg => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    const name = cfg.properties.name || cfg.id;
    btn.textContent = name;
    btn.addEventListener('click', () => {
      setCurrentSchema(cfg);
      toggleModal();
    });
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

//////////////////////////////////////////
// 选中并加载某个 schema
//////////////////////////////////////////
async function setCurrentSchema(schema) {
  currentSchema = schema;
  codeMap.clear();
  charMap.clear();
  codeCandidatesMap.clear();
  keyMapObj = {};
  reverseKeyMapObj = {};

  // 更新按钮显示当前方案名称
  document.getElementById("chooseSchemaBtn").textContent = currentSchema.properties.name || currentSchema.id;

  const { file } = schema.properties;
  if (!file) {
    alert('该输入法配置没有指定 file=xxx');
    return;
  }
  // 若启用键映射且配置了 keyMap，则构造映射对象
  const kce = (schema.properties.kce === 'true');
  if (kce && schema.properties.keyMap) {
    parseKeyMap(schema.properties.keyMap);
  }
  try {
    const response = await fetch(`./dict/${file}`);
    if (!response.ok) {
      throw new Error(`无法读取 ./dict/${file}`);
    }
    const text = await response.text();
    parseCodeTable(text);
    if (lastEdited === 'chars') {
      convertCharsToCodes();
    } else if (lastEdited === 'codes') {
      convertCodesToChars();
    }
  } catch (err) {
    alert('加载码表出错：' + err.message);
  }
}

function parseKeyMap(keyMapStr) {
  // 格式示例："a=日,b=月,c=金,d=木,e=水"
  const pairs = keyMapStr.split(',');
  pairs.forEach(p => {
    const [k, v] = p.split('=').map(s => s.trim());
    if (!k || !v) return;
    keyMapObj[k] = v;
    reverseKeyMapObj[v] = k;
  });
}

//////////////////////////////////////////
// 解析码表文件
//////////////////////////////////////////
function parseCodeTable(text) {
  const p = currentSchema.properties;
  let format = p.f || 'code_left_char_right';
  let delimiter = p.d || ' ';
  let dr = p.dr || 'prefer_first';
  if (delimiter === '\\t') {
    delimiter = '\t';
  }
  // 清空候选映射
  codeCandidatesMap = new Map();
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;
    const parts = line.split(delimiter);
    if (parts.length < 2) {
      throw new Error(`码表文件第 ${idx + 1} 行格式错误：${rawLine}`);
    }
    let codePart, charPart;
    if (format === 'code_left_char_right') {
      codePart = parts[0];
      charPart = parts[1];
    } else if (format === 'char_left_code_right') {
      charPart = parts[0];
      codePart = parts[1];
    } else {
      throw new Error(`不支持的 f: ${format}`);
    }
    // 建立编码→汉字映射（用于解码），根据 dr 策略处理重复
    if (!codeMap.has(codePart)) {
      codeMap.set(codePart, charPart);
    } else if (dr === 'prefer_last') {
      codeMap.set(codePart, charPart);
    }
    // 建立汉字→编码映射，保存所有候选
    if (charMap.has(charPart)) {
      charMap.get(charPart).push(codePart);
    } else {
      charMap.set(charPart, [codePart]);
    }
    // 建立反向映射：code → 数组[汉字]
    if (codeCandidatesMap.has(codePart)) {
      codeCandidatesMap.get(codePart).push(charPart);
    } else {
      codeCandidatesMap.set(codePart, [charPart]);
    }
  });
}

//////////////////////////////////////////
// 弹窗开关
//////////////////////////////////////////
function toggleModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.style.display = (overlay.style.display === 'flex') ? 'none' : 'flex';
}

//////////////////////////////////////////
// 复制 / 粘贴功能
//////////////////////////////////////////
function copyText(id) {
  const el = document.getElementById(id);
  el.select();
  document.execCommand('copy');
}

async function pasteText(id) {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById(id).value = text;
    document.getElementById(id).dispatchEvent(new Event('input'));
  } catch (err) {
    alert('无法从剪贴板读取：' + err);
  }
}

//////////////////////////////////////////
// 汉字 → 编码 转换
//////////////////////////////////////////
function convertCharsToCodes() {
  if (!currentSchema) return;
  const inputCharsEl = document.getElementById('inputChars');
  const inputCodesEl = document.getElementById('inputCodes');
  const p = currentSchema.properties;
  const od = p.od || ' '; // 分隔符仅用于分割，不输出
  const text = inputCharsEl.value;
  if (!text) {
    inputCodesEl.value = '';
    return;
  }
  
  // 对于单个非空白汉字，显示所有候选编码（带序号）
  if (text.length === 1 && !/\s/.test(text)) {
    const codes = charMap.get(text);
    if (!codes) {
      inputCodesEl.value = text;
    } else {
      let multiCodes = codes.map((code, index) =>
        `${index+1}:${applyKeyConversion(code, p)}`
      ).join(" ");//多个编码间隔
      inputCodesEl.value = multiCodes;
    }
    return;
  }
  
  let outputStr = "";
  if (p.pp === 'true') {
    // 启用词语解析：采用贪心匹配最大词
    let i = 0;
    while (i < text.length) {
      if (/\s/.test(text[i])) {
        outputStr += text[i];
        i++;
      } else {
        let maxMatch = "";
        for (let j = text.length; j > i; j--) {
          let seg = text.substring(i, j);
          if (charMap.has(seg)) {
            maxMatch = seg;
            break;
          }
        }
        if (maxMatch) {
          let codes = charMap.get(maxMatch);
          let selectedCode = selectCandidate(codes, p);
          let reverseCandidates = codeCandidatesMap.get(selectedCode) || [];
          let candidateIndex = reverseCandidates.indexOf(maxMatch) + 1;
          if (candidateIndex < 1) candidateIndex = 1;
          let codeOut = applyKeyConversion(selectedCode, p);
          if (candidateIndex > 1) {
            codeOut += (candidateIndex <= 9 ? candidateIndex : "_");
          }
          outputStr += codeOut;
          let needDelimiter = true;
          if (candidateIndex > 1) needDelimiter = false;
          if (p.ml && selectedCode.length >= parseInt(p.ml, 10)) needDelimiter = false;
          if (i + maxMatch.length < text.length && !/\s/.test(text[i+maxMatch.length]) && needDelimiter) {
            outputStr += od;
          }
          i += maxMatch.length;
        } else {
          // 单字处理
          let single = text[i];
          let codes = charMap.get(single);
          if (!codes) {
            outputStr += single;
          } else {
            let selectedCode = selectCandidate(codes, p);
            let reverseCandidates = codeCandidatesMap.get(selectedCode) || [];
            let candidateIndex = reverseCandidates.indexOf(single) + 1;
            if (candidateIndex < 1) candidateIndex = 1;
            let codeOut = applyKeyConversion(selectedCode, p);
            if (candidateIndex > 1) {
              codeOut += (candidateIndex <= 9 ? candidateIndex : "_");
            }
            outputStr += codeOut;
            let needDelimiter = true;
            if (candidateIndex > 1) needDelimiter = false;
            if (p.ml && selectedCode.length >= parseInt(p.ml, 10)) needDelimiter = false;
            if (i < text.length - 1 && !/\s/.test(text[i+1]) && needDelimiter) {
              outputStr += od;
            }
          }
          i++;
        }
      }
    }
  } else {
    // 不解析词语：逐字处理
    for (let i = 0; i < text.length; i++) {
      let ch = text[i];
      if (/\s/.test(ch)) {
        outputStr += ch;
      } else {
        let codes = charMap.get(ch);
        if (!codes) {
          outputStr += ch;
        } else {
          let selectedCode = selectCandidate(codes, p);
          let reverseCandidates = codeCandidatesMap.get(selectedCode) || [];
          let candidateIndex = reverseCandidates.indexOf(ch) + 1;
          if (candidateIndex < 1) candidateIndex = 1;
          let codeOut = applyKeyConversion(selectedCode, p);
          if (candidateIndex > 1) {
            codeOut += (candidateIndex <= 9 ? candidateIndex : "_");
          }
          outputStr += codeOut;
          let needDelimiter = true;
          if (candidateIndex > 1) needDelimiter = false;
          if (p.ml && selectedCode.length >= parseInt(p.ml, 10)) needDelimiter = false;
          if (i < text.length - 1 && !/\s/.test(text[i+1]) && needDelimiter) {
            outputStr += od;
          }
        }
      }
    }
  }
  inputCodesEl.value = outputStr;
}

function selectCandidate(codes, p) {
  let mcp = p.mcp || '1';
  if (mcp === '1') {
    return codes[0];
  } else if (mcp === '2') {
    let mcpLetter = p.mcpLetter || 'x';
    return codes.reduce((prev, curr) =>
      countChar(curr, mcpLetter) > countChar(prev, mcpLetter) ? curr : prev
    );
  } else {
    return codes[0];
  }
}

function applyKeyConversion(code, p) {
  const kce = (p.kce === 'true');
  if (!kce) return code;
  let transformed = "";
  for (let c of code) {
    transformed += keyMapObj[c] || c;
  }
  return transformed;
}

function countChar(str, char) {
  return [...str].filter(c => c === char).length;
}

//////////////////////////////////////////
// 编码 → 汉字 转换
//////////////////////////////////////////
function convertCodesToChars() {
  if (!currentSchema) return;
  const inputCodesEl = document.getElementById('inputCodes');
  const inputCharsEl = document.getElementById('inputChars');
  const p = currentSchema.properties;
  const kce = (p.kce === 'true');
  let rawCodes = inputCodesEl.value;
  if (!rawCodes) {
    inputCharsEl.value = '';
    return;
  }
  // 先用配置中设定的分隔符将内容分割（分隔符仅用于分割，不输出）
  const separator = p.od || ' ';
  let segments = rawCodes.split(separator);
  let outputStr = "";
  // 对每个段：如果启用键映射，则先将段内所有字符转换为对应字母（利用 reverseKeyMapObj）
  segments.forEach(seg => {
    let segStr = "";
    for (let ch of seg) {
      segStr += (kce ? (reverseKeyMapObj[ch] || ch) : ch);
    }
    outputStr += decodeSegment(segStr);
  });
  inputCharsEl.value = outputStr;
}

/**
 * decodeSegment(segment)
 * 对单个编码段采用递归“右至左”切割解码：
 * 1. 如果 segment 为空，则返回 ""。
 * 2. 设定尝试匹配的最大长度为：若配置了 ml，则为 Math.min(segment.length, ml)；否则为 segment.length。
 * 3. 从最大长度开始递减，取前缀 prefix。如果 prefix 存在于 codeMap 中，则：
 *      a. 检查 prefix 后面是否有至少一个字符，并且首字符为数字或下划线（候选指示符）。
 *         如果有，则将该数字解释为候选选择键（下划线代表 10），
 *         并在 codeCandidatesMap[prefix] 中取对应候选汉字；然后跳过这个候选指示符继续递归处理余下部分。
 *      b. 如果没有候选指示符，则返回 codeMap(prefix) 加上对余下部分递归解码的结果。
 * 4. 如果从最大长度到 1 均没有匹配到，则直接返回 segment[0] 并递归处理剩余部分。
 * 5. 保证递归后至少输出一个编码对应的字符。
 */
function decodeSegment(segment) {
  if (!segment) return "";
  const p = currentSchema.properties;
  let maxLen = segment.length;
  if (p.ml) {
    let ml = parseInt(p.ml, 10);
    if (ml < maxLen) maxLen = ml;
  }
  // 尝试从 maxLen 到 1 逐步匹配
  for (let i = maxLen; i >= 1; i--) {
    let prefix = segment.substring(0, i);
    if (codeMap.has(prefix)) {
      let result = "";
      let remainder = segment.substring(i);
      // 检查 remainder 的首字符是否为候选数字或下划线
      if (remainder.length > 0 && /^[0-9_]/.test(remainder[0])) {
        let digitChar = remainder[0];
        let candidateIndex = (digitChar === '_' ? 10 : parseInt(digitChar, 10));
        if (codeCandidatesMap.has(prefix)) {
          let candidates = codeCandidatesMap.get(prefix);
          if (candidateIndex >= 1 && candidateIndex <= candidates.length) {
            result = candidates[candidateIndex - 1];
            // 递归处理余下部分，跳过候选指示符
            return result + decodeSegment(remainder.substring(1));
          }
        }
        // 若候选数字不匹配，则将该数字作为普通字符输出
        result = codeMap.get(prefix) + digitChar + decodeSegment(remainder.substring(1));
        return result;
      } else {
        result = codeMap.get(prefix) + decodeSegment(remainder);
        return result;
      }
    }
  }
  // 没有任何前缀匹配，则输出首字符并递归处理余下部分
  return segment[0] + decodeSegment(segment.substring(1));
}
