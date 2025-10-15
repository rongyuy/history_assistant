// ArgumentMap.js

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
import { Button, Space, Modal, Input, message } from 'antd';
import { PlusOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';

import TextUpdaterNode from './TextUpdaterNode';

import 'reactflow/dist/style.css';

const nodeTypes = { textUpdater: TextUpdaterNode };

// 修正1：接收 cards prop，弃用 noteContent, isGeneratingMap, setIsGeneratingMap
export default function ArgumentMap({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  addBlankNode,
  setNodes,
  setEdges,
  cards, // <-- 接收正确的 cards 数据
}) {
  const { getNodes, getEdges, setCenter } = useReactFlow();

  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [edgeLabel, setEdgeLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false); // 在组件内部管理生成状态

  const handleEdgeDoubleClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setEdgeLabel(edge.label || '');
    setIsModalOpen(true);
  }, []);

  const handleModalOk = useCallback(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return { ...edge, label: edgeLabel, type: 'smoothstep' };
        }
        return edge;
      })
    );
    setIsModalOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge, edgeLabel, setEdges]);

  const handleModalDelete = useCallback(() => {
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    setIsModalOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge, setEdges]);

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

  // 修正2：重写图谱生成函数，使其基于 cards 数据工作
  const generateMapFromCards = useCallback(() => {
    // 检查是否有卡片，并且至少有一张卡片填写了内容
    const hasContent = cards && cards.some(card => card.content && card.content.trim() !== '');

    if (!hasContent) {
      message.warning('请先在“历史批判思维训练”中填写至少一张卡片的内容。');
      return;
    }
    
    setIsGenerating(true);

    // 模拟AI分析和布局的延迟
    setTimeout(() => {
      // 1. 创建一个中心主题节点
      const centralNode = {
        id: 'central-topic',
        type: 'default', // 使用默认样式，使其突出
        data: { label: '核心论点：我的历史视角' },
        position: { x: 300, y: 200 },
        style: { backgroundColor: '#667eea', color: 'white', fontWeight: 'bold' },
      };

      // 2. 过滤掉没有内容的卡片，并为有内容的卡片创建节点
      const cardNodes = cards
        .filter(card => card.content && card.content.trim() !== '')
        .map((card, index) => {
          // 使用圆形布局算法来定位节点
          const angle = (index / (cards.length - 1)) * 2 * Math.PI;
          const x = centralNode.position.x + 350 * Math.cos(angle);
          const y = centralNode.position.y + 250 * Math.sin(angle);

          return {
            id: `card-node-${card.id}`,
            type: 'textUpdater',
            position: { x, y },
            data: { label: `${card.title}\n\n${card.content}` },
          };
        });
      
      // 3. 创建从每个卡片节点到中心节点的连线
      const cardEdges = cardNodes.map(node => ({
        id: `edge-to-${node.id}`,
        source: node.id,
        target: centralNode.id,
        type: 'smoothstep', // 使用平滑的曲线
        animated: false,
      }));

      // 4. 组合所有节点和连线，并更新状态
      setNodes([centralNode, ...cardNodes]);
      setEdges(cardEdges);
      
      message.success('已根据您的思考生成论证图谱！');
      setIsGenerating(false);

      // 移动视图到中心点
      setTimeout(() => setCenter(centralNode.position.x, centralNode.position.y, { zoom: 0.8, duration: 800 }), 100);

    }, 1000); // 1秒延迟

  }, [cards, setNodes, setEdges, setCenter]);


  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <Space>
          <Button 
            icon={<BulbOutlined />} 
            onClick={generateMapFromCards} // <-- 调用新的函数
            loading={isGenerating}
            type="primary"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            {isGenerating ? 'AI分析中...' : '基于批判性思维训练生成图谱'}
          </Button>
          <Button icon={<PlusOutlined />} onClick={addBlankNode}>
            添加卡片
          </Button>
          <Button icon={<DeleteOutlined />} onClick={onDelete} danger>
            删除选中
          </Button>
        </Space>
      </div>

      <Modal
        title="编辑连线"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
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