import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `你是一个专业的智能合同审查 Agent，专门识别法律文件中的风险条款。

当用户上传合同文件时，你需要按以下结构化流程进行分析：

**第一步：文档解析**
- 识别文档类型（采购合同、劳动合同、租赁合同等）
- 提取核心主体信息（甲乙方、日期、金额）

**第二步：条款抽取**
- 列出关键条款类别：付款条款、违约条款、免责条款、保密条款、争议解决

**第三步：风险评分**
对每个风险条款给出评分（高/中/低）和具体原因。

**第四步：生成报告**
输出格式如下（严格使用JSON格式，不要有任何额外文字）：
{
  "docType": "文档类型",
  "parties": {"partyA": "甲方名称", "partyB": "乙方名称"},
  "amount": "合同金额（如有）",
  "date": "签署日期（如有）",
  "summary": "一句话总结合同核心内容",
  "risks": [
    {
      "id": 1,
      "level": "高|中|低",
      "clause": "条款名称",
      "content": "原文摘要",
      "reason": "风险说明",
      "suggestion": "修改建议"
    }
  ],
  "overallScore": 数字(0-100，越高越安全),
  "conclusion": "总体评价结论"
}`;

const RISK_COLORS = {
  高: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", badge: "#DC2626" },
  中: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A", badge: "#D97706" },
  低: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0", badge: "#059669" },
};

function ScoreRing({ score }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>{score}</text>
      <text x="50" y="62" textAnchor="middle" fontSize="11" fill="#6B7280">安全评分</text>
    </svg>
  );
}

