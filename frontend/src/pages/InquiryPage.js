import React, { useEffect, useState } from 'react';
import {
  Layout,
  Typography,
  Divider,
  Drawer,
  Collapse,
  Card,
  Space,
  Tag,
  List,
  Button,
  Input,
  Tabs,
  Empty,
  FloatButton,
  //Tooltip,
  Checkbox,
  App as AntdApp, // antd 的应用级组件, 用于全局 message, Modal 等
  message,
  Spin, // 引入加载动画
  //Modal, // 引入模态框
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  //LinkOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
// 导入我们创建的API函数
import { getWikiData, getViewpointAnalysis, postChatMessage, getSourcesComparison, getWikiFullContent, getStructuredOutline } from '../api';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 页面：InquiryPage
 * (整体结构保持不变)
 */
export default function InquiryPage() {
  const [topic, setTopic] = useState('鸦片战争');
  const [inputValue, setInputValue] = useState('鸦片战争');
  const [savedConclusion, setSavedConclusion] = useState(''); // 新增状态，用于保存结论文本

  const handleSearch = () => {
    setTopic(inputValue);
  };

  return (
    // 使用 AntdApp 包裹，以便在任何地方调用 message, Modal 等
    <AntdApp>
      <Layout style={{ height: '100vh', background: '#fff', overflow: 'hidden' }}>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px dashed #eaeaea',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 24,
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            历史探究学习平台
          </Title>
          <Divider type="vertical" />
          <Text type="secondary">主题：</Text>
          <Input
            variant="filled"
            size="middle"
            style={{ width: 240 }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSearch}
            placeholder="输入要探究的主题"
          />
          <Button type="primary" onClick={handleSearch} style={{marginLeft: 8}}>开始探究</Button>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Content
            style={{
              padding: 24,
              paddingBottom: 120,
              overflowY: 'auto', // 关键修改点
              height:'100%' 
            }}
          >
            <CoreExplorer topic={topic} onSaveConclusion={setSavedConclusion} />
          </Content>

          <Sider
            width={420}
            theme="light"
            style={{
              padding: 24,
              borderLeft: '1px dashed #eaeaea',
              overflowY: 'auto', 
              height: '100%', // 新增：确保Sider高度占满父容器，使其overflow生效
            }}
          >
            <NotesWorkspace topic={topic} savedConclusion={savedConclusion} />
          </Sider>
        </Layout>

        <FloatButton.BackTop />
      </Layout>
    </AntdApp>
  );
}

/** 左侧 70%：核心探究区 (修改后) */
function CoreExplorer({ topic, onSaveConclusion }) {
  // 使用 state 来管理从后端获取的数据
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coreData, setCoreData] = useState({
    wikiSummary: { summary: '', timeline: [] },
    viewpoints: { viewpoints: [], debates: [] },
    sources: { sources: [] },
  });
  
  // 通过 AntdApp.useApp() 这个钩子来获取 antd 的全局API实例
  const { message } = AntdApp.useApp();

  // useEffect 在 topic 变化时从后端获取数据
  useEffect(() => {
    if (!topic) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      message.loading({ content: `正在加载“${topic}”的探究资料...`, key: 'data' });

      try {
        const [wikiRes, viewpointsRes, sourcesRes] = await Promise.all([
          getWikiData(topic),
          getViewpointAnalysis(topic),
          getSourcesComparison(topic),
        ]);

        // 增加一个检查，确保后端真的返回了数据
        if (!wikiRes || !wikiRes.data) {
            throw new Error("后端没有返回有效数据。");
        }

        setCoreData({
          wikiSummary: wikiRes.data,
          viewpoints: viewpointsRes.data || {
            viewpoints: [
              { side: 'A（观点一）', text: '观点一描述' },
              { side: 'B（观点二）', text: '观点二描述' },
            ],
            debates: ['讨论要点1', '讨论要点2'],
          },
          sources: sourcesRes.data,
        });

        message.success({ content: '资料加载成功!', key: 'data', duration: 2 });
      } catch (err) {
        // 打印出从后端获取的详细错误信息
        let errorMessage = '加载数据失败，请检查网络连接和后端服务。';
        if (err.response && err.response.data && err.response.data.detail) {
            // 如果是FastAPI的验证错误，会在这里显示
            errorMessage = `后端数据验证失败: ${JSON.stringify(err.response.data.detail)}`;
            console.error("后端返回的详细错误:", err.response.data.detail);
        } else {
            console.error("获取核心数据失败:", err);
        }
        
        setError(errorMessage);
        message.error({ content: '资料加载失败!', key: 'data', duration: 4 });

      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [topic,message]);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Spin size="large" tip="正在加载核心资料..." /></div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Text type="danger">{error}</Text></div>;
  }
  
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        {topic}
      </Title>
      
      <Collapse
        bordered={false}
        defaultActiveKey={["facts", "views", "sources", "reflection"]}
        style={{ background: "transparent" }}
        items={[
          {
            key: "facts",
            label: <ModuleHeader icon={<BookOutlined />} title="模块一：史实认知" hint="维基百科摘要、关键时间线" />,
            children: <WikiSummaryCard data={coreData.wikiSummary} topic={topic} />,
          },
          {
            key: "views",
            label: <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="A/B 立场与讨论页观点" />,
            children: <ViewpointAnalysis data={coreData.viewpoints} />,
          },
          {
            key: "sources",
            label: <ModuleHeader icon={<BookOutlined />} title="模块三：史料分析" hint="多史料片段对读" />,
            children: <SourcesComparisonCard data={coreData.sources} />, // 使用新增的组件
          },
          {
            key: "reflection",
            label: <ModuleHeader icon={<BulbOutlined />} title="模块四：反思总结" hint="引导用户回顾并形成结论" />,
            children: <ReflectionSection onSaveReflection={onSaveConclusion} />,
          },
        ]}
      />

      <AIChatDock topic={topic} />
    </Space>
  );
}

