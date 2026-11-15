/**
 * 用于管理和调度动作列表的类。
 */
class ActionScheduler {
  /**
   * 创建一个动作调度器实例。
   * 
   * @param {string} actionTemplate - 动作参数模板，参数名以空格分隔（例如："x y duration"）
   * @param {Object} fullActionObject - 完整动作对象模板
   */
  constructor(actionTemplate, fullActionObject) {
    /**
     * 动作参数模板路径映射字符串
     * @type {string}
     * @private
     */
    this._actionTemplate = actionTemplate;

    /**
     * 基础完整动作对象模板
     * @type {Object}
     * @private
     */
    this._fullActionObject = fullActionObject;

    /**
     * 存储解析出来的简化动作对象列表
     * @type {Array<Object>}
     * @private
     */
    this._simplifiedActionList = [];

    /**
     * 存储最终生成的完整动作对象列表
     * @type {Array<Object>}
     * @private
     */
    this._fullActionList = [];
  }

  /**
   * 批量解析并添加简化动作字符串列表
   * 
   * @param {string[]} actions - 简化动作字符串数组
   */
  addSimplifiedActions(actions) {
    // 遍历传入的字符串列表
    for (const actionString of actions) {
      // 逐个调用单条解析逻辑
      this.addSimplifiedAction(actionString);
    }
  }

  /**
   * 将输入的动作字符串解析为对象结构（支持 posData.x 这类嵌套路径），并添加到简化动作对象数组中。
   * 
   * @param {string} actionString - 参数值字符串，以空格分隔（例如："点击 20% 50% 1000"）
   * @returns {Object} 生成的简化动作对象
   */
  addSimplifiedAction(actionString) {
    // 将映射规则模板按空格分隔拆分成键名路径数组
    const templateKeys = this._actionTemplate.trim().split(/\s+/);
    
    // 将传入的实际动作参数按空格分隔拆分成属性值数组
    const actionValues = actionString.trim().split(/\s+/);

    // 存放解析后的嵌套对象容器
    const simplifiedAction = {};

    // 按照键名路径数组的长度进行循环遍历
    for (let i = 0; i < templateKeys.length; i++) {
      // 当前的属性路径字符串（如 "posData.x"）
      const keyPath = templateKeys[i];
      // 对应的实际属性值（如 "20%"）
      const val = actionValues[i];
      
      // 校验：如果路径不存在、属性值不存在、或者值占位符为 "n" 则跳过处理
      if (!keyPath || !val || val == "n") {
        continue;
      }

      // 将嵌套路径按 '.' 拆分为多级节点数组（如 ["posData", "x"]）
      const keys = keyPath.split('.');

      // 指向当前正在构建的对象层级引用（初始指向根对象）
      let currentObj = simplifiedAction;

      // 遍历路径中的节点，动态构建多层嵌套对象结构
      for (let j = 0; j < keys.length; j++) {
        // 当前节点层级的属性名
        const key = keys[j];

        // 判断是否到了路径的最后一层节点
        if (j === keys.length - 1) {
          // 最后一层节点，直接将具体数值赋值给目标属性
          currentObj[key] = val;
        } else {
          // 如果下一级对象节点还未创建或不是对象，则初始化为空对象
          if (!currentObj[key] || typeof currentObj[key] !== 'object') {
            currentObj[key] = {};
          }
          // 将引用移动到下一层级对象上，继续往下构建
          currentObj = currentObj[key];
        }
      }
    }

    // 将生成的简化对象加入内部列表保存
    this._simplifiedActionList.push(simplifiedAction);
    // 返回生成的单条简化动作对象
    return simplifiedAction;
  }

