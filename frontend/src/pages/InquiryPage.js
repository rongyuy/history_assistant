import React from 'react';
import { Layout, Divider } from 'antd';
import { useParams } from 'react-router-dom';

const { Sider, Content } = Layout;

// 导入你的组件 (我们将在下面创建)
// import InquiryWorkspace from '../components/InquiryWorkspace';
// import NoteWorkspace from '../components/NoteWorkspace';

const InquiryPage = () => {
  const { topic } = useParams();
  const currentTopic = topic || '鸦片战争'; // 如果没有主题则使用默认值

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <h1>历史探究学习平台: {currentTopic}</h1>
        <Layout>
          <Content style={{ paddingRight: '12px' }}>
             {/* TODO: 左侧核心探究区组件将放在这里 */}
             <div style={{border: '1px solid #eee', padding: '16px', height: '100%'}}>
                左侧核心探究区 (待开发)
             </div>
          </Content>
          <Sider width="35%" theme="light" style={{ paddingLeft: '12px' }}>
            {/* TODO: 右侧笔记工作区组件将放在这里 */}
            <div style={{border: '1px solid #eee', padding: '16px', height: '100%'}}>
                右侧笔记工作区 (待开发)
             </div>
          </Sider>
        </Layout>
      </Content>
    </Layout>
  );
};

export default InquiryPage;