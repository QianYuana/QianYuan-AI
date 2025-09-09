import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type ChatRole = 'user' | 'assistant'

export interface MessageItemProps {
  role: ChatRole
  content: string
  thinking?: string
  meta?: {
    model?: string
    id?: string
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    tools?: string[]
  }
}

const MessageItem: React.FC<MessageItemProps> = ({ role, content, thinking, meta }) => {
  const isUser = role === 'user'
  const [showAllThinking, setShowAllThinking] = React.useState(false)
  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      {!isUser && (
        <div className="avatar assistant-avatar" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a7 7 0 0 0-7 7v3a7 7 0 0 0 14 0V9a7 7 0 0 0-7-7Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 20a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      )}
      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        {isUser ? (
          content
        ) : (
          <div>
            {thinking && thinking.trim().length > 0 && (
              <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: '1px dashed #666', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#8aa0b4' }}>已深度思考</div>
                  {thinking.length > 200 && (
                    <button
                      style={{ fontSize: 12, color: '#8aa0b4', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={() => setShowAllThinking(v => !v)}
                    >
                      {showAllThinking ? '收起' : '展开全部'}
                    </button>
                  )}
                </div>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {showAllThinking ? thinking : (thinking.length > 200 ? thinking.slice(0, 200) + '…' : thinking)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>最终回答</div>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>
            {meta && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #ddd', color: '#666' }}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>调用信息</div>
                <div style={{ fontSize: 12 }}>
                  {meta.model && <span>model: {meta.model} </span>}
                  {meta.id && <span>id: {meta.id} </span>}
                  {meta.usage && (
                    <span>
                      tokens: p{meta.usage.prompt_tokens ?? '-'} / c{meta.usage.completion_tokens ?? '-'} / t{meta.usage.total_tokens ?? '-'}
                    </span>
                  )}
                </div>
                {Array.isArray(meta.tools) && meta.tools.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    工具调用：
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {meta.tools.map((t, i) => (
                        <div key={i}>- {t}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="avatar user-avatar" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export default MessageItem