  /**
   * 根据模板对象的数据，递归替换或合并到目标对象中。
   * 
   * - 仅处理 `objectMode` 中已定义的属性。
   * - 若 `objectMode` 中的属性值为普通对象，会递归深度替换。
   * - 若 `objectNew` 中不存在 `objectMode` 对应的数据，会自动补充该属性及对应的值。
   *
   * @param {Object} objectMode - 替换的对象数据模板（源数据，即简化参数对象）
   * @param {Object} objectNew - 要被替换数据的对象（目标对象，即完整基础模板副本）
   * @returns {Object} 替换合并完成后的 `objectNew` 对象
   */
  replaceData(objectMode, objectNew) {
    // 基础防御性校验：若源数据不是有效对象（或者是数组/null），直接返回目标对象
    if (!objectMode || typeof objectMode !== 'object' || Array.isArray(objectMode)) {
      return objectNew;
    }
    // 基础防御性校验：若目标数据不是有效对象，直接返回
    if (!objectNew || typeof objectNew !== 'object' || Array.isArray(objectNew)) {
      return objectNew;
    }

    // 遍历源数据对象中所有可枚举的 Key
    for (const key of Object.keys(objectMode)) {
      // 获取源对象的属性值
      const modeValue = objectMode[key];
      // 获取目标对象的属性值
      const newValue = objectNew[key];

      // 判断源属性值是否为纯粹的对象（排除 null 和 数组）
      const isModeValueObject = modeValue !== null && typeof modeValue === 'object' && !Array.isArray(modeValue);
      // 判断目标属性值是否为纯粹的对象
      const isNewValueObject = newValue !== null && typeof newValue === 'object' && !Array.isArray(newValue);

      // 如果源属性值是嵌套对象
      if (isModeValueObject) {
        // 若目标对象在该 Key 位置还不是对象，则初始化为空对象
        if (!isNewValueObject) {
          objectNew[key] = {};
        }
        // 递归调用深度替换子对象内部属性
        this.replaceData(modeValue, objectNew[key]);
      } else {
        // 基础数据类型（或数组/null）：直接使用源数据覆盖/赋予目标对象
        objectNew[key] = modeValue;
      }
    }

    // 返回覆盖更新后的目标对象
    return objectNew;
  }

  /**
   * 遍历完整动作对象数组，依次驱动执行动作。
   */
  run() {
    // 遍历已生成的完整动作列表
    for (const actionItem of this._fullActionList) {
      // 调用宿主/全局的 zdjl 自动化框架驱动运行单条动作
      zdjl.runAction(actionItem);
    }
  }

  /**
   * 遍历简化动作对象数组，调用 replaceData 方法生成并返回完整动作对象数组。
   * 
   * @returns {Array<Object>} 生成的完整动作对象数组
   */
  generateFullActionList() {
    // 清空重置完整动作对象数组，防止重复构建
    this._fullActionList = [];

    // 遍历所有解析好的简化动作对象
    for (let ac of this._simplifiedActionList) {
      // 进行深拷贝，避免多个动作实例引用同一个全局模板导致相互污染
      const templateCopy = JSON.parse(JSON.stringify(this._fullActionObject));
      // 将简化动作中的覆盖参数合并进基础模板副本中
      const fullAction = this.replaceData(ac, templateCopy);
      // 将生成好的完整动作加入列表
      this._fullActionList.push(fullAction);
    }

    // 返回生成好的完整动作数组
    return this._fullActionList;
  }

  // ================= 属性 Getter & Setter 访问器方法 =================

  /**
   * 获取动作参数模板。
   * @returns {string} 动作参数模板字符串
   */
  getActionTemplate() {
    return this._actionTemplate;
  }

  /**
   * 设置动作参数模板。
   * @param {string} actionTemplate - 新的动作参数模板
   */
  setActionTemplate(actionTemplate) {
    this._actionTemplate = actionTemplate;
  }

  /**
   * 获取完整动作模板对象。
   * @returns {Object} 完整动作对象模板
   */
  getFullActionObject() {
    return this._fullActionObject;
  }

  /**
   * 设置完整动作模板对象。
   * @param {Object} fullActionObject - 新的完整动作模板对象
   */
  setFullActionObject(fullActionObject) {
    this._fullActionObject = fullActionObject;
  }

  /**
   * 获取简化动作对象数组。
   * @returns {Array<Object>} 简化动作对象数组
   */
  getSimplifiedActionList() {
    return this._simplifiedActionList;
  }

  /**
   * 设置简化动作对象数组。
   * @param {Array<Object>} list - 新的简化动作对象数组
   */
  setSimplifiedActionList(list) {
    this._simplifiedActionList = list;
  }

