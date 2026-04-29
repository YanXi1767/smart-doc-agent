# 智能合同审查 Agent (Smart Doc Agent)

一个基于 React 和 Claude API 的智能合同审查工具，能够自动识别合同文件中的风险条款并生成结构化报告。

## ✨ 功能特性

- 📄 **多格式支持**: 支持 PDF、TXT、MD、DOC 等多种文档格式
- 🔍 **智能分析**: 基于 Claude AI 进行深度合同条款分析
- ⚠️ **风险识别**: 自动识别高、中、低风险条款
- 📊 **可视化报告**: 直观的风险评分和详细分析报告
- 🚀 **多 Agent 协作**: 采用多阶段分析流程，确保分析准确性

## 🛠️ 技术栈

- **前端框架**: React 18.2.0
- **构建工具**: Vite 5.0.0
- **AI 服务**: Claude API (claude-sonnet-4-20250514)
- **样式**: 内联样式 + CSS-in-JS

## 📦 安装与运行

### 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/smart-doc-agent.git
cd smart-doc-agent
```

2. **安装依赖**
```bash
npm install
```

3. **配置 API 密钥**

在 `src/App.jsx` 文件中，将 `YOUR_API_KEY_HERE` 替换为你的 Claude API 密钥：

```javascript
headers: { 
  "Content-Type": "application/json",
  "x-api-key": "your-actual-api-key-here"
}
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **构建生产版本**
```bash
npm run build
```

## 🎯 使用说明

### 上传文件模式
1. 点击"上传文件"按钮
2. 拖拽或选择合同文件（支持 PDF、TXT、MD、DOC）
3. 系统自动进行多阶段分析：
   - 文档解析
   - 条款抽取
   - 风险评分
   - 生成报告

### 粘贴文本模式
1. 点击"粘贴文本"按钮
2. 将合同文本粘贴到文本框中
3. 点击"开始分析"按钮

### 分析结果
- **安全评分**: 0-100 分的总体安全评分
- **风险统计**: 高风险、中风险、低风险条款数量
- **详细分析**: 每个风险条款的具体内容和修改建议
- **合同摘要**: 合同核心内容总结

## 🔧 项目结构

```
smart-doc-agent/
├── src/
│   ├── App.jsx          # 主应用组件
│   └── main.jsx         # 应用入口
├── index.html           # HTML 模板
├── vite.config.js       # Vite 配置
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 🚀 核心功能

### 1. 文档解析
- 自动识别文档类型（采购合同、劳动合同、租赁合同等）
- 提取核心主体信息（甲乙方、日期、金额）

### 2. 条款抽取
- 付款条款
- 违约条款
- 免责条款
- 保密条款
- 争议解决条款

### 3. 风险评分
- 高、中、低三级风险评级
- 具体风险原因说明
- 针对性修改建议

### 4. 报告生成
- 结构化 JSON 格式报告
- 可视化风险展示
- 详细的分析结论

## 🔒 安全说明

- 所有文件处理在浏览器端完成，不会上传到第三方服务器
- API 密钥需要用户自行配置，请妥善保管
- 分析结果仅供参考，不构成法律意见

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至: your-email@example.com

---

**注意**: 本项目需要有效的 Claude API 密钥才能正常运行。请确保你已获得相应的 API 访问权限。