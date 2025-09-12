import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

// 自定义节点的样式
const nodeStyle = {
  border: '1px solid #777',
  padding: 10,
  borderRadius: 3,
  background: 'white',
  minWidth: 50,
  maxWidth: 250,
};

function TextUpdaterNode({ data, isConnectable }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nodeText, setNodeText] = useState(data.label);

  const onDoubleClick = () => {
    setIsEditing(true);
  };

  const onBlur = () => {
    setIsEditing(false);
    // 实际项目中，这里应该调用一个函数将修改后的文本传回父组件
    data.label = nodeText; 
  };
  
  const onChange = (evt) => {
    setNodeText(evt.target.value);
  };

  return (
    <div style={nodeStyle} onDoubleClick={onDoubleClick}>
      {/* 节点前后左右的连接点 */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div>
        {isEditing ? (
          <textarea 
            defaultValue={nodeText} 
            onChange={onChange} 
            onBlur={onBlur} 
            autoFocus 
            style={{width: '100%', resize: 'none', border: '1px solid #1677ff'}}
          />
        ) : (
          nodeText
        )}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}

export default TextUpdaterNode;