function RiskCard({ risk, idx }) {
  const [open, setOpen] = useState(false);
  const c = RISK_COLORS[risk.level] || RISK_COLORS["低"];
  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderRadius: "10px",
      marginBottom: "10px",
      background: "#fff",
      overflow: "hidden",
      transition: "box-shadow 0.2s"
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 16px", cursor: "pointer",
          background: open ? c.bg : "#fff"
        }}
      >
        <span style={{
          background: c.badge, color: "#fff",
          fontSize: "11px", fontWeight: "700",
          padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap"
        }}>{risk.level}风险</span>
        <span style={{ fontWeight: "600", fontSize: "14px", flex: 1, color: "#111827" }}>
          {risk.clause}
        </span>
        <span style={{ fontSize: "16px", color: "#9CA3AF", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${c.border}`, background: c.bg }}>
          <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 8px" }}>
            <strong>条款摘要：</strong>{risk.content}
          </p>
          <p style={{ fontSize: "13px", color: c.text, margin: "0 0 8px" }}>
            <strong>风险说明：</strong>{risk.reason}
          </p>
          <p style={{ fontSize: "13px", color: "#065F46", margin: 0 }}>
            <strong>修改建议：</strong>{risk.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#6366F1",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
    </div>
  );
}

function StepBadge({ step, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        width: "24px", height: "24px", borderRadius: "50%",
        background: done ? "#10B981" : active ? "#6366F1" : "#E5E7EB",
        color: done || active ? "#fff" : "#9CA3AF",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: "700", flexShrink: 0,
        transition: "all 0.3s"
      }}>
        {done ? "✓" : step}
      </div>
      <span style={{
        fontSize: "12px",
        color: done ? "#10B981" : active ? "#6366F1" : "#9CA3AF",
        fontWeight: active || done ? "600" : "400"
      }}>{label}</span>
    </div>
  );
}

export default function SmartDocAgent() {
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | uploading | analyzing | done | error
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [inputMode, setInputMode] = useState("upload"); // upload | text
  const fileRef = useRef();

  const steps = ["文档解析", "条款抽取", "风险评分", "生成报告"];

  const readFileAsBase64 = (f) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("读取失败"));
      r.readAsDataURL(f);
    });

  const readFileAsText = (f) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("读取失败"));
      r.readAsText(f, "utf-8");
    });

  const runAnalysis = useCallback(async (content, isPdf, base64Data) => {
    setStatus("analyzing");
    setCurrentStep(1);
    setResult(null);
    setError("");

    try {
      // Simulate step progression
      const stepTimer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 4) return prev + 1;
          clearInterval(stepTimer);
          return prev;
        });
      }, 1800);

      let messages;
      if (isPdf && base64Data) {
        messages = [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Data }
            },
            { type: "text", text: "请分析这份合同文件，识别所有风险条款并生成结构化报告。只返回JSON，不要其他文字。" }
          ]
        }];
      } else {
        messages = [{
          role: "user",
          content: `请分析以下合同内容，识别所有风险条款并生成结构化报告。只返回JSON，不要其他文字。\n\n${content}`
        }];
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": "YOUR_API_KEY_HERE" // 需要替换为实际的API密钥
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages
        })
      });

      clearInterval(stepTimer);
      setCurrentStep(4);

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content.map(i => i.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStatus("done");
    } catch (e) {
      setError(e.message || "分析失败，请重试");
      setStatus("error");
      setCurrentStep(0);
    }
  }, []);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setStatus("uploading");
    setResult(null);
    setError("");

    try {
      if (f.type === "application/pdf") {
        const b64 = await readFileAsBase64(f);
        await runAnalysis("", true, b64);
      } else {
        const text = await readFileAsText(f);
        setFileText(text);
        await runAnalysis(text, false, null);
      }
    } catch (e) {
      setError("文件读取失败: " + e.message);
      setStatus("error");
    }
  }, [runAnalysis]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTextAnalyze = useCallback(async () => {
    if (!rawInput.trim()) return;
    await runAnalysis(rawInput, false, null);
  }, [rawInput, runAnalysis]);

  const reset = () => {
    setFile(null); setFileText(""); setResult(null);
    setStatus("idle"); setCurrentStep(0); setError(""); setRawInput("");
  };

  const highRisks = result?.risks?.filter(r => r.level === "高").length || 0;
  const midRisks = result?.risks?.filter(r => r.level === "中").length || 0;
  const lowRisks = result?.risks?.filter(r => r.level === "低").length || 0;

  return (
    <div style={{ fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif", maxWidth: "800px", margin: "0 auto", padding: "0 0 40px" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px"
          }}>📄</div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>
            智能合同审查 Agent
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
          多 Agent 协作 · 长链推理 · 自动风险识别 · 结构化报告生成
        </p>
      </div>

      {/* Input Area */}
      {status === "idle" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {["upload", "text"].map(m => (
              <button key={m} onClick={() => setInputMode(m)} style={{
                padding: "6px 16px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                border: inputMode === m ? "none" : "1px solid #E5E7EB",
                background: inputMode === m ? "#6366F1" : "#fff",
                color: inputMode === m ? "#fff" : "#374151",
                fontWeight: inputMode === m ? "600" : "400"
              }}>
                {m === "upload" ? "上传文件" : "粘贴文本"}
              </button>
            ))}
          </div>

          {inputMode === "upload" ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "#6366F1" : "#D1D5DB"}`,
                borderRadius: "16px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "#EEF2FF" : "#FAFAFA",
                transition: "all 0.2s"
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
              <p style={{ margin: "0 0 6px", fontWeight: "600", color: "#374151" }}>
                拖拽文件到此处，或点击上传
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF" }}>
                支持 PDF、TXT、MD 格式
              </p>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.doc" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder="将合同文本粘贴到此处进行分析..."
                style={{
                  width: "100%", height: "200px", padding: "14px",
                  border: "1px solid #D1D5DB", borderRadius: "12px",
                  fontSize: "13px", lineHeight: "1.6", resize: "vertical",
                  fontFamily: "inherit", boxSizing: "border-box",
                  outline: "none", color: "#111827"
                }}
              />
              <button
                onClick={handleTextAnalyze}
                disabled={!rawInput.trim()}
                style={{
                  marginTop: "10px", padding: "10px 24px",
                  background: rawInput.trim() ? "#6366F1" : "#E5E7EB",
                  color: rawInput.trim() ? "#fff" : "#9CA3AF",
                  border: "none", borderRadius: "8px", fontSize: "14px",
                  fontWeight: "600", cursor: rawInput.trim() ? "pointer" : "not-allowed"
                }}
              >
                开始分析 →
              </button>
            </div>
          )}

          {/* Demo hint */}
          <div style={{
            marginTop: "16px", padding: "12px 16px",
            background: "#EEF2FF", borderRadius: "10px",
            fontSize: "12px", color: "#4338CA"
          }}>
            💡 <strong>演示提示：</strong>可粘贴任意合同文本，系统将自动识别条款类型并完成风险分析
          </div>
        </>
      )}

      {/* Analyzing State */}
      {(status === "uploading" || status === "analyzing") && (
        <div style={{
          border: "1px solid #E5E7EB", borderRadius: "16px",
          padding: "32px 24px", background: "#fff"
        }}>
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
              {file?.name || "正在分析文本..."}
            </div>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>AI 正在进行多阶段深度分析</div>
          </div>

          {/* Progress steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {steps.map((s, i) => (
              <StepBadge key={s} step={i + 1} label={s}
                active={currentStep === i + 1}
                done={currentStep > i + 1} />
            ))}
          </div>

          <LoadingDots />
          <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "8px" }}>
            {steps[Math.max(0, currentStep - 1)] || "初始化中"}...
          </div>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div style={{
          border: "1px solid #FECACA", borderRadius: "12px",
          padding: "20px", background: "#FEF2F2"
        }}>
          <div style={{ fontWeight: "600", color: "#991B1B", marginBottom: "8px" }}>分析失败</div>
          <div style={{ fontSize: "13px", color: "#DC2626", marginBottom: "16px" }}>{error}</div>
          <button onClick={reset} style={{
            padding: "8px 20px", background: "#DC2626", color: "#fff",
            border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer"
          }}>重新上传</button>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div>
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "20px"
          }}>
            <div>
              <div style={{ fontWeight: "700", color: "#111827", fontSize: "16px" }}>
                {result.docType || "合同文件"}
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                {result.parties?.partyA} ↔ {result.parties?.partyB}
                {result.amount ? ` · ${result.amount}` : ""}
              </div>
            </div>
            <button onClick={reset} style={{
              padding: "6px 16px", background: "#F3F4F6",
              border: "none", borderRadius: "8px", fontSize: "13px",
              cursor: "pointer", color: "#374151"
            }}>重新分析</button>
          </div>

          {/* Score + stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr",
            gap: "20px", alignItems: "center",
            background: "#fff", border: "1px solid #E5E7EB",
            borderRadius: "16px", padding: "20px", marginBottom: "20px"
          }}>
            <ScoreRing score={result.overallScore || 60} />
            <div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                {[
                  { label: "高风险", count: highRisks, color: "#DC2626", bg: "#FEE2E2" },
                  { label: "中风险", count: midRisks, color: "#D97706", bg: "#FEF3C7" },
                  { label: "低风险", count: lowRisks, color: "#059669", bg: "#D1FAE5" },
                ].map(({ label, count, color, bg }) => (
                  <div key={label} style={{
                    background: bg, borderRadius: "8px",
                    padding: "8px 14px", textAlign: "center", minWidth: "64px"
                  }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color }}>{count}</div>
                    <div style={{ fontSize: "11px", color, fontWeight: "500" }}>{label}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                {result.conclusion}
              </p>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #A7F3D0",
              borderRadius: "10px", padding: "14px 16px", marginBottom: "20px"
            }}>
              <div style={{ fontSize: "12px", color: "#065F46", fontWeight: "600", marginBottom: "4px" }}>合同摘要</div>
              <div style={{ fontSize: "13px", color: "#047857" }}>{result.summary}</div>
            </div>
          )}

          {/* Risk list */}
          <div style={{ marginBottom: "8px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#111827" }}>
              风险条款详情（{result.risks?.length || 0} 项）
            </h3>
            {result.risks?.sort((a, b) => {
              const order = { 高: 0, 中: 1, 低: 2 };
              return (order[a.level] || 2) - (order[b.level] || 2);
            }).map((risk, i) => (
              <RiskCard key={risk.id || i} risk={risk} idx={i} />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "20px", padding: "12px 16px",
            background: "#F9FAFB", borderRadius: "10px",
            fontSize: "11px", color: "#9CA3AF", textAlign: "center"
          }}>
            由 Claude claude-sonnet-4-20250514 多 Agent 协作分析 · 结果仅供参考，不构成法律意见
          </div>
        </div>
      )}
    </div>
  );
}