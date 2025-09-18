import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
// 新增：引入 Modal 和 Input 组件
import { Button, Space, Modal, Input } from 'antd'; 
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

import TextUpdaterNode from './TextUpdaterNode';

import 'reactflow/dist/style.css';

const nodeTypes = { textUpdater: TextUpdaterNode };

export default function ArgumentMap({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  addBlankNode,
  setNodes,
  setEdges,
}) {
  const { getNodes, getEdges } = useReactFlow();

  // --- 新增：管理编辑连线功能的 State ---
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [edgeLabel, setEdgeLabel] = useState('');

  // --- 新增：处理连线双击事件的函数 ---
  const handleEdgeDoubleClick = useCallback((event, edge) => {
    setSelectedEdge(edge); // 记录被双击的线
    setEdgeLabel(edge.label || ''); // 如果已有批注，则显示
    setIsModalOpen(true); // 打开对话框
  }, []);

  // --- 新增：处理对话框中的“保存批注”操作 ---
  const handleModalOk = useCallback(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          // 找到对应的线，更新它的 label
          return { ...edge, label: edgeLabel };
        }
        return edge;
      })
    );
    setIsModalOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge, edgeLabel, setEdges]);

  // --- 新增：处理对话框中的“删除连线”操作 ---
  const handleModalDelete = useCallback(() => {
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    setIsModalOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge, setEdges]);

  // --- 新增：处理对话框的“取消”操作 ---
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setSelectedEdge(null);
  };

  const onDelete = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getEdges().filter((edge) => edge.selected);
    
    setNodes((currentNodes) => currentNodes.filter(node => !selectedNodes.find(sn => sn.id === node.id)));
    setEdges((currentEdges) => currentEdges.filter(edge => !selectedEdges.find(se => se.id === edge.id)));

  }, [getNodes, getEdges, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        // --- 新增：绑定双击事件 ---
        onEdgeDoubleClick={handleEdgeDoubleClick}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <Space>
          <Button icon={<PlusOutlined />} onClick={addBlankNode}>
            添加卡片
          </Button>
          <Button icon={<DeleteOutlined />} onClick={onDelete} danger>
            删除选中
          </Button>
        </Space>
      </div>

      {/* --- 新增：编辑/删除连线的对话框 --- */}
      <Modal
        title="编辑连线"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        // 自定义页脚按钮
        footer={[
          <Button key="delete" type="primary" danger onClick={handleModalDelete}>
            删除连线
          </Button>,
          <Button key="cancel" onClick={handleModalCancel}>
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={handleModalOk}>
            保存批注
          </Button>,
        ]}
      >
        <p>您可以在下方输入框为这条连线添加或修改批注。</p>
        <Input
          placeholder="例如：因果关系、反对、支持..."
          value={edgeLabel}
          onChange={(e) => setEdgeLabel(e.target.value)}
        />
      </Modal>
    </div>
  );
}