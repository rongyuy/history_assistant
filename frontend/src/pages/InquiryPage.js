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
  Tooltip,
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
} from '@ant-design/icons';
// 导入我们创建的API函数
import { getWikiData, getViewpointAnalysis, postChatMessage, getSourcesComparison } from '../api';

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
            <CoreExplorer topic={topic} />
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
            <NotesWorkspace topic={topic} />
          </Sider>
        </Layout>

        <FloatButton.BackTop />
      </Layout>
    </AntdApp>
  );
}

/** 左侧 70%：核心探究区 (修改后) */
function CoreExplorer({ topic }) {
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
            children: <WikiSummaryCard data={coreData.wikiSummary} />,
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
            children: <ReflectionSection />,
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
function WikiSummaryCard({ data }) {
    return (
        <Card size="small" bordered style={{ borderStyle: "dashed" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
                <Paragraph style={{ marginBottom: 0 }}>{data.summary || "暂无摘要"}</Paragraph>
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
  

/** 反思总结：(保持不变) */
function ReflectionSection() {
    const [checks, setChecks] = useState([false, false, false]);
    const [conclusion, setConclusion] = useState('');
  
    const items = [
      '我能陈述冲突的直接起因与深层原因',
      '我能举出至少两条支持 A/B 观点的证据',
      '我能形成自己的判断并用证据支撑',
    ];
  
    const update = (i) => (e) => {
      const next = [...checks];
      next[i] = e.target.checked;
      setChecks(next);
    };
  
    const done = checks.every(Boolean);
  
    return (
      <Card size="small" bordered style={{ borderStyle: 'dashed' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space direction="vertical">
            {items.map((label, i) => (
              <Checkbox key={i} checked={checks[i]} onChange={update(i)}>
                {label}
              </Checkbox>
            ))}
          </Space>
          <Divider dashed style={{ margin: '8px 0' }} />
          <TextArea
            rows={4}
            placeholder="写下你的结论（要点式/短文均可）"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
          />
          <Space>
            <Tooltip title={done ? '勾选项已完成' : '建议先完成上面的要点勾选'}>
              <Button type="primary" onClick={() => message.success('已保存总结（示例）')}>
                保存总结
              </Button>
            </Tooltip>
            <Button onClick={() => setConclusion('')}>清空</Button>
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

/** 右侧 30%：笔记工作区 (保持不变) */
function NotesWorkspace({ topic }) {
    const items = [
      {
        key: 'note',
        label: '自由笔记',
        children: <FreeNote />,
      },
      {
        key: 'outline',
        label: '结构化模板',
        children: <OutlineTemplate />,
      },
      {
        key: 'mindmap',
        label: '思维导图（占位）',
        children: <Empty description="后续可接入思维导图组件，如 react-flow" />,
      },
    ];
  
    return (
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Title level={5} style={{ marginBottom: 0 }}>
          笔记工作区
        </Title>
        <Text type="secondary">支持拖拽、思维导图、结构化模板</Text>
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
    
function OutlineTemplate() {
      const [data, setData] = useState({
        cause: '',
        evidenceA: '',
        evidenceB: '',
        conclusion: '',
      });
      const onChange = (k) => (e) => setData({ ...data, [k]: e.target.value });
    
      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>模板：因果—证据—结论</Text>
          <Input placeholder="直接原因 / 深层原因" value={data.cause} onChange={onChange('cause')} />
          <Input placeholder="证据（支持 A）" value={data.evidenceA} onChange={onChange('evidenceA')} />
          <Input placeholder="证据（支持 B）" value={data.evidenceB} onChange={onChange('evidenceB')} />
          <TextArea rows={4} placeholder="初步结论" value={data.conclusion} onChange={onChange('conclusion')} />
          <Space>
            <Button type="primary" onClick={() => message.success('模板已保存（示例）')}>
              保存
            </Button>
            <Button onClick={() => setData({ cause: '', evidenceA: '', evidenceB: '', conclusion: '' })}>
              重置
            </Button>
          </Space>
        </Space>
      );
}