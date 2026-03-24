import React from 'react';
import ConfigPanel from '../ConfigPanel';
import { Terminal, Code } from 'lucide-react';

const ScriptConfigPanel = ({ node, onChange, onClose, onDelete }) => {
    const { data } = node;
    const {
        language = 'bash',
        label = 'Run Script',
        content = '',
        timeout = 300,
        retryCount = 0,
        retryDelay = 5
    } = data;

    return (
        <ConfigPanel
            title="Script"
            icon={<Terminal size={16} />}
            color="#71717a"
            onClose={onClose}
            footer={onDelete && (
                <button className="btn-delete-node" onClick={onDelete}>
                    Remove Node
                </button>
            )}
        >
            <div className="form-group">
                <label>Label</label>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => onChange({ ...data, label: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label>Language</label>
                <div className="lang-toggle">
                    <button
                        className={`lang-btn ${language === 'bash' ? 'active' : ''}`}
                        onClick={() => onChange({ ...data, language: 'bash' })}
                    >
                        <Terminal size={14} />
                        Bash
                    </button>
                    <button
                        className={`lang-btn ${language === 'python' ? 'active' : ''}`}
                        onClick={() => onChange({ ...data, language: 'python' })}
                    >
                        <Code size={14} />
                        Python
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>Script Content</label>
                <textarea
                    className="script-editor font-mono"
                    value={content}
                    onChange={(e) => onChange({ ...data, content: e.target.value })}
                    placeholder={language === 'bash'
                        ? "#!/bin/bash\necho 'Hello World'"
                        : "print('Hello World')"
                    }
                    rows={12}
                />
            </div>

            <div className="form-row form-row-3">
                <div className="form-group">
                    <label>Timeout (s)</label>
                    <input
                        type="number"
                        min="1"
                        max="3600"
                        value={timeout}
                        onChange={(e) => onChange({ ...data, timeout: parseInt(e.target.value) || 300 })}
                    />
                </div>
                <div className="form-group">
                    <label>Retries</label>
                    <input
                        type="number"
                        min="0"
                        max="5"
                        value={retryCount}
                        onChange={(e) => onChange({ ...data, retryCount: parseInt(e.target.value) || 0 })}
                    />
                </div>
                <div className="form-group">
                    <label>Delay (s)</label>
                    <input
                        type="number"
                        min="1"
                        max="300"
                        value={retryDelay}
                        onChange={(e) => onChange({ ...data, retryDelay: parseInt(e.target.value) || 5 })}
                    />
                </div>
            </div>

            <div className="panel-info-box">
                <strong>Variables</strong><br />
                <code>{'${node_id.stdout}'}</code> — output from a previous node<br />
                <code>$WORKFLOW_ID</code>, <code>$EXECUTION_ID</code> — workflow metadata<br />
                <code>$NODE_ID_OUTPUT</code> — node output as env var
            </div>
        </ConfigPanel>
    );
};

export default ScriptConfigPanel;
