import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
// 新增：引入 Modal 和 Input 组件
import { Button, Space, Modal, Input, message, Spin } from 'antd'; 
import { PlusOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';

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
  noteContent,
  isGeneratingMap,
  setIsGeneratingMap,
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

  // 基于任务四内容生成论证图谱
  const generateMapFromNotes = useCallback(async () => {
    if (!noteContent || noteContent.trim().length < 10) {
      message.warning('请先在任务四中完成历史批判思维训练，记录您的思考内容');
      return;
    }

    setIsGeneratingMap(true);
    
    try {
      // 模拟AI分析任务四的批判性思维内容并生成论证图谱
      // 这里可以调用后端API进行实际的AI分析
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟API调用延迟
      
      // 基于任务四的批判性思维内容生成节点和连线
      const generatedNodes = generateCriticalThinkingNodes(noteContent);
      const generatedEdges = generateCriticalThinkingEdges(noteContent, generatedNodes);
      
      // 清空现有图谱并添加新生成的节点和连线
      setNodes(generatedNodes);
      setEdges(generatedEdges);
      
      message.success('基于您的历史批判思维分析已生成论证图谱！您可以继续编辑和调整。');
    } catch (error) {
      console.error('生成论证图谱失败:', error);
      message.error('生成论证图谱失败，请稍后重试');
    } finally {
      setIsGeneratingMap(false);
    }
  }, [noteContent, setNodes, setEdges]);

  // 从批判性思维内容中提取关键概念作为节点
  const generateCriticalThinkingNodes = (content) => {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const nodes = [];
    
    // 识别批判性思维的关键要素
    const criticalThinkingElements = [
      '我的历史视角', '关键证据', '反对观点', '历史意义', '批判性结论',
      '因果关系', '证据分析', '逻辑推理', '价值判断', '历史反思'
    ];
    
    lines.forEach((line, index) => {
      if (line.trim().length > 5) {
        // 检查是否包含批判性思维关键词
        const foundElements = criticalThinkingElements.filter(element => 
          line.includes(element) || element.includes(line.substring(0, 10))
        );
        
        if (foundElements.length > 0) {
          foundElements.forEach((element, elementIndex) => {
            nodes.push({
              id: `critical-${index}-${elementIndex}`,
              type: 'textUpdater',
              position: { 
                x: Math.random() * 400 + 100, 
                y: Math.random() * 300 + 100 
              },
              data: { label: element },
            });
          });
        } else {
          // 提取其他关键词
          const keywords = extractKeywordsFromLine(line);
          keywords.forEach((keyword, keywordIndex) => {
            nodes.push({
              id: `generated-${index}-${keywordIndex}`,
              type: 'textUpdater',
              position: { 
                x: Math.random() * 400 + 100, 
                y: Math.random() * 300 + 100 
              },
              data: { label: keyword },
            });
          });
        }
      }
    });
    
    return nodes;
  };

  // 从笔记内容中提取关键词
  const extractKeywordsFromLine = (line) => {
    // 简单的关键词提取逻辑
    const words = line.split(/[，。！？；：""''（）【】《》〈〉、\s]/)
      .filter(word => word.length > 1 && word.length < 20)
      .slice(0, 3); // 每行最多提取3个关键词
    
    return words.length > 0 ? words : [line.substring(0, 20) + '...'];
  };

  // 基于批判性思维节点生成连线
  const generateCriticalThinkingEdges = (content, nodes) => {
    const edges = [];
    
    // 批判性思维的逻辑关系
    const criticalRelations = [
      '支持', '反对', '证据', '推理', '结论', '反思', '质疑', '验证'
    ];
    
    // 为批判性思维要素建立逻辑连线
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      
      // 根据节点内容确定关系类型
      let relationType = '相关';
      if (sourceNode.data.label.includes('证据') || targetNode.data.label.includes('证据')) {
        relationType = '证据支持';
      } else if (sourceNode.data.label.includes('反对') || targetNode.data.label.includes('反对')) {
        relationType = '反对';
      } else if (sourceNode.data.label.includes('结论') || targetNode.data.label.includes('结论')) {
        relationType = '推理得出';
      } else if (sourceNode.data.label.includes('反思') || targetNode.data.label.includes('反思')) {
        relationType = '反思';
      }
      
      edges.push({
        id: `critical-edge-${i}-${i + 1}`,
        source: sourceNode.id,
        target: targetNode.id,
        label: relationType,
        type: 'smoothstep',
        animated: false,
      });
    }
    
    return edges;
  };

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
          <Button 
            icon={<BulbOutlined />} 
            onClick={generateMapFromNotes}
            loading={isGeneratingMap}
            type="primary"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            {isGeneratingMap ? 'AI分析中...' : '基于批判性思维训练生成图谱'}
          </Button>
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