function ModuleHeader({ icon, title, hint }) {
  return (
    <Space>
      {icon}
      <Text strong>{title}</Text>
      <Tag color="default">{hint}</Tag>
    </Space>
  );
}

/** 史实认知：维基摘要/时间线 (修改后) */
function WikiSummaryCard({ data, topic }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fullContent, setFullContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();

    const handleReadOriginal = async () => {
        if (fullContent) {
            // 如果已经加载过，直接切换展开状态
            setIsExpanded(!isExpanded);
            return;
        }

        setLoading(true);
        try {
            const response = await getWikiFullContent(topic);
            setFullContent(response.data);
            setIsExpanded(true);
            message.success('原文加载成功！');
        } catch (error) {
            console.error('获取原文失败:', error);
            message.error('获取原文失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card 
            size="small" 
            bordered 
            style={{ 
                borderStyle: "dashed",
                height: isExpanded ? 'auto' : 'auto', // 展开时高度自适应
                minHeight: isExpanded ? '600px' : 'auto' // 展开时最小高度增加一倍
            }}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Paragraph style={{ marginBottom: 0, flex: 1 }}>{data.summary || "暂无摘要"}</Paragraph>
                    <Button 
                        type="link" 
                        size="small"
                        loading={loading}
                        onClick={handleReadOriginal}
                        style={{ marginLeft: 8, flexShrink: 0 }}
                    >
                        {isExpanded ? '收起原文' : '阅读原文'}
                    </Button>
                </div>
                
                {isExpanded && fullContent && (
                    <>
                        <Divider dashed style={{ margin: "8px 0" }} />
                        <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '12px', 
                            borderRadius: '6px',
                            border: '1px solid #e9ecef',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                                {fullContent.title}
                            </Title>
                            <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '13px',
                                lineHeight: '1.6',
                                color: '#495057'
                            }}>
                                {fullContent.content}
                            </div>
                            {fullContent.url && (
                                <div style={{ marginTop: 8, textAlign: 'right' }}>
                                    <a href={fullContent.url} target="_blank" rel="noopener noreferrer">
                                        在维基百科中查看完整页面
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                )}
                
                <Divider dashed style={{ margin: "8px 0" }} />
                
                <List
                    size="small"
                    header={<Text type="secondary">关键时间线</Text>}
                    bordered
                    dataSource={data.timeline}
                    renderItem={(it) => (
                        <List.Item>
                            <Space>
                                <Tag>{it.year}</Tag>
                                <Text>{it.event}</Text>
                            </Space>
                        </List.Item>
                    )}
                />
            </Space>
        </Card>
    );
}
  
/** 观点辨析：(修改后，接收props) */
function ViewpointAnalysis({ data }) {
    return (
      <Card size="small" bordered style={{ borderStyle: "dashed" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <List
            size="small"
            header={<Text strong>对立观点（A/B）</Text>}
            dataSource={data.viewpoints || []}
            renderItem={(it) => (
              <List.Item>
                <Space align="start">
                  <Tag color="processing">{it.side}</Tag>
                  <Text>{it.text}</Text>
                </Space>
              </List.Item>
            )}
          />
          <Divider dashed style={{ margin: "8px 0" }} />
          <List
            size="small"
            header={<Text strong>维基讨论页摘录（要点）</Text>}
            dataSource={data.debates || []}
            renderItem={(t) => <List.Item>{t}</List.Item>}
          />
        </Space>
      </Card>
    );
}
  
/** 新增: 史料对比卡片 */
function SourcesComparisonCard({ data }) {
    if (!data || !data.sources || data.sources.length === 0) {
        return (
            <Card size="small" bordered style={{ borderStyle: "dashed" }}>
                <Empty description="未能找到可供对比的史料。" />
            </Card>
        );
    }
  
    return (
      <Card size="small" bordered style={{ borderStyle: "dashed" }}>
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {data.sources.map((source, index) => (
            <div key={index}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                史料{index + 1}：{source.title}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                视角：{source.viewpoint}
              </Paragraph>
              <div style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6, backgroundColor: '#fafafa' }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {source.snippet}
                </Paragraph>
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                查看原始链接
              </a>
            </div>
          ))}
        </Space>
      </Card>
    );
  }
  

/** 反思总结*/
function ReflectionSection({ onSaveReflection }) {
  const items = [
    '我能陈述冲突的直接起因与深层原因',
    '我能举出至少两条支持 A/B 观点的证据',
    '我能形成自己的判断并用证据支撑',
    '我能思考历史事件的意义、与当下的联系'
  ];

  const [reflections, setReflections] = useState(() =>
    items.reduce((acc, _, index) => {
      acc[index] = { checked: false, content: '' };
      return acc;
    }, {})
  );

  const [otherThoughts, setOtherThoughts] = useState('');

  const handleCheckChange = (index) => (e) => {
    const isChecked = e.target.checked;
    setReflections(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        checked: isChecked,
        content: isChecked ? prev[index].content : ''
      }
    }));
  };

  const handleContentChange = (index) => (e) => {
    setReflections(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        content: e.target.value
      }
    }));
  };

  const handleSave = () => {
    let conclusionText = '';
    items.forEach((label, index) => {
      if (reflections[index].checked) {
        conclusionText += `- ${label}\n`;
        if (reflections[index].content) {
          conclusionText += `  - ${reflections[index].content}\n`;
        }
      }
    });

    if (otherThoughts) {
      conclusionText += `\n其他思考：\n${otherThoughts}`;
    }

    onSaveReflection(conclusionText);
    message.success('反思内容已保存到笔记大纲！');
  };

  const handleClear = () => {
    const initialReflections = items.reduce((acc, _, index) => {
      acc[index] = { checked: false, content: '' };
      return acc;
    }, {});
    setReflections(initialReflections);
    setOtherThoughts('');
  };

  return (
    <Card size="small" bordered style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((label, index) => (
          <div key={index}>
            <Checkbox
              checked={reflections[index]?.checked}
              onChange={handleCheckChange(index)}
            >
              {label}
            </Checkbox>
            {reflections[index]?.checked && (
              <div style={{ marginTop: 8, paddingLeft: 24 }}>
                <TextArea
                  rows={2}
                  placeholder={`请填写你对“${label}”的具体思考...`}
                  value={reflections[index]?.content}
                  onChange={handleContentChange(index)}
                />
              </div>
            )}
          </div>
        ))}

        <Divider dashed style={{ margin: '8px 0' }} />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>其他思考</Text>
          <TextArea
            rows={4}
            placeholder="在这里自由地记录你的任何其他想法或疑问..."
            value={otherThoughts}
            onChange={(e) => setOtherThoughts(e.target.value)}
          />
        </Space>

        <Space style={{ marginTop: 8 }}>
          <Button type="primary" onClick={handleSave}>
            保存所有反思
          </Button>
          <Button onClick={handleClear}>
            清空
          </Button>
        </Space>
      </Space>
    </Card>
  );
}