  /**
   * 获取完整动作对象数组。
   * @returns {Array<Object>} 完整动作对象数组
   */
  getFullActionList() {
    return this._fullActionList;
  }

  /**
   * 设置完整动作对象数组。
   * @param {Array<Object>} list - 新的完整动作对象数组
   */
  setFullActionList(list) {
    this._fullActionList = list;
  }
}

/**
 * 动作工厂类
 * 用于解析动作池模板，构建映射关系并根据组合指令生成动作指令数组
 */
class ActionFactory {
  /**
   * 创建 ActionFactory 实例
   * 
   * @param {string[]} actionPool - 动作定义字符串数组，如 ["ck | 点击 50 50", "sw | 滑动 100 200"]
   * @param {string} [spt="|"] - 解析动作定义时的键值分隔符，默认为 "|"
   */
  constructor(actionPool, spt = "|") {
    /** 
     * 原始动作池数据数组 
     * @type {string[]} 
     */
    this.actionPool = actionPool;

    /** 
     * 键值分隔符 
     * @type {string} 
     */
    this.spt = spt;

    /** 
     * 解析后的动作映射字典 
     * @type {Map<string, string>} 
     */
    this.actionMap = new Map();
  }

  /**
   * 将类实例中的字符串数组动作池（actionPool）转换为 Map 结构，并同步更新 this.actionMap
   * 
   * @returns {Map<string, string>} 解析生成的 Map 实例（Key 为动作标识，Value 为具体指令）
   */
  arrayToMap() {
    // 获取实例的动作池数组引用
    let list = this.actionPool;
    // 获取实例的分隔符引用
    let separator = this.spt;

    // 参数校验：如果不是数组直接返回空 Map
    if (!Array.isArray(list)) {
      return new Map();
    }

    // 使用 reduce 累加器将数组转化为 Map 对象
    let newM = list.reduce((map, item) => {
      // 确保当前项为字符串
      if (typeof item === 'string') {
        // 根据分隔符切割字符串
        const parts = item.split(separator);

        // 如果切割出至少两部分（Key 和 Value）
        if (parts.length >= 2) {
          // 获取第一个部分作为 Key 并去除前后多余空格
          const key = parts[0].trim();
          // 如果 Value 中也有分隔符，将其重新拼接并去除前后空格
          const value = parts.slice(1).join(separator).trim();

          // 如果 Key 不为空，写入 Map 中
          if (key) {
            map.set(key, value);
          }
        }
      }
      return map;
    }, new Map());

    // 更新实例内部的 actionMap 属性
    this.actionMap = newM;
    // 返回构建好的 Map
    return newM;
  }

  /**
   * 根据传入的组合指令字符串，拆分出动作 key 并去目标 Map 中检索对应的值
   * 
   * @param {string} str - 待解析的组合指令字符串（例如: "ck - sw - delay"）
   * @param {Map<string, any>} [map=this.actionMap] - 检索的目标 Map 对象，默认使用实例自身的 actionMap
   * @param {string} [separator="-"] - 拆分组合指令的分割符，默认为 "-"
   * @returns {string[]} 匹配成功的作用指令数组
   */
  getMapValuesByString(str, map = this.actionMap, separator = "-") {
    // 1. 基础校验与清理：确保传入的是字符串且不为空
    if (typeof str !== 'string' || !str.trim()) {
      return [];
    }
    // 校验传入的 map 是否为 Map 类型的实例
    if (!(map instanceof Map)) {
      return [];
    }

    // 2. 将输入的组合字符串去空格、按 '-' 拆分，并对各项做 trim 去空格和过滤空值
    const keys = str
      .trim()
      .split(separator)
      .map(k => k.trim())
      .filter(Boolean);

    // 3. 存储查询匹配到的结果数组
    const result = [];
    // 遍历拆分出的每一个动作标识 Key
    for (const key of keys) {
      // 如果字典中存在该 Key
      if (map.has(key)) {
        // 将对应的值加入结果数组
        result.push(map.get(key));
      }
    }

    // 返回匹配出的参数值数组
    return result;
  }
}

// 将核心类导出，供外部 includeLib 加载
module.exports = { ActionScheduler, ActionFactory };