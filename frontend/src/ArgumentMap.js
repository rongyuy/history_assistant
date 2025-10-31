// ArgumentMap.js (完整修改版)

import React, { useState, useCallback, useEffect, useRef } from 'react'; 
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

const defaultNodeWidth = 150;
const defaultNodeHeight = 50;
const centralNodeId = 'central-topic'; // Define central node ID as a constant

// ▼▼▼ 【新增】定义布局锚点 ▼▼▼
// "展示区" (上半部分) 的中心 Y 坐标
const TOP_Y_ANCHOR = 150; 
// "草稿区" (下半部分) 在屏幕中的垂直位置比例 (70% 靠下的位置)
const BOTTOM_Y_VIEWPORT_RATIO = 0.7; 
// ▲▲▲ 【新增结束】 ▲▲▲

export default function ArgumentMap({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  // addBlankNode, // <-- 1. 已从 props 中移除
  setNodes,
  setEdges,
  cards,
  topic,
}) {
  // ▼▼▼ 2. 从 useReactFlow 中获取 project ▼▼▼
  const {setCenter, fitView, project } = useReactFlow(); 
  const reactFlowWrapper = useRef(null); // <-- 3. 为 wrapper 添加 ref

  const cardsRef = useRef(cards);
  const nodesRef = useRef(nodes);
  const topicRef = useRef(topic);

  // 当 props 发生变化时，立刻更新这些“容器”的内容
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    topicRef.current = topic;
  }, [topic]);

  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [edgeLabel, setEdgeLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (nodes.length > 0) {
      if (!isGenerating) {
          // (removed auto-fitview)
      }
    }
  }, [nodes, fitView, isGenerating]);

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
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);

    setNodes((currentNodes) => currentNodes.filter(node => !selectedNodes.find(sn => sn.id === node.id)));
    setEdges((currentEdges) => currentEdges.filter(edge => !selectedEdges.find(se => se.id === edge.id)));

  }, [nodes, edges, setNodes, setEdges]);

  // ▼▼▼ 4. 这是新的“智能” addBlankNode 函数 ▼▼▼
  const addBlankNode = useCallback(() => {
    if (!reactFlowWrapper.current) {
      // Fallback, just in case ref is not ready
      // ▼▼▼ 【修改】备用位置也放在下半区 ▼▼▼
      const fallbackPos = { x: 300, y: TOP_Y_ANCHOR + 500 }; // (y=650)
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'textUpdater',
        position: fallbackPos,
        data: { label: '双击编辑' },
      };
      setNodes((nds) => [...nds, newNode]);
      return;
    }

    // 获取 React Flow 容器的宽度和高度
    const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
    
    // ▼▼▼ 【修改】计算屏幕 "下半部分" 的中心点 ▼▼▼
    const centerOfBottomHalf = {
      x: width / 2,
      y: height * BOTTOM_Y_VIEWPORT_RATIO, // 使用我们定义的比例 (e.g., 70% 靠下)
    };
    
    // 使用 project 函数将“屏幕坐标”转换为“图谱坐标系”
    const position = project(centerOfBottomHalf);
    // ▲▲▲ 【修改结束】 ▲▲▲

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'textUpdater',
      position: position, // 使用计算出的 "草稿区" 中心位置
      data: { label: '双击编辑' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [project, setNodes]); // 依赖 project 和 setNodes
  // ▲▲▲ 新函数结束 ▲▲▲

  const generateMapFromCards = useCallback(() => {
    // (你现有的“生成图谱”函数，包含紧凑布局，无需改动)
    
    const hasContent = cardsRef.current && cardsRef.current.some(card => card.content && card.content.trim() !== '');

    if (!hasContent) {
      const existingCardNodes = nodesRef.current.some(n => n.id.startsWith('card-node-'));
      if (existingCardNodes) {
        // message.info('卡片内容均已清空，正在更新图谱...'); // 已被 handleSave 覆盖
      } else {
        message.warning('请先在“反思总结”中填写至少一张卡片的内容。');
        return;
      }
    }

    setIsGenerating(true);

    setTimeout(() => {
      const currentNodes = nodesRef.current; 
      const existingNodeIds = new Set(currentNodes.map(n => n.id));

      const contentCards = cardsRef.current.filter(card => card.content && card.content.trim() !== '');
      const validCardNodeIds = new Set(contentCards.map(card => `card-node-${card.id}`));
      const validEdgeIds = new Set(contentCards.map(card => `edge-to-card-node-${card.id}`));

      // 【布局核心修改 1/3】
      // ▼▼▼ 【修改】将中心位置固定到 "上半部分" 的锚点 ▼▼▼
      let newCentralPosition = { x: 300, y: TOP_Y_ANCHOR }; // 默认位置
      // ▲▲▲ 【修改结束】 ▲▲▲
      
      if (existingNodeIds.has(centralNodeId)) {
         const existingCentral = currentNodes.find(n => n.id === centralNodeId);
         if (existingCentral) {
             // ▼▼▼ 【修改】如果中心节点已存在，只更新 x 坐标，保持 y 坐标在锚点 ▼▼▼
             newCentralPosition = { ...existingCentral.position, y: TOP_Y_ANCHOR }; // 优先使用现有 x 位置, 但 y 坐标固定
             // ▲▲▲ 【修改结束】 ▲▲▲
         }
      }

      const centralNodeData = { label: topicRef.current || '核心论点' };
      const centralNodeStyle = { backgroundColor: '#667eea', color: 'white', fontWeight: 'bold' };

      const nodesToUpdate = []; 
      const nodesToAdd = [];    
      const edgesToAdd = [];    
 
      const numCards = contentCards.length;
      
      // 【布局核心修改 2/3】
      const radiusX = 250; 
      const radiusY = 180; 

      contentCards.forEach((card, index) => {
        const nodeId = `card-node-${card.id}`;
        const edgeId = `edge-to-${nodeId}`;
        
        const newNodeLabel = `${card.title} ${card.content.trim()}`;

        // 因为我们采用了“先删除再生成”的策略，所以 existingNodeIds.has(nodeId) 永远是 false
        if (existingNodeIds.has(nodeId)) {
          // 这个分支理论上不会进入
          const existingNode = currentNodes.find(n => n.id === nodeId);
          if (existingNode) {
            if (existingNode.data.label !== newNodeLabel) {
                nodesToUpdate.push({ 
                  ...existingNode, 
                  data: { label: newNodeLabel } 
                });
            }
          }
        } else {
          // 【布局核心修改 3/3】
          const angle = (numCards > 0) ? (index / numCards) * 2 * Math.PI : 0;
          
          const x = newCentralPosition.x + radiusX * Math.cos(angle);
          const y = newCentralPosition.y + radiusY * Math.sin(angle);
          
          nodesToAdd.push({
            id: nodeId,
            type: 'textUpdater',
            position: { x, y },
            data: { label: newNodeLabel },
          });
           edgesToAdd.push({
             id: edgeId,
             source: nodeId,
             target: centralNodeId,
             type: 'smoothstep',
             animated: false,
           });
        }
      });
      
      // --- 核心修改：更新 Nodes 状态 ---
      setNodes(prevNodes => {
        let baseNodes = prevNodes;
        
        baseNodes = baseNodes.filter(node => {
            const isCardNode = node.id.startsWith('card-node-');
            if (isCardNode) {
                return validCardNodeIds.has(node.id);
            }
            return true;
        });

        const existingCentral = baseNodes.find(n => n.id === centralNodeId);
        
        if (!existingCentral) {
            if (contentCards.length > 0) { // 只有在有卡片时才创建中心节点
              baseNodes = [
                  ...baseNodes,
                  { id: centralNodeId, type: 'default', data: centralNodeData, position: newCentralPosition, style: centralNodeStyle }
              ];
            }
        } else {
            if (contentCards.length === 0) { // 如果卡片都删了，也删除中心节点
                baseNodes = baseNodes.filter(n => n.id !== centralNodeId);
            } else {
                const centralUpdateNeeded = existingCentral.position.x !== newCentralPosition.x ||
                                            existingCentral.position.y !== newCentralPosition.y ||
                                            existingCentral.data.label !== centralNodeData.label;
                if (centralUpdateNeeded) {
                    nodesToUpdate.push({
                        ...existingCentral,
                        position: newCentralPosition,
                        data: centralNodeData 
                    });
                }
            }
        }

        const updatedNodes = baseNodes.map(node => {
          const update = nodesToUpdate.find(u => u.id === node.id);
          return update ? update : node;
        });

        return [...updatedNodes, ...nodesToAdd];
      });


      // --- 核心修改：更新 Edges 状态 ---
      setEdges(prevEdges => {
          const keptEdges = prevEdges.filter(edge => {
              const isCardEdge = edge.id.startsWith('edge-to-card-node-');
              if (isCardEdge) {
                  return validEdgeIds.has(edge.id); 
              }
              return true;
          });

          const finalKeptEdges = keptEdges.filter(edge => {
              if (contentCards.length === 0) {
                  return edge.target !== centralNodeId && edge.source !== centralNodeId;
              }
              return true;
          });

          const currentEdgeIds = new Set(finalKeptEdges.map(e => e.id));
          const trulyNewEdges = edgesToAdd.filter(newEdge => !currentEdgeIds.has(newEdge.id));
          
          return [...finalKeptEdges, ...trulyNewEdges];
      });
      // --- 核心修改结束 ---

      message.success('论证图谱已更新！');
      setIsGenerating(false);

      setTimeout(() => setCenter(newCentralPosition.x, newCentralPosition.y, { zoom: 0.9, duration: 600 }), 100); 

    }, 500);

  }, [setNodes, setEdges, project, setCenter]); // <-- 确保依赖项完整
  
  return (
    // ▼▼▼ 5. 将 ref 添加到这个 div 上 ▼▼▼
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '75vh', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }} 
        minZoom={0.2} 
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <Space>
          <Button
            icon={<BulbOutlined />}
            onClick={generateMapFromCards}
            loading={isGenerating}
            type="primary"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            {isGenerating ? 'AI分析中...' : '基于反思总结生成图谱'}
          </Button>
          {/* ▼▼▼ 6. 这个按钮现在调用的是新的本地函数 ▼▼▼ */}
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