/** 底部 AI 引导 (修改后) */
function AIChatDock({ topic }) {
    const CONTENT_PADDING = 24;
    const SIDER_WIDTH = 420;
    const RIGHT_OFFSET = SIDER_WIDTH + CONTENT_PADDING;
  
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const [msgs, setMsgs] = useState([
      { role: 'ai', text: '你好！在探究过程中有任何想法或疑问，都可以和我交流。' },
    ]);
    const [loading, setLoading] = useState(false);
  
    const send = async () => {
      if (!value.trim() || loading) return;
  
      const userMessage = { role: 'user', text: value };
      const newMsgs = [...msgs, userMessage];
      setMsgs(newMsgs);
      setValue('');
      setLoading(true);
  
      const chatRequest = {
        history: newMsgs.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        })),
        topic: topic,
        current_module: "史料分析",
        context_text: "此处可以将来传入用户正在阅读的史料文本"
      };
  
      try {
        const response = await postChatMessage(chatRequest);
        const aiResponse = { role: 'ai', text: response.data.content };
        setMsgs(currentMsgs => [...currentMsgs, aiResponse]);
      } catch (error) {
        console.error("AI聊天请求失败:", error);
        const errorResponse = { role: 'ai', text: '抱歉，AI服务暂时不可用，请稍后再试。' };
        setMsgs(currentMsgs => [...currentMsgs, errorResponse]);
        message.error("AI响应失败，请检查后端服务。");
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <>
        <div onClick={() => setOpen(true)} style={{ position: "fixed", right: RIGHT_OFFSET, bottom: 96, zIndex: 1100, background: "#1677ff", color: "#fff", padding: "8px 12px", borderRadius: 14, cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,.15)", display: "flex", alignItems: "center", gap: 8, userSelect: "none",}} >
          <MessageOutlined />
          <span>AI 引导</span>
        </div>
  
        <Drawer
          placement="bottom"
          height={360}
          open={open}
          onClose={() => setOpen(false)}
          mask={false}
          zIndex={1300}
          title={<Space><BulbOutlined /> <span>AI 引导（苏格拉底式）</span></Space>}
          rootStyle={{ left: CONTENT_PADDING, right: RIGHT_OFFSET, }}
          styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
              <List
                  size="small"
                  dataSource={msgs} // 直接使用原数组
                  renderItem={(m, idx) => (
                      <List.Item key={idx} style={{ borderBottom: 'none' }}>
                          <Space align="start">
                              <Tag color={m.role === "ai" ? "processing" : "default"}>
                                  {m.role === "ai" ? "AI" : "你"}
                              </Tag>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                          </Space>
                      </List.Item>
                  )}
              />
            </div>
            <Space.Compact style={{ width: "100%", marginTop: 8 }}>
              <Input
                placeholder={loading ? "AI正在思考..." : "输入你的想法/问题，Enter 发送"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onPressEnter={send}
                disabled={loading}
              />
              <Button type="primary" onClick={send} loading={loading}>发送</Button>
            </Space.Compact>
          </div>
        </Drawer>
      </>
    );
  }

/** 右侧 30%：笔记工作区 */
function NotesWorkspace({ topic, savedConclusion }) {
  const [outlineData, setOutlineData] = useState({
    topic: '',
    timeline: [],
    causality: [],
    figures: [],
    viewpoints: [],
    evidence: [],
    conclusion: '',
  });
  const [outlineLoading, setOutlineLoading] = useState(false);
  const { message } = AntdApp.useApp();

  const splitStringToArray = (str) => {
    return str ? str.split(/[\n;；]/).map(item => item.trim()).filter(item => item) : [];
  };

  useEffect(() => {
    if (!topic) return;

    const fetchOutline = async () => {
      setOutlineLoading(true);
      try {
        const response = await getStructuredOutline(topic);
        if (response && response.data) {
          const processedData = {
            topic: response.data.topic || '',
            timeline: splitStringToArray(response.data.timeline),
            causality: splitStringToArray(response.data.causality),
            figures: splitStringToArray(response.data.figures),
            viewpoints: [],
            evidence: [
              'Jack Beeching的《中国鸦片战争》',
              'Harry G. Gelber的《鸦片、士兵与福音派》',
              'W. Travis Hanes和Frank Sanello的《鸦片战争》'
            ],
            conclusion: '',
          };
          setOutlineData(processedData);
          message.success('大纲加载成功！');
        } else {
          message.warning('未获取到完整大纲数据。');
        }
      } catch (error) {
        console.error("Failed to fetch structured outline:", error);
        message.error('加载大纲失败，请检查网络或后端服务。');
      } finally {
        setOutlineLoading(false);
      }
    };

    fetchOutline();
  }, [topic, message]);

  useEffect(() => {
    setOutlineData(prev => ({ ...prev, conclusion: savedConclusion }));
  }, [savedConclusion]);

  const saveOutlineItem = (key, value) => {
    setOutlineData(prev => ({ ...prev, [key]: value }));
    message.success(`${key} 已保存！`);
  };

  const items = [
    {
      key: 'note',
      label: '自由笔记',
      children: <FreeNote />,
    },
    {
      key: 'outline',
      label: '指引大纲',
      children: (
        <OutlineTemplate
          data={outlineData}
          loading={outlineLoading}
          onSave={saveOutlineItem}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Title level={5} style={{ marginBottom: 0 }}>
        笔记工作区
      </Title>
      <Text type="secondary">支持拖拽、指引大纲、自由笔记</Text>
      <Tabs defaultActiveKey="note" items={items} />
    </Space>
  );
}

function FreeNote() {
  const [val, setVal] = useState('');
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <TextArea
        rows={12}
        placeholder="随手记录要点、证据与疑问……"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <Space>
        <Button type="primary" onClick={() => message.success('已保存到本地（示例）')}>
          保存
        </Button>
        <Button onClick={() => setVal('')}>清空</Button>
      </Space>
    </Space>
  );
}

function EditableItem({ initialValue, onSave, onDelete }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);

  const handleSave = () => {
    onSave(value);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, borderLeft: '2px solid #52c41a' }}
      actions={[
        <Button type="text" onClick={handleSave} key="save">
          保存
        </Button>,
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onDelete} key="delete" />
      ]}
    >
      <TextArea
        rows={2}
        value={value}
        onChange={handleChange}
        style={{ width: '100%' }}
        autoSize
      />
    </Card>
  );
}

// 解析并格式化“反思结论”到结构化展示
function FormattedConclusion({ rawConclusion }) {
  if (!rawConclusion) {
    return (
      <Empty
        description="这里将显示你从模块四生成的反思总结内容。"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const mainAndOtherThoughts = rawConclusion.split(/\n其他思考：\n/);
  const mainPointsText = mainAndOtherThoughts[0] || '';
  const otherThoughtsPart = mainAndOtherThoughts[1] || '';

  const formattedPoints = mainPointsText
    .split('\n- ')
    .filter(Boolean)
    .map((pointText) => {
      const lines = pointText.trim().split('\n');
      const title = lines[0].trim().replace('-', '').trim();
      const subPoints = lines.slice(1).map((line) => line.trim().replace('-', '').trim()).filter(Boolean);
      return { title, subPoints };
    });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <List
        size="small"
        dataSource={formattedPoints}
        renderItem={(item) => (
          <List.Item style={{ borderBottom: 'none', padding: '4px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: '#1890ff' }}>
                {item.title}
              </Text>
              <List
                size="small"
                dataSource={item.subPoints}
                renderItem={(subItem) => (
                  <List.Item style={{ borderBottom: 'none', padding: '0 0 4px 16px' }}>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{subItem}</Text>
                  </List.Item>
                )}
              />
            </Space>
          </List.Item>
        )}
      />
      {otherThoughtsPart && (
        <>
          <Divider dashed style={{ margin: '8px 0' }} />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ color: '#1890ff' }}>
              其他思考
            </Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {otherThoughtsPart.trim()}
            </Paragraph>
          </Space>
        </>
      )}
    </Space>
  );
}

function OutlineTemplate({ data, loading, onSave }) {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleSaveItem = (key, value) => {
    onSave(key, value);
  };

  const renderEditableList = (key, listData) => (
    <Space direction="vertical" style={{ width: '100%' }}>
      {listData.map((item, index) => (
        <EditableItem
          key={`${key}-${index}`}
          initialValue={item}
          onSave={(value) => {
            const newList = [...listData];
            newList[index] = value;
            handleSaveItem(key, newList);
          }}
          onDelete={() => {
            const newList = listData.filter((_, i) => i !== index);
            handleSaveItem(key, newList);
          }}
        />
      ))}
      <Button
        type="dashed"
        onClick={() => {
          const newList = [...listData, ''];
          setLocalData({ ...localData, [key]: newList });
        }}
        block
        icon={<PlusOutlined />}
      >
        添加新条目
      </Button>
    </Space>
  );

  const renderCard = (title, content) => {
    return (
      <Card
        size="small"
        title={<Text strong>{title}</Text>}
        style={{ marginBottom: 16, borderLeft: '3px solid #1677ff' }}
      >
        {content}
      </Card>
    );
  };

  return (
    <Spin spinning={loading} tip="正在生成大纲..." size="large">
      <Space direction="vertical" style={{ width: '100%', paddingBottom: 20 }}>

        {renderCard(
          '主题（研究问题/课题）',
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={localData.topic}
              onChange={(e) => setLocalData({ ...localData, topic: e.target.value })}
              style={{ width: '100%' }}
            />
            <Button
              type="primary"
              size="small"
              onClick={() => handleSaveItem('topic', localData.topic)}
              style={{ alignSelf: 'flex-end' }}
            >
              保存此项
            </Button>
          </Space>
        )}

        {renderCard(
          '时间线（关键事件：时间、地点、人物、简述）',
          renderEditableList('timeline', localData.timeline)
        )}

        {renderCard(
          '因果链（直接原因/深层原因/触发事件 → 过程 → 结果/影响）',
          renderEditableList('causality', localData.causality)
        )}

        {renderCard(
          '人物/势力（立场、目标、行动、相互关系）',
          renderEditableList('figures', localData.figures)
        )}

        {renderCard(
          '观点与史学争鸣（不同史家/学派观点 + 论据）',
          renderEditableList('viewpoints', localData.viewpoints)
        )}

        {renderCard(
          '证据节点（摘录/数据/图表，指向原始史料或二手文献）',
          renderEditableList('evidence', localData.evidence)
        )}

        {renderCard(
          '结论/反思（你的判断、局限性、未解问题）',
          <FormattedConclusion rawConclusion={localData.conclusion} />
        )}
      </Space>
    </Spin>
  );
}
